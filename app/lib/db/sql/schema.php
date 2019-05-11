<?php

/**
 *  SQL Table Schema Builder extension for the PHP Fat-Free Framework
 *
 *  The contents of this file are subject to the terms of the GNU General
 *  Public License Version 3.0. You may not use this file except in
 *  compliance with the license. Any of the license terms and conditions
 *  can be waived if you get permission from the copyright holder.
 *
 *  crafted by   __ __     __
 *              |__|  |--.|  |--.-----.-----.
 *              |  |    < |    <|  -__|-- __|
 *              |__|__|__||__|__|_____|_____|
 *
 *  Copyright (c) 2012-2018 by ikkez
 *  Christian Knuth <ikkez0n3@gmail.com>
 *  https://github.com/ikkez/F3-Sugar/
 *
 *  @package DB
 *  @version 2.2.3
 *  @date 15.05.2018
 **/


namespace DB\SQL;

class Schema {

    use DB_Utils;

    public
        $dataTypes = array(
        'BOOLEAN' =>    array('mysql' => 'tinyint(1)',
            'sqlite2?|pgsql' => 'BOOLEAN',
            'mssql|sybase|dblib|odbc|sqlsrv' => 'bit',
            'ibm' => 'numeric(1,0)',
        ),
        'INT1' =>       array('mysql' => 'tinyint(4)',
            'sqlite2?' => 'integer(4)',
            'mssql|sybase|dblib|odbc|sqlsrv' => 'tinyint',
            'pgsql|ibm' => 'smallint',
        ),
        'INT2' =>       array('mysql' => 'smallint(6)',
            'sqlite2?' => 'integer(6)',
            'pgsql|ibm|mssql|sybase|dblib|odbc|sqlsrv' => 'smallint',
        ),
        'INT4' =>       array('sqlite2?' => 'integer(11)',
            'pgsql|imb' => 'integer',
            'mysql' => 'int(11)',
            'mssql|dblib|sybase|odbc|sqlsrv' => 'int',
        ),
        'INT8' =>       array('sqlite2?' => 'integer(20)',
            'pgsql|mssql|sybase|dblib|odbc|sqlsrv|imb' => 'bigint',
            'mysql' => 'bigint(20)',
        ),
        'FLOAT' =>      array('mysql|sqlite2?' => 'FLOAT',
            'pgsql' => 'double precision',
            'mssql|sybase|dblib|odbc|sqlsrv' => 'float',
            'imb' => 'decfloat'
        ),
        'DOUBLE' =>     array('mysql|ibm' => 'decimal(18,6)',
            'sqlite2?' => 'decimal(15,6)', // max 15-digit on sqlite
            'pgsql' => 'numeric(18,6)',
            'mssql|dblib|sybase|odbc|sqlsrv' => 'decimal(18,6)',
        ),
        'VARCHAR128' => array('mysql|sqlite2?|ibm|mssql|sybase|dblib|odbc|sqlsrv' => 'varchar(128)',
            'pgsql' => 'character varying(128)',
        ),
        'VARCHAR256' => array('mysql|sqlite2?|ibm|mssql|sybase|dblib|odbc|sqlsrv' => 'varchar(255)',
            'pgsql' => 'character varying(255)',
        ),
        'VARCHAR512' => array('mysql|sqlite2?|ibm|mssql|sybase|dblib|odbc|sqlsrv' => 'varchar(512)',
            'pgsql' => 'character varying(512)',
        ),
        'TEXT' =>       array('mysql|sqlite2?|pgsql|mssql' => 'text',
            'sybase|dblib|odbc|sqlsrv' => 'nvarchar(max)',
            'ibm' => 'BLOB SUB_TYPE TEXT',
        ),
        'LONGTEXT' =>   array('mysql' => 'LONGTEXT',
            'sqlite2?|pgsql|mssql' => 'text',
            'sybase|dblib|odbc|sqlsrv' => 'nvarchar(max)',
            'ibm' => 'CLOB(2000000000)',
        ),
        'DATE' =>       array('mysql|sqlite2?|pgsql|mssql|sybase|dblib|odbc|sqlsrv|ibm' => 'date',
        ),
        'DATETIME' =>   array('pgsql' => 'timestamp without time zone',
            'mysql|sqlite2?|mssql|sybase|dblib|odbc|sqlsrv' => 'datetime',
            'ibm' => 'timestamp',
        ),
        'TIMESTAMP' =>  array('mysql|ibm' => 'timestamp',
            'pgsql|odbc' => 'timestamp without time zone',
            'sqlite2?|mssql|sybase|dblib|sqlsrv'=>'DATETIME',
        ),
        'BLOB' =>       array('mysql|odbc|sqlite2?|ibm' => 'blob',
            'pgsql' => 'bytea',
            'mssql|sybase|dblib' => 'image',
            'sqlsrv' => 'varbinary(max)',
        ),
    ),
        $defaultTypes = array(
        'CUR_STAMP' =>  array('mysql' => 'CURRENT_TIMESTAMP',
            'mssql|sybase|dblib|odbc|sqlsrv' => 'getdate()',
            'pgsql' => 'LOCALTIMESTAMP(0)',
            'sqlite2?' => "(datetime('now','localtime'))",
        ),
    );

    public
        $name;

    public static
        $strict = FALSE;

    const
        // DataTypes and Aliases
        DT_BOOL = 'BOOLEAN',
        DT_BOOLEAN = 'BOOLEAN',
        DT_INT1 = 'INT1',
        DT_TINYINT = 'INT1',
        DT_INT2 = 'INT2',
        DT_SMALLINT = 'INT2',
        DT_INT4 = 'INT4',
        DT_INT = 'INT4',
        DT_INT8 = 'INT8',
        DT_BIGINT = 'INT8',
        DT_FLOAT = 'FLOAT',
        DT_DOUBLE = 'DOUBLE',
        DT_DECIMAL = 'DOUBLE',
        DT_VARCHAR128 = 'VARCHAR128',
        DT_VARCHAR256 = 'VARCHAR256',
        DT_VARCHAR512 = 'VARCHAR512',
        DT_TEXT = 'TEXT',
        DT_LONGTEXT = 'LONGTEXT',
        DT_DATE = 'DATE',
        DT_DATETIME = 'DATETIME',
        DT_TIMESTAMP = 'TIMESTAMP',
        DT_BLOB = 'BLOB',
        DT_BINARY = 'BLOB',

