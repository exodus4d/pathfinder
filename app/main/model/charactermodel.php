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
use lib\Util;
use lib\Config;
use lib\Socket;
use Model\Universe;

class CharacterModel extends BasicModel {

    protected $table = 'character';

    /**
     * cache key prefix for getData(); result WITH log data
     */
    const DATA_CACHE_KEY_LOG = 'LOG';

    /**
     * character authorization status
     * @var array
     */
    const AUTHORIZATION_STATUS = [
        'OK'            => true,                                        // success
        'UNKNOWN'       => 'error',                                     // general authorization error
        'CORPORATION'   => 'failed to match corporation whitelist',
        'ALLIANCE'      => 'failed to match alliance whitelist',
        'KICKED'        => 'character is kicked',
        'BANNED'        => 'character is banned'
    ];
    
    /**
     * enables change for "kicked" column
     * -> see kick();
     * @var bool
     */
    private $allowKickChange = false;

    /**
     * enables change for "banned" column
     * -> see ban();
     * @var bool
     */
    private $allowBanChange = false;
    

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
        'esiScopes' => [
            'type' => self::DT_JSON
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
        'roleId' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 1,
            'index' => true,
            'belongs-to-one' => 'Model\RoleModel',
            'constraint' => [
                [
                    'table' => 'role',
                    'on-delete' => 'CASCADE'
                ]
            ],
        ],
        'kicked' => [
            'type' => Schema::DT_TIMESTAMP,
            'index' => true
        ],
        'banned' => [
            'type' => Schema::DT_TIMESTAMP,
            'index' => true
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
     * @return null|object|\stdClass
     * @throws \Exception
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
            $characterData->role = $this->roleId->getData();
            $characterData->shared = $this->shared;
            $characterData->logLocation = $this->logLocation;

            if($this->authStatus){
                $characterData->authStatus = $this->authStatus;
            }

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
     * set corporation for this character
     * -> corp change resets admin actions (e.g. kick/ban)
     * @param $corporationId
     * @return mixed
     */
    public function set_corporationId($corporationId){
        $currentCorporationId = (int)$this->get('corporationId', true);

        if($currentCorporationId !== $corporationId){
             $this->resetAdminColumns();
        }

        return $corporationId;
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
                // reset admin actions (e.g. kick/ban)
                $this->resetAdminColumns();

                // new ownerHash -> new user (reset)
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
     * setter for "kicked" until time
     * @param $minutes
     * @return mixed|null|string
     * @throws \Exception
     */
    public function set_kicked($minutes){
        if($this->allowKickChange){
            // allowed to set/change -> reset "allowed" property
            $this->allowKickChange = false;
            $kicked = null;

            if($minutes){
                $seconds = $minutes * 60;
                $timezone = self::getF3()->get('getTimeZone')();
                $kickedUntil = new \DateTime('now', $timezone);

                // add cookie expire time
                $kickedUntil->add(new \DateInterval('PT' . $seconds . 'S'));
                $kicked = $kickedUntil->format('Y-m-d H:i:s');
            }
        }else{
            // not allowed to set/change -> keep current status
            $kicked = $this->kicked;
        }

        return $kicked;
    }

    /**
     * setter for "banned" status
     * @param bool|int $status
     * @return mixed
     */
    public function set_banned($status){
        if($this->allowBanChange){
            // allowed to set/change -> reset "allowed" property
            $this->allowBanChange = false;
            $banned = null;

            if($status){
                $timezone = self::getF3()->get('getTimeZone')();
                $bannedSince = new \DateTime('now', $timezone);
                $banned = $bannedSince->format('Y-m-d H:i:s');
            }
        }else{
            // not allowed to set/change -> keep current status
            $banned = $this->banned;
        }

        return $banned;
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
     * kick character for $minutes
     * -> do NOT use $this->kicked!
     * -> this will not work (prevent abuse)
     * @param bool|int $minutes
     */
    public function kick($minutes = false){
        // enables "kicked" change for this model
        $this->allowKickChange = true;
        $this->kicked = $minutes;
    }

    /**
     * ban character
     * -> do NOT use $this->banned!
     * -> this will not work (prevent abuse)
     * @param bool|int $status
     */
    public function ban($status = false){
        // enables "banned" change for this model
        $this->allowBanChange = true;
        $this->banned = $status;
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
     * resets some columns that could have changed by admins (e.g. kick/ban)
     */
    private function resetAdminColumns(){
        $this->kick();
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
     * @return bool|mixed
     * @throws \Exception
     * @throws \Exception\PathfinderException
     */
    public function getAccessToken(){
        $accessToken = false;

        // check if there is already an "accessToken" for this user
        // check expire timer for stored "accessToken"
        if(
            !empty($this->crestAccessToken) &&
            !empty($this->crestAccessTokenUpdated)
        ){
            $timezone = self::getF3()->get('getTimeZone')();
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
     * check if character  is currently kicked
     * @return bool
     */
    public function isKicked(){
        $kicked = false;
        if( !is_null($this->kicked) ){
            $kickedUntil = new \DateTime();
            $kickedUntil->setTimestamp( (int)strtotime($this->kicked) );
            $now = new \DateTime();
            $kicked = ($kickedUntil > $now);
        }

        return $kicked;
    }

    /**
     * checks whether this character is authorized to log in
     * -> check corp/ally whitelist config (pathfinder.ini)
     * @return bool
     * @throws \Exception\PathfinderException
     */
    public function isAuthorized(){
        $authStatus = 'UNKNOWN';

        // check whether character is banned or temp kicked
        if(is_null($this->banned)){
            if( !$this->isKicked() ){
                $whitelistCorporations = array_filter( array_map('trim', (array)Config::getPathfinderData('login.corporation') ) );
                $whitelistAlliance = array_filter( array_map('trim', (array)Config::getPathfinderData('login.alliance') ) );

                if(
                    empty($whitelistCorporations) &&
                    empty($whitelistAlliance)
                ){
                    // no corp/ally restrictions set -> any character is allowed to login
                    $authStatus = 'OK';
                }else{
                    // check if character corporation is set in whitelist
                    if(
                        !empty($whitelistCorporations) &&
                        $this->hasCorporation() &&
                        in_array((int)$this->get('corporationId', true), $whitelistCorporations)
                    ){
                        $authStatus = 'OK';
                    }else{
                        $authStatus = 'CORPORATION';
                    }

                    // check if character alliance is set in whitelist
                    if(
                        $authStatus != 'OK' &&
                        !empty($whitelistAlliance) &&
                        $this->hasAlliance()
                    ){
                        if( in_array((int)$this->get('allianceId', true), $whitelistAlliance) ){
                            $authStatus =  'OK';
                        }else{
                            $authStatus = 'ALLIANCE';
                        }
                    }
                }
            }else{
                $authStatus = 'KICKED';
            }
        }else{
            $authStatus = 'BANNED';
        }

        return $authStatus;
    }

    /**
     * get Pathfinder role for character
     * @return RoleModel
     * @throws \Exception
     * @throws \Exception\PathfinderException
     */
    public function requestRole() : RoleModel{
        $role = null;

        // check config files for hardcoded character roles
        if(self::getF3()->exists('PATHFINDER.ROLES.CHARACTER', $globalAdminData)){
            foreach((array)$globalAdminData as $adminData){
                if($adminData['ID'] === $this->_id){
                    switch($adminData['ROLE']){
                        case 'SUPER':
                            $role = RoleModel::getAdminRole();
                            break;
                        case 'CORPORATION':
                            $role = RoleModel::getCorporationManagerRole();
                            break;
                    }
                    break;
                }
            }
        }

        // check in-game roles
        if(
            is_null($role) &&
            !empty($rolesData = $this->requestRoles())
        ){
            // roles that grant admin access for this character
            $adminRoles = array_intersect(CorporationModel::ADMIN_ROLES, $rolesData);
            if( !empty($adminRoles) ){
                $role = RoleModel::getCorporationManagerRole();
            }
        }

        // default role
        if(is_null($role)){
            $role = RoleModel::getDefaultRole();
        }

        return $role;
    }

    /**
     * request all corporation roles granted to this character
     * @return array
     * @throws \Exception
     * @throws \Exception\PathfinderException
     */
    protected function requestRoles(){
        $rolesData = [];

        // check if character has accepted all admin scopes (one of them is required for "role" request)
        if( $this->hasAdminScopes() ){
            if( $accessToken = $this->getAccessToken() ){
                // check if corporation exists (should never fail)
                if( $corporation = $this->getCorporation() ){
                    $characterRolesData = $corporation->getCharactersRoles($accessToken);
                    if( !empty($characterRolesData[$this->_id]) ){
                        $rolesData = $characterRolesData[$this->_id];
                    }
                }
            }
        }

        return $rolesData;
    }

    /**
     * check whether this char has accepted all "basic" api scopes
     * @return bool
     */
    public function hasBasicScopes(){
        return empty( array_diff(Sso::getScopesByAuthType(), $this->esiScopes) );
    }

    /**
     * check whether this char has accepted all admin api scopes
     * @return bool
     */
    public function hasAdminScopes(){
        return empty( array_diff(Sso::getScopesByAuthType('admin'), $this->esiScopes) );
    }

    /**
     * update character log (active system, ...)
     * -> API request for character log data
     * @param array $additionalOptions (optional) request options for cURL request
     * @return CharacterModel
     * @throws \Exception
     */
    public function updateLog($additionalOptions = []){
        $deleteLog = false;
        $invalidResponse = false;

        //check if log update is enabled for this character
        // check if character has accepted all scopes. (This fkt is called by cron as well)
        if(
            $this->logLocation &&
            $this->hasBasicScopes()
        ){
            // Try to pull data from API
            if( $accessToken = $this->getAccessToken() ){
                $onlineData = self::getF3()->ccpClient->getCharacterOnlineData($this->_id, $accessToken, $additionalOptions);

                // check whether character is currently ingame online
                if(is_bool($onlineData['online'])){
                    if($onlineData['online'] === true){
                        $locationData = self::getF3()->ccpClient->getCharacterLocationData($this->_id, $accessToken, $additionalOptions);

                        if( !empty($locationData['system']['id']) ){
                            // character is currently in-game

                            // get current $characterLog or get new ---------------------------------------------------
                            if( !($characterLog = $this->getLog()) ){
                                // create new log
                                $characterLog = $this->rel('characterLog');
                            }

                            // get current log data and modify on change
                            $logData = json_decode(json_encode( $characterLog->getData()), true);

                            // check system and station data for changes ----------------------------------------------

                            // IDs for "systemId", "stationId" that require more data
                            $lookupUniverseIds = [];

                            if(
                                empty($logData['system']['name']) ||
                                $logData['system']['id'] !== $locationData['system']['id']
                            ){
                                // system changed -> request "system name" for current system
                                $lookupUniverseIds[] = $locationData['system']['id'];
                            }

                            if( !empty($locationData['station']['id']) ){
                                if(
                                    empty($logData['station']['name']) ||
                                    $logData['station']['id']  !== $locationData['station']['id']
                                ){
                                    // station changed -> request "station name" for current station
                                    $lookupUniverseIds[] = $locationData['station']['id'];
                                }
                            }else{
                                unset($logData['station']);
                            }

                            $logData = array_replace_recursive($logData, $locationData);

                            // get "more" data for systemId and/or stationId -----------------------------------------
                            if( !empty($lookupUniverseIds) ){
                                // get "more" information for some Ids (e.g. name)
                                $universeData = self::getF3()->ccpClient->getUniverseNamesData($lookupUniverseIds, $additionalOptions);
                                if( !empty($universeData) ){
                                    $logData = array_replace_recursive($logData, $universeData);
                                }else{
                                    // this is important! universe data is a MUST HAVE!
                                    $deleteLog = true;
                                }
                            }

                            // check structure data for changes -------------------------------------------------------
                            if(!$deleteLog){

                                // IDs for "structureId" that require more data
                                $lookupStructureId = 0;
                                if( !empty($locationData['structure']['id']) ){
                                    if(
                                        empty($logData['structure']['name']) ||
                                        $logData['structure']['id']  !== $locationData['structure']['id']
                                    ){
                                        // structure changed -> request "structure name" for current station
                                        $lookupStructureId = $locationData['structure']['id'];
                                    }
                                }else{
                                    unset($logData['structure']);
                                }

                                // get "more" data for structureId  ---------------------------------------------------
                                if($lookupStructureId > 0){
                                    /**
                                     * @var $structureModel Universe\StructureModel
                                     */
                                    $structureModel = Universe\BasicUniverseModel::getNew('StructureModel');
                                    $structureModel->loadById($lookupStructureId, $accessToken, $additionalOptions);
                                    if(!$structureModel->dry()){
                                        $structureData['structure'] = (array)$structureModel->getData();
                                        $logData = array_replace_recursive($logData, $structureData);
                                    }else{
                                        unset($logData['structure']);
                                    }
                                }
                            }

                            // check ship data for changes ------------------------------------------------------------
                            if( !$deleteLog ){
                                $shipData = self::getF3()->ccpClient->getCharacterShipData($this->_id, $accessToken, $additionalOptions);

                                // IDs for "shipTypeId" that require more data
                                $lookupShipTypeId = 0;
                                if( !empty($shipData['ship']['typeId']) ){
                                    if(
                                        empty($logData['ship']['typeName']) ||
                                        $logData['ship']['typeId'] !== $shipData['ship']['typeId']
                                    ){
                                        // ship changed -> request "station name" for current station
                                        $lookupShipTypeId = $shipData['ship']['typeId'];
                                    }

                                    // "shipName"/"shipId" could have changed...
                                    $logData = array_replace_recursive($logData, $shipData);
                                }else{
                                    // ship data should never be empty -> keep current one
                                    //unset($logData['ship']);
                                    $invalidResponse = true;
                                }

                                // get "more" data for shipTypeId  ----------------------------------------------------
                                if($lookupShipTypeId > 0){
                                    /**
                                     * @var $typeModel Universe\TypeModel
                                     */
                                    $typeModel = Universe\BasicUniverseModel::getNew('TypeModel');
                                    $typeModel->loadById($lookupShipTypeId, '', $additionalOptions);
                                    if(!$typeModel->dry()){
                                        $shipData['ship'] = (array)$typeModel->getShipData();
                                        $logData = array_replace_recursive($logData, $shipData);
                                    }else{
                                        // this is important! ship data is a MUST HAVE!
                                        $deleteLog = true;
                                    }
                                }
                            }

                            if( !$deleteLog ){
                                // mark log as "updated" even if no changes were made
                                if($additionalOptions['markUpdated'] === true){
                                    $characterLog->touch('updated');
                                }

                                $characterLog->setData($logData);
                                $characterLog->characterId = $this->id;
                                $characterLog->save();

                                $this->characterLog = $characterLog;
                            }
                        }else{
                            // systemId should always exists
                            $invalidResponse = true;
                        }
                    }else{
                        // user is in-game offline
                        $deleteLog = true;
                    }
                }else{
                    // online status request failed
                    $invalidResponse = true;
                }
            }else{
                // access token request failed
                $deleteLog = true;
            }
        }else{
            // character deactivated location logging
            $deleteLog = true;
        }

        //in case of failure (invalid API response) increase or reset "retry counter"
        if( $user = $this->getUser() ){
            // Session data does not exists in CLI mode (Cronjob)
            if( $sessionCharacterData = $user->getSessionCharacterData($this->id, false) ){
                $updateRetry = (int)$sessionCharacterData['UPDATE_RETRY'];
                $newRetry =  $updateRetry;
                if($invalidResponse){
                    $newRetry++;

                    if($newRetry >= 3){
                        // no proper character log data (3 fails in a row))
                        $newRetry = 0;
                        $deleteLog = true;
                    }
                }else{
                    // reset retry counter
                    $newRetry = 0;
                }

                if($updateRetry !== $newRetry){
                    // update retry counter
                    $sessionCharacterData['UPDATE_RETRY'] = $newRetry;
                    $sessionCharacters = self::mergeSessionCharacterData([$sessionCharacterData]);
                    self::getF3()->set(User::SESSION_KEY_CHARACTERS, $sessionCharacters);
                }
            }
        }

        if(
            $deleteLog &&
            $this->hasLog()
        ){
            // delete existing log
            $this->characterLog->erase();
        }

        return $this;
    }

    /**
     * broadcast characterData
     * @throws \ZMQSocketException
     */
    public function broadcastCharacterUpdate(){
        $characterData = $this->getData(true);
        (new Socket( Config::getSocketUri() ))->sendData('characterUpdate', $characterData);
    }

    /**
     * update character data from CCPs ESI API
     * @return array (some status messages)
     * @throws \Exception
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
                    $characterData->character['esiScopes'] = Util::convertScopesString($verificationCharacterData->Scopes);

                    $this->copyfrom($characterData->character, ['ownerHash', 'esiScopes', 'securityStatus']);
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
            $characterLog = $this->characterLog;
        }

        return $characterLog;
    }

    /**
     * get mapModel by id and check if user has access
     * @param $mapId
     * @return MapModel|null
     * @throws \Exception
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
     * @throws \Exception\PathfinderException
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
                    $mapCountPrivate < Config::getMapsDefaultConfig('private')['max_count'] &&
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
     * delete current location
     */
    protected function deleteLog(){
        if($characterLog = $this->getLog()){
            $characterLog->erase();
        }
    }

    /**
     * delete authentications data
     */
    protected function deleteAuthentications(){
        if(is_object($this->characterAuthentications)){
            foreach($this->characterAuthentications as $characterAuthentication){
                /**
                 * @var $characterAuthentication CharacterAuthenticationModel
                 */
                $characterAuthentication->erase();
            }
        }
    }
    /**
     * character logout
     * @param bool $deleteLog
     * @param bool $deleteSession
     * @param bool $deleteCookie
     */
    public function logout(bool $deleteSession = true, bool $deleteLog = true, bool $deleteCookie = false){
        // delete current session data --------------------------------------------------------------------------------
        if($deleteSession){
            $sessionCharacterData = (array)$this->getF3()->get(User::SESSION_KEY_CHARACTERS);
            $sessionCharacterData = array_filter($sessionCharacterData, function($data){
                return ($data['ID'] != $this->_id);
            });

            if(empty($sessionCharacterData)){
                // no active characters logged in -> log user out
                $this->getF3()->clear(User::SESSION_KEY_USER);
                $this->getF3()->clear(User::SESSION_KEY_CHARACTERS);
            }else{
                // update remaining active characters
                $this->getF3()->set(User::SESSION_KEY_CHARACTERS, $sessionCharacterData);
            }
        }

        // delete current location data -------------------------------------------------------------------------------
        if($deleteLog){
            $this->deleteLog();
        }

        // delete auth cookie data ------------------------------------------------------------------------------------
        if($deleteCookie ){
            $this->deleteAuthentications();
        }
    }

    /**
     * merges two multidimensional characterSession arrays by checking characterID
     * @param array $characterDataBase
     * @return array
     */
    public static function mergeSessionCharacterData(array $characterDataBase = []){
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

    /**
     * get all characters
     * @param array $characterIds
     * @return \DB\CortexCollection
     */
    public static function getAll($characterIds = []){
        $query = [
            'active = :active AND id IN :characterIds',
            ':active' => 1,
            ':characterIds' => $characterIds
        ];

        return (new self())->find($query);
    }
} 