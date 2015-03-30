<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.03.15
 * Time: 21:31
 */

namespace Controller\Cron;

class Update extends \Controller\Controller {

    protected  $apiRequestOptions = [
        'timeout' => 5
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
     * event handler
     */
    function beforeroute() {

        // controller access allowed for CLI-mode (command line)
        if(php_sapi_name() != 'cli'){
            $this->f3->error(401, 'Cronjob: unauthorized access');
        }

        // set linebreak for status output
        define('LNBR', PHP_EOL);

        parent::beforeroute();
    }

    /**
     * check all system log tables for the correct number of system entries that will be locked
     * @return array
     */
    private function _prepareSystemLogTables(){

        $systemController = new \Controller\Api\System();
        $systemsData = $systemController->getSystems();

        // switch DB back to pathfinder
        $this->setDB('PF');

        // insert systems into each log table if not exist
        $this->f3->get('DB')->begin();
        foreach($this->logTables as $tableName){

            // insert systems into jump log table
            $sqlInsertSystem = "INSERT IGNORE INTO " . $tableName . " (systemId)
                    VALUES(:systemId)";

            foreach($systemsData as $systemData){
                // skip WH systems -> no jump data available
                if($systemData['type']['name'] == 'k-space'){
                    $this->f3->get('DB')->exec($sqlInsertSystem, array(
                        ':systemId' => $systemData['systemId']
                    ));
                }
            }

        }
        $this->f3->get('DB')->commit();

        return $systemsData;
    }


    /**
     * imports all relevant map stats from CCPs API
     * >> php index.php "/cron/update/importmapdata"
     * @param $f3
     */
    public function importMapData($f3){

        $time_start = microtime(true);
        // prepare system jump log table
        $systemsData = $this->_prepareSystemLogTables();
        $time_end = microtime(true);
        $execTimePrepareSystemLogTables = $time_end - $time_start;


        // get current jump Data -------------------------------------------------------
        $time_start = microtime(true);
        $apiPath = $this->f3->get('api_path.CCP_XML') . '/map/Jumps.xml.aspx';

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
        $apiPath = $this->f3->get('api_path.CCP_XML') . '/map/Kills.xml.aspx';

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
        $f3->get('DB')->begin();
        foreach($this->logTables as $key => $tableName){
            $sql = "UPDATE
                    " . $tableName . "
                SET
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
                  systemId = :systemId AND
                   HOUR(TIMEDIFF(NOW(), updated)) > 0
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

                    $f3->get('DB')->exec($sql, array(
                        ':systemId' => $systemData['systemId'],
                        ':value' => $currentJumps
                    ));
                }else if($updateKills){

                    // update kill data (if available)
                    $currentKills = 0;
                    if(array_key_exists($systemData['systemId'], $killData)){
                        $currentKillData = $killData[$systemData['systemId']];

                        $currentKills = $currentKillData[$key];
                    }

                    $f3->get('DB')->exec($sql, array(
                        ':systemId' => $systemData['systemId'],
                        ':value' => $currentKills
                    ));
                }
            }
        }
        $f3->get('DB')->commit();

        $time_end = microtime(true);
        $execTimeUpdateTables = $time_end - $time_start;

        // ------------------------
        echo 'prepare system log tables: ' . round($execTimePrepareSystemLogTables, 2) . 's' . LNBR;
        echo 'get jump data: ' . round($execTimeGetJumpData, 2) . 's' . LNBR;
        echo 'get kill data: ' . round($execTimeGetKillData, 2) . 's' . LNBR;
        echo 'update log tables: ' . round($execTimeUpdateTables, 2) . 's' . LNBR;
    }
} 