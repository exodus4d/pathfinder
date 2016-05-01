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

abstract class BasicModel extends \DB\Cortex {

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
     * ass static columns for this table
     * -> can be overwritten in child models
     * @var bool
     */
    protected $addStaticFields = true;

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

    /**
     * enables data export for this table
     * -> can be overwritten in child models
     * @var bool
     */
    public static $enableDataExport = false;

    /**
     * enables data import for this table
     * -> can be overwritten in child models
     * @var bool
     */
    public static $enableDataImport = false;


    public function __construct($db = NULL, $table = NULL, $fluid = NULL, $ttl = 0){

        $this->addStaticFieldConfig();

        parent::__construct($db, $table, $fluid, $ttl);

        // events -----------------------------------------
        $this->afterinsert(function($self){
            $self->clearCacheData();
        });

        $this->afterupdate( function($self){
            $self->clearCacheData();
        });

        $this->beforeinsert( function($self){
            $self->beforeInsertEvent($self);
        });

        $this->aftererase( function($self){
            $self->aftereraseEvent($self);
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

        if(
            !$this->dry() &&
            $key != 'updated'
        ){
            if( $this->exists($key) ){
                $currentVal = $this->get($key);

                // if current value is not a relational object
                // and value has changed -> update table col
                if(is_object($currentVal)){
                    if(
                        is_numeric($val) &&
                        is_subclass_of($currentVal, 'Model\BasicModel') &&
                        $currentVal->_id !== (int)$val
                    ){
                        $this->touch('updated');
                    }
                }elseif($currentVal != $val){
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

        // add static fields to this mapper
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


            $this->fieldConf = array_merge($staticFieldConfig, $this->fieldConf);
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
        if( $this->id > 0){
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
     * get cached data from this model
     * @param string $dataCacheKeyPrefix - optional key prefix
     * @return \stdClass|null
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
        return (bool)$this->active;
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
     * @param $value
     * @param array $options
     * @param int $ttl
     * @return \DB\Cortex
     */
    public function getByForeignKey($key, $value, $options = [], $ttl = 60){

        $querySet = [];
        $query = [];
        if($this->exists($key)){
            $query[] = $key . " = :" . $key;
            $querySet[':' . $key] = $value;
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
     * Event "Hook" function
     * can be overwritten
     * @return bool
     */
    public function aftereraseEvent($self){
        return true;
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
    public function isValid(){
        return true;
    }

    /**
     * export and download table data as *.csv
     * this is primarily used for static tables
     * @return bool
     */
    public function exportData(){
        $status = false;

        if(static::$enableDataExport){
            $tableModifier = static::getTableModifier();
            $headers = $tableModifier->getCols();

            // just get the records with existing columns
            // -> no "virtual" fields or "new" columns
            $this->fields($headers);
            $allRecords = $this->find();

            if($allRecords){
                $tableData = $allRecords->castAll();

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
     * @return bool
     */
    public function importData(){
        $status = false;

        if(static::$enableDataImport){
            $filePath = 'export/sql/' . $this->getTable() . '.csv';

            if(is_file($filePath)){
                $handle = @fopen($filePath, 'r');
                $keys = array_map('lcfirst', array_filter(fgetcsv($handle, 0, ';')));

                if(count($keys) > 0){
                    $tableData = [];
                    while (!feof($handle)) {
                        $tableData[] = array_combine($keys, array_filter(fgetcsv($handle, 0, ';')));
                    }
                    // import row data
                    $status = $this->importStaticData($tableData);
                    $this->getF3()->status(202);
                }else{
                    $this->getF3()->error(502, 'File could not be read');
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

        foreach($tableData as $rowData){
            // search for existing record and update columns
            $this->getById($rowData['id']);
            if($this->dry()){
                $addedCount++;
            }else{
                $updatedCount++;
            }
            $this->copyfrom($rowData);
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
     * @return \Base
     */
    public static function getF3(){
        return \Base::instance();
    }

    /**
     * debug log function
     * @param string $text
     */
    public static function log($text){
        Controller\LogController::getLogger('debug')->write($text);
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
     * @param array $fields
     * @return bool|array
     */
    public static function indexExists(array $fields=array()){
        $tableModifier = self::getTableModifier();
        $df = parent::resolveConfiguration();

        $check = false;
        $indexKey = $df['table'] . '___' . implode('__', $fields);
        $indexList = $tableModifier->listIndex();
        if(array_key_exists( $indexKey, $indexList)){
            $check = $indexList[$indexKey];
        }

        return $check;
    }

    /**
     * set a multi-column index for this table
     * @param array $fields
     * @param bool $unique
     * @param int $length
     * @return bool
     */
    public static function setMultiColumnIndex(array $fields=array(), $unique = false, $length = 20){
        $status = false;
        $tableModifier = self::getTableModifier();

        if( self::indexExists($fields) === false ){
            $tableModifier->addIndex($fields, $unique, $length);
            $buildStatus = $tableModifier->build();
            if($buildStatus === 0){
                $status = true;
            }
        }

        return $status;
    }

} 