        // column default values
        DF_CURRENT_TIMESTAMP = 'CUR_STAMP';


    public function __construct(\DB\SQL $db)
    {
        $this->db = $db;
    }

    /**
     * get a list of all databases
     * @return array|bool
     */
    public function getDatabases()
    {
        $cmd = array(
            'mysql' => 'SHOW DATABASES',
            'pgsql' => 'SELECT datname FROM pg_catalog.pg_database',
            'mssql|sybase|dblib|sqlsrv|odbc' => 'EXEC SP_HELPDB',
        );
        $query = $this->findQuery($cmd);
        if (!$query) return false;
        $result = $this->db->exec($query);
        if (!is_array($result)) return false;
        foreach($result as &$db)
            if (is_array($db)) $db = array_shift($db);
        return $result;
    }

    /**
     * get all tables of current DB
     * @return bool|array list of tables, or false
     */
    public function getTables()
    {
        $cmd = array(
            'mysql' => array(
                "show tables"),
            'sqlite2?' => array(
                "SELECT name FROM sqlite_master WHERE type='table' AND name!='sqlite_sequence'"),
            'pgsql|sybase|dblib' => array(
                "select table_name from information_schema.tables where table_schema = 'public'"),
            'mssql|sqlsrv|odbc' => array(
                "select table_name from information_schema.tables"),
            'ibm' => array("select TABLE_NAME from sysibm.tables"),
        );
        $query = $this->findQuery($cmd);
        if (!$query[0]) return false;
        $tables = $this->db->exec($query[0]);
        if ($tables && is_array($tables) && count($tables) > 0)
            foreach ($tables as &$table)
                $table = array_shift($table);
        return $tables;
    }

    /**
     * returns a table object for creation
     * @param $name
     * @return bool|TableCreator
     */
    public function createTable($name)
    {
        return new TableCreator($name,$this);
    }

    /**
     * returns a table object for altering operations
     * @param $name
     * @return bool|TableModifier
     */
    public function alterTable($name)
    {
        return new TableModifier($name,$this);
    }

    /**
     * rename a table
     * @param string $name
     * @param string $new_name
     * @param bool $exec
     * @return bool
     */
    public function renameTable($name, $new_name, $exec = true)
    {
        $name = $this->db->quotekey($name);
        $new_name = $this->db->quotekey($new_name);
        if (preg_match('/odbc/', $this->db->driver())) {
            $queries = array();
            $queries[] = "SELECT * INTO $new_name FROM $name;";
            $queries[] = $this->dropTable($name, false);
            return ($exec) ? $this->db->exec($queries) : implode("\n",$queries);
        } else {
            $cmd = array(
                'sqlite2?|pgsql' =>
                    "ALTER TABLE $name RENAME TO $new_name;",
                'mysql|ibm' =>
                    "RENAME TABLE $name TO $new_name;",
                'mssql|sqlsrv|sybase|dblib|odbc' =>
                    "sp_rename {$name}, $new_name"
            );
            $query = $this->findQuery($cmd);
            if (!$exec) return $query;
            return (preg_match('/mssql|sybase|dblib|sqlsrv/', $this->db->driver()))
                ? @$this->db->exec($query) : $this->db->exec($query);
        }
    }

    /**
     * drop a table
     * @param \DB\SQL\TableBuilder|string $name
     * @param bool $exec
     * @return bool
     */
    public function dropTable($name, $exec = true)
    {
        if (is_object($name) && $name instanceof TableBuilder)
            $name = $name->name;
        $cmd = array(
            'mysql|ibm|sqlite2?|pgsql|sybase|dblib' =>
                'DROP TABLE IF EXISTS '.$this->db->quotekey($name).';',
            'mssql|sqlsrv|odbc' =>
                "IF OBJECT_ID('[$name]', 'U') IS NOT NULL DROP TABLE [$name];"
        );
        $query = $this->findQuery($cmd);
        return ($exec) ? $this->db->exec($query) : $query;
    }

    /**
     * clear a table
     * @param $name
     * @param bool $exec
     * @return array|bool|FALSE|int|string
     */
    public function truncateTable($name, $exec = true) {
        if (is_object($name) && $name instanceof TableBuilder)
            $name = $name->name;
        $cmd = array(
            'mysql|ibm|pgsql|sybase|dblib|mssql|sqlsrv|odbc' =>
                'TRUNCATE TABLE '.$this->db->quotekey($name).';',
            'sqlite2?' => array(
                'DELETE FROM '.$this->db->quotekey($name).';',
//                'UPDATE SQLITE_SEQUENCE SET seq = 0 WHERE name = '.$this->db->quotekey($name).';',
            ),
        );
        $query = $this->findQuery($cmd);
        return ($exec) ? $this->db->exec($query) : $query;
    }

    /**
     * check if a data type is compatible with a given column definition
     * @param string $colType (i.e: BOOLEAN)
     * @param string $colDef (i.e: tinyint(1))
     * @return int
     */
    public function isCompatible($colType,$colDef) {
        $raw_type=$this->findQuery($this->dataTypes[strtoupper($colType)]);
        preg_match_all('/(?P<type>\w+)($|\((?P<length>(\d+|(.*)))\))/', $raw_type, $match);
        return (bool) preg_match_all('/'.preg_quote($match['type'][0]).'($|\('.
            preg_quote($match['length'][0]).'\))/i',$colDef);
    }
}

abstract class TableBuilder {

    use DB_Utils;

    protected   $columns, $pkeys, $queries, $increments, $rebuild_cmd, $suppress;
    public      $name;
    /** @var Schema */
    public      $schema;

