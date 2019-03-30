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
     * @param string $action
     * @param null $data
     * @return Promise\PromiseInterface
     */
    public function write(string $action, $data = null) : Promise\PromiseInterface;

    /**
     * @param string $class
     * @param string $uri
     * @param array $options
     * @return SocketInterface
     */
    public static function factory(string $class, string $uri, array $options = []) : SocketInterface;
}