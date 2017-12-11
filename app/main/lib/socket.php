<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 09.12.2016
 * Time: 16:21
 */

namespace lib;

class Socket {

    // max TTL time (ms)
    const DEFAULT_TTL_MAX                   = 3000;

    // max retry count
    const DEFAULT_RETRY_MAX                 = 3;

    // max processing time for remote WebServer to send response (ms)
    const DEFAULT_RESPONSE_MAX              = 1000;

    const ERROR_OFFLINE                     = 'Server seems to be offline. uri: "%s" | retries: %s | timeout: %sms';
    const ERROR_POLLING                     = 'Error polling object: %s';
    const ERROR_POLLING_FAILED              = 'Polling failed: %s';
    const ERROR_RECV_FAILED                 = 'Receive failed: %s';
    const ERROR_SEND_FAILED                 = 'No Response within: %sms. Socket took to long for processing request (or is offline)';

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
        $this->setTtl($ttl, $maxRetries);
        $this->setSocketUri($uri);
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
     * init new socket
     */
    public function initSocket(){
        if(Config::checkSocketRequirements()){
            $context = new \ZMQContext();
            $this->socket = $context->getSocket(\ZMQ::SOCKET_PUSH);
        }
    }

    /**
     * @param string $task
     * @param string $load
     * @return bool|string
     * @throws \ZMQSocketException
     */
    public function sendData(string $task, $load = ''){
        $response = false;

        $this->initSocket();

        if(
            !$this->socket ||
            !$this->socketUri
        ){
            // Socket not active (e.g. URI missing)
            return $response;
        }

        // add task, and wrap data
        $send = [
            'task' => $task,
            'load' => $load
        ];

        $this->socket->connect($this->socketUri);
        //$this->socket->send(json_encode($send), \ZMQ::MODE_DONTWAIT);

        $this->socket->send(json_encode($send));
       // $this->socket->disconnect($this->socketUri);

        $response = 'OK';

        return $response;
    }

    /**
     * send data to socket and listen for response
     * -> "Request" => "Response" setup
     * @param $task
     * @param $load
     * @return bool|string
     */
    /*
    public function sendData($task, $load = ''){
        $response = false;

        $this->initSocket();

        if( !$this->socket ){
            // Socket not active (e.g. URI missing)
            return $response;
        }

        // add task, and wrap data
        $send = [
            'task' => $task,
            'load' => $load
        ];

        $retriesLeft = $this->maxRetries;
        // try  sending data
        while($retriesLeft){
            // Get list of connected endpoints
            $endpoints = $this->socket->getEndpoints();
            if (in_array($this->socketUri, $endpoints['connect'])) {
                // disconnect e.g. there was no proper response yet

                $this->socket->disconnect($this->socketUri);
                // try new socket connection
                $this->initSocket();
            }

            $this->socket->connect($this->socketUri);
            $this->socket->send(json_encode($send));

            $readable = [];
            $writable = [];

            $poller = new \ZMQPoll();
            $poller->add($this->socket, \ZMQ::POLL_IN);

            $startTime = microtime(true);
            // infinite loop until we get a proper answer
            while(true){
                // Amount of events retrieved
                $events = 0;

                try{
                    // Poll until there is something to do
                    $events = $poller->poll($readable, $writable, $this->ttl);
                    $errors = $poller->getLastErrors();

                    if(count($errors) > 0){
                        // log errors
                        foreach($errors as $error){
                            LogController::getLogger('SOCKET_ERROR')->write(sprintf(self::ERROR_POLLING, $error));
                        }
                        // break infinite loop
                        break;
                    }
                }catch(\ZMQPollException $e){
                    LogController::getLogger('SOCKET_ERROR')->write(sprintf(self::ERROR_POLLING_FAILED, $e->getMessage() ));
                }


                if($events > 0){
                    try{
                        $response = $this->socket->recv();
                        // everything OK -> stop infinite loop AND retry loop!
                        break 2;
                    }catch(\ZMQException $e){
                        LogController::getLogger('SOCKET_ERROR')->write(sprintf(self::ERROR_RECV_FAILED, $e->getMessage() ));
                    }
                }

                if((microtime(true) - $startTime) > (self::DEFAULT_RESPONSE_MAX / 1000)){
                    // max time for response exceeded
                    LogController::getLogger('SOCKET_ERROR')->write(sprintf(self::ERROR_SEND_FAILED, self::DEFAULT_RESPONSE_MAX));
                    break;
                }

                // start inf loop again, no proper answer :(
            }

            if(--$retriesLeft <= 0){
                // retry limit exceeded
                LogController::getLogger('SOCKET_ERROR')->write(sprintf(self::ERROR_OFFLINE, $this->socketUri, $this->maxRetries, $this->ttl));
                break;
            }
        }

        $this->socket->disconnect($this->socketUri);

        return $response;
    }*/


}