<?php


namespace Exodus4D\Pathfinder\Controller\Api\Rest;

use Exodus4D\Pathfinder\Lib\Config;
use Exodus4D\Pathfinder\Model\Pathfinder;

class SystemGraph extends AbstractRestController {

    /**
     * cache key for HTTP response
     */
    const CACHE_KEY_GRAPH                           = 'CACHED_SYSTEM_GRAPH_%s';

    /**
     * get graphs data for system(s)
     * @param \Base $f3
     * @param $params
     * @throws \Exception
     */
    public function get(\Base $f3, $params){
        $requestData = $this->getRequestData($f3);
        $systemIds = (array)$requestData['systemIds'];
        $graphsData = [];

        // valid response (data found) should be cached by server + client
        $cacheResponse = false;

        // number of log entries in each table per system (24 = 24h)
        $logEntryCount = Pathfinder\AbstractSystemApiBasicModel::DATA_COLUMN_COUNT;

        $ttl = 60 * 10;

        // table names with system data
        $logTables = [
            'jumps' => 'SystemJumpModel',
            'shipKills' => 'SystemShipKillModel',
            'podKills' => 'SystemPodKillModel',
            'factionKills' => 'SystemFactionKillModel'
        ];

        $exists = false;

        foreach($systemIds as $systemId){
            $cacheKey = $this->getSystemGraphCacheKey($systemId);
            if(!$exists = $f3->exists($cacheKey, $graphData)){
                $graphData = [];
                $cacheSystem = false;

                foreach($logTables as $label => $className){
                    $systemLogModel = Pathfinder\AbstractSystemApiBasicModel::getNew($className);
                    $systemLogExists = false;

                    // 10min cache (could be up to 1h cache time)
                    $systemLogModel->getByForeignKey('systemId', $systemId);
                    if($systemLogModel->valid()){
                        $systemLogExists = true;
                        $cacheSystem = true;
                        $cacheResponse = true;
                    }

                    $systemLogData = $systemLogModel->getData();

                    // podKills share graph with shipKills -> skip
                    if($label != 'podKills'){
                        $graphData[$label]['logExists'] = $systemLogExists;
                        $graphData[$label]['updated'] = $systemLogData->updated;
                    }

                    $logValueCount = range(0, $logEntryCount - 1);
                    foreach($logValueCount as $i){
                        if($label == 'podKills'){
                            $graphData['shipKills']['data'][$i]['z'] = $systemLogData->values[$i];
                        }else{
                            $graphData[$label]['data'][] = [
                                'x' => ($logEntryCount - $i - 1) . 'h',
                                'y' => $systemLogData->values[$i]
                            ];
                        }
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
            $f3->expire(Config::ttlLeft($exists, $ttl));
        }

        $this->out($graphsData);
    }

    // ----------------------------------------------------------------------------------------------------------------

    /**
     * get system graph cache key
     * @param int $systemId
     * @return string
     */
    protected function getSystemGraphCacheKey(int $systemId): string {
        return sprintf(self::CACHE_KEY_GRAPH, 'SYSTEM_' . $systemId);
    }
}