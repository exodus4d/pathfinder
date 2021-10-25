<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 11.04.15
 * Time: 15:20
 */

namespace Exodus4D\Pathfinder\Model\Pathfinder;

use Exodus4D\Pathfinder\Controller\Ccp\Sso as Sso;
use Exodus4D\Pathfinder\Controller\Api\User as User;
use Exodus4D\Pathfinder\Lib\Config;
use Exodus4D\Pathfinder\Model\Universe;
use DB\SQL\Schema;

class CharacterModel extends AbstractPathfinderModel {

    /**
     * @var string
     */
    protected $table                    = 'character';

    /**
     * cache key prefix for getData(); result WITH log data
     */
    const DATA_CACHE_KEY_LOG            = 'LOG';

    /**
     * log message for character access
     */
    const LOG_ACCESS                    = 'charId: [%20s], status: %s, charName: %s';

    /**
     * max count of historic character logs
     * -> this includes logs where just e.g. shipTypeId has changed but no systemId change!
     */
    const MAX_LOG_HISTORY_DATA          = 10;

    /**
     * TTL for historic character logs
     */
    const TTL_LOG_HISTORY               = 60 * 60 * 22;

    /**
     * cache key prefix historic character logs
     */
    const DATA_CACHE_KEY_LOG_HISTORY    = 'LOG_HISTORY';

