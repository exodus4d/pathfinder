<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 30.03.15
 * Time: 00:04
 */

namespace Model\Pathfinder;

use Controller\Api\User as User;
use Controller\Controller as Controller;
use DB\SQL\Schema;

class CharacterLogModel extends AbstractPathfinderModel {

    protected $table = 'character_log';

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
            'belongs-to-one' => 'Model\Pathfinder\CharacterModel',
            'constraint' => [
                [
                    'table' => 'character',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'systemId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'activity-log' =>  true
        ],
        'systemName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'shipTypeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'activity-log' =>  true
        ],
        'shipTypeName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'shipId' => [
            'type' => Schema::DT_BIGINT,
            'index' => true,
            'activity-log' =>  true
        ],
        'shipMass' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0
        ],
        'shipName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'stationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'activity-log' =>  true
        ],
        'stationName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'structureId' => [
            'type' => Schema::DT_BIGINT,
            'index' => true,
            'activity-log' =>  true
        ],
        'structureName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ]
    ];

    /**
     * set log data by associative array
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

        if( isset($logData['ship']) ){
            $this->shipTypeId = (int)$logData['ship']['typeId'];
            $this->shipTypeName = $logData['ship']['typeName'];
            $this->shipId = (int)$logData['ship']['id'];
            $this->shipName = $logData['ship']['name'];
            $this->shipMass = (float)$logData['ship']['mass'];
        }else{
            $this->shipTypeId = null;
            $this->shipTypeName = '';
            $this->shipId = null;
            $this->shipName = '';
            $this->shipMass = 0;
        }

        if( isset($logData['station']) ){
            $this->stationId = (int)$logData['station']['id'];
            $this->stationName = $logData['station']['name'];
        }else{
            $this->stationId = null;
            $this->stationName = '';
        }

        if( isset($logData['structure']) ){
            $this->structureId = (int)$logData['structure']['id'];
            $this->structureName = $logData['structure']['name'];
        }else{
            $this->structureId = null;
            $this->structureName = '';
        }

    }

    /**
     * get all character log data
     * @return object
     */
    public function getData(){

        $logData                        = (object) [];
        $logData->system                = (object) [];
        $logData->system->id            = (int)$this->systemId;
        $logData->system->name          = $this->systemName;

        $logData->ship                  = (object) [];
        $logData->ship->typeId          = (int)$this->shipTypeId;
        $logData->ship->typeName        = $this->shipTypeName;
        $logData->ship->id              = $this->shipId;
        $logData->ship->name            = $this->shipName;
        $logData->ship->mass            = $this->shipMass;

        $logData->station               = (object) [];
        $logData->station->id           = (int)$this->stationId;
        $logData->station->name         = $this->stationName;

        $logData->structure             = (object) [];
        $logData->structure->id         = (int)$this->structureId;
        $logData->structure->name       = $this->structureName;

        return $logData;
    }

    /**
     *  setter for systemId
     * @param int $systemId
     * @return int
     * @throws \Exception
     */
    public function set_systemId($systemId){
        if($systemId > 0){
            $this->updateCharacterSessionLocation($systemId);
        }
        return $systemId;
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterInsertEvent($self, $pkeys){
        $self->clearCacheData();
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterUpdateEvent($self, $pkeys){
        // check if any "relevant" column has changed
        if(!empty($this->fieldChanges)){
            $self->clearCacheData();
        }
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * @param self $self
     * @param $pkeys
     */
    public function afterEraseEvent($self, $pkeys){
        $self->clearCacheData();
    }

    /**
     * see parent
     */
    public function clearCacheData(){
        // clear character "LOG" cache
        // -> character data without "LOG" has not changed!
        if(is_object($this->characterId)){
            // characterId relation could be deleted by cron therefore check again first...
            $this->characterId->clearCacheDataWithPrefix(CharacterModel::DATA_CACHE_KEY_LOG);

            // broadcast updated character data (with changed log data)
            $this->characterId->broadcastCharacterUpdate();
        }
    }

    /**
     * update session data for active character
     * @param int $systemId
     * @throws \Exception
     */
    protected function updateCharacterSessionLocation(int $systemId){
        $controller = new Controller();

        if(
            !empty($sessionCharacter = $controller->getSessionCharacterData()) &&
            $sessionCharacter['ID'] === $this->get('characterId', true)
        ){
            $systemChanged = false;
            if((int)$sessionCharacter['PREV_SYSTEM_ID'] === 0){
                $sessionCharacter['PREV_SYSTEM_ID'] = (int)$systemId;
                $systemChanged = true;
            }elseif((int)$sessionCharacter['PREV_SYSTEM_ID'] !== $this->systemId){
                $sessionCharacter['PREV_SYSTEM_ID'] = $this->systemId;
                $systemChanged = true;
            }

            if($systemChanged){
                $sessionCharacters = CharacterModel::mergeSessionCharacterData([$sessionCharacter]);
                $this->getF3()->set(User::SESSION_KEY_CHARACTERS, $sessionCharacters);
            }
        }
    }

} 