<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 25.02.15
 * Time: 21:59
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;

class SystemTypeModel extends AbstractPathfinderModel {

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

    /**
     * get system type data
     * @return \stdClass
     */
    public function getData(){

        $typeData                   = (object)[];
        $typeData->id               = $this->_id;
        $typeData->name             = $this->name;

        return $typeData;
    }

} 