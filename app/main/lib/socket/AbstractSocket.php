<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 12.02.2019
 * Time: 19:13
 */

namespace lib\socket;


use React\EventLoop;
use React\Socket;
use React\Promise;
use React\Stream;
use Clue\React\NDJson;

abstract class AbstractSocket implements SocketInterface {

    /**
     * max length for JSON data string
     * -> throw OverflowException on exceed
     */
    const JSON_DECODE_MAX_LENGTH = 65536 * 4;

    /**
     * @var EventLoop\LoopInterface|null
     */
    private $loop;

    /**
     * Socket URI
     * @var string
     */
    protected $uri;

    /**
     * Socket Options
     * @var array
     */
    protected $options;

    /**
     * AbstractSocket constructor.
     * @param string $uri
     * @param array $options
     */
    public function __construct(string $uri, array $options = []){
        $this->uri = $uri;
        $this->options = $options;
    }

    /**
     * @return Socket\ConnectorInterface
     */
    abstract protected function getConnector() : Socket\ConnectorInterface;

    /**
     * @return EventLoop\LoopInterface
     */
    protected function getLoop(): EventLoop\LoopInterface {
        if(!($this->loop instanceof EventLoop\LoopInterface)){
            $this->loop = EventLoop\Factory::create();
        }

        return $this->loop;
    }

    /**
     * connect to socket
     * @return Promise\PromiseInterface
     */
    protected function connect() : Promise\PromiseInterface {
        $deferred = new Promise\Deferred();

        $this->getConnector()
            ->connect($this->uri)
            ->then($this->initConnection())
            ->then(
                function(Socket\ConnectionInterface $connection) use ($deferred) {
                    $deferred->resolve($connection);
                },
                function(\Exception $e) use ($deferred) {
                    $deferred->reject($e);
                });

        return $deferred->promise();
    }

    /**
     * @param string $task
     * @param null $load
     * @return Promise\PromiseInterface
     */
    public function write(string $task, $load = null) : Promise\PromiseInterface {
        $deferred = new Promise\Deferred();
        $payload = $this->newPayload($task, $load);

        $this->connect()
            ->then(
                function(Socket\ConnectionInterface $connection) use ($payload, $deferred) {
                    return (new Promise\FulfilledPromise($connection))
                        ->then($this->initWrite($payload))
                        ->then($this->initRead())
                        ->then($this->initClose($connection))
                        ->then(
                            function($payload) use ($deferred) {
                                // we got valid data from socketServer -> check if $payload contains an error
                                if(is_array($payload) && $payload['task'] == 'error'){
                                    // ... wrap error payload in a rejectedPromise
                                    $deferred->reject(
                                        new Promise\RejectedPromise(
                                            new \Exception($payload['load'])
                                        )
                                    );
                                }else{
                                    // good response
                                    $deferred->resolve($payload);
                                }
                            },
                            function(\Exception $e) use ($deferred) {
                                $deferred->reject($e);
                            });
                },
                function(\Exception $e) use ($deferred) {
                    // connection error
                    $deferred->reject($e);
                });

        $this->getLoop()->run();

        return $deferred->promise()
            ->otherwise(
                // final exception handler for rejected promises -> convert to payload array
                // -> No socket related Exceptions should be thrown down the chain
                function(\Exception $e){
                    return new Promise\RejectedPromise(
                        $this->newPayload('error', $e->getMessage())
                    );
                });
    }

    /**
     * set connection events
     * @return callable
     */
    protected function initConnection() : callable {
        return function(Socket\ConnectionInterface $connection) : Promise\PromiseInterface {
            $deferred = new Promise\Deferred();

            /* connection event callbacks should be added here (if needed)
            $connection->on('end', function(){
                echo "pf: connection on end" . PHP_EOL;
            });

            $connection->on('error', function(\Exception $e) {
                echo "pf: connection on error: " . $e->getMessage() . PHP_EOL;
            });

            $connection->on('close', function(){
                echo "pf: connection on close" . PHP_EOL;
            });
            */

            $deferred->resolve($connection);
            //$deferred->reject(new \RuntimeException('lala'));

            return $deferred->promise();
        };
    }

    /**
     * write payload to connection
     * @param $payload
     * @return callable
     */
    protected function initWrite($payload) : callable {
        return function(Socket\ConnectionInterface $connection) use ($payload) : Promise\PromiseInterface {
            $deferred = new Promise\Deferred();

            $streamEncoded = new NDJson\Encoder($connection);

            $streamEncoded->on('error', function(\Exception $e) use ($deferred) {
                $deferred->reject($e);
            });

            if($streamEncoded->write($payload)){
                $deferred->resolve($connection);
            }

            return $deferred->promise();
        };
    }

    /**
     * read response data from connection
     * @return callable
     */
    protected function initRead() : callable {
        return function(Socket\ConnectionInterface $connection) : Promise\PromiseInterface {
            // new empty stream for processing JSON
            $stream = new Stream\ThroughStream();

            $streamDecoded = new NDJson\Decoder($stream, true, 512, 0, self::JSON_DECODE_MAX_LENGTH);

            // promise get resolved on first emit('data')
            $promise = Promise\Stream\first($streamDecoded);

            // register on('data') for main input stream
            $connection->once('data', function ($chunk) use ($stream) {
                // send current data chunk to processing stream -> resolves promise
                $stream->emit('data', [$chunk]);
            });

            return $promise;
        };
    }

    /**
     * close connection
     * @param Socket\ConnectionInterface $connection
     * @return callable
     */
    protected function initClose(Socket\ConnectionInterface $connection) : callable {
        return function($payload) use ($connection) : Promise\PromiseInterface {
            $deferred = new Promise\Deferred();
            $deferred->resolve($payload);

            //$connection->close();
            return $deferred->promise();
        };
    }
    /**
     * get new payload
     * @param string $task
     * @param null $load
     * @return array
     */
    protected function newPayload(string $task, $load = null) : array {
        $payload = [
            'task'  => $task,
            'load'  => $load
        ];

        return $payload;
    }

    /**
     * use this function to create new Socket instances
     * @param string $class
     * @param string $uri
     * @param array $options
     * @return SocketInterface
     */
    public static function factory(string $class, string $uri, array $options = []) : SocketInterface {
        if(class_exists($class) && $uri){
            return new $class($uri, $options);
        }else{
            // invalid Socket requirements -> return NullSocket
            return new NullSocket($uri);
        }
    }
}