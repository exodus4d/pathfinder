<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 22:11
 */

namespace Model;

use DB\Cortex;
use DB\CortexCollection;
use DB\SQL\Schema;
use lib\logging;
use Controller;
use Exception\ValidationException;
use Exception\DatabaseException;

abstract class AbstractModel extends Cortex {

    /**
     * alias name for database connection
     */
    const DB_ALIAS                          = '';

    /**
     * caching time of field schema - seconds
     * as long as we don´t expect any field changes
     * -> leave this at a higher value
     * @var int
     */
    protected $ttl                          = 60;

    /**
     * caching for relational data
     * @var int
     */
    protected $rel_ttl                      = 0;

    /**
     * ass static columns for this table
     * -> can be overwritten in child models
     * @var bool
     */
    protected $addStaticFields              = true;

    /**
     * enables change for "active" column
     * -> see setActive();
     * -> $this->active = false; will NOT work (prevent abuse)!
     * @var bool
     */
    private $allowActiveChange              = false;

    /**
     * getData() cache key prefix
     * -> do not change, otherwise cached data is lost
     * @var string
     */
    private $dataCacheKeyPrefix             = 'DATACACHE';

    /**
     * enables data export for this table
     * -> can be overwritten in child models
     * @var bool
     */
    public static $enableDataExport         = false;

    /**
     * enables data import for this table
     * -> can be overwritten in child models
     * @var bool
     */
    public static $enableDataImport         = false;

    /**
     * collection for validation errors
     * @var array
     */
    protected $validationError              = [];

    /**
     * default caching time of field schema - seconds
     */
    const DEFAULT_TTL                       = 86400;

    /**
     * default TTL for getData(); cache - seconds
     */
    const DEFAULT_CACHE_TTL                 = 120;

    /**
     * default TTL for SQL query cache
     */
    const DEFAULT_SQL_TTL                   = 3;

    /**
     * data from Universe tables is static and does not change frequently
     * -> refresh static data after X days
     */
    const CACHE_MAX_DAYS                    = 60;

    /**
     * class not exists error
     */
    const ERROR_INVALID_MODEL_CLASS         = 'Model class (%s) not found';

    /**
     * AbstractModel constructor.
     * @param null $db
     * @param null $table
     * @param null $fluid
     * @param int $ttl
     */
    public function __construct($db = NULL, $table = NULL, $fluid = NULL, $ttl = self::DEFAULT_TTL){

        if(!is_object($db)){
            $db = self::getF3()->DB->getDB(static::DB_ALIAS);
        }

        if(is_null($db)){
            // no valid DB connection found -> break on error
            self::getF3()->set('HALT', true);
        }

        $this->addStaticFieldConfig();

        parent::__construct($db, $table, $fluid, $ttl);

        // insert events ------------------------------------------------------------------------------------
        $this->beforeinsert(function($self, $pkeys){
            return $self->beforeInsertEvent($self, $pkeys);
        });

        $this->afterinsert(function($self, $pkeys){
            $self->afterInsertEvent($self, $pkeys);
        });

        // update events ------------------------------------------------------------------------------------
        $this->beforeupdate(function($self, $pkeys){
            return $self->beforeUpdateEvent($self, $pkeys);
        });

        $this->afterupdate(function($self, $pkeys){
            $self->afterUpdateEvent($self, $pkeys);
        });

        // erase events -------------------------------------------------------------------------------------
        $this->beforeerase(function($self, $pkeys){
            return $self->beforeEraseEvent($self, $pkeys);
        });

        $this->aftererase(function($self, $pkeys){
            $self->afterEraseEvent($self, $pkeys);
        });
    }

    /**
     * clear existing table Schema cache
     * @return bool
     */
    public function clearSchemaCache() : bool {
        $f3 = self::getF3();
        $cache=\Cache::instance();
        if(
            $f3->CACHE && is_object($this->db) &&
            $cache->exists($hash = $f3->hash($this->db->getDSN() . $this->table) . '.schema')
        ){
            return (bool)$cache->clear($hash);
        }
        return false;
    }

