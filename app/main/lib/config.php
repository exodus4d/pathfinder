<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 28.05.2016
 * Time: 16:05
 */

namespace lib;


use Exception;

class Config extends \Prefab {

    const PREFIX_KEY                                = 'PF';
    const ARRAY_DELIMITER                           = '-';
    const HIVE_KEY_PATHFINDER                       = 'PATHFINDER';
    const HIVE_KEY_ENVIRONMENT                      = 'ENVIRONMENT';

    const ERROR_CONF_PATHFINDER                     = 'Config value missing in pathfinder.ini file [%s]';


    /**
     * environment config keys that should be parsed as array
     * -> use "," as delimiter in config files/data
     */
    const ARRAY_KEYS                                = ['CCP_ESI_SCOPES', 'CCP_ESI_SCOPES_ADMIN'];

    /**
     * all environment data
     * @var array
     */
    private $serverConfigData                       = [];

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
            if( strpos($key, self::PREFIX_KEY . self::ARRAY_DELIMITER) === 0 ){
                $path = explode( self::ARRAY_DELIMITER, $key);
                // remove prefix
                array_shift($path);

                $tmp = &$data;
                foreach ($path as $segment) {
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
     * @param string $dbKey
     * @return array
     */
    static function getDatabaseConfig($dbKey  = 'PF'){
        $dbConfKey = ($dbKey === 'PF') ? '' : $dbKey . '_';
        return [
            'DNS'   => self::getEnvironmentData('DB_' . $dbConfKey . 'DNS'),
            'NAME'   => self::getEnvironmentData('DB_' . $dbConfKey . 'NAME'),
            'USER'   => self::getEnvironmentData('DB_' . $dbConfKey . 'USER'),
            'PASS'   => self::getEnvironmentData('DB_' . $dbConfKey . 'PASS')
        ];
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
     * @return array
     */
    static function getMapsDefaultConfig($mapType = ''){
        if( $mapConfig = self::getPathfinderData('map' . ($mapType ? '.' . $mapType : '')) ){
            $mapConfig = Util::arrayChangeKeyCaseRecursive( $mapConfig );
        }

        return $mapConfig;
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
     * get PATHFINDER config data
     * @param string $key
     * @return mixed
     * @throws Exception\PathfinderException
     */
    static function getPathfinderData($key = ''){
        $hiveKey = self::HIVE_KEY_PATHFINDER . ($key ? '.' . strtoupper($key) : '');

        if( !\Base::instance()->exists($hiveKey, $data) ){
            throw new Exception\PathfinderException(sprintf(self::ERROR_CONF_PATHFINDER, $hiveKey));
        }

        return $data;
    }

}