<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 22:11
 */

namespace Model;

use DB\SQL\Schema;
use Controller;
use DB;
use lib\logging;
use Exception\ValidationException;
use Exception\DatabaseException;

abstract class BasicModel extends \DB\Cortex {

    /**
     * Hive key with DB object
     * @var string|DB\SQL
     */
    protected $db                                               = 'DB_PF';

    /**
     * caching time of field schema - seconds
     * as long as we don´t expect any field changes
     * -> leave this at a higher value
     * @var int
     */
    protected $ttl                                              = 60;

    /**
     * caching for relational data
     * @var int
     */
    protected $rel_ttl                                          = 0;

    /**
     * ass static columns for this table
     * -> can be overwritten in child models
     * @var bool
     */
    protected $addStaticFields                                  = true;

    /**
     * enables check for $fieldChanges on update/insert
     * -> fields that should be checked need an "activity-log" flag
     * in $fieldConf config
     * @var bool
     */
    protected $enableActivityLogging                            = true;

    /**
     * enables change for "active" column
     * -> see setActive();
     * -> $this->active = false; will NOT work (prevent abuse)!
     * @var bool
     */
    private $allowActiveChange                                  = false;

    /**
     * getData() cache key prefix
     * -> do not change, otherwise cached data is lost
     * @var string
     */
    private $dataCacheKeyPrefix                                 = 'DATACACHE';

    /**
     * enables data export for this table
     * -> can be overwritten in child models
     * @var bool
     */
    public static $enableDataExport                             = false;

    /**
     * enables data import for this table
     * -> can be overwritten in child models
     * @var bool
     */
    public static $enableDataImport                             = false;

    /**
     * changed fields (columns) on update/insert
     * -> e.g. for character "activity logging"
     * @var array
     */
    protected $fieldChanges                                     = [];

    /**
     * collection for validation errors
     * @var array
     */
    protected $validationError                                  = [];

    /**
     * default caching time of field schema - seconds
     */
    const DEFAULT_TTL                                           = 86400;

    /**
     * default TTL for getData(); cache - seconds
     */
    const DEFAULT_CACHE_TTL                                     = 120;

    /**
     * default TTL for SQL query cache
     */
    const DEFAULT_SQL_TTL                                       = 3;

    const ERROR_INVALID_MODEL_CLASS                             = 'Model class (%s) not found';

    public function __construct($db = NULL, $table = NULL, $fluid = NULL, $ttl = self::DEFAULT_TTL){

        $this->addStaticFieldConfig();

        parent::__construct($db, $table, $fluid, $ttl);

        // insert events ------------------------------------------------------------------------------------
        $this->beforeinsert( function($self, $pkeys){
            return $self->beforeInsertEvent($self, $pkeys);
        });

        $this->afterinsert(function($self, $pkeys){
            $self->afterInsertEvent($self, $pkeys);
        });

        // update events ------------------------------------------------------------------------------------
        $this->beforeupdate( function($self, $pkeys){
            return $self->beforeUpdateEvent($self, $pkeys);
        });

        $this->afterupdate( function($self, $pkeys){
            $self->afterUpdateEvent($self, $pkeys);
        });

        // erase events -------------------------------------------------------------------------------------

        $this->beforeerase( function($self, $pkeys){
            return $self->beforeEraseEvent($self, $pkeys);
        });

        $this->aftererase( function($self, $pkeys){
            $self->afterEraseEvent($self, $pkeys);
        });
    }