    /**
     * @param string $key
     * @param mixed $val
     * @return mixed
     * @throws ValidationException
     */
    public function set($key, $val){
        if(is_string($val)){
            $val = trim($val);
        }

        if(
            !$this->dry() &&
            $key != 'updated'
        ){
            if($this->exists($key)){
                // get raw column data (no objects)
                $currentVal = $this->get($key, true);

                if(is_object($val)){
                    if(
                        is_subclass_of($val, 'Model\AbstractModel') &&
                        $val->_id != $currentVal
                    ){
                        // relational object changed
                        $this->touch('updated');
                    }
                }elseif($val != $currentVal){
                    // non object value
                    $this->touch('updated');
                }
            }
        }

        if(!$this->validateField($key, $val)){
            $this->throwValidationException($key);
        }

        return parent::set($key, $val);
    }

    /**
     * setter for "active" status
     * -> default: keep current "active" status
     * -> can be overwritten
     * @param bool $active
     * @return mixed
     */
    public function set_active($active){
        if($this->allowActiveChange){
            // allowed to set/change -> reset "allowed" property
            $this->allowActiveChange = false;
        }else{
            // not allowed to set/change -> keep current status
            $active = $this->active;
        }
        return $active;
    }

    /**
     * get static fields for this model instance
     * @return array
     */
    protected function getStaticFieldConf() : array {
        $staticFieldConfig = [];

        // static tables (fixed data) do not require them...
        if($this->addStaticFields){
            $staticFieldConfig = [
                'created' => [
                    'type'      => Schema::DT_TIMESTAMP,
                    'default'   => Schema::DF_CURRENT_TIMESTAMP,
                    'index'     => true
                ],
                'updated' => [
                    'type'      => Schema::DT_TIMESTAMP,
                    'default'   => Schema::DF_CURRENT_TIMESTAMP,
                    'index'     => true
                ]
            ];
        }

        return $staticFieldConfig;
    }

    /**
     * extent the fieldConf Array with static fields for each table
     */
    private function addStaticFieldConfig(){
        $this->fieldConf = array_merge($this->getStaticFieldConf(), $this->fieldConf);
    }

    /**
     * validates a table column based on validation settings
     * @param string $key
     * @param $val
     * @return bool
     */
    protected function validateField(string $key, $val) : bool {
        $valid = true;
        if($fieldConf = $this->fieldConf[$key]){
            if($method = $this->fieldConf[$key]['validate']){
                if( !is_string($method)){
                    $method = $key;
                }
                $method = 'validate_' . $method;
                if(method_exists($this, $method)){
                    // validate $key (column) with this method...
                    $valid = $this->$method($key, $val);
                }else{
                    self::getF3()->error(501, 'Method ' . get_class($this) . '->' . $method . '() is not implemented');
                };
            }
        }

        return $valid;
    }

    /**
     * validates a model field to be a valid relational model
     * @param $key
     * @param $val
     * @return bool
     * @throws ValidationException
     */
    protected function validate_notDry($key, $val) : bool {
        $valid = true;
        if($colConf = $this->fieldConf[$key]){
            if(isset($colConf['belongs-to-one'])){
                if( (is_int($val) || ctype_digit($val)) && (int)$val > 0){
                    $valid = true;
                }elseif( is_a($val, $colConf['belongs-to-one']) && !$val->dry() ){
                    $valid = true;
                }else{
                    $valid = false;
                    $msg = 'Validation failed: "' . get_class($this) . '->' . $key . '" must be a valid instance of ' . $colConf['belongs-to-one'];
                    $this->throwValidationException($key, $msg);
                }
            }
        }

        return $valid;
    }

    /**
     * validates a model field to be not empty
     * @param $key
     * @param $val
     * @return bool
     */
    protected function validate_notEmpty($key, $val) : bool {
        $valid = false;
        if($colConf = $this->fieldConf[$key]){
            switch($colConf['type']){
                case Schema::DT_INT:
                case Schema::DT_FLOAT:
                    if( (is_int($val) || ctype_digit($val)) && (int)$val > 0){
                        $valid = true;
                    }
                    break;
                case Schema::DT_VARCHAR128:
                case Schema::DT_VARCHAR256:
                case Schema::DT_VARCHAR512:
                    if(!empty($val)){
                        $valid = true;
                    }
                    break;
                default:
            }
        }

        return $valid;
    }

    /**
     * get key for for all objects in this table
     * @return string
     */
    private function getTableCacheKey() : string {
        return $this->dataCacheKeyPrefix .'.' . strtoupper($this->table);
    }

