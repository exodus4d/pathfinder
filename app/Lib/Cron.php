<?php


namespace Exodus4D\Pathfinder\Lib;

use Exodus4D\Pathfinder\Model\Pathfinder;

/**
 * Class Cron
 * @package lib
 *
 * @property array $jobs
 */
class Cron extends \Cron {

    /**
     * execution time buffer in percent
     * -> cronJobs that exceed avg. exec. time + DEFAULT_BUFFER_EXEC_TIME show warnings
     */
    const DEFAULT_BUFFER_EXEC_TIME  = 20;

    /**
     * execution memory buffer in percent
     * -> cronJobs that exceed avg. mem. peak + DEFAULT_BUFFER_MEM_PEAK show warnings
     */
    const DEFAULT_BUFFER_MEM_PEAK   = 20;

    /**
     * extends parent::isDue()
     * -> adds check for "paused" jobs
     * @param string $job
     * @param int $time
     * @return bool
     */
    public function isDue($job, $time){
        if($isDue = parent::isDue($job, $time)){
            // check if job is not paused
            if($job = $this->getJob($job)){
                if($job->valid() && $job->isPaused){
                    $isDue = false;
                }
            }
        }
        return $isDue;
    }

    public function execute($job, $async = true) {
        return parent::execute($job, $async);
    }

    /**
     * @param $name
     * @return string
     */
    public function __get($name){
        if(in_array($name, ['jobs'])){
            return $this->$name;
        }else{
            return parent::__get($name);
        }
    }

    /**
     * @param array $jobConf
     * @return array
     */
    public function getJobDataFromConf(array $jobConf) : array {
        return ['handler' => $jobConf[0], 'expr' => $jobConf[1]];
    }

    /**
     * get all configured cronjobs (read from cron.ini)
     * @param array $names
     * @return array
     */
    public function getJobsConfig(array $names = []) : array {
        $config = [];

        $jobs = array_filter($this->jobs, function(string $name) use ($names) : bool {
            return !empty($names) ? in_array($name, $names) : true;
        }, ARRAY_FILTER_USE_KEY );

        foreach($jobs as $name => $jobConf){
            $jobConf = $this->getJobDataFromConf($jobConf);
            if($job = $this->registerJob($name, $jobConf)){
                // get job config from DB
                $config[$name] = $job->getData();
            }else{
                // job registration failed (e.g. DB connect failed) -> return min config from cron.ini
                $jobConf = (object)$jobConf;
                $jobConf->status = ['dbError' => Pathfinder\CronModel::STATUS['dbError']];
                $jobConf->history = [];
                $config[$name] = $jobConf;
            }
            $config[$name]->exprPreset = $this->checkPreset($config[$name]->expr);
        }
        ksort($config);
        return $config;
    }

    /**
     * @param string $name
     * @param array $jobConf
     * @return mixed|void
     */
    public function registerJob(string $name, array $jobConf){
        // method is called from /setup page -> DB might not be created at this point!
        // -> check if DB exists here. Otherwise Cortex()->__construct()
        \Base::instance()->DB->setSilent(true);
        if(\Base::instance()->DB->getDB(Pathfinder\AbstractPathfinderModel::DB_ALIAS)){
            if($job = $this->getJob($name)){
                if($job->dry()){
                    $job->name = $name;
                }
                $job->setData($jobConf);
                return $job->save();
            }
        }
        \Base::instance()->DB->setSilent(false);
    }

    /**
     * find CronModel by job $name
     * @param string $name
     * @return Pathfinder\CronModel|null
     */
    public function getJob(string $name) : ?Pathfinder\CronModel {
        $job = null;
        try{
            /**
             * @var $job Pathfinder\CronModel
             */
            $jobModel = Pathfinder\AbstractPathfinderModel::getNew('CronModel');
            // we need to check if table exists here
            // if not we get an error for later insert/update SQL actions
            // -> e.g. if job is triggered manually on CLI
            if($jobModel->tableExists()){
                $jobModel->getByForeignKey('name', $name);
                $job = $jobModel;
            }
        }catch(\Exception $e){
            // Cron DB table not exists or other DB issues...
        }

        return $job;
    }

    /**
     * check expression for a preset
     * @param string $expr
     * @return bool
     */
    protected function checkPreset(string $expr){
        if(preg_match('/^@(\w+)$/', $expr,$m)){
            if(!isset($this->presets[$m[1]]))
                return false;
            return $this->presets[$m[1]];
        }
        return false;
    }
}