    const
        TEXT_NoDefaultForTEXT = "Column `%s` of type TEXT can't have a default value.",
        TEXT_ColumnExists = "Cannot add the column `%s`. It already exists.";

    /**
     * @param string $name
     * @param Schema $schema
     */
    public function __construct($name, Schema $schema)
    {
        $this->name = $name;
        $this->schema = $schema;
        $this->columns = array();
        $this->queries = array();
        $this->pkeys = array('id');
        $this->increments = 'id';
        $this->db = $schema->db;
    }

    /**
     * generate SQL query and execute it if $exec is true
     * @param bool $exec
     */
    abstract public function build($exec = TRUE);

    /**
     * add a new column to this table
     * @param string|Column $key column name or object
     * @param null|array $args optional config array
     * @return \DB\SQL\Column
     */
    public function addColumn($key,$args = null)
    {
        if ($key instanceof Column) {
            $args = $key->getColumnArray();
            $key = $key->name;
        }
        if (array_key_exists($key,$this->columns))
            trigger_error(sprintf(self::TEXT_ColumnExists,$key),E_USER_ERROR);
        $column = new Column($key, $this);
        if ($args)
            foreach ($args as $arg => $val)
                $column->{$arg} = $val;
        // skip default pkey field
        if (count($this->pkeys) == 1 && in_array($key,$this->pkeys))
            return $column;
        return $this->columns[$key] =& $column;
    }

    /**
     * create index on one or more columns
     * @param string|array $index_cols Column(s) to be indexed
     * @param              $search_cols
     * @param bool         $unique     Unique index
     * @param int          $length     index length for text fields in mysql
     */
    protected function _addIndex($index_cols, $search_cols, $unique, $length)
    {
        if (!is_array($index_cols))
            $index_cols = array($index_cols);
        $quotedCols = array_map(array($this->db, 'quotekey'), $index_cols);
        if (preg_match('/mysql/', $this->db->driver()))
            foreach($quotedCols as $i=>&$col)
                if(strtoupper($search_cols[$index_cols[$i]]['type']) == 'TEXT')
                    $col.='('.$length.')';
        $cols = implode(',', $quotedCols);
        $name = $this->assembleIndexKey($index_cols,$this->name);
        $name = $this->db->quotekey($name);
        $table = $this->db->quotekey($this->name);
        $index = $unique ? 'UNIQUE INDEX' : 'INDEX';
        $cmd = array(
            'pgsql|sqlite2?|ibm|mssql|sybase|dblib|odbc|sqlsrv' =>
                "CREATE $index $name ON $table ($cols);",
            'mysql' => //ALTER TABLE is used because of MySQL bug #48875
                "ALTER TABLE $table ADD $index $name ($cols);",
        );
        $query = $this->findQuery($cmd);
        $this->queries[] = $query;
    }

    /**
     * create index name from one or more given column names, max. 64 char lengths
     * @param string|array $index_cols
     * @return string
     */
    protected function assembleIndexKey($index_cols,$table_name) {
        if (!is_array($index_cols))
            $index_cols = array($index_cols);
        $name = $table_name.'___'.implode('__', $index_cols);
        if (strlen($name)>64)
            $name=$table_name.'___'.\Base::instance()->hash(implode('__', $index_cols));
        if (strlen($name)>64)
            $name='___'.\Base::instance()->hash($table_name.'___'.implode('__', $index_cols));
        return $name;
    }

    /**
     * set primary / composite key to table
     * @param string|array $pkeys
     * @return bool
     */
    public function primary($pkeys) {
        if (empty($pkeys))
            return false;
        if (!is_array($pkeys))
            $pkeys = array($pkeys);
        // single pkey
        $this->increments = $pkeys[0];
        $this->pkeys = $pkeys;
        // drop duplicate pkey definition
        if (array_key_exists($this->increments,$this->columns))
            unset($this->columns[$this->increments]);
        // set flag on new fields
        foreach ($pkeys as $name)
            if(array_key_exists($name,$this->columns))
                $this->columns[$name]->pkey = true;
        // composite key
        if (count($pkeys) > 1) {
            $pkeys_quoted = array_map(array($this->db,'quotekey'), $pkeys);
            $pk_string = implode(', ', $pkeys_quoted);
            if (preg_match('/sqlite2?/', $this->db->driver())) {
                // rebuild table with new primary keys
                $this->rebuild_cmd['pkeys'] = $pkeys;
                return;
            } else {
                $table = $this->db->quotekey($this->name);
                $table_key = $this->db->quotekey($this->name.'_pkey');
                $cmd = array(
                    'odbc' =>
                        "CREATE INDEX $table_key ON $table ( $pk_string );",
                    'mysql' =>
                        "ALTER TABLE $table DROP PRIMARY KEY, ADD PRIMARY KEY ( $pk_string );",
                    'mssql|sybase|dblib|sqlsrv' => array(
                        "ALTER TABLE $table DROP CONSTRAINT PK_".$this->name."_ID;",
                        "ALTER TABLE $table ADD CONSTRAINT $table_key PRIMARY KEY ( $pk_string );",
                    ),
                    'pgsql' => array(
                        "ALTER TABLE $table DROP CONSTRAINT $table_key;",
                        "ALTER TABLE $table ADD CONSTRAINT $table_key PRIMARY KEY ( $pk_string );",
                    ),
                );
                $query = $this->findQuery($cmd);
                if (!is_array($query))
                    $query = array($query);
                foreach ($query as $q)
                    $this->queries[] = $q;
            }
        }
    }

}

class TableCreator extends TableBuilder {

    const
        TEXT_TableAlreadyExists = "Table `%s` already exists. Cannot create it.";

    protected $charset='utf8';

    public function setCharset($str) {
        $this->charset=$str;
    }