    /**
     * get the cache key for this model
     * ->do not set a key if the model is not saved!
     * @param string $dataCacheTableKeyPrefix
     * @return null|string
     */
    protected function getCacheKey(string $dataCacheTableKeyPrefix = '') : ?string {
        $cacheKey = null;

        // set a model unique cache key if the model is saved
        if($this->_id > 0){
            $cacheKey = $this->getTableCacheKey();

            // check if there is a given key prefix
            // -> if not, use the standard key.
            // this is useful for caching multiple data sets according to one row entry
            if(!empty($dataCacheTableKeyPrefix)){
                $cacheKey .= '.' . $dataCacheTableKeyPrefix . '_';
            }else{
                $cacheKey .= '.ID_';
            }
            $cacheKey .= (string)$this->_id;
        }

        return $cacheKey;
    }

    /**
     * get cached data from this model
     * @param string $dataCacheKeyPrefix - optional key prefix
     * @return mixed|null
     */
    protected function getCacheData($dataCacheKeyPrefix = ''){
        $cacheData = null;
        // table cache exists
        // -> check cache for this row data
        if(!is_null($cacheKey = $this->getCacheKey($dataCacheKeyPrefix))){
            self::getF3()->exists($cacheKey, $cacheData);
        }
        return $cacheData;
    }

    /**
     * update/set the getData() cache for this object
     * @param $cacheData
     * @param string $dataCacheKeyPrefix
     * @param int $data_ttl
     */
    public function updateCacheData($cacheData, string $dataCacheKeyPrefix = '', int $data_ttl = self::DEFAULT_CACHE_TTL){
        $cacheDataTmp = (array)$cacheData;

        // check if data should be cached
        // and cacheData is not empty
        if(
            $data_ttl > 0 &&
            !empty($cacheDataTmp)
        ){
            $cacheKey = $this->getCacheKey($dataCacheKeyPrefix);
            if(!is_null($cacheKey)){
                self::getF3()->set($cacheKey, $cacheData, $data_ttl);
            }
        }
    }

    /**
     * unset the getData() cache for this object
     * -> see also clearCacheDataWithPrefix(), for more information
     */
    public function clearCacheData(){
        $this->clearCache($this->getCacheKey());
    }

    /**
     * unset object cached data by prefix
     * -> primarily used by object cache with multiple data caches
     * @param string $dataCacheKeyPrefix
     */
    public function clearCacheDataWithPrefix(string $dataCacheKeyPrefix = ''){
        $this->clearCache($this->getCacheKey($dataCacheKeyPrefix));
    }

    /**
     * unset object cached data (if exists)
     * @param $cacheKey
     */
    private function clearCache($cacheKey){
        if(!empty($cacheKey)){
            $f3 = self::getF3();
            if($f3->exists($cacheKey)){
                $f3->clear($cacheKey);
            }
        }
    }

    /**
     * throw validation exception for a model property
     * @param string $col
     * @param string $msg
     * @throws ValidationException
     */
    protected function throwValidationException(string $col, string $msg = ''){
        $msg = empty($msg) ? 'Validation failed: "' . $col . '".' : $msg;
        throw new ValidationException($msg, $col);
    }

    /**
     * @param string $msg
     * @throws DatabaseException
     */
    protected function throwDbException(string $msg){
        throw new DatabaseException($msg);
    }

    /**
     * checks whether this model is active or not
     * each model should have an "active" column
     * @return bool
     */
    public function isActive() : bool {
        return (bool)$this->active;
    }

    /**
     * set active state for a model
     * -> do NOT use $this->active for status change!
     * -> this will not work (prevent abuse)
     * @param bool $active
     */
    public function setActive(bool $active){
        // enables "active" change for this model
        $this->allowActiveChange = true;
        $this->active = $active;
    }

    /**
     * get single dataSet by id
     * @param int $id
     * @param int $ttl
     * @param bool $isActive
     * @return bool
     */
    public function getById(int $id, int $ttl = self::DEFAULT_SQL_TTL, bool $isActive = true) : bool {
        return $this->getByForeignKey('id', $id, ['limit' => 1], $ttl, $isActive);
    }

