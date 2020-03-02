<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.03.15
 * Time: 21:31
 */

namespace Exodus4D\Pathfinder\Cron;


use Exodus4D\Pathfinder\Lib\Db\Sql;

class CcpSystemsUpdate extends AbstractCron {

    /**
     * log text
     */
    const LOG_TEXT = ' → [%.3Fs prepare table, %.3Fs jump, %.3Fs kill, %.3Fs update all]';

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
     * @param Sql $db
     * @param string $table
     * @return bool
     */
    protected function tableExists (Sql $db, string $table) : bool {
        return !empty($db->exec('SHOW TABLES LIKE :table', [':table' => $table]));
    }

    /**
     * check all system log tables for the correct number of system entries that will be locked
     * @param \Base $f3
     * @return int[]
     */
    private function prepareSystemLogTables(\Base $f3) : array {
        $systemIds = [];

        // get all available systems from "universe" DB
        $universeDB = $f3->DB->getDB('UNIVERSE');

        if($this->tableExists($universeDB, 'system')){
            $systemsData = $universeDB->exec('
                SELECT 
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

            $systemIds = array_map('intval', array_column($systemsData, 'id'));
            sort($systemIds, SORT_NUMERIC);

            $pfDB = $f3->DB->getDB('PF');

            // insert systems into each log table if not exist
            foreach($this->logTables as $tableName){
                $pfDB->begin();
                // insert systems into jump log table
                $sqlInsertSystem = "INSERT IGNORE INTO " . $tableName . " (`systemId`) VALUES (:systemId)";

                foreach($systemIds as $systemId){
                    $pfDB->exec($sqlInsertSystem, [
                        ':systemId' => $systemId
                    ], 0, false);
                }

                $pfDB->commit();
            }
        }

        return $systemIds;
    }


    /**
     * imports all relevant map stats from CCPs API
     * >> php index.php "/cron/importSystemData"
     * @param \Base $f3
     */
    function importSystemData(\Base $f3){
        $this->logStart(__FUNCTION__);
        $params = $this->getParams(__FUNCTION__);


        // prepare system jump log table ------------------------------------------------------------------------------
        $time_start = microtime(true);
        $systemIds = $this->prepareSystemLogTables($f3);
        $time_end = microtime(true);
        $execTimePrepareSystemLogTables = $time_end - $time_start;

        $total = count($systemIds);
        $offset = ($params['offset'] > 0 && $params['offset'] < $total) ? $params['offset'] : 0;
        $systemIds = array_slice($systemIds, $offset, $params['length']);
        $importCount = count($systemIds);
        $count = 0;

        // switch DB for data import..
        /**
         * @var $pfDB Sql
         */
        $pfDB = $f3->DB->getDB('PF');

        // get current jump data --------------------------------------------------------------------------------------
        $time_start = microtime(true);
        $jumpData = $f3->ccpClient()->send('getUniverseJumps');
        $time_end = microtime(true);
        $execTimeGetJumpData = $time_end - $time_start;

        // get current kill data --------------------------------------------------------------------------------------
        $time_start = microtime(true);
        $killData = $f3->ccpClient()->send('getUniverseKills');
        $time_end = microtime(true);
        $execTimeGetKillData = $time_end - $time_start;

        // merge both results
        $systemValues = array_replace_recursive($jumpData, $killData);

        // update system log tables -----------------------------------------------------------------------------------
        $time_start = microtime(true);

        $logTableCount = count($this->logTables);
        $logTableCounter = 0;
        foreach($this->logTables as $key => $tableName){
            $logTableCounter++;
            $pfDB->begin();

            $sqlUpdateColumn = vsprintf("SELECT `systemId`, IF (lastUpdatedValue, lastUpdatedValue, DEFAULT (lastUpdatedValue)) AS `updateColumn` FROM %s", [
                $pfDB->quotekey($tableName)
            ]);
            $resUpdateColumns = $pfDB->exec($sqlUpdateColumn, null, 0);
            $resUpdateColumns = array_column($resUpdateColumns, 'updateColumn', 'systemId');

            foreach($systemIds as $systemId){
                $column = 1;
                if(isset($resUpdateColumns[$systemId])){
                    $column = (int)$resUpdateColumns[$systemId];
                    $column = (++$column > 24) ? 1 : $column;
                }

                // update data (if available)
                $currentData = 0;
                if(isset($systemValues[$systemId][$key])){
                    $currentData = (int)$systemValues[$systemId][$key];
                }

                $sql = vsprintf("UPDATE %s SET `updated` = NOW(), %s = :value, `lastUpdatedValue` = :updateColumn WHERE systemId = :systemId", [
                    $pfDB->quotekey($tableName),
                    $pfDB->quotekey('value' . $column)
                ]);

                $pfDB->exec($sql, [
                    ':systemId' => $systemId,
                    ':updateColumn' => $column,
                    ':value' => $currentData
                ] , 0);

                // system import is done if ALL related tables (4) were updated
                if($logTableCounter === $logTableCount){
                    $count++;
                }
            }

            $pfDB->commit();
        }

        $time_end = microtime(true);
        $execTimeUpdateTables = $time_end - $time_start;

        // Log --------------------------------------------------------------------------------------------------------
        $text = sprintf(self::LOG_TEXT, $execTimePrepareSystemLogTables, $execTimeGetJumpData, $execTimeGetKillData, $execTimeUpdateTables);
        $this->logEnd(__FUNCTION__, $total, $count, $importCount, $offset, $text);
    }
} 