<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 29.07.2017
 * Time: 16:49
 */

namespace Model\Universe;

use DB\SQL\Schema;

class ConstellationModel extends BasicUniverseModel {

    protected $table = 'constellation';

    /**
     * No static columns added
     * @var bool
     */
    protected $addStaticFields = false;

    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'regionId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Universe\RegionModel',
            'constraint' => [
                [
                    'table' => 'region',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'x' => [
            'type' => Schema::DT_INT8,
            'nullable' => false,
            'default' => 0
        ],
        'y' => [
            'type' => Schema::DT_INT8,
            'nullable' => false,
            'default' => 0
        ],
        'z' => [
            'type' => Schema::DT_INT8,
            'nullable' => false,
            'default' => 0
        ]
    ];

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){

    }

}