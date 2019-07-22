<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 28.05.2016
 * Time: 16:05
 */

namespace lib;


use lib\db\Pool;
use lib\api\CcpClient;
use lib\api\GitHubClient;
use lib\api\SsoClient;
use lib\socket\AbstractSocket;
use lib\socket\SocketInterface;
use lib\socket\TcpSocket;

class Config extends \Prefab {

    /**
     * prefix for custom Pathfinder env vars
     */
    const PREFIX_KEY                                = 'PF';

    /**
     * delimiter for custom Pathfinder env vars
     */
    const ARRAY_DELIMITER                           = '-';

    /**
     * Hive key for all Pathfinder config vars (*.ini files)
     */
    const HIVE_KEY_PATHFINDER                       = 'PATHFINDER';

    /**
     * Hive key for all environment config vars (*.ini files)
     */
    const HIVE_KEY_ENVIRONMENT                      = 'ENVIRONMENT';

    /**
     * Hive key for Socket validation check
     */
    const CACHE_KEY_SOCKET_VALID                    = 'CACHED_SOCKET_VALID';

    /**
     * Cache time for Socket validation check
     */
    const CACHE_TTL_SOCKET_VALID                    = 60;

    // ================================================================================================================
    // Redis
    // ================================================================================================================

    /**
     * Redis connect timeout (seconds)
     */
    const REDIS_OPT_TIMEOUT                         = 2;

    /**
     * Redis read timeout (seconds)
     */
    const REDIS_OPT_READ_TIMEOUT                    = 10;

    /**
     * redis retry interval (milliseconds)
     */
    const REDIS_OPT_RETRY_INTERVAL                  = 200;

    // ================================================================================================================
    // EVE downtime
    // ================================================================================================================

    /**
     * SSO downtime length (estimation), minutes
     */
    const DOWNTIME_LENGTH                           = 8;

    /**
     * SSO downtime buffer length extends downtime length, minutes
     */
    const DOWNTIME_BUFFER                           = 1;

    /**
     * error message for missing Composer dependency class
     */
    const ERROR_CLASS_NOT_EXISTS_COMPOSER           = 'Class "%s" not found. → Check installed Composer packages';

    /**
     * error message for missing Composer dependency method
     */
    const ERROR_METHOD_NOT_EXISTS_COMPOSER          = 'Method "%s()" not found in class "%s". → Check installed Composer packages';


    /**
     * environment config keys that should be parsed as array
     * -> use "," as delimiter in config files/data
     */
    const ARRAY_KEYS                                = ['CCP_ESI_SCOPES', 'CCP_ESI_SCOPES_ADMIN'];

    /**
     * custom HTTP status codes
     */
    const
        HTTP_422='Unprocessable Entity';

    /**
     * all environment data
     * @var array
     */
    private $serverConfigData                       = [];

    /**
     * Config constructor.
     * @param \Base $f3
     */
    public function __construct(\Base $f3){
        // set server data
        // -> CGI params (Nginx)
        // -> .htaccess (Apache)
        $this->setServerData();
        // set environment data
        $this->setAllEnvironmentData($f3);
        // set hive configuration variables
        // -> overwrites default configuration
        $this->setHiveVariables($f3);

        // set global getter for \DateTimeZone
        $f3->set('getTimeZone', function() use ($f3) : \DateTimeZone {
            return new \DateTimeZone( $f3->get('TZ') );
        });

        // set global getter for new \DateTime
        $f3->set('getDateTime', function(string $time = 'now', ?\DateTimeZone $timeZone = null) use ($f3) : \DateTime {
            $timeZone = $timeZone ? : $f3->get('getTimeZone')();
           return new \DateTime($time, $timeZone);
        });

        // database connection pool -----------------------------------------------------------------------------------
        $f3->set(Pool::POOL_NAME, Pool::instance(
            function(string $alias) use ($f3) : array {
                // get DB config by alias for new connections
                return self::getDatabaseConfig($f3, $alias);
            },
            function(string $schema) use ($f3) : array {
                // get DB requirement vars from requirements.ini
                return self::getRequiredDbVars($f3, $schema);
            }
        ));

        // lazy init Web Api clients ----------------------------------------------------------------------------------
        $f3->set(SsoClient::CLIENT_NAME, SsoClient::instance());
        $f3->set(CcpClient::CLIENT_NAME, CcpClient::instance());
        $f3->set(GitHubClient::CLIENT_NAME, GitHubClient::instance());

        // Socket connectors ------------------------------------------------------------------------------------------
        $f3->set(TcpSocket::SOCKET_NAME, function(array $options = ['timeout' => 1]) : SocketInterface {
            return AbstractSocket::factory(TcpSocket::class, self::getSocketUri(), $options);
        });
    }

