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
     * get an singleton instance for a logger instance
     * @param $logFileName
     * @return mixed
     */
    public static function getLogger($logFileName){

        $f3 = \Base::instance();

        $hiveKey = 'LOGGER' . $logFileName;

        // check if log controller already exists
        if( !$f3->exists($hiveKey) ){
            // create new logger instance

            $logFile = $logFileName . '.log';

            $f3->set($hiveKey, new \Log($logFile));
        }

        return $f3->get($hiveKey);
    }


}