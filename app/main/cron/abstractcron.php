<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 17.06.2018
 * Time: 12:13
 */

namespace cron;

abstract class AbstractCron {

    /**
     * default max_execution_time for cronJobs
    // -> should be less then execution period
     */
    const DEFAULT_MAX_EXECUTION_TIME = 50;

    /**
     * default threshold time in seconds before a running script (e.g. a large loop) should stop
     * -> so there is some time or e.g. logging,... left
     */
    const DEFAULT_EXECUTION_TIME_THRESHOLD = 3;

    /**
     * set max execution time for cronJbs
     * -> Default CLI execution time is 0 == infinite!
     * php.ini settings are ignored! http://php.net/manual/en/info.configuration.php#ini.max-execution-time
     * @param int $time
     */
    protected function setMaxExecutionTime(int $time = self::DEFAULT_MAX_EXECUTION_TIME){
        ini_set('max_execution_time', $time);
    }

    /**
     * get max execution time
     * -> 0 means == infinite!
     * @return int
     */
    protected function getMaxExecutionTime() : int {
        return (int)ini_get('max_execution_time');
    }

    /**
     * checks execution time of a "long" running script
     * -> returns false if execution time is close to maxExecutionTime
     * @param float $timeTotalStart
     * @param float|null $timeCheck
     * @param int $timeThreshold
     * @return bool
     */
    protected function isExecutionTimeLeft(float $timeTotalStart, float $timeCheck = null, int $timeThreshold = self::DEFAULT_EXECUTION_TIME_THRESHOLD) : bool {
        $timeLeft = true;
        if($timeTotalMax = $this->getMaxExecutionTime()){
            $timeTotalMaxThreshold = $timeTotalStart + $timeTotalMax - $timeThreshold;
            $timeCheck = $timeCheck ? : microtime(true);
            if($timeCheck >= $timeTotalMaxThreshold){
                $timeLeft = false;
            }
        }
        return $timeLeft;
    }

}