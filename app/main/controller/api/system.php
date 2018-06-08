<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 20:23
 */

namespace Controller\Api;

use Controller;
use Data\Mapper as Mapper;
use lib\Config;
use Model;

class System extends Controller\AccessController {

    private $mainQuery = "SELECT
            map_sys.constellationID `connstallation_id`,
            map_sys.solarSystemID `system_id`,
            map_sys.solarSystemName `system_name`,
            map_sys.security `system_security`,
            map_con.constellationName `constallation_name`,
	        map_reg.regionID `region_id`,
	        map_reg.regionName `region_name`,
	        '0' `trueSec`,
	        '' `type`,
            IFNULL(
              (
                SELECT
                    LOWER( system_effect.typeName )
                FROM
                    invTypes system_effect INNER JOIN
                    mapDenormalize map_norm ON
                        map_norm.typeID = system_effect.typeID
                WHERE
                    system_effect.groupID = 995 AND
                    map_norm.solarSystemID = map_sys.solarSystemID
                LIMIT 1
              ), '') `effect`,
            IFNULL(
              (
                SELECT
                    map_worm_class.wormholeClassID  system_class
                FROM
                     mapLocationWormholeClasses map_worm_class
                WHERE
                    map_worm_class.locationID = map_sys.regionID
                LIMIT 1
              ), 7) `security`
        FROM
            mapSolarSystems map_sys INNER JOIN
	        mapConstellations map_con ON
		      map_sys.constellationID = map_con.constellationID  INNER JOIN
	        mapRegions map_reg ON
		      map_con.regionID = map_reg.regionID";

    private $whereQuery = "";

    // exclude Jove Space
    private $havingQuery = "HAVING
            security IS NOT NULL";

    private $orderByQuery = "ORDER BY
            system_name";

    private $limitQuery = "";


    /**
     * build query
     * @return string
     */
    private function _getQuery(){
        $query = $this->mainQuery;
        $query .= ' ' . $this->whereQuery;
        $query .= ' ' . $this->havingQuery;
        $query .= ' ' . $this->orderByQuery;
        $query .= ' ' . $this->limitQuery;

        return $query;
    }

    /**
     * get system Data from CCPs [SDE]
     * search column for IDs can be (solarSystemID, regionID, constellationID)
     * @param array $columnIDs
     * @param string $column
     * @return Model\SystemModel[]
     * @throws \Exception
     */
    public function getSystemModelByIds($columnIDs = [], $column = 'solarSystemID'){

        $systemModels = [];

        $ccpDB = $this->getDB('CCP');

        $this->whereQuery = "WHERE
            map_sys." . $column . " IN (" . implode(',', $columnIDs) . ")";

        $query = $this->_getQuery();

        $rows = $ccpDB->exec($query, null, 60 * 60 * 24);

        // format result
        $ccpSystemsData = (new Mapper\CcpSystemsMapper($rows))->getData();

        foreach($ccpSystemsData as $ccpSystemData){
            /**
             * @var Model\SystemModel $system
             */
            $system = Model\BasicModel::getNew('SystemModel');
            $system->setData($ccpSystemData);
            $systemModels[] = $system;
        }

        return $systemModels;
    }

    /**
     * Get all static system Data from CCP DB (long cache timer)
     * @return array
     */
    public function getSystems(){
        $ccpDB = $this->getDB('CCP');
        $query = $this->_getQuery();
        $rows = $ccpDB->exec($query, null, 60 * 60 * 24);
        // format result
        $mapper = new Mapper\CcpSystemsMapper($rows);

        return $mapper->getData();
    }

