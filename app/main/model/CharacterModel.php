<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 11.04.15
 * Time: 15:20
 */

namespace Model;


class CharacterModel extends BasicModel {

    protected $table = 'character';
    protected $ttl = 0;
    protected $rel_ttl = 0;

    protected $fieldConf = array(

    );

    /**
     * get character data
     * @return object
     */
    public function getData(){
        $characterData = (object) [];

        $characterData->characterId = $this->characterId;
        $characterData->name = $this->name;

        // check for corporation
        if($this->corporationId){
            $characterData->corporation = (object) [];
            $characterData->corporation->id = $this->corporationId;
            $characterData->corporation->name = $this->corporationName;
        }

        // check for alliance
        if($this->allianceId){
            $characterData->alliance = (object) [];
            $characterData->alliance->id = $this->allianceId;
            $characterData->alliance->name = $this->allianceName;
        }

        return $characterData;
    }

    /**
     * get the character log entry for this character
     * @return bool|null
     */
    public function getLog(){
        $characterLog = self::getNew('CharacterLogModel');
        $characterLog->getByForeignKey('characterId', $this->characterId);

        $characterLogReturn = false;
        if(! $characterLog->dry() ){
            $characterLogReturn = $characterLog;
        }

        return $characterLogReturn;
    }

} 