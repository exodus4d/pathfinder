<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 19.05.2015
 * Time: 20:01
 */

namespace Model;

use DB\SQL\Schema;

class CorporationMapModel extends BasicModel {

    protected $table = 'corporation_map';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'corporationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\CorporationModel',
            'constraint' => [
                [
                    'table' => 'corporation',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'mapId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\MapModel',
            'constraint' => [
                [
                    'table' => 'map',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ]
    ];

    /**
     * see parent
     */
    public function clearCacheData(){
        // clear map cache
        $this->mapId->clearCacheData();
    }

    /**
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     * @throws \Exception
     */
    public static function setup($db=null, $table=null, $fields=null){
        $status = parent::setup($db,$table,$fields);

        if($status === true){
            $status = parent::setMultiColumnIndex(['corporationId', 'mapId'], true);
        }

        return $status;
    }
}