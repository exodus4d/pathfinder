<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 28.05.2016
 * Time: 16:05
 */

namespace lib;


class Config extends \Prefab {

    const PREFIX_KEY                                = 'PF';
    const ARRAY_DELIMITER                           = '-';
    const HIVE_KEY_PATHFINDER                       = 'PATHFINDER';
    const HIVE_KEY_ENVIRONMENT                      = 'ENVIRONMENT';

    /**
     * environment config keys that should be parsed as array
     * -> use "," as delimiter in config files/data
     */
    const ARRAY_KEYS                                = ['CCP_ESI_SCOPES'];

    /**
     * all environment data
     * @var array
     */
    private $serverConfigData                       = [];

    public function __construct(){
        // set server data
        // -> CGI params (Nginx)
        // -> .htaccess (Apache)
        $this->setServerData();
        // set environment data
        $this->setAllEnvironmentData();
        // set hive configuration variables
        // -> overwrites default configuration
        $this->setHiveVariables();
    }

    /**
     * get environment configuration data
     * @return array|null
     */
    protected function getAllEnvironmentData(){
        $f3 = \Base::instance();
        $environmentData = null;

        if( $f3->exists(self::HIVE_KEY_ENVIRONMENT) ){
            $environmentData = $f3->get(self::HIVE_KEY_ENVIRONMENT);
        }else{
            $environmentData =  $this->setAllEnvironmentData();
        }
        return $environmentData;
    }

    /**
     * set/overwrite some global framework variables original set in config.ini
     * -> can be  overwritten in environments.ini OR ENV-Vars
     * -> see: https://github.com/exodus4d/pathfinder/issues/175
     * that depend on environment settings
     */
    protected function setHiveVariables(){
        $f3 = \Base::instance();
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
     * @return array|null
     */
    protected function setAllEnvironmentData(){
        $environmentData = null;
        $f3 = \Base::instance();

        if( !empty($this->serverConfigData['ENV']) ){
            // get environment config from $_SERVER data
            $environmentData = (array)$this->serverConfigData['ENV'];

            // some environment variables should be parsed as array
            array_walk($environmentData, function(&$item, $key){
                $item = (in_array($key, self::ARRAY_KEYS)) ? explode(',', $item) : $item;
            });

            $environmentData['TYPE'] = 'PHP: environment variables';
        }else{
            // get environment data from *.ini file config
            $f3->config('app/environment.ini');

            if(
                $f3->exists(self::HIVE_KEY_ENVIRONMENT) &&
                ($environment = $f3->get(self::HIVE_KEY_ENVIRONMENT . '.SERVER')) &&
                ($environmentData = $f3->get(self::HIVE_KEY_ENVIRONMENT . '.' . $environment))
            ){
                $environmentData['TYPE'] = 'Config: environment.ini';
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
     *
     * @return array
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
     * get email for notifications by hive key
     * @param $key
     * @return bool|mixed
     */
    static function getNotificationMail($key){
        $f3 = \Base::instance();
        $hiveKey = self::HIVE_KEY_PATHFINDER . '.NOTIFICATION.' . $key;
        $mail = false;
        if( $f3->exists($hiveKey, $cachedMail) ){
            $mail = $cachedMail;
        }

        return $mail;
    }

    /**
     * get map default config values for map types (private/corp/ally)
     * -> read from pathfinder.ini
     * @param string $mapType
     * @return array
     */
    static function getMapsDefaultConfig($mapType = ''){
        $f3 = \Base::instance();
        $hiveKey = 'PATHFINDER.MAP';
        if( !empty($mapType) ){
            $hiveKey .= '.' . strtoupper($mapType);
        }
        return Util::arrayChangeKeyCaseRecursive( $f3->get($hiveKey) );
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


}