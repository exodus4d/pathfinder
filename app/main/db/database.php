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

        if($database === 'CCP'){
            // CCP DB
            $dns = Controller\Controller::getEnvironmentData('DB_CCP_DNS');
            $name = Controller\Controller::getEnvironmentData('DB_CCP_NAME');
            $user = Controller\Controller::getEnvironmentData('DB_CCP_USER');
            $password = Controller\Controller::getEnvironmentData('DB_CCP_PASS');
        }else{
            // Pathfinder(PF) DB
            $dns = Controller\Controller::getEnvironmentData('DB_DNS');
            $name = Controller\Controller::getEnvironmentData('DB_NAME');
            $user = Controller\Controller::getEnvironmentData('DB_USER');
            $password = Controller\Controller::getEnvironmentData('DB_PASS');
        }

        // check if DB connection already exists
        if(
            !$f3->exists( $dbHiveKey ) ||
            $name !== $f3->get( $dbHiveKey )->name()
        ){
            $db = $this->connect($dns, $name, $user, $password);

            // set DB timezone to UTC +00:00 (eve server time)
            $db->exec('SET @@session.time_zone = "+00:00";');

            // disable innoDB schema (relevant vor MySql 5.5)
            // not necessary for MySql > v.5.6
            // $db->exec('SET GLOBAL innodb_stats_on_metadata = OFF;');

            // store DB object
            $f3->set($dbHiveKey, $db);

            return $db;
        }else{
            return $f3->get( $dbHiveKey );
        }
    }

    /**
     * get database
     * @param string $database
     * @return mixed|void
     */
    public function getDB($database = 'PF'){

        $f3 = \Base::instance();
        $dbHiveKey = $this->getDbHiveKey($database);

        if( $f3->exists( $dbHiveKey ) ){
            return $f3->get( $dbHiveKey );
        }else{
            return $this->setDB($database);
        }
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

        try {
            $db = new SQL(
                $dns . $name,
                $user,
                $password,
                [
                    \PDO::MYSQL_ATTR_COMPRESS  => TRUE
                ]
            );
        }catch(\PDOException $e){
            // DB connection error
            LogController::getLogger('error')->write($e->getMessage());
        }

        return $db;
    }

}