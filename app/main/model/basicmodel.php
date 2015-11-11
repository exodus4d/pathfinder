<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 22:11
 */

namespace Model;

use DB\SQL\Schema;
use Exception;
use Controller;
use DB;

class BasicModel extends \DB\Cortex {

    /**
     * Hive key with DB object
     * @var string
     */
    protected $db = 'DB_PF';

    /**
     * caching time of field schema - seconds
     * as long as we don´t expect any field changes
     * -> leave this at a higher value
     * @var int
     */
    //protected $ttl = 86400;

    /**
     * caching for relational data
     * @var int
     */
    protected $rel_ttl = 0;

    /**
     * field validation array
     * @var array
     */
    protected $validate = [];

    /**
     * getData() cache key prefix
     * -> do not change, otherwise cached data is lost
     * @var string
     */
    private $dataCacheKeyPrefix = 'DATACACHE';


    public function __construct($db = NULL, $table = NULL, $fluid = NULL, $ttl = 0){

        // add static fields to this mapper
        $this->addStaticFieldConfig();

        parent::__construct($db, $table, $fluid, $ttl);

        // events -----------------------------------------
        $this->afterinsert(function($self){
            $self->clearCacheData();
        });

        // model updated
        $this->afterupdate( function($self){
            $self->clearCacheData();
        });

        // model updated
        $this->beforeinsert( function($self){
            $self->beforeInsertEvent($self);
        });
    }


    /**
     * @param string $key
     * @param mixed $val
     * @return mixed|void
     * @throws Exception\ValidationException
     */
    public function set($key, $val){

        if($key == 'active'){
            // prevent abuse
            return;
        }

        if($key != 'updated'){
            if( $this->exists($key) ){
                $currentVal = $this->get($key);

                // if current value is not a relational object
                // and value has changed -> update table col
                if(
                    !is_object($currentVal) &&
                    $currentVal != $val
                ){
                    $this->touch('updated');
                }
            }
        }

        // trim all values
        if(is_string($val)){
            $val = trim($val);
        }

        $valid = $this->validateField($key, $val);

        if(!$valid){
            $this->throwValidationError($key);
        }else{
            return parent::set($key, $val);
        }
    }

    /**
     * extent the fieldConf Array with static fields for each table
     */
    private function addStaticFieldConfig(){

        if(is_array($this->fieldConf)){

            $staticFieldConfig = [
                'created' => [
                    'type' => Schema::DT_TIMESTAMP
                ],
                'updated' => [
                    'type' => Schema::DF_CURRENT_TIMESTAMP
                ]
            ];

            $this->fieldConf = array_merge($this->fieldConf, $staticFieldConfig);
        }
    }

    /**
     * validates a table column based on validation settings
     * @param $col
     * @param $val
     * @return bool
     */
    private function validateField($col, $val){
        $valid = true;

        if(array_key_exists($col, $this->validate)){

            $fieldValidationOptions = $this->validate[$col];

            foreach($fieldValidationOptions as $validateKey => $validateOption ){
                if(is_array($fieldValidationOptions[$validateKey])){
                    $fieldSubValidationOptions = $fieldValidationOptions[$validateKey];

                    foreach($fieldSubValidationOptions as $validateSubKey => $validateSubOption ){
                        switch($validateKey){
                            case 'length':
                                switch($validateSubKey){
                                    case 'min';
                                        if(strlen($val) < $validateSubOption){
                                            $valid = false;
                                        }
                                        break;
                                    case 'max';

                                        if(strlen($val) > $validateSubOption){
                                            $valid = false;
                                        }
                                        break;
                                }
                                break;
                        }
                    }

                }else{
                    switch($validateKey){
                        case 'regex':
                           $valid = (bool)preg_match($fieldValidationOptions[$validateKey], $val);
                            break;
                    }
                }

                // a validation rule failed
                if(!$valid){
                    break;
                }
            }
        }

        return $valid;
    }

    /**
     * get the cache key for this model
     * ->do not set a key if the model is not saved!
     * @param string $dataCacheTableKeyPrefix
     * @return null|string
     */
    protected function getCacheKey($dataCacheTableKeyPrefix = ''){
        $cacheKey = null;

        // set a model unique cache key if the model is saved
        if( $this->_id > 0){
            // check if there is a given key prefix
            // -> if not, use the standard key.
            // this is useful for caching multiple data sets according to one row entry

            $cacheKey = $this->dataCacheKeyPrefix;
            $cacheKey .= '.' . strtoupper($this->table);

            if($dataCacheTableKeyPrefix){
                $cacheKey .= '.' . $dataCacheTableKeyPrefix . '_';
            }else{
                $cacheKey .= '.ID_';
            }
            $cacheKey .= (string) $this->_id;
        }

        return $cacheKey;
    }

