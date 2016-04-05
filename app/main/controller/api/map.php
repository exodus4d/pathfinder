<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 20:23
 */

namespace Controller\Api;
use Controller;
use Model;

/**
 * Map controller
 * Class Map
 * @package Controller\Api
 */
class Map extends Controller\AccessController {

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

        // static program data ------------------------------------------------
        $return->timer = $f3->get('PATHFINDER.TIMER');

        // get all available map types ----------------------------------------
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

        // get all available map scopes ---------------------------------------
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

        // get all available system status ------------------------------------
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

        // get all available system types -------------------------------------
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

        // get available connection scopes ------------------------------------
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

        // get available character status -------------------------------------
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

        // get max number of shared entities per map --------------------------
        $maxSharedCount = [
            'character' => $f3->get('PATHFINDER.MAX_SHARED_CHARACTER'),
            'corporation' => $f3->get('PATHFINDER.MAX_SHARED_CORPORATION'),
            'alliance' => $f3->get('PATHFINDER.MAX_SHARED_ALLIANCE'),
        ];
        $return->maxSharedCount = $maxSharedCount;

        // get program routes -------------------------------------------------
        $return->routes = [
            'ssoLogin' => $this->getF3()->alias( 'sso', ['action' => 'requestAuthorization'] )
        ];

        // get SSO error messages that should be shown immediately ------------
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

            if($activeCharacter){
                $user = $activeCharacter->getUser();

                /**
                 * @var $map Model\MapModel
                 */
                $map = Model\BasicModel::getNew('MapModel');

                /**
                 * @var $system Model\SystemModel
                 */
                $system = Model\BasicModel::getNew('SystemModel');

                /**
                 * @var $connection Model\ConnectionModel
                 */
                $connection = Model\BasicModel::getNew('ConnectionModel');

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
                                $map->setAccess($user);
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
                // user not found
                $return->error[] = $this->getLogoutError();
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

            if($activeCharacter){

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
                            $accessCharacters = array_slice( $formData['mapCharacters'], 0, $f3->get('PATHFINDER.MAX_SHARED_CHARACTER') );

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
                                $accessCorporations = array_slice( $formData['mapCorporations'], 0, $f3->get('PATHFINDER.MAX_SHARED_CORPORATION') );

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
                                $accessAlliances = array_slice( $formData['mapAlliances'], 0, $f3->get('PATHFINDER.MAX_SHARED_ALLIANCE') );

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

        if($activeCharacter){
            /**
             * @var $map Model\MapModel
             */
            $map = Model\BasicModel::getNew('MapModel');
            $map->getById($mapData['id']);
            $map->delete( $activeCharacter );
        }

        echo json_encode([]);
    }

    /**
     * update map data
     * -> function is called continuously (trigger) by any active client
     * @param \Base $f3
     */
    public function updateData(\Base $f3){
        $mapData = (array)$f3->get('POST.mapData');

        $activeCharacter = $this->getCharacter();

        $return = (object) [];
        $return->error = [];

        if($activeCharacter){

            $cacheKey = 'user_map_data_' . $activeCharacter->_id;

            // if there is any system/connection change data submitted -> save new data
            if(
                !empty($mapData) ||
                !$f3->exists($cacheKey)
            ){
                // get current map data ========================================================
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

                        // map changes expected =============================================

                        // loop current user maps and check for changes
                        foreach($maps as $map){

                            // update system data -----------------------------------------------
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
                                        $system = $filteredMap->systems->current();
                                        $system->setData($systemData);
                                        $system->updatedCharacterId = $activeCharacter;
                                        $system->save();

                                        // a system belongs to ONE  map -> speed up for multiple maps
                                        unset($systemData[$i]);
                                    }
                                }
                            }

                            // update connection data -------------------------------------------
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

        }else{
            // user logged off
            $return->error[] = $this->getLogoutError();
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

        if($activeCharacter){

            if( !empty($f3->get('POST.mapIds')) ){
                $mapIds = (array)$f3->get('POST.mapIds');
                // check if data for specific system is requested
                $systemData = (array)$f3->get('POST.systemData');
                // update current location
                $activeCharacter = $activeCharacter->updateLog();

                // if data is requested extend the cache key in order to get new data
                $requestSystemData = (object) [];
                $requestSystemData->mapId = isset($systemData['mapId']) ? (int) $systemData['mapId'] : 0;
                $requestSystemData->systemId = isset($systemData['systemData']['id']) ? (int) $systemData['systemData']['id'] : 0;

                // IMPORTANT for now -> just update a single map (save performance)
                $mapIds = array_slice($mapIds, 0, 1);

                // the userMapData is cached per map (this must be changed if multiple maps
                // will be allowed in future...
                $tempId = (int)$mapIds[0];
                $cacheKey = 'user_data_' . $tempId . '_' . $requestSystemData->systemId;
                if( !$f3->exists($cacheKey) ){
                    foreach($mapIds as $mapId){
                        $map = $activeCharacter->getMap($mapId);

                        if( !is_null($map) ){
                            $return->mapUserData[] = $map->getUserData();

                            // request signature data for a system if user has map access!
                            if( $map->id === $requestSystemData->mapId ){
                                $system = $map->getSystem( $requestSystemData->systemId );

                                if( !is_null($system) ){
                                    // data for currently selected system
                                    $return->system = $system->getData();
                                    $return->system->signatures = $system->getSignaturesData();
                                }
                            }
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

            // get current user data -> this should not be cached because each user has different personal data
            // even if they have multiple characters using the same map!
            $return->userData = $activeCharacter->getUser()->getData();
        }else{
            // user logged off
            $return->error[] = $this->getLogoutError();
        }

        echo json_encode( $return );
    }

}













