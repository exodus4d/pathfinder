<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 20:23
 */

namespace Controller\Api;
use Controller;
use lib\Config;
use Model;

/**
 * Map controller
 * Class Map
 * @package Controller\Api
 */
class Map extends Controller\AccessController {

    // cache keys
    const CACHE_KEY_MAP_DATA                        = 'CACHED.MAP_DATA.%s';
    const CACHE_KEY_USER_DATA                       = 'CACHED.USER_DATA.%s_%s';

    /**
     * event handler
     * @param \Base $f3
     */
    function beforeroute(\Base $f3) {
        // set header for all routes
        header('Content-type: application/json');
        parent::beforeroute($f3);
    }

    /**
     * get map data cache key
     * @param Model\CharacterModel $character
     * @return string
     */
    protected function getMapDataCacheKey(Model\CharacterModel $character){
        return sprintf(self::CACHE_KEY_MAP_DATA, 'CHAR_' . $character->_id);
    }

    /**
     * clear map data caching
     * -> cache timings are short, this will just increase update performance on map changes
     * @param Model\CharacterModel $character
     */
    protected function clearMapDataCache(Model\CharacterModel $character){
        $cacheKey = $this->getMapDataCacheKey($character);
        if($this->getF3()->exists($cacheKey)){
            $this->getF3()->clear($cacheKey);
        }
    }

    /**
     * get user data cache key
     * @param int $mapId
     * @param int $systemId
     * @return string
     */
    protected function getUserDataCacheKey($mapId, $systemId = 0){
        return sprintf(self::CACHE_KEY_USER_DATA, 'MAP_' . $mapId, 'SYS_' . $systemId);
    }

