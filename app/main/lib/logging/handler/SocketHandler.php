<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 23.02.2019
 * Time: 19:11
 */

namespace lib\logging\handler;


use Monolog\Logger;

class SocketHandler extends \Monolog\Handler\SocketHandler {

    /**
     * some meta data (additional processing information)
     * @var array|string
     */
    protected $metaData                 = [];

    public function __construct($connectionString, $level = Logger::DEBUG, $bubble = true, $metaData = []){
        $this->metaData = $metaData;

        parent::__construct($connectionString, $level, $bubble);
    }

    /**
     * overwrite default handle()
     * -> change data structure after processor() calls and before formatter() calls
     * @param array $record
     * @return bool
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