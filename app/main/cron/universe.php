<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 19.05.2018
 * Time: 03:46
 */

namespace Cron;

use Model;

class Universe extends AbstractCron {

    const LOG_TEXT = '%s type: %s  %s/%s peak: %s  total: %s  msg: %s';


    /**
     * format counter for output (min length)
     * @param int $counter
     * @return string
     */
    private function formatCounterValue(int $counter){
        return str_pad($counter, 4, ' ', STR_PAD_LEFT);
    }

    /**
     * format id for output (min length)
     * @param int $counter
     * @return string
     */
    private function formatIdValue(int $counter){
        return str_pad($counter, 10, ' ', STR_PAD_LEFT);
    }

    /**
     * format Byte $size for output
     * @param int $size
     * @return string
     */
    private function formatMemoryValue(int $size){
        $unit = ['B','KB','MB','GB','TB','PB'];
        return  str_pad(number_format(@round($size/pow(1024,($i=floor(log($size,1024)))),2), 2, '.', '') . '' . $unit[$i], 9, ' ', STR_PAD_LEFT);
    }

    /**
     * format seconds for output
     * @param float $time
     * @return string
     */
    private function formatSeconds(float $time){
        $time = round($time, 5);
        $formatSeconds = function($seconds){
            return str_pad(number_format(round($seconds, 5), 5), 8, ' ', STR_PAD_LEFT);
        };

        $formatted =  $time < 60 ? $formatSeconds($time) . 's' : floor($time / 60) . 'm ' . $formatSeconds(fmod($time, 60)) . 's';
        return str_pad($formatted, 14, ' ', STR_PAD_LEFT);
    }

    /**
     * flush output
     */
    private function echoFlush(){
        flush();
        ob_flush();
    }

    /**
     * echo input parameters
     * @param string $type
     * @param int $paramOffset
     * @param int $paramLength
     */
    private function echoParams(string $type, int $paramOffset, int $paramLength){
        echo 'params ───────────────────────────────────────────────────────────────────────────────────────────────────────' . PHP_EOL;
        echo 'type               : ' . $type . PHP_EOL;
        echo 'offset             : ' . $paramOffset . PHP_EOL;
        echo 'length             : ' . $paramLength . PHP_EOL;
        $this->echoFlush();
    }

    /**
     * echo configuration
     */
    private function echoConfig(){
        echo 'config ───────────────────────────────────────────────────────────────────────────────────────────────────────' . PHP_EOL;
        echo 'max_execution_time : ' . ini_get('max_execution_time') . PHP_EOL;
        echo 'memory_limit       : ' . ini_get('memory_limit') . PHP_EOL;
        $this->echoFlush();
    }

    /**
     * echo information
     * @param int $total
     * @param int $offset
     * @param int $importCount
     * @param array $ids
     */
    private function echoInfo(int $total, int $offset, int $importCount, array $ids){
        echo 'info ─────────────────────────────────────────────────────────────────────────────────────────────────────────' . PHP_EOL;
        echo 'all data           : ' . $total . PHP_EOL;
        echo 'import offset      : ' . $offset . PHP_EOL;
        echo 'import count       : ' . $importCount . PHP_EOL;
        echo 'import chunk       : ' . implode(',', $ids) . PHP_EOL;
        $this->echoFlush();
    }

    /**
     * echo start
     */
    private function echoStart(){
        echo 'start ────────────────────────────────────────────────────────────────────────────────────────────────────────' . PHP_EOL;
        $this->echoFlush();
    }

    /**
     * echo loop start information
     * @param int $count
     * @param int $importCount
     * @param int $id
     */
    private function echoLoading(int $count, int $importCount, int $id){
        echo '[' . date('H:i:s') . '] loading... ' . $this->formatCounterValue($count) . '/' . $importCount . '  id: ' . $this->formatIdValue($id) . PHP_EOL;
        $this->echoFlush();
    }

    /**
     * echo loop finish information
     * @param int $importCount
     * @param int $id
     * @param float $timeLoopStart
     * @param float $timeTotalStart
     */
    private function echoLoaded(int $importCount, int $id, float $timeLoopStart, float $timeTotalStart){
        echo '[' . date('H:i:s') . '] loaded          ' . str_pad('', strlen($importCount), ' ') . '  id: ' . $this->formatIdValue($id)  .
            '  memory: ' . $this->formatMemoryValue(memory_get_usage()) .
            '  time: ' . $this->formatSeconds(microtime(true) - $timeLoopStart) .
            '  total: ' . $this->formatSeconds(microtime(true) - $timeTotalStart) . PHP_EOL;
        $this->echoFlush();
    }

