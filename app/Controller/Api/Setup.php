<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 27.05.2018
 * Time: 14:17
 */

namespace Exodus4D\Pathfinder\Controller\Api;

use Exodus4D\Pathfinder\Lib\Config;
use Exodus4D\Pathfinder\Lib\Cron;
use Exodus4D\Pathfinder\Lib\Format\Number;
use Exodus4D\Pathfinder\Controller;
use Exodus4D\Pathfinder\Model;

class Setup extends Controller\Controller {

    /**
     * get HTML table <tr>´s for all cronjobs
     * @param \Base $f3
     */
    public function cronTable(\Base $f3){
        $return = (object) [];
        $return->error = [];
        $return->jobsData = Cron::instance()->getJobsConfig();
        $return->html = $this->getCronHtml($return->jobsData);
        echo json_encode($return);
    }

    /**
     * toggle "isPaused" for a cronjob by its name
     * @param \Base $f3
     */
    public function cronPause(\Base $f3){
        $postData = (array)$f3->get('POST');
        $return = (object) [];
        $return->error = [];

        if($jobName = (string)$postData['job']){
            $cron = Cron::instance();
            if($job = $cron->getJob($jobName)){
                if($job->valid()){
                    $job->isPaused = !$job->isPaused;
                    $job->save();

                    $return->jobsData = $cron->getJobsConfig([$jobName]);
                    $return->html = $this->getCronHtml($return->jobsData);
                }
            }
        }

        echo json_encode($return);
    }

    /**
     * execute a cronjob by its name
     * -> runs sync
     * -> max execution time might be lower than CLI calls!
     * @param \Base $f3
     */
    public function cronExecute(\Base $f3){
        $postData = (array)$f3->get('POST');
        $return = (object) [];
        $return->error = [];

        if($jobName = (string)$postData['job']){
            $cron = Cron::instance();
            if($job = $cron->getJob($jobName)){
                if($job->valid()){
                    $cron->execute($jobName, false);

                    $return->jobsData = $cron->getJobsConfig([$jobName]);
                    $return->html = $this->getCronHtml($return->jobsData);
                }
            }
        }

        echo json_encode($return);
    }

    /**
     * get HTML for cronJobs
     * @param array $jobsData
     * @return string
     */
    protected function getCronHtml(array $jobsData) : string {
        $tplData = [
            'cronConfig' => [
                'jobs' => $jobsData,
                'settings' => $this->getF3()->constants(Cron::instance(), 'DEFAULT_')
            ],
            'tplCounter' => $this->counter(),
            'tplConvertBytes' => function(){
                return call_user_func_array([Number::instance(), 'bytesToString'], func_get_args());
            }
        ];
        return \Template::instance()->render('templates/ui/cron_table_row.html', null, $tplData, 0);
    }

