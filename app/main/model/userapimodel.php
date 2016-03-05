<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 28.03.15
 * Time: 16:41
 */

namespace Model;

use DB\SQL\Schema;
use Controller;

class UserApiModel extends BasicModel {

    protected $table = 'user_api';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'userId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\UserModel',
            'constraint' => [
                [
                    'table' => 'user',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'keyId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'unique' => true
        ],
        'vCode' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
        ],
        'userCharacters' => [
            'has-many' => ['Model\UserCharacterModel', 'apiId']
        ],
    ];

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
     * @return int
     */
    public function updateCharacters(){
        $apiController = new Controller\CcpApiController();

        return $apiController->updateCharacters($this);
    }

    /**
     * get all characters for this API
     * @return array|mixed
     */
    public function getUserCharacters(){
        $this->filter('userCharacters', ['active = ?', 1]);

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
            if($userCharacter->characterId->id == $characterId){
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

        $characters = $this->getUserCharacters();
        foreach($characters as $character){
            if($character->isMain()){
                $hasMain = true;
                break;
            }
        }

        return $hasMain;
    }

    /**
     * get the user object for this model
     * @return mixed
     */
    public function getUser(){
        return $this->userId;
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