<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 01.10.2016
 * Time: 15:11
 */

namespace Model;

use DB\SQL\Schema;

class ActivityLogModel extends BasicModel {

    protected $table = 'activity_log';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'characterId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\CharacterModel',
            'constraint' => [
                [
                    'table' => 'character',
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
                    'on-delete' => 'SET NULL'   // keep log data on map delete
                ]
            ]
        ],

        // system actions -----------------------------------------------------

        'systemCreate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
        ],
        'systemUpdate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
        ],
        'systemDelete' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
        ],

        // connection actions -------------------------------------------------

        'connectionCreate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
        ],
        'connectionUpdate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
        ],
        'connectionDelete' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
        ],

        // signature actions -------------------------------------------------

        'signatureCreate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
        ],
        'signatureUpdate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
        ],
        'signatureDelete' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
        ],
    ];

    public function __construct($db = NULL, $table = NULL, $fluid = NULL, $ttl = 0){
        $this->addStaticDateFieldConfig();

        parent::__construct($db, $table, $fluid, $ttl);
    }

    /**
     * extent the fieldConf Array with static fields for each table
     */
    private function addStaticDateFieldConfig(){
        if(is_array($this->fieldConf)){
            $staticFieldConfig = [
                'year' => [
                    'type' => Schema::DT_SMALLINT,
                    'nullable' => false,
                    'default' => date('o'),         // 01.01 could be week 53 -> NOT "current" year!
                    'index' => true
                ],
                'week' => [                         // week in year [1-53]
                    'type' => Schema::DT_TINYINT,
                    'nullable' => false,
                    'default' => 1,
                    'index' => true
                ],
            ];
            $this->fieldConf = array_merge($staticFieldConfig, $this->fieldConf);
        }
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
            $status = parent::setMultiColumnIndex(['year', 'week', 'characterId', 'mapId'], true);
            if($status === true){
                $status = parent::setMultiColumnIndex(['year', 'week', 'characterId']);
            }
        }

        return $status;
    }
}