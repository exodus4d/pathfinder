<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 30.03.15
 * Time: 00:04
 */

namespace Model\Pathfinder;


use DB\SQL\Schema;

/**
 * Class CharacterLogModel
 * @package Model\Pathfinder
 * @property CharacterModel $characterId
 */
class CharacterLogModel extends AbstractPathfinderModel {

    /**
     * @var string
     */
    protected $table = 'character_log';

    /**
     * @var array
     */
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
            'activity-log' => true,
            'validate' => 'notEmpty'
        ],
        'systemName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true,
            'validate' => 'notEmpty'
        ],
        'shipTypeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'activity-log' => true
        ],
        'shipTypeName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
        ],
        'shipId' => [
            'type' => Schema::DT_BIGINT,
            'index' => true,
            'activity-log' => true
        ],
        'shipMass' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0,
            'activity-log' => true
        ],
        'shipName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'stationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'activity-log' => true
        ],
        'stationName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
        ],
        'structureId' => [
            'type' => Schema::DT_BIGINT,
            'index' => true,
            'activity-log' => true
        ],
        'structureName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
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
     * get character log data
     * @return \stdClass
     */
    public function getData() : \stdClass {

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
     * get 'character log' data as array
     * @return array
     */
    public function getDataAsArray() : array {
        return json_decode(json_encode($this->getData()), true);
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
        $self->updateLogsHistory('update');

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
        $self->deleteLogsHistory();
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
     * update 'character log' history data
     * -> checks $this->fieldChanges
     * @param string $action
     */
    protected function updateLogsHistory(string $action){
        if(
            $this->valid() &&
            is_object($this->characterId)
        ){
            $this->characterId->updateLogsHistory($this, $action);
        }
    }

    /**
     * delete 'character log' history data
     */
    protected function deleteLogsHistory(){
        if(is_object($this->characterId)){
            $this->characterId->clearCacheDataWithPrefix(CharacterModel::DATA_CACHE_KEY_LOG_HISTORY);
        }
    }

} 