    /**
     * generate SQL query for creating a basic table, containing an ID serial field
     * and execute it if $exec is true, otherwise just return the generated query string
     * @param bool $exec
     * @return bool|TableModifier|string
     */
    public function build($exec = TRUE)
    {
        // check if already existing
        if ($exec && in_array($this->name, $this->schema->getTables())) {
            trigger_error(sprintf(self::TEXT_TableAlreadyExists,$this->name),E_USER_ERROR);
            return false;
        }
        $cols = '';
        if (!empty($this->columns))
            foreach ($this->columns as $cname => $column) {
                // no defaults for TEXT type
                if ($column->default !== false && is_int(strpos(strtoupper($column->type),'TEXT'))) {
                    trigger_error(sprintf(self::TEXT_NoDefaultForTEXT, $column->name),E_USER_ERROR);
                    return false;
                }
                $cols .= ', '.$column->getColumnQuery();
            }
        $table = $this->db->quotekey($this->name);
        $id = $this->db->quotekey($this->increments);
        $cmd = array(
            'sqlite2?|sybase|dblib' =>
                "CREATE TABLE $table ($id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT".$cols.");",
            'mysql' =>
                "CREATE TABLE $table ($id INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT".$cols.") DEFAULT CHARSET=$this->charset COLLATE ".$this->charset."_unicode_ci;",
            'pgsql' =>
                "CREATE TABLE $table ($id SERIAL PRIMARY KEY".$cols.");",
            'mssql|odbc|sqlsrv' =>
                "CREATE TABLE $table ($id INT IDENTITY CONSTRAINT PK_".$this->name."_ID PRIMARY KEY".$cols.");",
            'ibm' =>
                "CREATE TABLE $table ($id INTEGER AS IDENTITY NOT NULL $cols, PRIMARY KEY($id));",
        );
        $query = $this->findQuery($cmd);
        // composite key for sqlite
        if (count($this->pkeys) > 1 && preg_match('/sqlite2?/', $this->db->driver())) {
            $pk_string = implode(', ', $this->pkeys);
            $query = "CREATE TABLE $table ($id INTEGER NULL".$cols.", PRIMARY KEY ($pk_string) );";
            $newTable = new TableModifier($this->name, $this->schema);
            // auto-incrementation in composite primary keys
            $pk_queries = $newTable->_sqlite_increment_trigger($this->increments);
            $this->queries = array_merge($this->queries, $pk_queries);
        }
        array_unshift($this->queries, $query);
        // indexes
        foreach ($this->columns as $cname => $column)
            if ($column->index)
                $this->addIndex($cname, $column->unique);
        if (!$exec)
            return $this->queries;
        $this->db->exec($this->queries);
        return isset($newTable) ? $newTable : new TableModifier($this->name,$this->schema);
    }

    /**
     * create index on one or more columns
     * @param string|array $columns Column(s) to be indexed
     * @param bool         $unique  Unique index
     * @param int          $length  index length for text fields in mysql
     */
    public function addIndex($columns, $unique = FALSE, $length = 20)
    {
        if (!is_array($columns))
            $columns = array($columns);
        $cols = $this->columns;
        foreach ($cols as &$col)
            $col = $col->getColumnArray();
        parent::_addIndex($columns,$cols,$unique,$length);
    }

}


class TableModifier extends TableBuilder {

    protected
        $colTypes, $rebuild_cmd;

    const
        // error messages
        TEXT_TableNotExisting = "Unable to alter table `%s`. It does not exist.",
        TEXT_NotNullFieldNeedsDefault = 'You cannot add the not nullable column `%s` without specifying a default value',
        TEXT_ENGINE_NOT_SUPPORTED = 'DB Engine `%s` is not supported for this action.';

    /**
     * generate SQL queries for altering the table and execute it if $exec is true,
     * otherwise return the generated query string
     * @param bool $exec
     * @return array|FALSE
     */
    public function build($exec = TRUE)
    {
        // check if table exists
        if (!in_array($this->name, $this->schema->getTables()))
            trigger_error(sprintf(self::TEXT_TableNotExisting, $this->name),E_USER_ERROR);

        if ($sqlite = preg_match('/sqlite2?/', $this->db->driver())) {
            $sqlite_queries = array();
        }
        $rebuild = false;
        $additional_queries = $this->queries;
        $this->queries = array();
        // add new columns
        foreach ($this->columns as $cname => $column) {
            /** @var Column $column */
            // not nullable fields should have a default value, when altering a table
            if ($column->default === false && $column->nullable === false) {
                trigger_error(sprintf(self::TEXT_NotNullFieldNeedsDefault, $column->name),E_USER_ERROR);
                return false;
            }
            // no defaults for TEXT type
            if($column->default !== false && is_int(strpos(strtoupper($column->type),'TEXT'))) {
                trigger_error(sprintf(self::TEXT_NoDefaultForTEXT, $column->name),E_USER_ERROR);
                return false;
            }
            $table = $this->db->quotekey($this->name);
            $col_query = $column->getColumnQuery();
            if ($sqlite) {
                // sqlite: dynamic column default only works when rebuilding the table
                if($column->default === Schema::DF_CURRENT_TIMESTAMP) {
                    $rebuild = true;
                    break;
                } else
                    $sqlite_queries[] = "ALTER TABLE $table ADD $col_query;";
            } else {
                $cmd = array(
                    'mysql|pgsql|mssql|sybase|dblib|odbc|sqlsrv' =>
                        "ALTER TABLE $table ADD $col_query;",
                    'ibm' =>
                        "ALTER TABLE $table ADD COLUMN $col_query;",
                );
                $this->queries[] = $this->findQuery($cmd);
            }
        }
        if ($sqlite)
            if ($rebuild || !empty($this->rebuild_cmd)) $this->_sqlite_rebuild($exec);
            else $this->queries += $sqlite_queries;
        $this->queries = array_merge($this->queries,$additional_queries);
        // add new indexes
        foreach ($this->columns as $cname => $column)
            if ($column->index)
                $this->addIndex($cname, $column->unique);
        if (empty($this->queries))
            return false;
        if (is_array($this->queries) && count($this->queries) == 1)
            $this->queries = $this->queries[0];
        if (!$exec) return $this->queries;
        $result = ($this->suppress)
            ? @$this->db->exec($this->queries) : $this->db->exec($this->queries);
        $this->queries = $this->columns = $this->rebuild_cmd = array();
        return $result;
    }