    /**
     * get dataSet by foreign column (single result)
     * @param string $key
     * @param $value
     * @param array $options
     * @param int $ttl
     * @param bool $isActive
     * @return bool
     */
    public function getByForeignKey(string $key, $value, array $options = [], int $ttl = 0, bool $isActive = true) : bool {
        $filters = [];
        if($this->exists($key)){
            $filters[] = [$key . ' = :' . $key, ':' . $key => $value];
        }

        if($isActive && $this->exists('active')){
            $filters[] = self::getFilter('active', true);
        }

        $this->filterRel();

        return $this->load($this->mergeFilter($filters), $options, $ttl);
    }

    /**
     * apply filter() for relations
     * -> overwrite in child classes
     * @see https://github.com/ikkez/f3-cortex#filter
     */
    protected function filterRel() : void {}

    /**
     * get first model from a relation that matches $filter
     * @param string $key
     * @param array $filter
     * @return mixed|null
     */
    protected function relFindOne(string $key, array $filter){
        $relModel = null;
        $relFilter = [];
        if($this->exists($key, true)){
            $fieldConf = $this->getFieldConfiguration();
            if(array_key_exists($key, $fieldConf)){
                if(array_key_exists($type = 'has-many', $fieldConf[$key])){
                    $fromConf = $fieldConf[$key][$type];
                    $relFilter = self::getFilter($fromConf[1], $this->getRaw($fromConf['relField']));
                }
            }

            /**
             * @var $relModel self|bool
             */
            $relModel = $this->rel($key)->findone($this->mergeFilter([$relFilter, $this->mergeWithRelFilter($key, $filter)]));
        }

        return $relModel ? : null;
    }

