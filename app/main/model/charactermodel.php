<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 11.04.15
 * Time: 15:20
 */

namespace Model;

use DB\SQL\Schema;

class CharacterModel extends BasicModel {

    protected $table = 'character';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'corporationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\CorporationModel',
            'constraint' => [
                [
                    'table' => 'corporation',
                    'on-delete' => 'SET NULL'
                ]
            ]
        ],
        'allianceId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\AllianceModel',
            'constraint' => [
                [
                    'table' => 'alliance',
                    'on-delete' => 'SET NULL'
                ]
            ]
        ],
        'factionId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'factionName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'characterLog' => [
            'has-one' => ['Model\CharacterLogModel', 'characterId']
        ]
    ];

    /**
     * get character data
     * @param bool|false $addCharacterLogData
     * @return object
     */
    public function getData($addCharacterLogData = false){

        // check if there is cached data
        // temporary disabled (performance test)
        $characterData = null; //$this->getCacheData();

        if(is_null($characterData)){
            // no cached character data found

            $characterData = (object) [];

            $characterData->id = $this->id;
            $characterData->name = $this->name;

            if($addCharacterLogData){
                if($logModel = $this->getLog()){
                    $characterData->log = $logModel->getData();
                }
            }

            // check for corporation
            if($corporation = $this->getCorporation()){
                $characterData->corporation = $corporation->getData();
            }

            // check for alliance
            if($alliance = $this->getAlliance()){
                $characterData->alliance = $alliance->getData();
            }

            // max caching time for a system
            // the cached date has to be cleared manually on any change
            // this includes system, connection,... changes (all dependencies)
            $this->updateCacheData($characterData, '', 300);
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