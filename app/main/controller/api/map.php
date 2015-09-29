<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 20:23
 */

namespace Controller\Api;
use Model;

/**
 * Map controller
 * Class Map
 * @package Controller\Api
 */
class Map extends \Controller\AccessController {

    /**
     * event handler
     * @param $f3
     */
    function beforeroute($f3) {

        // set header for all routes
        header('Content-type: application/json');

        parent::beforeroute($f3);
    }

    /**
     * Get all required static config data for program initialization
     * @param $f3
     */
    public function init($f3){

        // expire time in seconds
        $expireTimeHead =  60 * 60 * 24;
        $expireTimeSQL = 60 * 60 * 24;

        $f3->expire($expireTimeHead);

        $initData = [];

        // static program data ------------------------------------------------
        $initData['timer'] = $f3->get('PATHFINDER.TIMER');

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
        $initData['mapTypes'] = $mapTypeData;

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
        $initData['mapScopes'] = $mapScopeData;

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
        $initData['systemStatus'] = $systemScopeData;

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
        $initData['systemType'] = $systemTypeData;

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
        $initData['connectionScopes'] = $connectionScopeData;

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
        $initData['characterStatus'] = $characterStatusData;

        // get max number of shared entities per map --------------------------
        $maxSharedCount = [
            'user' => $f3->get('PATHFINDER.MAX_SHARED_USER'),
            'corporation' => $f3->get('PATHFINDER.MAX_SHARED_CORPORATION'),
            'alliance' => $f3->get('PATHFINDER.MAX_SHARED_ALLIANCE'),
        ];
        $initData['maxSharedCount'] = $maxSharedCount;

        echo json_encode($initData);
    }

