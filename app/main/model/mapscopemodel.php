<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 17.02.15
 * Time: 20:01
 */

namespace Model;

use DB\SQL\Schema;

class MapScopeModel extends BasicModel{

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
            'label' => 'w-space'
        ]
    ];

    /**
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     */
    public static function setup($db=null, $table=null, $fields=null){
        $status = parent::setup($db,$table,$fields);

        // set static default values
        if($status === true){
            $model = self::getNew(self::getClassName(), 0);
            $model->importStaticData(self::$tableData);
        }

        return $status;
    }
} 