<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 16.02.2019
 * Time: 10:04
 */

namespace Exodus4D\Pathfinder\Lib\Socket;


use React\Socket;

class TcpSocket extends AbstractSocket {

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

}