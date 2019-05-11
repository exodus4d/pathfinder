<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 20:23
 */

namespace Controller\Api;

use Controller;
use Model\Pathfinder;

class System extends Controller\AccessController {

    // cache keys
    const CACHE_KEY_GRAPH                           = 'CACHED_SYSTEM_GRAPH_%s';

    /**
     * get system graph cache key
     * @param int $systemId
     * @return string
     */
    protected function getSystemGraphCacheKey(int $systemId): string {
        return sprintf(self::CACHE_KEY_GRAPH, 'SYSTEM_' . $systemId);
    }

    /**
     * get system log data from CCP API import
     * system Kills, Jumps,....
     * @param \Base $f3
     * @throws \Exception
     */
    public function graphData(\Base $f3){
        $graphsData = [];
        $systemIds = (array)$f3->get('GET.systemIds');

        // valid response (data found) should be cached by server + client
        $cacheResponse = false;

        // number of log entries in each table per system (24 = 24h)
        $logEntryCount = 24;

        $ttl = 60 * 10;

        // table names with system data
        $logTables = [
            'jumps' => 'SystemJumpModel',
            'shipKills' => 'SystemShipKillModel',
            'podKills' => 'SystemPodKillModel',
            'factionKills' => 'SystemFactionKillModel'
        ];

        foreach($systemIds as $systemId){
            $cacheKey = $this->getSystemGraphCacheKey($systemId);
            if( !$f3->exists($cacheKey, $graphData )){
                $graphData = [];
                $cacheSystem = false;

                foreach($logTables as $label => $ModelClass){
                    $systemLogModel = Pathfinder\AbstractPathfinderModel::getNew($ModelClass);
                    $systemLogExists = false;

                    // 10min cache (could be up to 1h cache time)
                    $systemLogModel->getByForeignKey('systemId', $systemId);
                    if( !$systemLogModel->dry() ){
                        $systemLogExists = true;
                        $cacheSystem = true;
                        $cacheResponse = true;
                    }

                    // podKills share graph with shipKills -> skip
                    if($label != 'podKills'){
                        $graphData[$label]['logExists'] = $systemLogExists;
                    }

                    $counter = 0;
                    for( $i = $logEntryCount; $i >= 1; $i--){
                        $column = 'value' . $i;
                        $value = $systemLogExists ? $systemLogModel->$column : 0;

                        // ship and pod kills should be merged into one table
                        if($label == 'podKills'){
                            $graphData['shipKills']['data'][$counter]['z'] = $value;
                        }else{
                            $dataSet = [
                                'x' => ($i - 1) . 'h',
                                'y' => $value
                            ];
                            $graphData[$label]['data'][] = $dataSet;
                        }
                        $counter++;
                    }
                }
                if($cacheSystem){
                    $f3->set($cacheKey, $graphData, $ttl);
                }
            }else{
                // server cache data exists -> client should cache as well
                $cacheResponse = true;
            }
            $graphsData[$systemId] = $graphData;
        }

        if($cacheResponse){
            // send client cache header
            $f3->expire($ttl);
        }

        echo json_encode($graphsData);
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
                    $response =  $f3->ccpClient()->setWaypoint($systemData['systemId'], $accessToken, $options);

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
     */
    public function pokeRally(\Base $f3){
        $rallyData = (array)$f3->get('POST');
        $systemId = (int)$rallyData['systemId'];
        $return = (object) [];

        if($systemId){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $system Pathfinder\SystemModel
             */
            $system = Pathfinder\AbstractPathfinderModel::getNew('SystemModel');
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

}