    /**
     * Get all required static config data for program initialization
     * @param \Base $f3
     */
    public function init(\Base $f3){

        // expire time in seconds
        $expireTimeHead =  60 * 60 * 12;
        $expireTimeSQL = 60 * 60 * 12;

        $f3->expire($expireTimeHead);

        $return = (object) [];
        $return->error = [];

        // static program data ----------------------------------------------------------------------------------------
        $return->timer = $f3->get('PATHFINDER.TIMER');

        // get all available map types --------------------------------------------------------------------------------
        $mapType = Model\BasicModel::getNew('MapTypeModel');
        $rows = $mapType->find('active = 1', null, $expireTimeSQL);

        $mapTypeData = [];
        foreach((array)$rows as $rowData){
            $data = [
                'id' => $rowData->id,
                'label' => $rowData->label,
                'class' => $rowData->class,
                'classTab' => $rowData->classTab
            ];
            $mapTypeData[$rowData->name] = $data;

        }
        $return->mapTypes = $mapTypeData;

        // get all available map scopes -------------------------------------------------------------------------------
        $mapScope = Model\BasicModel::getNew('MapScopeModel');
        $rows = $mapScope->find('active = 1', null, $expireTimeSQL);
        $mapScopeData = [];
        foreach((array)$rows as $rowData){
            $data = [
                'id' => $rowData->id,
                'label' => $rowData->label
            ];
            $mapScopeData[$rowData->name] = $data;
        }
        $return->mapScopes = $mapScopeData;

        // get all available system status ----------------------------------------------------------------------------
        $systemStatus = Model\BasicModel::getNew('SystemStatusModel');
        $rows = $systemStatus->find('active = 1', null, $expireTimeSQL);
        $systemScopeData = [];
        foreach((array)$rows as $rowData){
            $data = [
                'id' => $rowData->id,
                'label' => $rowData->label,
                'class' => $rowData->class
            ];
            $systemScopeData[$rowData->name] = $data;
        }
        $return->systemStatus = $systemScopeData;

        // get all available system types -----------------------------------------------------------------------------
        $systemType = Model\BasicModel::getNew('SystemTypeModel');
        $rows = $systemType->find('active = 1', null, $expireTimeSQL);
        $systemTypeData = [];
        foreach((array)$rows as $rowData){
            $data = [
                'id' => $rowData->id,
                'name' => $rowData->name
            ];
            $systemTypeData[$rowData->name] = $data;
        }
        $return->systemType = $systemTypeData;

        // get available connection scopes ----------------------------------------------------------------------------
        $connectionScope = Model\BasicModel::getNew('ConnectionScopeModel');
        $rows = $connectionScope->find('active = 1', null, $expireTimeSQL);
        $connectionScopeData = [];
        foreach((array)$rows as $rowData){
            $data = [
                'id' => $rowData->id,
                'label' => $rowData->label,
                'connectorDefinition' => $rowData->connectorDefinition
            ];
            $connectionScopeData[$rowData->name] = $data;
        }
        $return->connectionScopes = $connectionScopeData;

        // get available character status -----------------------------------------------------------------------------
        $characterStatus = Model\BasicModel::getNew('CharacterStatusModel');
        $rows = $characterStatus->find('active = 1', null, $expireTimeSQL);
        $characterStatusData = [];
        foreach((array)$rows as $rowData){
            $data = [
                'id' => $rowData->id,
                'name' => $rowData->name,
                'class' => $rowData->class
            ];
            $characterStatusData[$rowData->name] = $data;
        }
        $return->characterStatus = $characterStatusData;

        // get max number of shared entities per map ------------------------------------------------------------------
        $maxSharedCount = [
            'character' => $f3->get('PATHFINDER.MAP.PRIVATE.MAX_SHARED'),
            'corporation' => $f3->get('PATHFINDER.MAP.CORPORATION.MAX_SHARED'),
            'alliance' => $f3->get('PATHFINDER.MAP.ALLIANCE.MAX_SHARED'),
        ];
        $return->maxSharedCount = $maxSharedCount;

        // get activity log options per map ---------------------------------------------------------------------------
        $activityLogging = [
            'character' => $f3->get('PATHFINDER.MAP.PRIVATE.ACTIVITY_LOGGING'),
            'corporation' => $f3->get('PATHFINDER.MAP.CORPORATION.ACTIVITY_LOGGING'),
            'alliance' => $f3->get('PATHFINDER.MAP.ALLIANCE.ACTIVITY_LOGGING'),
        ];
        $return->activityLogging = $activityLogging;

        // get program routes -----------------------------------------------------------------------------------------
        $return->routes = [
            'ssoLogin' => $this->getF3()->alias( 'sso', ['action' => 'requestAuthorization'] )
        ];

        // get notification status ------------------------------------------------------------------------------------
        $return->notificationStatus = [
            'rallySet' => (bool)Config::getNotificationMail('RALLY_SET')
        ];

        // get SSO error messages that should be shown immediately ----------------------------------------------------
        // -> e.g. errors while character switch from previous HTTP requests
        if( $f3->exists(Controller\Ccp\Sso::SESSION_KEY_SSO_ERROR) ){
            $ssoError = (object) [];
            $ssoError->type = 'error';
            $ssoError->title = 'Login failed';
            $ssoError->message = $f3->get(Controller\Ccp\Sso::SESSION_KEY_SSO_ERROR);
            $return->error[] = $ssoError;
            $f3->clear(Controller\Ccp\Sso::SESSION_KEY_SSO_ERROR);
        }

        echo json_encode($return);
    }

