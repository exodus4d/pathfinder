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
    const CACHE_MAX_DAYS                            = 60;

    const CACHE_KEY_PREFIX                          = 'index_universe_';

    /**
     * cache key for model data -> should "never" expire
     * -> until manual remove and or global cache clear
     */
    const CACHE_INDEX_EXPIRE_KEY                    = 86400 * 356 * 5;

    protected $db = 'DB_UNIVERSE';

    /**
     * get model data -> should be overwritten
     * @return null
     */
    public function getData(){
        return null;
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     * @return bool
     */
    public function beforeUpdateEvent($self, $pkeys){
        // if model changed, 'update' col needs to be updated as well
        // -> data no longer "outdated"
        $this->touch('updated');

        return parent::beforeUpdateEvent($self, $pkeys);
    }

    /**
     * get hashKey for search index build
     * -> used by the cache backend
     * @param string $column
     * @return bool|string
     */
    public function getHashKey(string $column = '_id'){
        $key = false;
        if( !$this->dry() && $this->exists($column) ){
            $key = self::generateHashKeyRow($this->getTable(), $this->$column);
        }
        return $key;
    }

    /**
     * calculate time period (in seconds) from now on, until data get expired
     * @return int
     */
    /*
    public function calcTtl() : int {
        $ttl = 0;
        if(!$this->dry()){
            $timezone = $this->getF3()->get('getTimeZone')();
            $currentTime = new \DateTime('now', $timezone);
            $updateTime = \DateTime::createFromFormat(
                'Y-m-d H:i:s',
                $this->updated,
                $timezone
            );
            // add expire period to last updated timestamp
            $updateTime->modify('+' . self::CACHE_MAX_DAYS . ' day');

            $seconds = $updateTime->getTimestamp() - $currentTime->getTimestamp();
            if($seconds > 0){
                $ttl = $seconds;
            }
        }

        return $ttl;
    }
*/
    /**
     * build up a "search" index for this model
     * -> stores getData() result into Cache (RAM) for faster access
     */
    public function buildIndex(){
        if($hashKeyId = $this->getHashKey()){
            $f3 = self::getF3();
            $hashKeyTable = self::generateHashKeyTable($this->getTable());

            if( !$f3->exists($hashKeyTable, $cachedData) ){
                $cachedData = [];
            }

            if( !in_array($hashKeyId, $cachedData) ){
                $cachedData[] = $hashKeyId;
            }

            // value update does not update ttl -> delete key from cache and add again
            $f3->clear($hashKeyId);
            $f3->clear($hashKeyTable);

            // straight into cache (no $f->set() ), no sync with hive here -> save ram
            self::setCacheValue($hashKeyId, $this->getData(), self::CACHE_INDEX_EXPIRE_KEY);
            self::setCacheValue($hashKeyTable, $cachedData, self::CACHE_INDEX_EXPIRE_KEY);
        }
    }

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
        $model = $this->getById($id, 0);
        if($model->isOutdated()){
            $model->loadData($id, $accessToken, $additionalOptions);
        }
    }

    /**
     * load data by foreign key or other column than "id"
     * @param string $key
     * @param $value
     */
    public function loadByKey(string $key, $value){
        /**
         * @var $model self
         */
        $model = $this->getByForeignKey($key, $value, ['limit' => 1]);
        if($model->isOutdated()){
            $model->loadDataByKey($key, $value);
        }
    }

    /**
     * load data from API into $this and save $this
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    abstract protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []);

    protected function loadDataByKey(string $key, $value){}

    /**
     * generate hashKey for a table row data for search index build
     * @param string $table
     * @param $value
     * @return string
     */
    public static function generateHashKeyRow(string $table, $value){
        return self::generateHashKeyTable($table) . '_' .  md5(strtolower((string)$value));
    }

    /**
     * generate hashKey for a complete table
     * -> should hold hashKeys for multiple rows
     * @param string $table
     * @return string
     */
    public static function generateHashKeyTable(string $table){
        return self::CACHE_KEY_PREFIX . strtolower($table);
    }

    /**
     * factory for all UniverseModels
     * @param string $model
     * @param int $ttl
     * @return BasicModel|null
     * @throws \Exception
     */
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