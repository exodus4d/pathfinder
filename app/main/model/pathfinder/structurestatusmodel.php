<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 15.04.2018
 * Time: 20:13
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;


class StructureStatusModel extends AbstractPathfinderModel {

    protected $table = 'structure_status';

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
        'label' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'class' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'structures' => [
            'has-many' => ['Model\Pathfinder\StructureModel', 'statusId']
        ]
    ];

    protected static $tableData = [
        [
            'id' => 1,
            'name' => 'unknown',
            'label' => '',
            'class' => 'pf-structure-status-unknown'
        ],
        [
            'id' => 2,
            'name' => 'online',
            'label' => 'online',
            'class' => 'pf-structure-status-online'
        ],
        [
            'id' => 3,
            'name' => 'offline',
            'label' => 'offline',
            'class' => 'pf-structure-status-offline'
        ]
    ];

    /**
     * get structure status data
     * @return \stdClass
     */
    public function getData() : \stdClass {
        $statusData                         = (object) [];
        $statusData->id                     = $this->_id;
        $statusData->name                   = $this->name;
        $statusData->label                  = $this->label;
        $statusData->class                  = $this->class;

        return $statusData;
    }

    /**
     * get all status options
     * @return \DB\CortexCollection
     */
    public static function getAll(){
        $query = [
            'active = :active',
            ':active' => 1
        ];

        return (new self())->find($query);
    }
}