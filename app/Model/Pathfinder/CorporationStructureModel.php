<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 15.04.2018
 * Time: 19:23
 */

namespace Exodus4D\Pathfinder\Model\Pathfinder;

use DB\SQL\Schema;

class CorporationStructureModel extends AbstractPathfinderModel {

    /**
     * @var string
     */
    protected $table = 'corporation_structure';

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
        'corporationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Pathfinder\CorporationModel',
            'constraint' => [
                [
                    'table' => 'corporation',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'structureId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Pathfinder\StructureModel',
            'constraint' => [
                [
                    'table' => 'structure',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ]
    ];

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
            $status = parent::setMultiColumnIndex(['corporationId', 'structureId'], true);
        }
        return $status;
    }
}