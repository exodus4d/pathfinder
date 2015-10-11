<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 30.07.2015
 * Time: 19:35
 */

namespace cron;
use Controller;
use DB;
use Model;


class CharacterUpdate {

    /**
     * delete all character log data
     * >> php index.php "/cron/deleteLogData"
     * @param $f3
     */
    function deleteLogData($f3){

        DB\Database::instance()->setDB('PF');

        $characterLogModel = Model\BasicModel::getNew('CharacterLogModel');

        // find "old" character logs
        $characterLogs = $characterLogModel->find([
            'TIMESTAMPDIFF(SECOND, updated, NOW() ) > :lifetime',
            ':lifetime' => (int)$f3->get('PATHFINDER.CACHE.CHARACTER_LOG')
        ]);

        if(is_object($characterLogs)){
            foreach($characterLogs as $characterLog){
                // delete log and all cached values
                $characterLog->erase();
            }
        }




    }

}