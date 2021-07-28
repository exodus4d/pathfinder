<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 20:23
 */

namespace Exodus4D\Pathfinder\Controller\Api;

use Exodus4D\Pathfinder\Lib\Config;
use Exodus4D\Pathfinder\Controller;
use Exodus4D\Pathfinder\Data\File\FileHandler;
use Exodus4D\Pathfinder\Model\AbstractModel;
use Exodus4D\Pathfinder\Model\Pathfinder;
use Exodus4D\Pathfinder\Model\Universe;

/**
 * Map controller
 * Class Map
 * @package Controller\Api
 */
class Map extends Controller\AccessController {

    // cache keys
    const CACHE_KEY_INIT                            = 'CACHED_INIT';
    const CACHE_KEY_USER_DATA                       = 'CACHED.USER_DATA.%s';
    const CACHE_KEY_HISTORY                         = 'CACHED_MAP_HISTORY_%s';

    /**
     * get user data cache key
     * @param int $mapId
     * @return string
     */
    protected function getUserDataCacheKey(int $mapId): string {
        return sprintf(self::CACHE_KEY_USER_DATA, 'MAP_' . $mapId);
    }

    /**
     * get log history data cache key
     * @param int $mapId
     * @return string
     */
    protected function getHistoryDataCacheKey(int $mapId): string {
        return sprintf(self::CACHE_KEY_HISTORY, 'MAP_' . $mapId);
    }

