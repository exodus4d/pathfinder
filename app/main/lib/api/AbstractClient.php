<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 26.12.2018
 * Time: 17:41
 */

namespace lib\api;

use Cache\Adapter\Filesystem\FilesystemCachePool;
use Cache\Adapter\PHPArray\ArrayCachePool;
use Cache\Adapter\Redis\RedisCachePool;
use Cache\Namespaced\NamespacedCachePool;
use League\Flysystem\Adapter\Local;
use League\Flysystem\Filesystem;
use lib\Config;
use lib\Util;
use lib\logging;
use controller\LogController;
use Exodus4D\ESI\Client\ApiInterface;
use Psr\Cache\CacheItemPoolInterface;
use Psr\Http\Message\RequestInterface;

/**
 * Class AbstractClient
 * @package lib\api
 *
 * @method ApiInterface getUrl()
 * @method ApiInterface getTimeout()
 * @method ApiInterface getConnectTimeout()
 * @method ApiInterface getReadTimeout()
 * @method ApiInterface getProxy()
 * @method ApiInterface getVerify()
 * @method ApiInterface getDebugRequests()
 * @method ApiInterface getDataSource()
 */
abstract class AbstractClient extends \Prefab {

    /**
     * error msg for missing Composer package
     */
    const ERROR_CLIENT_INVALID = "HTTP API client not found → Check installed Composer packages";

    /**
     * @var string|null
     */
    const CLIENT_NAME = null;

    /**
     * @var string|null
     */
    protected $clientName = null;

    /**
     * @var ApiInterface|null
     */
    protected $client = null;

    /**
     * PSR-6 compatible CachePool instance
     * -> can be Redis, Filesystem or Array cachePool
     * -> used by e.g. GuzzleCacheMiddleware
     * @var CacheItemPoolInterface|null
     */
    protected $cachePool = null;

    /**
     * @param \Base $f3
     * @return ApiInterface|null
     */
    abstract protected function getClient(\Base $f3) : ?ApiInterface;

    /**
     * get userAgent
     * @return string
     */
    protected function getUserAgent() : string {
        $userAgent = '';
        $userAgent .= Config::getPathfinderData('name');
        $userAgent .=  ' - ' . Config::getPathfinderData('version');
        $userAgent .=  ' | ' . Config::getPathfinderData('contact');
        $userAgent .=  ' (' . $_SERVER['SERVER_NAME'] . ')';
        return $userAgent;
    }

    /**
     * returns a new Log object used within the Api for logging
     * @return \Closure
     */
    protected function newLog() : \Closure {
        return function(string $action, string $level = 'warning') : logging\LogInterface {
            $log = new logging\ApiLog($action, $level);
            $log->addHandler('stream', 'json', $this->getStreamConfig($action));
            return $log;
        };
    }

    /**
     * returns a new instance of PSR-6 compatible CacheItemPoolInterface
     * -> this Cache backend will be used across Guzzle Middleware
     *    e.g. GuzzleCacheMiddleware
     * @see http://www.php-cache.com
     * @param \Base $f3
     * @return \Closure
     */
    protected function getCachePool(\Base $f3) : \Closure {
        // determine cachePool options
        $poolConfig = $this->getCachePoolConfig($f3);

        return function() use ($poolConfig) : ?CacheItemPoolInterface {
            // an active CachePool should be re-used
            // -> no need for e.g. a new Redis->pconnect()
            //    and/or re-init when it is used the next time
            if(!is_null($this->cachePool)){
                return $this->cachePool;
            }

            // Redis is preferred option (best performance) -----------------------------------------------------------
            if(
                $poolConfig['type'] == 'redis' &&
                extension_loaded('redis') &&
                class_exists('\Redis') &&
                class_exists(RedisCachePool::class)
            ){
                $client = new \Redis();
                if(
                    $client->pconnect(
                        $poolConfig['host'],
                        $poolConfig['port'],
                        Config::REDIS_OPT_TIMEOUT,
                        null,
                        Config::REDIS_OPT_RETRY_INTERVAL,
                        Config::REDIS_OPT_READ_TIMEOUT
                    )
                ){

                    if(isset($poolConfig['tag'])){
                        $name = 'pathfinder|php|tag:' . strtolower($poolConfig['tag']) . '|pid:' . getmypid();
                        $client->client('setname', $name);
                    }

                    if(isset($poolConfig['db'])){
                        $client->select($poolConfig['db']);
                    }
                    $poolRedis = new RedisCachePool($client);

                    // RedisCachePool supports "Hierarchy" store slots
                    // -> "Hierarchy" support is required to use it in a NamespacedCachePool
                    //    This helps to separate keys by a namespace
                    // @see http://www.php-cache.com/en/latest/
                    $this->cachePool = new NamespacedCachePool($poolRedis, static::CLIENT_NAME);

                    register_shutdown_function([$this,'unloadCache'], $client);
                }
            }

            // Filesystem is second option and fallback for failed Redis pool -----------------------------------------
            if(
                is_null($this->cachePool) &&
                in_array($poolConfig['type'], ['redis', 'folder']) &&
                class_exists(FilesystemCachePool::class)
            ){
                $filesystemAdapter  = new Local(\Base::instance()->get('ROOT'));
                $filesystem         = new Filesystem($filesystemAdapter);
                $poolFilesystem     = new FilesystemCachePool($filesystem, $poolConfig['folder']);

                $this->cachePool = $poolFilesystem;
            }

            // Array cache pool fallback (not persistent) -------------------------------------------------------------
            if(
                is_null($this->cachePool) &&
                in_array($poolConfig['type'], ['redis', 'folder', 'array']) &&
                class_exists(ArrayCachePool::class)
            ){
                $this->cachePool = new ArrayCachePool(2000);
            }

            return $this->cachePool;
        };
    }

