<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 28.03.15
 * Time: 16:41
 */

namespace Model;
use Controller;

class UserApiModel extends BasicModel {

    protected $table = 'user_api';
    protected $ttl = 0;
    protected $rel_ttl = 0;

    protected $fieldConf = array(
        'userId' => array(
            'belongs-to-one' => 'Model\UserModel'
        ),
        'userCharacters' => array(
            'has-many' => array('Model\UserCharacterModel', 'apiId')
        )
    );

    /**
     * get all data for this api
     * @return object
     */
    public function getData(){
        $apiData = (object) [];
        $apiData->keyId = $this->keyId;
        $apiData->vCode = $this->vCode;

        return $apiData;
    }

    /**
     * request CCP API and get all characters for this API
     * @return array
     */
    public function requestCharacters(){

        $apiController = new Controller\CcpApiController();
        return $apiController->getCharacters([$this]);
    }

    /**
     * get all characters for this API
     * @return array|mixed
     */
    public function getUserCharacters(){
        $this->filter('userCharacters', array('active = ?', 1));

        $userCharacters = [];
        if($this->userCharacters){
            $userCharacters = $this->userCharacters;
        }

        return $userCharacters;
    }

    /**
     * search for a user character model by a characterId
     * @param $characterId
     * @return null
     */
    public function getUserCharacterById($characterId){
        $userCharacters = $this->getUserCharacters();
        $returnUserCharacter = null;

        foreach($userCharacters as $userCharacter){
            if($userCharacter->characterId->characterId == $characterId){
                $returnUserCharacter = $userCharacter;
                break;
            }
        }

        return $returnUserCharacter;
    }

    /**
     * check if this api model has a main character
     * @return bool
     */
    public function hasMainCharacter(){
        $hasMain = false;

        $characters = $this->getCharacters();
        foreach($characters as $character){
            if($character->isMain()){
                $hasMain = true;
                break;
            }
        }

        return $hasMain;
    }

    /**
     * delete this api model
     */
    public function delete(){

        // check if this api model had a main character
        $user = $this->userId;
        $setNewMain = false;
        if($this->hasMainCharacter()){
            $setNewMain = true;
        }
        $this->erase();

        if($setNewMain){
            $user->setMainCharacterId();
        }

    }

} 