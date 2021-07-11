<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 29.07.2017
 * Time: 14:18
 */

namespace Exodus4D\Pathfinder\Model\Universe;

use Exodus4D\Pathfinder\Model\AbstractModel;

abstract class AbstractUniverseModel extends AbstractModel {

    /**
     * alias name for database connection
     */
    const DB_ALIAS                          = 'UNIVERSE';

    /**
     *
     */
    const CACHE_KEY_PREFIX                  = parent::CACHE_KEY_PREFIX . '_' . self::DB_ALIAS;

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
     * setter for positions array (x/y/z)
     * @param $position
     * @return null
     */
    public function set_position($position){
        $position = (array)$position;
        if(count($position) === 3){
            $this->x = $position['x'];
            $this->y = $position['y'];
            $this->z = $position['z'];
        }
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
        $self->touch('updated');

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
        if($this->valid() && $this->exists($column)){
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
     * convert CCPs ids for system security into Pathfinder security label
     * -> used e.g. in "Dogma Attributes" (wormholeTargetSystemClass) for wormhole types
     * @param int $id
     * @return string|null
     */
    public static function getSystemSecurityFromId(int $id) : ?string {
        $security = null;
        if(
            ($id >= 1 && $id <= 6) ||
            ($id >= 12 && $id <= 18)
        ){
            $security = 'C' . $id;
        }elseif($id == 7){
            $security = 'H';
        }elseif($id == 8){
            $security = 'L';
        }elseif($id == 9){
            $security = '0.0';
        }elseif($id == 25){
            $security = 'T';
        }

        return $security;
    }

    /**
     * add $rowKeys (hashKeys) to a search index that holds all rowKeys of a table
     * @param AbstractUniverseModel $model
     * @param array $rowKeys
     */
    public static function buildTableIndex(AbstractUniverseModel $model, array $rowKeys = []){
        $hashKeyTable = static::generateHashKeyTable($model->getTable());
        if( !self::getF3()->exists($hashKeyTable, $cachedData) ){
            $cachedData = [];
        }
        $cachedData = array_unique(array_merge($cachedData, $rowKeys));

        self::getF3()->set($hashKeyTable, $cachedData, self::CACHE_INDEX_EXPIRE_KEY);
    }

    /**
     * generate hashKey for a table row data for search index build
     * @param string $table
     * @param $value
     * @return string
     */
    public static function generateHashKeyRow(string $table, $value) : string {
        return static::generateHashKeyTable($table) . '_' .  md5(strtolower((string)$value));
    }

    /**
     * generate hashKey for a complete table
     * -> should hold hashKeys for multiple rows
     * @param string $table
     * @param string $prefix
     * @return string
     */
    public static function generateHashKeyTable(string $table, string $prefix = self::CACHE_KEY_PREFIX) : string {
        return parent::generateHashKeyTable($table, $prefix);
    }
}