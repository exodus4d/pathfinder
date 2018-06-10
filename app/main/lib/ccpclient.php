<?php
/**
 * Created by PhpStorm.
 * User: Exodus4D
 * Date: 26.03.2017
 * Time: 19:17
 */

namespace lib;

use controller\LogController;
use \Exodus4D\ESI\ESI as ApiClient;

class CcpClient extends \Prefab {

    private $apiClient;

    public function __construct(\Base $f3){
        $this->apiClient = $this->getClient($f3);
        $f3->set('ccpClient', $this);
    }

    /**
     * get ApiClient instance
     * @param \Base $f3
     * @return ApiClient|null
     * @throws \Exception\PathfinderException
     */
    protected function getClient(\Base $f3){
        $client = null;

        if(class_exists(ApiClient::class)){
            $client = new ApiClient();
            $client->setUrl( Config::getEnvironmentData('CCP_ESI_URL') );
            $client->setDatasource( Config::getEnvironmentData('CCP_ESI_DATASOURCE') );
            $client->setUserAgent($this->getUserAgent());
            $client->setDebugLevel($f3->get('DEBUG'));
            //$client->setDebugLogRequests(true);
        }else{
            LogController::getLogger('ERROR')->write(sprintf(Config::ERROR_CLASS_NOT_EXISTS_COMPOSER, ApiClient::class));
        }

        return $client;
    }

    /**
     * @return string
     * @throws \Exception\PathfinderException
     */
    protected function getUserAgent(){
        $userAgent = '';
        $userAgent .= Config::getPathfinderData('name');
        $userAgent .=  ' - ' . Config::getPathfinderData('version');
        $userAgent .=  ' | ' . Config::getPathfinderData('contact');
        $userAgent .=  ' (' . $_SERVER['SERVER_NAME'] . ')';

        return $userAgent;
    }

    /**
     * get error msg for undefined method in ApiClient() class
     * @param $method
     * @return string
     */
    protected function getMissingMethodError($method){
        return "Method '" . $method . "()' not found in class '"  . get_class($this->apiClient) . "'. -> Check installed Composer package version.'";
    }

    /**
     * call request API data
     * @param $name
     * @param $arguments
     * @return array|mixed
     * @throws \Exception\PathfinderException
     */
    public function __call($name, $arguments){
        $return = [];

        if(is_object($this->apiClient)){
            if( method_exists($this->apiClient, $name) ){
                $return  = call_user_func_array([$this->apiClient, $name], $arguments);
            }else{
                LogController::getLogger('ERROR')->write($this->getMissingMethodError($name));
                \Base::instance()->error(501, $this->getMissingMethodError($name));
            }
        }else{
            LogController::getLogger('ERROR')->write(sprintf(Config::ERROR_CLASS_NOT_EXISTS_COMPOSER, ApiClient::class));
            \Base::instance()->error(501, sprintf(Config::ERROR_CLASS_NOT_EXISTS_COMPOSER, ApiClient::class));
        }

        return $return;
    }
}
