<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 06.06.15
 * Time: 03:34
 */

namespace Controller\Api;

use Controller;
use Controller\Ccp\Universe;
use lib\Config;
use Model\Pathfinder;

/**
 * Routes controller
 * Class Route
 * @package Controller\Api
 */
class Route extends Controller\AccessController {

    /**
     * route search depth
     */
    const ROUTE_SEARCH_DEPTH_DEFAULT = 1;

    /**
     * ESI route search can handle max 100 custom connections
     * -> each connection has a A->B and B->A entry. So we have 50 "real connections"
     */
    const MAX_CONNECTION_COUNT  = 100;

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
     * array with systemName => systemId matching
     * @var array
     */
    private $idArray = [];

    /**
     * template for routeData payload
     * @var array
     */
    private $defaultRouteData = [
        'routePossible' => false,
        'routeJumps' => 0,
        'maxDepth' => self::ROUTE_SEARCH_DEPTH_DEFAULT,
        'depthSearched' => 0,
        'searchType' => '',
        'route' => [],
        'error' => ''
    ];

    /**
     * reset all jump data
     */
    protected function resetJumpData(){
        $this->nameArray = [];
        $this->jumpArray = [];
        $this->idArray = [];
    }

    /**
     * set static system jump data for this instance
     * the data is fixed and should not change
     * -> jump data includes JUST "static" connections (Stargates)
     * -> this data is equal for EACH route search (does not depend on map data)
     */
    private function setStaticJumpData(){
        $query = "SELECT * FROM system_neighbour";
        $rows = $this->getDB()->exec($query, null, $this->staticJumpDataCacheTime);

        if(count($rows) > 0){
            array_walk($rows, function(&$row){
                $row['jumpNodes'] = array_map('intval', explode(':', $row['jumpNodes']));
            });
            $this->updateJumpData($rows);
        }
    }

