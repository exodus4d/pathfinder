<?php /** @noinspection PhpUndefinedMethodInspection */

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

    /**
     * get release information from  GitHub
     * @param \Base $f3
     */
    public function releases(\Base $f3){
        $releaseCount = 4;

        $return = (object) [];
        $return->releasesData = [];
        $return->version = (object) [];
        $return->version->current =  Config::getPathfinderData('version');
        $return->version->last =  '';
        $return->version->delta = null;
        $return->version->dev = false;

        $md = \Markdown::instance();

        $releases = $f3->gitHubClient()->getProjectReleases('exodus4d/pathfinder', $releaseCount);

        foreach($releases as $key => &$release){
            // check version ------------------------------------------------------------------------------------------
            if($key === 0){
                $return->version->last = $release['name'];
                if(version_compare( $return->version->current, $return->version->last, '>')){
                    $return->version->dev = true;
                }
            }

            if(
                !$return->version->dev &&
                version_compare($release['name'], $return->version->current, '>=')
            ){
                $return->version->delta = ($key === count($releases) - 1) ? '>= ' . $key : $key;
            }

            // format body ------------------------------------------------------------------------------------
            $body = $release['body'];

            // remove "update information" from release text
            // -> keep everything until first "***" -> horizontal line
            if( ($pos = strpos($body, '***')) !== false){
                $body = substr($body, 0, $pos);
            }

            // convert list style
            $body = str_replace(' - ', '* ', $body);

            // convert Markdown to HTML -> use either gitHub API (in oder to create abs, issue links)
            // -> or F3´s markdown as fallback
            $html = $f3->gitHubClient()->markdownToHtml('exodus4d/pathfinder', $body);

            if(!empty($html)){
                $body = $html;
            }else{
                $body = $md->convert(trim($body));
            }

            $release['body'] = $body;
        }

        $return->releasesData = $releases;

        echo json_encode($return);
    }
}