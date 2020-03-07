<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 25.11.15
 * Time: 22:11
 */

namespace Exodus4D\Pathfinder\Model\Pathfinder;

use DB\SQL\Schema;

abstract class AbstractSystemApiBasicModel extends AbstractPathfinderModel {

    /**
     * column count for data
     */
    const DATA_COLUMN_COUNT = 24;

    /**
     * column name prefix for data columns
     */
    const DATA_COLUMN_PREFIX = 'value';

    /**
     * AbstractSystemApiBasicModel constructor.
     * @param null $db
     * @param null $table
     * @param null $fluid
     * @param int $ttl
     */
    public function __construct($db = null, $table = null, $fluid = null, $ttl = 0){
        $this->addStaticKillFieldConfig();

        parent::__construct($db, $table, $fluid, $ttl);
    }

    /**
     * get data
     * @return \stdClass
     */
    public function getData(){
        $data               = (object)[];
        $data->systemId     = $this->getRaw('systemId');
        $data->values       = $this->getValues();
        $data->updated      = strtotime($this->updated);

        return $data;
    }

    /**
     * get all "valX" column data as array
     * -> "start" (most recent) value is stored in column name stored in "lastUpdatedValue" column
     * @return array
     */
    protected function getValues() : array {
        $valueColumnNames = range(1, static::DATA_COLUMN_COUNT);
        $preFixer = function(&$value, $key, $prefix){
            $value = $prefix . $value;
        };
        array_walk($valueColumnNames, $preFixer, static::DATA_COLUMN_PREFIX);

        $valueColumns = array_intersect_key($this->cast(null, 0), array_flip($valueColumnNames));
        $lastUpdatedValue = $this->lastUpdatedValue ? : 1;

        // bring values in correct order based on "lastUpdatedValue"
        $valueColumnsA = array_slice($valueColumns, $lastUpdatedValue - static::DATA_COLUMN_COUNT , null, true);
        $valueColumnsB = array_slice($valueColumns, 0, $lastUpdatedValue, true);

        return array_values($valueColumnsA + $valueColumnsB);
    }

    /**
     * extent the fieldConf Array with static fields for each table
     */
    private function addStaticKillFieldConfig(){
        if(is_array($this->fieldConf)){
            $staticFieldConfig = [];

            $staticFieldConfig['lastUpdatedValue'] = [
                'type' => Schema::DT_INT,
                'nullable' => false,
                'default' => 1,
                'index' => true
            ];

            for($i = 1; $i <= static::DATA_COLUMN_COUNT; $i++){
                $staticFieldConfig[static::DATA_COLUMN_PREFIX . $i] = [
                    'type' => Schema::DT_INT,
                    'nullable' => false,
                    'default' => 0
                ];
            }

            $this->fieldConf = array_merge($this->fieldConf, $staticFieldConfig);
        }
    }

}