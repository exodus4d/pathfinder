<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 05.11.2017
 * Time: 17:51
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;

class ConnectionLogModel extends AbstractPathfinderModel {

    protected $table = 'connection_log';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
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
            'validate' => 'notDry'
        ],
        'record' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'shipTypeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'validate' => 'notEmpty'
        ],
        'shipTypeName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'shipMass' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0,
            'validate' => 'notEmpty'
        ],
        'characterId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'validate' => 'notEmpty'
        ],
        'characterName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ]
    ];

    /**
     * set data by associative array
     * @param array $data
     */
    public function setData(array $data){
        $this->copyfrom($data, ['shipTypeId', 'shipTypeName', 'shipMass', 'characterId', 'characterName']);
    }

    /**
     * get connection log data
     * @return \stdClass
     */
    public function getData() : \stdClass {
        $logData                            = (object) [];
        $logData->id                        = $this->id;
        $logData->active                    = $this->active;
        $logData->record                    = $this->record;

        $logData->connection                = (object) [];
        $logData->connection->id            = $this->get('connectionId', true);

        $logData->ship                      = (object) [];
        $logData->ship->typeId              = (int)$this->shipTypeId;
        $logData->ship->typeName            = $this->shipTypeName;
        $logData->ship->mass                = $this->shipMass;

        $logData->character                 = (object) [];
        $logData->character->id             = $this->characterId;
        $logData->character->name           = $this->characterName;

        $logData->created                   = (object) [];
        $logData->created->created          = strtotime($this->created);

        $logData->updated                   = (object) [];
        $logData->updated->updated          = strtotime($this->updated);

        return $logData;
    }

    /**
     * validate shipTypeId
     * @param string $key
     * @param string $val
     * @return bool
     */
    protected function validate_shipTypeId(string $key, string $val): bool {
        return !empty((int)$val);
    }

    /**
     * @return ConnectionModel
     */
    public function getConnection() : ConnectionModel {
        return $this->get('connectionId');
    }

    /**
     * check object for model access
     * @param CharacterModel $characterModel
     * @return bool
     */
    public function hasAccess(CharacterModel $characterModel) : bool {
        $access = false;
        if( !$this->dry() ){
            $access = $this->getConnection()->hasAccess($characterModel);
        }
        return $access;
    }
}