    /**
     * @param string $key
     * @param mixed $val
     * @return mixed
     * @throws ValidationException
     */
    public function set($key, $val){
        if(
            !$this->dry() &&
            $key != 'updated'
        ){
            if( $this->exists($key) ){
                // get raw column data (no objects)
                $currentVal = $this->get($key, true);

                if(is_object($val)){
                    if(
                        is_subclass_of($val, 'Model\BasicModel') &&
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

        // trim all values
        if(is_string($val)){
            $val = trim($val);
        }

        if( !$this->validateField($key, $val) ){
            $this->throwValidationException($key);
        }else{
            $this->checkFieldForActivityLogging($key, $val);
        }

        return parent::set($key, $val);
    }

    /**
     * change default "activity logging" status
     * -> enable/disable
     * @param $status
     */
    public function setActivityLogging($status){
        $this->enableActivityLogging = (bool) $status;
    }

    /**
     * check column for value changes,
     * --> if column is marked for "activity logging"
     * @param string $key
     * @param mixed $val
     */
    protected function checkFieldForActivityLogging($key, $val){
        if( $this->enableActivityLogging ){
            $fieldConf = $this->fieldConf[$key];

            // check for value changes if field has "activity logging" active
            if($fieldConf['activity-log'] === true){
                if(
                    is_numeric($val) ||
                    $fieldConf['type'] === Schema::DT_BOOL
                ){
                    $val = (int)$val;
                }

                if(is_object($val)){
                    $val = $val->_id;
                }

                if( $fieldConf['type'] === self::DT_JSON){
                    $currentValue = $this->get($key);
                }else{
                    $currentValue = $this->get($key, true);
                }


                if($currentValue !== $val){
                    // field has changed
                    if( !array_key_exists($key, $this->fieldChanges) ){
                        $this->fieldChanges[$key] = [
                            'old' => $currentValue,
                            'new' => $val
                        ];
                    }
                }
            }
        }
    }

    /**
     * setter for "active" status
     * -> default: keep current "active" status
     * -> can be overwritten
     * @param bool $active
     * @return mixed
     */
    public function set_active($active){
        if( $this->allowActiveChange ){
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
    protected function getStaticFieldConf(): array {
        $staticFieldConfig = [];

        // static tables (fixed data) do not require them...
        if($this->addStaticFields){
            $staticFieldConfig = [
                'created' => [
                    'type' => Schema::DT_TIMESTAMP,
                    'default' => Schema::DF_CURRENT_TIMESTAMP,
                    'index' => true
                ],
                'updated' => [
                    'type' => Schema::DT_TIMESTAMP,
                    'default' => Schema::DF_CURRENT_TIMESTAMP,
                    'index' => true
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
    protected function validateField(string $key, $val): bool {
        $valid = true;
        if($fieldConf = $this->fieldConf[$key]){
            if($method = $this->fieldConf[$key]['validate']){
                if( !is_string($method)){
                    $method = 'validate_' . $key;
                }
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
     * @throws \Exception\ValidationException
     */
    protected function validate_notDry($key, $val): bool {
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
     * get key for for all objects in this table
     * @return string
     */
    private function getTableCacheKey(){
        return $this->dataCacheKeyPrefix .'.' . strtoupper($this->table);
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
        if( $this->id > 0){
            $cacheKey = $this->getTableCacheKey();

            // check if there is a given key prefix
            // -> if not, use the standard key.
            // this is useful for caching multiple data sets according to one row entry
            if( !empty($dataCacheTableKeyPrefix) ){
                $cacheKey .= '.' . $dataCacheTableKeyPrefix . '_';
            }else{
                $cacheKey .= '.ID_';
            }
            $cacheKey .= (string) $this->_id;
        }

        return $cacheKey;
    }

    /**
     * get cached data from this model
     * @param string $dataCacheKeyPrefix - optional key prefix
     * @return \stdClass|null
     */
    protected function getCacheData($dataCacheKeyPrefix = ''){
        $cacheData = null;

        // table cache exists
        // -> check cache for this row data
        $cacheKey = $this->getCacheKey($dataCacheKeyPrefix);
        if( !is_null($cacheKey) ){
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
    public function updateCacheData($cacheData, $dataCacheKeyPrefix = '', $data_ttl = self::DEFAULT_CACHE_TTL){
        $cacheDataTmp = (array)$cacheData;

        // check if data should be cached
        // and cacheData is not empty
        if(
            $data_ttl > 0 &&
            !empty($cacheDataTmp)
        ){
            $cacheKey = $this->getCacheKey($dataCacheKeyPrefix);

            if( !is_null($cacheKey) ){
                self::getF3()->set($cacheKey, $cacheData, $data_ttl);
            }
        }
    }

    /**
     * unset the getData() cache for this object
     * -> see also clearCacheDataWithPrefix(), for more information
     */
    public function clearCacheData(){
        $cacheKey = $this->getCacheKey();
        $this->clearCache($cacheKey);
    }

    /**
     * unset object cached data by prefix
     * -> primarily used by object cache with multiple data caches
     * @param string $dataCacheKeyPrefix
     */
    public function clearCacheDataWithPrefix($dataCacheKeyPrefix = ''){
        $cacheKey = $this->getCacheKey($dataCacheKeyPrefix);
        $this->clearCache($cacheKey);
    }

    /**
     * unset object cached data (if exists)
     * @param $cacheKey
     */
    private function clearCache($cacheKey){
        if( !empty($cacheKey) ){
            $f3 = self::getF3();
            if( $f3->exists($cacheKey) ){
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
     * @param bool $isActive
     * @return \DB\Cortex
     */
    public function getById(int $id, int $ttl = self::DEFAULT_SQL_TTL, bool $isActive = true){
        return $this->getByForeignKey('id', (int)$id, ['limit' => 1], $ttl, $isActive);
    }

    /**
     * checks whether this model is active or not
     * each model should have an "active" column
     * @return bool
     */
    public function isActive(){
        return (bool)$this->active;
    }

    /**
     * set active state for a model
     * -> do NOT use $this->active for status change!
     * -> this will not work (prevent abuse)
     * @param bool $active
     */
    public function setActive($active){
        // enables "active" change for this model
        $this->allowActiveChange = true;
        $this->active = $active;
    }

    /**
     * get dataSet by foreign column (single result)
     * @param $key
     * @param $value
     * @param array $options
     * @param int $ttl
     * @param bool $isActive
     * @return \DB\Cortex
     */
    public function getByForeignKey($key, $value, $options = [], $ttl = 0, $isActive = true){
        $querySet = [];
        $query = [];
        if($this->exists($key)){
            $query[] = $key . " = :" . $key;
            $querySet[':' . $key] = $value;
        }

        // check active column
        if($isActive && $this->exists('active')){
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
     * @param self $self
     * @param $pkeys
     * @return bool
     */
    public function beforeInsertEvent($self, $pkeys){
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
    public function beforeUpdateEvent($self, $pkeys){
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
    public function beforeEraseEvent($self, $pkeys){
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
     * function should be overwritten in child classes with access restriction
     * @param CharacterModel $characterModel
     * @return bool
     */
    public function hasAccess(CharacterModel $characterModel){
        return true;
    }

    /**
     * function should be overwritten in parent classes
     * @return bool
     */
    public function isValid(): bool {
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
    public function exportData(array $fields = []){
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
    protected function importStaticData($tableData = []){
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
            $rowIDs[] = $this->id;
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
    protected function newLog($action = ''): Logging\LogInterface{
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
    public function getErrors(): array {
        return $this->validationError;
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
            if($interval->days < Universe\BasicUniverseModel::CACHE_MAX_DAYS){
                $outdated = false;
            }
        }
        return $outdated;
    }

    public function save(){
        try{
            return parent::save();
        }catch(ValidationException $e){
            $this->setValidationError($e);
        }catch(DatabaseException $e){
            self::getF3()->error($e->getCode(), $e->getMessage(), $e->getTrace());
        }
    }

    /**
     * @return string
     */
    public function __toString(){
        return $this->getTable();
    }

    /**
     * get the current class name
     * -> namespace not included
     * @return string
     */
    public static function getClassName(){
        $parts = explode('\\', static::class);
        return end($parts);
    }

    /**
     * factory for all Models
     * @param string $model
     * @param int $ttl
     * @return BasicModel
     * @throws \Exception
     */
    public static function getNew($model, $ttl = self::DEFAULT_TTL){
        $class = null;

        $model = '\\' . __NAMESPACE__ . '\\' . $model;
        if(class_exists($model)){
            $class = new $model( null, null, null, $ttl );
        }else{
            throw new \Exception(sprintf(self::ERROR_INVALID_MODEL_CLASS, $model));
        }

        return $class;
    }

    /**
     * get the framework instance (singleton)
     * @return \Base
     */
    public static function getF3(){
        return \Base::instance();
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
     * debug log function
     * @param string $text
     * @param string $type
     * @throws \Exception\PathfinderException
     */
    public static function log($text, $type = 'DEBUG'){
        Controller\LogController::getLogger($type)->write($text);
    }

    /**
     * get tableModifier class for this table
     * @return bool|DB\SQL\TableModifier
     */
    public static function getTableModifier(){
        $df = parent::resolveConfiguration();
        $schema = new Schema($df['db']);
        $tableModifier = $schema->alterTable( $df['table'] );
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
    public static function setMultiColumnIndex(array $columns = [], $unique = false, $length = 20){
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
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     * @throws \Exception
     */
    public static function setup($db=null, $table=null, $fields=null){
        $status = parent::setup($db,$table,$fields);

        // set static default data
        if($status === true && property_exists(static::class, 'tableData')){
            $model = self::getNew(self::getClassName(), 0);
            $model->importStaticData(static::$tableData);
        }

        return $status;
    }

} 