    /**
     * search systems by name
     * @param \Base $f3
     * @param array $params
     */
    public function search(\Base $f3, $params){

        $ccpDB = $this->getDB('CCP');

        $searchToken = '';
        // check for search parameter
        if( isset($params['arg1']) ){
            $searchToken = $params['arg1'];
        }

        // some "edge cases" for testing trueSec rounding...
        //$searchToken = 'H472-N'; // -0.000001 -> 0.0
        //$searchToken = 'X1E-OQ'; // -0.099426 -> -0.10
        //$searchToken = 'BKK4-H'; // -0.049954 -> -0.05
        //$searchToken = 'Uhtafal'; // 0.499612 -> 0.5 (HS)
        //$searchToken = 'Oshaima'; // 0.453128 -> 0.5 (HS)
        //$searchToken = 'Ayeroilen'; // 0.446568 -> 0.4 (LS)
        //$searchToken = 'Enderailen'; // 0.448785 -> 0.4 (LS)
        //$searchToken = 'Neziel'; // 0.449943 -> 0.4 (LS)
        //$searchToken = 'Naga'; // 0.033684 -> 0.1 (LS)


        $this->whereQuery = "WHERE
            map_sys.solarSystemName LIKE '%" . $searchToken . "%'";

        $query = $this->_getQuery();

        $rows = $ccpDB->exec($query);

        // format result
        $mapper = new Mapper\CcpSystemsMapper($rows);

        $data = $mapper->getData();

        echo json_encode($data);
    }

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
                // update existing system (e.g. changed system description) -------------------------------------------

                /**
                 * @var $system Model\SystemModel
                 */
                $system = Model\BasicModel::getNew('SystemModel');
                $system->getById($systemData['id']);
                if( !$system->dry() ){
                    if( $system->hasAccess($activeCharacter) ){
                        // system model found
                        $systemModel = $system;
                    }
                }
            }elseif( isset($mapData['id']) ){
                // save NEW system ------------------------------------------------------------------------------------

                /**
                 * @var $map Model\MapModel
                 */
                $map = Model\BasicModel::getNew('MapModel');
                $map->getById($mapData['id']);
                if( $map->hasAccess($activeCharacter) ){
                    // make sure system is not already on map
                    // --> (e.g. multiple simultaneously save() calls for the same system)
                    $systemModel = $map->getSystemByCCPId($systemData['systemId']);
                    if( is_null($systemModel) ){
                        // system not found on map -> get static system data (CCP DB)
                        $systemModel = $map->getNewSystem($systemData['systemId']);
                        $defaultStatusId = 1;
                    }else{
                        // system already exists (e.g. was inactive)
                        $defaultStatusId = $systemModel->statusId;
                    }

                    if( !is_null($systemModel) ){
                        $systemModel->statusId = isset($systemData['statusId']) ? $systemData['statusId'] : $defaultStatusId;
                    }

                    // map is not changeable for a system! (security)
                    $systemData['mapId'] = $map;
                }
            }

            if( !is_null($systemModel) ){
                // "statusId" was set above
                unset($systemData['statusId']);
                unset($systemData['mapId']);

                // set/update system
                $systemModel->setData($systemData);
                // activate system (e.g. was inactive))
                $systemModel->setActive(true);


                if($systemModel->save($activeCharacter)){
                    // get data from "fresh" model (e.g. some relational data has changed: "statusId")
                    /**
                     * @var $newSystemModel Model\SystemModel
                     */
                    $newSystemModel = Model\BasicModel::getNew('SystemModel');
                    $newSystemModel->getById( $systemModel->id, 0);
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
     * get system data for all systems within a constellation
     * @param \Base $f3
     * @param array $params
     * @throws \Exception
     * @throws \Exception\PathfinderException
     */
    public function constellationData(\Base $f3, $params){
        $return = (object) [];
        $return->error = [];
        $return->systemData = [];

        $constellationId = 0;

        // check for search parameter
        if( isset($params['arg1']) ){
            $constellationId = (int)$params['arg1'];
        }
        $cacheKey = 'CACHE_CONSTELLATION_SYSTEMS_' . self::formatHiveKey($constellationId);

        if($f3->exists($cacheKey, $cachedData)){
            $return->systemData = $cachedData;
        }else{
            if($constellationId > 0){
                $systemModels = $this->getSystemModelByIds([$constellationId], 'constellationID');

                foreach($systemModels as $systemModel){
                    $return->systemData[] = $systemModel->getData();
                }

                $f3->set($cacheKey, $return->systemData, Config::getPathfinderData('cache.constellation_systems'));
            }
        }

        echo json_encode($return);
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

