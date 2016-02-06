<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 17.05.15
 * Time: 20:43
 */

namespace Model;

use DB\SQL\Schema;

class AllianceModel extends BasicModel {

    protected $table = 'alliance';

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
        'allianceCharacters' => [
            'has-many' => ['Model\CharacterModel', 'allianceId']
        ],
        'mapAlliances' => [
            'has-many' => ['Model\AllianceMapModel', 'allianceId']
        ]
    ];

    /**
     * get all alliance data
     * @return array
     */
    public function getData(){
        $allianceData = (object) [];

        $allianceData->id = $this->id;
        $allianceData->name = $this->name;
        $allianceData->shared = $this->shared;

        return $allianceData;
    }

    /**
     * get all maps for this alliance
     * @return array|mixed
     */
    public function getMaps(){
        $maps = [];

        $f3 = self::getF3();

        $this->filter('mapAlliances',
            ['active = ?', 1],
            ['order' => 'created']
        );

        if($this->mapAlliances){
            $mapCount = 0;
            foreach($this->mapAlliances as $mapAlliance){
                if(
                    $mapAlliance->mapId->isActive() &&
                    $mapCount < $f3->get('PATHFINDER.MAX_MAPS_ALLIANCE')
                ){
                    $maps[] = $mapAlliance->mapId;
                    $mapCount++;
                }
            }
        }

        return $maps;
    }

    /**
     * get all characters in this alliance
     * @return array
     */
    public function getCharacters(){
        $characters = [];

        $this->filter('allianceCharacters', ['active = ?', 1]);

        if($this->allianceCharacters){
            foreach($this->allianceCharacters as $character){
                $characters[] = $character;
            }
        }

        return $characters;
    }
}