    /**
     * set/add dynamic system jump data for specific "mapId"´s
     * -> this data is dynamic and could change on any map change
     * -> (e.g. new system added, connection added/updated, ...)
     * @param array $mapIds
     * @param array $filterData
     * @throws \Exception
     */
    private function setDynamicJumpData($mapIds = [], $filterData = []){
        // make sure, mapIds are integers (protect against SQL injections)
        $mapIds = array_unique( array_map('intval', $mapIds), SORT_NUMERIC);

        if( !empty($mapIds) ){
            // map filter ---------------------------------------------------------------------------------------------
            $whereMapIdsQuery = (count($mapIds) == 1) ? " = " . reset($mapIds) : " IN (" . implode(', ', $mapIds) . ")";

            // connection filter --------------------------------------------------------------------------------------
            $whereQuery = "";
            $includeScopes = [];
            $includeTypes = [];
            $excludeTypes = [];
            $includeEOL = true;

            $excludeEndpointTypes = [];

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

                if(!empty($filterData['excludeTypes'])){
                    $excludeTypes = $filterData['excludeTypes'];
                }
            }

            if( $filterData['endpointsBubble'] !== true ){
                $excludeEndpointTypes[] = 'bubble';
            }

            // search connections -------------------------------------------------------------------------------------

            if( !empty($includeScopes) ){
                $whereQuery .= " `connection`.`scope` IN ('" . implode("', '", $includeScopes) . "') AND ";

                if( !empty($excludeTypes) ){
                    $whereQuery .= " `connection`.`type` NOT REGEXP '" . implode("|", $excludeTypes) . "' AND ";
                }

                if( !empty($includeTypes) ){
                    $whereQuery .= " `connection`.`type` REGEXP '" . implode("|", $includeTypes) . "' AND ";
                }

                if(!$includeEOL){
                    $whereQuery .= " `connection`.`eolUpdated` IS NULL AND ";
                }

                if( !empty($excludeEndpointTypes) ){
                    $whereQuery .= " CONCAT_WS(' ', `connection`.`sourceEndpointType`, `connection`.`targetEndpointType`) ";
                    $whereQuery .= " NOT REGEXP '" . implode("|", $excludeEndpointTypes) . "' AND ";
                }

                $query = "SELECT 
                            `system_src`.`systemId` systemSourceId,
                            `system_tar`.`systemId` systemTargetId
                          FROM
                            `connection` INNER JOIN
                            `map` ON
                              `map`.`id` = `connection`.`mapId` AND 
                              `map`.`active` = 1 INNER JOIN
                            `system` `system_src` ON 
                              `system_src`.`id` = `connection`.`source` AND
                              `system_src`.`active` = 1 INNER JOIN
                            `system` `system_tar` ON 
                              `system_tar`.`id` = `connection`.`target` AND
                              `system_tar`.`active` = 1
                          WHERE
                              " . $whereQuery . "
                              `connection`.`active` = 1 AND 
                              `connection`.`mapId` " . $whereMapIdsQuery . "
                              ";

                $rows = $this->getDB()->exec($query,  null, $this->dynamicJumpDataCacheTime);

                if(count($rows) > 0){
                    $jumpData = [];
                    $universe = new Universe();

                    /**
                     * enrich dynamic jump data with static system data (from universe DB)
                     * @param array $row
                     * @param string $systemSourceKey
                     * @param string $systemTargetKey
                     */
                    $enrichJumpData = function(array &$row, string $systemSourceKey, string $systemTargetKey) use (&$jumpData, &$universe) {
                        if(
                            !array_key_exists($row[$systemSourceKey], $jumpData) &&
                            !is_null($staticData = $universe->getSystemData($row[$systemSourceKey]))
                        ){
                            $jumpData[$row[$systemSourceKey]] = [
                                'systemId' => (int)$row[$systemSourceKey],
                                'systemName' => $staticData->name,
                                'constellationId' => $staticData->constellation->id,
                                'regionId' => $staticData->constellation->region->id,
                                'trueSec' => $staticData->trueSec,
                            ];
                        }

                        if( !in_array($row[$systemTargetKey], (array)$jumpData[$row[$systemSourceKey]]['jumpNodes']) ){
                            $jumpData[$row[$systemSourceKey]]['jumpNodes'][] = (int)$row[$systemTargetKey];
                        }
                    };

                    for($i = 0; $i < count($rows); $i++){
                        $enrichJumpData($rows[$i],  'systemSourceId', 'systemTargetId');
                        $enrichJumpData($rows[$i],  'systemTargetId', 'systemSourceId');
                    }

                    // update jump data for this instance
                    $this->updateJumpData($jumpData);
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
            $systemName     = (string)($row['systemName']);
            $systemId       = (int)$row['systemId'];
            $secStatus      = (float)$row['trueSec'];

            // fill "nameArray" data ----------------------------------------------------------------------------------
            if( !isset($this->nameArray[$systemId]) ){
                $this->nameArray[$systemId][0] = $systemName;
                $this->nameArray[$systemId][1] = $regionId;
                $this->nameArray[$systemId][2] = $constId;
                $this->nameArray[$systemId][3] = $secStatus;
            }

            // fill "idArray" data ------------------------------------------------------------------------------------
            if( !isset($this->idArray[$systemId]) ){
                $this->idArray[$systemId] = $systemName;
            }

            // fill "jumpArray" data ----------------------------------------------------------------------------------
            if( !is_array($this->jumpArray[$systemId]) ){
                $this->jumpArray[$systemId] = [];
            }
            $this->jumpArray[$systemId] = array_merge($row['jumpNodes'], $this->jumpArray[$systemId]);

            // add systemName to end (if not already there)
            if(end($this->jumpArray[$systemId]) != $systemName){
                array_push($this->jumpArray[$systemId], $systemName);
            }
        }
    }

    /**
     * filter systems (remove some systems) e.g. WH,LS,0.0 for "secure search"
     * @param array $filterData
     * @param array $keepSystems
     */
    private function filterJumpData($filterData = [], $keepSystems = []){
        if($filterData['flag'] == 'secure'){
            // remove all systems (TrueSec < 0.5) from search arrays
            $this->jumpArray = array_filter($this->jumpArray, function($systemId) use ($keepSystems) {
                $systemNameData = $this->nameArray[$systemId];
                $systemSec = $systemNameData[3];

                if(
                    $systemSec < 0.45 &&
                    !in_array($systemId, $keepSystems) &&
                    !preg_match('/^j\d+$/i', $this->idArray[$systemId]) // WHs are supposed to be "secure"
                ){
                    // remove system from nameArray and idArray
                    unset($this->nameArray[$systemId]);
                    unset($this->idArray[$systemId]);
                    return false;
                }else{
                    return true;
                }
            }, ARRAY_FILTER_USE_KEY );
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
                $info = $this->nameArray[$systemId][0];
                break;
            case 'regionId':
                $info = $this->nameArray[$systemId][1];
                break;
            case 'constellationId':
                $info = $this->nameArray[$systemId][2];
                break;
            case 'trueSec':
                $info = $this->nameArray[$systemId][3];
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
     * get formatted jump node data
     * @param int $systemId
     * @return array
     */
    protected function getJumpNodeData(int $systemId) : array {
        return [
            'system' => $this->getSystemInfoBySystemId($systemId, 'systemName'),
            'security' => $this->getSystemInfoBySystemId($systemId, 'trueSec')
        ];
    }

    /**
     * search root between two systemIds
     * -> function searches over ESI API, as fallback a custom search algorithm is used (no ESI)
     * @param int $systemFromId
     * @param int $systemToId
     * @param int $searchDepth
     * @param array $mapIds
     * @param array $filterData
     * @return array
     * @throws \Exception
     */
    public function searchRoute(int $systemFromId, int $systemToId, $searchDepth = 0, array $mapIds = [], array $filterData = []) : array {
        // search root by ESI API
        $routeData = $this->searchRouteESI($systemFromId, $systemToId, $searchDepth, $mapIds, $filterData);

        // Endpoint return http:404 in case no route find (e.g. from inside a wh)
        // we thread that error "no route found" as a valid response! -> no fallback to custom search
        if( !empty($routeData['error']) && strtolower($routeData['error']) !== 'no route found' ){
            // ESI route search has errors -> fallback to custom search implementation
            $routeData = $this->searchRouteCustom($systemFromId, $systemToId, $searchDepth, $mapIds, $filterData);
        }

        return $routeData;
    }

    /**
     * uses a custom search algorithm to fine a route
     * @param int $systemFromId
     * @param int $systemToId
     * @param int $searchDepth
     * @param array $mapIds
     * @param array $filterData
     * @return array
     * @throws \Exception
     */
    private function searchRouteCustom(int $systemFromId, int $systemToId, $searchDepth = 0, array $mapIds = [], array $filterData = []) : array {
        // reset all previous set jump data
        $this->resetJumpData();

        $searchDepth = $searchDepth ? $searchDepth : Config::getPathfinderData('route.search_depth');

        $routeData = $this->defaultRouteData;
        $routeData['maxDepth'] = $searchDepth;
        $routeData['searchType'] = 'custom';

        if($systemFromId && $systemToId){
            // prepare search data ------------------------------------------------------------------------------------
            // add static data (e.g. K-Space stargates,..)
            $this->setStaticJumpData();

            // add map specific data
            $this->setDynamicJumpData($mapIds, $filterData);

            // filter jump data (e.g. remove some systems (0.0, LS)
            // --> don´t filter some systems (e.g. systemFrom, systemTo) even if they are are WH,LS,0.0
            $this->filterJumpData($filterData, [$systemFromId, $systemToId]);

            // search route -------------------------------------------------------------------------------------------

            // jump counter
            $jumpNum = 0;
            $depthSearched = 0;

            if( isset($this->jumpArray[$systemFromId]) ){
                // check if the system we are looking for is a direct neighbour
                foreach( $this->jumpArray[$systemFromId] as $n ) {
                    if ($n == $systemToId) {
                        $jumpNum = 2;
                        $routeData['route'][] = $this->getJumpNodeData($n);
                        break;
                    }
                }

                // system is not a direct neighbour -> search recursive its neighbours
                if ($jumpNum == 0) {
                    $searchResult = $this->graph_find_path( $this->jumpArray, $systemFromId, $systemToId, $searchDepth );
                    $depthSearched = $searchResult['depth'];
                    foreach( $searchResult['path'] as $systemId ) {
                        if ($jumpNum > 0) {
                            $routeData['route'][] = $this->getJumpNodeData($systemId);
                        }
                        $jumpNum++;
                    }
                }

                if ($jumpNum > 0) {
                    // route found
                    $routeData['routePossible'] = true;
                    // insert "from" system on top
                    array_unshift($routeData['route'], $this->getJumpNodeData($systemFromId));
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
     * uses ESI route search endpoint to fine a route
     * @param int $systemFromId
     * @param int $systemToId
     * @param int $searchDepth
     * @param array $mapIds
     * @param array $filterData
     * @return array
     * @throws \Exception
     */
    private function searchRouteESI(int $systemFromId, int $systemToId, int $searchDepth = 0, array $mapIds = [], array $filterData = []) : array {
        // reset all previous set jump data
        $this->resetJumpData();

        $searchDepth = $searchDepth ? $searchDepth : Config::getPathfinderData('route.search_depth');

        $routeData = $this->defaultRouteData;
        $routeData['maxDepth'] = $searchDepth;
        $routeData['searchType'] = 'esi';

        if($systemFromId && $systemToId){
            // ESI route search can only handle 50 $connections (100 entries)
            // we  want to add NON stargate connections ONLY for ESI route search
            // because ESI will use them anyways!
            $filterData['stargates'] = false;

            // prepare search data ------------------------------------------------------------------------------------

            // add map specific data
            $this->setDynamicJumpData($mapIds, $filterData);

            // filter jump data (e.g. remove some systems (0.0, LS)
            // --> don´t filter some systems (e.g. systemFrom, systemTo) even if they are are WH,LS,0.0
            $this->filterJumpData($filterData, [$systemFromId, $systemToId]);

            $connections = [];
            foreach($this->jumpArray as $systemSourceId => $jumpData){
                $count = count($jumpData);
                if($count > 1){
                    // ... should always > 1
                    // loop all connections for current source system
                    foreach($jumpData as $systemTargetId) {
                        // skip last entry
                        if(--$count <= 0){
                            break;
                        }

                        // systemIds exist and wer not removed before in filterJumpData()
                        if($systemSourceId && $systemTargetId){
                            $jumpNode = [$systemSourceId, $systemTargetId];
                            // jumpNode must be unique for ESI,
                            // ... there can be multiple connections between same systems in Pathfinder
                            if(!in_array($jumpNode, $connections)){
                                $connections[] = [$systemSourceId, $systemTargetId];
                                // check if connections limit is reached
                                if(count($connections) >= self::MAX_CONNECTION_COUNT){
                                    // ESI API limit for custom "connections"
                                    break 2;
                                }
                            }
                        }
                    }
                }
            }

            // search route -------------------------------------------------------------------------------------------
            $options = [
                'flag' => $filterData['flag'],
                'connections' => $connections
            ];

            $result = $this->getF3()->ccpClient()->getRouteData($systemFromId, $systemToId, $options);

            // format result ------------------------------------------------------------------------------------------

            // jump counter
            $jumpNum = 0;
            $depthSearched = 0;
            if( !empty($result['error']) ){
                $routeData['error'] = $result['error'];
            }elseif( !empty($result['route']) ){
                $jumpNum = count($result['route']) - 1;

                // check max search depth
                if($jumpNum <= $routeData['maxDepth']){
                    $depthSearched = $jumpNum;

                    $routeData['routePossible'] = true;

                    // Now (after search) we have to "add" static jump data information
                    $this->setStaticJumpData();

                    foreach($result['route'] as $systemId){
                        $routeData['route'][] = $this->getJumpNodeData($systemId);
                    }
                }else{
                    $depthSearched = $routeData['maxDepth'];
                }
            }

            // route jumps
            $routeData['routeJumps'] = $jumpNum;
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
     * @throws \Exception
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
             * @var $map Pathfinder\MapModel
             */
            $map = Pathfinder\AbstractPathfinderModel::getNew('MapModel');

            // limit max search routes to max limit
            array_splice($routesData, Config::getPathfinderData('route.limit'));

            foreach($routesData as $key => $routeData){
                // mapIds are optional. If mapIds is empty or not set
                // route search is limited to CCPs static data
                $mapData = (array)$routeData['mapIds'];
                $mapData = array_flip( array_map('intval', $mapData) );

                // check map access (filter requested mapIDs and format) ----------------------------------------------
                array_walk($mapData, function(&$item, &$key, $data){
                    /**
                     * @var Pathfinder\MapModel $data[0]
                     */
                    if( isset($data[1][$key]) ){
                        // character has map access -> do not check again
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
                    'stargates'             => (bool) $routeData['stargates'],
                    'jumpbridges'           => (bool) $routeData['jumpbridges'],
                    'wormholes'             => (bool) $routeData['wormholes'],
                    'wormholesReduced'      => (bool) $routeData['wormholesReduced'],
                    'wormholesCritical'     => (bool) $routeData['wormholesCritical'],
                    'wormholesEOL'          => (bool) $routeData['wormholesEOL'],
                    'wormholesSizeMin'      => (string) $routeData['wormholesSizeMin'],
                    'excludeTypes'          => (array) $routeData['excludeTypes'],
                    'endpointsBubble'       => (bool) $routeData['endpointsBubble'],
                    'flag'                  => $routeData['flag']
                ];

                $returnRoutData = [
                    'systemFromData'        => $routeData['systemFromData'],
                    'systemToData'          => $routeData['systemToData'],
                    'skipSearch'            => (bool) $routeData['skipSearch'],
                    'maps'                  => $mapData,
                    'mapIds'                => $mapIds
                ];

                // add filter options for each route as well
                $returnRoutData += $filterData;

                if(
                    !$returnRoutData['skipSearch'] &&
                    count($mapIds) > 0
                ){
                    $systemFrom     = $routeData['systemFromData']['name'];
                    $systemFromId   = (int)$routeData['systemFromData']['systemId'];
                    $systemTo       = $routeData['systemToData']['name'];
                    $systemToId     = (int)$routeData['systemToData']['systemId'];

                    $cacheKey = $this->getRouteCacheKey(
                        $mapIds,
                        $systemFrom,
                        $systemTo,
                        $filterData
                    );

                    if($f3->exists($cacheKey, $cachedData)){
                        // get data from cache
                        $returnRoutData = $cachedData;
                    }else{
                        $foundRoutData = $this->searchRoute($systemFromId, $systemToId, 0, $mapIds, $filterData);

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













