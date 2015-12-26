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
 * Class Route
 * @package Controller\Api
 */
class Route extends \Controller\AccessController {

    /**
     * cache time for static jump data
     * @var int
     */
    private $jumpDataCacheTime = 86400;

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

    /**
     * set static system jump data for this instance
     * the data is fixed and should not change
     */
    private function setSystemJumpData(){
        $cacheKey = 'staticJumpData';

        $f3 = $this->getF3();

        $cacheKeyNamedArray = $cacheKey . '.nameArray';
        $cacheKeyJumpArray = $cacheKey . '.jumpArray';
        $cacheKeyIdArray = $cacheKey . '.idArray';

        if(
            $f3->exists($cacheKeyNamedArray) &&
            $f3->exists($cacheKeyJumpArray) &&
            $f3->exists($cacheKeyIdArray)
        ){
            // get cached values

            $this->nameArray = $f3->get($cacheKeyNamedArray);
            $this->jumpArray = $f3->get($cacheKeyJumpArray);
            $this->idArray = $f3->get($cacheKeyIdArray);
        }else{
            // nothing cached

            $pfDB = $this->getDB('PF');

            $query = "SELECT * FROM system_neighbour";

            $rows = $pfDB->exec($query, null, $this->jumpDataCacheTime);

            foreach($rows as $row){
                $regionId = $row['regionId'];
                $constId = $row['constellationId'];
                $systemName = strtoupper($row['systemName']);
                $systemId = $row['systemId'];
                $secStatus = $row['trueSec'];

                $this->nameArray[$systemId][0] = $systemName;
                $this->nameArray[$systemId][1] = $regionId;
                $this->nameArray[$systemId][2] = $constId;
                $this->nameArray[$systemId][3] = $secStatus;

                $this->idArray[strtoupper($systemName)] = $systemId;

                $this->jumpArray[$systemName]= explode(":", strtoupper($row['jumpNodes']));
                array_push($this->jumpArray[$systemName],$systemId);
            }

            $f3->set($cacheKeyNamedArray, $this->nameArray, $this->jumpDataCacheTime);
            $f3->set($cacheKeyJumpArray, $this->jumpArray, $this->jumpDataCacheTime);
            $f3->set($cacheKeyIdArray, $this->idArray, $this->jumpDataCacheTime);
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
     * This function is just for setting up the cache table 'system_neighbour' which is used
     * for system jump calculation. Call this function manually if CCP adds Systems/Stargates
     */
/*
    private function setupSystemJumpTable(){

        $pfDB = $this->getDB('PF');
        $ccpDB = $this->getDB('CCP');

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
                        mapSolarSystemJumps map_jump INNER JOIN
                        mapSolarSystems map_sys_inner ON
                            map_sys_inner.solarSystemID = map_jump.toSolarSystemID
                    WHERE
                        map_jump.fromSolarSystemID = map_sys.solarSystemID
                ) system_neighbours
            FROM
                mapSolarSystems map_sys
            HAVING
              -- skip systems without neighbors (e.g. WHs)
	          system_neighbours IS NOT NULL
            ";

        $rows = $ccpDB->exec($query);

        if(count($rows) > 0){
            // switch DB back to pathfinder DB

            // clear cache table
            $query = "TRUNCATE system_neighbour";
            $pfDB->exec($query);

            foreach($rows as $row){
                $pfDB->exec("
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
*/
    /**
     * find a route between two systems (system names)
     * $searchDepth for recursive route search (5000 would be best but slow)
     * -> in reality there are no routes > 100 jumps between systems
     * @param $systemFrom
     * @param $systemTo
     * @param int $searchDepth
     * @return array
     */
    public function findRoute($systemFrom, $systemTo, $searchDepth = 5000){

        $routeData = [
            'routePossible' => false,
            'routeJumps' => 0,
            'route' => []
        ];

        if(
            !empty($systemFrom) &&
            !empty($systemTo)
        ){

            $this->setSystemJumpData();

            $from = strtoupper( $systemFrom );
            $to = strtoupper( $systemTo );

            // jump counter
            $jumpNum = 0;

            if( isset($this->jumpArray[$from]) ){


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
                    foreach( $this->graph_find_path( $this->jumpArray, $from, $to, $searchDepth ) as $n ) {

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
                    $routeData['routePossible'] = false;
                }
            }

            // route jumps
            $routeData['routeJumps'] = $jumpNum - 1;
        }

        return $routeData;
    }

    /**
     * search multiple route between two systems
     * @param $f3
     */
    public function search($f3){
        $routesData = $data = (array)$f3->get('POST.routeData');

        $return = (object) [];
        $return->error = [];
        $return->routesData = [];

        foreach($routesData as $routeData){
            $cacheKey = self::formatHiveKey($routeData['systemFrom']) . '_' . self::formatHiveKey($routeData['systemTo']);

            if($f3->exists($cacheKey)){
                // get data from cache
                $return->routesData[] = $f3->get($cacheKey);
            }else{
                // no cached route data found
                $foundRoutData = $this->findRoute($routeData['systemFrom'], $routeData['systemTo']);

                // cache if route was found
                if(
                    isset($foundRoutData['routePossible']) &&
                    $foundRoutData['routePossible'] === true
                ){
                    $f3->set($cacheKey, $foundRoutData, $this->jumpDataCacheTime);
                }

                $return->routesData[] = $foundRoutData;
            }

        }

        echo json_encode($return);
    }



}