    /**
     * import new map data
     * @param \Base $f3
     */
    public function import(\Base $f3){
        $importData = (array)$f3->get('POST');

        $return = (object) [];
        $return->error = [];

        if(
            isset($importData['typeId']) &&
            count($importData['mapData']) > 0
        ){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $map Model\MapModel
             */
            $map = Model\BasicModel::getNew('MapModel');

            /**
             * @var $system Model\SystemModel
             */
            $system = Model\BasicModel::getNew('SystemModel');
            $system->setActivityLogging(false);

            /**
             * @var $connection Model\ConnectionModel
             */
            $connection = Model\BasicModel::getNew('ConnectionModel');
            $connection->setActivityLogging(false);

            foreach($importData['mapData'] as $mapData){
                if(
                    isset($mapData['config']) &&
                    isset($mapData['data'])
                ){


                    if(
                        isset($mapData['data']['systems']) &&
                        isset($mapData['data']['connections'])
                    ){
                        if(isset($mapData['config']['id'])){
                            unset($mapData['config']['id']);
                        }

                        $map->setData($mapData['config']);
                        $map->typeId = (int)$importData['typeId'];
                        $map->save();

                        // new system IDs will be generated
                        // therefore we need to temp store a mapping between IDs
                        $tempSystemIdMapping = [];

                        foreach($mapData['data']['systems'] as $systemData){
                            if(isset($systemData['id'])){
                                $oldId = (int)$systemData['id'];
                                unset($systemData['id']);

                                $system->setData($systemData);
                                $system->mapId = $map;
                                $system->createdCharacterId = $activeCharacter;
                                $system->updatedCharacterId = $activeCharacter;
                                $system->save();

                                $tempSystemIdMapping[$oldId] = $system->id;
                                $system->reset();
                            }
                        }

                        foreach($mapData['data']['connections'] as $connectionData){
                            // check if source and target IDs match with new system ID
                            if(
                                isset( $tempSystemIdMapping[$connectionData['source']] ) &&
                                isset( $tempSystemIdMapping[$connectionData['target']] )
                            ){
                                if(isset($connectionData['id'])){
                                    unset($connectionData['id']);
                                }

                                $connection->setData($connectionData);
                                $connection->mapId = $map;
                                $connection->source = $tempSystemIdMapping[$connectionData['source']];
                                $connection->target = $tempSystemIdMapping[$connectionData['target']];
                                $connection->save();

                                $connection->reset();
                            }
                        }

                        // map access info should not automatically imported
                        if($map->isPrivate()){
                            $map->setAccess($activeCharacter);
                        }elseif($map->isCorporation()){
                            if($corporation = $activeCharacter->getCorporation()){
                                $map->setAccess($corporation);
                            }
                        }elseif($map->isAlliance()){
                            if($alliance = $activeCharacter->getAlliance()){
                                $map->setAccess($alliance);
                            }
                        }

                    }else{
                        // systems || connections missing
                        $missingConfigError = (object) [];
                        $missingConfigError->type = 'error';
                        $missingConfigError->message = 'Map data not valid (systems || connections) missing';
                        $return->error[] = $missingConfigError;
                    }

                }else{
                    // map config || systems/connections missing
                    $missingConfigError = (object) [];
                    $missingConfigError->type = 'error';
                    $missingConfigError->message = 'Map data not valid (config || data) missing';
                    $return->error[] = $missingConfigError;
                }


                $map->reset();
            }
        }else{
            // map data missing
            $missingDataError = (object) [];
            $missingDataError->type = 'error';
            $missingDataError->message = 'Map data missing';
            $return->error[] = $missingDataError;
        }


        echo json_encode($return);
    }

