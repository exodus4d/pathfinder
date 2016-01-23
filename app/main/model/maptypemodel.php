<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 17.02.15
 * Time: 20:01
 */

namespace Model;

use DB\SQL\Schema;

class MapTypeModel extends BasicModel{

    protected $table = 'map_type';

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
        'class' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'classTab' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ]
    ];

    protected static $tableData = [
        [
            'id' => 1,
            'name' => 'standard',
            'label' => '',
            'class' => '',
            'classTab' => 'pf-map-type-tab-default'
        ],
        [
            'id' => 2,
            'name' => 'private',
            'label' => 'private',
            'class' => 'pf-map-type-private',
            'classTab' => 'pf-map-type-tab-private'
        ],
        [
            'id' => 3,
            'name' => 'corporation',
            'label' => 'corporation',
            'class' => 'pf-map-type-corporation',
            'classTab' => 'pf-map-type-tab-corporation'
        ],
        [
            'id' => 4,
            'name' => 'alliance',
            'label' => 'alliance',
            'class' => 'pf-map-type-alliance',
            'classTab' => 'pf-map-type-tab-alliance'
        ],
        [
            'id' => 5,
            'name' => 'globald',
            'label' => 'global',
            'class' => 'pf-map-type-global',
            'classTab' => 'pf-map-type-tab-global'
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