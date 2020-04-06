<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 28.01.2018
 * Time: 14:38
 */

namespace Exodus4D\Pathfinder\Model\Pathfinder;

use DB\SQL\Schema;

class RightModel extends AbstractPathfinderModel {

    /**
     * @var string
     */
    protected $table = 'right';

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
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'index' => true,
            'unique' => true
        ],
        'label' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'description' => [
            'type' => Schema::DT_VARCHAR512,
            'nullable' => false,
            'default' => ''
        ],
        'corporationRights' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Pathfinder\CorporationRightModel', 'rightId']
        ]
    ];

    /**
     * @var array
     */
    protected static $tableData = [
        [
            'id' => 1,
            'name' => 'map_update',
            'label' => 'update',
            'description' => 'Map settings update right'
        ],
        [
            'id' => 2,
            'name' => 'map_delete',
            'label' => 'delete',
            'description' => 'Map delete right'
        ],
        [
            'id' => 3,
            'name' => 'map_import',
            'label' => 'import',
            'description' => 'Map import right'
        ],
        [
            'id' => 4,
            'name' => 'map_export',
            'label' => 'export',
            'description' => 'Map export right'
        ],
        [
            'id' => 5,
            'name' => 'map_share',
            'label' => 'share',
            'description' => 'Map share right'
        ],
        [
            'id' => 6,
            'name' => 'map_create',
            'label' => 'create',
            'description' => 'Map create right'
        ]
    ];

    /**
     * get right data
     * @return \stdClass
     */
    public function getData(){
        $rightData = (object) [];

        $rightData->name = $this->name;

        return $rightData;
    }
}