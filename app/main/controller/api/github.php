<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.01.16
 * Time: 03:34
 */

namespace Controller\Api;
use Model;
use Controller;


/**
* Github controller
* Class Route
* @package Controller\Api
*/
class GitHub extends Controller\Controller {

    /**
     * get HTTP request options for API (curl) request
     * @return array
     */
    protected function getRequestOptions(){
        $requestOptions = [
            'timeout' => 8,
            'method' => 'GET',
            'user_agent' => $this->getUserAgent(),
            'follow_location' => false // otherwise CURLOPT_FOLLOWLOCATION will fail
        ];

        return $requestOptions;
    }

    /**
     * get release information from  GitHub
     * @param $f3
     */
    public function releases($f3){
        $cacheKey = 'CACHE_GITHUB_RELEASES';
        $ttl = 60 * 30; // 30min
        $releaseCount = 3;

        if( !$f3->exists($cacheKey) ){
            $apiPath = $this->getF3()->get('PATHFINDER.API.GIT_HUB') . '/repos/exodus4d/pathfinder/releases';

            // build request URL
            $options = $this->getRequestOptions();
            $apiResponse = \Web::instance()->request($apiPath, $options );

            if($apiResponse['body']){
                // request succeeded -> format "Markdown" to "HTML"
                // result is JSON formed
                $releasesData = (array)json_decode($apiResponse['body']);

                // check max release count
                if(count($releasesData) > $releaseCount){
                    $releasesData = array_slice($releasesData, 0, $releaseCount);
                }

                $md = \Markdown::instance();
                foreach($releasesData as &$releaseData){
                    if(isset($releaseData->body)){

                        // convert list style
                        $body = str_replace(' - ', '* ', $releaseData->body );

                        $releaseData->body = $md->convert( $body );
                    }
                }
                $f3->set($cacheKey, $releasesData, $ttl);
            }else{
                // request failed -> cache failed result (respect API request limit)
                $f3->set($cacheKey, false, 60 * 5);
            }
        }

        // set 503 if service unavailable or temp cached data = false
        if( !$f3->get($cacheKey) ){
            $f3->status(503);
        }

        echo json_encode($f3->get($cacheKey));
    }
}