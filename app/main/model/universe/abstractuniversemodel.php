<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 29.07.2017
 * Time: 14:18
 */

namespace Model\Universe;

use Model\AbstractModel;

abstract class AbstractUniverseModel extends AbstractModel {

    /**
     * alias name for database connection
     */
    const DB_ALIAS                          = 'UNIVERSE';

    /**
     *
     */
    const CACHE_KEY_PREFIX                  = 'index_universe_';

    /**
     * cache key for model data -> should "never" expire
     * -> until manual remove and or global cache clear
     */
    const CACHE_INDEX_EXPIRE_KEY            = 86400 * 356 * 5;

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
    public function beforeUpdateEvent($self, $pkeys) : bool {
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
     * @return null|\stdClass
     */
    public function buildIndex(){
        $data = null;
        if($hashKeyId = $this->getHashKey()){
            $data = $this->getData();
            $this->getF3()->set($hashKeyId, $data, self::CACHE_INDEX_EXPIRE_KEY);

            // ... add hashKey for this rows to tableIndex as well
            self::buildTableIndex($this, [$hashKeyId]);
        }

        return $data;
    }

    /**
     * add $rowKeys (hashKeys) to a search index that holds all rowKeys of a table
     * @param AbstractUniverseModel $model
     * @param array $rowKeys
     */
    public static function buildTableIndex(AbstractUniverseModel $model, array $rowKeys = []){
        $hashKeyTable = self::generateHashKeyTable($model->getTable());
        if( !self::getF3()->exists($hashKeyTable, $cachedData) ){
            $cachedData = [];
        }
        $cachedData = array_unique(array_merge($cachedData, $rowKeys));

        self::getF3()->set($hashKeyTable, $cachedData, self::CACHE_INDEX_EXPIRE_KEY);
    }

    /**
     * get data from "search" index for this model
     * -> if data not found -> try to build up index for this model
     * @return null|\stdClass
     */
    public function fromIndex(){
        $data = null;
        if($hashKeyId = $this->getHashKey()){
            if( !self::existsCacheValue($hashKeyId, $data)){
                $data = $this->buildIndex();
            }
        }

        return $data;
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
        $this->getById($id, 0);
        if($this->isOutdated()){
            $this->loadData($id, $accessToken, $additionalOptions);
        }
    }

    /**
     * load data from API into $this and save $this
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    abstract protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []);

    /**
     * generate hashKey for a table row data for search index build
     * @param string $table
     * @param $value
     * @return string
     */
    public static function generateHashKeyRow(string $table, $value) : string {
        return self::generateHashKeyTable($table) . '_' .  md5(strtolower((string)$value));
    }

    /**
     * generate hashKey for a complete table
     * -> should hold hashKeys for multiple rows
     * @param string $table
     * @return string
     */
    public static function generateHashKeyTable(string $table) : string {
        return self::CACHE_KEY_PREFIX . strtolower($table);
    }
}