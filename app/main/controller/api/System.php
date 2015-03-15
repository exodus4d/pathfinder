<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 20:23
 */

namespace Controller\Api;
use Data\Mapper as Mapper;
use Model;

class System extends \Controller\AccessController {

    private $mainQuery = "SELECT
            map_sys.constellationID connstallation_id,
            map_sys.solarSystemID system_id,
            map_sys.solarSystemName system_name,
            ROUND( map_sys.security, 2) system_security,
            map_con.constellationName constallation_name,
	        map_reg.regionID region_id,
	        map_reg.regionName region_name,
	        '' type,
            IFNULL(
              (
                SELECT
                    LOWER( system_effect.typeName )
                FROM
                    invtypes system_effect INNER JOIN
                    mapdenormalize map_norm ON
                        map_norm.typeID = system_effect.typeID
                WHERE
                    system_effect.groupID = 995 AND
                    map_norm.solarSystemID = map_sys.solarSystemID
                LIMIT 1
              ), '') system_effect,
            IFNULL(
              (
                SELECT
                    map_worm_class.wormholeClassID  system_class
                FROM
                     maplocationwormholeclasses map_worm_class
                WHERE
                    map_worm_class.locationID = map_sys.regionID
                LIMIT 1
              ), 7) security
        FROM
            mapsolarsystems map_sys INNER JOIN
	        mapconstellations map_con ON
		      map_con.constellationID = map_sys.constellationID INNER JOIN
	        mapregions map_reg ON
		      map_reg.regionID = map_sys.regionID";

    private $whereQuery = "";

    // exclude Jove Space
    private $havingQuery = "HAVING
            security IS NOT NULL";

    private $orderByQuery = "ORDER BY
            system_name";

    private $limitQuery = "";

    /**
     * event handler
     */
    function beforeroute() {

        parent::beforeroute();

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
     * @param $systemId
     * @return null
     */
    protected function _getSystemModelById($systemId){

        // switch DB
        $this->setDB('CCP');


        $this->whereQuery = "WHERE
            map_sys.solarSystemID = " . (int)$systemId . "";

        $this->limitQuery = "Limit 1";

        $query = $this->_getQuery();

        $rows = $this->f3->get('DB')->exec($query, null, 30);

        // format result
        $mapper = new Mapper\CcpSystemsMapper($rows);

        $ccpData = $mapper->getData();

        // switch DB
        $this->setDB('PF');
        $system = Model\BasicModel::getNew('SystemModel');
        $system->setData(reset($ccpData));

        return $system;
    }

    /**
     * Get all static system Data from CCP DB (long cache timer)
     * @return array
     */
    public function getSystems(){

        // switch DB
        $this->setDB('CCP');

        $query = $this->_getQuery();

        $rows = $this->f3->get('DB')->exec($query, null, 60 * 60 * 24);


        // format result
        $mapper = new Mapper\CcpSystemsMapper($rows);

        return $mapper->getData();
    }


    /**
     * search systems by name
     * @param $f3
     * @param $params
     */
    public function search($f3, $params){

        // switch DB
        $this->setDB('CCP');

        $searchToken = '';
        // check for search parameter
        if( array_key_exists( 'arg1', $params) ){
            $searchToken = $params['arg1'];
        }

        $this->whereQuery = "WHERE
            map_sys.solarSystemName LIKE '%" . $searchToken . "%'";

        $query = $this->_getQuery();

        $rows = $f3->get('DB')->exec($query);

        // format result
        $mapper = new Mapper\CcpSystemsMapper($rows);

        $data = $mapper->getData();

        echo json_encode($data);
    }

    /**
     * save a new system to a a map
     * @param $f3
     */
    public function save($f3){

        $newSystemData = [];

        $systemData = (array)$f3->get('POST.systemData');
        $mapData = (array)$f3->get('POST.mapData');

        $map = Model\BasicModel::getNew('MapModel');
        $map->getById($mapData['id']);

        // check if map exists
        if(!$map->dry()){

            $systemData['mapId'] = $map;

            // get static system data (CCP DB)
            $system = $this->_getSystemModelById($systemData['systemId']);
            // set rest of system data
            $system->setData($systemData);
            $system->save();

            $newSystemData = $system->getData();
        }

        echo json_encode($newSystemData);
    }

    /**
     * delete a system and all its connections
     * @param $f3
     */
    public function delete($f3){
        $systemIds = $f3->get('POST.systemIds');

        $user = $this->_getUser();
        $system = Model\BasicModel::getNew('SystemModel');

        foreach($systemIds as $systemId){

            $system->getById($systemId);
            $system->delete($user);

            $system->reset();
        }

        echo json_encode([]);
    }

    /**
     * get system log data from CCP API import
     * system Kills, Jumps,....
     * @param $f3
     */
    public function graphData($f3){
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
                $systemLogModel->getByForeignKey('systemId', $systemId, array(), 60 * 10);

                if(!$systemLogModel->dry()){
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

}





















