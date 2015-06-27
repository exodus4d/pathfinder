<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 11.04.15
 * Time: 15:20
 */

namespace Model;


class CharacterModel extends BasicModel {

    protected $table = 'character';

    protected $fieldConf = array(
        'corporationId' => array(
            'belongs-to-one' => 'Model\CorporationModel'
        ),
        'allianceId' => array(
            'belongs-to-one' => 'Model\AllianceModel'
        ),
        'characterLog' => array(
            'has-one' => array('Model\CharacterLogModel', 'characterId')
        )
    );

    /**
     * get character data
     * @return object
     */
    public function getData($addCharacterLogData = false){
        $characterData = (object) [];

        $characterData->id = $this->id;
        $characterData->name = $this->name;

        if($addCharacterLogData){
            $logModel = $this->getLog();
            if($logModel){
                $characterData->log = $logModel->getData();
            }
        }

        // check for corporation
        if($this->hasCorporation()){
            $characterData->corporation = $this->getCorporation()->getData();
        }

        // check for alliance
        if($this->allianceId){
            $characterData->alliance = $this->allianceId->getData();
        }

        return $characterData;
    }

    /**
     * check whether this character has a corporation
     * @return bool
     */
    public function hasCorporation(){
        $hasCorporation = false;

        if($this->corporationId){
            $hasCorporation = true;
        }

        return $hasCorporation;
    }

    /**
     * check whether this character has an alliance
     * @return bool
     */
    public function hasAlliance(){
        $hasAlliance = false;

        if($this->allianceId){
            $hasAlliance = true;
        }

        return $hasAlliance;
    }

    /**
     * get the corporation for this user
     * @return mixed|null
     */
    public function getCorporation(){
        $corporation = null;

        if($this->hasCorporation()){
            $corporation = $this->corporationId;
        }

        return $corporation;
    }

    /**
     * get the alliance of this user
     * @return mixed|null
     */
    public function getAlliance(){
        $alliance = null;

        if($this->hasAlliance()){
            $alliance = $this->allianceId;
        }

        return $alliance;
    }

    /**
     * get the character log entry for this character
     * @return bool|null
     */
    public function getLog(){

        $characterLog = false;
        if(
            is_object($this->characterLog) &&
            !$this->characterLog->dry()
        ){
            $characterLog = $this->characterLog;
        }

        return $characterLog;
    }

} 