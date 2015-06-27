<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 30.03.15
 * Time: 00:04
 */

namespace Model;


class CharacterLogModel extends BasicModel {

    protected $table = 'character_log';

    protected $fieldConf = array(
        'characterId' => array(
            'belongs-to-one' => 'Model\CharacterModel'
        )
    );

    /**
     * get all character log data
     * @return object
     */
    public function getData(){

        $logData = (object) [];
        $logData->system = (object) [];
        $logData->system->id = $this->systemId;
        $logData->system->name = $this->systemName;

        $logData->ship = (object) [];
        $logData->ship->id = $this->shipId;
        $logData->ship->name = $this->shipName;
        $logData->ship->typeName = $this->shipTypeName;

        return $logData;
    }


} 