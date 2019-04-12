<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 27.05.2018
 * Time: 14:17
 */

namespace Controller\Api;

use Controller;
use Model;

class Setup extends Controller\Controller {

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
        $count = (int)$postData['count'];
        $offset = (int)$postData['offset'];

        $return = (object) [];
        $return->error = [];
        $return->type = $type;
        $return->count = $count;
        $return->offset = $offset;
        $return->countAll = 0;
        $return->countBuild = 0;
        $return->countBuildAll = 0;
        $return->progress = 0;

        /**
         * sum array values
         * @param int $carry
         * @param int $value
         * @return int
         */
        $sum = function(int $carry, int $value){
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
                $return->countBuildAll = $offset;
                $return->progress = $percent($return->countAll, $offset);
                break;
            case 'Structures':
                $categoryId = 65;
                $length = 2;
                $offset = $count * $length;
                $buildInfo = $controller->setupCategory($categoryId, $offset, $length);

                $categoryUniverseModel =  Model\Universe\AbstractUniverseModel::getNew('CategoryModel');
                $categoryUniverseModel->getById($categoryId, 0);
                $return->countAll = (int)$f3->get('REQUIREMENTS.DATA.STRUCTURES');
                $return->countBuild = array_reduce($buildInfo, $sum, 0);
                $return->countBuildAll = $categoryUniverseModel->getTypesCount(false);
                $return->progress = $percent($return->countAll, $return->countBuildAll);
                break;
            case 'Ships':
                $categoryId = 6;
                $length = 2;
                $offset = $count * $length;
                $buildInfo = $controller->setupCategory($categoryId, $offset, $length);

                $categoryUniverseModel =  Model\Universe\AbstractUniverseModel::getNew('CategoryModel');
                $categoryUniverseModel->getById($categoryId, 0);
                $return->countAll = (int)$f3->get('REQUIREMENTS.DATA.SHIPS');
                $return->countBuild = array_reduce($buildInfo, $sum, 0);
                $return->countBuildAll = $categoryUniverseModel->getTypesCount(false);
                $return->progress = $percent($return->countAll, $return->countBuildAll);
                break;
            case 'SystemNeighbour':
                // Becomes deprecated with new Universe DB!!!
                $this->setupSystemJumpTable();

                $return->countAll = (int)$f3->get('REQUIREMENTS.DATA.NEIGHBOURS');
                $return->countBuild = $f3->DB->getDB('PF')->getRowCount('system_neighbour');
                $return->countBuildAll = $return->countBuild;
                $return->progress = $percent($return->countAll, $return->countBuildAll);
                break;
        }

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
                $return->countAll = $f3->DB->getDB('UNIVERSE')->getRowCount($systemUniverseModel->getTable());
                break;
        }

        echo json_encode($return);
    }

    /**
     * This function is just for setting up the cache table 'system_neighbour' which is used
     * for system jump calculation. Call this function manually when CCP adds Systems/Stargates
     */
    protected function setupSystemJumpTable(){
        $universeDB =  $this->getDB('UNIVERSE');

        $query = "SELECT
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
                          `system`.`security` = :hs
                      )
                    ";

        $rows = $universeDB->exec($query, [
            ':regionIdJove1' => 10000017,
            ':regionIdJove2' => 10000019,
            ':regionIdJove3' => 10000004,
            ':ns' => '0.0',
            ':ls' => 'L',
            ':hs' => 'H'
        ]);

        if(count($rows)){
            $pfDB = $this->getDB('PF');

            // clear cache table
            $pfDB->exec("TRUNCATE system_neighbour");

            foreach($rows as $row){
                if(!$row['jumpNodes']){
                    // should never happen!
                    continue;
                }

                $pfDB->exec("
                      INSERT INTO
                        system_neighbour(
                          regionId,
                          constellationId,
                          systemName,
                          systemId,
                          jumpNodes,
                          trueSec
                          )
                      VALUES(
                        :regionId,
                        :constellationId,
                        :systemName,
                        :systemId,
                        :jumpNodes,
                        :trueSec
                    )",
                    [
                        ':regionId' => $row['regionId'],
                        ':constellationId' => $row['constellationId'],
                        ':systemName' => $row['systemName'],
                        ':systemId' => $row['systemId'],
                        ':jumpNodes' => $row['jumpNodes'],
                        ':trueSec' => $row['trueSec']
                    ]
                );
            }
        }
    }

}