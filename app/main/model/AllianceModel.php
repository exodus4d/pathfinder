<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 17.05.15
 * Time: 20:43
 */

namespace Model;

class AllianceModel extends BasicModel {

    protected $table = 'alliance';

    protected $fieldConf = array(
        'allianceCharacters' => array(
            'has-many' => array('Model\CharacterModel', 'allianceId')
        ),
        'mapAlliances' => array(
            'has-many' => array('Model\AllianceMapModel', 'allianceId')
        )
    );

    /**
     * get all alliance data
     * @return array
     */
    public function getData(){
        $allianceData = (object) [];

        $allianceData->id = $this->id;
        $allianceData->name = $this->name;
        $allianceData->sharing = $this->sharing;

        return $allianceData;
    }

    /**
     * get all maps for this alliance
     * @return array|mixed
     */
    public function getMaps(){
        $maps = [];

        if($this->mapAlliances){
            foreach($this->mapAlliances as $mapAlliance){
                if($mapAlliance->mapId->isActive()){
                    $maps[] = $mapAlliance->mapId;
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

        $this->filter('allianceCharacters', array('active = ?', 1));

        if($this->allianceCharacters){
            foreach($this->allianceCharacters as $character){
                $characters[] = $character;
            }
        }

        return $characters;
    }
}