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

    protected $fieldConf = [
        'characterId' => [
            'belongs-to-one' => 'Model\CharacterModel'
        ]
    ];

    public function __construct($db = NULL, $table = NULL, $fluid = NULL, $ttl = 0){

        parent::__construct($db, $table, $fluid, $ttl);

        // events -----------------------------------------
        $this->beforeerase(function($self){
            $self->clearCacheData();
        });
    }

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

    /**
     * see parent
     */
    public function clearCacheData(){
        parent::clearCacheData();

        // delete log cache key as well
        $f3 = self::getF3();
        $character = $this->characterId;

        $character->clearCacheData();
        $f3->clear('LOGGED.user.character.id_' . $character->id);

        return true;
    }
} 