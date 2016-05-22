<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 20:23
 */

namespace Controller\Api;
use Controller\Ccp\Sso;
use Data\Mapper as Mapper;
use Model;

class System extends \Controller\AccessController {

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
		      map_con.constellationID = map_sys.constellationID INNER JOIN
	        mapRegions map_reg ON
		      map_reg.regionID = map_sys.regionID";

    private $whereQuery = "";

    // exclude Jove Space
    private $havingQuery = "HAVING
            security IS NOT NULL";

    private $orderByQuery = "ORDER BY
            system_name";

    private $limitQuery = "";

    /**
     * @param \Base $f3
     */
    function beforeroute(\Base $f3) {

        parent::beforeroute($f3);

        // set header for all routes
        header('Content-type: application/json');
    }

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
     * get static system Data from CCPs Static DB export
     * search column for IDs can be (solarSystemID, regionID, constellationID)
     * @param array $columnIDs
     * @param string $column
     * @return Model\SystemModel[]
     * @throws \Exception
     */
    protected function _getSystemModelByIds($columnIDs = [], $column = 'solarSystemID'){

        $systemModels = [];

        $ccpDB = $this->getDB('CCP');

        $this->whereQuery = "WHERE
            map_sys." . $column . " IN (" . implode(',', $columnIDs) . ")";

        $query = $this->_getQuery();

        $rows = $ccpDB->exec($query, null, 60 * 60 * 24);

        // format result
        $mapper = new Mapper\CcpSystemsMapper($rows);
        $ccpSystemsData = $mapper->getData();

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

        // some "edge cases for testing if rounding works correct
        //$searchToken = 'H472-N'; // -0.000001 -> 0.0
        //$searchToken = 'X1E-OQ'; // -0.099426 -> -0.10
        //$searchToken = 'BKK4-H'; // -0.049954 -> -0.05
        //$searchToken = 'Uhtafal'; // 0.499612 -> 0.5 (HS)
        //$searchToken = 'Oshaima'; // 0.453128 -> 0.5 (HS)
        //$searchToken = 'Ayeroilen'; // 0.446568 -> 0.4 (LS)
        //$searchToken = 'Enderailen'; // 0.448785 -> 0.4 (LS)

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
     */
    public function save(\Base $f3){
        $newSystemData = [];

        $postData = (array)$f3->get('POST');

        // system to be saved
        $systemModel = null;

        if(
            isset($postData['systemData']) &&
            isset($postData['mapData'])
        ){
            $activeCharacter = $this->getCharacter();

            if($activeCharacter){
                $systemData = (array)$postData['systemData'];
                $mapData = (array)$postData['mapData'];

                if( isset($systemData['id']) ){
                    // update existing system (e.g. changed system description) -------------------

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
                    // save NEW system ------------------------------------------------------------

                    /**
                     * @var $map Model\MapModel
                     */
                    $map = Model\BasicModel::getNew('MapModel');
                    $map->getById($mapData['id']);
                    if(
                        !$map->dry() &&
                        $map->hasAccess($activeCharacter)
                    ){
                        // make sure system is not already on map
                        // --> (e.g. multiple simultaneously save() calls for the same system)
                        if( is_null( $systemModel = $map->getSystemByCCPId($systemData['systemId']) ) ){
                            // system not found on map -> get static system data (CCP DB)
                            $systemModel = array_values( $this->_getSystemModelByIds([$systemData['systemId']]) )[0];
                            $systemModel->createdCharacterId = $activeCharacter;
                        }

                        // map is not changeable for a system! (security)
                        $systemData['mapId'] = $map;
                    }
                }
            }
        }

        if( !is_null($systemModel) ){
            // set/update system
            $systemModel->setData($systemData);
            $systemModel->updatedCharacterId = $activeCharacter;
            $systemModel->save();
            $newSystemData = $systemModel->getData();
        }

        echo json_encode($newSystemData);
    }

    /**
     * get system log data from CCP API import
     * system Kills, Jumps,....
     * @param \Base $f3
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
     */
    public function constellationData(\Base $f3, $params){
        $return = (object) [];
        $return->error = [];
        $return->systemData = [];

        if(  $activeCharacter = $this->getCharacter() ){
            $constellationId = 0;

            // check for search parameter
            if( isset($params['arg1']) ){
                $constellationId = (int)$params['arg1'];
            }
            $cacheKey = 'CACHE_CONSTELLATION_SYSTEMS_' . self::formatHiveKey($constellationId);

            if($f3->exists($cacheKey)){
                $return->systemData = $f3->get($cacheKey);
            }else{
                if($constellationId > 0){
                    $systemModels = $this->_getSystemModelByIds([$constellationId], 'constellationID');

                    foreach($systemModels as $systemModel){
                        $return->systemData[] = $systemModel->getData();
                    }

                    $f3->set($cacheKey, $return->systemData, $f3->get('PATHFINDER.CACHE.CONSTELLATION_SYSTEMS') );
                }
            }
        }

        echo json_encode($return);
    }

    /**
     * set destination for specific systemIds
     * @param \Base $f3
     */
    public function setDestination(\Base $f3){
        $postData = (array)$f3->get('POST');

        $return = (object) [];
        $return->error = [];
        $return->systemData = [];

        if(
            ($activeCharacter = $this->getCharacter()) &&
            !empty($postData['systemData'])
        ){
            $return->clearOtherWaypoints = (bool)$postData['clearOtherWaypoints'];
            $return->first = (bool)$postData['first'];

             /**
             * @var Sso $ssoController
             */
            $ssoController = self::getController('Sso');
            foreach($postData['systemData'] as $systemData){
                $waypointData = $ssoController->setWaypoint($activeCharacter, $systemData['systemId'], [
                    'clearOtherWaypoints' => $return->clearOtherWaypoints,
                    'first' => $return->first,
                ]);
                if($waypointData['systemId']){
                    $return->systemData[] = $systemData;
                }elseif( isset($waypointData['error']) ){
                    $return->error[] = $waypointData['error'];
                }
            }
        }

        echo json_encode($return);
    }


    /**
     * delete systems and all its connections
     * @param \Base $f3
     */
    public function delete(\Base $f3){
        $systemIds = (array)$f3->get('POST.systemIds');

        if($activeCharacter = $this->getCharacter()){
            /**
             * @var Model\SystemModel $system
             */
            $system = Model\BasicModel::getNew('SystemModel');
            foreach((array)$systemIds as $systemId){
                $system->getById($systemId);
                $system->delete($activeCharacter);
                $system->reset();
            }
        }

        echo json_encode([]);
    }
}





















