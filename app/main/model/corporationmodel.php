<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 17.05.15
 * Time: 20:43
 */

namespace Model;

use DB\SQL\Schema;

class CorporationModel extends BasicModel {

    protected $table = 'corporation';

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
        'shared' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'isNPC' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'corporationCharacters' => [
            'has-many' => ['Model\CharacterModel', 'corporationId']
        ],
        'mapCorporations' => [
            'has-many' => ['Model\CorporationMapModel', 'corporationId']
        ]
    ];

    /**
     * get all cooperation data
     * @return array
     */
    public function getData(){
        $cooperationData = (object) [];

        $cooperationData->id = $this->id;
        $cooperationData->name = $this->name;
        $cooperationData->shared = $this->shared;

        return $cooperationData;
    }

    /**
     * get all maps for this corporation
     * @return array|mixed
     */
    public function getMaps(){
        $maps = [];

        $f3 = self::getF3();

        $this->filter('mapCorporations',
            ['active = ?', 1],
            ['order' => 'created']
        );

        if($this->mapCorporations){
            $mapCount = 0;
            foreach($this->mapCorporations as $mapCorporation){
                if(
                    $mapCorporation->mapId->isActive() &&
                    $mapCount < $f3->get('PATHFINDER.MAX_MAPS_CORPORATION')
                ){
                    $maps[] = $mapCorporation->mapId;
                    $mapCount++;
                }
            }
        }

        return $maps;
    }

    /**
     * get all characters in this corporation
     * @return array
     */
    public function getCharacters(){
        $characters = [];

        $this->filter('corporationCharacters', ['active = ?', 1]);

        if($this->corporationCharacters){
            foreach($this->corporationCharacters as $character){
                $characters[] = $character;
            }
        }

        return $characters;
    }
} 