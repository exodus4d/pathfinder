<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 16.02.2019
 * Time: 10:04
 */

namespace lib\socket;


use React\Socket;

class TcpSocket extends AbstractSocket {

    const SOCKET_NAME = 'webSocket';

    protected function getConnector(): Socket\ConnectorInterface {
        return new Socket\Connector($this->getLoop(), $this->options);
    }

}