    /**
     * echo finish information
     * @param int $count
     * @param int $importCount
     * @param float $timeTotalStart
     */
    private function echoFinish(int $count, int $importCount, float $timeTotalStart){
        echo 'finished ─────────────────────────────────────────────────────────────────────────────────────────────────────' . PHP_EOL;
        echo '[' . date('H:i:s') . ']            ' . $this->formatCounterValue($count) . '/' . $importCount .
            '                    peak: ' . $this->formatMemoryValue(memory_get_peak_usage ()) .
            '                        total: ' . $this->formatSeconds(microtime(true) - $timeTotalStart) . PHP_EOL;
        $this->echoFlush();
    }

    /**
     * imports static universe data from ESI
     * >> php index.php "/cron/setup?type=system&offset=0&length=5"
     * @param \Base $f3
     * @throws \Exception
     */
    function setup(\Base $f3){
        $params = (array)$f3->get('GET');
        $type = (string)$params['type'];
        $paramOffset = (int)$params['offset'];
        $paramLength = (int)$params['length'];
        $timeTotalStart = microtime(true);
        $msg = '';

        $ids = [];
        $count = 0;
        $importCount = [];
        $modelClass = '';
        $setupModel = function(Model\Universe\AbstractUniverseModel &$model, int $id){};

        switch($type){
            case 'system':
                // load systems + dependencies (planets, star, types,...)
                $ids = $f3->ccpClient()->getUniverseSystems();
                $modelClass = 'SystemModel';
                $setupModel = function(Model\Universe\SystemModel &$model, int $id){
                    $model->loadById($id);
                    $model->loadPlanetsData();
                };
                break;
            case 'stargate':
                // load all stargates. Systems must be present first!
                $ids = $f3->ccpClient()->getUniverseSystems();
                $modelClass = 'SystemModel';
                $setupModel = function(Model\Universe\SystemModel &$model, int $id){
                    $model->loadById($id);
                    $model->loadStargatesData();
                };
                break;
            case 'index_system':
                // setup system index, Systems must be present first!
                $ids = $f3->ccpClient()->getUniverseSystems();
                $modelClass = 'SystemModel';
                $setupModel = function(Model\Universe\SystemModel &$model, int $id){
                    $model->getById($id); // no loadById() here! would take "forever" when system not exists and build up first...
                    $model->buildIndex();
                };
                break;
            default:
                $msg = 'Model is not valid';
        }

        if($modelClass){
            $this->echoParams($type, $paramOffset, $paramLength);
            $this->echoConfig();

            $total = count($ids);
            $offset = ($paramOffset < 0) ? 0 : (($paramOffset >= $total) ? $total : $paramOffset);
            $length = ($paramLength < 0) ? 0 : $paramLength;
            sort($ids, SORT_NUMERIC);
            $ids = array_slice($ids, $offset, $length);
            $importCount = count($ids);

            $this->echoInfo($total, $offset, $importCount, $ids);
            $this->echoStart();

            /**
             * @var $model Model\Universe\SystemModel
             */
            $model = Model\Universe\AbstractUniverseModel::getNew($modelClass);
            foreach($ids as $id){
                $timeLoopStart = microtime(true);
                $this->echoLoading(++$count, $importCount, $id);
                $setupModel($model, $id);
                $model->reset();
                $this->echoLoaded($importCount, $id, $timeLoopStart, $timeTotalStart);
            }

            $this->echoFinish($count, $importCount, $timeTotalStart);
        }

        // Log --------------------------------------------------------------------------------------------------------
        $log = new \Log('cron_' . __FUNCTION__ . '.log');
        $log->write( sprintf(self::LOG_TEXT, __FUNCTION__, $type,
            $this->formatCounterValue($count), $importCount, $this->formatMemoryValue(memory_get_peak_usage ()),
            $this->formatSeconds(microtime(true) - $timeTotalStart), $msg) );
    }

    /**
     * update static universe system data from ESI
     * -> updates small chunk of systems at once
     * >> php index.php "/cron/updateUniverseSystems"
     * @param \Base $f3
     * @throws \Exception
     */
    function updateUniverseSystems(\Base $f3){
        $this->setMaxExecutionTime();

        $system = Model\Universe\AbstractUniverseModel::getNew('SystemModel');
        $systems = $system->find( null, ['order' => 'updated', 'limit' => 2]);
        if($systems){
            foreach ($systems as $system){
                $system->updateModel();
            }
        }
    }

}