    /**
     * get all models from a relation that match $filter
     * @param string $key
     * @param array $filter
     * @return CortexCollection|null
     */
    protected function relFind(string $key, array $filter) : ?CortexCollection {
        $relModel = null;
        $relFilter = [];
        if($this->exists($key, true)){
            $fieldConf = $this->getFieldConfiguration();
            if(array_key_exists($key, $fieldConf)){
                if(array_key_exists($type = 'has-many', $fieldConf[$key])){
                    $fromConf = $fieldConf[$key][$type];
                    $relFilter = self::getFilter($fromConf[1], $this->getRaw($fromConf['relField']));
                }
            }

            /**
             * @var $relModel CortexCollection|bool
             */
            $relModel = $this->rel($key)->find($this->mergeFilter([$relFilter, $this->mergeWithRelFilter($key, $filter)]));
        }

        return $relModel ? : null;
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     * @return bool
     */
    public function beforeInsertEvent($self, $pkeys) : bool {
        if($this->exists('updated')){
            $this->touch('updated');
        }
        return true;
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterInsertEvent($self, $pkeys){
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     * @return bool
     */
    public function beforeUpdateEvent($self, $pkeys) : bool {
        return true;
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterUpdateEvent($self, $pkeys){
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * @param self $self
     * @param $pkeys
     * @return bool
     */
    public function beforeEraseEvent($self, $pkeys) : bool {
        return true;
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * @param self $self
     * @param $pkeys
     */
    public function afterEraseEvent($self, $pkeys){
    }

    /**
     * function should be overwritten in parent classes
     * @return bool
     */
    public function isValid() : bool {
        return true;
    }

    /**
     * format dateTime column
     * @param $column
     * @param string $format
     * @return false|null|string
     */
    public function getFormattedColumn($column, $format = 'Y-m-d H:i'){
        return $this->get($column) ? date($format, strtotime( $this->get($column) )) : null;
    }

    /**
     * export and download table data as *.csv
     * this is primarily used for static tables
     * @param array $fields
     * @return bool
     */
    public function exportData(array $fields = []) : bool {
        $status = false;

        if(static::$enableDataExport){
            $tableModifier = static::getTableModifier();
            $headers = $tableModifier->getCols();

            if($fields){
                // columns to export -> reIndex keys
                $headers = array_values(array_intersect($headers, $fields));
            }

            // just get the records with existing columns
            // -> no "virtual" fields or "new" columns
            $this->fields($headers);
            $allRecords = $this->find();

            if($allRecords){
                $tableData = $allRecords->castAll(0);

                // format data -> "id" must be first key
                foreach($tableData as &$rowData){
                    $rowData = [$this->primary => $rowData['_id']] + $rowData;
                    unset($rowData['_id']);
                }

                $sheet = \Sheet::instance();
                $data = $sheet->dumpCSV($tableData, $headers);

                header('Expires: 0');
                header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
                header('Content-Type: text/csv;charset=UTF-8');
                header('Content-Disposition: attachment;filename=' . $this->getTable() . '.csv');
                echo $data;
                exit();
            }
        }

        return $status;
    }

    /**
     * import table data from a *.csv file
     * @return array|bool
     */
    public function importData(){
        $status = false;

        // rtrim(); for arrays (removes empty values) from the end
        $rtrim = function($array = [], $lengthMin = false){
            $length = key(array_reverse(array_diff($array, ['']), 1))+1;
            $length = $length < $lengthMin ? $lengthMin : $length;
            return array_slice($array, 0, $length);
        };

        if(static::$enableDataImport){
            $filePath = $this->getF3()->get('EXPORT') . 'csv/' . $this->getTable() . '.csv';

            if(is_file($filePath)){
                $handle = @fopen($filePath, 'r');
                $keys = array_map('lcfirst', fgetcsv($handle, 0, ';'));
                $keys = $rtrim($keys);

                if(count($keys) > 0){
                    $tableData = [];
                    while (!feof($handle)) {
                        $tableData[] = array_combine($keys, $rtrim(fgetcsv($handle, 0, ';'), count($keys)));
                    }
                    // import row data
                    $status = $this->importStaticData($tableData);
                    $this->getF3()->status(202);
                }else{
                    $this->getF3()->error(500, 'File could not be read');
                }
            }else{
                $this->getF3()->error(404, 'File not found: ' . $filePath);
            }
        }

        return $status;
    }

    /**
     * insert/update static data into this table
     * WARNING: rows will be deleted if not part of $tableData !
     * @param array $tableData
     * @return array
     */
    protected function importStaticData(array $tableData = []) : array {
        $rowIDs = [];
        $addedCount = 0;
        $updatedCount = 0;
        $deletedCount = 0;

        $tableModifier = static::getTableModifier();
        $fields = $tableModifier->getCols();

        foreach($tableData as $rowData){
            // search for existing record and update columns
            $this->getById($rowData['id'], 0);
            if($this->dry()){
                $addedCount++;
            }else{
                $updatedCount++;
            }
            $this->copyfrom($rowData, $fields);
            $this->save();
            $rowIDs[] = $this->_id;
            $this->reset();
        }

        // remove old data
        $oldRows = $this->find('id NOT IN (' . implode(',', $rowIDs) . ')');
        if($oldRows){
            foreach($oldRows as $oldRow){
                $oldRow->erase();
                $deletedCount++;
            }
        }
        return ['added' => $addedCount, 'updated' => $updatedCount, 'deleted' => $deletedCount];
    }

    /**
     * get "default" logging object for this kind of model
     * -> can be overwritten
     * @param string $action
     * @return Logging\LogInterface
     */
    protected function newLog(string $action = '') : Logging\LogInterface{
        return new Logging\DefaultLog($action);
    }

    /**
     * get formatter callback function for parsed logs
     * @return null
     */
    protected function getLogFormatter(){
        return null;
    }

    /**
     * add new validation error
     * @param ValidationException $e
     */
    protected function setValidationError(ValidationException $e){
        $this->validationError[] = $e->getError();
    }

    /**
     * get all validation errors
     * @return array
     */
    public function getErrors() : array {
        return $this->validationError;
    }

    /**
     * checks whether data is outdated and should be refreshed
     * @return bool
     */
    protected function isOutdated() : bool {
        $outdated = true;
        if(!$this->dry()){
            try{
                $timezone = $this->getF3()->get('getTimeZone')();
                $currentTime = new \DateTime('now', $timezone);
                $updateTime = \DateTime::createFromFormat(
                    'Y-m-d H:i:s',
                    $this->updated,
                    $timezone
                );
                $interval = $updateTime->diff($currentTime);
                if($interval->days < self::CACHE_MAX_DAYS){
                    $outdated = false;
                }
            }catch(\Exception $e){
                self::getF3()->error($e->getCode(), $e->getMessage(), $e->getTrace());
            }
        }
        return $outdated;
    }

    /**
     * @return mixed
     */
    public function save(){
        $return = false;
        try{
            $return = parent::save();
        }catch(ValidationException $e){
            $this->setValidationError($e);
        }catch(DatabaseException $e){
            self::getF3()->error($e->getResponseCode(), $e->getMessage(), $e->getTrace());
        }

        return $return;
    }

    /**
     * @return string
     */
    public function __toString() : string {
        return $this->getTable();
    }

    /**
     * @param string $argument
     * @return \ReflectionClass
     * @throws \ReflectionException
     */
    protected static function refClass($argument = self::class) : \ReflectionClass {
        return new \ReflectionClass($argument);
    }

    /**
     * get the framework instance
     * @return \Base
     */
    public static function getF3() : \Base {
        return \Base::instance();
    }

    /**
     * get new filter array representation
     * -> $suffix can be used fore unique placeholder,
     *    in case the same $key is used with different $values in the same query
     * @param string $key
     * @param mixed $value
     * @param string $operator
     * @param string $suffix
     * @return array
     */
    public static function getFilter(string $key, $value, string $operator = '=', string $suffix = '') : array {
        $placeholder = ':' . implode('_', array_filter([$key, $suffix]));
        return [$key . ' ' . $operator . ' ' . $placeholder, $placeholder => $value];
    }

    /**
     * stores data direct into the Cache backend (e.g. Redis)
     * $f3->set() used the same code. The difference is, that $f3->set()
     * also loads data into the Hive.
     * This can result in high RAM usage if a great number of key->values should be stored in Cache
     * (like the search index for system data)
     * @param string $key
     * @param $data
     * @param int $ttl
     */
    public static function setCacheValue(string $key, $data, int $ttl = 0){
        $cache = \Cache::instance();
        $cache->set(self::getF3()->hash($key).'.var', $data, $ttl);
    }

    /**
     * check whether a cache $key exists
     * -> §val (reference) get updated with the cache data
     * -> equivalent to $f3->exists()
     * @param string $key
     * @param null $val
     * @return bool
     */
    public static function existsCacheValue(string $key, &$val = null){
        $cache = \Cache::instance();
        return $cache->exists(self::getF3()->hash($key).'.var',$val);
    }

    /**
     * debug log function
     * @param string $text
     * @param string $type
     */
    public static function log($text, $type = 'DEBUG'){
        Controller\LogController::getLogger($type)->write($text);
    }

    /**
     * get tableModifier class for this table
     * @return bool|\DB\SQL\TableModifier
     */
    public static function getTableModifier(){
        $df = parent::resolveConfiguration();
        $schema = new Schema($df['db']);
        $tableModifier = $schema->alterTable($df['table']);
        return $tableModifier;
    }

    /**
     * Check whether a (multi)-column index exists or not on a table
     * related to this model
     * @param array $columns
     * @return bool|array
     */
    public static function indexExists(array $columns = []){
        $tableModifier = self::getTableModifier();
        $df = parent::resolveConfiguration();

        $check = false;
        $indexKey = $df['table'] . '___' . implode('__', $columns);
        $indexList = $tableModifier->listIndex();
        if(array_key_exists( $indexKey, $indexList)){
            $check = $indexList[$indexKey];
        }

        return $check;
    }

    /**
     * set a multi-column index for this table
     * @param array $columns Column(s) to be indexed
     * @param bool $unique Unique index
     * @param int $length index length for text fields in mysql
     * @return bool
     */
    public static function setMultiColumnIndex(array $columns = [], $unique = false, $length = 20) : bool {
        $status = false;
        $tableModifier = self::getTableModifier();

        if( self::indexExists($columns) === false ){
            $tableModifier->addIndex($columns, $unique, $length);
            $buildStatus = $tableModifier->build();
            if($buildStatus === 0){
                $status = true;
            }
        }

        return $status;
    }

    /**
     * factory for all Models
     * @param string $className
     * @param int $ttl
     * @return AbstractModel|null
     * @throws \Exception
     */
    public static function getNew(string $className, int $ttl = self::DEFAULT_TTL) : ?self {
        $model = null;
        $className = self::refClass(static::class)->getNamespaceName() . '\\' . $className;
        if(class_exists($className)){
            $model = new $className(null, null, null, $ttl);
        }else{
            throw new \Exception(sprintf(self::ERROR_INVALID_MODEL_CLASS, $className));
        }
        return $model;
    }

    /**
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     * @throws \Exception
     */
    public static function setup($db = null, $table = null, $fields = null){
        $status = parent::setup($db, $table, $fields);

        // set static default data
        if($status === true && property_exists(static::class, 'tableData')){
            $model = self::getNew(self::refClass(static::class)->getShortName(), 0);
            $model->importStaticData(static::$tableData);
        }

        return $status;
    }

} 