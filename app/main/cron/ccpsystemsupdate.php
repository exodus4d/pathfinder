<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.03.15
 * Time: 21:31
 */

namespace Cron;
use Controller;
use DB;
use lib\Config;

class CcpSystemsUpdate {

    const LOG_TEXT = '%s prepare table (%.3F s), jump (%.3F s), kill (%.3F s), update all (%.3F s)';

    protected  $apiRequestOptions = [
        'timeout' => 5,
        'follow_location' => false // otherwise CURLOPT_FOLLOWLOCATION will fail
    ];

    /**
     * table names for all system log tables
     * @var array
     */
    protected $logTables = [
        'jumps' => 'system_jumps',
        'shipKills' => 'system_kills_ships',
        'podKills' => 'system_kills_pods',
        'factionKills' => 'system_kills_factions'
    ];

    /**
     * check all system log tables for the correct number of system entries that will be locked
     * @return array
     */
    private function prepareSystemLogTables(){

        // get information for all systems from CCP DB
        $systemController = new Controller\Api\System();
        $systemsData = $systemController->getSystems();

        $pfDB = DB\Database::instance()->getDB('PF');

        // insert systems into each log table if not exist
        $pfDB->begin();
        foreach($this->logTables as $tableName){

            // insert systems into jump log table
            $sqlInsertSystem = "INSERT IGNORE INTO " . $tableName . " (systemId)
                    VALUES(:systemId)";

            foreach($systemsData as $systemData){
                // skip WH systems -> no jump data available
                if($systemData['type']['name'] == 'k-space'){
                    $pfDB->exec($sqlInsertSystem, array(
                        ':systemId' => $systemData['systemId']
                    ), 0, false);
                }
            }

        }
        $pfDB->commit();

        return $systemsData;
    }


    /**
     * imports all relevant map stats from CCPs API
     * >> php index.php "/cron/importSystemData"
     * @param \Base $f3
     */
    function importSystemData($f3){

        $time_start = microtime(true);
        // prepare system jump log table
        $systemsData = $this->prepareSystemLogTables();
        $time_end = microtime(true);
        $execTimePrepareSystemLogTables = $time_end - $time_start;

        $pfDB = DB\Database::instance()->getDB('PF');

        // get current jump Data -------------------------------------------------------
        $time_start = microtime(true);
        $apiPath = Config::getEnvironmentData('CCP_XML') . '/map/Jumps.xml.aspx';

        $apiResponse = \Web::instance()->request($apiPath, $this->apiRequestOptions );

        $jumpData = [];
        $updateJumps = false;
        if($apiResponse['body']){
            $xml = simplexml_load_string($apiResponse['body']);
            $rowApiData = $xml->result->rowset;

            foreach($rowApiData->children() as $systemApiData){
                $attributeApiData = $systemApiData->attributes();
                $systemId = $attributeApiData->solarSystemID->__toString();
                $shipJumps =$attributeApiData->shipJumps->__toString();

                $jumpData[$systemId] = $shipJumps;
            }

            $updateJumps = true;
        }
        $time_end = microtime(true);
        $execTimeGetJumpData = $time_end - $time_start;

        // get current kill Data -------------------------------------------------------
        $time_start = microtime(true);
        $apiPath = Config::getEnvironmentData('CCP_XML') . '/map/Kills.xml.aspx';

        $apiResponse = \Web::instance()->request($apiPath, $this->apiRequestOptions );
        $killData = [];
        $updateKills = false;
        if($apiResponse['body']){
            $xml = simplexml_load_string($apiResponse['body']);
            $rowApiData = $xml->result->rowset;
            foreach($rowApiData->children() as $systemApiData){
                $attributeApiData = $systemApiData->attributes();
                $systemId = $attributeApiData->solarSystemID->__toString();
                $shipKills =$attributeApiData->shipKills->__toString();
                $podKills =$attributeApiData->podKills->__toString();
                $factionKills =$attributeApiData->factionKills->__toString();

                $killData[$systemId] = [
                    'shipKills' => $shipKills,
                    'podKills' => $podKills,
                    'factionKills' => $factionKills,
                ];
            }

            $updateKills = true;

        }
        $time_end = microtime(true);
        $execTimeGetKillData = $time_end - $time_start;

        // update system log tables -----------------------------------------------------
        $time_start = microtime(true);
        // make sure last update is (at least) 1h ago
        $pfDB->begin();

        foreach($this->logTables as $key => $tableName){
            $sql = "UPDATE
                    " . $tableName . "
                SET
                    updated = now(),
                    value24 = value23,
                    value23 = value22,
                    value22 = value21,
                    value21 = value20,
                    value20 = value19,
                    value19 = value18,
                    value18 = value17,
                    value17 = value16,
                    value16 = value15,
                    value15 = value14,
                    value14 = value13,
                    value13 = value12,
                    value12 = value11,
                    value11 = value10,
                    value10 = value9,
                    value9 = value8,
                    value8 = value7,
                    value7 = value6,
                    value6 = value5,
                    value5 = value4,
                    value4 = value3,
                    value3 = value2,
                    value2 = value1,
                    value1 = :value
                WHERE
                  systemId = :systemId
                ";

            foreach($systemsData as $systemData){

                if(
                    $key == 'jumps' &&
                    $updateJumps
                ){
                    // update jump data (if available)
                    $currentJumps = 0;
                    if(array_key_exists($systemData['systemId'], $jumpData)){
                        $currentJumps = $jumpData[$systemData['systemId']];
                    }

                    $pfDB->exec($sql, array(
                        ':systemId' => $systemData['systemId'],
                        ':value' => $currentJumps
                    ), 0, false);
                }else if($updateKills){

                    // update kill data (if available)
                    $currentKills = 0;
                    if(array_key_exists($systemData['systemId'], $killData)){
                        $currentKillData = $killData[$systemData['systemId']];

                        $currentKills = $currentKillData[$key];
                    }

                    $pfDB->exec($sql, array(
                        ':systemId' => $systemData['systemId'],
                        ':value' => $currentKills
                    ), 0, false);
                }
            }
        }
        $pfDB->commit();

        $time_end = microtime(true);
        $execTimeUpdateTables = $time_end - $time_start;

        // Log ------------------------
        $log = Controller\LogController::getLogger('cron_' . __FUNCTION__);
        $log->write( sprintf(self::LOG_TEXT, __FUNCTION__, $execTimePrepareSystemLogTables, $execTimeGetJumpData, $execTimeGetKillData, $execTimeUpdateTables) );
    }
} 