<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 09.12.2016
 * Time: 16:21
 */

namespace lib;

use controller\LogController;

class Socket {

    const DEFAULT_TTL_MAX                   = 3000;
    const DEFAULT_RETRY_MAX                 = 3;

    const ERROR_OFFLINE                     = 'Server seems to be offline. uri: "%s" | retries: %s | timeout: %sms';
    const ERROR_POLLING                     = 'Error polling object: %s';
    const ERROR_POLLING_FAILED              = 'Polling failed: %s';
    const ERROR_RECV_FAILED                 = 'Receive failed: %s';
    const ERROR_SEND_FAILED                 = 'Send failed: %s';

    /**
     * TCP Socket object
     * @var \ZMQSocket
     */
    protected $socket;

    /**
     * TCP URI for connections
     * @var
     */
    protected $socketUri;

    /**
     * Socket timeout (ms)
     * -> The total timeout for a request is ($tll * $maxRetries)
     * @var int
     */
    protected $ttl = (self::DEFAULT_TTL_MAX / self::DEFAULT_RETRY_MAX);

    /**
     * max retry count for message send
     * @var int
     */
    protected $maxRetries = self::DEFAULT_RETRY_MAX;

    public function __construct($uri, $ttl = self::DEFAULT_TTL_MAX, $maxRetries = self::DEFAULT_RETRY_MAX){
        $this->setSocketUri($uri);
        $this->setTtl($ttl, $maxRetries);
        $this->initSocket();
    }

    /**
     * @param mixed $socketUri
     */
    public function setSocketUri($socketUri){
        $this->socketUri = $socketUri;
    }

    /**
     * @param int $ttl
     * @param int $maxRetries
     */
    public function setTtl(int $ttl, int $maxRetries){
        if(
            $ttl > 0 &&
            $maxRetries > 0
        ){
            $this->maxRetries = $maxRetries;
            $this->ttl = round($ttl / $maxRetries);
        }
    }

    /**
     *  init socket
     */
    public function initSocket(){
        if($this->socketUri){
            $context = new \ZMQContext();
            $this->socket = $context->getSocket(\ZMQ::SOCKET_REQ);
        }
    }

    /**
     * send data to socket and listen for response
     * -> "Request" => "Response" setup
     * @param $task
     * @param $load
     * @return bool|string
     */
    public function sendData($task, $load = ''){
        $response = false;

        if( !$this->socket ){
            // Socket not active (e.g. URI missing)
            return $response;
        }

        // add task, and wrap data
        $send = [
            'task' => $task,
            'load' => $load
        ];

        $this->socket->setSockOpt(\ZMQ::SOCKOPT_LINGER, 0);


        $this->socket->connect($this->socketUri);
        $this->socket->send(json_encode($send));

        $readable = [];
        $writable = [];

        $poller = new \ZMQPoll();
        $poller->add($this->socket, \ZMQ::POLL_IN);

        $retriesLeft = $this->maxRetries;
        while($retriesLeft){
            /* Amount of events retrieved */
            $events = 0;

            try{
                /* Poll until there is something to do */
                $events = $poller->poll($readable, $writable, $this->ttl);
                $errors = $poller->getLastErrors();

                if(count($errors) > 0){
                    foreach($errors as $error){
                        LogController::getLogger('SOCKET_ERROR')->write(sprintf(self::ERROR_POLLING, $error));
                    }
                }
            }catch(\ZMQPollException $e){
                LogController::getLogger('SOCKET_ERROR')->write(sprintf(self::ERROR_POLLING_FAILED, $e->getMessage() ));
            }

            if($events > 0){
                try{
                    $response = $this->socket->recv();
                    // everything OK -> stop loop
                    break;
                }catch(\ZMQException $e){
                    LogController::getLogger('SOCKET_ERROR')->write(sprintf(self::ERROR_RECV_FAILED, $e->getMessage() ));
                }
            }elseif(--$retriesLeft <= 0){
                // retry limit exceeded
                LogController::getLogger('SOCKET_ERROR')->write(sprintf(self::ERROR_OFFLINE, $this->socketUri, $this->maxRetries, $this->ttl));
                break;
            }
        }

        $this->socket->disconnect($this->socketUri);

        return $response;
    }


}