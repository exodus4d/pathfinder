<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 30.03.15
 * Time: 00:04
 */

namespace Model;

use Controller\Api\User as User;
use Controller\Controller as Controller;
use DB\SQL\Schema;

class CharacterLogModel extends BasicModel {

    protected $table = 'character_log';

    /**
     * caching for relational data
     * -> 5s matches REST API - Expire: Header-Data
     *    for "Location" calls
     * @var int
     */
    protected $rel_ttl = 5;

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'characterId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'unique' => true,
            'belongs-to-one' => 'Model\CharacterModel',
            'constraint' => [
                [
                    'table' => 'character',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],

        // --------------------------------------------------------------------

        'systemId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'systemName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'constellationId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'constellationName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'regionId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'regionName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],

        // --------------------------------------------------------------------
        'shipTypeId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'shipTypeName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'shipId' => [
            'type' => Schema::DT_BIGINT,
            'index' => true
        ],
        'shipName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'stationId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'stationName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ]
    ];

    /**
     * set log data from array
     * @param array $logData
     */
    public function setData($logData){

        if( isset($logData['system']) ){
            $this->systemId = (int)$logData['system']['id'];
            $this->systemName = $logData['system']['name'];
        }else{
            $this->systemId = null;
            $this->systemName = '';
        }

        if( isset($logData['constellation']) ){
            $this->constellationId = (int)$logData['constellation']['id'];
            $this->constellationName = $logData['constellation']['name'];
        }else{
            $this->constellationId = null;
            $this->constellationName = '';
        }

        if( isset($logData['region']) ){
            $this->regionId = (int)$logData['region']['id'];
            $this->regionName = $logData['region']['name'];
        }else{
            $this->regionId = null;
            $this->regionName = '';
        }

        // --------------------------------------------------------------------

        if( isset($logData['ship']) ){
            $this->shipTypeId = (int)$logData['ship']['typeId'];
            $this->shipTypeName = $logData['ship']['typeName'];
            $this->shipId = (int)$logData['ship']['id'];
            $this->shipName = $logData['ship']['name'];
        }else{
            $this->shipTypeId = null;
            $this->shipTypeName = '';
            $this->shipId = null;
            $this->shipName = '';
        }

        if( isset($logData['station']) ){
            $this->stationId = (int)$logData['station']['id'];
            $this->stationName = $logData['station']['name'];
        }else{
            $this->stationId = null;
            $this->stationName = '';
        }

    }

    /**
     * get all character log data
     * @return object
     */
    public function getData(){

        $logData = (object) [];
        $logData->system = (object) [];
        $logData->system->id = (int)$this->systemId;
        $logData->system->name = $this->systemName;

        $logData->constellation = (object) [];
        $logData->constellation->id = (int)$this->constellationId;
        $logData->constellation->name = $this->constellationName;

        $logData->region = (object) [];
        $logData->region->id = (int)$this->regionId;
        $logData->region->name = $this->regionName;

        // --------------------------------------------------------------------

        $logData->ship = (object) [];
        $logData->ship->typeId = (int)$this->shipTypeId;
        $logData->ship->typeName = $this->shipTypeName;
        $logData->ship->id = $this->shipId;
        $logData->ship->name = $this->shipName;

        $logData->station = (object) [];
        $logData->station->id = (int)$this->stationId;
        $logData->station->name = $this->stationName;

        return $logData;
    }

    /**
     * @param int $systemId
     * @return int
     */
    public function set_systemId($systemId){
        if($systemId > 0){
            $this->updateCharacterSessionLocation($systemId);
        }
        return $systemId;
    }

    /**
     * update session data for active character
     * @param int $systemId
     */
    protected function updateCharacterSessionLocation($systemId){
        $controller = new Controller();

        if(
            !empty($sessionCharacter = $controller->getSessionCharacterData()) &&
            $sessionCharacter['ID'] === $this->get('characterId', true)
        ){
            $prevSystemId = (int)$sessionCharacter['PREV_SYSTEM_ID'];

            if($prevSystemId === 0){
                $sessionCharacter['PREV_SYSTEM_ID'] = (int)$systemId;
            }else{
                $sessionCharacter['PREV_SYSTEM_ID'] = $this->systemId;
            }

            $sessionCharacters = CharacterModel::mergeSessionCharacterData([$sessionCharacter]);
            $this->getF3()->set(User::SESSION_KEY_CHARACTERS, $sessionCharacters);
        }
    }

} 