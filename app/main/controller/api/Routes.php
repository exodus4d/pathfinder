<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 06.06.15
 * Time: 03:34
 */

namespace Controller\Api;
use Model;

/**
 * Routes controller
 * Class Routes
 * @package Controller\Api
 */
class Routes extends \Controller\AccessController {

    /**
     * cache time for static jump data
     * @var int
     */
    private $jumpDataCacheTime = 0;

    /**
     * array system information grouped by systemId
     * @var array
     */
    private $nameArray = [];

    /**
     * array neighbour systems grouped by systemName
     * @var array
     */
    private $jumpArray = [];

    /**
     * array withh systemName => systemId matching
     * @var array
     */
    private $idArray = [];


    function __construct() {
        parent::__construct();

        // set cache time for static jump data
        $this->jumpDataCacheTime = 60 * 60 * 24;
    }

    /**
     * set static system jump data for this instance
     * the data is fixed and should not change
     */
    private function setSystemJumpData(){
        $query = "SELECT * FROM system_neighbour";

        $rows = $this->f3->get('DB')->exec($query, null, $this->jumpDataCacheTime);


        foreach($rows as $row){
            $regionId = trim($row['regionId']);
            $constId = trim($row['constellationId']);
            $systemName = strtoupper(trim($row['systemName']));
            $systemId = trim($row['systemId']);
            $secStatus = trim($row['trueSec']);

            $this->nameArray[$systemId][0] = $systemName;
            $this->nameArray[$systemId][1] = $regionId;
            $this->nameArray[$systemId][2] = $constId;
            $this->nameArray[$systemId][3] = $secStatus;

            $this->idArray[strtoupper($systemName)] = $systemId;

            $this->jumpArray[$systemName]= explode(":", strtoupper($row['jumpNodes']));
            array_push($this->jumpArray[$systemName],$systemId);
        }
    }

    /**
     * get system data by systemId and dataName
     * @param $systemId
     * @param $option
     * @return null
     */
    private function getSystemInfoBySystemId($systemId, $option){

        $info = null;

        switch($option){
            case 'systemName':
                $info = $this->nameArray[ $systemId ][0];
                break;
            case 'regionId':
                $info = $this->nameArray[ $systemId ][1];
                break;
            case 'constellationId':
                $info = $this->nameArray[ $systemId ][2];
                break;
            case 'trueSec':
                $info = $this->nameArray[ $systemId ][3];
                break;
        }

        return $info;
    }

    /**
     * find a route between two systems
     * @param $f3
     * @return array
     */
    public function findRoute($f3){
        $parameter = $f3->get('GET');

        $routeData = [
            'routePossible' => false,
            'routeJumps' => 0,
            'route' => []
        ];

        if(
            array_key_exists('from', $parameter) &&
            array_key_exists('to', $parameter)
        ){
            $from = strtoupper( $parameter['from'] );
            $to = strtoupper( $parameter['to'] );

            // set static system jump data
            $this->setSystemJumpData();

            // jump counter
            $jumpNum = 0;

            // check if the system we are looking for is a direct neighbour
            foreach( $this->jumpArray[$from] as $n ) {

                if ($n == $to) {
                    $jumpNum = 2;

                    $jumpNode = [
                        'system' => $n,
                        'security' => $this->getSystemInfoBySystemId($this->idArray[$n], 'trueSec')
                    ];

                    $routeData['route'][] = $jumpNode;
                    break;
                }
            }

            // system is not a direct neighbour -> search recursive its neighbours
            if ($jumpNum == 0) {
                foreach( $this->graph_find_path( $this->jumpArray, $from, $to ) as $n ) {
                    if ($jumpNum > 0) {

                        $jumpNode = [
                            'system' => $n,
                            'security' => $this->getSystemInfoBySystemId($this->idArray[$n], 'trueSec')
                        ];

                        $routeData['route'][] = $jumpNode;
                    }
                    $jumpNum++;
                }
            }

            if ($jumpNum > 0) {
                // route found
                $routeData['routePossible'] = true;

                $jumpNode = [
                    'system' => $from,
                    'security' => $this->getSystemInfoBySystemId($this->idArray[$from], 'trueSec')
                ];

                // insert "from" system on top
                array_unshift($routeData['route'], $jumpNode);
            } else {
                // route not found
                $routeData['routePossible'] = true;
            }

            // route jumps
            $routeData['routeJumps'] = $jumpNum - 1;
        }

        return $routeData;
    }

