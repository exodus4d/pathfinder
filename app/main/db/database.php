<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 30.07.2015
 * Time: 15:55
 */

namespace DB;

class Database extends \Prefab {


    function __construct($database = 'PF'){
        // set database
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
            $db = $this->connect($f3->get('DB_CCP_DNS'), $f3->get('DB_CCP_NAME'), $f3->get('DB_CCP_USER'), $f3->get('DB_CCP_PASS'));
        }else{
            // Pathfinder DB
            $db = $this->connect($f3->get('DB_DNS'), $f3->get('DB_NAME'), $f3->get('DB_USER'), $f3->get('DB_PASS'));
        }

        $f3->set('DB', $db);

        // set DB timezone to UTC +00:00 (eve server time)
        $f3->get('DB')->exec('SET @@session.time_zone = "+00:00";');

        // disable innoDB schema (relevant vor MySql 5.5)
        // not necessary for MySql 5.6
        //$f3->get('DB')->exec('SET GLOBAL innodb_stats_on_metadata = OFF;');
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

        $db = new SQL(
            $dns . $name,
            $user,
            $password
        );

        return $db;
    }

}