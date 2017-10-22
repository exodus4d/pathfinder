<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 29.07.2017
 * Time: 14:18
 */

namespace Model\Universe;


use DB\Database;
use Model\BasicModel;

abstract class BasicUniverseModel extends BasicModel {

    /**
     * data from Universe tables is static and does not change frequently
     * -> refresh static data after X days
     */
    const CACHE_MAX_DAYS = 7;

    protected $db = 'DB_UNIVERSE';

    public static function getNew($model, $ttl = self::DEFAULT_TTL){
        $class = null;

        $model = '\\' . __NAMESPACE__ . '\\' . $model;
        if(class_exists($model)){
            $db = Database::instance()->getDB('UNIVERSE');
            $class = new $model($db, null, null, $ttl);
        }else{
            throw new \Exception(sprintf(self::ERROR_INVALID_MODEL_CLASS, $model));
        }

        return $class;
    }
}