    /**
     * save a new map or update an existing map
     * @param \Base $f3
     */
    public function save(\Base $f3){
        $formData = (array)$f3->get('POST.formData');

        $return = (object) [];
        $return->error = [];

        if( isset($formData['id']) ){
            $activeCharacter = $this->getCharacter(0);

            /**
             * @var $map Model\MapModel
             */
            $map = Model\BasicModel::getNew('MapModel');
            $map->getById( (int)$formData['id'] );

            if(
                $map->dry() ||
                $map->hasAccess($activeCharacter)
            ){
                // new map
                $map->setData($formData);
                $map = $map->save();

                // save global map access. Depends on map "type"
                if($map->isPrivate()){

                    // share map between characters -> set access
                    if(isset($formData['mapCharacters'])){
                        // avoid abuse -> respect share limits
                        $accessCharacters = array_slice( $formData['mapCharacters'], 0, $f3->get('PATHFINDER.MAP.PRIVATE.MAX_SHARED') );

                        // clear map access. In case something has removed from access list
                        $map->clearAccess();

                        /**
                         * @var $tempCharacter Model\CharacterModel
                         */
                        $tempCharacter = Model\BasicModel::getNew('CharacterModel');

                        foreach($accessCharacters as $characterId){
                            $tempCharacter->getById( (int)$characterId );

                            if(
                                !$tempCharacter->dry() &&
                                $tempCharacter->shared == 1 // check if map shared is enabled
                            ){
                                $map->setAccess($tempCharacter);
                            }

                            $tempCharacter->reset();
                        }
                    }

                    // the current character itself should always have access
                    // just in case he removed himself :)
                    $map->setAccess($activeCharacter);
                }elseif($map->isCorporation()){
                    $corporation = $activeCharacter->getCorporation();

                    if($corporation){
                        // the current user has to have a corporation when
                        // working on corporation maps!

                        // share map between corporations -> set access
                        if(isset($formData['mapCorporations'])){
                            // avoid abuse -> respect share limits
                            $accessCorporations = array_slice( $formData['mapCorporations'], 0, $f3->get('PATHFINDER.MAP.CORPORATION.MAX_SHARED') );

                            // clear map access. In case something has removed from access list
                            $map->clearAccess();

                            /**
                             * @var $tempCorporation Model\CorporationModel
                             */
                            $tempCorporation = Model\BasicModel::getNew('CorporationModel');

                            foreach($accessCorporations as $corporationId){
                                $tempCorporation->getById( (int)$corporationId );

                                if(
                                    !$tempCorporation->dry() &&
                                    $tempCorporation->shared == 1 // check if map shared is enabled
                                ){
                                    $map->setAccess($tempCorporation);
                                }

                                $tempCorporation->reset();
                            }
                        }

                        // the corporation of the current user should always have access
                        $map->setAccess($corporation);
                    }
                }elseif($map->isAlliance()){
                    $alliance = $activeCharacter->getAlliance();

                    if($alliance){
                        // the current user has to have a alliance when
                        // working on alliance maps!

                        // share map between alliances -> set access
                        if(isset($formData['mapAlliances'])){
                            // avoid abuse -> respect share limits
                            $accessAlliances = array_slice( $formData['mapAlliances'], 0, $f3->get('PATHFINDER.MAP.ALLIANCE.MAX_SHARED') );

                            // clear map access. In case something has removed from access list
                            $map->clearAccess();

                            /**
                             * @var $tempAlliance Model\AllianceModel
                             */
                            $tempAlliance = Model\BasicModel::getNew('AllianceModel');

                            foreach($accessAlliances as $allianceId){
                                $tempAlliance->getById( (int)$allianceId );

                                if(
                                    !$tempAlliance->dry() &&
                                    $tempAlliance->shared == 1 // check if map shared is enabled
                                ){
                                    $map->setAccess($tempAlliance);
                                }

                                $tempAlliance->reset();
                            }

                        }

                        // the alliance of the current user should always have access
                        $map->setAccess($alliance);
                    }
                }
                // reload the same map model (refresh)
                // this makes sure all data is up2date
                $map->getById( $map->id, 0 );

                $return->mapData = $map->getData();
            }else{
                // map access denied
                $captchaError = (object) [];
                $captchaError->type = 'error';
                $captchaError->message = 'Access denied';
                $return->error[] = $captchaError;
            }
        }else{
            // map id field missing
            $idError = (object) [];
            $idError->type = 'error';
            $idError->message = 'Map id missing';
            $return->error[] = $idError;
        }

        echo json_encode($return);
    }

    /**
     * delete a map and all dependencies
     * @param \Base $f3
     */
    public function delete(\Base $f3){
        $mapData = (array)$f3->get('POST.mapData');
        $activeCharacter = $this->getCharacter();

        /**
         * @var $map Model\MapModel
         */
        $map = Model\BasicModel::getNew('MapModel');
        $map->getById($mapData['id']);
        $map->delete( $activeCharacter );

        echo json_encode([]);
    }

