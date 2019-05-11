<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 14.03.15
 * Time: 21:04
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;

class SystemShipKillModel extends AbstractSystemApiBasicModel {

    protected $table = 'system_kills_ships';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'systemId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'unique' => true
        ]
    ];

}