    /**
     * recursive search function within a undirected graph
     * @param $G
     * @param $A
     * @param $B
     * @param int $M
     * @return array
     */
    private function graph_find_path(&$G, $A, $B, $M = 50000){
        // $P will hold the result path at the end.
        // Remains empty if no path was found.
        $P = array();

        // For each Node ID create a "visit information",
        // initially set as 0 (meaning not yet visited)
        // as soon as we visit a node we will tag it with the "source"
        // so we can track the path when we reach the search target

        $V = array();

        // We are going to keep a list of nodes that are "within reach",
        // initially this list will only contain the start node,
        // then gradually expand (almost like a flood fill)
        $R = array(trim($A));

        $A = trim($A);
        $B = trim($B);

        while(count($R) > 0 && $M > 0){
            $M--;

			$X = trim(array_shift($R));

            if( array_key_exists($X, $G) ){
                foreach($G[$X] as $Y){
                    $Y = trim($Y);
                    // See if we got a solution
                    if($Y == $B){
                        // We did? Construct a result path then
                        array_push($P, $B);
                        array_push($P, $X);
                        while($V[$X] != $A){
                            array_push($P, trim($V[$X]));
                            $X = $V[$X];
                        }
                        array_push($P, $A);
                        return array_reverse($P);
                    }
                    // First time we visit this node?
                    if(!array_key_exists($Y, $V)){
                        // Store the path so we can track it back,
                        $V[$Y] = $X;
                        // and add it to the "within reach" list
                        array_push($R, $Y);
                    }
                }
            }
		  }

        return $P;
    }

    /**
     * this funcion is just for setting up the cache table 'system_neighbour' which is used
     * for system jump calculation. Call this function manually if CCP adds Systems/Stargates
     */
    private function setupSystemJumpTable(){

        // switch DB
        $this->setDB('CCP');

        $query = "SELECT
                map_sys.solarSystemID system_id,
                map_sys.regionID region_id,
                map_sys.constellationID constellation_id,
                map_sys.solarSystemName system_name,
                ROUND( map_sys.security, 2) system_security,
                (
                    SELECT
                        GROUP_CONCAT( NULLIF(map_sys_inner.solarSystemName, NULL) SEPARATOR ':')
                    FROM
                        mapsolarsystemjumps map_jump INNER JOIN
                        mapsolarsystems map_sys_inner ON
                            map_sys_inner.solarSystemID = map_jump.toSolarSystemID
                    WHERE
                        map_jump.fromSolarSystemID = map_sys.solarSystemID
                ) system_neighbours
            FROM
                mapsolarsystems map_sys
            HAVING
              -- skip systems without neighbors (e.g. WHs)
	          system_neighbours IS NOT NULL
            ";

        $rows = $this->f3->get('DB')->exec($query);

        if(count($rows) > 0){
            // switch DB back to pathfinder DB
            $this->setDB();

            // clear cache table
            $query = "TRUNCATE system_neighbour";
            $this->f3->get('DB')->exec($query);

            foreach($rows as $row){
                $this->f3->get('DB')->exec("
              INSERT INTO
                system_neighbour(
                  regionId,
                  constellationId,
                  systemName,
                  systemId,
                  jumpNodes,
                  trueSec
                  )
              VALUES(
                :regionId,
                :constellationId,
                :systemName,
                :systemId,
                :jumpNodes,
                :trueSec
            )",
                    [
                        ':regionId' => $row['region_id'],
                        ':constellationId' => $row['constellation_id'],
                        ':systemName' => $row['system_name'],
                        ':systemId' => $row['system_id'],
                        ':jumpNodes' => $row['system_neighbours'],
                        ':trueSec' => $row['system_security']
                    ]);
            }
        }
    }

}