    /**
     * update map data
     * -> function is called continuously (trigger) by any active client
     * @param \Base $f3
     */
    public function updateData(\Base $f3){
        $mapData = (array)$f3->get('POST.mapData');
        $userDataRequired = (bool)$f3->get('POST.getUserData');

        $activeCharacter = $this->getCharacter();

        $return = (object) [];
        $return->error = [];


        $cacheKey = $this->getMapDataCacheKey($activeCharacter);

        // if there is any system/connection change data submitted -> save new data
        if(
            !empty($mapData) ||
            !$f3->exists($cacheKey)
        ){
            // get current map data ===============================================================================
            $maps = $activeCharacter->getMaps();

            // loop all submitted map data that should be saved
            // -> currently there will only be ONE map data change submitted -> single loop
            foreach($mapData as $data){

                $systems = [];
                $connections = [];

                // check whether system data and/or connection data is send
                // empty arrays are not included in ajax requests
                if(  isset($data['data']['systems']) ){
                    $systems = (array)$data['data']['systems'];
                }

                if( isset($data['data']['connections']) ){
                    $connections = (array)$data['data']['connections'];
                }

                // check if system data or connection data is send
                if(
                    count($systems) > 0 ||
                    count($connections) > 0
                ){

                    // map changes expected =======================================================================

                    // loop current user maps and check for changes
                    foreach($maps as $map){

                        // update system data ---------------------------------------------------------------------
                        foreach($systems as $i => $systemData){

                            // check if current system belongs to the current map
                            $map->filter('systems', ['id = ?', $systemData['id'] ]);
                            $filteredMap = $map->find(
                                ['id = ?', $map->id ],
                                ['limit' => 1]
                            );

                            // this should never fail
                            if(is_object($filteredMap)){
                                $filteredMap = $filteredMap->current();

                                // system belongs to the current map
                                if(is_object($filteredMap->systems)){
                                    // update
                                    unset($systemData['updated']);

                                    /**
                                     * @var $system Model\SystemModel
                                     */
                                    $system = $filteredMap->systems->current();
                                    $system->setData($systemData);
                                    $system->updatedCharacterId = $activeCharacter;
                                    $system->save();

                                    // a system belongs to ONE  map -> speed up for multiple maps
                                    unset($systemData[$i]);
                                }
                            }
                        }

                        // update connection data -----------------------------------------------------------------
                        foreach($connections as $i => $connectionData){

                            // check if the current connection belongs to the current map
                            $map->filter('connections', ['id = ?', $connectionData['id'] ]);
                            $filteredMap = $map->find(
                                ['id = ?', $map->id ],
                                ['limit' => 1]
                            );

                            // this should never fail
                            if(is_object($filteredMap)){
                                $filteredMap = $filteredMap->current();

                                // connection belongs to the current map
                                if(is_object($filteredMap->connections)){
                                    // update
                                    unset($connectionData['updated']);

                                    /**
                                     * @var $connection Model\ConnectionModel
                                     */
                                    $connection = $filteredMap->connections->current();
                                    $connection->setData($connectionData);
                                    $connection->save();

                                    // a connection belongs to ONE  map -> speed up for multiple maps
                                    unset($connectionData[$i]);
                                }
                            }
                        }
                    }
                }
            }

            // format map Data for return
            $return->mapData = self::getFormattedMapData($maps);

            // cache time(s) per user should be equal or less than this function is called
            // prevent request flooding
            $responseTTL = (int)$f3->get('PATHFINDER.TIMER.UPDATE_SERVER_MAP.DELAY') / 1000;

            $f3->set($cacheKey, $return, $responseTTL);
        }else{
            // get from cache
            $return = $f3->get($cacheKey);
        }

        // if userData is requested -> add it as well
        // -> Only first trigger call should request this data!
        if($userDataRequired){
            $return->userData = $activeCharacter->getUser()->getData();
        }

        echo json_encode( $return );
    }

    /**
     * get formatted map data
     * @param $mapModels
     * @return array
     */
    public static function getFormattedMapData($mapModels){
        $mapData = [];
        foreach($mapModels as &$mapModel){
            /**
             * @var $mapModel Model\MapModel
             */
            $allMapData = $mapModel->getData();
            $mapData[] = [
                'config' => $allMapData->mapData,
                'data' => [
                    'systems' => $allMapData->systems,
                    'connections' => $allMapData->connections,
                ]
            ];
        }

        return $mapData;
    }

