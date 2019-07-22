<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 21.03.15
 * Time: 14:34
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;
use lib\logging;

class SystemSignatureModel extends AbstractMapTrackingModel {

    protected $table = 'system_signature';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'systemId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\SystemModel',
            'constraint' => [
                [
                    'table' => 'system',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'groupId' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0,
            'index' => true,
            'activity-log' => true
        ],
        'typeId' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0,
            'index' => true,
            'activity-log' => true
        ],
        'connectionId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\ConnectionModel',
            'constraint' => [
                [
                    'table' => 'connection',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'activity-log' => true
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true,
            'validate' => true
        ],
        'description' => [
            'type' => Schema::DT_VARCHAR512,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
        ]
    ];

    /**
     * set data by associative array
     * @param array $data
     */
    public function setData(array $data){
        $this->copyfrom($data, ['name', 'groupId', 'typeId', 'description', 'connectionId']);
    }

    /**
     * get signature data
     * @return \stdClass
     */
    public function getData(){
        $signatureData                              = (object) [];
        $signatureData->id                          = $this->id;

        $signatureData->system                      = (object) [];
        $signatureData->system->id                  = $this->get('systemId', true);

        $signatureData->groupId                     = $this->groupId;
        $signatureData->typeId                      = $this->typeId;
        $signatureData->name                        = $this->name;
        $signatureData->description                 = $this->description;

        if($connection = $this->getConnection()){
            $signatureData->connection              = (object) [];
            $signatureData->connection->id          = $connection->_id;
        }

        $signatureData->created                     = (object) [];
        $signatureData->created->created            = strtotime($this->created);
        if( is_object($this->createdCharacterId) ){
            $signatureData->created->character      = $this->createdCharacterId->getBasicData();
        }

        $signatureData->updated                     = (object) [];
        $signatureData->updated->updated            = strtotime($this->updated);
        if( is_object($this->updatedCharacterId) ){
            $signatureData->updated->character      = $this->updatedCharacterId->getBasicData();
        }

        return $signatureData;
    }

    /**
     * setter for connectionId
     * @param $connectionId
     * @return int|null
     */
    public function set_connectionId($connectionId){
        $connectionId = (int)$connectionId;
        $validConnectionId = null;

        if($connectionId > 0){
            // check if connectionId is valid
            $systemId = (int) $this->get('systemId', true);

            /**
             * @var $connection ConnectionModel
             */
            $connection = $this->rel('connectionId');
            $connection->getById($connectionId);

            if(
                !$connection->dry() &&
                (
                    $connection->get('source', true) === $systemId||
                    $connection->get('target', true) === $systemId
                )
            ){
                // connectionId belongs to same system as $this signature -> is valid
                $validConnectionId = $connectionId;
            }
        }

        return $validConnectionId;
    }

    /**
     * validate name column
     * @param string $key
     * @param string $val
     * @return bool
     * @throws \Exception\ValidationException
     */
    protected function validate_name(string $key, string $val): bool {
        $valid = true;
        if(mb_strlen($val) < 3){
            $valid = false;
            $this->throwValidationException($key);
        }
        return $valid;
    }

    /**
     * @param string $action
     * @return logging\LogInterface
     * @throws \Exception\ConfigException
     */
    public function newLog(string $action = ''): Logging\LogInterface{
        return $this->getMap()->newLog($action)->setTempData($this->getLogObjectData());
    }

    /**
     * @return MapModel
     */
    public function getMap(): MapModel{
        return $this->get('systemId')->getMap();
    }

    /**
     * get the connection (if attached)
     * @return ConnectionModel|null
     */
    public function getConnection(){
        return $this->connectionId;
    }

    /**
     * compares a new data set (array) with the current values
     * and checks if something has changed
     * @param array $signatureData
     * @return bool
     */
    public function hasChanged(array $signatureData) : bool {
        $hasChanged = false;

        foreach((array)$signatureData as $key => $value){
            if($this->exists($key)){
                if($this->$key instanceof ConnectionModel){
                    $currentValue = $this->get($key, true);
                }else{
                    $currentValue = $this->$key;
                }

                $hasChanged = $currentValue !== $value;
                break;
            }
        }

        return $hasChanged;
    }

    /**
     * check object for model access
     * @param CharacterModel $characterModel
     * @return bool
     */
    public function hasAccess(CharacterModel $characterModel) : bool {
        return $this->systemId ? $this->systemId->hasAccess($characterModel) : false;
    }

    /**
     * delete signature
     * @return bool
     */
    public function delete() : bool {
        return $this->valid() ? $this->erase() : false;
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterInsertEvent($self, $pkeys){
        $self->logActivity('signatureCreate');
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     * @return bool
     */
    public function beforeUpdateEvent($self, $pkeys) : bool {
        // "updated" column should always be updated if no changes made this signature
        // -> makes it easier to see what signatures have not been updated
        $this->touch('updated');

        return parent::beforeUpdateEvent($self, $pkeys);
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterUpdateEvent($self, $pkeys){
        $self->logActivity('signatureUpdate');
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * @param self $self
     * @param $pkeys
     */
    public function afterEraseEvent($self, $pkeys){
        $self->logActivity('signatureDelete');
    }

    /**
     * get object relevant data for model log
     * @return array
     */
    public function getLogObjectData() : array{
        return [
            'objId' => $this->_id,
            'objName' => $this->name
        ];
    }

    /**
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     * @throws \Exception
     */
    public static function setup($db = null, $table = null, $fields = null){
        if($status = parent::setup($db, $table, $fields)){
            $status = parent::setMultiColumnIndex(['systemId', 'typeId', 'groupId']);
        }
        return $status;
    }
} 