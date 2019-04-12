<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 17.02.15
 * Time: 20:01
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;

class ConnectionScopeModel extends AbstractPathfinderModel {

    protected $table = 'connection_scope';

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
        'connectorDefinition' => [
            'type' => Schema::DT_VARCHAR256,
            'nullable' => false,
            'default' => ''
        ]
    ];

    protected static $tableData = [
        [
            'id' => 1,
            'name' => 'wh',
            'label' => 'wormhole',
            'connectorDefinition' => '[ "Bezier", { "curviness": 40 } ]'
        ],
        [
            'id' => 2,
            'name' => 'stargate',
            'label' => 'stargate',
            'connectorDefinition' => '[ "Flowchart", { "stub": [20, 20], "gap": 0, "cornerRadius": 5, "alwaysRespectStubs": false } ]'
        ],
        [
            'id' => 3,
            'name' => 'jumpbridge',
            'label' => 'jumpbridge',
            'connectorDefinition' => '[ "Straight", { "stub": [5, 5], "gap": 0 } ]'
        ],
        [
            'id' => 4,
            'name' => 'abyssal',
            'label' => 'abyssal',
            'connectorDefinition' => '[ "Straight", { "stub": [5, 5], "gap": 0 } ]'
        ]

    ];

} 