    /**
     * update map data api
     * -> function is called continuously by any active client
     * @param \Base $f3
     */
    public function updateUserData(\Base $f3){
        $return = (object) [];
        $return->error = [];

        $activeCharacter = $this->getCharacter(0);

        $postData = $f3->get('POST');
        if( !empty($mapIds = (array)$postData['mapIds']) ){
            // IMPORTANT for now -> just update a single map (save performance)
            $mapId = (int)reset($mapIds);
            // get map and check map access
            $map = $activeCharacter->getMap( (int)$mapId);

            if( !is_null($map) ){
                $characterMapData = (array)$postData['characterMapData'];

                // check if data for specific system is requested
                $systemData = (array)$postData['systemData'];
                // if data is requested extend the cache key in order to get new data
                $requestSystemData = (object) [];
                $requestSystemData->mapId = isset($systemData['mapId']) ? (int) $systemData['mapId'] : 0;
                $requestSystemData->systemId = isset($systemData['systemData']['id']) ? (int) $systemData['systemData']['id'] : 0;

                // update current location
                // -> suppress temporary timeout errors
                $activeCharacter = $activeCharacter->updateLog(['suppressHTTPErrors' => true]);

                // check character log (current system) and manipulate map (e.g. add new system)
                if( (bool)$characterMapData['mapTracking'] ){
                    $map = $this->updateMapData($activeCharacter, $map);
                }

                $cacheKey = $this->getUserDataCacheKey($mapId, $requestSystemData->systemId);
                if( !$f3->exists($cacheKey) ){
                    $return->mapUserData[] = $map->getUserData();

                    // request signature data for a system if user has map access!
                    if( $mapId === $requestSystemData->mapId ){
                        $system = $map->getSystemById( $requestSystemData->systemId );

                        if( !is_null($system) ){
                            // data for currently selected system
                            $return->system = $system->getData();
                            $return->system->signatures = $system->getSignaturesData();
                        }
                    }

                    // cache time (seconds) should be equal or less than request trigger time
                    // prevent request flooding
                    $responseTTL = (int)$f3->get('PATHFINDER.TIMER.UPDATE_SERVER_USER_DATA.DELAY') / 1000;

                    // cache response
                    $f3->set($cacheKey, $return, $responseTTL);
                }else{
                    // get from cache
                    // this should happen if a user has multiple program instances running
                    // with the same main char
                    $return = $f3->get($cacheKey);
                }
            }
        }

        // get current user data -> this should not be cached because each user has different personal data
        // even if they have multiple characters using the same map!
        $return->userData = $activeCharacter->getUser()->getData();

        echo json_encode( $return );
    }