    /**
     * get environment configuration data
     * @param \Base $f3
     * @return array|null
     */
    protected function getAllEnvironmentData(\Base $f3){
        if( !$f3->exists(self::HIVE_KEY_ENVIRONMENT, $environmentData) ){
            $environmentData =  $this->setAllEnvironmentData($f3);
        }

        return $environmentData;
    }

    /**
     * set/overwrite some global framework variables original set in config.ini
     * -> can be  overwritten in environments.ini OR ENV-Vars
     * -> see: https://github.com/exodus4d/pathfinder/issues/175
     * that depend on environment settings
     * @param \Base $f3
     */
    protected function setHiveVariables(\Base $f3){
        // hive keys that can be overwritten
        $hiveKeys = ['BASE', 'URL', 'DEBUG', 'CACHE'];

        foreach($hiveKeys as $key){
            if( !is_null( $var = self::getEnvironmentData($key)) ){
                $f3->set($key,$var);
            }
        }
    }

    /**
     * set all environment configuration data
     * @param \Base $f3
     * @return array|mixed|null
     */
    protected function setAllEnvironmentData(\Base $f3){
        $environmentData = null;

        if( !empty($this->serverConfigData['ENV']) ){
            // get environment config from $_SERVER data
            $environmentData = (array)$this->serverConfigData['ENV'];

            // some environment variables should be parsed as array
            array_walk($environmentData, function(&$item, $key){
                $item = (in_array($key, self::ARRAY_KEYS)) ? explode(',', $item) : $item;
            });

            $environmentData['ENVIRONMENT_CONFIG'] = 'PHP: environment variables';
        }else{
            // get environment data from *.ini file config
            $customConfDir = $f3->get('CONF');

            // check "custom" ini dir, of not found check default ini dir
            foreach($customConfDir as $type => $path){
                $envConfFile = $path . 'environment.ini';
                $f3->config($envConfFile, true);

                if(
                    $f3->exists(self::HIVE_KEY_ENVIRONMENT) &&
                    ($environment = $f3->get(self::HIVE_KEY_ENVIRONMENT . '.SERVER')) &&
                    ($environmentData = $f3->get(self::HIVE_KEY_ENVIRONMENT . '.' . $environment))
                ){
                    $environmentData['ENVIRONMENT_CONFIG'] = 'Config: ' . $envConfFile;
                    break;
                }
            }
        }

        if( !is_null($environmentData) ){
            ksort($environmentData);
            $f3->set(self::HIVE_KEY_ENVIRONMENT, $environmentData);
        }

        return $environmentData;
    }

    /**
     * get/extract all server data passed to PHP
     * this can be done by either:
     * OS Environment variables:
     *  -> add to /etc/environment
     * OR:
     * Nginx (server config):
     * -> FastCGI syntax
     *      fastcgi_param PF-ENV-DEBUG 3;
     */
    protected function setServerData(){
        $data = [];
        foreach($_SERVER as $key => $value){
            if(strpos($key, self::PREFIX_KEY . self::ARRAY_DELIMITER) === 0){
                $path = explode( self::ARRAY_DELIMITER, $key);
                // remove prefix
                array_shift($path);

                $tmp = &$data;
                foreach($path as $segment){
                    $tmp[$segment] = (array)$tmp[$segment];
                    $tmp = &$tmp[$segment];
                }

                // type cast values
                // (e.g. '1.2' => (float); '4' => (int),...)
                $tmp = is_numeric($value) ? $value + 0 : $value;
            }
        }

        $this->serverConfigData = $data;
    }

