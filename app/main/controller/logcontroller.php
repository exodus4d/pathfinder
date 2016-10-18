<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 14.06.2015
 * Time: 15:24
 */

namespace controller;
use DB;

class LogController extends \Prefab  {

    /**
     * buffered activity log data for this singleton LogController() class
     * -> this buffered data can be stored somewhere (e.g. DB) before HTTP response
     * -> should be cleared afterwards!
     * @var array
     */
    protected $activityLogBuffer = [];

    /**
     * reserve a "new" character activity for logging
     * @param $characterId
     * @param $mapId
     * @param $action
     */
    public function bufferActivity($characterId, $mapId, $action){
        $characterId    = (int)$characterId;
        $mapId          = (int)$mapId;

        if(
            $characterId > 0 &&
            $mapId > 0
        ){
            $key = $this->getBufferedActivityKey($characterId, $mapId);

            if( is_null($key) ){
                $activity = [
                    'characterId' => $characterId,
                    'mapId' => $mapId,
                    $action => 1
                ];
                $this->activityLogBuffer[] = $activity;
            }else{
                $this->activityLogBuffer[$key][$action]++;
            }
        }
    }

    /**
     * store all buffered activity log data to DB
     */
    public function storeActivities(){
        if( !empty($this->activityLogBuffer) ){
            $db = DB\Database::instance()->getDB('PF');

            $quoteStr = function($str) use ($db) {
                return $db->quotekey($str);
            };

            $placeholderStr = function($str){
                return ':' . $str;
            };

            $updateRule = function($str){
                return $str . " = " . $str . " + VALUES(" . $str . ")";
            };

            $year = (int)date('o');
            $yearWeek = (int)date('W');
            $db->begin();

            foreach($this->activityLogBuffer as $activityData){
                $activityData['year'] = $year;
                $activityData['week'] = $yearWeek;

                $columns = array_keys($activityData);
                $columnsQuoted = array_map($quoteStr, $columns);
                $placeholder = array_map($placeholderStr, $columns);
                $args = array_combine($placeholder, $activityData);

                // "filter" columns that can be updated
                $columnsForUpdate = array_diff($columns, ['year', 'week', 'characterId', 'mapId']);
                $updateSql = array_map($updateRule, $columnsForUpdate);

                $sql = "INSERT DELAYED INTO 
                        activity_log (" . implode(', ', $columnsQuoted) . ") values(
                            " . implode(', ', $placeholder) . "
                        ) 
                    ON DUPLICATE KEY UPDATE
                        updated = NOW(),
                        " . implode(', ', $updateSql) . "
                    ";

                $db->exec($sql, $args);
            }

            $db->commit();

            // clear activity data for this instance
            $this->activityLogBuffer = [];
        }
    }

    /**
     * get array key from "buffered activity log" array
     * @param int $characterId
     * @param int $mapId
     * @return int|null
     */
    private function getBufferedActivityKey($characterId, $mapId){
        $activityKey    = null;

        if(
            $characterId > 0 &&
            $mapId > 0
        ){
            foreach($this->activityLogBuffer as $key => $activityData){
                if(
                    $activityData['characterId'] === $characterId &&
                    $activityData['mapId'] === $mapId
                ){
                    $activityKey = $key;
                    break;
                }
            }
        }

        return $activityKey;
    }

    /**
     * get Logger instance
     * @param string $type
     * @return \Log|null
     */
    public static function getLogger($type){
        $f3 = \Base::instance();
        $logFiles = $f3->get('PATHFINDER.LOGFILES');
        $logger = null;
        if( !empty($logFiles[$type]) ){
            $logFile = $logFiles[$type] . '.log';
            $logger = new \Log($logFile);
        }

        return $logger;
    }

}