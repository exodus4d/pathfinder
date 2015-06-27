<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 28.03.15
 * Time: 21:49
 */

namespace Model;


class UserCharacterModel extends BasicModel {

    protected $table = 'user_character';

    private $character = null;

    protected $fieldConf = array(
        'userId' => array(
            'belongs-to-one' => 'Model\UserModel'
        ),
        'apiId' => array(
            'belongs-to-one' => 'Model\UserApiModel'
        ),
        'characterId' => array(
            'belongs-to-one' => 'Model\CharacterModel'
        )
    );

    /**
     * set an array with all data for a character
     * @param $characterData
     */
    public function setData($characterData){

        foreach((array)$characterData as $key => $value){

            if(!is_array($value)){
                if($this->exists($key)){
                    $this->$key = $value;
                }
            }
        }
    }

    /**
     * get all character data
     * @param $addCharacterLogData
     * @return array
     */
    public function getData($addCharacterLogData = false){

        // get characterModel
        $characterModel = $this->getCharacter();

        // get static character data
        $characterData = $characterModel->getData($addCharacterLogData);

        // add user specific character data
        $characterData->isMain = $this->isMain;

        // check for corporation
        if( is_object( $characterModel->corporationId ) ){
            $characterData->corporation = $characterModel->corporationId->getData();
        }

        // check for alliance
        if( is_object( $characterModel->allianceId ) ){
            $characterData->alliance = $characterModel->allianceId->getData();
        }

        return $characterData;
    }

    /**
     * check if this character is Main character or not
     * @return bool
     */
    public function isMain(){
        $isMain = false;
        if($this->isMain == 1){
            $isMain = true;
        }

        return $isMain;
    }

    /**
     * set this character as main character
     */
    public function setMain($value = 0){
        $this->isMain = $value;
    }

    /**
     * get the character model of this character
     * @return mixed
     */
    public function getCharacter(){
        return $this->characterId;
    }

} 