    /**
     * character authorization status
     * @var array
     */
    const AUTHORIZATION_STATUS = [
        'OK'            => true,                                        // success
        'UNKNOWN'       => 'error',                                     // general authorization error
        'CHARACTER'     => 'failed to match character whitelist',
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

    /**
     * @var array
     */
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
        'esiAccessToken' => [
            'type' => Schema::DT_TEXT
        ],
        'esiAccessTokenExpires' => [
            'type' => Schema::DT_TIMESTAMP,
            'default' => Schema::DF_CURRENT_TIMESTAMP,
            'index' => true
        ],
        'esiRefreshToken' => [
            'type' => Schema::DT_VARCHAR256
        ],
        'esiScopes' => [
            'type' => self::DT_JSON
        ],
        'corporationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Pathfinder\CorporationModel',
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
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Pathfinder\AllianceModel',
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
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Pathfinder\RoleModel',
            'constraint' => [
                [
                    'table' => 'role',
                    'on-delete' => 'CASCADE'
                ]
            ],
        ],
        'cloneLocationId' => [
            'type' => Schema::DT_BIGINT,
            'index' => true,
            'activity-log' =>  true
        ],
        'cloneLocationType' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
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
        'selectLocation' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'securityStatus' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0
        ],
        'userCharacter' => [
            'has-one' => ['Exodus4D\Pathfinder\Model\Pathfinder\UserCharacterModel', 'characterId']
        ],
        'characterLog' => [
            'has-one' => ['Exodus4D\Pathfinder\Model\Pathfinder\CharacterLogModel', 'characterId']
        ],
        'characterMaps' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Pathfinder\CharacterMapModel', 'characterId']
        ],
        'characterAuthentications' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Pathfinder\CharacterAuthenticationModel', 'characterId']
        ]
    ];

    /**
     * get character data
     * @param bool $addLogData
     * @param bool $addLogHistoryData
     * @return mixed|object|null
     * @throws \Exception
     */
    public function getData($addLogData = false, $addLogHistoryData = false){
        // check for cached data
        if(is_null($characterData = $this->getCacheData())){
            // no cached character data found

            $characterData                      = (object) [];
            $characterData->id                  = $this->_id;
            $characterData->name                = $this->name;
            $characterData->role                = $this->roleId->getData();
            $characterData->shared              = $this->shared;
            $characterData->logLocation         = $this->logLocation;
            $characterData->selectLocation      = $this->selectLocation;

            // check for corporation
            if($corporation = $this->getCorporation()){
                $characterData->corporation     = $corporation->getData();
            }

            // check for alliance
            if($alliance = $this->getAlliance()){
                $characterData->alliance        = $alliance->getData();
            }

            // max caching time for a system
            // cached date has to be cleared manually on any change
            // this applies to system, connection,... changes (+ all other dependencies)
            $this->updateCacheData($characterData);
        }

        if($addLogData){
            if(is_null($logData = $this->getCacheData(self::DATA_CACHE_KEY_LOG))){
                if($logModel = $this->getLog()){
                    $logData = $logModel->getData();
                    $this->updateCacheData($logData, self::DATA_CACHE_KEY_LOG);
                }
            }

            if($logData){
                $characterData->log             = $logData;
            }
        }

        if($addLogHistoryData && $characterData->log){
            $characterData->logHistory          = $this->getLogHistoryJumps($characterData->log->system->id);
        }

        // temp "authStatus" should not be cached
        if($this->authStatus){
            $characterData->authStatus          = $this->authStatus;
        }

        return $characterData;
    }

    /**
     * get "basic" character data
     * @return \stdClass
     * @throws \Exception
     */
    public function getBasicData() : \stdClass {
        $characterData = (object) [];
        $characterData->id = $this->_id;
        $characterData->name = $this->name;

        // check for corporation
        if($corporation = $this->getCorporation()){
            $characterData->corporation = $corporation->getData(false);
        }

        // check for alliance
        if($alliance = $this->getAlliance()){
            $characterData->alliance = $alliance->getData();
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
     * @param $status
     * @return mixed|string|null
     * @throws \Exception
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
            $logLocation !== $this->logLocation
        ){
            $this->deleteLog();
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
        $this->ban();
    }

    /**
     * check whether this character has already a user assigned to it
     * @return bool
     */
    public function hasUserCharacter() : bool {
        return is_object($this->userCharacter);
    }

    /**
     * check whether this character has an active location log
     * @return bool
     */
    public function hasLog() : bool {
        return is_object($this->characterLog);
    }

    /**
     * check whether this character has a corporation
     * @return bool
     */
    public function hasCorporation() : bool {
        return is_object($this->corporationId);
    }

    /**
     * check whether this character has an alliance
     * @return bool
     */
    public function hasAlliance() : bool {
        return is_object($this->allianceId);
    }

    /**
     * @return UserModel|null
     */
    public function getUser() : ?UserModel {
        return $this->hasUserCharacter() ? $this->userCharacter->userId : null;
    }

    /**
     * get the corporation from character
     * @return CorporationModel|null
     */
    public function getCorporation() : ?CorporationModel {
        return $this->corporationId;
    }

    /**
     * get the alliance from character
     * @return AllianceModel|null
     */
    public function getAlliance() : ?AllianceModel {
        return $this->allianceId;
    }

    /**
     * get ESI API "access_token" from OAuth
     * @return bool|string
     */
    public function getAccessToken(){
        $accessToken = false;
        $refreshToken = true;

        try{
            $timezone = self::getF3()->get('getTimeZone')();
            $now = new \DateTime('now', $timezone);

            if(
                !empty($this->esiAccessToken) &&
                !empty($this->esiAccessTokenExpires)
            ){
                $expireTime = \DateTime::createFromFormat(
                    'Y-m-d H:i:s',
                    $this->esiAccessTokenExpires,
                    $timezone
                );

                // check if token is not expired
                if($expireTime->getTimestamp() > $now->getTimestamp()){
                    // token still valid
                    $accessToken = $this->esiAccessToken;

                    // check if token should be renewed (close to expire)
                    $timeBuffer = 2 * 60;
                    $expireTime->sub(new \DateInterval('PT' . $timeBuffer . 'S'));

                    if($expireTime->getTimestamp() > $now->getTimestamp()){
                        // token NOT close to expire
                        $refreshToken = false;
                    }
                }
            }
        }catch(\Exception $e){
            self::getF3()->error(500, $e->getMessage(), $e->getTrace());
        }

        // no valid "accessToken" found OR
        // existing token is close to expire
        // -> get a fresh one by an existing "refreshToken"
        // -> in case request for new token fails (e.g. timeout) and old token is still valid -> keep old token
        if(
            $refreshToken &&
            !empty($this->esiRefreshToken)
        ){
            $ssoController = new Sso();
            $accessData =  $ssoController->refreshAccessToken($this->esiRefreshToken);

            if(isset($accessData->accessToken, $accessData->esiAccessTokenExpires, $accessData->refreshToken)){
                $this->esiAccessToken = $accessData->accessToken;
                $this->esiAccessTokenExpires = $accessData->esiAccessTokenExpires;
                $this->save();

                $accessToken = $this->esiAccessToken;
            }
        }

        return $accessToken;
    }

    /**
     * check if character  is currently kicked
     * @return bool
     */
    public function isKicked() : bool {
        $kicked = false;
        if( !is_null($this->kicked) ){
            try{
                $kickedUntil = new \DateTime();
                $kickedUntil->setTimestamp( (int)strtotime($this->kicked) );
                $now = new \DateTime();
                $kicked = ($kickedUntil > $now);
            }catch(\Exception $e){
                self::getF3()->error(500, $e->getMessage(), $e->getTrace());
            }
        }

        return $kicked;
    }

    /**
     * checks whether this character is currently logged in
     * @return bool
     */
    public function checkLoginTimer() : bool {
        $loginCheck = false;

        if( !$this->dry() && $this->lastLogin ){
            // get max login time (minutes) from config
            $maxLoginMinutes = (int)Config::getPathfinderData('timer.logged');
            if($maxLoginMinutes){
                $timezone = self::getF3()->get('getTimeZone')();
                try{
                    $now = new \DateTime('now', $timezone);
                    $logoutTime = new \DateTime($this->lastLogin, $timezone);
                    $logoutTime->add(new \DateInterval('PT' . $maxLoginMinutes . 'M'));
                    if($logoutTime->getTimestamp() > $now->getTimestamp()){
                        $loginCheck = true;
                    }
                }catch(\Exception $e){
                    self::getF3()->error(500, $e->getMessage(), $e->getTrace());
                }
            }else{
                // no "max login" timer configured -> character still logged in
                $loginCheck = true;
            }
        }

        return $loginCheck;
    }

    /**
     * checks whether this character is authorized to log in
     * -> check corp/ally whitelist config (pathfinder.ini)
     * @return string
     */
    public function isAuthorized() : string {
        $authStatus = 'UNKNOWN';

        // check whether character is banned or temp kicked
        if(is_null($this->banned)){
            if( !$this->isKicked() ){
                $whitelistCharacter = array_filter( array_map('trim', (array)Config::getPathfinderData('login.character') ) );
                $whitelistCorporations = array_filter( array_map('trim', (array)Config::getPathfinderData('login.corporation') ) );
                $whitelistAlliance = array_filter( array_map('trim', (array)Config::getPathfinderData('login.alliance') ) );

                if(
                    empty($whitelistCharacter) &&
                    empty($whitelistCorporations) &&
                    empty($whitelistAlliance)
                ){
                    // no corp/ally restrictions set -> any character is allowed to login
                    $authStatus = 'OK';
                }elseif(
                    // check if session_sharing is enabled and if a character is saved in session
                    Config::getPathfinderData('login.session_sharing') === 1 &&
                    is_array($this->getF3()->get(User::SESSION_KEY_CHARACTERS))
                ){
                    // authorized character is already logged in -> any subsequent character is allowed to login
                    $authStatus = 'OK';
                }else{
                    // check if character is set in whitelist
                    if(
                        !empty($whitelistCharacter) &&
                        in_array((int)$this->_id, $whitelistCharacter)
                    ){
                        $authStatus =  'OK';
                    }else{
                        $authStatus = 'CHARACTER';
                    }

                    // check if character corporation is set in whitelist
                    if(
                        $authStatus != 'OK' &&
                        !empty($whitelistCorporations) &&
                        $this->hasCorporation()
                    ){
                        if( in_array((int)$this->get('corporationId', true), $whitelistCorporations) ){
                            $authStatus = 'OK';
                        }else{
                            $authStatus = 'CORPORATION';
                        }
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
     */
    protected function getRole() : RoleModel {
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
            !empty($rolesData = $this->requestRoles()) &&
            !empty($roles = $rolesData['roles'])
        ){
            // roles that grant admin access for this character
            $adminRoles = array_intersect(CorporationModel::ADMIN_ROLES, $roles);
            if(!empty($adminRoles)){
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
     * get all character roles grouped by 'role type'
     * -> 'role types' are 'roles', 'rolesAtBase', 'rolesAtHq', 'rolesAtOther'
     * @return array
     */
    protected function requestRoles() : array {
        $rolesData = [];
        $response = self::getF3()->ccpClient()->send('getCharacterRoles', $this->_id, $this->getAccessToken());
        if(!empty($response) && !isset($response['error'])){
            $rolesData = $response;
        }
        return $rolesData;
    }

    /**
     * check whether this char has accepted all "basic" api scopes
     * @return bool
     */
    public function hasBasicScopes() : bool {
        return empty(array_diff(Sso::getScopesByAuthType(), $this->esiScopes));
    }

    /**
     * check whether this char has accepted all admin api scopes
     * @return bool
     */
    public function hasAdminScopes() : bool {
        return empty(array_diff(Sso::getScopesByAuthType('admin'), $this->esiScopes));
    }

    /**
     * update clone data
     */
    public function updateCloneData(){
        if($accessToken = $this->getAccessToken()){
            $clonesData = self::getF3()->ccpClient()->send('getCharacterClones', $this->_id, $accessToken);
            if(!isset($clonesData['error'])){
                if(!empty($homeLocationData = $clonesData['home']['location'])){
                    // clone home location data
                    $this->cloneLocationId = (int)$homeLocationData['id'];
                    $this->cloneLocationType = (string)$homeLocationData['type'];
                }
            }
        }
    }

    /**
     * @throws \Exception
     */
    public function updateRoleData(){
        $this->roleId = $this->getRole();
    }

    /**
     * get online status data from ESI
     * @param string $accessToken
     * @return array
     */
    protected function getOnlineData(string $accessToken) : array {
        return self::getF3()->ccpClient()->send('getCharacterOnline', $this->_id, $accessToken);
    }

    /**
     * check online state from ESI
     * @param string $accessToken
     * @return bool
     */
    public function isOnline(string $accessToken) : bool {
        $isOnline = false;
        $onlineData = $this->getOnlineData($accessToken);

        if($onlineData['online'] === true){
            $isOnline = true;
        }

        return $isOnline;
    }

    /**
     * update character log (active system, ...)
     * -> API request for character log data
     * @param array $additionalOptions (optional) request options for cURL request
     * @return CharacterModel
     * @throws \Exception
     */
    public function updateLog($additionalOptions = []) : self {
        $deleteLog = false;
        $invalidResponse = false;

        //check if log update is enabled for this character
        // check if character has accepted all scopes. (This fkt is called by cron as well)
        if(
            $this->logLocation &&
            $this->hasBasicScopes()
        ){
            // Try to pull data from API
            if($accessToken = $this->getAccessToken()){
                if($this->isOnline($accessToken)){
                    $locationData = self::getF3()->ccpClient()->send('getCharacterLocation', $this->_id, $accessToken);

                    if(!empty($locationData['system']['id'])){
                        // character is currently in-game

                        // get current $characterLog or get new -------------------------------------------------------
                        if(!$characterLog = $this->getLog()){
                            // create new log
                            $characterLog = $this->rel('characterLog');
                        }

                        // get current log data and modify on change
                        $logData = $characterLog::toArray($characterLog->getData());

                        // check system and station data for changes --------------------------------------------------

                        // IDs for "systemId", "stationId" that require more data
                        $lookupUniverseIds = [];
                        if(
                            empty($logData['system']['name']) ||
                            $logData['system']['id'] !== $locationData['system']['id']
                        ){
                            // system changed -> request "system name" for current system
                            $lookupUniverseIds[] = $locationData['system']['id'];
                        }

                        $logData = array_replace_recursive($logData, $locationData);

                        // get "more" data for systemId ---------------------------------------------------------------
                        if(!empty($lookupUniverseIds)){
                            // get "more" information for some Ids (e.g. name)
                            $universeData = self::getF3()->ccpClient()->send('getUniverseNames', $lookupUniverseIds);

                            if(!empty($universeData) && !isset($universeData['error'])){
                                // We expect max ONE system AND/OR station data, not an array of e.g. systems
                                if(!empty($universeData['system'])){
                                    $universeData['system'] = reset($universeData['system']);
                                }

                                $logData = array_replace_recursive($logData, $universeData);
                            }else{
                                // this is important! universe data is a MUST HAVE!
                                $deleteLog = true;
                            }
                        }

                        // check station data for changes -------------------------------------------------------------
                        if(!$deleteLog){
                            // IDs for "stationId" that require more data
                            $lookupStationId = 0;
                            if(!empty($locationData['station']['id'])){
                                if(
                                    empty($logData['station']['name']) ||
                                    $logData['station']['id']  !== $locationData['station']['id']
                                ){
                                    // station changed -> request station data
                                    $lookupStationId = $locationData['station']['id'];
                                }
                            }else{
                                unset($logData['station']);
                            }

                            // get "more" data for stationId
                            if($lookupStationId > 0){
                                /**
                                 * @var $stationModel Universe\StationModel
                                 */
                                $stationModel = Universe\AbstractUniverseModel::getNew('StationModel');
                                $stationModel->loadById($lookupStationId, $accessToken, $additionalOptions);
                                if($stationModel->valid()){
                                    $stationData['station'] = $stationModel::toArray($stationModel->getData());
                                    $logData = array_replace_recursive($logData, $stationData);
                                }else{
                                    unset($logData['station']);
                                }
                            }
                        }

                        // check structure data for changes -----------------------------------------------------------
                        if(!$deleteLog){
                            // IDs for "structureId" that require more data
                            $lookupStructureId = 0;
                            if(!empty($locationData['structure']['id'])){
                                if(
                                    empty($logData['structure']['name']) ||
                                    $logData['structure']['id']  !== $locationData['structure']['id']
                                ){
                                    // structure changed -> request structure data
                                    $lookupStructureId = $locationData['structure']['id'];
                                }
                            }else{
                                unset($logData['structure']);
                            }

                            // get "more" data for structureId
                            if($lookupStructureId > 0){
                                /**
                                 * @var $structureModel Universe\StructureModel
                                 */
                                $structureModel = Universe\AbstractUniverseModel::getNew('StructureModel');
                                $structureModel->loadById($lookupStructureId, $accessToken, $additionalOptions);
                                if($structureModel->valid()){
                                    $structureData['structure'] = $structureModel::toArray($structureModel->getData());
                                    $logData = array_replace_recursive($logData, $structureData);
                                }else{
                                    unset($logData['structure']);
                                }
                            }
                        }

                        // check ship data for changes ----------------------------------------------------------------
                        if(!$deleteLog){
                            $shipData = self::getF3()->ccpClient()->send('getCharacterShip', $this->_id, $accessToken);

                            // IDs for "shipTypeId" that require more data
                            $lookupShipTypeId = 0;
                            if(!empty($shipData['ship']['typeId'])){
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

                            // get "more" data for shipTypeId
                            if($lookupShipTypeId > 0){
                                /**
                                 * @var $typeModel Universe\TypeModel
                                 */
                                $typeModel = Universe\AbstractUniverseModel::getNew('TypeModel');
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

                        if(!$deleteLog){
                            // mark log as "updated" even if no changes were made
                            if($additionalOptions['markUpdated'] === true){
                                $characterLog->touch('updated');
                            }

                            $characterLog->setData($logData);
                            $characterLog->characterId = $this->_id;
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
                // access token request failed
                $deleteLog = true;
            }
        }else{
            // character deactivated location logging
            $deleteLog = true;
        }

        if($deleteLog){
            $this->deleteLog();
        }

        return $this;
    }

    /**
     * get 'character log' history data. Filter all data that does not represent a 'jump' (systemId change)
     * -> e.g. If just 'shipTypeId' has changed, this entry is filtered
     * @param int $systemIdPrev
     * @return array
     */
    protected function getLogHistoryJumps(int $systemIdPrev =  0) : array {
        return $this->filterLogsHistory(function(array $historyEntry) use (&$systemIdPrev) : bool {
            $addEntry = false;
            if(
                !empty($historySystemId = (int)$historyEntry['log']['system']['id']) &&
                $historySystemId !== $systemIdPrev
            ){
                $addEntry = true;
                $systemIdPrev = $historySystemId;
            }

            return $addEntry;
        });
    }

    /**
     * filter 'character log' history data by $callback
     * -> reindex array keys! Otherwise json_encode() on result would return object!
     * @param \Closure $callback
     * @return array
     */
    protected function filterLogsHistory(\Closure $callback) : array {
        return array_values(array_filter($this->getLogsHistory() , $callback));
    }

    /**
     * @return array
     */
    public function getLogsHistory() : array {
        if(!is_array($logHistoryData = $this->getCacheData(self::DATA_CACHE_KEY_LOG_HISTORY))){
            $logHistoryData = [];
        }
        return $logHistoryData;
    }

    /**
     * add new 'character log' history entry
     * @param CharacterLogModel $characterLog
     * @param string $action
     */
    public function updateLogsHistory(CharacterLogModel $characterLog, string $action = 'update') : void {
        if(
            $this->valid() &&
            $this->_id === $characterLog->get('characterId', true)
        ){
            $task = 'add';
            $mapIds = [];
            $historyLog = $characterLog::toArray($characterLog->getData());

            if($logHistoryData = $this->getLogsHistory()){
                // skip logging if no relevant fields changed
                [$historyEntryPrev] = $logHistoryData;
                if($historyLogPrev = $historyEntryPrev['log']){
                    if(
                        $historyLog['system']['id']     === $historyLogPrev['system']['id'] &&
                        $historyLog['ship']['typeId']   === $historyLogPrev['ship']['typeId'] &&
                        $historyLog['station']['id']    === $historyLogPrev['station']['id'] &&
                        $historyLog['structure']['id']  === $historyLogPrev['structure']['id']
                    ){
                        // no changes in 'relevant' fields -> just update timestamp
                        $task = 'update';
                        $mapIds = (array)$historyEntryPrev['mapIds'];
                    }
                }
            }

            $historyEntry = [
                'stamp'     => strtotime($characterLog->updated),
                'action'    => $action,
                'mapIds'    => $mapIds,
                'log'       => $historyLog
            ];

            if($task == 'update'){
                $logHistoryData[0] = $historyEntry;
            }else{
                array_unshift($logHistoryData, $historyEntry);

                // limit max history data
                array_splice($logHistoryData, self::MAX_LOG_HISTORY_DATA);
            }

            $this->updateCacheData($logHistoryData, self::DATA_CACHE_KEY_LOG_HISTORY, self::TTL_LOG_HISTORY);
        }
    }

    /**
     * try to update existing 'character log' history entry (replace data)
     * -> matched by 'stamp' timestamp
     * @param array $historyEntry
     * @return bool
     */
    protected function updateLogHistoryEntry(array $historyEntry) : bool {
        $updated = false;

        if(
            $this->valid() &&
            ($logHistoryData = $this->getLogsHistory())
        ){
            $map = function(array $entry) use ($historyEntry, &$updated) : array {
                if($entry['stamp'] === $historyEntry['stamp']){
                    $updated = true;
                    $entry = $historyEntry;
                }
                return $entry;
            };

            $logHistoryData = array_map($map, $logHistoryData);

            if($updated){
                $this->updateCacheData($logHistoryData, self::DATA_CACHE_KEY_LOG_HISTORY, self::TTL_LOG_HISTORY);
            }
        }

        return $updated;
    }

    /**
     * broadcast characterData
     */
    public function broadcastCharacterUpdate(){
        $characterData = $this->getData(true);

        self::getF3()->webSocket()->write('characterUpdate', $characterData);
    }

    /**
     * update character data from CCPs ESI API
     * @return array (some status messages)
     * @throws \Exception
     */
    public function updateFromESI() : array {
        $status = [];

        if( $accessToken = $this->getAccessToken() ){
            // et basic character data
            // -> this is required for "ownerHash" hash check (e.g. character was sold,..)
            // -> the "id" check is just for security and should NEVER fail!
            $ssoController = new Sso();
            if(
                !empty( $verificationCharacterData = $ssoController->verifyCharacterData($accessToken) ) &&
                $verificationCharacterData->characterId === $this->_id
            ){
                // get character data from API
                $characterData = $ssoController->getCharacterData($this->_id);
                if( !empty($characterData->character) ){
                    $characterData->character['ownerHash'] = $verificationCharacterData->owner;
                    $characterData->character['esiScopes'] = $verificationCharacterData->scp;

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
    public function getCookieName() : string {
        return md5($this->name);
    }

    /**
     * get the character log entry for this character
     * @return CharacterLogModel|null
     */
    public function getLog() : ?CharacterLogModel {
        return ($this->hasLog() && !$this->characterLog->dry()) ? $this->characterLog : null;
    }

    /**
     * get the first matched (most recent) log entry before $systemId.
     * -> The returned log entry *might* be previous system for this character
     * @param int $mapId
     * @param int $systemId
     * @return CharacterLogModel|null
     */
    public function getLogPrevSystem(int $mapId, int $systemId) : ?CharacterLogModel {
        $characterLog = null;

        if($mapId && $systemId){
            $skipRest = false;
            $logHistoryData = $this->filterLogsHistory(function(array $historyEntry) use ($mapId, $systemId, &$skipRest) : bool {
                $addEntry = false;
                //if(in_array($mapId, (array)$historyEntry['mapIds'], true)){   // $historyEntry is checked by EACH map -> would auto add system on map switch! #827
                if(!empty((array)$historyEntry['mapIds'])){                     // if $historyEntry was already checked by ANY other map -> no further checks
                    $skipRest = true;
                }

                if(
                    !$skipRest &&
                    !empty($historySystemId = (int)$historyEntry['log']['system']['id']) &&
                    $historySystemId !== $systemId
                ){
                    $addEntry = true;
                    $skipRest = true;
                }

                return $addEntry;
            });

            if(
                !empty($historyEntry = reset($logHistoryData)) &&
                is_array($historyEntry['mapIds'])
            ){
                /**
                 * @var $characterLog CharacterLogModel
                 */
                $characterLog = $this->rel('characterLog');
                $characterLog->setData($historyEntry['log']);

                // mark $historyEntry data as "checked" for $mapId
                array_push($historyEntry['mapIds'], $mapId);

                $this->updateLogHistoryEntry($historyEntry);
            }
        }

        return $characterLog;
    }

    /**
     * get mapModel by id and check if user has access
     * @param $mapId
     * @return MapModel|null
     * @throws \Exception
     */
    public function getMap(int $mapId) : ?MapModel {
        /**
         * @var $map MapModel
         */
        $map = self::getNew('MapModel');
        $map->getById($mapId);

        return $map->hasAccess($this) ? $map : null;
    }

    /**
     * get all accessible map models for this character
     * @return MapModel[]
     */
    public function getMaps() : array {
        if(Config::getPathfinderData('login.session_sharing') === 1){
            $maps = $this->getSessionCharacterMaps();
        }else{
            $maps = [];

            if($alliance = $this->getAlliance()){
                $maps = array_merge($maps, $alliance->getMaps());
            }

            if($corporation = $this->getCorporation()){
                $maps = array_merge($maps,  $corporation->getMaps());
            }

            if(is_object($this->characterMaps)){
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
        }

        return $maps;
    }

    /** 
     * get all accessible map models for all characters in session
     * using mapIds and characters index arrays to track what has already been processed
     * @return MapModel[]
     */
    public function getSessionCharacterMaps() : array {
        $maps = ["maps" => [], "mapIds" => []];
        
        // get all characters in session and iterate over them
        foreach($this->getAll(array_column($this->getF3()->get(User::SESSION_KEY_CHARACTERS), 'ID')) as $character){            
            if($alliance = $character->getAlliance()){
                foreach($alliance->getMaps() as $map){
                    if(!in_array($map->_id, $maps["mapIds"])){
                        array_push($maps["maps"], $map);
                        array_push($maps["mapIds"], $map->id);
                    }
                }
            }

            if($corporation = $character->getCorporation()){
                foreach($corporation->getMaps() as $map){
                    if(!in_array($map->_id, $maps["mapIds"])){
                        array_push($maps["maps"], $map);
                        array_push($maps["mapIds"], $map->id);
                    }
                }
            }

            if(is_object($character->characterMaps)){
                $mapCountPrivate = 0;
                foreach($character->characterMaps as $characterMap){
                    if(
                        $mapCountPrivate < Config::getMapsDefaultConfig('private')['max_count'] &&
                        $characterMap->mapId->isActive()
                    ){
                        array_push($maps["maps"], $characterMap->mapId);
                        $mapCountPrivate++;
                    }
                }
            }
        }

        return $maps["maps"];
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
        if($deleteCookie){
            $this->deleteAuthentications();
        }
    }

    /**
     * @see parent
     */
    public function filterRel() : void {
        $this->filter('userCharacter', self::getFilter('active', true));
        $this->filter('corporationId', self::getFilter('active', true));
        $this->filter('allianceId', self::getFilter('active', true));
        $this->filter('characterMaps', self::getFilter('active', true), ['order' => 'created']);
    }

    /**
     * merges two multidimensional characterSession arrays by checking characterID
     * @param array $characterDataBase
     * @return array
     */
    public static function mergeSessionCharacterData(array $characterDataBase = []) : array {
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