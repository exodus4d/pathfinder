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

class CharacterUpdate {

    /**
     * delete all character log data
     * >> php index.php "/cron/deleteLogData"
     * @param $f3
     */
    function deleteLogData($f3){

        DB\Database::instance()->setDB('PF');

        $sqlDeleteCharacterLogs = "TRUNCATE TABLE character_log";
        $f3->get('DB')->exec($sqlDeleteCharacterLogs);
    }

}