    /**
     *
     * @param Model\CharacterModel $character
     * @param Model\MapModel $map
     * @return Model\MapModel
     */
    protected function updateMapData(Model\CharacterModel $character, Model\MapModel $map){

        // update "map data" cache in case of map (system/connection) changes
        $clearMapDataCache = false;

        if(
            ( $mapScope = $map->getScope() ) &&
            ( $mapScope->name != 'none' ) && // tracking is disabled for map
            ( $log = $character->getLog() )
        ){
            // character is currently in a system

            $sameSystem = false;
            $sourceExists = true;
            $targetExists = true;

            // system coordinates
            $systemOffsetX = 130;
            $systemOffsetY = 0;
            $systemPosX = 0;
            $systemPosY = 30;

            $sessionCharacter = $this->getSessionCharacterData();
            $sourceSystemId = (int)$sessionCharacter['PREV_SYSTEM_ID'];
            $targetSystemId = (int)$log->systemId;

            if($sourceSystemId){
                $sourceSystem = null;
                $targetSystem = null;

                // check if source and target systems are equal
                // -> NO target system available
                if($sourceSystemId === $targetSystemId){
                    // check if previous (solo) system is already on the map
                    $sourceSystem = $map->getSystemByCCPId($sourceSystemId, ['active' => 1]);
                    $sameSystem = true;
                }else{
                    // check if previous (source) system is already on the map
                    $sourceSystem = $map->getSystemByCCPId($sourceSystemId, ['active' => 1]);

                    // -> check if system is already on this map
                    $targetSystem = $map->getSystemByCCPId( $targetSystemId, ['active' => 1]);
                }

                // if systems don´t already exists on map -> get "blank" systems
                // -> required for system type check (e.g. wormhole, k-space)
                if(
                    !$sourceSystem &&
                    $sourceSystemId
                ){
                    $sourceExists = false;
                    $sourceSystem = $map->getNewSystem($sourceSystemId);
                }else{
                    // system exists -> add target to the "right"
                    $systemPosX = $sourceSystem->posX + $systemOffsetX;
                    $systemPosY = $sourceSystem->posY + $systemOffsetY;
                }

                if(
                    !$sameSystem &&
                    !$targetSystem
                ){
                    $targetExists = false;
                    $targetSystem = $map->getNewSystem($targetSystemId);
                }

                $addSourceSystem = false;
                $addTargetSystem = false;
                $addConnection = false;

                switch($mapScope->name){
                    case 'all':
                        if($sameSystem){
                            $addSourceSystem = true;
                        }else{
                            $addSourceSystem = true;
                            $addTargetSystem = true;
                            $addConnection = true;
                        }
                        break;
                    case 'k-space':
                        if($sameSystem){
                            if( !$sourceSystem->isWormhole() ){
                                $addSourceSystem = true;
                            }
                        }elseif(
                            !$sourceSystem->isWormhole() ||
                            !$targetSystem->isWormhole()
                        ){
                            $addSourceSystem = true;
                            $addTargetSystem = true;
                            $addConnection = true;
                        }
                        break;
                    case 'wh':
                    default:
                        if($sameSystem){
                            if( $sourceSystem->isWormhole() ){
                                $addSourceSystem = true;
                            }
                        }elseif(
                            $sourceSystem->isWormhole() ||
                            $targetSystem->isWormhole()
                        ){
                            $addSourceSystem = true;
                            $addTargetSystem = true;
                            $addConnection = true;
                        }elseif(
                            !$sourceSystem->isWormhole() &&
                            !$targetSystem->isWormhole()
                        ){
                            // check distance between systems (in jumps)
                            // -> if > 1 it is !very likely! a wormhole
                            $routeController = new Route();
                            $routeController->initJumpData();
                            $route = $routeController->findRoute($sourceSystem->name, $targetSystem->name, 1);

                            if( !$route['routePossible'] ){
                                $addSourceSystem = true;
                                $addTargetSystem = true;
                                $addConnection = true;
                            }
                        }
                        break;
                }

                // save source system -------------------------------------------------------------------------------------
                if(
                    $addSourceSystem &&
                    $sourceSystem &&
                    !$sourceExists
                ){
                    $sourceSystem = $map->saveSystem($sourceSystem, $systemPosX, $systemPosY, $character);
                    // get updated maps object
                    if($sourceSystem){
                        $map = $sourceSystem->mapId;
                        $sourceExists = true;
                        $clearMapDataCache = true;
                        // increase system position (prevent overlapping)
                        $systemPosX = $sourceSystem->posX + $systemOffsetX;
                        $systemPosY = $sourceSystem->posY + $systemOffsetY;
                    }
                }

                // save target system -------------------------------------------------------------------------------------
                if(
                    $addTargetSystem &&
                    $targetSystem &&
                    !$targetExists
                ){
                    $targetSystem = $map->saveSystem($targetSystem, $systemPosX, $systemPosY, $character);
                    // get updated maps object
                    if($targetSystem){
                        $map = $targetSystem->mapId;
                        $clearMapDataCache = true;
                        $targetExists = true;
                    }
                }

                // save connection ----------------------------------------------------------------------------------------
                if(
                    $addConnection &&
                    $sourceExists &&
                    $targetExists &&
                    $sourceSystem &&
                    $targetSystem &&
                    !$map->searchConnection( $sourceSystem, $targetSystem )
                ){
                    $connection = $map->getNewConnection($sourceSystem, $targetSystem);
                    $connection = $map->saveConnection($connection);
                    // get updated maps object
                    if($connection){
                        $map = $connection->mapId;
                        $clearMapDataCache = true;
                    }
                }
            }
        }

        if($clearMapDataCache){
            $this->clearMapDataCache($character);
        }

        return $map;
    }

}