    /**
     * Get all required static config data for program initialization
     * @param \Base $f3
     * @throws \Exception
     */
    public function initData(\Base $f3){
        $validInitData = true;
        $ttl = 60 * 60;

        if(!$exists = $f3->exists(self::CACHE_KEY_INIT, $return)){
            $return = (object) [];
            $return->error = [];

            // static program data ------------------------------------------------------------------------------------
            $return->timer = Config::getPathfinderData('timer');

            // get all available map types ----------------------------------------------------------------------------
            $mapType = Pathfinder\AbstractPathfinderModel::getNew('MapTypeModel');
            $rows = $mapType->find('active = 1');

            // default map type config
            $mapsDefaultConfig = Config::getMapsDefaultConfig();
            $mapTypeData = [];
            foreach((array)$rows as $rowData){
                $data = [
                    'id' => $rowData->id,
                    'label' => $rowData->label,
                    'class' => $rowData->class,
                    'classTab' => $rowData->classTab,
                    'defaultConfig' => $mapsDefaultConfig[$rowData->name]
                ];
                $mapTypeData[$rowData->name] = $data;
            }
            $return->mapTypes = $mapTypeData;

            $validInitData = $validInitData ? !empty($mapTypeData) : $validInitData;

            // get all available map scopes ---------------------------------------------------------------------------
            $mapScope = Pathfinder\AbstractPathfinderModel::getNew('MapScopeModel');
            $rows = $mapScope->find('active = 1');
            $mapScopeData = [];
            foreach((array)$rows as $rowData){
                $data = [
                    'id' => $rowData->id,
                    'label' => $rowData->label
                ];
                $mapScopeData[$rowData->name] = $data;
            }
            $return->mapScopes = $mapScopeData;

            $validInitData = $validInitData ? !empty($mapScopeData) : $validInitData;

            // get all available system status ------------------------------------------------------------------------
            $systemStatus = Pathfinder\AbstractPathfinderModel::getNew('SystemStatusModel');
            $rows = $systemStatus->find('active = 1');
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

            $validInitData = $validInitData ? !empty($systemScopeData) : $validInitData;

            // get all available system types -------------------------------------------------------------------------
            $systemType = Pathfinder\AbstractPathfinderModel::getNew('SystemTypeModel');
            $rows = $systemType->find('active = 1');
            $systemTypeData = [];
            foreach((array)$rows as $rowData){
                $data = [
                    'id' => $rowData->id,
                    'name' => $rowData->name
                ];
                $systemTypeData[$rowData->name] = $data;
            }
            $return->systemType = $systemTypeData;

            $validInitData = $validInitData ? !empty($systemTypeData) : $validInitData;

            // get available connection scopes ------------------------------------------------------------------------
            $connectionScope = Pathfinder\AbstractPathfinderModel::getNew('ConnectionScopeModel');
            $rows = $connectionScope->find('active = 1');
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

            $validInitData = $validInitData ? !empty($connectionScopeData) : $validInitData;

            // get available character status -------------------------------------------------------------------------
            $characterStatus = Pathfinder\AbstractPathfinderModel::getNew('CharacterStatusModel');
            $rows = $characterStatus->find('active = 1');
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

            $validInitData = $validInitData ? !empty($characterStatusData) : $validInitData;

            // route search config ------------------------------------------------------------------------------------
            $return->routeSearch = [
                'defaultCount'          => Config::getPathfinderData('route.search_default_count'),
                'maxDefaultCount'       => Config::getPathfinderData('route.max_default_count'),
                'limit'                 => Config::getPathfinderData('route.limit')
            ];

            // get program routes -------------------------------------------------------------------------------------
            $return->routes = [
                'ssoLogin' => $this->getF3()->alias('sso', ['action' => 'requestAuthorization'])
            ];

            // get third party APIs -----------------------------------------------------------------------------------
            $return->url = [
                'ccpImageServer'        => Config::getPathfinderData('api.ccp_image_server'),
                'zKillboard'            => Config::getPathfinderData('api.z_killboard'),
                'eveeye'                => Config::getPathfinderData('api.eveeye'),
                'dotlan'                => Config::getPathfinderData('api.dotlan'),
                'anoik'                 => Config::getPathfinderData('api.anoik'),
                'eveScout'              => Config::getPathfinderData('api.eve_scout')
            ];

            // get Plugin config --------------------------------------------------------------------------------------
            $return->plugin = [
                'modules'               => Config::getPluginConfig('modules')
            ];

            // Character default config -------------------------------------------------------------------------------
            $return->character = [
                'autoLocationSelect'    => (bool)Config::getPathfinderData('character.auto_location_select')
            ];

            // Slack integration status -------------------------------------------------------------------------------
            $return->slack = [
                'status'                => (bool)Config::getPathfinderData('slack.status')
            ];

            // Slack integration status -------------------------------------------------------------------------------
            $return->discord = [
                'status'                => (bool)Config::getPathfinderData('discord.status')
            ];

            // structure status ---------------------------------------------------------------------------------------
            $structureStatus = Pathfinder\StructureStatusModel::getAll();
            $structureStatusData = [];
            foreach($structureStatus as $status){
                $structureStatusData[$status->_id] = $status->getData();
            }
            $return->structureStatus = $structureStatusData;

            $validInitData = $validInitData ? !empty($structureStatusData) : $validInitData;

            // get available wormhole types ---------------------------------------------------------------------------
            /**
             * @var $groupUniverseModel Universe\GroupModel
             */
            $groupUniverseModel = Universe\AbstractUniverseModel::getNew('GroupModel');
            $groupUniverseModel->getById(Config::ESI_GROUP_WORMHOLE_ID);
            $wormholesData = [];
            /**
             * @var $typeModel Universe\TypeModel
             */
            foreach($types = $groupUniverseModel->getTypes(false) as $typeModel){
                if(
                    ($wormholeData = $typeModel->getWormholeData()) &&
                    mb_strlen((string)$wormholeData->name) === 4
                ){
                    $wormholesData[$wormholeData->name] = $wormholeData;
                }
            }
            ksort($wormholesData);
            $return->wormholes = $wormholesData;

            $validInitData = $validInitData ? !empty($wormholesData) : $validInitData;

            // universe category data ---------------------------------------------------------------------------------
            /**
             * @var $categoryUniverseModel Universe\CategoryModel
             */
            $categoryUniverseModel = Universe\AbstractUniverseModel::getNew('CategoryModel');
            $return->universeCategories = [
                Config::ESI_CATEGORY_SHIP_ID  =>
                    ($categoryUniverseModel->getById(Config::ESI_CATEGORY_SHIP_ID) && $categoryUniverseModel->valid()) ? $categoryUniverseModel->getData(['mass']) : null,
                Config::ESI_CATEGORY_STRUCTURE_ID =>
                    ($categoryUniverseModel->getById(Config::ESI_CATEGORY_STRUCTURE_ID) && $categoryUniverseModel->valid()) ? $categoryUniverseModel->getData() : null,
            ];

            $validInitData = $validInitData ? !count(array_filter($return->universeCategories, function($v){
                return empty(array_filter((array)$v->groups));
            })) : $validInitData;

            // response should not be cached if invalid -> e.g. missing static data
            if($validInitData){
                $f3->set(self::CACHE_KEY_INIT, $return, $ttl);
            }
        }

        // get SSO error messages that should be shown immediately ----------------------------------------------------
        // -> e.g. errors while character switch from previous HTTP requests
        if($f3->exists(Controller\Ccp\Sso::SESSION_KEY_SSO_ERROR, $text)){
            $ssoError = (object) [];
            $ssoError->type = 'error';
            $ssoError->title = 'Login failed';
            $ssoError->text = $text;
            $return->error[] = $ssoError;
            $f3->clear(Controller\Ccp\Sso::SESSION_KEY_SSO_ERROR);
        }elseif($validInitData){
            // no errors and valid data -> send Cache header
            $f3->expire(Config::ttlLeft($exists, $ttl));
        }

        echo json_encode($return);
    }