    /**
     * save a new map or update an existing map
     * @param $f3
     */
    public function save($f3){
        $formData = (array)$f3->get('POST.formData');

        $return = (object) [];
        $return->error = [];

        if( isset($formData['id']) ){

            $user = $this->_getUser(0);

            if($user){
                $map = Model\BasicModel::getNew('MapModel');
                $map->getById( (int)$formData['id'] );

                if(
                    $map->dry() ||
                    $map->hasAccess($user)
                ){
                    // new map
                    $map->setData($formData);
                    $map = $map->save();

                    // save global map access. Depends on map "type"
                    if($map->isPrivate()){

                        // share map between users -> set access
                        if(isset($formData['mapUsers'])){
                            // avoid abuse -> respect share limits
                            $accessUsers = array_slice( $formData['mapUsers'], 0, $f3->get('PATHFINDER.MAX_SHARED_USER') );

                            // clear map access. In case something has removed from access list
                            $map->clearAccess();

                            $tempUser = Model\BasicModel::getNew('UserModel');

                            foreach($accessUsers as $userId){
                                $tempUser->getById( (int)$userId );

                                if(
                                    !$tempUser->dry() &&
                                    $tempUser->sharing == 1 // check if map sharing is enabled
                                ){
                                    $map->setAccess($tempUser);
                                }

                                $tempUser->reset();
                            }
                        }

                        // the current user itself should always have access
                        // just in case he removed himself :)
                        $map->setAccess($user);
                    }elseif($map->isCorporation()){
                        $activeCharacter = $user->getActiveUserCharacter();

                        if($activeCharacter){
                            $corporation = $activeCharacter->getCharacter()->getCorporation();

                            if($corporation){
                                // the current user has to have a corporation when
                                // working on corporation maps!

                                // share map between corporations -> set access
                                if(isset($formData['mapCorporations'])){
                                    // avoid abuse -> respect share limits
                                    $accessCorporations = array_slice( $formData['mapCorporations'], 0, $f3->get('PATHFINDER.MAX_SHARED_CORPORATION') );

                                    // clear map access. In case something has removed from access list
                                    $map->clearAccess();

                                    $tempCorporation = Model\BasicModel::getNew('CorporationModel');

                                    foreach($accessCorporations as $corporationId){
                                        $tempCorporation->getById( (int)$corporationId );

                                        if(
                                            !$tempCorporation->dry() &&
                                            $tempCorporation->sharing == 1 // check if map sharing is enabled
                                        ){
                                            $map->setAccess($tempCorporation);
                                        }

                                        $tempCorporation->reset();
                                    }
                                }

                                // the corporation of the current user should always have access
                                $map->setAccess($corporation);
                            }
                        }
                    }elseif($map->isAlliance()){
                        $activeCharacter = $user->getActiveUserCharacter();

                        if($activeCharacter){
                            $alliance = $activeCharacter->getCharacter()->getAlliance();

                            if($alliance){
                                // the current user has to have a alliance when
                                // working on alliance maps!

                                // share map between alliances -> set access
                                if(isset($formData['mapAlliances'])){
                                    // avoid abuse -> respect share limits
                                    $accessAlliances = array_slice( $formData['mapAlliances'], 0, $f3->get('PATHFINDER.MAX_SHARED_ALLIANCE') );

                                    // clear map access. In case something has removed from access list
                                    $map->clearAccess();

                                    $tempAlliance = Model\BasicModel::getNew('AllianceModel');

                                    foreach($accessAlliances as $allianceId){
                                        $tempAlliance->getById( (int)$allianceId );

                                        if(
                                            !$tempAlliance->dry() &&
                                            $tempAlliance->sharing == 1 // check if map sharing is enabled
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
     * @param $f3
     */
    public function delete($f3){
        $mapData = (array)$f3->get('POST.mapData');

        $user = $this->_getUser();

        if($user){
            $map = Model\BasicModel::getNew('MapModel');
            $map->getById($mapData['id']);
            $map->delete($user);
        }

        echo json_encode([]);
    }

    /**
     * update map data
     * function is called continuously
     * @param $f3
     */
    public function updateData($f3){

        // cache time(s) per user should be equal or less than this function is called
        // prevent request flooding
        $responseTTL = $f3->get('PATHFINDER.TIMER.UPDATE_SERVER_MAP.DELAY') / 1000;
        $mapData = (array)$f3->get('POST.mapData');

        $user = $this->_getUser();
        $return = (object) [];
        $return->error = [];

        if($user){
            // -> get active user object
            $activeCharacter = $user->getActiveUserCharacter();

            $cacheKey = 'user_map_data_' . $activeCharacter->id;

            // if there is any system/connection change data submitted -> clear cache
            if(!empty($mapData)){
                $f3->clear($cacheKey);
            }

            if($f3->exists($cacheKey) === false ){

                // get current map data ========================================================
                $maps = $user->getMaps();

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
                                $map->filter('systems', array('id = ?', $systemData['id'] ));
                                $filteredMap = $map->find(
                                    array('id = ?', $map->id ),
                                    array('limit' => 1)
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
                                        $system->updatedCharacterId = $activeCharacter->characterId;
                                        $system->save();

                                        // a system belongs to ONE  map -> speed up for multiple maps
                                        unset($systemData[$i]);
                                    }
                                }
                            }

                            // update connection data -------------------------------------------
                            foreach($connections as $i => $connectionData){

                                // check if the current connection belongs to the current map
                                $map->filter('connections', array('id = ?', $connectionData['id'] ));
                                $filteredMap = $map->find(
                                    array('id = ?', $map->id ),
                                    array('limit' => 1)
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
                                        $connection->save($user);

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

                if(count($return->mapData) > 0){
                    $f3->set($cacheKey, $return, $responseTTL);
                }
            }else{
                // get from cache
                $return = $f3->get($cacheKey);
            }

        }else{
            // user logged off
            $return->error[] = $this->getUserLoggedOffError();
        }

        echo json_encode( $return );
    }

    /**
     * @param $mapModels
     * @return Model\MapModel[]
     */
    public static function getFormattedMapData($mapModels){

        $mapData = [];
        foreach($mapModels as $mapModel){

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
     * function is called continuously
     * @param $f3
     */
    public function updateUserData($f3){

        // cache time(s) should be equal or less than request trigger time
        // prevent request flooding
        $responseTTL = $f3->get('PATHFINDER.TIMER.UPDATE_SERVER_USER_DATA.DELAY') / 1000;

        // if the cache key will be set -> cache request
        $cacheKey = null;

        $return = (object) [];
        $return->error = [];

        $user = $this->_getUser();

        if($user){

            if( !empty($f3->get('POST.mapIds')) ){
                $mapIds = (array)$f3->get('POST.mapIds');
                // check if data for specific system is requested
                $systemData = (array)$f3->get('POST.systemData');


                // update current location (IGB data)
                $user->updateCharacterLog(60 * 5);

                // if data is requested extend the cache key in order to get new data
                $requestSystemData = (object) [];
                $requestSystemData->mapId = isset($systemData['mapId']) ? (int) $systemData['mapId'] : 0;
                $requestSystemData->systemId = isset($systemData['systemData']['id']) ? (int) $systemData['systemData']['id'] : 0;

                // IMPORTANT for now -> just update a single map (save performance)
                $mapIds = array_slice($mapIds, 0, 1);

                // the userMasData is cached per map (this must be changed if multiple maps
                // will be allowed in future...
                $tempId = (int)$mapIds[0];
                $cacheKey = 'user_data_' . $tempId . '_' . $requestSystemData->systemId;

                if( $f3->exists($cacheKey) === false ){
                    foreach($mapIds as $mapId){
                        $map = $user->getMap($mapId);

                        if( !is_null($map) ){
                            $return->mapUserData[] = $map->getUserData();

                            // request signature data for a system if user has map access!
                            if( $map->id === $requestSystemData->mapId ){
                                $system = $map->getSystem( $requestSystemData->systemId );

                                if( !is_null($system) ){
                                    // data for the current selected system
                                    $return->system = $system->getData();
                                    $return->system->signatures = $system->getSignaturesData();
                                }
                            }
                        }
                    }

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
            $return->userData = $user->getData();

        }else{
            // user logged off
            $return->error[] = $this->getUserLoggedOffError();
        }


        echo json_encode( $return );
    }

}













