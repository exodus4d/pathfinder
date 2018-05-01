<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 15.04.2018
 * Time: 19:23
 */

namespace Model;

use DB\SQL\Schema;

class CorporationStructureModel extends BasicModel {

    protected $table = 'corporation_structure';

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
            'belongs-to-one' => 'Model\CorporationModel',
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
            'belongs-to-one' => 'Model\StructureModel',
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
    public static function setup($db=null, $table=null, $fields=null){
        $status = parent::setup($db,$table,$fields);

        if($status === true){
            $status = parent::setMultiColumnIndex(['corporationId', 'structureId'], true);
        }

        return $status;
    }
}