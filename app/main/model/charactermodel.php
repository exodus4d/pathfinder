<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 11.04.15
 * Time: 15:20
 */

namespace Model;

use Controller;
use Controller\Ccp\Sso as Sso;
use DB\SQL\Schema;
use Data\Mapper as Mapper;

class CharacterModel extends BasicModel {

    protected $table = 'character';

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
            'default' => ''
        ],
        'ownerHash' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'crestAccessToken' => [
            'type' => Schema::DT_VARCHAR256
        ],
        'crestAccessTokenUpdated' => [
            'type' => Schema::DT_TIMESTAMP,
            'default' => Schema::DF_CURRENT_TIMESTAMP,
            'index' => true
        ],
        'crestRefreshToken' => [
            'type' => Schema::DT_VARCHAR256
        ],
        'corporationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\CorporationModel',
            'constraint' => [
                [
                    'table' => 'corporation',
                    'on-delete' => 'SET NULL'
                ]
            ]
        ],
        'allianceId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\AllianceModel',
            'constraint' => [
                [
                    'table' => 'alliance',
                    'on-delete' => 'SET NULL'
                ]
            ]
        ],
        'factionId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'factionName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'shared' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'userCharacter' => [
            'has-one' => ['Model\UserCharacterModel', 'characterId']
        ],
        'characterLog' => [
            'has-one' => ['Model\CharacterLogModel', 'characterId']
        ],
        'characterMaps' => [
            'has-many' => ['Model\CharacterMapModel', 'characterId']
        ],
        'characterAuthentications' => [
            'has-many' => ['Model\CharacterAuthenticationModel', 'characterId']
        ]
    ];

    /**
     * get character data
     * @param bool|false $addCharacterLogData
     * @return \stdClass
     */
    public function getData($addCharacterLogData = false){
        $characterData = null;

        $cacheKeyModifier = '';

        // check if there is cached data
        if($addCharacterLogData){
            $cacheKeyModifier = strtoupper($this->table) . '_LOG';
        }

        $characterData = $this->getCacheData($cacheKeyModifier);

        if(is_null($characterData)){

            // no cached character data found
            $characterData = (object) [];
            $characterData->id = $this->id;
            $characterData->name = $this->name;
            $characterData->shared = $this->shared;

            if($addCharacterLogData){
                if($logModel = $this->getLog()){
                    $characterData->log = $logModel->getData();
                }
            }

            // check for corporation
            if($corporation = $this->getCorporation()){
                $characterData->corporation = $corporation->getData();
            }

            // check for alliance
            if($alliance = $this->getAlliance()){
                $characterData->alliance = $alliance->getData();
            }

            // max caching time for a system
            // the cached date has to be cleared manually on any change
            // this includes system, connection,... changes (all dependencies)
            $this->updateCacheData($characterData, $cacheKeyModifier, 10);
        }

        return $characterData;
    }

    /**
     * set unique "ownerHash" for this character
     * -> Hash will change when  character is transferred (sold)
     * @param string $ownerHash
     * @return string
     */
    public function set_ownerHash($ownerHash){

        if( $this->ownerHash !== $ownerHash ){
            if( $this->hasUserCharacter() ){
                $this->userCharacter->erase();
            }

            // delete all existing login-cookie data
            $this->logout();
        }

        return $ownerHash;
    }

    /**
     * set CREST accessToken for current session
     * -> update "tokenUpdated" column on change
     * -> this is required for expire checking!
     * @param string $accessToken
     * @return string
     */
    public function set_crestAccessToken($accessToken){
        if($this->crestAccessToken !== $accessToken){
            $this->touch('crestAccessTokenUpdated');
        }
        return $accessToken;
    }

    /**
     * check whether this character has already a user assigned to it
     * @return bool
     */
    public function hasUserCharacter(){
        return is_object($this->userCharacter);
    }

    /**
     * check whether this character has a corporation
     * @return bool
     */
    public function hasCorporation(){
        return is_object($this->corporationId);
    }

    /**
     * check whether this character has an alliance
     * @return bool
     */
    public function hasAlliance(){
        return is_object($this->allianceId);
    }

    /**
     * @return UserModel|null
     */
    public function getUser(){
        $user = null;
        if($this->hasUserCharacter()){
            /**
             * @var $user UserModel
             */
            $user = $this->userCharacter->userId;
        }
        return $user;
    }

    /**
     * get the corporation for this user
     * @return \Model\CorporationModel|null
     */
    public function getCorporation(){
        return $this->corporationId;
    }

    /**
     * get the alliance of this user
     * @return \Model\AllianceModel|null
     */
    public function getAlliance(){
        return $this->allianceId;
    }

    /**
     * get CREST API "access_token" from OAuth
     * @return bool|string
     */
    public function getAccessToken(){
        $accessToken = false;

        // check if there is already an "accessToken" for this user
        // check expire timer for stored "accessToken"
        if(
            !empty($this->crestAccessToken) &&
            !empty($this->crestAccessTokenUpdated)
        ){
            $timezone = new \DateTimeZone( $this->getF3()->get('TZ') );
            $tokenTime = \DateTime::createFromFormat(
                'Y-m-d H:i:s',
                $this->crestAccessTokenUpdated,
                $timezone
            );
            // add expire time buffer for this "accessToken"
            // token should be marked as "deprecated" BEFORE it actually expires.
            $timeBuffer = 2 * 60;
            $tokenTime->add(new \DateInterval('PT' . (Sso::ACCESS_KEY_EXPIRE_TIME - $timeBuffer) . 'S'));

            $now = new \DateTime('now', $timezone);
            if($tokenTime->getTimestamp() > $now->getTimestamp()){
                $accessToken = $this->crestAccessToken;
            }
        }

        // if no "accessToken" was found -> get a fresh one by an existing "refreshToken"
        if(
            !$accessToken &&
            !empty($this->crestRefreshToken)
        ){
            // no accessToken found OR token is deprecated
            $ssoController = new Sso();
            $accessData =  $ssoController->refreshAccessToken($this->crestRefreshToken);

            if(
                isset($accessData->accessToken) &&
                isset($accessData->refreshToken)
            ){
                $this->crestAccessToken = $accessData->accessToken;
                $this->save();

                $accessToken = $this->crestAccessToken;
            }
        }

        return $accessToken;
    }

    /**
     * checks whether this character is authorized to log in
     * -> check corp/ally whitelist config (pathfinder.ini)
     * @return bool
     */
    public function isAuthorized(){
        $isAuthorized = false;
        $f3 = self::getF3();

        $whitelistCorporations = $whitelistAlliance = [];
        if( !empty($f3->get('PATHFINDER.LOGIN.CORPORATION')) ){
            $whitelistCorporations = array_map('trim',(array) $f3->get('PATHFINDER.LOGIN.CORPORATION') );
        }
        if( !empty($f3->get('PATHFINDER.LOGIN.ALLIANCE')) ){
            $whitelistAlliance = array_map('trim',(array) $f3->get('PATHFINDER.LOGIN.ALLIANCE') );
        }

        if(
            empty($whitelistCorporations) &&
            empty($whitelistAlliance)
        ){
            // no corp/ally restrictions set -> any character is allowed to login
            $isAuthorized = true;
        }else{
            // check if character corporation is set in whitelist
            if(
                !empty($whitelistCorporations) &&
                $this->hasCorporation() &&
                in_array($this->getCorporation()->_id, $whitelistCorporations)
            ){
                $isAuthorized = true;
            }

            // check if character alliance is set in whitelist
            if(
                !$isAuthorized &&
                !empty($whitelistAlliance) &&
                $this->hasAlliance() &&
                in_array($this->getAlliance()->_id, $whitelistAlliance)
            ){
                $isAuthorized = true;
            }
        }

        return $isAuthorized;
    }

    /**
     * update character log (active system, ...)
     * -> HTTP Header Data (if IGB)
     * -> CREST API request for character log data (if not IGB)
     * @param array $additionalOptions (optional) request options for cURL request
     * @return $this
     */
    public function updateLog($additionalOptions = []){
        // check if everything is OK
        // -> do not update log in case of temporary CREST timeouts
        $updateLogData = false;
        $logData = [];
        $headerData = Controller\Controller::getIGBHeaderData();

        // check if IGB Data is available
        if(
            $headerData->trusted === true &&
            !empty($headerData->values)
        ){
            // format header data
            $formattedHeaderData = (new Mapper\IgbHeader($headerData->values))->getData();

            // just for security -> check if Header Data matches THIS character
            // in case current IGB-Character is NOT the one logged on -> don´t update log
            if(
                isset($formattedHeaderData['character']) &&
                $formattedHeaderData['character']['id'] == $this->_id
            ){
                $updateLogData = true;
                $logData =  $formattedHeaderData;
            }
        }

        if($updateLogData == false){
            // ... IGB Header data not found OR character does not match current active character
            // -> try to pull data from CREST

            $ssoController = new Sso();
            $logData = $ssoController->getCharacterLocationData($this->getAccessToken(), 10, $additionalOptions);

            if($logData['timeout'] === false){
                $updateLogData = true;
            }
        }

        if($updateLogData == true){
            if( empty($logData['system']) ){
                // character is not in-game
                if(is_object($this->characterLog)){
                    // delete existing log
                    $this->characterLog->erase();
                    $this->save();
                }
            }else{
                // character is currently in-game
                if( !$characterLog = $this->getLog() ){
                    // create new log
                    $characterLog = $this->rel('characterLog');
                    $characterLog->characterId = $this->_id;
                }
                $characterLog->setData($logData);
                $characterLog->save();

                $this->characterLog = $characterLog;
            }
        }

        return $this;
    }

    /**
     * update character data from CCPs CREST API
     * @return array (some status messages)
     */
    public function updateFromCrest(){
        $status = [];

        if( $accessToken = $this->getAccessToken() ){
            // et basic character data
            // -> this is required for "ownerHash" hash check (e.g. character was sold,..)
            // -> the "id" check is just for security and should NEVER fail!
            $ssoController = new Sso();
            if(
                !is_null( $verificationCharacterData = $ssoController->verifyCharacterData($accessToken) ) &&
                $verificationCharacterData->CharacterID === $this->_id
            ){
                // get character data from CREST
                $characterData = $ssoController->getCharacterData($accessToken);
                if( isset($characterData->character) ){
                    $characterData->character['ownerHash'] = $verificationCharacterData->CharacterOwnerHash;

                    $corporation = null;
                    $alliance = null;
                    if( isset($characterData->corporation) ){
                        /**
                         * @var $corporation CorporationModel
                         */
                        $corporation = $this->rel('corporationId');
                        $corporation->getById($characterData->corporation['id'], 0);
                        $corporation->copyfrom($characterData->corporation, ['id', 'name', 'isNPC']);
                        $corporation->save();
                    }

                    if( isset($characterData->alliance) ){
                        /**
                         * @var $alliance AllianceModel
                         */
                        $alliance = $this->rel('allianceId');
                        $alliance->getById($characterData->alliance['id'], 0);
                        $alliance->copyfrom($characterData->alliance, ['id', 'name']);
                        $alliance->save();
                    }

                    $this->copyfrom($characterData->character, ['name', 'ownerHash']);
                    $this->set('corporationId', is_object($corporation) ? $corporation->get('id') : null);
                    $this->set('allianceId', is_object($alliance) ? $alliance->get('id') : null);
                    $this->save();
                }
            }else{
                $status[] = sprintf(Sso::ERROR_VERIFY_CHARACTER, $this->name);
            }
        }else{
            $status[] = sprintf(Sso::ERROR_ACCESS_TOKEN, $this->name);
        }

        return $status;
    }

    /**
     * get a unique cookie name for this character
     * -> cookie name does not have to be "secure"
     * -> but is should be unique
     * @return string
     */
    public function getCookieName(){
        return md5($this->name);
    }

    /**
     * get the character log entry for this character
     * @return bool|CharacterLogModel
     */
    public function getLog(){

        $characterLog = false;
        if(
            is_object($this->characterLog) &&
            !$this->characterLog->dry()
        ){
            $characterLog = &$this->characterLog;
        }

        return $characterLog;
    }

    /**
     * get mapModel by id and check if user has access
     * @param $mapId
     * @return MapModel|null
     */
    public function getMap($mapId){
        /**
         * @var $map MapModel
         */
        $map = self::getNew('MapModel');
        $map->getById( (int)$mapId );

        $returnMap = null;
        if($map->hasAccess($this)){
            $returnMap = $map;
        }

        return $returnMap;
    }

    /**
     * get all accessible map models for this character
     * @return MapModel[]
     */
    public function getMaps(){
        $this->filter(
            'characterMaps',
            ['active = ?', 1],
            ['order' => 'created']
        );

        $maps = [];

        if($alliance = $this->getAlliance()){
            $maps = array_merge($maps, $alliance->getMaps());
        }

        if($corporation = $this->getCorporation()){
            $maps = array_merge($maps,  $corporation->getMaps());
        }

        if($this->characterMaps){
            $mapCountPrivate = 0;
            foreach($this->characterMaps as &$characterMap){
                if($mapCountPrivate < self::getF3()->get('PATHFINDER.MAX_MAPS_PRIVATE')){
                    $maps[] = &$characterMap->mapId;
                    $mapCountPrivate++;
                }
            }
        }

        return $maps;
    }

    public function logout(){
        if($this->characterAuthentications){
            foreach($this->characterAuthentications as $characterAuthentication){
                /**
                 * @var $characterAuthentication CharacterAuthenticationModel
                 */
                $characterAuthentication->erase();
            }
        }
    }

} 