<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 05.11.2017
 * Time: 17:51
 */

namespace Model;

use DB\SQL\Schema;

class ConnectionLogModel extends BasicModel {

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
            'belongs-to-one' => 'Model\ConnectionModel',
            'constraint' => [
                [
                    'table' => 'connection',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'shipTypeId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'shipTypeName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'shipMass' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0
        ],
        'characterId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'characterName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ]
    ];

    /**
     * get connection log data
     * @return \stdClass
     */
    public function getData() : \stdClass {
        $logData                            = (object) [];
        $logData->id                        = $this->id;

        $logData->connection                = (object) [];
        $logData->connection->id            = $this->get('connectionId', true);

        $logData->ship                      = (object) [];
        $logData->ship->typeId              = (int)$this->shipTypeId;
        $logData->ship->typeName            = $this->shipTypeName;
        $logData->ship->mass                = $this->shipMass;

        $logData->created                   = (object) [];
        $logData->created->created          = strtotime($this->created);
        $logData->created->character        = (object) [];
        $logData->created->character->id    = $this->characterId;
        $logData->created->character->name  = $this->characterName;

        return $logData;
    }
}