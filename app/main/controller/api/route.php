<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 06.06.15
 * Time: 03:34
 */

namespace Controller\Api;
use Controller;
use Model;


/**
 * Routes controller
 * Class Route
 * @package Controller\Api
 */
class Route extends Controller\AccessController {

    /**
     * cache time for static jump data (e.g. K-Space stargates)
     * @var int
     */
    private $staticJumpDataCacheTime = 86400;

    /**
     * cache time for dynamic jump data (e.g. W-Space systems, Jumpbridges. ...)
     * @var int
     */
    private $dynamicJumpDataCacheTime = 10;

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
     * set jump data for route search
     * -> this function is required for route search! (Don´t forget)
     * @param array $mapIds
     * @param array $filterData
     */
    public function initJumpData($mapIds = [], $filterData = []){
        // add static data (e.g. K-Space stargates,..)
        $this->setStaticJumpData();

        // add map specific data
        $this->setDynamicJumpData($mapIds, $filterData);
    }

    /**
     * set static system jump data for this instance
     * the data is fixed and should not change
     * -> jump data includes JUST "static" connections (Stargates)
     * -> this data is equal for EACH route search (does not depend on map data)
     */
    private function setStaticJumpData(){
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
            $query = "SELECT * FROM system_neighbour";
            $rows = $this->getDB()->exec($query, null, $this->staticJumpDataCacheTime);

            if(count($rows) > 0){
                $this->updateJumpData($rows);

                // static data should be cached
                $f3->set($cacheKeyNamedArray, $this->nameArray, $this->staticJumpDataCacheTime);
                $f3->set($cacheKeyJumpArray, $this->jumpArray, $this->staticJumpDataCacheTime);
                $f3->set($cacheKeyIdArray, $this->idArray, $this->staticJumpDataCacheTime);
            }
        }
    }

    /**
     * set/add dynamic system jump data for specific "mapId"´s
     * -> this data is dynamic and could change on any map change
     * -> (e.g. new system added, connection added/updated, ...)
     * @param array $mapIds
     * @param array $filterData
     */
    private function setDynamicJumpData($mapIds = [], $filterData = []){

        if( !empty($mapIds) ){
            // make sure, mapIds are integers (protect against SQL injections)
            $mapIds = array_map('intval', $mapIds);

            // connection filter --------------------------------------------------------
            $whereQuery = "";
            $includeScopes = [];
            $includeTypes = [];
            $includeEOL = true;

            if( $filterData['stargates'] === true){
                // include "stargates" for search
                $includeScopes[] = 'stargate';
                $includeTypes[] = 'stargate';

            }

            if( $filterData['jumpbridges'] === true ){
                // add jumpbridge connections for search
                $includeScopes[] = 'jumpbridge';
                $includeTypes[] = 'jumpbridge';
            }

            if( $filterData['wormholes'] === true ){
                // add wormhole connections for search
                $includeScopes[] = 'wh';
                $includeTypes[] = 'wh_fresh';


                if( $filterData['wormholesReduced'] === true ){
                    $includeTypes[] = 'wh_reduced';
                }

                if( $filterData['wormholesCritical'] === true ){
                    $includeTypes[] = 'wh_critical';
                }

                if( $filterData['wormholesEOL'] === false ){
                    $includeEOL = false;
                }
            }

            // search connections -------------------------------------------------------

            if( !empty($includeScopes) ){
                $whereQuery .= " `connection`.`scope` IN ('" . implode("', '", $includeScopes) . "') AND ";

                if( !empty($includeTypes) ){
                    $whereQuery .= " `connection`.`type` REGEXP '" . implode("|", $includeTypes) . "' AND ";
                }

                if(!$includeEOL){
                    $whereQuery .= " `connection`.`eolUpdated` IS NULL AND ";
                }

                $query = "SELECT
                        `system_src`.`regionId` regionId,
                        `system_src`.`constellationId` constellationId,
                        `system_src`.`name` systemName,
                        `system_src`.`systemId` systemId,
                        (
                          SELECT
                            GROUP_CONCAT( NULLIF(`system_tar`.`name`, NULL) SEPARATOR ':')
                          FROM
                            `connection` INNER JOIN
                            `system` system_tar ON
                              `system_tar`.`id` = `connection`.`source` OR
                              `system_tar`.`id` = `connection`.`target`
                          WHERE
                            `connection`.`mapId` IN (" . implode(', ', $mapIds) . ") AND
                            `connection`.`active` = 1 AND
                            (
                              `connection`.`source` = `system_src`.`id` OR
                              `connection`.`target` = `system_src`.`id`
                            ) AND
                            " . $whereQuery . "
                            `system_tar`.`id` != `system_src`.`id` AND
                            `system_tar`.`active` = 1
                        ) jumpNodes,
                        `system_src`.`trueSec` trueSec
                    FROM
                        `system` `system_src` INNER JOIN
                        `map` ON
                          `map`.`id` = `system_src`.`mapId`
                    WHERE
                        `system_src`.`mapId` IN (" . implode(', ', $mapIds) . ") AND
                        `system_src`.`active` = 1 AND
                        `map`.`active` = 1
                    HAVING
                        -- skip systems without neighbors (e.g. WHs)
	                    jumpNodes IS NOT NULL
                ";

                $rows = $this->getDB()->exec($query,  null, $this->dynamicJumpDataCacheTime);

                if(count($rows) > 0){
                    // update jump data for this instance
                    $this->updateJumpData($rows);
                }

            }
        }
    }

    /**
     * update jump data for this instance
     * -> data is either coming from CCPs [SDE] OR from map specific data
     * @param array $rows
     */
    private function updateJumpData(&$rows = []){

        foreach($rows as &$row){
            $regionId       = (int)$row['regionId'];
            $constId        = (int)$row['constellationId'];
            $systemName     = strtoupper($row['systemName']);
            $systemId       = (int)$row['systemId'];
            $secStatus      = (float)$row['trueSec'];

            // fill "nameArray" data ----------------------------------------------------
            if( !isset($this->nameArray[$systemId]) ){
                $this->nameArray[$systemId][0] = $systemName;
                $this->nameArray[$systemId][1] = $regionId;
                $this->nameArray[$systemId][2] = $constId;
                $this->nameArray[$systemId][3] = $secStatus;
            }

            // fill "idArray" data ------------------------------------------------------
            if( !isset($this->idArray[$systemName]) ){
                $this->idArray[$systemName] = $systemId;
            }

            // fill "jumpArray" data ----------------------------------------------------
            if( !is_array($this->jumpArray[$systemName]) ){
                $this->jumpArray[$systemName] = [];
            }
            $this->jumpArray[$systemName] = array_merge( explode(':', strtoupper($row['jumpNodes'])), $this->jumpArray[$systemName] );

            // add systemId to end (if not already there)
            if(end($this->jumpArray[$systemName]) != $systemId){
                array_push($this->jumpArray[$systemName],$systemId);
            }
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
        $maxDepth = $M;

        // $P will hold the result path at the end.
        // Remains empty if no path was found.
        $P = [];

        // For each Node ID create a "visit information",
        // initially set as 0 (meaning not yet visited)
        // as soon as we visit a node we will tag it with the "source"
        // so we can track the path when we reach the search target

        $V = [];

        // We are going to keep a list of nodes that are "within reach",
        // initially this list will only contain the start node,
        // then gradually expand (almost like a flood fill)
        $R = [trim($A)];

        $A = trim($A);
        $B = trim($B);

        while(count($R) > 0 && $M > 0){
            $M--;

            $X = trim(array_shift($R));

            if(array_key_exists($X, $G)){
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
                        //return array_reverse($P);
                        return [
                            'path'=> array_reverse($P),
                            'depth' => ($maxDepth - $M)
                        ];
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

        return [
            'path'=> $P,
            'depth' => ($maxDepth - $M)
        ];
    }

    /**
     * find a route between two systems (system names)
     * $searchDepth for recursive route search (5000 would be best but slow)
     * -> in reality there are no routes > 100 jumps between systems
     * @param $systemFrom
     * @param $systemTo
     * @param int $searchDepth
     * @return array
     */
    public function findRoute($systemFrom, $systemTo, $searchDepth = 7000){

        $routeData = [
            'routePossible' => false,
            'routeJumps' => 0,
            'maxDepth' => $searchDepth,
            'depthSearched' => 0,
            'route' => []
        ];

        if(
            !empty($systemFrom) &&
            !empty($systemTo)
        ){

            $from = strtoupper( $systemFrom );
            $to = strtoupper( $systemTo );

            // jump counter
            $jumpNum = 0;
            $depthSearched = 0;

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
                    $searchResult = $this->graph_find_path( $this->jumpArray, $from, $to, $searchDepth );
                    $depthSearched = $searchResult['depth'];
                    foreach( $searchResult['path'] as $systemName ) {
                        if ($jumpNum > 0) {
                            $jumpNode = [
                                'system' => $systemName,
                                'security' => $this->getSystemInfoBySystemId($this->idArray[$systemName], 'trueSec')
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
            $routeData['depthSearched'] = $depthSearched;
        }

        return $routeData;
    }

    /**
     * get key for route cache
     * @param $mapIds
     * @param $systemFrom
     * @param $systemTo
     * @param array $filterData
     * @return string
     */
    private function getRouteCacheKey($mapIds, $systemFrom, $systemTo, $filterData = []){

        $keyParts = [
            implode('_', $mapIds),
            self::formatHiveKey($systemFrom),
            self::formatHiveKey($systemTo)
        ];

        $keyParts += $filterData;
        $key = 'route_' . hash('md5', implode('_', $keyParts));

        return $key;
    }

    /**
     * search multiple route between two systems
     * @param \Base $f3
     */
    public function search($f3){
        $requestData = (array)$f3->get('POST');

        $activeCharacter = $this->getCharacter();

        $return = (object) [];
        $return->error = [];
        $return->routesData = [];

        if( !empty($requestData['routeData']) ){
            $routesData = (array)$requestData['routeData'];

            //  map data where access was already checked -> cached data
            $validMaps = [];

            /**
             * @var $map Model\MapModel
             */
            $map = Model\BasicModel::getNew('MapModel');

            foreach($routesData as $key => $routeData){
                // mapIds are optional. If mapIds is empty or not set
                // route search is limited to CCPs static data
                $mapData = (array)$routeData['mapIds'];
                $mapData = array_flip( array_map('intval', $mapData) );

                // check map access (filter requested mapIDs and format) --------------------
                array_walk($mapData, function(&$item, &$key, $data){

                    if( isset($data[1][$key]) ){
                        // character has mas access -> do not check again
                        $item = $data[1][$key];
                    }else{
                        // check map access for current character
                        $data[0]->getById($key);

                        if( $data[0]->hasAccess($data[2]) ){
                            $item = ['id' => $key, 'name' => $data[0]->name];
                        }else{
                            $item = false;
                        }
                        $data[0]->reset();
                    }

                }, [$map, $validMaps, $activeCharacter]);

                // filter maps with NO access right
                $mapData = array_filter($mapData);
                $mapIds = array_column($mapData, 'id');

                // add map data to cache array
                $validMaps += $mapData;

                // search route with filter options
                $filterData = [
                    'stargates' => (bool) $routeData['stargates'],
                    'jumpbridges' => (bool) $routeData['jumpbridges'],
                    'wormholes' => (bool) $routeData['wormholes'],
                    'wormholesReduced' => (bool) $routeData['wormholesReduced'],
                    'wormholesCritical' => (bool) $routeData['wormholesCritical'],
                    'wormholesEOL' => (bool) $routeData['wormholesEOL']
                ];

                $returnRoutData = [
                    'systemFromData' => $routeData['systemFromData'],
                    'systemToData' => $routeData['systemToData'],
                    'maps' => $mapData,
                    'mapIds' => $mapIds
                ];

                // add filter options for each route as well
                $returnRoutData += $filterData;

                if(count($mapIds) > 0){
                    $systemFrom = $routeData['systemFromData']['name'];
                    $systemTo = $routeData['systemToData']['name'];


                    $cacheKey = $this->getRouteCacheKey(
                        $mapIds,
                        $systemFrom,
                        $systemTo,
                        $filterData
                    );

                    if($f3->exists($cacheKey)){
                        // get data from cache
                        $returnRoutData = $f3->get($cacheKey);
                    }else{
                        // max search depth for search
                        $searchDepth = $f3->get('PATHFINDER.ROUTE.SEARCH_DEPTH');

                        // set jump data for following route search
                        $this->initJumpData($mapIds, $filterData);

                        // no cached route data found
                        $foundRoutData = $this->findRoute($systemFrom, $systemTo, $searchDepth);
                        $returnRoutData = array_merge($returnRoutData, $foundRoutData);

                        // cache if route was found
                        if(
                            isset($returnRoutData['routePossible']) &&
                            $returnRoutData['routePossible'] === true
                        ){
                            $f3->set($cacheKey, $returnRoutData, $this->dynamicJumpDataCacheTime);
                        }
                    }
                }

                $return->routesData[] = $returnRoutData;
            }
        }

        echo json_encode($return);
    }


}













