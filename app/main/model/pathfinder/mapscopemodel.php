<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 17.02.15
 * Time: 20:01
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;

class MapScopeModel extends AbstractPathfinderModel{

    protected $table = 'map_scope';

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
        ]
    ];

    protected static $tableData = [
        [
            'id' => 1,
            'name' => 'wh',
            'label' => 'wormholes'
        ],[
            'id' => 2,
            'name' => 'k-space',
            'label' => 'stargates'
        ],[
            'id' => 3,
            'name' => 'none',
            'label' => 'none'
        ],[
            'id' => 4,
            'name' => 'all',
            'label' => 'all'
        ]
    ];

} 