    /**
     * rebuild a sqlite table with additional schema changes
     */
    protected function _sqlite_rebuild($exec=true)
    {
        $new_columns = $this->columns;
        $existing_columns = $this->getCols(true);
        // find after sorts
        $after = array();
        foreach ($new_columns as $cname => $column)
            if(!empty($column->after))
                $after[$column->after][] = $cname;
        // find rename commands
        $rename = (!empty($this->rebuild_cmd) && array_key_exists('rename',$this->rebuild_cmd))
            ? $this->rebuild_cmd['rename'] : array();
        // get primary-key fields
        foreach ($existing_columns as $key => $col)
            if ($col['pkey'])
                $pkeys[array_key_exists($key,$rename) ? $rename[$key] : $key] = $col;
        foreach ($new_columns as $key => $col)
            if ($col->pkey)
                $pkeys[$key] = $col;
        // indexes
        $indexes = $this->listIndex();
        // drop fields
        if (!empty($this->rebuild_cmd) && array_key_exists('drop', $this->rebuild_cmd))
            foreach ($this->rebuild_cmd['drop'] as $name)
                if (array_key_exists($name, $existing_columns)) {
                    if (array_key_exists($name, $pkeys)) {
                        unset($pkeys[$name]);
                        // drop composite key
                        if(count($pkeys) == 1) {
                            $incrementTrigger = $this->db->quotekey($this->name.'_insert');
                            $this->queries[] = 'DROP TRIGGER IF EXISTS '.$incrementTrigger;
                        }
                    }
                    unset($existing_columns[$name]);
                    // drop index
                    foreach (array_keys($indexes) as $col) {
                        // new index names
                        if ($col == $this->name.'___'.$name)
                            unset($indexes[$this->name.'___'.$name]);
                        // check if column is part of an existing combined index
                        if (is_int(strpos($col, '__'))) {
                            if (is_int(strpos($col, '___'))) {
                                $col = explode('___', $col);
                                $ci = explode('__', $col[1]);
                                $col = implode('___',$col);
                                // drop combined index
                                if (in_array($name, $ci))
                                    unset($indexes[$col]);
                            }
                        }
                    }
                }
        // create new table
        $oname = $this->name;
        $this->queries[] = $this->rename($oname.'_temp', false);
        $newTable = $this->schema->createTable($oname);
        // add existing fields
        foreach ($existing_columns as $name => $col) {
            $colName = array_key_exists($name, $rename) ? $rename[$name] : $name;
            // update column datatype
            if (array_key_exists('update',$this->rebuild_cmd)
                && in_array($name,array_keys($this->rebuild_cmd['update']))) {
                $cdat = $this->rebuild_cmd['update'][$name];
                if ($cdat instanceof Column)
                    $col = $cdat->getColumnArray();
                else
                    $col['type'] = $cdat;
            }
            $newTable->addColumn($colName, $col)->passThrough();
            // add new fields with after flag
            if (array_key_exists($name,$after))
                foreach (array_reverse($after[$name]) as $acol) {
                    $newTable->addColumn($new_columns[$acol]);
                    unset($new_columns[$acol]);
                }
        }
        // add remaining new fields
        foreach ($new_columns as $ncol)
            $newTable->addColumn($ncol);
        $newTable->primary(array_keys($pkeys));
        // add existing indexes
        foreach (array_reverse($indexes) as $name=>$conf) {
            if (is_int(strpos($name, '___')))
                list($tname,$name) = explode('___', $name);
            if (is_int(strpos($name, '__')))
                $name = explode('__', $name);
            if ($exec) {
                $t = $this->schema->alterTable($oname);
                $t->dropIndex($name);
                $t->build();
            }
            $newTable->addIndex($name,$conf['unique']);
        }
        // build new table
        $newTableQueries = $newTable->build(false);
        $this->queries = array_merge($this->queries,$newTableQueries);
        // copy data
        if (!empty($existing_columns)) {
            foreach (array_keys($existing_columns) as $name) {
                $fields_from[] = $this->db->quotekey($name);
                $toName = array_key_exists($name, $rename) ? $rename[$name] : $name;
                $fields_to[] = $this->db->quotekey($toName);
            }
            $this->queries[] =
                'INSERT INTO '.$this->db->quotekey($newTable->name).' ('.implode(', ', $fields_to).') '.
                'SELECT '.implode(', ', $fields_from).' FROM '.$this->db->quotekey($this->name).';';
        }
        $this->queries[] = $this->drop(false);
        $this->name = $oname;
    }

    /**
     * create an insert trigger to work-a-round auto-incrementation in composite primary keys
     * @param $pkey
     * @return array
     */
    public function _sqlite_increment_trigger($pkey) {
        $table = $this->db->quotekey($this->name);
        $pkey = $this->db->quotekey($pkey);
        $triggerName = $this->db->quotekey($this->name.'_insert');
        $queries[] = "DROP TRIGGER IF EXISTS $triggerName;";
        $queries[] = 'CREATE TRIGGER '.$triggerName.' AFTER INSERT ON '.$table.
            ' WHEN (NEW.'.$pkey.' IS NULL) BEGIN'.
            ' UPDATE '.$table.' SET '.$pkey.' = ('.
            ' select coalesce( max( '.$pkey.' ), 0 ) + 1 from '.$table.
            ') WHERE ROWID = NEW.ROWID;'.
            ' END;';
        return $queries;
    }

