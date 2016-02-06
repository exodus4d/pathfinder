<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.02.15
 * Time: 20:43
 */

namespace Model;

use DB\SQL\Schema;
use Controller;
use Exception;

class UserModel extends BasicModel {

    protected $table = 'user';

    protected $fieldConf = [
        'lastLogin' => [
            'type' => Schema::DT_TIMESTAMP,
            'index' => true
        ],
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'index' => true,
            'unique' => true
        ],
        'email' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'index' => true,
            'unique' => true
        ],
        'password' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'shared' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'apis' => [
            'has-many' => ['Model\UserApiModel', 'userId']
        ],
        'userCharacters' => [
            'has-many' => ['Model\UserCharacterModel', 'userId']
        ],
        'userMaps' => [
            'has-many' => ['Model\UserMapModel', 'userId']
        ]
    ];

    protected $validate = [
        'name' => [
            'length' => [
                'min' => 5,
                'max' => 25
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
     * ! caution ! this function returns sensitive data!
     * -> user getSimpleData() for faster performance and public user data
     * @return object
     */
    public function getData(){

        // get public user data for this user
        $userData = $this->getSimpleData();

        // add sensitive user data
        $userData->email = $this->email;

        // user shared info
        $userData->shared = $this->shared;

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
     * get public user data
     * - check out getData() for all user data
     * @return object
     */
    public function getSimpleData(){
        $userData = (object) [];
        $userData->id = $this->id;
        $userData->name = $this->name;

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
            $this->throwValidationError('email');
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
            $this->throwValidationError('password');
        }

        $salt = uniqid('', true);
        return \Bcrypt::instance()->hash($password, $salt);
    }

    /**
     * check if new user registration is allowed
     * @return bool
     * @throws Exception\RegistrationException
     */
    public function beforeInsertEvent(){
        $registrationStatus = Controller\Controller::getRegistrationStatus();

        switch($registrationStatus){
            case 0:
                $f3 = self::getF3();
                throw new Exception\RegistrationException($f3->get('PATHFINDER.REGISTRATION.MSG_DISABLED'));
                return false;
                break;
            case 1:
                return true;
                break;
            default:
                return false;
        }
    }

    /**
     * search for user by unique username
     * @param $name
     * @return array|FALSE
     */
    public function getByName($name){
        return $this->getByForeignKey('name', $name, [], 0);
    }

    /**
     * verify a user by his password
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
        $f3 = self::getF3();

        $this->filter(
            'userMaps',
            ['active = ?', 1],
            ['order' => 'created']
        );

        $maps = [];
        if($this->userMaps){
            $mapCountPrivate = 0;
            foreach($this->userMaps as $userMap){
                if(
                    $userMap->mapId->isActive() &&
                    $mapCountPrivate < $f3->get('PATHFINDER.MAX_MAPS_PRIVATE')
                ){
                    $maps[] = $userMap->mapId;
                    $mapCountPrivate++;
                }
            }
        }

        $activeUserCharacter = $this->getActiveUserCharacter();

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
     * get mapModel by id and check if user has access
     * @param $mapId
     * @return null
     * @throws \Exception
     */
    public function getMap($mapId){
        $map = self::getNew('MapModel');
        $map->getById( (int)$mapId );

        $returnMap = null;
        if($map->hasAccess($this)){
            $returnMap = $map;
        }

        return $returnMap;
    }


    /**
     * get all API models for this user
     * @return array|mixed
     */
    public function getAPIs(){
        $this->filter('apis', ['active = ?', 1]);

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
                    if($characterId == $userCharacter->getCharacter()->id){
                        $mainSet = true;
                        $userCharacter->setMain(1);
                    }else{
                        $userCharacter->setMain(0);
                    }
                    $userCharacter->save();
                }

                // set first character as "main"
                if( !$mainSet ){
                    $userCharacter = reset($userCharacters);
                    $userCharacter->setMain(1);
                    $userCharacter->save();
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

        $this->filter('apis', ['active = ?', 1]);

        // if a user has multiple API keys saved for ONE character,
        // skip double characters!
        $userCharacters = [];

        if($this->apis){
            $this->apis->rewind();
            while($this->apis->valid()){

                $this->apis->current()->filter('userCharacters', ['active = ?', 1]);

                if($this->apis->current()->userCharacters){
                    $this->apis->current()->userCharacters->rewind();
                    while($this->apis->current()->userCharacters->valid()){

                        $tempCharacterId = $this->apis->current()->userCharacters->current()->characterId->get('id');
                        if( !isset($userCharacters[ $tempCharacterId ]) ){
                            $userCharacters[ $tempCharacterId ] = $this->apis->current()->userCharacters->current();
                        }
                        $this->apis->current()->userCharacters->next();
                    }
                }
                $this->apis->next();
            }
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

        $headerData = Controller\CcpApiController::getIGBHeaderData();

        // check if IGB Data is available
        if( !empty($headerData->values) ){
            // search for the active character by IGB Header Data

            $this->filter('userCharacters',
                [
                    'active = :active AND characterId = :characterId',
                    ':active' => 1,
                    ':characterId' => intval($headerData->values['charid'])
                ],
                ['limit' => 1]
            );

            if($this->userCharacters){
                // check if userCharacter has active log
                $userCharacter = current($this->userCharacters);

                if( $userCharacter->getCharacter()->getLog() ){
                    $activeUserCharacter = $userCharacter;
                }
            }
        }

        // if no  active character is found
        // e.g. not online in IGB
        // -> get main Character
        if(is_null($activeUserCharacter)){
            $activeUserCharacter = $this->getMainUserCharacter();
        }

        return $activeUserCharacter;
    }

    /**
     * get all active user characters (with log entry)
     * hint: a user can have multiple active characters
     * @return array
     */
    public function getActiveUserCharacters(){
        $userCharacters = $this->getUserCharacters();

        $activeUserCharacters = [];
        foreach($userCharacters as $userCharacter){
            $characterLog = $userCharacter->getCharacter()->getLog();

            if($characterLog){
                $activeUserCharacters[] = $userCharacter;
            }
        }

        return $activeUserCharacters;
    }

    /**
     * update/check API information.
     * request API information from CCP
     */
    public function updateApiData(){
        $this->filter('apis', ['active = ?', 1]);

        if($this->apis){
            $this->apis->rewind();
            while($this->apis->valid()){
                $this->apis->current()->updateCharacters();
                $this->apis->next();
            }
        }
    }

    /**
     * updated the character log entry for a user character by IGB Header data
     * @param int $ttl cache time in seconds
     * @throws \Exception
     */
    public function updateCharacterLog($ttl = 0){
        $headerData = Controller\CcpApiController::getIGBHeaderData();

        // check if IGB Data is available
        if( !empty($headerData->values) ){
            $f3 = self::getF3();

            // check if system has changed since the last call
            // current location is stored (global) to avoid unnecessary DB calls
            $sessionCharacterKey = 'LOGGED.user.character.id_' . $headerData->values['charid'];

            if($f3->exists($sessionCharacterKey)){
                // cache data exists
                $cacheData = $f3->get($sessionCharacterKey);
            }else{
                // new cache data
                $cacheData = [
                    'systemId' => 0,
                    'shipId' => 0
                ];
            }

            if(
                $cacheData['systemId'] != $headerData->values['solarsystemid'] ||
                $cacheData['shipId'] != $headerData->values['shiptypeid']
            ){
                $cacheData['systemId'] = (int)$headerData->values['solarsystemid'];
                $cacheData['shipId'] = (int)$headerData->values['shiptypeid'];

                // character has changed system, or character just logged on
                $character = self::getNew('CharacterModel');
                $character->getById( (int)$headerData->values['charid'] );

                if( $character->dry() ){
                    // this can happen if a valid user plays the game with a not registered character
                    // whose API is not registered -> save new character or update character data
                    $corporationId = array_key_exists('corpid', $headerData->values) ? $headerData->values['corpid'] : null;
                    $allianceId = array_key_exists('allianceid', $headerData->values) ? $headerData->values['allianceid'] : null;

                    // check if corp exists
                    if( !is_null($corporationId) ){
                        $corporation = self::getNew('CorporationModel');
                        $corporation->getById( (int)$corporationId );
                        if( $corporation->dry() ){
                            $corporation->id = $corporationId;
                            $corporation->name = $headerData->values['corpname'];
                            $corporation->save();
                        }
                    }

                    // check if ally exists
                    if( !is_null($allianceId) ){
                        $alliance = self::getNew('AllianceModel');
                        $alliance->getById( (int)$allianceId );
                        if( $alliance->dry() ){
                            $alliance->id = $allianceId;
                            $alliance->name = $headerData->values['alliancename'];
                            $alliance->save();
                        }
                    }

                    $character->id = (int) $headerData->values['charid'];
                    $character->name = $headerData->values['charname'];
                    $character->corporationId = $corporationId;
                    $character->allianceId = $allianceId;
                    $character->save();
                }

                // check if this character has an active log
                if( !$characterLog = $character->getLog() ){
                    $characterLog = self::getNew('CharacterLogModel');
                }

                // set character log values
                $characterLog->characterId = $character;
                $characterLog->systemId = (int)$headerData->values['solarsystemid'];
                $characterLog->systemName = $headerData->values['solarsystemname'];
                $characterLog->shipId = (int)$headerData->values['shiptypeid'];
                $characterLog->shipName = $headerData->values['shipname'];
                $characterLog->shipTypeName = $headerData->values['shiptypename'];

                $characterLog->save();

                // clear cache for the characterModel as well
                $character->clearCacheData();

                // cache character log information
                $f3->set($sessionCharacterKey, $cacheData, $ttl);
            }
        }
    }


} 