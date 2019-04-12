<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 01.04.15
 * Time: 21:12
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;

class CharacterStatusModel extends AbstractPathfinderModel {

    protected $table = 'character_status';

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
        'class' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ]
    ];

    protected static $tableData = [
        [
            'id' => 1,
            'name' => 'corporation',
            'class' => 'pf-user-status-corp'
        ],
        [
            'id' => 2,
            'name' => 'alliance',
            'class' => 'pf-user-status-ally'
        ],
        [
            'id' => 3,
            'name' => 'own',
            'class' => 'pf-user-status-own'
        ]
    ];
} 