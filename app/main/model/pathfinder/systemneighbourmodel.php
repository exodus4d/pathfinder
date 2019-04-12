<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 24.12.2015
 * Time: 00:59
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;

class SystemNeighbourModel extends AbstractPathfinderModel {

    protected $table = 'system_neighbour';

    protected $fieldConf = [
        'regionId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'constellationId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'systemName' => [
            'type' => Schema::DT_VARCHAR128,
            'default' => ''
        ],
        'systemId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'jumpNodes' => [
            'type' => Schema::DT_VARCHAR512,
            'default' => ''
        ],
        'trueSec' => [
            'type' => Schema::DT_DECIMAL,
            'default' => 0
        ]
    ];

    /**
     * No static columns added
     * @var bool
     */
    protected $addStaticFields = false;
}