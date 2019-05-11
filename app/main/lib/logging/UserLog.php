<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 07.10.2017
 * Time: 14:15
 */

namespace lib\logging;


class UserLog extends AbstractChannelLog {

    /**
     * List of possible handlers (tested)
     * -> final handler will be set dynamic for per instance
     * @var array
     */
    protected $handlerConfig        = [
        // 'mail' => 'html'
    ];

    /**
     * @var string
     */
    protected $channelType          = 'user';

    public function __construct(string $action, array $objectData){
        parent::__construct($action, $objectData);

        $this->setLevel('notice');
        $this->setTag('information');
    }


}