    /**
     * get a environment variable by hive key
     * @param $key
     * @return string|null
     */
    static function getEnvironmentData($key){
        $hiveKey = self::HIVE_KEY_ENVIRONMENT . '.' . $key;
        \Base::instance()->exists($hiveKey, $data);
        return $data;
    }

    /**
     * get database config values
     * @param \Base $f3
     * @param string $alias
     * @return array
     */
    static function getDatabaseConfig(\Base $f3, string $alias) : array {
        $alias = strtoupper($alias);

        $config = [
            'ALIAS'     => $alias,
            'SCHEME'    => 'mysql',
            'HOST'      => 'localhost',
            'PORT'      => 3306,
            'SOCKET'    => null,
            'NAME'      => self::getEnvironmentData('DB_' . $alias . '_NAME'),
            'USER'      => self::getEnvironmentData('DB_' . $alias . '_USER'),
            'PASS'      => self::getEnvironmentData('DB_' . $alias . '_PASS')
        ];

        $pdoReg = '/^(?<SCHEME>[[:alpha:]]+):((host=(?<HOST>[a-zA-Z0-9-_\.]*))|(unix_socket=(?<SOCKET>[a-zA-Z0-9\/]*\.sock)))((;dbname=(?<NAME>\w*))|(;port=(?<PORT>\d*))){0,2}/';
        if(preg_match($pdoReg, self::getEnvironmentData('DB_' . $alias . '_DNS'), $matches)){
            // remove unnamed matches
            $matches = array_intersect_key($matches, $config);
            // remove empty matches
            $matches = array_filter($matches);
            // merge matches with default config
            $config = array_merge($config, $matches);
        }

        // connect options --------------------------------------------------------------------------------------------
        $options = [
            \PDO::ATTR_ERRMODE          => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_TIMEOUT          => $f3->get('REQUIREMENTS.MYSQL.PDO_TIMEOUT')
        ];

        if($config['SCHEME'] == 'mysql'){
            $options[\PDO::MYSQL_ATTR_COMPRESS]     = true;
            $options[\PDO::MYSQL_ATTR_INIT_COMMAND] = implode(',', [
                "SET NAMES " . strtolower(str_replace('-','', $f3->ENCODING)),
                "@@session.time_zone = '+00:00'",
                "@@session.default_storage_engine = " . self::getRequiredDbVars($f3, $config['SCHEME'])['DEFAULT_STORAGE_ENGINE']
            ]);
        }

        if(self::getPathfinderData('experiments.persistent_db_connections')){
            $options[\PDO::ATTR_PERSISTENT] = true;
        }

        $config['OPTIONS'] = $options;

        return $config;
    }

    /**
     * get required MySQL variables from requirements.ini
     * @param \Base $f3
     * @param string $schema
     * @return array
     */
    static function getRequiredDbVars(\Base $f3, string $schema) : array {
        return $f3->exists('REQUIREMENTS[' . strtoupper($schema) . '][VARS]', $vars) ? $vars : [];
    }

    /**
     * get SMTP config values
     * @return \stdClass
     */
    static function getSMTPConfig(): \stdClass{
        $config             = new \stdClass();
        $config->host       = self::getEnvironmentData('SMTP_HOST');
        $config->port       = self::getEnvironmentData('SMTP_PORT');
        $config->scheme     = self::getEnvironmentData('SMTP_SCHEME');
        $config->username   = self::getEnvironmentData('SMTP_USER');
        $config->password   = self::getEnvironmentData('SMTP_PASS');
        $config->from       = [
            self::getEnvironmentData('SMTP_FROM') => self::getPathfinderData('name')
        ];
        return $config;
    }

