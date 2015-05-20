<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.02.15
 * Time: 20:43
 */

namespace Model;
use Controller;

class UserModel extends BasicModel {

    protected $table = 'user';
    protected $ttl = 0;
    protected $rel_ttl = 0;

    protected $fieldConf = array(
        'apis' => array(
            'has-many' => array('Model\UserApiModel', 'userId')
        ),
        'userCharacters' => array(
            'has-many' => array('Model\UserCharacterModel', 'userId')
        )
    );

    protected $validate = [
        'name' => [
            'length' => [
                'min' => 5,
                'max' => 20
            ]
        ],
        'email' => [
            'length' => [
                'min' => 5
            ]
        ],
        'password' => [
            'length' => [
                'min' => 6
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
        $userData->name = $this->name;
        $userData->email = $this->email;

        // api data
        $APIs = $this->getAPIs();
        foreach($APIs as $api){
            $userData->api[] = $api->getData();
        }

        // all chars
        $userData->characters = [];
        $userCharacters = $this->getUserCharacters();
        foreach($userCharacters as $userCharacter){
            $userData->characters[] = $userCharacter->getData();
        }

        // set active character with log data
        $activeUserCharacter = $this->getActiveUserCharacter();
        if($activeUserCharacter){
            $userData->character = $activeUserCharacter->getData(true);
        }

        return $userData;
    }

    /**
     * validate and set a email address for this user
     * @param $email
     * @return mixed
     */
    public function set_email($email){
        if (\Audit::instance()->email($email) == false) {
            // no valid email address
            $this->_throwValidationError('email');
        }
        return $email;
    }

    /**
     * set a password hash for this user
     * @param $password
     * @return FALSE|string
     */
    public function set_password($password){
        if(strlen($password) < 6){
            $this->_throwValidationError('password');
        }

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
     * get all accessible map models for this user
     * @return array
     */
    public function getMaps(){
        $mapCache = 5;
        $maps = [];
        $userMaps = $this->getRelatedModels('UserMapModel', 'userId', null, $mapCache);
        $activeUserCharacter = $this->getActiveUserCharacter();

        if(is_object($userMaps)){
            foreach($userMaps as $userMap){
                if($userMap->mapId->isActive()){
                    $maps[] = $userMap->mapId;
                }
            }
        }

        if($activeUserCharacter){
            $character = $activeUserCharacter->getCharacter();
            $corporation = $character->getCorporation();
            $alliance = $character->getAlliance();

            if($alliance){
                $allianceMaps = $alliance->getMaps();
                $maps = array_merge($maps, $allianceMaps);
            }

            if($corporation){
                $corporationMaps = $corporation->getMaps();
                $maps = array_merge($maps, $corporationMaps);

            }
        }

        return $maps;
    }

    /**
     * get all API models for this user
     * @return array|mixed
     */
    public function getAPIs(){
        $this->filter('apis', array('active = ?', 1));

        $apis = [];
        if($this->apis){
            $apis = $this->apis;
        }

        return $apis;
    }

    /**
     * set main character ID for this user.
     * If id does not match with his API chars -> select "random" main character
     * @param int $characterId
     */
    public function setMainCharacterId($characterId = 0){

        if(is_int($characterId)){
            $userCharacters = $this->getUserCharacters();

            if(count($userCharacters) > 0){
                $mainSet = false;
                foreach($userCharacters as $userCharacter){
                    if($characterId == $userCharacter->characterId->characterId){
                        $mainSet = true;
                        $userCharacter->setMain(1);
                    }else{
                        $userCharacter->setMain(0);
                    }
                    $userCharacter->save();
                }

                // set random main character
                if(! $mainSet ){
                    $userCharacters[0]->setMain(1);
                    $userCharacters[0]->save();
                }
            }
        }
    }

    /**
     * get all userCharacters models for a user
     * characters will be checked/updated on login by CCP API call
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
     * Get the main user character for this user
     * @return null
     */
    public function getMainUserCharacter(){
        $mainUserCharacter = null;
        $userCharacters = $this->getUserCharacters();

        foreach($userCharacters as $userCharacter){
            if($userCharacter->isMain()){
                $mainUserCharacter = $userCharacter;
                break;
            }
        }

        return $mainUserCharacter;
    }

    /**
     * get the active user character for this user
     * either there is an active Character (IGB) or the character labeled as "main"
     * @return null
     */
    public function getActiveUserCharacter(){
        $activeUserCharacter = null;
        $userCharacters = $this->getUserCharacters();

        foreach($userCharacters as $userCharacter){
            // find active
            // TODO replace with HTTP-HEADER IGB values
            if($userCharacter->id == 2){
                $activeUserCharacter = $userCharacter;
                break;
            }
        }

        // if no  active character is found -> get main Character
        if(is_null($activeUserCharacter)){
            $activeUserCharacter = $this->getMainUserCharacter();
        }

        return $activeUserCharacter;
    }

    /**
     * get all active user characters (with log entry)
     * @return array
     */
    public function getActiveUserCharacters(){
        $userCharacters = $this->getUserCharacters();

        $activeUserCharacters = [];
        foreach($userCharacters as $userCharacter){
            $characterLog = $userCharacter->getLog();

            if($characterLog){
                $activeUserCharacters[] = $userCharacter;
            }
        }

        return $activeUserCharacters;
    }

    /**
     * updated the character log entry for a user character by IGB Header data
     */
    public function updateCharacterLog(){
        $apiController = Controller\CcpApiController::getIGBHeaderData();

        // check if IGB Data is available
        if(! empty($apiController->values)){
            $userCharacters = $this->getUserCharacters();

            foreach($userCharacters as $userCharacter){
                if( $userCharacter->characterId->characterId == $apiController->values['charid']){

                    // check for existing character log entry
                    $characterLog = self::getNew('CharacterLogModel');
                    $characterLog->getByForeignKey('characterId', $apiController->values['charid']);

                    $characterLog->characterId = $apiController->values['charid'];
                    $characterLog->systemId = $apiController->values['solarsystemid'];
                    $characterLog->systemName = $apiController->values['solarsystemname'];
                    $characterLog->shipId = $apiController->values['shiptypeid'];
                    $characterLog->shipName = $apiController->values['shipname'];
                    $characterLog->shipTypeName = $apiController->values['shiptypename'];

                    $characterLog->save();
                    break;
                }

            }
        }



    }


} 