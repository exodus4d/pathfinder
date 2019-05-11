<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 14.06.2015
 * Time: 15:24
 */

namespace controller;


use lib\Config;
use lib\logging\MapLog;
use Model\Pathfinder;

class LogController extends \Prefab  {

    const CACHE_KEY_ACTIVITY_COLUMNS                = 'CACHED_ACTIVITY_COLUMNS';
    const CACHE_TTL_ACTIVITY_COLUMNS                = 300;

    /**
     * @var string[]
     */
    protected $activityLogColumns                   = [];

    /**
     * buffered activity log data for this singleton LogController() class
     * -> this buffered data can be stored somewhere (e.g. DB) before HTTP response
     * -> should be cleared afterwards!
     * @var array
     */
    protected $activityLogBuffer                    = [];

    /**
     * get columns from ActivityLogModel that can be uses as counter
     * @return array
     * @throws \Exception
     */
    protected function getActivityLogColumns(): array{
        if(empty($this->activityLogColumns)){
            $f3 = \Base::instance();
            if(!$f3->exists(self::CACHE_KEY_ACTIVITY_COLUMNS, $this->activityLogColumns)){
                /**
                 * @var $activityLogModel Pathfinder\ActivityLogModel
                 */
                $activityLogModel = Pathfinder\AbstractPathfinderModel::getNew('ActivityLogModel');
                $this->activityLogColumns = $activityLogModel->getCountableColumnNames();
                $f3->set(self::CACHE_KEY_ACTIVITY_COLUMNS, self::CACHE_TTL_ACTIVITY_COLUMNS);
            }
        }

        return $this->activityLogColumns;
    }

    /**
     * buffered activity log data for this singleton LogController() class
     * -> this buffered data can be stored somewhere (e.g. DB) before HTTP response
     * -> should be cleared afterwards!
     * @param MapLog $log
     * @throws \Exception
     */
    public function push(MapLog $log){
        $action = $log->getAction();

        // check $action to be valid (table column exists)
        if($action && in_array($action, $this->getActivityLogColumns())){
            if($mapId = $log->getChannelId()){
                $logData = $log->getData();
                if($characterId = (int)$logData['character']['id']){
                    if($index = $this->getBufferedActivityIndex($characterId, $mapId)){
                        $this->activityLogBuffer[$index][$action]++;
                    }else{
                        $this->activityLogBuffer[] = [
                            'characterId' => $characterId,
                            'mapId' => $mapId,
                            $action => 1
                        ];
                    }
                }
            }
        }
    }

    /**
     * store all buffered activity log data to DB
     */
    public function logActivities(){
        if( !empty($this->activityLogBuffer) ){
            $db = \Base::instance()->DB->getDB('PF');

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
     * get array key/index from "buffered activity log" array
     * @param int $characterId
     * @param int $mapId
     * @return int
     */
    private function getBufferedActivityIndex(int $characterId, int $mapId): int {
        $activityKey = 0;
        if($characterId > 0 && $mapId > 0 ){
            foreach($this->activityLogBuffer as $key => $activityData){
                if(
                    $activityData['characterId'] === $characterId &&
                    $activityData['mapId'] === $mapId
                ){
                    $activityKey = (int)$key;
                    break;
                }
            }
        }

        return $activityKey;
    }

    /**
     * get Logger instance
     * @param string $type
     * @return \Log
     */
    public static function getLogger(string $type) : \Log {
        $logFiles = Config::getPathfinderData('logfiles');
        $logFileName = empty($logFiles[$type]) ? 'error' : $logFiles[$type];
        return new \Log($logFileName . '.log');
    }

}