    /**
     * Throws a validation error for a giben column
     * @param $col
     * @throws \Exception\ValidationException
     */
    protected function throwValidationError($col){
        throw new Exception\ValidationException('Validation failed: "' . $col . '".', $col);

    }

    /**
     * set "updated" field to current timestamp
     * this is useful to mark a row as "changed"
     */
    protected function setUpdated(){
        if($this->_id > 0){
            $pfDB = DB\Database::instance()->getDB('PF');

            $pfDB->exec(
                ["UPDATE " . $this->table . " SET updated=NOW() WHERE id=:id"],
                [
                    [':id' => $this->_id]
                ]
            );
        }
    }

    /**
     * get single dataSet by id
     * @param $id
     * @param int $ttl
     * @return \DB\Cortex
     */
    public function getById($id, $ttl = 3) {

        return $this->getByForeignKey('id', (int)$id, ['limit' => 1], $ttl);
    }

    /**
     * checks weather this model is active or not
     * each model should have an "active" column
     * @return bool
     */
    public function isActive(){
        $isActive = false;

        if($this->active === 1){
            $isActive = true;
        }

        return $isActive;
    }

    /**
     * set active state for a model
     * @param $value
     */
    public function setActive($value){
        $this->set('active', (int)$value);
    }

    /**
     * get dataSet by foreign column (single result)
     * @param $key
     * @param $id
     * @param array $options
     * @param int $ttl
     * @return \DB\Cortex
     */
    public function getByForeignKey($key, $id, $options = [], $ttl = 60){

        $querySet = [];
        $query = [];
        if($this->exists($key)){
            $query[] = $key . " = :" . $key;
            $querySet[':' . $key] = $id;
        }

        // check active column
        if($this->exists('active')){
            $query[] = "active = :active";
            $querySet[':active'] = 1;
        }

        array_unshift($querySet, implode(' AND ', $query));

        return $this->load( $querySet, $options, $ttl );
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * return false will stop any further action
     */
    public function beforeInsertEvent(){
        return true;
    }

    /**
     * function should be overwritten in child classes with access restriction
     * @param $accessObject
     * @return bool
     */
    public function hasAccess($accessObject){
        return true;
    }

    /**
     * function should be overwritten in parent classes
     * @return bool
     */
    public function isValid(){
        return true;
    }

    /**
     * get cached data from this model
     * @param string $dataCacheKeyPrefix - optional key prefix
     * @return mixed|null
     */
    protected function getCacheData($dataCacheKeyPrefix = ''){

        $cacheKey = $this->getCacheKey($dataCacheKeyPrefix);
        $cacheData = null;

        if( !is_null($cacheKey) ){
            $f3 = self::getF3();

            if( $f3->exists($cacheKey) ){
                $cacheData = $f3->get( $cacheKey );
            }
        }

        return $cacheData;
    }

    /**
     * update/set the getData() cache for this object
     * @param $cacheData
     * @param string $dataCacheKeyPrefix
     * @param int $data_ttl
     */
    public function updateCacheData($cacheData, $dataCacheKeyPrefix = '', $data_ttl = 300){

        $cacheDataTmp = (array)$cacheData;

        // check if data should be cached
        // and cacheData is not empty
        if(
            $data_ttl > 0 &&
            !empty( $cacheDataTmp )
        ){
            $cacheKey = $this->getCacheKey($dataCacheKeyPrefix);

            if( !is_null($cacheKey) ){
                self::getF3()->set($cacheKey, $cacheData, $data_ttl);
            }
        }
    }

    /**
     * unset the getData() cache for this object
     */
    public function clearCacheData(){
        $cacheKey = $this->getCacheKey();

        if( !is_null($cacheKey) ){
            $f3 = self::getF3();

            if( $f3->exists($cacheKey) ){
                $f3->clear($cacheKey);
            }

        }
    }

    /**
     * factory for all Models
     * @param $model
     * @param int $ttl
     * @return null
     * @throws \Exception
     */
    public static function getNew($model, $ttl = 86400){
        $class = null;

        $model = '\\' . __NAMESPACE__ . '\\' . $model;
        if(class_exists($model)){
            $class = new $model( null, null, null, $ttl );
        }else{
            throw new \Exception('No model class found');
        }

        return $class;
    }

    /**
     * get the framework instance (singleton)
     * @return static
     */
    public static function getF3(){
        return \Base::instance();
    }

    /**
     * debug log function
     * @param $text
     */
    public static function log($text){
        Controller\LogController::getLogger('debug')->write($text);

    }

} 