    /**
     * get columns of a table
     * @param bool $types
     * @return array
     */
    public function getCols($types = false)
    {
        $schema = $this->db->schema($this->name, null, 0);
        if (!$types)
            return array_keys($schema);
        else
            foreach ($schema as $name => &$cols) {
                $default = ($cols['default'] === '') ? null : $cols['default'];
                if (!is_null($default) && ((is_int(strpos($curdef=strtolower(
                                $this->findQuery($this->schema->defaultTypes['CUR_STAMP'])),
                                strtolower($default))) || is_int(strpos(strtolower($default),$curdef)))
                        || $default == "('now'::text)::timestamp(0) without time zone"))
                {
                    $default = 'CUR_STAMP';
                } elseif (!is_null($default)) {
                    // remove single-qoutes
                    if (preg_match('/sqlite2?/', $this->db->driver()))
                        $default=preg_replace('/^\s*([\'"])(.*)\1\s*$/','\2',$default);
                    elseif (preg_match('/mssql|sybase|dblib|odbc|sqlsrv/', $this->db->driver()))
                        $default=preg_replace('/^\s*(\(\')(.*)(\'\))\s*$/','\2',$default);
                    // extract value from character_data in postgre
                    elseif (preg_match('/pgsql/', $this->db->driver()))
                        if (is_int(strpos($default, 'nextval')))
                            $default = null; // drop autoincrement default
                        elseif (preg_match("/^\'*(.*)\'*::(\s*\w)+/", $default, $match))
                            $default = $match[1];
                } else
                    $default=false;
                $cols['default'] = $default;
            }
        return $schema;
    }

    /**
     * check if a data type is compatible with an existing column type
     * @param string $colType (i.e: BOOLEAN)
     * @param string $column (i.e: active)
     * @return bool
     */
    public function isCompatible($colType,$column) {
        $cols = $this->getCols(true);
        return $this->schema->isCompatible($colType,$cols[$column]['type']);
    }

    /**
     * removes a column from a table
     * @param string $name
     * @return bool
     */
    public function dropColumn($name)
    {
        $colTypes = $this->getCols(true);
        // check if column exists
        if (!in_array($name, array_keys($colTypes))) return true;
        if (preg_match('/sqlite2?/', $this->db->driver())) {
            // SQlite does not support drop column directly
            $this->rebuild_cmd['drop'][] = $name;
        } else {
            $quotedTable = $this->db->quotekey($this->name);
            $quotedColumn = $this->db->quotekey($name);
            $cmd = array(
                'mysql' =>
                    "ALTER TABLE $quotedTable DROP $quotedColumn;",
                'pgsql|odbc|ibm|mssql|sybase|dblib|sqlsrv' =>
                    "ALTER TABLE $quotedTable DROP COLUMN $quotedColumn;",
            );
            if (preg_match('/mssql|sybase|dblib|sqlsrv/', $this->db->driver()))
                $this->suppress=true;
            $this->queries[] = $this->findQuery($cmd);
        }
    }

    /**
     * rename a column
     * @param $name
     * @param $new_name
     * @return void
     */
    public function renameColumn($name, $new_name)
    {
        $existing_columns = $this->getCols(true);
        // check if column is already existing
        if (!in_array($name, array_keys($existing_columns)))
            trigger_error('cannot rename column. it does not exist.',E_USER_ERROR);
        if (in_array($new_name, array_keys($existing_columns)))
            trigger_error('cannot rename column. new column already exist.',E_USER_ERROR);

        if (preg_match('/sqlite2?/', $this->db->driver()))
            // SQlite does not support drop or rename column directly
            $this->rebuild_cmd['rename'][$name] = $new_name;
        elseif (preg_match('/odbc/', $this->db->driver())) {
            // no rename column for odbc, create temp column
            $this->addColumn($new_name, $existing_columns[$name])->passThrough();
            $this->queries[] = "UPDATE $this->name SET $new_name = $name";
            $this->dropColumn($name);
        } else {
            $existing_columns = $this->getCols(true);
            $quotedTable = $this->db->quotekey($this->name);
            $quotedColumn = $this->db->quotekey($name);
            $quotedColumnNew = $this->db->quotekey($new_name);
            $cmd = array(
                'mysql' =>
                    "ALTER TABLE $quotedTable CHANGE $quotedColumn $quotedColumnNew ".$existing_columns[$name]['type'].";",
                'pgsql|ibm' =>
                    "ALTER TABLE $quotedTable RENAME COLUMN $quotedColumn TO $quotedColumnNew;",
                'mssql|sybase|dblib|sqlsrv' =>
                    "sp_rename [$this->name.$name], '$new_name', 'Column'",
            );
            if (preg_match('/mssql|sybase|dblib|sqlsrv/', $this->db->driver()))
                $this->suppress = true;
            $this->queries[] = $this->findQuery($cmd);
        }
    }

    /**
     * modifies column datatype
     * @param string $name
     * @param string|Column $datatype
     * @param bool $force
     */
    public function updateColumn($name, $datatype, $force = false)
    {
        if ($datatype instanceof Column) {
            $col = $datatype;
            $datatype = $col->type;
            $force = $col->passThrough;
        }
        if(!$force)
            $datatype = $this->findQuery($this->schema->dataTypes[strtoupper($datatype)]);
        $table = $this->db->quotekey($this->name);
        $column = $this->db->quotekey($name);
        if (preg_match('/sqlite2?/', $this->db->driver())){
            $this->rebuild_cmd['update'][$name] = isset($col)?$col:$datatype;
        } else {
            $dat = isset($col) ? $col->getColumnQuery() :
                $column.' '.$datatype;
            $cmd = array(
                'mysql' =>
                    "ALTER TABLE $table MODIFY COLUMN $dat;",
                'pgsql' =>
                    "ALTER TABLE $table ALTER COLUMN $column TYPE $datatype;",
                'sqlsrv|mssql|sybase|dblib|ibm' =>
                    "ALTER TABLE $table ALTER COLUMN $column $datatype;",
            );
            if (isset($col)) {
                $cmd['pgsql'] = array($cmd['pgsql']);
                $cmd['pgsql'][] = "ALTER TABLE $table ALTER COLUMN $column SET DEFAULT ".$col->getDefault().";";
                if ($col->nullable)
                    $cmd['pgsql'][] = "ALTER TABLE $table ALTER COLUMN $column DROP NOT NULL;";
                else
                    $cmd['pgsql'][] = "ALTER TABLE $table ALTER COLUMN $column SET NOT NULL;";
                $df_key = 'DF_'.$this->name.'_'.$name;
                $cmd['sqlsrv|mssql|sybase|dblib|ibm'] = array(
                    "ALTER TABLE $table ALTER COLUMN $column $datatype ".$col->getNullable().";",
                    "DECLARE @ConstraintName nvarchar(200)
                    SELECT @ConstraintName = Name FROM SYS.DEFAULT_CONSTRAINTS WHERE PARENT_OBJECT_ID = OBJECT_ID('$this->name')
                     AND PARENT_COLUMN_ID = (SELECT column_id FROM sys.columns WHERE NAME = N'$name'
                     AND object_id = OBJECT_ID(N'$this->name'))
                    IF @ConstraintName IS NOT NULL
                    EXEC('ALTER TABLE $this->name DROP CONSTRAINT ' + @ConstraintName)
                    ",
                    "ALTER TABLE $table ADD CONSTRAINT $df_key DEFAULT ".$col->getDefault()." FOR $column;",
                );
            }
            $this->queries[] = $this->findQuery($cmd);
        }
    }

