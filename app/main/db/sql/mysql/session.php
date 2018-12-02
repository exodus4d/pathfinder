<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 02.12.2018
 * Time: 15:40
 */

namespace DB\SQL\MySQL;


class Session extends \DB\SQL\Session {


    function __construct(\DB\SQL $db, string $table = 'sessions', bool $force = true, $onsuspect = null, $key = null){
        if($force){
            // create sessions table
            // -> We use this "custom" SQl rather than the default in parent::__construct()
            //    because of the defaults 'data' column type TEXT
            $dbName = $db->name();

            $sql = "CREATE TABLE IF NOT EXISTS ";
            $sql .= $dbName ? $db->quotekey($dbName,FALSE) . "." : "";
            $sql .= $db->quotekey($table,FALSE) . " (";
            $sql .= $db->quotekey('session_id') . " VARCHAR(255),";
            $sql .= $db->quotekey('data') . " MEDIUMTEXT,";
            $sql .= $db->quotekey('ip') . " VARCHAR(45),";
            $sql .= $db->quotekey('agent') . " VARCHAR(300),";
            $sql .= $db->quotekey('stamp') . " INT(11),";
            $sql .= "PRIMARY KEY (" . $db->quotekey('session_id') . ")";
            $sql .= ");";

            $db->exec($sql);
        }

        // $force = false for parent constructor -> skip default create SQL
        parent::__construct($db, $table, false, $onsuspect, $key);
    }
}