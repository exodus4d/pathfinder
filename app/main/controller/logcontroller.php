<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 14.06.2015
 * Time: 15:24
 */

namespace controller;


class LogController extends Controller  {


    /**
     * get Logger instance
     * @param string $type
     * @return \Log|null
     */
    public static function getLogger($type){
        $f3 = \Base::instance();
        $logFiles = $f3->get('PATHFINDER.LOGFILES');
        $logger = null;
        if( !empty($logFiles[$type]) ){
            $logFile = $logFiles[$type] . '.log';
            $logger = new \Log($logFile);
        }

        return $logger;
    }

}