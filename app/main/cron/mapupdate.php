<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 30.07.2015
 * Time: 17:54
 */

namespace cron;
use DB;

class MapUpdate {

    const LOG_TEXT_MAPS = '%s (%d maps)';

    // disabled maps will be fully deleted after (x) days
    const DAYS_UNTIL_MAP_DELETION = 30;

    /**
     * deactivate all "private" maps whose lifetime is over
     * >> php index.php "/cron/deactivateMapData"
     * @param \Base $f3
     */
    function deactivateMapData(\Base $f3){
        $privateMapLifetime = (int)$f3->get('PATHFINDER.MAP.PRIVATE.LIFETIME');

        if($privateMapLifetime > 0){
            $pfDB = DB\Database::instance()->getDB('PF');

            $sqlDeactivateExpiredMaps = "UPDATE map SET
                active = 0
            WHERE
                map.active = 1 AND
                map.typeId = 2 AND
                TIMESTAMPDIFF(DAY, map.updated, NOW() ) > :lifetime";

            $pfDB->exec($sqlDeactivateExpiredMaps, ['lifetime' => $privateMapLifetime]);
            $deactivatedMapsCount = $pfDB->count();

            // Log ------------------------
            $log = new \Log('cron_' . __FUNCTION__ . '.log');
            $log->write( sprintf(self::LOG_TEXT_MAPS, __FUNCTION__, $deactivatedMapsCount) );
        }
    }

    /**
     * delete all deactivated maps
     * >> php index.php "/cron/deleteMapData"
     * @param \Base $f3
     */
    function deleteMapData(\Base $f3){

        $pfDB = DB\Database::instance()->getDB('PF');

        $sqlDeleteDisabledMaps = "DELETE FROM
                map
            WHERE
                map.active = 0 AND
                TIMESTAMPDIFF(DAY, map.updated, NOW() ) > :deletion_time";

        $pfDB->exec($sqlDeleteDisabledMaps, ['deletion_time' => self::DAYS_UNTIL_MAP_DELETION]);

        $deletedMapsCount = $pfDB->count();

        // Log ------------------------
        $log = new \Log('cron_' . __FUNCTION__ . '.log');
        $log->write( sprintf(self::LOG_TEXT_MAPS, __FUNCTION__, $deletedMapsCount) );
    }

}