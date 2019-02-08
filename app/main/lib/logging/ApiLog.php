<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 01.01.2019
 * Time: 16:42
 */

namespace lib\logging;


class ApiLog extends AbstractLog {

    /**
     * List of possible handlers (tested)
     * -> final handler will be set dynamic for per instance
     * @var array
     */
    protected $handlerConfig        = [
        //'stream' => 'json'
    ];

    protected $channelType          = 'api';

    public function __construct(string $action, string $level){
        parent::__construct($action);

        $this->setLevel($level);
    }

    /**
     * overwrites parent
     * -> we need unique channelNames for different $actions within same $channelType
     * -> otherwise logs would be bundled into the first log file handler
     * @return string
     */
    public function getChannelName(): string{
        return $this->getChannelType() . '_' . $this->getAction();
    }
}