<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 17.05.15
 * Time: 20:43
 */

namespace Model;

use DB\SQL\Schema;
use lib\Config;

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
     * @return \stdClass
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

        $this->filter('mapAlliances',
            ['active = ?', 1],
            ['order' => 'created']
        );

        if($this->mapAlliances){
            $mapCount = 0;
            foreach($this->mapAlliances as $mapAlliance){
                if(
                    $mapAlliance->mapId->isActive() &&
                    $mapCount < Config::getMapsDefaultConfig('alliance')['max_count']
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
     * @param array $characterIds
     * @param array $options
     * @return array
     */
    public function getCharacters($characterIds = [], $options = []){
        $characters = [];
        $filter = ['active = ?', 1];

        if( !empty($characterIds) ){
            $filter[0] .= ' AND id IN (?)';
            $filter[] =  $characterIds;
        }

        $this->filter('allianceCharacters', $filter);

        if($options['hasLog']){
            // just characters with active log data
            $this->has('allianceCharacters.characterLog', ['active = ?', 1]);
        }


        if($this->allianceCharacters){
            foreach($this->allianceCharacters as $character){
                $characters[] = $character;
            }
        }

        return $characters;
    }
}