<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 25.11.15
 * Time: 22:11
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;

abstract class AbstractSystemApiBasicModel extends AbstractPathfinderModel {

    public function __construct($db = NULL, $table = NULL, $fluid = NULL, $ttl = 0){
        $this->addStaticKillFieldConfig();

        parent::__construct($db, $table, $fluid, $ttl);
    }

    /**
     * extent the fieldConf Array with static fields for each table
     */
    private function addStaticKillFieldConfig(){
        if(is_array($this->fieldConf)){
            $staticFieldConfig = [];
            for($i = 1; $i <= 24; $i++){
                $staticFieldConfig['value' . $i] = [
                    'type' => Schema::DT_INT,
                    'nullable' => false,
                    'default' => 0,
                ];
            }

            $this->fieldConf = array_merge($this->fieldConf, $staticFieldConfig);
        }
    }

}