    /**
     * import new map data
     * @param \Base $f3
     * @throws \Exception
     */
    public function import(\Base $f3){
        $importData = (array)$f3->get('POST');

        $return = (object) [];
        $return->error = [];
        $return->warning = [];

        if(
            isset($importData['typeId']) &&
            count($importData['mapData']) > 0
        ){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $map Pathfinder\MapModel
             */
            $map = Pathfinder\AbstractPathfinderModel::getNew('MapModel');

            /**
             * @var $mapType Pathfinder\MapTypeModel
             */
            $mapType = Pathfinder\AbstractPathfinderModel::getNew('MapTypeModel');
            $mapType->getById((int)$importData['typeId']);

            if( !$mapType->dry() ){
                $defaultConfig = Config::getMapsDefaultConfig($mapType->name);

                foreach($importData['mapData'] as $mapData){
                    if(
                        isset($mapData['config']) &&
                        isset($mapData['data'])
                    ){
                        $mapDataConfig = (array)$mapData['config'];
                        $mapDataData = (array)$mapData['data'];

                        /**
                         * @var $mapScope Pathfinder\MapScopeModel
                         */
                        $mapScope = Pathfinder\AbstractPathfinderModel::getNew('MapScopeModel');
                        $mapScope->getById((int)$mapDataConfig['scope']['id']);

                        if( !$mapScope->dry() ){
                            if(
                                isset($mapDataData['systems']) &&
                                isset($mapDataData['connections'])
                            ){
                                $mapDataSystems = (array)$mapDataData['systems'];
                                $mapDataConnections = (array)$mapDataData['connections'];
                                $systemCount = count($mapDataSystems);
                                if($systemCount <= $defaultConfig['max_systems']){

                                    $map->copyfrom($mapDataConfig, ['name', 'icon', 'position', 'locked', 'rallyUpdated', 'rallyPoke']);
                                    $map->typeId = $mapType;
                                    $map->scopeId = $mapScope;
                                    $map->save($activeCharacter);

                                    // new system IDs will be generated
                                    // therefore we need to temp store a mapping between IDs
                                    $tempSystemIdMapping = [];

                                    foreach($mapDataSystems as $systemData){
                                        if(
                                            ($oldId = (int)$systemData['id']) &&
                                            ($systemId = (int)$systemData['systemId'])
                                        ){
                                            $system = $map->getNewSystem($systemId);
                                            $system->copyfrom($systemData, ['alias', 'status', 'locked', 'rallyUpdated', 'rallyPoke', 'position']);
                                            $system = $map->saveSystem($system, $activeCharacter, $system->posX, $system->posY);

                                            $tempSystemIdMapping[$oldId] = $system->_id;
                                        }
                                    }

                                    /**
                                     * @var $connection Pathfinder\ConnectionModel
                                     */
                                    $connection = Pathfinder\AbstractPathfinderModel::getNew('ConnectionModel');
                                    $connection->setActivityLogging(false);

                                    foreach($mapDataConnections as $connectionData){
                                        // check if source and target IDs match with new system ID
                                        if(
                                            ($sourceSystemId = $tempSystemIdMapping[(int)$connectionData['source']]) &&
                                            ($targetSystemId = $tempSystemIdMapping[(int)$connectionData['target']])
                                        ){
                                            $connection->source = $sourceSystemId;
                                            $connection->target = $targetSystemId;
                                            $connection->copyfrom($connectionData, ['scope', 'type']);
                                            $map->saveConnection($connection, $activeCharacter);

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

                                    // broadcast map Access -> and send map Data
                                    $this->broadcastMapAccess($map);
                                }else{
                                    $maxSystemsError = (object) [];
                                    $maxSystemsError->type = 'error';
                                    $maxSystemsError->text = 'Map has to many systems (' . $systemCount . ').'
                                        .' Max system count is ' . $defaultConfig['max_systems'] . ' for ' . $mapType->name . ' maps.';
                                    $return->error[] = $maxSystemsError;
                                }
                            }else{
                                // systems || connections missing
                                $missingConfigError = (object) [];
                                $missingConfigError->type = 'error';
                                $missingConfigError->text = 'Map data not valid (systems || connections) missing';
                                $return->error[] = $missingConfigError;
                            }
                        }else{
                            $unknownMapScope= (object) [];
                            $unknownMapScope->type = 'error';
                            $unknownMapScope->text = 'Map scope unknown!';
                            $return->error[] = $unknownMapScope;
                        }
                    }else{
                        // map config || systems/connections missing
                        $missingConfigError = (object) [];
                        $missingConfigError->type = 'error';
                        $missingConfigError->text = 'Map data not valid (config || data) missing';
                        $return->error[] = $missingConfigError;
                    }

                    $map->reset();
                }
            }else{
                $unknownMapType = (object) [];
                $unknownMapType->type = 'error';
                $unknownMapType->text = 'Map type unknown!';
                $return->error[] = $unknownMapType;
            }
        }else{
            // map data missing
            $missingDataError = (object) [];
            $missingDataError->type = 'error';
            $missingDataError->text = 'Map data missing';
            $return->error[] = $missingDataError;
        }

        echo json_encode($return);
    }

    /**
     * broadcast characters with map access rights to WebSocket server
     * -> if characters with map access found -> broadcast mapData to them
     * @param Pathfinder\MapModel $map
     * @throws \Exception
     */
    protected function broadcastMapAccess(Pathfinder\MapModel $map){
        $mapAccess =  [
            'id' => $map->_id,
            'name' => $map->name,
            'characterIds' => array_map(function($data){
                return $data->id;
            }, $map->getCharactersData())
        ];

        $this->getF3()->webSocket()->write('mapAccess', $mapAccess);

        // map has (probably) active connections that should receive map Data
        $this->broadcastMap($map, true);
    }

    /**
     * get map access tokens for current character
     * -> send access tokens via TCP Socket for WebSocket auth
     * @param \Base $f3
     * @throws \Exception
     */
    public function getAccessData(\Base $f3){
        $return = (object) [];

        $activeCharacter = $this->getCharacter();
        $characterData = $activeCharacter->getData(true);
        $maps = $activeCharacter->getMaps();

        // some character data is not required (in WebSocket) -> unset() and keep return small
        if(isset($characterData->corporation->rights)){
            unset($characterData->corporation->rights);
        }

        // access token
        $token = bin2hex(random_bytes(16));

        $return->data = [
            'id'            => $activeCharacter->_id,
            'token'         => $token, // character access
            'characterData' => $characterData,
            'mapData'       => []
        ];

        if($maps){
            foreach($maps as $map){
                $return->data['mapData'][] = [
                    'id'    => $map->_id,
                    'token' => $token, // map access
                    'name'  => $map->name
                ];
            }
        }

        // send Access Data to WebSocket Server and get response (status)
        // if 'OK' -> Socket exists
        $status = '';
        $f3->webSocket()
            ->write('mapConnectionAccess', $return->data)
            ->then(
                function($payload) use (&$status) {
                    $status = (string)$payload['load'];
                });

        $return->status = $status;

        echo json_encode($return);
    }

    /**
     * update maps with $mapsData where $character has access to
     * @param Pathfinder\CharacterModel $character
     * @param array $mapsData
     * @return \stdClass
     */
    protected function updateMapsData(Pathfinder\CharacterModel $character, array $mapsData) : \stdClass {
        $return = (object) [];
        $return->error = [];
        $return->mapData = [];

        $mapIdsChanged = [];
        $maps = $character->getMaps();

        if(!empty($mapsData) && !empty($maps)){
            // loop all $mapsData that should be saved
            // -> currently there will only be ONE map data change submitted -> single loop
            foreach($mapsData as $data){
                $systems = [];
                $connections = [];

                // check whether system data and/or connection data is send
                // empty arrays are not included in ajax requests
                if(isset($data['data']['systems'])){
                    $systems = (array)$data['data']['systems'];
                }

                if(isset($data['data']['connections'])){
                    $connections = (array)$data['data']['connections'];
                }

                // check if system data or connection data is send
                if(
                    count($systems) > 0 ||
                    count($connections) > 0
                ){
                    // map changes expected ===========================================================================

                    // loop current user maps and check for changes
                    foreach($maps as $map){
                        // update system data -------------------------------------------------------------------------
                        foreach($systems as $i => $systemData){
                            // check if current system belongs to the current map
                            if($system = $map->getSystemById((int)$systemData['id'])){
                                $system->copyfrom($systemData, ['alias', 'status', 'position', 'locked', 'rallyUpdated', 'rallyPoke']);
                                if($system->save($character)){
                                    if(!in_array($map->_id, $mapIdsChanged)){
                                        $mapIdsChanged[] = $map->_id;
                                    }
                                    // one system belongs to ONE  map -> speed up for multiple maps
                                    unset($systemData[$i]);
                                }else{
                                    $return->error = array_merge($return->error, $system->getErrors());
                                }
                            }
                        }

                        // update connection data ---------------------------------------------------------------------
                        foreach($connections as $i => $connectionData){
                            // check if the current connection belongs to the current map
                            if($connection = $map->getConnectionById((int)$connectionData['id'])){
                                $connection->copyfrom($connectionData, ['scope', 'type', 'endpoints']);
                                if($connection->save($character)){
                                    if(!in_array($map->_id, $mapIdsChanged)){
                                        $mapIdsChanged[] = $map->_id;
                                    }
                                    // one connection belongs to ONE  map -> speed up for multiple maps
                                    unset($connectionData[$i]);
                                }else{
                                    $return->error = array_merge($return->error, $connection->getErrors());
                                }
                            }
                        }
                    }
                }
            }
        }

        foreach($maps as $map){
            // format map Data for return/broadcast
            if($mapData = $this->getFormattedMapData($map)){
                if(in_array($map->_id, $mapIdsChanged)){
                    $this->broadcastMapData($mapData);
                }

                $return->mapData[] = $mapData;
            }
        }

        return $return;
    }

    /**
     * update map data
     * -> function is called continuously (trigger) by any active client
     * @param \Base $f3
     * @throws \Exception
     */
    public function updateData(\Base $f3){
        $postData = (array)$f3->get('POST');
        $mapsData = (array)$postData['mapData'];
        $userDataRequired = (bool)$postData['getUserData'];

        $activeCharacter = $this->getCharacter();

        $return = $this->updateMapsData($activeCharacter, $mapsData);

        // if userData is requested -> add it as well
        // -> Only first trigger call should request this data!
        if($userDataRequired) {
            $return->userData = $activeCharacter->getUser()->getData();
        }

        echo json_encode($return);
    }

    /**
     * onUnload map sync
     * @see https://developer.mozilla.org/docs/Web/API/Navigator/sendBeacon
     * @param \Base $f3
     * @throws \Exception
     */
    public function updateUnloadData(\Base $f3){
        $postData = (array)$f3->get('POST');

        if(!empty($mapsData = (string)$postData['mapData'])){
            $mapsData = (array)json_decode($mapsData, true);
            if(($jsonError = json_last_error()) === JSON_ERROR_NONE){
                $activeCharacter = $this->getCharacter();

                $this->updateMapsData($activeCharacter, $mapsData);
            }
        }
    }

    /**
     * update map data api
     * -> function is called continuously by any active client
     * @param \Base $f3
     * @throws \Exception
     */
    public function updateUserData(\Base $f3){
        $postData = (array)$f3->get('POST');
        $mapIds = (array)$postData['mapIds'];
        $getMapUserData = (bool)$postData['getMapUserData'];
        $mapTracking = (bool)$postData['mapTracking'];
        $systemData = (array)$postData['systemData'];
        $newSystemPositions = (array)$postData['newSystemPositions'];
        $activeCharacter = $this->getCharacter();

        $return = (object)[];

        // update current location
        // -> suppress temporary timeout errors
        $activeCharacter = $activeCharacter->updateLog();

        if( !empty($mapIds) ){
            // IMPORTANT for now -> just update a single map (save performance)
            $mapId = (int)reset($mapIds);
            // get map and check map access
            if( !is_null($map = $activeCharacter->getMap($mapId)) ){
                // check character log (current system) and manipulate map (e.g. add new system)
                if($mapTracking){
                    $map = $this->updateMapByCharacter($map, $activeCharacter, $newSystemPositions);
                }

                // mapUserData ----------------------------------------------------------------------------------------
                if($getMapUserData){
                    $cacheKey = $this->getUserDataCacheKey($mapId);
                    if( !$f3->exists($cacheKey, $mapUserData) ){
                        $mapUserData = $map->getUserData();

                        // cache time (seconds) should be equal or less than request trigger time
                        // prevent request flooding
                        $responseTTL = (int)Config::getPathfinderData('timer.update_server_user_data.delay') / 1000;
                        $f3->set($cacheKey, $mapUserData, $responseTTL);
                    }
                    $return->mapUserData[] = $mapUserData;
                }

                // systemData -----------------------------------------------------------------------------------------
                if(
                    $mapId === (int)$systemData['mapId'] &&
                    !is_null($system = $map->getSystemById((int)$systemData['id']))
                ){
                    // data for currently selected system
                    $return->system = $system->getData();
                    $return->system->signatures = $system->getSignaturesData();
                    $return->system->sigHistory = $system->getSignaturesHistory();
                    $return->system->structures = $system->getStructuresData();
                }
            }
        }

        // get current user data -> this should not be cached because each user has different personal data
        // even if they have multiple characters using the same map!
        $return->userData = $activeCharacter->getUser()->getData();

        // add error (if exists)
        $return->error = [];

        echo json_encode($return);
    }

    /**
     * update map connections/systems based on $character´s location logs
     * @param Pathfinder\MapModel $map
     * @param Pathfinder\CharacterModel $character
     * @param array $newSystemPositions
     * @return Pathfinder\MapModel
     * @throws \Exception
     */
    protected function updateMapByCharacter(Pathfinder\MapModel $map, Pathfinder\CharacterModel $character, array $newSystemPositions = []) : Pathfinder\MapModel {
        // map changed. update cache (system/connection) changed
        $mapDataChanged = false;

        if(
            ( $mapScope = $map->getScope() ) &&
            ( $mapScope->name != 'none' ) && // tracking is disabled for map
            ( $targetLog = $character->getLog() )
        ){
            // character is currently in a system
            $targetSystemId = (int)$targetLog->systemId;

            // get 'character log' from source system. If not log found -> assume $sourceLog == $targetLog
            $sourceLog = $character->getLogPrevSystem($map->_id, $targetSystemId) ? : $targetLog;
            $sourceSystemId = (int)$sourceLog->systemId;

            if($sourceSystemId){
                $defaultPositions = (array)$newSystemPositions['defaults'];
                $currentPosition = (array)$newSystemPositions['location'];

                $sourceSystem = null;
                $targetSystem = null;

                $sourceExists = false;
                $targetExists = false;

                $sameSystem = false;

                // system coordinates for system tha might be added next
                $systemOffsetX = 130;
                $systemOffsetY = 0;
                $systemPosX = ((int)$defaultPositions[0]['x']) ? : 0;
                $systemPosY = ((int)$defaultPositions[0]['y']) ? : 30;

                // check if previous (solo) system is already on the map ----------------------------------------------
                $sourceSystem = $map->getSystemByCCPId($sourceSystemId, [AbstractModel::getFilter('active', true)]);

                // if systems don´t already exists on map -> get "blank" system
                // -> required for system type check (e.g. wormhole, k-space)
                if($sourceSystem){
                    // system exists
                    $sourceExists = true;
                }else{
                    // system not exists -> get"blank" system
                    $sourceSystem = $map->getNewSystem($sourceSystemId);
                }

                // check if source and target systems are equal -------------------------------------------------------
                if($sourceSystemId === $targetSystemId){
                    $sameSystem = true;
                    $targetExists = $sourceExists;
                    $targetSystem = $sourceSystem;
                }elseif($targetSystemId){
                    // check if target system is already on this map
                    $targetSystem = $map->getSystemByCCPId($targetSystemId, [AbstractModel::getFilter('active', true)]);

                    if($targetSystem){
                        $targetExists = true;

                        if($targetSystemId === (int)$currentPosition['systemId']){
                            $systemPosX = (int)$currentPosition['position']['x'];
                            $systemPosY = (int)$currentPosition['position']['y'];
                        }
                    }else{
                        $targetSystem = $map->getNewSystem($targetSystemId);
                    }
                }

                // make sure we have system objects to work with
                // -> in case SDE does not have system they are null -> we can´t do anything
                if(
                    $sourceSystem &&
                    $targetSystem
                ){
                    $addSourceSystem = false;
                    $addTargetSystem = false;
                    $addConnection = false;
                    $route = [];

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
                                if($sourceSystem->isKspace()){
                                    $addSourceSystem = true;
                                }
                            }elseif(
                                $sourceSystem->isKspace() ||
                                $targetSystem->isKspace()
                            ){
                                $addSourceSystem = true;
                                $addTargetSystem = true;
                                $addConnection = true;
                            }
                            break;
                        case 'wh':
                        default:
                            if($sameSystem){
                                if($sourceSystem->isWormhole()){
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
                                $route = (new Controller\Api\Rest\Route())->searchRoute($sourceSystem->systemId, $targetSystem->systemId, 1);

                                if(!$route['routePossible']){
                                    $addSourceSystem = true;
                                    $addTargetSystem = true;
                                    $addConnection = true;
                                }
                            }
                            break;
                    }

                    // check for "abyss" systems =====================================================================
                    if(!$map->trackAbyssalJumps){
                        if(
                            $sourceSystem->isAbyss() ||
                            $targetSystem->isAbyss()
                        ){
                            $addConnection = false;

                            if($sourceSystem->isAbyss()){
                                $addSourceSystem = false;
                            }

                            if($targetSystem->isAbyss()){
                                $addTargetSystem = false;
                            }
                        }
                    }

                    // save source system =============================================================================
                    if(
                        $addSourceSystem &&
                        $sourceSystem &&
                        !$sourceExists
                    ){
                        $sourceSystem = $map->saveSystem($sourceSystem, $character, $systemPosX, $systemPosY);
                        // get updated maps object
                        if($sourceSystem){
                            $map = $sourceSystem->mapId;
                            $sourceExists = true;
                            $mapDataChanged = true;

                            if(!empty($defaultPositions[1])){
                                $systemPosX = (int)$defaultPositions[1]['x'];
                                $systemPosY = (int)$defaultPositions[1]['y'];
                            }else{
                                // increase system position (prevent overlapping)
                                $systemPosX = $sourceSystem->posX + $systemOffsetX;
                                $systemPosY = $sourceSystem->posY + $systemOffsetY;
                            }
                        }
                    }

                    // save target system =============================================================================
                    if(
                        $addTargetSystem &&
                        $targetSystem &&
                        !$targetExists
                    ){
                        $targetSystem = $map->saveSystem($targetSystem, $character, $systemPosX, $systemPosY);
                        // get updated maps object
                        if($targetSystem){
                            $map = $targetSystem->mapId;
                            $mapDataChanged = true;
                            $targetExists = true;
                        }
                    }

                    if(
                        !$sameSystem &&
                        $sourceExists &&
                        $targetExists &&
                        $sourceSystem &&
                        $targetSystem
                    ){
                        $connection = $map->searchConnection($sourceSystem, $targetSystem);

                        // save connection ============================================================================
                        if(
                            $addConnection &&
                            !$connection
                        ){
                            // .. do not add connection if character got "podded" -------------------------------------
                            if(
                                $targetLog->shipTypeId == 670 &&
                                $character->cloneLocationId
                            ){
                                // .. current character location must be clone location
                                if(
                                    (
                                        'station' == $character->cloneLocationType &&
                                        $character->cloneLocationId == $targetLog->stationId
                                    ) || (
                                        'structure' == $character->cloneLocationType &&
                                        $character->cloneLocationId == $targetLog->structureId
                                    )
                                ){
                                    // .. now we need to check jump distance between systems
                                    // -> if > 1 it is !very likely! podded jump
                                    if(empty($route)){
                                        $route = (new Controller\Api\Rest\Route())->searchRoute($sourceSystem->systemId, $targetSystem->systemId, 1);
                                    }

                                    if(!$route['routePossible']){
                                        $addConnection = false;
                                    }
                                }
                            }

                            if($addConnection){
                                $connection = $map->getNewConnection($sourceSystem, $targetSystem);
                                $connection = $map->saveConnection($connection, $character);
                                // get updated maps object
                                if($connection){
                                    $map = $connection->mapId;
                                    $mapDataChanged = true;
                                }
                            }
                        }

                        // log jump mass ==============================================================================
                        if(
                            $connection &&
                            $connection->isWormhole()
                        ){
                            $connection->logMass($targetLog);
                        }
                    }
                }
            }
        }

        if($mapDataChanged){
            $this->broadcastMap($map);
        }

        return $map;
    }

    /**
     * get connectionData
     * @param \Base $f3
     * @throws \Exception
     */
    public function getConnectionData(\Base $f3){
        $postData = (array)$f3->get('POST');

        $addData = (array)$postData['addData'];
        $filterData = (array)$postData['filterData'];
        $connectionData = [];

        if($mapId = (int)$postData['mapId']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $map Pathfinder\MapModel
             */
            $map = Pathfinder\AbstractPathfinderModel::getNew('MapModel');
            $map->getById($mapId);

            if($map->hasAccess($activeCharacter)){
                // get specific connections by id
                $connectionIds = null;
                if(is_array($postData['connectionIds'])){
                    $connectionIds = array_map('intval', $postData['connectionIds']);
                }

                $connections = $map->getConnections($connectionIds, 'wh');
                foreach($connections as $connection){
                    $check = true;
                    $data =  $connection->getData(in_array('signatures', $addData), in_array('logs', $addData));
                    // filter result
                    if(in_array('signatures', $filterData) && !$data->signatures){
                        $check = false;
                    }

                    if(in_array('logs', $filterData) && !$data->logs){
                        $check = false;
                    }

                    if($check){
                        $connectionData[] = $data;
                    }
                }
            }
        }

        echo json_encode($connectionData);
    }

    /**
     * get map log data
     * @param \Base $f3
     * @throws \Exception
     */
    public function getLogData(\Base $f3){
        $postData = (array)$f3->get('POST');
        $return = (object) [];
        $return->data = [];

        // validate query parameters
        $return->query = [
            'mapId'     => (int) $postData['mapId'],
            'offset'    => FileHandler::validateOffset( (int)$postData['offset'] ),
            'limit'     => FileHandler::validateLimit( (int)$postData['limit'] )
        ];

        if($mapId = (int)$postData['mapId']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $map Pathfinder\MapModel
             */
            $map = Pathfinder\AbstractPathfinderModel::getNew('MapModel');
            $map->getById($mapId);

            if($map->hasAccess($activeCharacter)){
                $cacheKey = $this->getHistoryDataCacheKey($mapId);
                if($return->query['offset'] === 0){
                    // check cache
                    $return->data = $f3->get($cacheKey);
                }

                if(empty($return->data)){
                    $return->data = $map->getLogData($return->query['offset'], $return->query['limit']);
                    if(
                        $return->query['offset'] === 0 &&
                        !empty($return->data))
                    {
                        $f3->set($cacheKey, $return->data, (int)Config::getPathfinderData('history.cache'));
                    }
                }
            }
        }

        echo json_encode($return);
    }

}
