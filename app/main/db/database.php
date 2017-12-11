<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 30.07.2015
 * Time: 15:55
 */

namespace DB;
use controller\LogController;
use lib\Config;

class Database extends \Prefab {

    /**
     * if true, errors will not get logged
     * @var bool
     */
    private $silent                     = false;

    /**
     * @var array
     */
    private $errors                     = [];

    /**
     * connect to the DB server itself -> NO database is used
     * -> can be used to check if a certain DB exists without connecting to it directly
     * @param string $dbKey
     * @return SQL|null
     */
    public function connectToServer(string $dbKey = 'PF'){
        $dbConfig = Config::getDatabaseConfig($dbKey);
        $dbConfig['DNS'] = str_replace(';dbname=', '', $dbConfig['DNS'] );
        $dbConfig['NAME'] = '';
        return call_user_func_array([$this, 'connect'], $dbConfig);
    }

    /**
     * tries to create a database if not exists
     * -> DB user needs rights to create a DB
     * @param string $dbKey
     * @return SQL|null
     */
    public function createDB(string $dbKey = 'PF'){
        $db = null;
        $dbConfig = Config::getDatabaseConfig($dbKey);
        // remove database from $dsn (we want to crate it)
        $newDbName = $dbConfig['NAME'];
        if(!empty($newDbName)){
            $dbConfig['NAME'] = '';
            $dbConfig['DNS'] = str_replace(';dbname=', '', $dbConfig['DNS'] );

            $db = call_user_func_array([$this, 'connect'], $dbConfig);

            if(!is_null($db)){
                $schema = new SQL\Schema($db);
                if(!in_array($newDbName, $schema->getDatabases())){
                    $db->exec("CREATE DATABASE IF NOT EXISTS 
                        `" . $newDbName . "` DEFAULT CHARACTER SET utf8 
                        COLLATE utf8_general_ci;");
                    $db->exec("USE `" . $newDbName . "`");

                    // check if DB create was successful
                    $dbCheck = $db->exec("SELECT DATABASE()");
                    if(
                        !empty($dbCheck[0]) &&
                        !empty($checkDbName = reset($dbCheck[0])) &&
                        $checkDbName == $newDbName
                    ){
                        self::prepareDBConnection($db);
                        self::prepareDatabase($db);
                    }
                }
            }
        }

        return $db;
    }

    /**
     * get database
     * @param string $dbKey
     * @return SQL|null
     */
    public function getDB(string $dbKey = 'PF'){
        $f3 = \Base::instance();
        // "Hive" Key for DB object cache
        $dbHiveKey = $this->getDbHiveKey($dbKey);
        if( !$f3->exists($dbHiveKey, $db) ){
            $dbConfig = Config::getDatabaseConfig($dbKey);
            $db  = call_user_func_array([$this, 'connect'], $dbConfig);
            if(!is_null($db)){
                self::prepareDBConnection($db);
                $f3->set($dbHiveKey, $db);
            }
        }

        return $db;
    }

    /**
     * get a unique hive key for each DB connection
     * @param $dbKey
     * @return string
     */
    protected function getDbHiveKey($dbKey){
        return 'DB_' . $dbKey;
    }

    /**
     * connect to a database
     * @param string $dns
     * @param string $name
     * @param string $user
     * @param string $password
     * @param string $alias
     * @return SQL|null
     * @throws \Exception\PathfinderException
     */
    protected function connect($dns, $name, $user, $password, $alias){
        $db = null;
        $f3 = \Base::instance();

        $options = [
            \PDO::MYSQL_ATTR_COMPRESS  => true,
            \PDO::ATTR_TIMEOUT => \Base::instance()->get('REQUIREMENTS.MYSQL.PDO_TIMEOUT'),
        ];

        // set ERRMODE depending on pathfinders global DEBUG level
        if($f3->get('DEBUG') >= 3){
            $options[\PDO::ATTR_ERRMODE] = \PDO::ERRMODE_WARNING;
        }else{
            $options[\PDO::ATTR_ERRMODE] = \PDO::ERRMODE_EXCEPTION;
        }

        try {
            $db = new SQL(
                $dns . $name,
                $user,
                $password,
                $options
            );
        }catch(\PDOException $e){
            $this->pushError($alias, $e);
            if(!$this->isSilent()){
                self::getLogger()->write($e);
            }
        }

        return $db;
    }

    /**
     * get all table names from a DB
     * @param string $dbKey
     * @return array|bool
     */
    public function getTables($dbKey = 'PF'){
        $schema = new SQL\Schema( $this->getDB($dbKey) );
        return $schema->getTables();
    }

    /**
     * checks whether a table exists on a DB or not
     * @param $table
     * @param string $dbKey
     * @return bool
     */
    public function tableExists($table, $dbKey = 'PF'){
        $tableNames = $this->getTables($dbKey);
        return in_array($table, $tableNames);
    }

    /**
     * get current row (data) count for an existing table
     * -> returns 0 if table not exists or empty
     * @param $table
     * @param string $dbKey
     * @return int
     */
    public function getRowCount($table, $dbKey = 'PF') {
        $count = 0;
        if( $this->tableExists($table, $dbKey) ){
            $db = $this->getDB($dbKey);
            $countRes = $db->exec("SELECT COUNT(*) `num` FROM " . $db->quotekey($table));
            if(isset($countRes[0]['num'])){
                $count = (int)$countRes[0]['num'];
            }
        }
        return $count;
    }

    /**
     * @return bool
     */
    public function isSilent() : bool{
        return $this->silent;
    }

    /**
     * set "silent" mode (no error logging)
     * -> optional clear $this->errors
     * @param bool $silent
     * @param bool $clearErrors
     */
    public function setSilent(bool $silent, bool $clearErrors = false){
        $this->silent = $silent;
        if($clearErrors){
            $this->errors = [];
        }
    }

    /**
     * push new Exception into static error history
     * @param string $alias
     * @param \PDOException $e
     */
    protected function pushError(string $alias, \PDOException $e){
        if(!is_array($this->errors[$alias])){
            $this->errors[$alias] = [];
        }

        // prevent adding same errors twice
        if(!empty($this->errors[$alias])){
            $lastError = array_values($this->errors[$alias])[0];
            if($lastError->getMessage() === $e->getMessage()){
                return;
            }
        }

        array_unshift($this->errors[$alias], $e);
        if(count($this->errors[$alias]) > 5){
            $this->errors[$alias] = array_pop($this->errors[$alias]);
        }
    }

    /**
     * get last recent Exceptions from error history
     * @param string $alias
     * @param int $limit
     * @return \PDOException[]
     */
    public function getErrors(string $alias, int $limit = 1){
        return array_slice((array)$this->errors[$alias] , 0, $limit);
    }

    /**
     * prepare current DB
     * -> set session connection variables
     * @param SQL $db
     */
    public static function prepareDBConnection(SQL &$db){
        // set DB timezone to UTC +00:00 (eve server time)
        $db->exec('SET @@session.time_zone = "+00:00";');

        // set default storage engine
        $db->exec('SET @@session.default_storage_engine = "' .
            self::getRequiredMySqlVariables('DEFAULT_STORAGE_ENGINE') . '"');
    }

    /**
     * set some default config for current DB
     * @param SQL $db
     */
    public static function prepareDatabase(SQL &$db){
        if($db->name()){
            // set/change default "character set" and "collation"
            $db->exec('ALTER DATABASE ' . $db->quotekey($db->name())
                . ' CHARACTER SET ' . self::getRequiredMySqlVariables('CHARACTER_SET_DATABASE')
                . ' COLLATE ' . self::getRequiredMySqlVariables('COLLATION_DATABASE')
            );
        }
    }

    /**
     * get required MySQL variable value
     * @param string $key
     * @return string|null
     */
    public static function getRequiredMySqlVariables(string $key){
        \Base::instance()->exists('REQUIREMENTS[MYSQL][VARS][' . $key . ']', $data);
        return $data;
    }

    /**
     * get logger for DB logging
     * @return \Log
     * @throws \Exception\PathfinderException
     */
    static function getLogger(){
        return LogController::getLogger('ERROR');
    }
}