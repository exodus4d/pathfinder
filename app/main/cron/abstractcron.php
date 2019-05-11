<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 17.06.2018
 * Time: 12:13
 */

namespace cron;

abstract class AbstractCron {

    // default max_execution_time for cronJobs
    // -> should be less then execution period
    const DEFAULT_MAX_EXECUTION_TIME = 50;

    /**
     * set max execution time for cronjobs
     * -> Default CLI execution time is "0"  -> infinite!
     * php.ini settings are ignored! http://php.net/manual/en/info.configuration.php#ini.max-execution-time
     * @param int $time
     */
    protected function setMaxExecutionTime(int $time = self::DEFAULT_MAX_EXECUTION_TIME){
        ini_set('max_execution_time', $time);
    }

}