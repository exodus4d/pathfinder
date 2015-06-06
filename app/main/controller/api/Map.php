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
     */
    function beforeroute() {

        // set header for all routes
        header('Content-type: application/json');

        parent::beforeroute();
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
                'label' => $rowData->label
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

        if(array_key_exists( 'id', $formData)){

            $user = $this->_getUser();

            $map = Model\BasicModel::getNew('MapModel');
            $map->getById($formData['id']);

            // check if the user has access to this map
            $mapAccess = true;
            if(! $map->dry() ){
                $mapAccess = $map->hasAccess($user);
            }

            if($mapAccess){
                $map->setData($formData);
                $map = $map->save();

                // save global map access. Depends on map "type"
                if($map->isPrivate()){

                    // share map between users -> set access
                    if(array_key_exists('mapUsers', $formData)){
                        // clear map access. In case something has removed from access list
                        $map->clearAccess();

                        $tempUser = Model\BasicModel::getNew('UserModel');

                        foreach((array)$formData['mapUsers'] as $userId){
                            $tempUser->getById( $userId );

                            if( !$tempUser->dry() ){
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
                            if(array_key_exists('mapCorporations', $formData)){
                                // clear map access. In case something has removed from access list
                                $map->clearAccess();

                                $tempCorporation = Model\BasicModel::getNew('CorporationModel');

                                foreach((array)$formData['mapCorporations'] as $corporationId){
                                    $tempCorporation->getById( $corporationId );

                                    if( !$tempCorporation->dry() ){
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
                            if(array_key_exists('mapAlliances', $formData)){
                                // clear map access. In case something has removed from access list
                                $map->clearAccess();

                                $tempAlliance = Model\BasicModel::getNew('AllianceModel');

                                foreach((array)$formData['mapAlliances'] as $allianceId){
                                    $tempAlliance->getById( $allianceId );

                                    if( !$tempAlliance->dry() ){
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

                $return->mapData = $map->getData();
            }else{
                // map access denied
                $captchaError = new \stdClass();
                $captchaError->type = 'error';
                $captchaError->message = 'Access denied';
                $return->error[] = $captchaError;
            }
        }else{
            // map id field missing
            $idError = new \stdClass();
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

        $map = Model\BasicModel::getNew('MapModel');
        $map->getById($mapData['id']);
        $map->delete($user);

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
        $responseTTL = 3;
        $user = $this->_getUser();

        $return = (object) [];
        $return->error = [];

        if($user){
            $cacheKey = 'user_map_data_' . $user->id;
            if($f3->exists($cacheKey) === false){

                $mapData = (array)$f3->get('POST.mapData');


                $map = Model\BasicModel::getNew('MapModel');
                $system = Model\BasicModel::getNew('SystemModel');
                $connection = Model\BasicModel::getNew('ConnectionModel');

                $activeCharacter = $user->getActiveUserCharacter();

                foreach($mapData as $data){

                    $config = $data['config'];
                    $systems = [];
                    $connections = [];

                    // check whether system data and/or connection data is send
                    // empty arrays are not included in ajax requests
                    if(array_key_exists('data', $data)){
                        if(array_key_exists('systems', $data['data'])){
                            $systems = $data['data']['systems'];
                        }
                        if(array_key_exists('connections', $data['data'])){
                            $connections = $data['data']['connections'];
                        }
                    }

                    // update map data ---------------------------------------------
                    $map->getById($config['id']);

                    if(!$map->dry()){
                        // update map on change
                        if( (int)$config['updated'] > strtotime($map->updated)){
                            $map->setData($config);
                            $map->save();
                        }
                    }

                    // get system data -----------------------------------------------
                    foreach($systems as $systemData){
                        $system->getById($systemData['id']);

                        if(
                            (int)$systemData['updated']['updated'] === 0 &&
                            !$system->dry()
                        ){
                            $system->setData($systemData);
                            $system->mapId = $map;
                            $system->updatedCharacterId = $activeCharacter->characterId;
                            $system->save();
                        }

                        $system->reset();
                    }

                    // get connection data -------------------------------------------
                    foreach($connections as $connectionData){
                        $connection->getById($connectionData['id']);

                        if(
                            (int)$connectionData['updated'] === 0 &&
                            !$connection->dry()
                        ){
                            $connectionData['mapId'] = $map;
                            $connection->setData($connectionData);
                            $connection->save($user);
                        }

                        $connection->reset();
                    }

                    $map->reset();
                }

                // get map data ======================================================
                $activeMaps = $user->getMaps();

                // format map Data for return
                $newData = self::getFormattedMapData($activeMaps);

                $f3->set($cacheKey, $newData, $responseTTL);
            }

            $return = $f3->get($cacheKey);
        }else{
            // user logged of
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
            $mapData[] = [
                'config' => $mapModel->getData(),
                'data' => [
                    'systems' => $mapModel->getSystemData(),
                    'connections' => $mapModel->getConnectionData(),
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

        // cache time(s) per user should be equal or less than request trigger
        // prevent request flooding
        $responseTTL = 2;
        $user = $this->_getUser();

        $return = (object) [];
        $return->error = [];

        if($user){
            $cacheKey = 'user_data_' . $user->id;
            if($f3->exists($cacheKey) === false){

                // check if data for specific system is requested
                $systemData = (array)$f3->get('POST.systemData');

                // update current location (IGB data)
                $user->updateCharacterLog();

                // data for the current user
                $return->userData = $user->getData();

                // get user Data for each map ========================================
                $activeMaps = $user->getMaps();

                foreach($activeMaps as $mapModel){
                    $return->mapUserData[] = $mapModel->getUserData();

                    // request signature data for a system if user has map access
                    if(
                        !empty($systemData) &&
                        $systemData['mapId'] == $mapModel->id
                    ){
                        $system = $mapModel->getSystem( (int)$systemData['systemData']['id']);

                        if(! is_null($system)){
                            // data for the current selected system
                            $return->system = $system->getData();
                            $return->system->signatures = $system->getSignaturesData();
                        }

                    }
                }

                $f3->set($cacheKey, $return, $responseTTL);
            }

            $return = $f3->get($cacheKey);
        }else{
            // user logged of
            $return->error[] = $this->getUserLoggedOffError();
        }


        echo json_encode( $return );
    }

}













