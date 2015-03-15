<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 20:23
 */

namespace Controller\Api;
use Model;

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
        $expireTimeHead = 60 * 60 * 24;
        $expireTimeSQL = 60 * 60 * 24;

        $f3->expire($expireTimeHead);

        $initData = [];

        // get all available map types -------------------------------------
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

        // get all available map scopes ------------------------------------
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

        // get available connection scopes ---------------------------------
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

        echo json_encode($initData);
    }

    /**
     * save a new map or update an existing map
     * @param $f3
     */
    public function save($f3){

        $mapData = (array)$f3->get('POST.mapData');

        $map = Model\BasicModel::getNew('MapModel');
        $map->getById($mapData['id']);
        $map->setData($mapData);
        $map->save();

        if($map->isPrivate()){
            $user = $this->_getUser();
            $map->setAccess($user);
        }

        $mapData = $map->getData();

        echo json_encode($mapData);
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
     * update map data api
     * function is called continuously
     * @param $f3
     */
    public function updateData($f3){

        // cache time for response should be equal or less than this function is called
        // security aspect
        $responseTTL = 3;

        $mapData = (array)$f3->get('POST.mapData');

        $user = $this->_getUser();

        $map = Model\BasicModel::getNew('MapModel');
        $system = Model\BasicModel::getNew('SystemModel');
        $connection = Model\BasicModel::getNew('ConnectionModel');


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
                    (int)$systemData['updated'] === 0 &&
                    !$system->dry()
                ){
                    $systemData['mapId'] = $map;
                    $system->setData($systemData);
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
        $cacheKey = 'user_map_data_' . $user->id;

        if($f3->exists($cacheKey) === false){
            $activeMaps = $user->getMaps();

            // format map Data for return
            $newData = self::getFormattedMapData($activeMaps);

            $f3->set($cacheKey, $newData, $responseTTL);
        }else{
            // TODO log -> manipulated request
        }


        echo json_encode( $f3->get($cacheKey) );
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

} 