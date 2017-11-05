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

    /**
     * load data from API into $this and save $this
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    abstract protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []);

    /**
     * load object by $id
     * -> if $id not exists in DB -> query API
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    public function loadById(int $id, string $accessToken = '', array $additionalOptions = []){
        /**
         * @var $model self
         */
        $model = $this->getById($id);
        if($model->isOutdated()){
            $model->loadData($id, $accessToken, $additionalOptions);
        }
    }

    /**
     * checks whether data is outdated and should be refreshed
     * @return bool
     */
    protected function isOutdated(): bool {
        $outdated = true;
        if(!$this->dry()){
            $timezone = $this->getF3()->get('getTimeZone')();
            $currentTime = new \DateTime('now', $timezone);
            $updateTime = \DateTime::createFromFormat(
                'Y-m-d H:i:s',
                $this->updated,
                $timezone
            );
            $interval = $updateTime->diff($currentTime);
            if($interval->days < self::CACHE_MAX_DAYS ){
                $outdated = false;
            }
        }
        return $outdated;
    }
}