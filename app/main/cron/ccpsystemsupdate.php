<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.03.15
 * Time: 21:31
 */

namespace Cron;
use lib\db\SQL;

class CcpSystemsUpdate extends AbstractCron {

    const LOG_TEXT = '%s prepare table (%.3F s), jump (%.3F s), kill (%.3F s), update all (%.3F s)';

    /**
     * table names for all system log tables
     * @var array
     */
    protected $logTables = [
        'jumps'         => 'system_jumps',
        'ship_kills'    => 'system_kills_ships',
        'pod_kills'     => 'system_kills_pods',
        'npc_kills'     => 'system_kills_factions'
    ];

    /**
     * checks if a table exists in DB or not
     * @param SQL$db
     * @param string $table
     * @return bool
     */
    protected function tableExists (SQL $db, string $table) : bool {
        return !empty($db->exec('SHOW TABLES LIKE :table', [':table' => $table]));
    }

    /**
     * check all system log tables for the correct number of system entries that will be locked
     * @param \Base $f3
     * @return array
     */
    private function prepareSystemLogTables(\Base $f3) : array {
        $systemsData = [];

        // get all available systems from "universe" DB
        $universeDB = $f3->DB->getDB('UNIVERSE');

        if($this->tableExists($universeDB, 'system')){
            $systemsData = $universeDB->exec('SELECT 
              `id` 
            FROM 
              `system` 
            WHERE 
              `security` = :ns OR
              `security` = :ls OR 
              `security` = :hs
              ',
                [':ns' => '0.0', ':ls' => 'L', ':hs' => 'H']
            );

            $pfDB = $f3->DB->getDB('PF');

            // insert systems into each log table if not exist
            $pfDB->begin();
            foreach($this->logTables as $tableName){
                // insert systems into jump log table
                $sqlInsertSystem = "INSERT IGNORE INTO " . $tableName . " (systemId)
                    VALUES(:systemId)";

                foreach($systemsData as $systemData){
                    $pfDB->exec($sqlInsertSystem, array(
                        ':systemId' => $systemData['id']
                    ), 0, false);
                }

            }
            $pfDB->commit();
        }

        return $systemsData;
    }


    /**
     * imports all relevant map stats from CCPs API
     * >> php index.php "/cron/importSystemData"
     * @param \Base $f3
     */
    function importSystemData(\Base $f3){
        $this->setMaxExecutionTime();

        // prepare system jump log table ------------------------------------------------------------------------------
        $time_start = microtime(true);
        $systemsData = $this->prepareSystemLogTables($f3);
        $time_end = microtime(true);
        $execTimePrepareSystemLogTables = $time_end - $time_start;

        // switch DB for data import..
        $pfDB = $f3->DB->getDB('PF');

        // get current jump data --------------------------------------------------------------------------------------
        $time_start = microtime(true);
        $jumpData = $f3->ccpClient()->getUniverseJumps();
        $time_end = microtime(true);
        $execTimeGetJumpData = $time_end - $time_start;

        // get current kill data --------------------------------------------------------------------------------------
        $time_start = microtime(true);
        $killData = $f3->ccpClient()->getUniverseKills();
        $time_end = microtime(true);
        $execTimeGetKillData = $time_end - $time_start;

        // merge both results
        $systemValues = array_replace_recursive($jumpData, $killData);

        // update system log tables -----------------------------------------------------------------------------------
        $time_start = microtime(true);
        $pfDB->begin();

        foreach($this->logTables as $key => $tableName){
            $sql = "UPDATE
                    $tableName
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
                $systemId = $systemData['id'];

                // update data (if available)
                $currentData = 0;
                if( isset($systemValues[$systemId][$key]) ){
                    $currentData = (int)$systemValues[$systemId][$key];
                }

                $pfDB->exec($sql, [
                    ':systemId' => $systemId,
                    ':value' => $currentData
                ], 0, false);
            }
        }

        $pfDB->commit();

        $time_end = microtime(true);
        $execTimeUpdateTables = $time_end - $time_start;

        // Log --------------------------------------------------------------------------------------------------------
        $log = new \Log('cron_' . __FUNCTION__ . '.log');
        $log->write( sprintf(self::LOG_TEXT, __FUNCTION__, $execTimePrepareSystemLogTables, $execTimeGetJumpData, $execTimeGetKillData, $execTimeUpdateTables) );
    }
} 