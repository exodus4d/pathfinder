<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 16.02.2019
 * Time: 11:26
 */

namespace lib\socket;


use React\EventLoop;
use React\Promise;

interface SocketInterface {

    /**
     * @return EventLoop\LoopInterface
     */
    public function getLoop(): EventLoop\LoopInterface;

    /**
     * @param string $action
     * @param null $data
     * @return Promise\PromiseInterface
     */
    public function write(string $action, $data = null) : Promise\PromiseInterface;
}