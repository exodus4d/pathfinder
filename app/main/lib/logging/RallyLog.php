<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 22.09.2017
 * Time: 16:50
 */

namespace lib\logging;

use lib\Config;

class RallyLog extends AbstractCharacterLog {

    /**
     * List of possible handlers (tested)
     * -> final handler will be set dynamic for per instance
     * @var array
     */
    protected $handlerConfig        = [
        // 'slackRally' => 'json',
        // 'mail' => 'html'
    ];

    /**
     * @var string
     */
    protected $channelType          = 'rally';


    public function __construct(string $action, array $objectData){
        parent::__construct($action, $objectData);

        $this->setLevel('notice');
        $this->setTag('information');
    }

    /**
     * @return string
     */
    protected function getThumbUrl() : string{
        $url = '';
        if(is_object($character = $this->getCharacter())){
            $characterLog = $character->getLog();
            if($characterLog && !empty($characterLog->shipTypeId)){
                $url = Config::getPathfinderData('api.ccp_image_server') . '/Render/' . $characterLog->shipTypeId . '_64.png';
            }else{
                $url = parent::getThumbUrl();
            }
        }

        return $url;
    }

    /**
     * @return string
     */
    public function getMessage() : string{
        return "*New RallyPoint system '{objName}'* _#{objId}_ *map '{channelName}'* _#{channelId}_ ";
    }

    /**
     * @return array
     */
    public function getData() : array{
        $data = parent::getData();

        // add system -----------------------------------------------------------------------------
        if(!empty($tempLogData = $this->getTempData())){
            $objectData['object'] = $tempLogData;
            $data = $objectData + $data;
        }

        // add human readable changes to string ---------------------------------------------------
        $data['formatted'] = $this->formatData($data);

        return $data;
    }

    /**
     * @param array $data
     * @return string
     */
    protected function formatData(array $data): string{
        $string = '';

        if(
            !empty($data['object']) &&
            !empty($data['channel'])
        ){
            $replace = [
                '{objName}'     => $data['object']['objName'],
                '{objId}'       => $data['object']['objId'],
                '{channelName}' => $data['channel']['channelName'],
                '{channelId}'   => $data['channel']['channelId']
            ];
            $string = str_replace(array_keys($replace), array_values($replace), $this->getMessage());
        }

        return $string;
    }



}