    /**
     * get cachePool config from [D]ata [S]ource [N]ame string
     * @param \Base $f3
     * @return array
     */
    protected function getCachePoolConfig(\Base $f3) : array {
        $tag = 'API_CACHE';
        $dsn = (string)$f3->get($tag);

        // fallback
        $conf = ['type' => 'array'];

        if(!empty($folder = (string)$f3->get('TEMP'))){
            // filesystem (better than 'array' cache)
            $conf = [
                'type' => 'folder',
                'folder' => $folder . 'cache/'
            ];
        }

        // redis or filesystem -> overwrites $conf
        Config::parseDSN($dsn, $conf);

        // tag name is used as alias name e.g. for debugging
        // -> e.g. for Redis https://redis.io/commands/client-setname
        $conf['tag'] = $tag;

        return $conf;
    }

    /**
     * return callback function that expects a $request and checks
     * whether it should be logged (in case of errors)
     * @param \Base $f3
     * @return \Closure
     */
    protected function isLoggable(\Base $f3) : \Closure {
        return function(RequestInterface $request) use ($f3) : bool {
            // we need the timestamp for $request that should be checked
            // -> we assume $request was "recently" send. -> current server time is used for check
            $requestTime = $f3->get('getDateTime')();
            // ... "interpolate" time to short interval
            // -> this might help to re-use sequential calls of this method
            Util::roundToInterval($requestTime);
            // check if request was send within ESI downTime range
            // -> errors during downTime should not be logged
            $inDowntimeRange = Config::inDownTimeRange($requestTime);

            return !$inDowntimeRange;
        };
    }

    /**
     * get Logger
     * @param string $ype
     * @return \Log
     */
    protected function getLogger(string $ype = 'ERROR') : \Log {
        return LogController::getLogger($ype);
    }
    /**
     * get error msg for missing $this->client class
     * @param string $class
     * @return string
     */
    protected function getMissingClassError(string $class) : string {
        return sprintf(Config::ERROR_CLASS_NOT_EXISTS_COMPOSER, $class);
    }

    /**
     * get error msg for undefined method in $this->client class
     * @param string $class
     * @param string $method
     * @return string
     */
    protected function getMissingMethodError(string $class, string $method) : string {
        return sprintf(Config::ERROR_METHOD_NOT_EXISTS_COMPOSER, $method, $class);
    }

    /**
     * get config for stream logging
     * @param string $logFileName
     * @param bool $abs
     * @return \stdClass
     */
    protected function getStreamConfig(string $logFileName, bool $abs = false) : \stdClass {
        $f3 = \Base::instance();

        $config = (object) [];
        $config->stream = '';
        if( $f3->exists('LOGS', $dir) ){
            $config->stream .= $abs ? $f3->get('ROOT') . '/' : './';
            $config->stream .= $dir . $logFileName . '.log';
            $config->stream = $f3->fixslashes($config->stream);
        }
        return $config;
    }

    /**
     * unload function
     * @param \Redis $client
     */
    public function unloadCache(\Redis $client){
        if($client->isConnected()){
            $client->close();
        }
    }

    /**
     * call request API data
     * @param string $name
     * @param array $arguments
     * @return array|mixed
     */
    public function __call(string $name, array $arguments = []){
        $return = [];
        if(is_object($this->client)){
            if( method_exists($this->client, $name) ){
                $return  = call_user_func_array([$this->client, $name], $arguments);
            }else{
                $errorMsg = $this->getMissingMethodError(get_class($this->client), $name);
                $this->getLogger('ERROR')->write($errorMsg);
                \Base::instance()->error(501, $errorMsg);
            }
        }else{
            \Base::instance()->error(501, self::ERROR_CLIENT_INVALID);
        }

        return $return;
    }

    /**
     * init web client on __invoke()
     * -> no need to init client on __construct()
     *    maybe it is never used...
     * @return AbstractClient
     */
    function __invoke() : self {
        $f3 = \Base::instance();

        if(
            !($this->client instanceof ApiInterface) &&
            ($this->getClient($f3) instanceof ApiInterface)
        ){
            // web client not initialized
            $client = $this->getClient($f3);
            $client->setTimeout(5);
            $client->setConnectTimeout(5);
            $client->setUserAgent($this->getUserAgent());
            $client->setDecodeContent('gzip, deflate');

            $client->setDebugLevel($f3->get('DEBUG'));
            $client->setNewLog($this->newLog());
            $client->setIsLoggable($this->isLoggable($f3));

            $client->setLogStats(true);                    // add cURL stats (e.g. transferTime) to logged requests
            $client->setLogCache(true);                   // add cache info (e.g. from cached) to logged requests
            //$client->setLogAllStatus(true);                     // log all requests regardless of response HTTP status code
            $client->setLogFile('esi_requests');//

            $client->setRetryLogFile('esi_retry_requests');

            $client->setCacheDebug(true);
            $client->setCachePool($this->getCachePool($f3));

            // use local proxy server for debugging requests
            //$client->setProxy('127.0.0.1:8888');

            // disable SSL certificate verification -> allow proxy to decode(view) request
            //$client->setVerify(false);

            //$client->setDebugRequests(true);

            $this->client = $client;
        }

        return $this;
    }
}