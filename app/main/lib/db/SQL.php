<?php


namespace lib\db;


use DB\SQL\Schema;

class SQL extends \DB\SQL {

    /**
     * SQL constructor.
     * @param $dsn
     * @param null $user
     * @param null $pw
     * @param array|null $options
     */
    public function __construct($dsn, $user = null, $pw = null, array $options = null){
        parent::__construct($dsn, $user, $pw, $options);
    }

    /**
     * get DB DSN config string
     * @return string
     */
    public function getDSN() : string {
        return $this->dsn;
    }

    /**
     * get all table names
     * @return array|bool
     */
    public function getTables(){
        $schema = new Schema($this);
        return $schema->getTables();
    }

    /**
     * checks whether a table exists or not
     * @param string $table
     * @return bool
     */
    public function tableExists(string $table) : bool {
        return in_array($table, $this->getTables());
    }

    /**
     * get current row (data) count for an existing table
     * -> returns 0 if table not exists or empty
     * @param string $table
     * @return int
     */
    public function getRowCount(string $table) : int {
        $count = 0;
        if($this->tableExists($table)){
            $countRes = $this->exec("SELECT COUNT(*) `num` FROM " . $this->quotekey($table));
            if(isset($countRes[0]['num'])){
                $count = (int)$countRes[0]['num'];
            }
        }
        return $count;
    }

    /**
     * set some default config for this DB
     * @param string $characterSetDatabase
     * @param string $collationDatabase
     */
    public function prepareDatabase(string $characterSetDatabase, string $collationDatabase){
        if($this->name() && $characterSetDatabase && $collationDatabase){
            // set/change default "character set" and "collation"
            $this->exec('ALTER DATABASE ' . $this->quotekey($this->name())
                . ' CHARACTER SET ' . $characterSetDatabase
                . ' COLLATE ' . $collationDatabase
            );
        }
    }

    /**
     * @see https://fatfreeframework.com/3.6/sql#exec
     * @param array|string $cmds
     * @param null $args
     * @param int $ttl
     * @param bool $log (we use false as default parameter)
     * @param bool $stamp
     * @return array|FALSE|int
     */
    function exec($cmds, $args = null, $ttl = 0, $log = false, $stamp = false) {
        return parent::exec($cmds, $args, $ttl, $log, $stamp);
    }
}