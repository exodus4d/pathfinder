<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 27.05.2018
 * Time: 14:17
 */

namespace Controller\Api;

use Controller;
use DB\Database;
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

        $return = (object) [];
        $return->error = [];
        $return->type = $type;
        $return->count = $count;
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
                $length = 200;
                $offset = $count * $length;
                $buildInfo = $controller->buildSystemsIndex($offset, $length);
                $return->countAll = $buildInfo['countAll'];
                $return->countBuild = $buildInfo['countBuild'];
                $return->countBuildAll = count($controller->getSystemsIndex());
                $return->progress = $percent($return->countAll, $offset + $length);
                break;
            case 'Structures':
                $categoryId = 65;
                $length = 2;
                $offset = $count * $length;
                $buildInfo = $controller->setupCategory($categoryId, $offset, $length);

                $categoryUniverseModel =  Model\Universe\BasicUniverseModel::getNew('CategoryModel');
                $return->countAll = (int)$f3->get('REQUIREMENTS.DATA.STRUCTURES');
                $return->countBuild = array_reduce($buildInfo, $sum, 0);
                $return->countBuildAll = $categoryUniverseModel->getById($categoryId, 0)->getTypesCount(false);
                $return->progress = $percent($return->countAll, $return->countBuildAll);
                break;
            case 'Ships':
                $categoryId = 6;
                $length = 2;
                $offset = $count * $length;
                $buildInfo = $controller->setupCategory($categoryId, $offset, $length);

                $categoryUniverseModel =  Model\Universe\BasicUniverseModel::getNew('CategoryModel');
                $return->countAll = (int)$f3->get('REQUIREMENTS.DATA.SHIPS');
                $return->countBuild = array_reduce($buildInfo, $sum, 0);
                $return->countBuildAll = $categoryUniverseModel->getById($categoryId, 0)->getTypesCount(false);
                $return->progress = $percent($return->countAll, $return->countBuildAll);
                break;
            case 'SystemNeighbourModel':
                // Becomes deprecated with new Universe DB!!!
                $this->setupSystemJumpTable();

                $return->countAll = 5214;
                $return->countBuild = Database::instance()->getRowCount('system_neighbour');
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
                $systemUniverseModel =  Model\Universe\BasicUniverseModel::getNew('SystemModel');
                $return->countAll = Database::instance()->getRowCount($systemUniverseModel->getTable(), 'UNIVERSE');
                break;
        }

        echo json_encode($return);
    }

    /**
     * This function is just for setting up the cache table 'system_neighbour' which is used
     * for system jump calculation. Call this function manually when CCP adds Systems/Stargates
     */
    protected function setupSystemJumpTable(){
        $pfDB = $this->getDB('PF');
        $ccpDB = $this->getDB('CCP');

        $query = "SELECT
                map_sys.solarSystemID system_id,
                map_sys.regionID region_id,
                map_sys.constellationID constellation_id,
                map_sys.solarSystemName system_name,
                ROUND( map_sys.security, 4) system_security,
                (
                    SELECT
                        GROUP_CONCAT( NULLIF(map_sys_inner.solarSystemName, NULL) SEPARATOR ':')
                    FROM
                        mapSolarSystemJumps map_jump INNER JOIN
                        mapSolarSystems map_sys_inner ON
                            map_sys_inner.solarSystemID = map_jump.toSolarSystemID
                    WHERE
                        map_jump.fromSolarSystemID = map_sys.solarSystemID
                ) system_neighbours
            FROM
                mapSolarSystems map_sys
            HAVING
              -- skip systems without neighbors (e.g. WHs)
	          system_neighbours IS NOT NULL
            ";

        $rows = $ccpDB->exec($query);

        if(count($rows) > 0){
            // switch DB back to pathfinder DB

            // clear cache table
            $pfDB->exec("TRUNCATE system_neighbour");

            foreach($rows as $row){
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
                    ':regionId' => $row['region_id'],
                    ':constellationId' => $row['constellation_id'],
                    ':systemName' => $row['system_name'],
                    ':systemId' => $row['system_id'],
                    ':jumpNodes' => $row['system_neighbours'],
                    ':trueSec' => $row['system_security']
                ]);
            }
        }
    }

}