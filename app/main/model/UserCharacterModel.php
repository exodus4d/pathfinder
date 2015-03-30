<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 28.03.15
 * Time: 21:49
 */

namespace Model;


class UserCharacterModel extends BasicModel {

    protected $table = 'user_character';
    protected $ttl = 0;
    protected $rel_ttl = 0;

    protected $fieldConf = array(
        'userId' => array(
            'belongs-to-one' => 'Model\UserModel'
        ),
        'apiId' => array(
            'belongs-to-one' => 'Model\UserApiModel'
        ),
        'log' => array(
            'has-one' => array('Model\CharacterLogModel', 'userCharacterId')
        )
    );

    /**
     * set an array with all data for a character
     * @param $characterData
     */
    public function setData($characterData){

        foreach((array)$characterData as $key => $value){

            if(!is_array($value)){
                if($this->exists($key)){
                    $this->$key = $value;
                }
            }
        }
    }

    /**
     * get all character data
     * @param $addCharacterLogData
     * @return array
     */
    public function getData($addCharacterLogData = false){

        $characterData = (object) [];
        $characterData->characterId = $this->characterId;
        $characterData->name = $this->characterName;
        $characterData->isMain = $this->isMain;

        // check for corporation
        if($this->corporationId){
            $characterData->coorporation = (object) [];
            $characterData->coorporation->id = $this->corporationId;
            $characterData->coorporation->name = $this->characterName;
        }

        // check for alliance
        if($this->allianceId){
            $characterData->alliance = (object) [];
            $characterData->alliance->id = $this->allianceId;
            $characterData->alliance->name = $this->allianceName;
        }

        // add character Log (current pilot data)
        if($addCharacterLogData){
            $characterLog = $this->getLog();
            if($characterLog){
                $characterData->log = $characterLog->getData();
            }

        }


        return $characterData;
    }

    /**
     * get character log model (if exists)
     * @return bool|mixed
     */
    public function getLog(){
        $this->filter('log', array('active = ?', 1));

        $characterLog = false;
        if($this->log){
            $characterLog = $this->log;
        }

        return $characterLog;
    }

} 