<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 03.09.2017
 * Time: 17:39
 */

namespace lib\logging\handler;


use Monolog\Logger;

class ZMQHandler extends \Websoftwares\Monolog\Handler\ZMQHandler {


    /**
     * some meta data (additional processing information)
     * @var array|string
     */
    protected $metaData                 = [];

    public function __construct(
        \zmqSocket $zmqSocket,
        $zmqMode = \ZMQ::MODE_DONTWAIT,
        $multipart = false,
        $level = Logger::DEBUG,
        $bubble = true,
        $metaData = []
    ){
        $this->metaData = $metaData;

        parent::__construct($zmqSocket, $zmqMode, $multipart, $level, $bubble);
    }

    /**
     * overwrite default handle()
     * -> change data structure after processor() calls and before formatter() calls
     * @param array $record
     * @return bool
     * @throws \Exception
     */
    public function handle(array $record){
        if (!$this->isHandling($record)) {
            return false;
        }

        $record = $this->processRecord($record);

        $record = [
            'task' => 'logData',
            'load' => [
                'meta' => $this->metaData,
                'log' => $record
            ]
        ];

        $record['formatted'] = $this->getFormatter()->format($record);

        $this->write($record);

        return false === $this->bubble;
    }

}