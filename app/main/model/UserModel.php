<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.02.15
 * Time: 20:43
 */

namespace Model;

class UserModel extends BasicModel {

    protected $table = 'user';
    protected $ttl = 0;
    protected $rel_ttl = 0;

    protected $fieldConf = array(
        'api' => array(
            'has-many' => array('Model\UserApiModel', 'userId')
        ),
        'characters' => array(
            'has-many' => array('Model\UserCharacterModel', 'userId')
        )
    );

    protected $validate = [
        'name' => [
            'length' => [
                'min' => 5,
                'max' => 20
            ],
            'regex' => '/^[ \w-_]+$/'
        ],
        'password' => [
            'length' => [
                'min' => 5,
                'max' => 255
            ]
        ]
    ];

    /**
     * get all data for this user
     * @return object
     */
    public function getData(){

        $userData = (object) [];
        $userData->id = $this->id;

        // active char
        $userData->character = null;

        // all chars
        $userData->characters = [];

        $characters = $this->getCharacters();
        $activeCharacter = null;
        $mainCharacter = null;
        foreach($characters as $character){

            // find main
            if($character->isMain){
                $mainCharacter = $character;
            }

            // find active
            // TODO replace with HTTP-HEADER IGB values
            if($character->id == 2){
                $activeCharacter = $character;
            }
            $userData->characters[] = $character->getData();
        }

        // set active character with log data
        if($activeCharacter){
            $userData->character = $activeCharacter->getData(true);
        }elseif($mainCharacter){
            $userData->character = $mainCharacter->getData(true);
        }

        return $userData;
    }


    /**
     * generate password hash
     * @param $password
     * @return FALSE|string
     */
    public static function generatePasswordHash($password){
        // generate random id (23 chars)
        $salt = uniqid('', true);
        return \Bcrypt::instance()->hash($password, $salt);
    }

    /**
     * search for user by unique username
     * @param $name
     * @return array|FALSE
     */
    public function getByName($name){
        return $this->getByForeignKey('name', $name);
    }

    /**
     * verify a user by his wassword
     * @param $password
     * @return bool
     */
    public function verify($password){
        $valid = false;

        if(! $this->dry()){
            $valid = (bool) \Bcrypt::instance()->verify($password, $this->password);
        }

        return $valid;
    }

    /**
     * get all assessable map models for this user
     * @return array
     */
    public function getMaps(){
        $userMaps = $this->getRelatedModels('UserMapModel', 'userId', null, 5);

        $maps = [];
        foreach($userMaps as $userMap){
            if($userMap->mapId->isActive()){
                $maps[] = $userMap->mapId;
            }
        }

        return $maps;
    }

    /**
     * get all API models for this user
     * @return array|mixed
     */
    public function getAPIs(){
        $this->filter('api', array('active = ?', 1));

        $api = [];
        if($this->api){
            $api = $this->api;
        }

        return $api;
    }

    /**
     * set main character ID for this user.
     * If id does not match with his API chars -> select "random" main character
     * @param $characterId
     * @return null
     */
    public function setMainCharacterId($characterId){

        $mainCharacter = null;
        if(is_int($characterId)){
            $characters = $this->getCharacters();

            if(count($characters) > 0){
                foreach($characters as $character){
                    $isMain = 0;
                    if($characterId == $character->characterId){
                        $isMain = 1;
                        $mainCharacter = $character;
                    }
                    $character->isMain = $isMain;
                    $character->save();
                }

                // set random main character
                if(is_null($mainCharacter)){
                    $characters[0]->isMain = 1;
                    $characters[0]->save();
                }
            }
        }

        return $mainCharacter;
    }

    /**
     * get all characters for a user
     * characters will be checked/updated on login by CCP API call
     * @return array|mixed
     */
    public function getCharacters(){
        $this->filter('characters', array('active = ?', 1));

        $characters = [];
        if($this->characters){
            $characters = $this->characters;
        }

        return $characters;
    }

    /**
     * get all active characters (with log entry)
     * @return array
     */
    public function getActiveCharacters(){
        $characters = $this->getCharacters();

        $activeCharacters = [];
        foreach($characters as $character){
            $characterLog = $character->getLog();

            if($characterLog){
                $activeCharacters[] = $character;
            }
        }

        return $activeCharacters;
    }


} 