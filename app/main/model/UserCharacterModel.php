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

    private $character = null;

    protected $fieldConf = array(
        'userId' => array(
            'belongs-to-one' => 'Model\UserModel'
        ),
        'apiId' => array(
            'belongs-to-one' => 'Model\UserApiModel'
        ),
        'characterId' => array(
            'belongs-to-one' => 'Model\CharacterModel'
        )
    /*
    ,
        'log' => array(
            'has-one' => array('Model\CharacterLogModel', 'userCharacterId')
        ) */


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


        // get characterModel
        $characterModel = $this->characterId;

        $characterData = (object) [];
        $characterData->characterId = $characterModel->characterId;
        $characterData->name = $characterModel->name;
        $characterData->isMain = $this->isMain;

        // check for corporation
        if($characterModel->corporationId){
            $characterData->corporation = (object) [];
            $characterData->corporation->id = $characterModel->corporationId;
            $characterData->corporation->name = $characterModel->corporationName;
        }

        // check for alliance
        if($characterModel->allianceId){
            $characterData->alliance = (object) [];
            $characterData->alliance->id = $characterModel->allianceId;
            $characterData->alliance->name = $characterModel->allianceName;
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
     * check if this character is Main character or not
     * @return bool
     */
    public function isMain(){
        $isMain = false;
        if($this->isMain == 1){
            $isMain = true;
        }

        return $isMain;
    }

    /**
     * set this character as main character
     */
    public function setMain($value = 0){
        $this->isMain = $value;
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