    /**
     * build search index from existing data (e.g. Systems)
     * OR import data from ESI (e.g. Structures)
     * -> optional build/import smaller chunks of data
     * @param \Base $f3
     * @throws \Exception
     */
    public function buildIndex(\Base $f3){
        $postData = (array)$f3->get('POST');
        $type = (string)$postData['type'];
        $countAll = (int)$postData['countAll'];
        $count = (int)$postData['count'];
        $offset = (int)$postData['offset'];

        $return = (object) [];
        $return->error = [];
        $return->type = $type;
        $return->count = $count;
        $return->offset = $offset;
        $return->countAll = $countAll;
        $return->countBuild = 0;
        $return->countBuildAll = 0;
        $return->progress = 0;

        /**
         * sum array values
         * @param int $carry
         * @param int $value
         * @return int
         */
        $sum = function(int $carry, int $value) : int {
            $carry += $value;
            return $carry;
        };

        /**
         * calc percent
         * @param int $countAll
         * @param int $count
         * @return int
         */
        $percent = function(int $countAll, int $count){
            return $countAll ? floor((100/$countAll) * $count) : 0;
        };

        $controller = new Controller\Ccp\Universe();
        switch($type){
            case 'Systems':
                $length = 100;
                $buildInfo = $controller->buildSystemsIndex($offset, $length);

                $return->offset = $buildInfo['offset'];
                $return->countAll = $buildInfo['countAll'];
                $return->countBuild = $buildInfo['countBuild'];
                $return->countBuildAll = $return->offset;
                break;
            case 'Wormholes':
                $groupId = Config::ESI_GROUP_WORMHOLE_ID;
                $length = 10;
                $buildInfo = $controller->setupGroup($groupId, $offset, $length, true);

                $return->offset = $buildInfo['offset'];
                $return->countAll = $buildInfo['countAll'];
                $return->countBuild = $buildInfo['count'];
                $return->countBuildAll = $return->offset;
                break;
            case 'Structures':
                $categoryId = Config::ESI_CATEGORY_STRUCTURE_ID;
                $length = 1;
                $buildInfo = $controller->setupCategory($categoryId, $offset, $length);
                $categoryUniverseModel =  Model\Universe\AbstractUniverseModel::getNew('CategoryModel');
                $categoryUniverseModel->getById($categoryId, 0);

                $return->offset = $buildInfo['offset'];
                $return->countBuild = $buildInfo['count'];
                $return->countBuildAll = $return->offset;
                $return->subCount = [
                    'countBuildAll' => $categoryUniverseModel->getTypesCount(false)
                ];
                break;
            case 'Ships':
                $categoryId = Config::ESI_CATEGORY_SHIP_ID;
                $length = 2;
                $buildInfo = $controller->setupCategory($categoryId, $offset, $length);
                $categoryUniverseModel =  Model\Universe\AbstractUniverseModel::getNew('CategoryModel');
                $categoryUniverseModel->getById($categoryId, 0);

                $return->offset = $buildInfo['offset'];
                $return->countBuild = $buildInfo['count'];
                $return->countBuildAll = $return->offset;
                $return->subCount = [
                    'countBuildAll' => $categoryUniverseModel->getTypesCount(false)
                ];
                break;
            case 'SystemStatic':
                $length = 300;
                $buildInfo = $this->setupSystemStaticTable($offset, $length);

                $return->offset = $buildInfo['offset'];
                $return->countAll = $buildInfo['countAll'];
                $return->countBuild = $buildInfo['count'];
                $return->countBuildAll = $return->offset;
                break;
            case 'SystemNeighbour':
                $length = 1500;
                $buildInfo = $this->setupSystemJumpTable($offset, $length);

                $return->offset = $buildInfo['offset'];
                $return->countAll = $buildInfo['countAll'];
                $return->countBuild = $buildInfo['count'];
                $return->countBuildAll = $return->offset;
                break;
        }

        $return->progress = $percent($return->countAll, $return->countBuildAll);

        if($return->countBuildAll < $return->countAll){
            $return->count++;
        }

        echo json_encode($return);
    }

    /**
     * clear search index
     * @param \Base $f3
     * @throws \Exception
     */
    public function clearIndex(\Base $f3){
        $postData = (array)$f3->get('POST');
        $type = (string)$postData['type'];

        $return = (object) [];
        $return->error = [];
        $return->type = $type;
        $return->count = 0;
        $return->countAll = 0;
        $return->countBuild = 0;
        $return->countBuildAll = 0;
        $return->progress = 0;

        $controller = new Controller\Ccp\Universe();
        switch($type) {
            case 'Systems':
                $controller->clearSystemsIndex();
                $systemUniverseModel =  Model\Universe\AbstractUniverseModel::getNew('SystemModel');
                $return->countAll = $systemUniverseModel->getRowCount();
                break;
            case 'SystemNeighbour':
                $systemNeighbourModel =  Model\Universe\AbstractUniverseModel::getNew('SystemNeighbourModel');
                $systemNeighbourModel->truncate();
                $return->countAll = (int)$f3->get('REQUIREMENTS.DATA.NEIGHBOURS');
                break;
        }

        echo json_encode($return);
    }

    /**
     * import static 'system_static` table data from *.csv
     * @param int $offset
     * @param int $length
     * @return array
     * @throws \Exception
     */
    protected function setupSystemStaticTable(int $offset = 0, int $length = 0) : array {
        $info = ['countAll' => 0, 'countChunk' => 0, 'count' => 0, 'offset' => $offset];

        /**
         * @var $systemStaticModel Model\Universe\SystemStaticModel
         */
        $systemStaticModel = Model\Universe\AbstractUniverseModel::getNew('SystemStaticModel');
        if(!empty($csvData = $systemStaticModel::getCSVData($systemStaticModel->getTable()))){
            $info['countAll'] = count($csvData);
            if($length){
                $csvData = array_slice($csvData, $offset, $length);
            }
            $info['countChunk'] = count($csvData);
            $cols = ['typeId' => [], 'systemId' => []];
            foreach($csvData as $data){
                $validColCount = 0;
                $systemStaticModel->getById((int)$data['id'], 0);
                $systemStaticModel->id = (int)$data['id'];
                foreach($cols as $col => &$invalidIds){
                    if($systemStaticModel->exists($col)){
                        $colVal = (int)$data[$col];
                        if(!in_array($colVal, $invalidIds)){
                            $relModel = $systemStaticModel->rel($col);
                            $relModel->getById($colVal, 0);
                            if($relModel->valid()){
                                $systemStaticModel->$col = $relModel;
                                $validColCount++;
                            }else{
                                $invalidIds[] = $colVal;
                                break;
                            }
                        }else{
                            break;
                        }
                    }
                }

                if($validColCount == count($cols)){
                    $systemStaticModel->save();
                }
                $systemStaticModel->reset();

                $info['count']++;
                $info['offset']++;
            }
        }

        return $info;
    }