    /**
     * create index on one or more columns
     * @param string|array $columns Column(s) to be indexed
     * @param bool         $unique  Unique index
     * @param int          $length  index length for text fields in mysql
     */
    public function addIndex($columns, $unique = FALSE, $length = 20)
    {
        if (!is_array($columns))
            $columns = array($columns);
        $existingCol = $this->columns;
        foreach ($existingCol as &$col)
            $col = $col->getColumnArray();
        $allCols = array_merge($this->getCols(true), $existingCol);
        parent::_addIndex($columns, $allCols, $unique, $length);
    }

    /**
     * drop a column index
     * @param string|array $name
     */
    public function dropIndex($name)
    {
        if (is_array($name))
            $name = $this->name.'___'.implode('__', $name);
        elseif(!is_int(strpos($name,'___')))
            $name = $this->name.'___'.$name;
        $name = $this->db->quotekey($name);
        $table = $this->db->quotekey($this->name);
        $cmd = array(
            'pgsql|sqlite2?|ibm' =>
                "DROP INDEX $name;",
            'mssql|sybase|dblib|odbc|sqlsrv' =>
                "DROP INDEX $table.$name;",
            'mysql'=>
                "ALTER TABLE $table DROP INDEX $name;",
        );
        $query = $this->findQuery($cmd);
        $this->queries[] = $query;
    }

    /**
     * returns table indexes as assoc array
     * @return array
     */
    public function listIndex()
    {
        $table = $this->db->quotekey($this->name);
        $cmd = array(
            'sqlite2?' =>
                "PRAGMA index_list($table);",
            'mysql' =>
                "SHOW INDEX FROM $table;",
            'mssql|sybase|dblib|sqlsrv' =>
                "select * from sys.indexes ".
                "where object_id = (select object_id from sys.objects where name = '$this->name')",
            'pgsql' =>
                "select i.relname as name, ix.indisunique as unique ".
                "from pg_class t, pg_class i, pg_index ix ".
                "where t.oid = ix.indrelid and i.oid = ix.indexrelid ".
                "and t.relkind = 'r' and t.relname = '$this->name'".
                "group by t.relname, i.relname, ix.indisunique;",
        );
        $result = $this->db->exec($this->findQuery($cmd));
        $indexes = array();
        if (preg_match('/pgsql|sqlite2?/', $this->db->driver())) {
            foreach($result as $row)
                $indexes[$row['name']] = array('unique' => $row['unique']);
        } elseif (preg_match('/mssql|sybase|dblib|sqlsrv/', $this->db->driver())) {
            foreach ($result as $row)
                $indexes[$row['name']] = array('unique' => $row['is_unique']);
        } elseif (preg_match('/mysql/', $this->db->driver())) {
            foreach($result as $row)
                $indexes[$row['Key_name']] = array('unique' => !(bool)$row['Non_unique']);
        } else
            trigger_error(sprintf(self::TEXT_ENGINE_NOT_SUPPORTED, $this->db->driver()),E_USER_ERROR);
        return $indexes;
    }

    /**
     * rename this table
     * @param string $new_name
     * @param bool $exec
     * @return $this|bool
     */
    public function rename($new_name, $exec = true) {
        $query = $this->schema->renameTable($this->name, $new_name, $exec);
        $this->name = $new_name;
        return ($exec) ? $this : $query;
    }

    /**
     * drop this table
     * @param bool $exec
     * @return mixed
     */
    public function drop($exec = true) {
        return $this->schema->dropTable($this,$exec);
    }

}

/**
 * defines a table column configuration
 * Class Column
 * @package DB\SQL
 */
class Column {

    use DB_Utils;

    public      $name, $type, $nullable, $default, $after, $index, $unique, $passThrough, $pkey;
    protected   $table, $schema, $type_val;

    const
        TEXT_NoDataType = 'The specified datatype %s is not defined in %s driver. Add passThrough option to enforce this datatype.',
        TEXT_CurrentStampDataType = 'Current timestamp as column default is only possible for TIMESTAMP datatype';

    /**
     * @param string $name
     * @param TableBuilder $table
     */
    public function __construct($name, TableBuilder $table) {
        $this->name = $name;
        $this->nullable = true;
        $this->default = false;
        $this->after = false;
        $this->index = false;
        $this->unique = false;
        $this->passThrough = false;
        $this->pkey = false;

        $this->table = $table;
        $this->schema = $table->schema;
        $this->db = $this->schema->db;
    }

    /**
     * @param string $datatype
     * @param bool $force don't match datatype against DT array
     * @return $this
     */
    public function type($datatype, $force = FALSE) {
        $this->type = $datatype;
        $this->passThrough = $force;
        return $this;
    }

    public function type_tinyint() {
        $this->type = Schema::DT_INT1;
        return $this;
    }

    public function type_smallint() {
        $this->type = Schema::DT_INT2;
        return $this;
    }

    public function type_int() {
        $this->type = Schema::DT_INT4;
        return $this;
    }

