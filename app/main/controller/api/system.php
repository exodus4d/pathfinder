<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 20:23
 */

namespace Controller\Api;

use Controller;
use Model;

class System extends Controller\AccessController {

    /**
     * save a new system to a a map
     * @param \Base $f3
     * @throws \Exception
     */
    public function save(\Base $f3){
        $postData = (array)$f3->get('POST');

        $return = (object) [];
        $return->error = [];
        $return->systemData = (object) [];

        if(
            isset($postData['systemData']) &&
            isset($postData['mapData'])
        ){
            $activeCharacter = $this->getCharacter();
            $systemData = (array)$postData['systemData'];
            $mapData = (array)$postData['mapData'];
            $systemModel = null;

            if( isset($systemData['statusId']) ){
                if( (int)$systemData['statusId'] <= 0){
                    unset($systemData['statusId']);
                }else{
                    $systemData['statusId'] = (int)$systemData['statusId'];
                }
            }

            if( isset($systemData['id']) ){
                // update existing system (e.g. set description) ------------------------------------------------------
                /**
                 * @var $system Model\SystemModel
                 */
                $system = Model\BasicModel::getNew('SystemModel');
                $system->getById($systemData['id']);
                if(
                    !$system->dry() &&
                    $system->hasAccess($activeCharacter)
                ){
                    // system model found
                    // activate system (e.g. was inactive))
                    $system->setActive(true);
                    $systemModel = $system;
                }
            }elseif( isset($mapData['id']) ){
                // save NEW system ------------------------------------------------------------------------------------
                /**
                 * @var $map Model\MapModel
                 */
                $map = Model\BasicModel::getNew('MapModel');
                $map->getById($mapData['id']);
                if($map->hasAccess($activeCharacter)){
                    $systemModel = $map->getNewSystem($systemData['systemId']);
                }
            }

            if( !is_null($systemModel) ){
                // set/update system custom data
                $systemModel->copyfrom($systemData, ['locked', 'rallyUpdated', 'position', 'description']);

                if($systemModel->save($activeCharacter)){
                    // get data from "fresh" model (e.g. some relational data has changed: "statusId")
                    /**
                     * @var $newSystemModel Model\SystemModel
                     */
                    $newSystemModel = Model\BasicModel::getNew('SystemModel');
                    $newSystemModel->getById( $systemModel->_id, 0);
                    $newSystemModel->clearCacheData();
                    $return->systemData = $newSystemModel->getData();

                    // broadcast map changes
                    $this->broadcastMapData($newSystemModel->mapId);
                }else{
                    $return->error = $systemModel->getErrors();
                }
            }
        }

        echo json_encode($return);
    }

    /**
     * get system log data from CCP API import
     * system Kills, Jumps,....
     * @param \Base $f3
     * @throws \Exception
     */
    public function graphData(\Base $f3){
        $graphData = [];
        $systemIds = $f3->get('POST.systemIds');

        // number of log entries in each table per system (24 = 24h)
        $logEntryCount = 24;

        // table names with system data
        $logTables = [
            'jumps' => 'SystemJumpModel',
            'shipKills' => 'SystemShipKillModel',
            'podKills' => 'SystemPodKillModel',
            'factionKills' => 'SystemFactionKillModel'
        ];

        foreach($systemIds as $systemId){
            foreach($logTables as $label => $ModelClass){
                $systemLogModel = Model\BasicModel::getNew($ModelClass);

                // 10min cache (could be up to 1h cache time)
                $systemLogModel->getByForeignKey('systemId', $systemId, [], 60 * 10);

                if( !$systemLogModel->dry() ){
                    $counter = 0;
                    for( $i = $logEntryCount; $i >= 1; $i--){
                        $column = 'value' . $i;

                        // ship and pod kills should be merged into one table
                        if($label == 'podKills'){
                            $graphData[$systemId]['shipKills'][$counter]['z'] = $systemLogModel->$column;
                        }else{
                            $dataSet = [
                                'x' => ($i - 1) . 'h',
                                'y' => $systemLogModel->$column
                            ];
                            $graphData[$systemId][$label][] = $dataSet;
                        }
                        $counter++;
                    }
                }
            }
        }

        echo json_encode($graphData);
    }

    /**
     * set destination for specific systemIds
     * @param \Base $f3
     * @throws \Exception
     */
    public function setDestination(\Base $f3){
        $postData = (array)$f3->get('POST');

        $return = (object) [];
        $return->error = [];
        $return->systemData = [];

        if( !empty($postData['systemData'] )){
            $activeCharacter = $this->getCharacter();

            $return->clearOtherWaypoints = (bool)$postData['clearOtherWaypoints'];
            $return->first = (bool)$postData['first'];

            if( $accessToken = $activeCharacter->getAccessToken() ){
                $options = [
                    'clearOtherWaypoints' => $return->clearOtherWaypoints,
                    'addToBeginning' => $return->first,
                ];

                foreach($postData['systemData'] as $systemData){
                    $response =  $f3->ccpClient->setWaypoint($systemData['systemId'], $accessToken, $options);

                    if(empty($response)){
                        $return->systemData[] = $systemData;
                    }else{
                        $error = (object) [];
                        $error->type = 'error';
                        $error->message = $response['error'];
                        $return->error[] = $error;
                    }
                }

            }
        }

        echo json_encode($return);
    }

