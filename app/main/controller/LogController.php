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
     * log types. The Value represents the log file name
     * @var array
     */
    protected static $logTypes = [
        'debug' => 'debug'
    ];

    /**
     * get an singleton instance for a logger instance
     * @param $loggerType
     * @return mixed
     */
    public static function getLogger($loggerType){

        $f3 = \Base::instance();

        $hiveKey = 'LOGGER' . $loggerType;

        // check if log controller already exists
        if( !$f3->exists($hiveKey) ){
            // create new logger instance

            $logFile = self::$logTypes[$loggerType] . '.log';

            $f3->set($hiveKey, new \Log($logFile));
        }


        return $f3->get($hiveKey);
    }


}