    public function type_bigint() {
        $this->type = Schema::DT_INT8;
        return $this;
    }

    public function type_float() {
        $this->type = Schema::DT_FLOAT;
        return $this;
    }

    public function type_decimal() {
        $this->type = Schema::DT_DOUBLE;
        return $this;
    }

    public function type_text() {
        $this->type = Schema::DT_TEXT;
        return $this;
    }

    public function type_longtext() {
        $this->type = Schema::DT_LONGTEXT;
        return $this;
    }

    public function type_varchar($length = 255) {
        $this->type = "varchar($length)";
        $this->passThrough = true;
        return $this;
    }

    public function type_date() {
        $this->type = Schema::DT_DATE;
        return $this;
    }

    public function type_datetime() {
        $this->type = Schema::DT_DATETIME;
        return $this;
    }

    public function type_timestamp($asDefault=false) {
        $this->type = Schema::DT_TIMESTAMP;
        if ($asDefault)
            $this->default = Schema::DF_CURRENT_TIMESTAMP;
        return $this;
    }

    public function type_blob() {
        $this->type = Schema::DT_BLOB;
        return $this;
    }

    public function type_bool() {
        $this->type = Schema::DT_BOOLEAN;
        return $this;
    }

    public function passThrough($state = TRUE) {
        $this->passThrough = $state;
        return $this;
    }

    public function nullable($nullable) {
        $this->nullable = $nullable;
        return $this;
    }

    public function defaults($default) {
        $this->default = $default;
        return $this;
    }

    public function after($name) {
        $this->after = $name;
        return $this;
    }

    public function index($unique = FALSE) {
        $this->index = true;
        $this->unique = $unique;
        return $this;
    }

    /**
     * feed column from array or hive key
     * @param string|array $args
     */
    public function copyfrom($args) {
        if (($args || \Base::instance()->exists($args,$args))
            && is_array($args))
            foreach ($args as $arg => $val)
                $this->{$arg} = $val;
    }

    /**
     * returns an array of this column configuration
     * @return array
     */
    public function getColumnArray() {
        $fields = array('name','type','passThrough','default','nullable',
            'index','unique','after','pkey');
        $fields = array_flip($fields);
        foreach($fields as $key => &$val)
            $val = $this->{$key};
        unset($val);
        return $fields;
    }

    /**
     * return resolved column datatype
     * @return bool|string
     */
    public function getTypeVal() {
        if (!$this->type)
            trigger_error(sprintf('Cannot build a column query for `%s`: no column type set',$this->name),E_USER_ERROR);
        if ($this->passThrough)
            $this->type_val = $this->type;
        else {
            $this->type_val = $this->findQuery($this->schema->dataTypes[strtoupper($this->type)]);
            if (!$this->type_val) {
                if (Schema::$strict) {
                    trigger_error(sprintf(self::TEXT_NoDataType, strtoupper($this->type),
                        $this->db->driver()),E_USER_ERROR);
                    return FALSE;
                } else {
                    // auto pass-through if not found
                    $this->type_val = $this->type;
                }
            }
        }
        return $this->type_val;
    }

    /**
     * generate SQL column definition query
     * @return bool|string
     */
    public function getColumnQuery() {
        // prepare column types
        $type_val = $this->getTypeVal();
        // build query
        $query = $this->db->quotekey($this->name).' '.$type_val.' '.
            $this->getNullable();
        // unify default for booleans
        if (preg_match('/bool/i', $type_val) && $this->default!==null)
            $this->default = (int) $this->default;
        // default value
        if ($this->default !== false) {
            $def_cmds = array(
                'sqlite2?|mysql|pgsql' => 'DEFAULT',
                'mssql|sybase|dblib|odbc|sqlsrv' => 'constraint DF_'.$this->table->name.'_'.$this->name.' DEFAULT',
                'ibm' => 'WITH DEFAULT',
            );
            $def_cmd = $this->findQuery($def_cmds).' '.$this->getDefault();
            $query .= ' '.$def_cmd;
        }
        if (!empty($this->after) && $this->table instanceof TableModifier) {
            // `after` feature only works for mysql
            if (preg_match('/mysql/', $this->db->driver())) {
                $after_cmd = 'AFTER '.$this->db->quotekey($this->after);
                $query .= ' '.$after_cmd;
            }
        }
        return $query;
    }

    /**
     * return query part for nullable
     * @return string
     */
    public function getNullable() {
        return $this->nullable ? 'NULL' : 'NOT NULL';
    }

    /**
     * return query part for default value
     * @return string
     */
    public function getDefault() {
        // timestamp default
        if ($this->default === Schema::DF_CURRENT_TIMESTAMP) {
            // check for right datatpye
            $stamp_type = $this->findQuery($this->schema->dataTypes['TIMESTAMP']);
            if ($this->type != 'TIMESTAMP' &&
                ($this->passThrough && strtoupper($this->type) != strtoupper($stamp_type))
            )
                trigger_error(self::TEXT_CurrentStampDataType,E_USER_ERROR);
            return $this->findQuery($this->schema->defaultTypes[strtoupper($this->default)]);
        } else {
            // static defaults
            $type_val = $this->getTypeVal();
            $pdo_type = preg_match('/int|bool/i', $type_val, $parts) ?
                constant('\PDO::PARAM_'.strtoupper($parts[0])) : \PDO::PARAM_STR;
            return ($this->default === NULL ? 'NULL' :
                $this->db->quote(htmlspecialchars($this->default, ENT_QUOTES,
                    \Base::instance()->get('ENCODING')), $pdo_type));
        }
    }
}


trait DB_Utils {

    /** @var \DB\SQL */
    public $db;

    /**
     * parse command array and return backend specific query
     * @param $cmd
     * @param $cmd array
     * @return bool|string
     */
    public function findQuery($cmd) {
        foreach ($cmd as $backend => $val)
            if (preg_match('/'.$backend.'/', $this->db->driver()))
                return $val;
        trigger_error(sprintf('DB Engine `%s` is not supported for this action.', $this->db->driver()),E_USER_ERROR);
    }
}