    /**
     * This function is just for setting up the cache table 'system_neighbour' which is used
     * for system jump calculation. Call this function manually when CCP adds Systems/Stargates
     * @param int $offset
     * @param int $length
     * @return array
     */
    protected function setupSystemJumpTable(int $offset = 0, int $length = 0) : array {
        $info = ['countAll' => 0, 'countChunk' => 0, 'count' => 0, 'offset' => $offset];
        $universeDB = $this->getDB('UNIVERSE');

        $query = "SELECT SQL_CALC_FOUND_ROWS
                      `system`.`id` `systemId`,
                      `system`.`name` `systemName`,
                      `system`.`constellationId` `constellationId`,
                      ROUND( `system`.`securityStatus`, 4) `trueSec`,
                      `constellation`.`regionId` `regionId`,
                      (
                        SELECT
                          GROUP_CONCAT( NULLIF(`sys_inner`.`id`, NULL) SEPARATOR ':')
                        FROM
                          `stargate` INNER JOIN
                          `system` `sys_inner` ON
                            `sys_inner`.`id` = `stargate`.`destinationSystemId`
                        WHERE
                          `stargate`.`systemId` = `system`.`id`
                      ) `jumpNodes`
                    FROM
                      `system` INNER JOIN
                      `constellation` ON
                        `constellation`.`id` = `system`.`constellationId`
                    WHERE
                      `constellation`.`regionId` != :regionIdJove1 AND
                      `constellation`.`regionId` != :regionIdJove2 AND
                      `constellation`.`regionId` != :regionIdJove3 AND
                      (
                          `system`.`security` = :ns OR
                          `system`.`security` = :ls OR
                          `system`.`security` = :hs OR
                          `system`.`security` = :ts
                      )
                    HAVING
                        `jumpNodes` IS NOT NULL
                    ";

        $args = [
            ':regionIdJove1' => 10000017,
            ':regionIdJove2' => 10000019,
            ':regionIdJove3' => 10000004,
            ':ns' => '0.0',
            ':ls' => 'L',
            ':hs' => 'H',
            ':ts' => 'T'
        ];

        if($length){
            $query .= ' LIMIT :limit';
            $args[':limit'] = $length;

            if($offset){
                $query .= ' OFFSET :offset';
                $args[':offset'] = $offset;
            }
        }

        $rows = $universeDB->exec($query, $args);

        if(!empty($countRes = $universeDB->exec("SELECT FOUND_ROWS() `count`")) && isset($countRes[0]['count'])){
            $info['countAll'] = (int)$countRes[0]['count'];
        }

        if($info['countChunk'] = count($rows)){
            $placeholderStr = function(string $str) : string {
                return ':' . $str;
            };

            $updateRule = function(string $str) : string {
                return $str . " = VALUES(" . $str . ")";
            };

            $universeDB->begin();
            foreach($rows as $row){
                $info['count']++;
                $info['offset']++;

                if(!$row['jumpNodes']){
                    // should never happen!
                    continue;
                }

                $columns = array_keys($row);
                $columnsQuoted = array_map($universeDB->quotekey, $columns);
                $placeholder = array_map($placeholderStr, $columns);
                $args = array_combine($placeholder, $row);

                $updateSql = array_map($updateRule, $columns);

                $sql = "INSERT INTO
                            system_neighbour(" . implode(', ', $columnsQuoted) . ")
                                VALUES(" . implode(', ', $placeholder) . ")
                          ON DUPLICATE KEY UPDATE
                            " . implode(', ', $updateSql);

                $universeDB->exec($sql, $args);
            }
            $universeDB->commit();
        }

        return $info;
    }

}