    /**
     * send Rally Point poke
     * @param \Base $f3
     * @throws \Exception
     * @throws \Exception\PathfinderException
     */
    public function pokeRally(\Base $f3){
        $rallyData = (array)$f3->get('POST');
        $systemId = (int)$rallyData['systemId'];
        $return = (object) [];

        if($systemId){
            $activeCharacter = $this->getCharacter();

            /**
             * @var Model\SystemModel $system
             */
            $system = Model\BasicModel::getNew('SystemModel');
            $system->getById($systemId);

            if($system->hasAccess($activeCharacter)){
                $rallyData['pokeDesktop']   = $rallyData['pokeDesktop'] === '1';
                $rallyData['pokeMail']      = $rallyData['pokeMail'] === '1';
                $rallyData['pokeSlack']     = $rallyData['pokeSlack'] === '1';
                $rallyData['pokeDiscord']   = $rallyData['pokeDiscord'] === '1';
                $rallyData['message']       = trim($rallyData['message']);

                $system->sendRallyPoke($rallyData, $activeCharacter);
            }
        }

        echo json_encode($return);
    }

    /**
     * @param \Base $f3
     * @throws \Exception
     */
    public function getData(\Base $f3){
        $requestData = (array)$f3->get('POST');
        $mapId = (int)$requestData['mapId'];
        $systemId = (int)$requestData['systemId'];
        $activeCharacter = $this->getCharacter();

        $return = (object) [];

        if(
            !is_null($map = $activeCharacter->getMap($mapId)) &&
            !is_null($system = $map->getSystemById($systemId))
        ){
            $return->system = $system->getData();
            $return->system->signatures = $system->getSignaturesData();
            $return->system->structures = $system->getStructuresData();
        }

        echo json_encode($return);
    }

    /**
     * delete systems and all its connections from map
     * -> set "active" flag
     * @param \Base $f3
     * @throws \Exception
     */
    public function delete(\Base $f3){
        $mapId = (int)$f3->get('POST.mapId');
        $systemIds = array_map('intval', (array)$f3->get('POST.systemIds'));

        $return = (object) [];
        $return->deletedSystemIds = [];

        if($mapId){
            $activeCharacter = $this->getCharacter();

            /**
             * @var Model\MapModel $map
             */
            $map = Model\BasicModel::getNew('MapModel');
            $map->getById($mapId);

            if($map->hasAccess($activeCharacter)){
                $newSystemModel = Model\BasicModel::getNew('SystemModel');
                foreach($systemIds as $systemId){
                    if( $system = $map->getSystemById($systemId) ){
                        // check whether system should be deleted OR set "inactive"
                        if( $this->checkDeleteMode($map, $system) ){
                            // delete log
                            // -> first set updatedCharacterId -> required for activity log
                            $system->updatedCharacterId = $activeCharacter;
                            $system->update();

                            // ... now get fresh object and delete..
                            $newSystemModel->getById( $system->id, 0);
                            $newSystemModel->erase();
                            $newSystemModel->reset();
                        }else{
                            // Trim alias
                            $offset = strpos($system->alias, $system->name);
                            if($offset === FALSE){
                                $system->setData(array("alias"=>$system->name));
                            }
                            else{
                                $system->setData(array("alias"=>substr($system->alias, $offset)));
                            }
                            
                            // keep data -> set "inactive"
                            $system->setActive(false);
                            $system->save($activeCharacter);
                        }

                        $system->reset();

                        $return->deletedSystemIds[] = $systemId;
                    }
                }
                // broadcast map changes
                if(count($return->deletedSystemIds)){
                    $this->broadcastMapData($map);
                }
            }
        }

        echo json_encode($return);
    }

    /**
     * checks whether a system should be "deleted" or set "inactive" (keep some data)
     * @param Model\MapModel $map
     * @param Model\SystemModel $system
     * @return bool
     */
    protected function checkDeleteMode(Model\MapModel $map, Model\SystemModel $system){
        $delete = true;

        if( !empty($system->description) ){
            // never delete systems with custom description set!
            $delete = false;
        }elseif(
            $map->persistentAliases &&
            !empty($system->alias) &&
            ($system->alias != $system->name)
        ){
            // map setting "persistentAliases" is active (default) AND
            // alias is set and != name
            $delete = false;
        }

        return $delete;
    }
}

