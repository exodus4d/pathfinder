<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 28.02.15
 * Time: 11:57
 */

namespace Model;

use DB\SQL\Schema;

class UserMapModel extends BasicModel {

    protected $table = 'user_map';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'userId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\UserModel',
            'constraint' => [
                [
                    'table' => 'user',
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
        parent::clearCacheData();

        // clear map cache as well
        $this->mapId->clearCacheData();
    }

    /**
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     */
    public static function setup($db=null, $table=null, $fields=null){
        $status = parent::setup($db,$table,$fields);

        if($status === true){
            $status = parent::setMultiColumnIndex(['userId', 'mapId'], true);
        }

        return $status;
    }

} 