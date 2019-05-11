<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 01.10.2016
 * Time: 15:11
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;

class ActivityLogModel extends AbstractPathfinderModel {

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
            'belongs-to-one' => 'Model\Pathfinder\CharacterModel',
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
            'belongs-to-one' => 'Model\Pathfinder\MapModel',
            'constraint' => [
                [
                    'table' => 'map',
                    'on-delete' => 'SET NULL'   // keep log data on map delete
                ]
            ]
        ],

        // map actions -----------------------------------------------------

        'mapCreate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
            'counter' => true
        ],
        'mapUpdate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
            'counter' => true
        ],
        'mapDelete' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
            'counter' => true
        ],

        // system actions -----------------------------------------------------

        'systemCreate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
            'counter' => true
        ],
        'systemUpdate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
            'counter' => true
        ],
        'systemDelete' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
            'counter' => true
        ],

        // connection actions -------------------------------------------------

        'connectionCreate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
            'counter' => true
        ],
        'connectionUpdate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
            'counter' => true
        ],
        'connectionDelete' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
            'counter' => true
        ],

        // signature actions -------------------------------------------------

        'signatureCreate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
            'counter' => true
        ],
        'signatureUpdate' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
            'counter' => true
        ],
        'signatureDelete' => [
            'type' => Schema::DT_SMALLINT,
            'nullable' => false,
            'default' => 0,
            'counter' => true
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
     * get all table columns that are used as "counter" columns
     * @return array
     */
    public function getCountableColumnNames(): array {
        $fieldConf = $this->getFieldConfiguration();

        $filterCounterColumns = function($key, $value){
            return isset($value['counter']) ? $key : false;
        };

        return array_values(array_filter(array_map($filterCounterColumns, array_keys($fieldConf), $fieldConf)));
    }

    /**
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     * @throws \Exception
     */
    public static function setup($db = null, $table = null, $fields = null){
        if($status = parent::setup($db, $table, $fields)){
            $status = parent::setMultiColumnIndex(['year', 'week', 'characterId', 'mapId'], true);
            if($status === true){
                $status = parent::setMultiColumnIndex(['year', 'week', 'characterId']);
            }
        }
        return $status;
    }
}