<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.01.16
 * Time: 03:34
 */

namespace Controller\Api;
use lib\Config;
use Controller;


/**
* Github controller
* Class Route
* @package Controller\Api
*/
class GitHub extends Controller\Controller {

    protected function getBaseRequestOptions() : array {
        return [
            'timeout' => 3,
            'user_agent' => $this->getUserAgent(),
            'follow_location' => false // otherwise CURLOPT_FOLLOWLOCATION will fail
        ];
    }

    /**
     * get HTTP request options for API (curl) request
     * @return array
     * @throws \Exception\PathfinderException
     */
    protected function getRequestReleaseOptions() : array {
        $options = $this->getBaseRequestOptions();
        $options['method'] = 'GET';
        return $options;
    }

    /**
     * get HTTP request options for API (curl) request
     * @param string $text
     * @return array
     * @throws \Exception\PathfinderException
     */
    protected function getRequestMarkdownOptions(string $text) : array {
        $params = [
            'text' => $text,
            'mode' => 'gfm',
            'context' => 'exodus4d/pathfinder'
        ];

        $options = $this->getBaseRequestOptions();
        $options['method'] = 'POST';
        $options['content'] = json_encode($params, JSON_UNESCAPED_SLASHES);
        return $options;
    }

    /**
     * get release information from  GitHub
     * @param \Base $f3
     * @throws \Exception\PathfinderException
     */
    public function releases(\Base $f3){
        $cacheKey = 'CACHE_GITHUB_RELEASES';
        $ttl = 60 * 30; // 30min
        $releaseCount = 4;

        if( !$f3->exists($cacheKey, $return) ){
            $apiReleasePath =  Config::getPathfinderData('api.git_hub') . '/repos/exodus4d/pathfinder/releases';
            $apiMarkdownPath =  Config::getPathfinderData('api.git_hub') . '/markdown';

            // build request URL
            $apiResponse = \Web::instance()->request($apiReleasePath, $this->getRequestReleaseOptions() );

            if($apiResponse['body']){
                $return = (object) [];
                $return->releasesData = [];
                $return->version = (object) [];
                $return->version->current =  Config::getPathfinderData('version');
                $return->version->last =  '';
                $return->version->delta = null;
                $return->version->dev = false;

                // request succeeded -> format "Markdown" to "HTML"
                // result is JSON formed
                $releasesData = (array)json_decode($apiResponse['body']);

                // check max release count
                if(count($releasesData) > $releaseCount){
                    $releasesData = array_slice($releasesData, 0, $releaseCount);
                }

                $md = \Markdown::instance();
                foreach($releasesData as $key => &$releaseData){
                    // check version ----------------------------------------------------------------------------------
                    if($key === 0){
                        $return->version->last = $releaseData->tag_name;

                        if(version_compare( $return->version->current, $return->version->last, '>')){
                            $return->version->dev = true;
                        }
                    }

                    if(
                        !$return->version->dev &&
                        version_compare( $releaseData->tag_name, $return->version->current, '>=')
                    ){
                        $return->version->delta = ($key === count($releasesData) - 1) ? '>= ' . $key : $key;
                    }

                    // format body ------------------------------------------------------------------------------------
                    if(isset($releaseData->body)){
                        $body = $releaseData->body;

                        // remove "update information" from release text
                        // -> keep everything until first "***" -> horizontal line
                        if( ($pos = strpos($body, '***')) !== false){
                            $body = substr($body, 0, $pos);
                        }

                        // convert list style
                        $body = str_replace(' - ', '* ', $body );

                        // convert Markdown to HTML -> use either gitHub API (in oder to create abs, issue links)
                        // -> or F3´s markdown as fallback
                        $markdownResponse = \Web::instance()->request($apiMarkdownPath, $this->getRequestMarkdownOptions($body) );

                        if($markdownResponse['body']){
                            $body = $markdownResponse['body'];
                        }else{
                            $body =  $md->convert( trim($body) );
                        }

                        $releaseData->body = $body;
                    }
                }

                $return->releasesData = $releasesData;

                $f3->set($cacheKey, $return, $ttl);
            }else{
                // request failed -> cache failed result (respect API request limit)
                $f3->set($cacheKey, false, 60 * 15);
            }
        }

        // set 503 if service unavailable or temp cached data = false
        if( !$f3->get($cacheKey) ){
            $f3->status(503);
        }

        echo json_encode($f3->get($cacheKey));
    }
}