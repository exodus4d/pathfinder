<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 11.04.15
 * Time: 15:20
 */

namespace Model;

use Controller\Ccp\Sso as Sso;
use Controller\Api\User as User;
use DB\SQL\Schema;

class CharacterModel extends BasicModel {

    protected $table = 'character';

    /**
     * cache key prefix for getData(); result WITH log data
     */
    const DATA_CACHE_KEY_LOG = 'LOG';

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
        'shared' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'logLocation' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1
        ],
        'securityStatus' => [
            'type' => Schema::DT_FLOAT,
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
        $cacheKeyModifier = '';

        // check if there is cached data
        // -> IMPORTANT: $addCharacterLogData is optional! -> therefore we need 2 cache keys!
        if($addCharacterLogData){
            $cacheKeyModifier = self::DATA_CACHE_KEY_LOG;
        }
        $characterData = $this->getCacheData($cacheKeyModifier);

        if(is_null($characterData)){
            // no cached character data found

            $characterData = (object) [];
            $characterData->id = $this->id;
            $characterData->name = $this->name;
            $characterData->shared = $this->shared;
            $characterData->logLocation = $this->logLocation;

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
            $this->updateCacheData($characterData, $cacheKeyModifier);
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
     * set API accessToken for current session
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
     * logLocation specifies whether the current system should be tracked or not
     * @param $logLocation
     * @return bool
     */
    public function set_logLocation($logLocation){
        $logLocation = (bool)$logLocation;
        if(
            !$logLocation &&
            $logLocation !== $this->logLocation &&
            $this->hasLog()
        ){
            $this->getLog()->erase();
        }

        return $logLocation;
    }

    /**
     * Event "Hook" function
     * @param self $self
     * @param $pkeys
     */
    public function afterInsertEvent($self, $pkeys){
        $self->clearCacheData();
    }

    /**
     * Event "Hook" function
     * @param self $self
     * @param $pkeys
     */
    public function afterUpdateEvent($self, $pkeys){
        $self->clearCacheData();
    }

    /**
     * Event "Hook" function
     * @param self $self
     * @param $pkeys
     */
    public function afterEraseEvent($self, $pkeys){
        $self->clearCacheData();
    }

    /**
     * see parent
     */
    public function clearCacheData(){
        parent::clearCacheData();

        // clear data with "log" as well!
        parent::clearCacheDataWithPrefix(self::DATA_CACHE_KEY_LOG);
    }

    /**
     * check whether this character has already a user assigned to it
     * @return bool
     */
    public function hasUserCharacter(){
        return is_object($this->userCharacter);
    }

    /**
     * check whether this character has an active location log
     * @return bool
     */
    public function hasLog(){
        return is_object($this->characterLog);
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
     * get ESI API "access_token" from OAuth
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
                in_array((int)$this->get('corporationId', true), $whitelistCorporations)
            ){
                $isAuthorized = true;
            }

            // check if character alliance is set in whitelist
            if(
                !$isAuthorized &&
                !empty($whitelistAlliance) &&
                $this->hasAlliance() &&
                in_array((int)$this->get('allianceId', true), $whitelistAlliance)
            ){
                $isAuthorized = true;
            }
        }

        return $isAuthorized;
    }

    /**
     * update character log (active system, ...)
     * -> API request for character log data
     * @param array $additionalOptions (optional) request options for cURL request
     * @return $this
     */
    public function updateLog($additionalOptions = []){
        $deleteLog = true;


        //check if log update is enabled for this user
        if( $this->logLocation ){
            // Try to pull data from API
            if( $accessToken = $this->getAccessToken() ){

                $locationData = self::getF3()->ccpClient->getCharacterLocationData($this->_id, $accessToken, $additionalOptions);

                if( !empty($locationData['system']['id']) ){
                    // character is currently in-game


                    // IDs for "systemId", "stationId and "shipTypeId" that require more data
                    $lookupIds = [];

                    if( !$characterLog = $this->getLog() ){
                        // create new log
                        $characterLog = $this->rel('characterLog');
                        $characterLog->characterId = $this->_id;
                    }

                    // get current log data and modify on change
                    $logData = json_decode(json_encode( $characterLog->getData()), true);

                    if($logData['system']['id'] !== $locationData['system']['id']){
                        // system changed -> request "system name" for current system
                        $lookupIds[] = $locationData['system']['id'];
                    }

                    if( !empty($locationData['station']['id']) ){
                        if( $logData['station']['id']  !== $locationData['station']['id'] ){
                            // station changed -> request "station name" for current station
                            $lookupIds[] = $locationData['station']['id'];
                        }
                    }else{
                        unset($logData['station']);
                    }

                    $logData = array_replace_recursive($logData, $locationData);

                    // get current ship data
                    $shipData = self::getF3()->ccpClient->getCharacterShipData($this->_id, $accessToken, $additionalOptions);

                    if( !empty($shipData['ship']['typeId']) ){
                        if($logData['ship']['typeId'] !== $shipData['ship']['typeId']){
                            // ship changed -> request "station name" for current station
                            $lookupIds[] = $shipData['ship']['typeId'];
                        }

                        // "shipName"/"shipId" could have changed...
                        $logData = array_replace_recursive($logData, $shipData);
                    }else{
                        unset($logData['ship']);
                    }

                    if( !empty($lookupIds) ){
                        // get "more" information for some Ids (e.g. name)
                        $universeData = self::getF3()->ccpClient->getUniverseNamesData($lookupIds, $additionalOptions);
                        $logData = array_replace_recursive($logData, $universeData);
                    }

                    $deleteLog = false;
                    $characterLog->setData($logData);
                    $characterLog->save();

                    $this->characterLog = $characterLog;
                }
            }
        }

        if(
            $deleteLog &&
            $this->hasLog()
        ){
            // delete existing log
            $this->characterLog->erase();
            $this->save();
        }

        return $this;
    }

    /**
     * update character data from CCPs ESI API
     * @return array (some status messages)
     */
    public function updateFromESI(){
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
                // get character data from API
                $characterData = $ssoController->getCharacterData($this->_id);
                if( !empty($characterData->character) ){
                    $characterData->character['ownerHash'] = $verificationCharacterData->CharacterOwnerHash;

                    $this->copyfrom($characterData->character, ['ownerHash', 'securityStatus']);
                    $this->corporationId = $characterData->corporation;
                    $this->allianceId = $characterData->alliance;
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
            $this->hasLog() &&
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

        if( is_object($this->characterMaps) ){
            $mapCountPrivate = 0;
            foreach($this->characterMaps as $characterMap){
                if(
                    $mapCountPrivate < self::getF3()->get('PATHFINDER.MAP.PRIVATE.MAX_COUNT') &&
                    $characterMap->mapId->isActive()
                ){
                    $maps[] = $characterMap->mapId;
                    $mapCountPrivate++;
                }
            }
        }

        return $maps;
    }

    /**
     * character logout
     * -> clear authentication data
     */
    public function logout(){
        if( is_object($this->characterAuthentications) ){
            foreach($this->characterAuthentications as $characterAuthentication){
                /**
                 * @var $characterAuthentication CharacterAuthenticationModel
                 */
                $characterAuthentication->erase();
            }
        }
    }

    /**
     * merges two multidimensional characterSession arrays by checking characterID
     * @param array $characterDataBase
     * @return array
     */
    static function mergeSessionCharacterData(array $characterDataBase = []){
        $addData = [];
        // get current session characters to be merged with
        $characterData = (array)self::getF3()->get(User::SESSION_KEY_CHARACTERS);

        foreach($characterDataBase as $i => $baseData){
            foreach($characterData as $data){
                if((int)$baseData['ID'] === (int)$data['ID']){
                    // overwrite static data -> should NEVER change on merge!
                    $characterDataBase[$i]['NAME'] = $data['NAME'];
                    $characterDataBase[$i]['TIME'] = $data['TIME'];
                }else{
                    $addData[] = $data;
                }
            }
        }

        return array_merge($characterDataBase, $addData);
    }

} 