<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 22.09.2017
 * Time: 19:05
 */

namespace lib\logging;

use lib\Config;
use Model\Pathfinder\CharacterModel;

abstract class AbstractCharacterLog extends AbstractChannelLog {

    /**
     * @var CharacterModel
     */
    private $character              = null;

    /**
     * AbstractCharacterLog constructor.
     * @param string $action
     * @param array $objectData
     */
    public function __construct(string $action, array $objectData){
        parent::__construct($action, $objectData);

        // add log processor -> remove $channelData from log
        $processorAddThumbData = function($record){
            $record['extra']['thumb']['url'] = $this->getThumbUrl();
            return $record;
        };

        // init processorConfig. IMPORTANT: first processor gets executed at the end!
        $this->processorConfig = ['addThumbData' => $processorAddThumbData] + $this->processorConfig;
    }

    /**
     * CharacterModel $character
     * @param CharacterModel $character
     * @return LogInterface
     */
    public function setCharacter(CharacterModel $character): LogInterface{
        $this->character = $character;
        return $this;
    }

    /**
     * @return CharacterModel
     */
    public function getCharacter(): CharacterModel{
        return $this->character;
    }

    /**
     * @return array
     */
    public function getData() : array{
        $data = parent::getData();

        if(is_object($character = $this->getCharacter())){
            $characterData['character'] = [
                'id' => $character->_id,
                'name' => $character->name
            ];
            $data = $characterData + $data;
        }

        return $data;
    }

    /**
     * get character thumbnailUrl
     * @return string
     */
    protected function getThumbUrl(): string {
        $url = '';
        if(is_object($character = $this->getCharacter())){
            $url = Config::getPathfinderData('api.ccp_image_server') . '/Character/' . $character->_id . '_128.jpg';
        }

        return $url;
    }

}