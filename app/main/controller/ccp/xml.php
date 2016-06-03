<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 23.05.2016
 * Time: 18:25
 */

namespace controller\ccp;
use Data\Mapper as Mapper;
use Controller;
use Lib;


class Xml extends Controller\Controller{

    /**
     * get HTTP request options for API (curl) request
     * @return array
     */
    protected function getRequestOptions(){
        $requestOptions = [
            'timeout' => 4,
            'user_agent' => $this->getUserAgent(),
            'follow_location' => false // otherwise CURLOPT_FOLLOWLOCATION will fail
        ];

        return $requestOptions;
    }

    /**
     * request character data from CCP API
     * @param int $characterId
     * @return array
     */
    public function getPublicCharacterData($characterId){
        $characterData = [];
        $apiPath = self::getEnvironmentData('CCP_XML') . '/eve/CharacterInfo.xml.aspx';

        $baseOptions = $this->getRequestOptions();
        $requestOptions = [
            'method' => 'GET',
            'content' => [
                'characterID' => (int)$characterId
            ]

        ];

        $requestOptions = array_merge($baseOptions, $requestOptions);
        $apiResponse = Lib\Web::instance()->request($apiPath, $requestOptions );
        if(
            $apiResponse['body'] &&
            ($xml = simplexml_load_string($apiResponse['body']))
        ){

            if(
                isset($xml->result) &&
                is_object($rowApiData = $xml->result->children())
            ){
                foreach($rowApiData as $item){
                    // map attributes to array
                    if(count($item->children()) == 0){
                        $characterData[$item->getName()] = strval($item);
                    }
                }
            }
        }

        $data = (new Mapper\CcpCharacterMapper($characterData))->getData();

        return $data;
    }

}