<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 24.02.15
 * Time: 21:53
 */

namespace Model;

use DB\SQL\Schema;

class SystemStatusModel extends BasicModel {

    protected $table = 'system_status';

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
        ]
    ];

    protected static $tableData = [
        [
            'id' => 1,
            'name' => 'unknown',
            'label' => 'unknown',
            'class' => 'pf-system-status-unknown'
        ],
        [
            'id' => 2,
            'name' => 'friendly',
            'label' => 'friendly',
            'class' => 'pf-system-status-friendly'
        ],
        [
            'id' => 3,
            'name' => 'occupied',
            'label' => 'occupied',
            'class' => 'pf-system-status-occupied'
        ],
        [
            'id' => 4,
            'name' => 'hostile',
            'label' => 'hostile',
            'class' => 'pf-system-status-hostile'
        ],
        [
            'id' => 5,
            'name' => 'empty',
            'label' => 'empty',
            'class' => 'pf-system-status-empty'
        ],
        [
            'id' => 6,
            'name' => 'unscanned',
            'label' => 'unscanned',
            'class' => 'pf-system-status-unscanned'
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