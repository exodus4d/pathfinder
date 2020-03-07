<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 30.07.2015
 * Time: 17:54
 */

namespace Exodus4D\Pathfinder\Cron;


use Exodus4D\Pathfinder\Lib\Config;
use Exodus4D\Pathfinder\Model\Pathfinder;

class MapUpdate extends AbstractCron {

    /**
     * log text
     */
    const LOG_TEXT_MAPS_DELETED = ', %3s maps deleted';

    /**
     * disabled maps will be fully deleted after (x) days
     */
    const DAYS_UNTIL_MAP_DELETION = 30;

    /**
     * deactivate all "private" maps whose lifetime is over
     * >> php index.php "/cron/deactivateMapData"
     * @param \Base $f3
     */
    function deactivateMapData(\Base $f3){
        $this->logStart(__FUNCTION__, false);
        $privateMapLifetime = (int)Config::getMapsDefaultConfig('private.lifetime');

        if($privateMapLifetime > 0){
            if($pfDB = $f3->DB->getDB('PF')){
                $sqlDeactivateExpiredMaps = "UPDATE map SET
                        active = 0
                    WHERE
                        map.active = 1 AND
                        map.typeId = 2 AND
                        TIMESTAMPDIFF(DAY, map.updated, NOW() ) > :lifetime";

                $pfDB->exec($sqlDeactivateExpiredMaps, ['lifetime' => $privateMapLifetime]);
            }
        }

        $this->logEnd(__FUNCTION__);
    }

    /**
     * delete all deactivated maps
     * >> php index.php "/cron/deleteMapData"
     * @param \Base $f3
     * @throws \Exception
     */
    function deleteMapData(\Base $f3){
        $this->logStart(__FUNCTION__);
        $total = 0;

        if($pfDB = $f3->DB->getDB('PF')){
            $sqlDeleteDisabledMaps = "SELECT
                id 
            FROM
                map
            WHERE
                map.active = 0 AND
                TIMESTAMPDIFF(DAY, map.updated, NOW() ) > :deletion_time";

            $disabledMaps = $pfDB->exec($sqlDeleteDisabledMaps, ['deletion_time' => self::DAYS_UNTIL_MAP_DELETION]);

            if($total = $pfDB->count()){
                $mapModel =  Pathfinder\AbstractPathfinderModel::getNew('MapModel');
                foreach($disabledMaps as $data){
                    $mapModel->getById( (int)$data['id'], 3, false );
                    if($mapModel->valid()){
                         $mapModel->erase();
                    }
                    $mapModel->reset();
                }
            }
        }

        $count = $importCount = $total;

        // Log --------------------------------------------------------------------------------------------------------
        $text = sprintf(self::LOG_TEXT_MAPS_DELETED, $total);
        $this->logEnd(__FUNCTION__, $total, $count, $importCount, 0, $text);
    }

    /**
     * delete expired EOL connections
     * >> php index.php "/cron/deleteEolConnections"
     * @param \Base $f3
     * @throws \Exception
     */
    function deleteEolConnections(\Base $f3){
        $this->logStart(__FUNCTION__, false);
        $eolExpire = (int)$f3->get('PATHFINDER.CACHE.EXPIRE_CONNECTIONS_EOL');

        $total = 0;
        $count = 0;
        if($eolExpire > 0){
            if($pfDB = $f3->DB->getDB('PF')){
                $sql = "SELECT
                    `con`.`id`
                FROM
                  `connection` `con` INNER JOIN
                  `map` ON 
                    `map`.`id` = `con`.`mapId`
                WHERE
                  `map`.`deleteEolConnections` = :deleteEolConnections AND
                  TIMESTAMPDIFF(SECOND, `con`.`eolUpdated`, NOW() ) > :expire_time
            ";

                $connectionsData = $pfDB->exec($sql, [
                    'deleteEolConnections' => 1,
                    'expire_time' => $eolExpire
                ]);

                if($connectionsData){
                    $total = count($connectionsData);
                    /**
                     * @var $connection Pathfinder\ConnectionModel
                     */
                    $connection = Pathfinder\AbstractPathfinderModel::getNew('ConnectionModel');
                    foreach($connectionsData as $data){
                        $connection->getById( (int)$data['id'] );
                        if($connection->valid()){
                            $connection->erase();
                            $count++;
                        }
                    }
                }
            }
        }

        $importCount = $total;

        $this->logEnd(__FUNCTION__, $total, $count, $importCount);
    }

    /**
     * delete expired WH connections after max lifetime for wormholes is reached
     * >> php index.php "/cron/deleteExpiredConnections"
     * @param \Base $f3
     * @throws \Exception
     */
    function deleteExpiredConnections(\Base $f3){
        $this->logStart(__FUNCTION__, false);

        $total = 0;
        $count = 0;

        $whExpire = (int)$f3->get('PATHFINDER.CACHE.EXPIRE_CONNECTIONS_WH');

        if($whExpire > 0){
            if($pfDB = $f3->DB->getDB('PF')){
                $sql = "SELECT
                    `con`.`id`
                FROM
                  `connection` `con` INNER JOIN
                  `map` ON 
                    `map`.`id` = `con`.`mapId`
                WHERE
                  `map`.`deleteExpiredConnections` = :deleteExpiredConnections AND
                  `con`.`scope` = :scope AND
                  TIMESTAMPDIFF(SECOND, `con`.`created`, NOW() ) > :expire_time
            ";

                $connectionsData = $pfDB->exec($sql, [
                    'deleteExpiredConnections' => 1,
                    'scope' => 'wh',
                    'expire_time' => $whExpire
                ]);

                if($connectionsData){
                    $total = count($connectionsData);
                    /**
                     * @var $connection Pathfinder\ConnectionModel
                     */
                    $connection = Pathfinder\AbstractPathfinderModel::getNew('ConnectionModel');
                    foreach($connectionsData as $data){
                        $connection->getById( (int)$data['id'] );
                        if($connection->valid()){
                            $connection->erase();
                            $count++;
                        }
                    }
                }
            }
        }

        $importCount = $total;

        $this->logEnd(__FUNCTION__, $total, $count, $importCount);
    }

    /**
     * delete all expired signatures on "inactive" systems
     * >> php index.php "/cron/deleteSignatures"
     * @param \Base $f3
     */
    function deleteSignatures(\Base $f3){
        $this->logStart(__FUNCTION__, false);
        $signatureExpire = (int)$f3->get('PATHFINDER.CACHE.EXPIRE_SIGNATURES');

        $count = 0;
        if($signatureExpire > 0){
            if($pfDB = $f3->DB->getDB('PF')){
                $sqlDeleteExpiredSignatures = "DELETE `sigs` FROM
                    `system_signature` `sigs` INNER JOIN
                    `system` ON 
                      `system`.`id` = `sigs`.`systemId`
                  WHERE
                    `system`.`active` = 0 AND
                    TIMESTAMPDIFF(SECOND, `sigs`.`updated`, NOW() ) > :lifetime
                ";

                $count = $pfDB->exec($sqlDeleteExpiredSignatures, ['lifetime' => $signatureExpire]);
            }
        }

        $importCount = $total = $count;

        $this->logEnd(__FUNCTION__, $total, $count, $importCount);
    }

}