    /**
     * validates an SMTP config
     * @param \stdClass $config
     * @return bool
     */
    static function isValidSMTPConfig(\stdClass $config): bool {
        // validate email from either an configured array or plain string
        $validateMailConfig = function($mailConf = null): bool {
            $email = null;
            if(is_array($mailConf)){
                reset($mailConf);
                $email = key($mailConf);
            }elseif(is_string($mailConf)){
                $email = $mailConf;
            }
            return \Audit::instance()->email($email);
        };

        return (
            !empty($config->host) &&
            !empty($config->username) &&
            $validateMailConfig($config->from) &&
            $validateMailConfig($config->to)
        );
    }

    /**
     * get email for notifications by hive key
     * @param $key
     * @return mixed
     */
    static function getNotificationMail($key){
        return self::getPathfinderData('notification' . ($key ? '.' . $key : ''));
    }

    /**
     * get map default config values for map types (private/corp/ally)
     * -> read from pathfinder.ini
     * @param string $mapType
     * @return mixed
     */
    static function getMapsDefaultConfig($mapType = ''){
        if( $mapConfig = self::getPathfinderData('map' . ($mapType ? '.' . $mapType : '')) ){
            $mapConfig = Util::arrayChangeKeyCaseRecursive($mapConfig);
        }

        return $mapConfig;
    }

    /**
     * get custom $message for a a HTTP $status
     * -> use this in addition to the very general Base::HTTP_XXX labels
     * @param int $status
     * @return string
     */
    static function getMessageFromHTTPStatus(int $status): string {
        switch($status){
            case 403:
                $message = 'Access denied: User not found'; break;
            default:
                $message = '';
        }
        return $message;
    }

    /**
     * use this function to "validate" the socket connection.
     * The result will be CACHED for a few seconds!
     * This function is intended to pre-check a Socket connection if it MIGHT exists.
     * No data will be send to the Socket, this function just validates if a socket is available
     * -> see pingDomain()
     * @param string $uri
     * @return bool
     */
    static function validSocketConnect(string $uri) : bool{
        $valid = false;
        $f3 = \Base::instance();

        if( !$f3->exists(self::CACHE_KEY_SOCKET_VALID, $valid) ){
            if( $socketUrl = self::getSocketUri() ){
                // get socket URI parts -> not elegant...
                $domain = parse_url( $socketUrl, PHP_URL_SCHEME) . '://' . parse_url( $socketUrl, PHP_URL_HOST);
                $port = parse_url( $socketUrl, PHP_URL_PORT);
                // check connection -> get ms
                $status = self::pingDomain($domain, $port);
                if($status >= 0){
                    // connection OK
                    $valid = true;
                }else{
                    // connection error/timeout
                    $valid = false;
                }
            }else{
                // requirements check failed or URL not valid
                $valid = false;
            }

            $f3->set(self::CACHE_KEY_SOCKET_VALID, $valid, self::CACHE_TTL_SOCKET_VALID);
        }

        return $valid;
    }

    /**
     * get response time for a host in ms or -1 on error/timeout
     * @param string $domain
     * @param int $port
     * @param int $timeout
     * @return int
     */
    static function pingDomain(string $domain, int $port, $timeout = 1) : int {
        $startTime = microtime(true);
        $file      = @fsockopen ($domain, $port, $errno, $errstr, $timeout);
        $stopTime  = microtime(true);

        if (!$file){
            // Site is down
            $status = -1;
        }else {
            fclose($file);
            $status = ($stopTime - $startTime) * 1000;
            $status = floor($status);
        }
        return $status;
    }

    /**
     * get URI for TCP socket
     * @return bool|string
     */
    static function getSocketUri(){
        $uri = false;

        if(
            ( $ip = self::getEnvironmentData('SOCKET_HOST') ) &&
            ( $port = self::getEnvironmentData('SOCKET_PORT') )
        ){
            $uri = 'tcp://' . $ip . ':' . $port;
        }
        return $uri;
    }

    /**
     * @param string $key
     * @return null|mixed
     */
    static function getPathfinderData($key = ''){
        $hiveKey = self::HIVE_KEY_PATHFINDER . ($key ? '.' . strtoupper($key) : '');
        if( !\Base::instance()->exists($hiveKey, $data) ){
            $data = null;
        }
        return $data;
    }

