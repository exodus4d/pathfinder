<?php
/**
 * Created by PhpStorm.
 * User: Exodus4D
 * Date: 26.03.2017
 * Time: 19:17
 */

namespace Lib;

use controller\LogController;
use \Exodus4D\ESI\ESI as ApiClient;

class CcpClient extends \Prefab {

    private $apiClient;

    public function __construct(){
        $f3 = \Base::instance();

        $this->apiClient = $this->getClient($f3);

        $f3->set('ccpClient', $this);
    }


    protected function getClient($f3){
        $client = null;

        if( !class_exists(ApiClient::class) ){
            LogController::getLogger('ERROR')->write($this->getMissingClientError());
        }else{
            $client = new ApiClient($f3);
            $client->setUrl( Config::getEnvironmentData('CCP_ESI_URL') );
            $client->setDatasource( Config::getEnvironmentData('CCP_ESI_DATASOURCE') );
            $client->setUserAgent($this->getUserAgent());
        }

        return $client;
    }

    /**
     * @return string
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
     * get error msg for failed ApiClient() class -> Composer package not found
     * @return string
     */
    protected function getMissingClientError(){
        return "Class '" . ApiClient::class . "' not found. -> Check installed Composer packages.'";
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
            LogController::getLogger('ERROR')->write($this->getMissingClientError());
            \Base::instance()->error(501, $this->getMissingClientError());
        }

        return $return;
    }
}
