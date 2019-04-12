<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 30.07.2015
 * Time: 17:54
 */

namespace cron;


use lib\Config;
use Model\Pathfinder;

class MapUpdate extends AbstractCron {

    const LOG_TEXT_MAPS = '%s (%d maps)';

    // disabled maps will be fully deleted after (x) days
    const DAYS_UNTIL_MAP_DELETION = 30;

    /**
     * deactivate all "private" maps whose lifetime is over
     * >> php index.php "/cron/deactivateMapData"
     * @param \Base $f3
     */
    function deactivateMapData(\Base $f3){
        $this->setMaxExecutionTime();
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
    }

    /**
     * delete all deactivated maps
     * >> php index.php "/cron/deleteMapData"
     * @param \Base $f3
     * @throws \Exception
     */
    function deleteMapData(\Base $f3){
        $this->setMaxExecutionTime();
        $deletedMapsCount = 0;

        if($pfDB = $f3->DB->getDB('PF')){
            $sqlDeleteDisabledMaps = "SELECT
                id 
            FROM
                map
            WHERE
                map.active = 0 AND
                TIMESTAMPDIFF(DAY, map.updated, NOW() ) > :deletion_time";

            $disabledMaps = $pfDB->exec($sqlDeleteDisabledMaps, ['deletion_time' => self::DAYS_UNTIL_MAP_DELETION]);

            if($deletedMapsCount = $pfDB->count()){
                $mapModel =  Pathfinder\AbstractPathfinderModel::getNew('MapModel');
                foreach($disabledMaps as $data){
                    $mapModel->getById( (int)$data['id'], 3, false );
                    if( !$mapModel->dry() ){
                         $mapModel->erase();
                    }
                    $mapModel->reset();
                }
            }
        }

        // Log ------------------------
        $log = new \Log('cron_' . __FUNCTION__ . '.log');
        $log->write( sprintf(self::LOG_TEXT_MAPS, __FUNCTION__, $deletedMapsCount) );
    }

    /**
     * delete expired EOL connections
     * >> php index.php "/cron/deleteEolConnections"
     * @param \Base $f3
     * @throws \Exception
     */
    function deleteEolConnections(\Base $f3){
        $this->setMaxExecutionTime();
        $eolExpire = (int)$f3->get('PATHFINDER.CACHE.EXPIRE_CONNECTIONS_EOL');

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
                    /**
                     * @var $connection Pathfinder\ConnectionModel
                     */
                    $connection = Pathfinder\AbstractPathfinderModel::getNew('ConnectionModel');
                    foreach($connectionsData as $data){
                        $connection->getById( (int)$data['id'] );
                        if( !$connection->dry() ){
                            $connection->erase();
                        }
                    }
                }
            }
        }
    }

    /**
     * delete expired WH connections after max lifetime for wormholes is reached
     * >> php index.php "/cron/deleteExpiredConnections"
     * @param \Base $f3
     * @throws \Exception
     */
    function deleteExpiredConnections(\Base $f3){
        $this->setMaxExecutionTime();
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
                    /**
                     * @var $connection Pathfinder\ConnectionModel
                     */
                    $connection = Pathfinder\AbstractPathfinderModel::getNew('ConnectionModel');
                    foreach($connectionsData as $data){
                        $connection->getById( (int)$data['id'] );
                        if( !$connection->dry() ){
                            $connection->erase();
                        }
                    }
                }
            }
        }
    }

    /**
     * delete all expired signatures on "inactive" systems
     * >> php index.php "/cron/deleteSignatures"
     * @param \Base $f3
     */
    function deleteSignatures(\Base $f3){
        $this->setMaxExecutionTime();
        $signatureExpire = (int)$f3->get('PATHFINDER.CACHE.EXPIRE_SIGNATURES');

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

                $pfDB->exec($sqlDeleteExpiredSignatures, ['lifetime' => $signatureExpire]);
            }
        }
    }

}