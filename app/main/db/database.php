<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 30.07.2015
 * Time: 15:55
 */

namespace DB;
use Controller;
use controller\LogController;
use lib\Config;

class Database extends \Prefab {


    function __construct($database = 'PF'){
        // set database
        $this->setDB($database);
    }

    /**
     * set database
     * @param string $database
     * @return SQL
     */
    public function setDB($database = 'PF'){
        $f3 = \Base::instance();

        // "Hive" Key for DB storage
        $dbHiveKey = $this->getDbHiveKey($database);

        // check if DB connection already exists
        if( !$f3->exists($dbHiveKey, $db) ){
            $dbConfig = Config::getDatabaseConfig($database);

            $db  = call_user_func_array([$this, 'connect'], $dbConfig);

            if( !is_null($db) ){
                // set DB timezone to UTC +00:00 (eve server time)
                $db->exec('SET @@session.time_zone = "+00:00";');

                // set default storage engine
                $db->exec('SET @@session.default_storage_engine = "' .
                    Controller\Controller::getRequiredMySqlVariables('DEFAULT_STORAGE_ENGINE') . '"');

                // store DB object
                $f3->set($dbHiveKey, $db);
            }
        }

        return $db;
    }

    /**
     * get database
     * @param string $database
     * @return SQL
     */
    public function getDB($database = 'PF'){
        $f3 = \Base::instance();
        $dbHiveKey = $this->getDbHiveKey($database);
        if( !$f3->exists($dbHiveKey, $db) ){
            $db = $this->setDB($database);
        }

        return $db;
    }

    /**
     * get a unique hive key for each DB connection
     * @param $database
     * @return string
     */
    protected function getDbHiveKey($database){
        return 'DB_' . $database;
    }


    /**
     * connect to a database
     * @param $dns
     * @param $name
     * @param $user
     * @param $password
     * @return SQL
     */
    protected function connect($dns, $name, $user, $password){
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
            // DB connection error
            // -> log it
            self::getLogger()->write($e->getMessage());
        }

        return $db;
    }

    /**
     * get all table names from a DB
     * @param string $database
     * @return array|bool
     */
    public function getTables($database = 'PF'){
        $schema = new SQL\Schema( $this->getDB($database) );
        return $schema->getTables();
    }

    /**
     * checks whether a table exists on a DB or not
     * @param $table
     * @param string $database
     * @return bool
     */
    public function tableExists($table, $database = 'PF'){
        $tableNames = $this->getTables($database);
        return in_array($table, $tableNames);
    }

    /**
     * get current row (data) count for an existing table
     * -> returns 0 if table not exists or empty
     * @param $table
     * @param string $database
     * @return int
     */
    public function getRowCount($table, $database = 'PF') {
        $count = 0;
        if( $this->tableExists($table, $database) ){
            $db = $this->getDB($database);
            $countRes = $db->exec("SELECT COUNT(*) `num` FROM " . $db->quotekey($table));
            if(isset($countRes[0]['num'])){
                $count = (int)$countRes[0]['num'];
            }
        }
        return $count;
    }

    /**
     * get logger for DB logging
     * @return \Log
     */
    static function getLogger(){
        return LogController::getLogger('ERROR');
    }
}