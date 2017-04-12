<?php
/**
 * Created by PhpStorm.
 * User: Exodus4D
 * Date: 26.03.2017
 * Time: 19:17
 */

namespace Lib;

use \Exodus4D\ESI\ESI;

class CcpClient extends \Prefab {

    private $apiClient;

    public function __construct(){
        $f3 = \Base::instance();

        $this->apiClient =  new ESI($f3);
        $this->apiClient->setEsiUrl( Config::getEnvironmentData('CCP_ESI_URL') );
        $this->apiClient->setEsiDatasource( Config::getEnvironmentData('CCP_ESI_DATASOURCE') );
        $this->apiClient->setUserAgent($this->getUserAgent($f3));

        $f3->set('ccpClient', $this);
    }

    /**
     * @param  \Base $f3
     * @return string
     */
    protected function getUserAgent($f3){
        $userAgent = '';
        $userAgent .= $f3->get('PATHFINDER.NAME');
        $userAgent .=  ' - ' . $f3->get('PATHFINDER.VERSION');
        $userAgent .=  ' | ' . $f3->get('PATHFINDER.CONTACT');
        $userAgent .=  ' (' . $_SERVER['SERVER_NAME'] . ')';

        return $userAgent;
    }

    public function __call($name, $arguments){
        return call_user_func_array([$this->apiClient, $name], $arguments);
    }
}