<?php


namespace Exodus4D\Pathfinder\Model\Pathfinder;

use DB\SQL\Schema;

class CronModel extends AbstractPathfinderModel {

    /**
     * @var string
     */
    protected $table = 'cron';

    /**
     * cron log status flags
     */
    const STATUS = [
        'unknown' => [
            'type' => 'warning',
            'icon' => 'question',
            'msg' => 'No status information available'
        ],
        'dbError' => [
            'type' => 'warning',
            'icon' => 'fa-exclamation-triangle',
            'msg' => 'Failed to sync job data with DB'
        ],
        'notExecuted' => [
            'type' => 'hint',
            'icon' => 'fa-bolt',
            'msg' => 'Has not been executed'
        ],
        'notFinished' => [
            'type' => 'danger',
            'icon' => 'fa-clock',
            'msg' => 'Not finished within max exec. time'
        ],
        'inProgress' => [
            'type' => 'success',
            'icon' => 'fa-play',
            'msg' => 'Started. In execution…'
        ],
        'isPaused' => [
            'type' => 'warning',
            'icon' => 'fa-pause',
            'msg' => 'Paused. No execution on next time trigger (skip further execution)'
        ],
        'onHold' => [
            'type' => 'information',
            'icon' => 'fa-history fa-flip-horizontal',
            'msg' => 'Is active. Waiting for next trigger…'
        ]
    ];

    /**
     * @var array
     */
    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'index' => true,
            'unique' => true,
            'validate' => 'notEmpty'
        ],
        'handler' => [
            'type' => Schema::DT_VARCHAR256,
            'nullable' => false,
            'default' => '',
            'index' => true,
            'unique' => true,
            'validate' => 'notEmpty'
        ],
        'expr' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'validate' => 'notEmpty'
        ],
        'isPaused' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'lastExecStart' => [
            'type' => Schema::DT_DOUBLE,
            'nullable' => true,
            'default' => null
        ],
        'lastExecEnd' => [
            'type' => Schema::DT_DOUBLE,
            'nullable' => true,
            'default' => null
        ],
        'lastExecMemPeak' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => true,
            'default' => null
        ],
        'lastExecState' => [
            'type' => self::DT_JSON
        ],
        'history' => [
            'type' => self::DT_JSON
        ]
    ];

    /**
     * set data by associative array
     * @param array $data
     */
    public function setData(array $data){
        $this->copyfrom($data, ['handler', 'expr', 'lastExecStart', 'lastExecEnd', 'lastExecMemPeak', 'lastExecState']);
    }

    /**
     * get data
     * @return object
     */
    public function getData(){
        $data                   = (object) [];
        $data->id               = $this->_id;
        $data->name             = $this->name;
        $data->handler          = $this->handler;
        $data->expr             = $this->expr;
        $data->logFile          = $this->logFileExists();

        $data->lastExecStart    = $this->lastExecStart;
        $data->lastExecEnd      = $this->lastExecEnd;
        $data->lastExecMemPeak  = $this->lastExecMemPeak;
        $data->lastExecDuration = $this->getExecDuration();
        $data->lastExecState    = $this->lastExecState;

        $data->isPaused         = $this->isPaused;
        $data->status           = $this->getStatus();
        $data->history          = $this->getHistory(true);

        return $data;
    }

    /**
     * setter for system alias
     * @param string $lastExecStart
     * @return string
     */
    public function set_lastExecStart($lastExecStart){
        $this->logState();
        return $lastExecStart;
    }

    /**
     * log execution "state" for prev run in 'history' column
     */
    protected function logState(){
        $this->history = $this->getHistory() ? : null;
        // reset data from last run
        $this->lastExecEnd = null;
        $this->lastExecMemPeak = null;
    }

    /**
     * @param bool $addLastIfFinished
     * @return array
     * @throws \Exception
     */
    protected function getHistory(bool $addLastIfFinished = false) : array {
        $history = $this->history ? : [];

        if(!is_null($this->lastExecStart)){
            if(!$addLastIfFinished || !is_null($this->lastExecEnd)){
                array_unshift($history, [
                    'lastExecStart' => $this->lastExecStart,
                    'lastExecMemPeak' => $this->lastExecMemPeak,
                    'lastExecDuration' => (!$this->inExec() && !$this->isTimedOut()) ? $this->getExecDuration() : 0,
                    'status' => array_intersect(array_keys($this->getStatus()), ['inProgress', 'notFinished'])
                ]);
                $history = array_slice($history, 0, 10);
            }

        }

        return $history;
    }

    /**
     * get current job status based on its current data
     * @return array
     * @throws \Exception
     */
    protected function getStatus() : array {
        $status = [];

        if($this->isPaused){
            $status['isPaused'] = self::STATUS['isPaused'];
        }

        if($this->inExec() && !$this->isTimedOut()){
            $status['inProgress'] = self::STATUS['inProgress'];
        }

        if(empty($status)){
            $status['onHold'] = self::STATUS['onHold'];
        }

        if($this->isTimedOut()){
            $status['notFinished'] = self::STATUS['notFinished'];
        }

        if(!$this->lastExecStart){
            $status['notExecuted'] = self::STATUS['notExecuted'];
        }

        return empty($status) ? ['unknown' => self::STATUS['unknown']] : array_reverse($status);
    }

    /**
     * based on the data on DB, job is marked at "in progress"
     * @return bool
     */
    protected function inExec() : bool {
        return $this->lastExecStart && !$this->lastExecEnd;
    }

    /**
     * @return bool
     * @throws \Exception
     */
    protected function isTimedOut() : bool {
        $timedOut = false;
        if($this->lastExecStart){
            $timezone = self::getF3()->get('getTimeZone')();
            $startTime = \DateTime::createFromFormat(
                'U.u',
                number_format($this->lastExecStart, 6, '.', ''),
                $timezone
            );

            $timeBuffer = 60 * 60;
            $startTime->add(new \DateInterval('PT' . $timeBuffer . 'S'));

            if($this->lastExecEnd){
                $endTime = \DateTime::createFromFormat(
                    'U.u',
                    number_format($this->lastExecEnd, 6, '.', ''),
                    $timezone
                );
            }else{
                $endTime = new \DateTime('now', $timezone);
            }

            $timedOut = $startTime < $endTime;
        }

        return $timedOut;
    }

    /**
     * @return float|null
     */
    protected function getExecDuration() : ?float {
        $duration = null;
        if($this->lastExecStart && $this->lastExecEnd){
            $duration = (float)$this->lastExecEnd - (float)$this->lastExecStart;
        }

        return $duration;
    }

    /**
     * extract function name from $this->handler
     * -> it is used for the log file name
     * @return string|null
     */
    protected function getLogFileName() : ?string {
        return ($this->handler && preg_match('/^.*->(\w+)$/', $this->handler,$m)) ? 'cron_' . $m[1] . '.log' : null;
    }

    /**
     * checks whether a log file exists for this cronjob
     * -> will be created after job execution
     * @return string
     */
    protected function logFileExists() : ?string {
        $filePath = null;
        if($file = $this->getLogFileName()){
            $filePath = is_file($path = self::getF3()->get('LOGS') . $file) ? $path : null;
        }
        return $filePath;
    }
}