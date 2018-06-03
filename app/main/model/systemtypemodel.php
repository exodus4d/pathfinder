<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 25.02.15
 * Time: 21:59
 */

namespace Model;

use DB\SQL\Schema;

class SystemTypeModel extends BasicModel {

    protected $table = 'system_type';

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
        ]
    ];

    protected static $tableData = [
        [
            'id' => 1,
            'name' => 'w-space'     // Wormhole Space
        ],
        [
            'id' => 2,
            'name' => 'k-space'     // Known Space
        ],
        [
            'id' => 3,
            'name' => 'a-space'     // Abyss Space
        ]
    ];

} 