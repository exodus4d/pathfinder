<?php


namespace lib\db;


use DB\SQL\Schema;
use controller\LogController;
use Exception\ConfigException;

class Pool extends \Prefab {

    /**
     * @var string
     */
    const POOL_NAME                 = 'DB';

    /**
     * error for unsupported database scheme
     * @var string
     */
    const ERROR_SCHEME              = 'DB Scheme "%s" is not supported for DB alias "%s"';

    /**
     * @var SQL[]
     */
    private $connectionStore        = [];

    /**
     * @var [][]
     */
    private $errors                 = [];

    /**
     * if true, errors will not get logged
     * @var bool
     */
    private $silent                 = false;

    /**
     * callback function for database credentials that accepts an alias string
     * @var \Closure
     */
    protected $getConfig;

    /**
     * callback function for required database variables
     * @var \Closure
     */
    protected $requiredVars;

    /**
     * Pool constructor.
     * @param \Closure $getConfig
     * @param \Closure $requiredVars
     */
    public function __construct(\Closure $getConfig, \Closure $requiredVars){
        $this->getConfig = $getConfig;
        $this->requiredVars = $requiredVars;
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
     * @return bool
     */
    public function isSilent() : bool {
        return $this->silent;
    }

    /**
     * connect to the DB server itself -> NO database is used
     * -> can be used to check if a certain DB exists without connecting to it directly
     * @param string $alias
     * @return SQL|null
     */
    public function connectToServer(string $alias) : ?SQL {
        $config = ($this->getConfig)($alias);
        $config['NAME'] = '';
        return $this->newDB($config);
    }

    /**
     * tries to create a database if not exists
     * -> DB user needs rights to create a DB
     * @param string $alias
     * @return SQL|null
     */
    public function createDB(string $alias) : ?SQL {
        $db = null;
        $config = ($this->getConfig)($alias);
        // remove database from $dsn (we want to crate it)
        $newDbName = $config['NAME'];
        if(!empty($newDbName)){
            $config['NAME'] = '';

            $db = $this->newDB($config);
            if(!is_null($db)){
                $schema = new Schema($db);
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
                        // prepare new created DB
                        $requiredVars = ($this->requiredVars)($db->driver());
                        $db->prepareDatabase($requiredVars['CHARACTER_SET_DATABASE'], $requiredVars['COLLATION_DATABASE']);
                    }
                }
            }
        }

        return $db;
    }

    /**
     * get active connection from store or init new connection
     * @param string $alias
     * @return SQL|null
     */
    public function getDB(string $alias) : ?SQL {
        if(!isset($this->connectionStore[$alias])){
            $db = $this->newDB(($this->getConfig)($alias));
            if(!is_null($db)){
                $this->connectionStore[$alias] = $db;
            }
            return $db;
        }else{
            return $this->connectionStore[$alias];
        }
    }

    /**
     * get last recent Exceptions from error history
     * @param string $alias
     * @param int $limit
     * @return \Exception[]
     */
    public function getErrors(string $alias, int $limit = 1) : array {
        return array_slice((array)$this->errors[$alias] , 0, $limit);
    }

    /**
     * build PDO DNS connect string from DB config array
     * -> Hint: dbName is not part of the DNS we need -> passed as extra parameter
     * @param array $config
     * @return string
     */
    protected function buildDnsFromConfig(array $config) : string {
        $dns = $config['SCHEME'] . ':';
        $dns .= $config['SOCKET'] ? 'unix_socket=' . $config['SOCKET'] : 'host=' . $config['HOST'];
        $dns .= $config['PORT'] && !$config['SOCKET'] ? ';port=' . $config['PORT'] : '';
        $dns .= $config['NAME'] ? ';dbname=' . $config['NAME'] : '';
        return $dns;
    }

    /**
     * @param array $config
     * @return SQL|null
     */
    protected function newDB(array $config) : ?SQL {
        $db = null;

        if($config['SCHEME'] == 'mysql'){
            try{
                $db = new SQL($this->buildDnsFromConfig($config), $config['USER'], $config['PASS'], $config['OPTIONS']);
            }catch(\PDOException $e){
                $this->pushError($config['ALIAS'], $e);

                if(!$this->isSilent()){
                    self::getLogger()->write($e);
                }
            }
        }else{
            // unsupported DB type
            $this->pushError($config['ALIAS'], new ConfigException(
                sprintf(self::ERROR_SCHEME, $config['SCHEME'], $config['ALIAS']))
            );
        }

        return $db;
    }

    /**
     * push new Exception into static error history
     * @param string $alias
     * @param \Exception $e
     */
    protected function pushError(string $alias, \Exception $e){
        if(!is_array($this->errors[$alias])){
            $this->errors[$alias] = [];
        }

        // prevent adding same errors twice
        if(!empty($this->errors[$alias])){
            /**
             * @var $lastError \Exception
             */
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
     * @return \Log
     */
    static function getLogger() : \Log {
        return LogController::getLogger('ERROR');
    }
}