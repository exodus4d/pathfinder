<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 24.03.2019
 * Time: 23:22
 */

namespace Exodus4D\Pathfinder\Lib\Socket;


use React\Socket;
use React\Promise;

class NullSocket extends AbstractSocket {

    /**
     * name of Socket
     */
    const SOCKET_NAME = 'webSocket';

    /**
     * @return Socket\ConnectorInterface
     */
    protected function getConnector(): Socket\ConnectorInterface {
        return new Socket\Connector($this->getLoop(), $this->options);
    }

    /**
     * write to NullSocket can not be performed
     * @param string $task
     * @param null $load
     * @return Promise\PromiseInterface
     */
    public function write(string $task, $load = null) : Promise\PromiseInterface {
        return new Promise\RejectedPromise();
    }
}