    /**
     * get HTTP status message by HTTP return code
     * -> either from F3 or from self::Config constants
     * @param int $code
     * @return string
     */
    static function getHttpStatusByCode(int $code) : string {
        if(empty($status = @constant('Base::HTTP_' .  $code))){
            $status = @constant('self::HTTP_' .  $code);
        }
        return $status;
    }

    /**
     * parse [D]ata [S]ource [N]ame string from *.ini into $conf parts
     * -> $dsn = redis=localhost:6379:2
     *    $conf = ['type' => 'redis', 'host' => 'localhost', 'port' => 6379, 'db' => 2]
     * -> some $conf values might be NULL if not found in $dsn!
     * -> some missing values become defaults
     * @param string $dsn
     * @param array|null $conf
     * @return bool
     */
    static function parseDSN(string $dsn, ?array &$conf = []) : bool {
        // reset reference
        if($matches = (bool)preg_match('/^(\w+)\h*=\h*(.+)/', strtolower(trim($dsn)), $parts)){
            $conf['type'] = $parts[1];
            if($conf['type'] == 'redis'){
                list($conf['host'], $conf['port'], $conf['db']) = explode(':', $parts[2]) + [1 => 6379, 2 => null];
            }elseif($conf['type'] == 'folder'){
                $conf['folder'] = $parts[2];
            }
            // int cast numeric values
            $conf = array_map(function($val){
                return is_numeric($val) ? intval($val) : $val;
            }, $conf);
        }
        return $matches;
    }

    /**
     * check if a given DateTime() is within downTime range: downtime + 10m
     * -> can be used for prevent logging errors during downTime
     * @param \DateTime|null $dateCheck
     * @return bool
     */
    static function inDownTimeRange(\DateTime $dateCheck = null) : bool {
        $inRange = false;
        // default daily downtime 00:00am
        $downTimeParts = [0, 0];
        if( !empty($downTime = (string)self::getEnvironmentData('CCP_SSO_DOWNTIME')) ){
            $parts = array_map('intval', explode(':', $downTime));
            if(count($parts) === 2){
                // well formatted DOWNTIME found in config files
                $downTimeParts = $parts;
            }
        }

        try{
            // downTime Range is 10m
            $downtimeLength = self::DOWNTIME_LENGTH + (2 * self::DOWNTIME_BUFFER);
            $timezone = \Base::instance()->get('getTimeZone')();

            // if not set -> use current time
            $dateCheck = is_null($dateCheck) ? new \DateTime('now', $timezone) : $dateCheck;
            $dateDowntimeStart = new \DateTime('now', $timezone);
            $dateDowntimeStart->setTime($downTimeParts[0],$downTimeParts[1]);
            $dateDowntimeStart->sub(new \DateInterval('PT' . self::DOWNTIME_BUFFER . 'M'));

            $dateDowntimeEnd = clone $dateDowntimeStart;
            $dateDowntimeEnd->add(new \DateInterval('PT' . $downtimeLength . 'M'));

            $dateRange = new DateRange($dateDowntimeStart, $dateDowntimeEnd);
            $inRange = $dateRange->inRange($dateCheck);
        }catch(\Exception $e){
            $f3 = \Base::instance();
            $f3->error(500, $e->getMessage(), $e->getTrace());
        }

        return $inRange;
    }

    /**
     * format timeInterval in seconds into human readable string
     * @param int $seconds
     * @return string
     * @throws \Exception
     */
    static function formatTimeInterval(int $seconds = 0) : string {
        $dtF = new \DateTime('@0');
        $dtT = new \DateTime("@" . $seconds);
        $diff = $dtF->diff($dtT);

        $format = ($d = $diff->format('%d')) ? $d . 'd ' : '';
        $format .= ($h = $diff->format('%h')) ? $h . 'h ' : '';
        $format .= ($i = $diff->format('%i')) ? $i . 'm ' : '';
        $format .= ($s = $diff->format('%s')) ? $s . 's' : '';
        return $format;
    }

}