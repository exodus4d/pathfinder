<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 17.06.2018
 * Time: 12:13
 */

namespace Exodus4D\Pathfinder\Cron;

use Exodus4D\Pathfinder\Lib\Format\Number;
use Exodus4D\Pathfinder\Model\Pathfinder;

abstract class AbstractCron {

    /**
     * default "base" log message text
     * -> generic information data
     */
    const LOG_TEXT_BASE = '%4s/%-4s %6s done, %5s total, %8s peak, %9s exec';

    /**
     * default max_execution_time for cronJobs
     * -> should be less then execution period
     */
    const DEFAULT_MAX_EXECUTION_TIME = 50;

    /**
     * default threshold time in seconds before a running script (e.g. a large loop) should stop
     * -> so there is some time or e.g. logging,... left
     */
    const DEFAULT_EXECUTION_TIME_THRESHOLD = 3;

    /**
     * started jobs
     * @var Pathfinder\CronModel[]
     */
    protected $activeCron = [];

    /**
     * disables log file write entry for some cronJobs
     * -> either job runs too frequently, or no relevant data available for logging
     * @var array
     */
    protected $logDisabled = [];

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

    /**
     * log cronjob exec state on start
     * @param string $job
     * @param bool $logging
     */
    protected function logStart(string $job, bool $logging = true){
        $this->setMaxExecutionTime();

        $cron = \Exodus4D\Pathfinder\Lib\Cron::instance();
        if(isset($cron->jobs[$job])){
            // set "start" date for current cronjob
            $jobConf = $cron->getJobDataFromConf($cron->jobs[$job]);
            $jobConf['lastExecStart'] = $_SERVER['REQUEST_TIME_FLOAT'];
            if(($cronModel = $cron->registerJob($job, $jobConf)) instanceof Pathfinder\CronModel){
                $this->activeCron[$job] = $cronModel;
            }
        }

        if(!$logging){
            $this->logDisabled[] = $job;
        }
    }

    /**
     * log cronjob exec state on finish
     * @param string $job
     * @param int $total
     * @param int $count
     * @param int $importCount
     * @param int $offset
     * @param string $logText
     */
    protected function logEnd(string $job, int $total = 0, int $count = 0, int $importCount = 0, int $offset = 0, string $logText = ''){
        $execEnd = microtime(true);
        $memPeak = memory_get_peak_usage();
        $state = [
            'total'         => $total,
            'count'         => $count,
            'importCount'   => $importCount,
            'offset'        => $offset,
            'loop'          => 1,
            'percent'       => $total ? round(100 / $total * ($count + $offset), 1) : 100
        ];

        if(isset($this->activeCron[$job])){
            if($lastState = $this->activeCron[$job]->lastExecState){
                if(isset($lastState['loop']) && $offset){
                    $state['loop'] = (int)$lastState['loop'] + 1;
                }
            }

            $jobConf = [
                'lastExecEnd'       => $execEnd,
                'lastExecMemPeak'   => $memPeak,
                'lastExecState'     => $state
            ];
            $this->activeCron[$job]->setData($jobConf);
            $this->activeCron[$job]->save();
            unset($this->activeCron[$job]);
        }

        if(!in_array($job, $this->logDisabled)){
            $this->writeLog($job, $memPeak, $execEnd, $state, $logText);
        }
    }

    /**
     * get either CLI GET params OR
     * check for params from last run -> incremental import
     * @param string $job
     * @return array
     */
    protected function getParams(string $job) : array {
        $params = [];

        // check for CLI GET params
        $f3 = \Base::instance();
        if($getParams = (array)$f3->get('GET')){
            if(isset($getParams['offset'])){
                $params['offset'] = (int)$getParams['offset'];
            }
            if(isset($getParams['length']) && (int)$getParams['length'] > 0){
                $params['length'] = (int)$getParams['length'];
            }
        }

        // .. or check for logged params from last exec state (DB entry)
        if(empty($params) && isset($this->activeCron[$job])){
            if($lastState = $this->activeCron[$job]->lastExecState){
                if(isset($lastState['offset'])){
                    $params['offset'] = (int)$lastState['offset'];
                }
                if(isset($lastState['count'])){
                    $params['offset'] = (int)$params['offset'] + (int)$lastState['count'];
                }
                if(isset($lastState['loop'])){
                    $params['loop'] = (int)$lastState['loop'];
                }
            }
        }

        return $params;
    }

    /**
     * write log file for $job
     * @param string $job
     * @param int $memPeak
     * @param float $execEnd
     * @param array $state
     * @param string $logText for custom text
     */
    private function writeLog(string $job, int $memPeak = 0, float $execEnd = 0, array $state = [], string $logText = ''){
        $percent = number_format($state['percent'], 1) . '%';
        $duration = number_format(round($execEnd - $_SERVER['REQUEST_TIME_FLOAT'], 3), 3) . 's';
        $log = new \Log('cron_' . $job . '.log');

        $text = sprintf(self::LOG_TEXT_BASE,
            $state['count'], $state['importCount'], $percent, $state['total'],
            Number::instance()->bytesToString($memPeak), $duration
        );

        $text .= $logText ? $logText: '';
        $log->write($text);
    }
}