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
        $this->setDB($database);
    }

    /**
     * set database
     * @param string $database
     */
    public function setDB($database = 'PF'){

        $f3 = \Base::instance();

        if($database === 'CCP'){
            // CCP DB
            $dns = Controller\Controller::getEnvironmentData('DB_CCP_DNS');
            $name = Controller\Controller::getEnvironmentData('DB_CCP_NAME');
            $user = Controller\Controller::getEnvironmentData('DB_CCP_USER');
            $password = Controller\Controller::getEnvironmentData('DB_CCP_PASS');
        }else{
            // Pathfinder DB
            $dns = Controller\Controller::getEnvironmentData('DB_DNS');
            $name = Controller\Controller::getEnvironmentData('DB_NAME');
            $user = Controller\Controller::getEnvironmentData('DB_USER');
            $password = Controller\Controller::getEnvironmentData('DB_PASS');
        }

        // check for DB switch. If current DB equal new DB -> no switch needed
        if(
            !$f3->exists('DB') ||
            $name !== $f3->get('DB')->name()
        ){

            $db = $this->connect($dns, $name, $user, $password);

            $f3->set('DB', $db);

            // set DB timezone to UTC +00:00 (eve server time)
            $f3->get('DB')->exec('SET @@session.time_zone = "+00:00";');

            // disable innoDB schema (relevant vor MySql 5.5)
            // not necessary for MySql > v.5.6
            //$f3->get('DB')->exec('SET GLOBAL innodb_stats_on_metadata = OFF;');
        }

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