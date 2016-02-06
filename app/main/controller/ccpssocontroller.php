<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 23.01.2016
 * Time: 17:18
 *
 * Handles access to EVE-Online "CREST API" and "SSO" auth functions
 * - Add your API credentials in "environment.ini"
 * - Check "PATHFINDER.API" in "pathfinder.ini" for correct API URLs
 * Hint: \Web::instance()->request automatically caches responses by their response "Cache-Control" header!
 */

namespace Controller;

use Data\Mapper as Mapper;
use Model;

class CcpSsoController extends Controller {

    const SESSION_KEY_ACCESS_TOKEN = 'SESSION.sso.access_token';
    const SESSION_KEY_REFRESH_TOKEN = 'SESSION.sso.refresh_token';

    const ERROR_CCP_SSO_URL = 'Invalid "PATHFINDER.API.CCP_SSO" url. %s';
    const ERROR_CCP_CREST_URL = 'Invalid "PATHFINDER.API.CCP_CREST" url. %s';
    const ERROR_RESOURCE_DEPRECATED = 'Resource: %s has been marked deprecated. %s';
    const ERROR_ACCESS_TOKEN = 'Unable to get a valid "access_token. %s';
    const ERROR_VERIFY_CHARACTER =  'Unable to verify character data. %s';
    const ERROR_GET_ENDPOINTS = 'Unable to get endpoints data. $s';
    const ERROR_GET_ENDPOINT = 'Unable to get endpoint data. $s';
    const ERROR_FIND_ENDPOINT = 'Unable to find endpoint: %s';

    /**
     * "Scopes" that are used by pathfinder
     * -> Enable scopes: https://developers.eveonline.com
     * @var array
     */
    private $requestScopes = [
        'characterLocationRead',
        'characterNavigationWrite'
    ];

    /**
     * timeout for API calls
     * @var int
     */
    private $apiTimeout = 3;

    /**
     * redirect user to CCP SSO page and request authorization
     * @param $f3
     */
    public function requestAuthorization($f3){
        // used for  state check between request and callback
        $state = bin2hex(mcrypt_create_iv(12, MCRYPT_DEV_URANDOM));
        $f3->set('SESSION.sso.state', $state);

        $urlParams = [
            'response_type' => 'code',
            'redirect_uri' => Controller::getEnvironmentData('URL') . $f3->build('/sso/callbackAuthorization'),
            'client_id' => Controller::getEnvironmentData('SSO_CCP_CLIENT_ID'),
            'scope' => implode(' ', $this->requestScopes),
            'state' => $state
        ];

        $ssoAuthUrl = self::getAuthorizationEndpoint() . '?' . http_build_query($urlParams, '', '&', PHP_QUERY_RFC3986 );

        $f3->status(302);
        $f3->reroute($ssoAuthUrl);
    }

    /**
     * callback handler for CCP SSO user Auth
     * -> see requestAuthorization()
     * @param $f3
     */
    public function callbackAuthorization($f3){
        $getParams = (array)$f3->get('GET');

        if($f3->exists('SESSION.sso.state')){
            // check response and validate 'state'
            if(
                isset($getParams['code']) &&
                isset($getParams['state']) &&
                !empty($getParams['code']) &&
                !empty($getParams['state']) &&
                $f3->get('SESSION.sso.state') === $getParams['state']
            ){

                // clear 'state' for new next request
                $f3->clear('SESSION.sso.state');

                $accessToken = $this->getAccessToken($getParams['code']);
                if($accessToken){
                   $data = $this->verifyCharacterData($accessToken);

                    $characterData = $this->getCharacterData($accessToken);
                    $characterModel = $this->updateCharacter($characterData);

                    if( !is_null($characterModel) ){
                        // everything OK -> login succeeded
                    }
                }
            }
        }

        // on error -> route back to login form
        $this->getF3()->reroute('@login');
    }

    /**
     * get a valid "access_token" for oAuth 2.0 verification
     * -> if $authCode is set -> request NEW "access_token"
     * -> else check for existing (not expired) "access_token"
     * -> else try to refresh auth and get fresh "access_token"
     * @param bool $authCode
     * @return bool|mixed
     */
    private function getAccessToken($authCode = false){
        $accessToken = false;

        if( !empty($authCode) ){
            // Authentication Code is set -> request new Access Token -------------------------------------------------

            // clear "old" token (if exist and still valid)
            $this->getF3()->clear(self::SESSION_KEY_ACCESS_TOKEN);

            $accessToken = $this->verifyAuthorizationCode($authCode);
        }elseif($this->getF3()->exists(self::SESSION_KEY_ACCESS_TOKEN)){
            // Access Token exists and not expired --------------------------------------------------------------------
            $accessToken = $this->getF3()->get(self::SESSION_KEY_ACCESS_TOKEN);
        }elseif($this->getF3()->exists(self::SESSION_KEY_REFRESH_TOKEN)){
            // Refresh Token exists -> refresh Access Token -----------------------------------------------------------
            $accessToken = $this->refreshAccessToken($this->getF3()->get(self::SESSION_KEY_REFRESH_TOKEN));
        }else{
            // Unable to get Token -> trigger error -------------------------------------------------------------------
            $this->getLogger('error')->write(sprintf(self::ERROR_ACCESS_TOKEN, $authCode));
        }

        return $accessToken;
    }

    /**
     * verify authorization code, and get an "access_token" data
     * @param $authCode
     * @return bool|mixed
     */
    private function verifyAuthorizationCode($authCode){
        $requestParams = [
            'grant_type' => 'authorization_code',
            'code' => $authCode
        ];

        return $this->requestAccessToken($requestParams);
    }

    /**
     * get new "access_token" by an existing "refresh_token"
     * -> if "access_token" is expired, this function gets a fresh one
     * @param $refreshToken
     * @return bool|mixed
     */
    private function refreshAccessToken($refreshToken){
        $requestParams = [
            'grant_type' => 'refresh_token',
            'refresh_token' => $refreshToken
        ];

        return $this->requestAccessToken($requestParams);
    }

    /**
     * request an "access_token" AND "refresh_token" data
     * -> this can either be done by sending a valid "authorization code"
     * OR by providing a valid "refresh_token"
     * @param $requestParams
     * @return bool|mixed
     */
    private function requestAccessToken($requestParams){
        $verifyAuthCodeUrl = self::getVerifyAuthorizationCodeEndpoint();
        $verifyAuthCodeUrlParts = parse_url($verifyAuthCodeUrl);
        $accessToken = false;

        if($verifyAuthCodeUrlParts){
            $contentType = 'application/x-www-form-urlencoded';
            $requestOptions = [
                'timeout' => $this->apiTimeout,
                'method' => 'POST',
                'user_agent' => $this->getUserAgent(),
                'header' => [
                    'Authorization: Basic ' . $this->getAuthorizationHeader(),
                    'Content-Type: ' . $contentType,
                    'Host: ' . $verifyAuthCodeUrlParts['host']
                ]
            ];

            // content (parameters to send with)
            $requestOptions['content'] = http_build_query($requestParams);

            $apiResponse = \Web::instance()->request($verifyAuthCodeUrl, $requestOptions);

            if($apiResponse['body']){
                $authCodeRequestData = json_decode($apiResponse['body']);

                if(property_exists($authCodeRequestData, 'refresh_token')){
                    // this token is used to refresh/get a new access_token when expires
                    $this->getF3()->set(self::SESSION_KEY_REFRESH_TOKEN, $authCodeRequestData->refresh_token);
                }

                if(property_exists($authCodeRequestData, 'access_token')){
                    // this token is required for endpoints that require Auth
                    $accessToken = $this->getF3()->set(self::SESSION_KEY_ACCESS_TOKEN, $authCodeRequestData->access_token);
                }
            }else{
                $this->getLogger('error')->write(sprintf(self::ERROR_ACCESS_TOKEN, print_r($requestParams, true)));
            }
        }else{
            $this->getLogger('error')->write(sprintf(self::ERROR_CCP_SSO_URL, __METHOD__));
        }

        return $accessToken;
    }



    /**
     * verify character data by "access_token"
     * -> get some basic information (like character id)
     * -> if more character information is required, use CREST endpoints request instead
     * @param $accessToken
     * @return bool|mixed
     */
    private function verifyCharacterData($accessToken){
        $verifyUserUrl = self::getVerifyUserEndpoint();
        $verifyUrlParts = parse_url($verifyUserUrl);
        $characterData = false;

        if($verifyUrlParts){
            $requestOptions = [
                'timeout' => $this->apiTimeout,
                'method' => 'GET',
                'user_agent' => $this->getUserAgent(),
                'header' => [
                    'Authorization: Bearer ' . $accessToken,
                    'Host: ' . $verifyUrlParts['host']
                ]
            ];

            $apiResponse = \Web::instance()->request($verifyUserUrl, $requestOptions);

            if($apiResponse['body']){
                $characterData = json_decode($apiResponse['body']);
            }else{
                $this->getLogger('error')->write(sprintf(self::ERROR_VERIFY_CHARACTER, __METHOD__));
            }
        }else{
            $this->getLogger('error')->write(sprintf(self::ERROR_CCP_SSO_URL, __METHOD__));
        }

        return $characterData;
    }

    /**
     * get all available Endpoints
     * @param $accessToken
     * @return bool|mixed
     */
    private function getEndpoints($accessToken){
        $crestUrl = self::getCrestEndpoint();
        $endpointsData = false;
        $crestUrlParts = parse_url($crestUrl);

        if($crestUrlParts){
            // represents API version
            $contentType = 'application/vnd.ccp.eve.Api-v3+json';
            $requestOptions = [
                'timeout' => $this->apiTimeout,
                'method' => 'GET',
                'user_agent' => $this->getUserAgent(),
                'header' => [
                    'Authorization: Bearer ' . $accessToken,
                    'Accept: ' . $contentType,
                    'Host: ' . $crestUrlParts['host']
                ]
            ];

            $apiResponse = \Web::instance()->request($crestUrl, $requestOptions);

            if($apiResponse['headers']){
                // check headers for  error
                $this->checkResponseHeaders($apiResponse['headers'], $crestUrl, $contentType);

                if($apiResponse['body']){
                    $endpointsData = json_decode($apiResponse['body'], true);
                }else{
                    $this->getLogger('error')->write(sprintf(self::ERROR_GET_ENDPOINTS, __METHOD__));
                }
            }
        }else{
            $this->getLogger('error')->write(sprintf(self::ERROR_CCP_CREST_URL, __METHOD__));
        }

        return $endpointsData;
    }

    private function walkEndpoint($accessToken, $endpoint, $path = []){
        $targetEndpoint = null;


        if( !empty($path) ){
            $newNode = array_shift($path);

            if(isset($endpoint[$newNode])){
                $currentEndpoint = $endpoint[$newNode];
                if(isset($currentEndpoint['href'])){
                    $newEndpoint = $this->getEndpoint($accessToken, $currentEndpoint['href']);
                    $targetEndpoint = $this->walkEndpoint($accessToken, $newEndpoint, $path);

                }else{
                    // TODO leaf
                    $targetEndpoint = ' target:) ';
                }
            }else{
                // endpoint not found
                $this->getLogger('error')->write(sprintf(self::ERROR_FIND_ENDPOINT, $newNode));
            }
        }else{
            $targetEndpoint = $endpoint;
        }



        return $targetEndpoint;
    }


    /**
     * get a specific endpoint by its $resourceUrl
     * @param $accessToken
     * @param $resourceUrl
     * @return mixed|null
     */
    private function getEndpoint($accessToken, $resourceUrl){
        $resourceUrlParts = parse_url($resourceUrl);
        $endpoint = null;

        if($resourceUrlParts){
            $requestOptions = [
                'timeout' => $this->apiTimeout,
                'method' => 'GET',
                'user_agent' => $this->getUserAgent(),
                'header' => [
                    'Authorization: Bearer ' . $accessToken,
                    'Host: login.eveonline.com',
                    'Host: ' . $resourceUrlParts['host']
                ]
            ];

            $apiResponse = \Web::instance()->request($resourceUrl, $requestOptions);

            if($apiResponse['headers']){
                // check headers for  error
                $this->checkResponseHeaders($apiResponse['headers'], $requestOptions);

                if($apiResponse['body']){
                    $endpoint = json_decode($apiResponse['body'], true);
                }else{
                    $this->getLogger('error')->write(sprintf(self::ERROR_GET_ENDPOINT, __METHOD__));
                }
            }
        }else{
            $this->getLogger('error')->write(sprintf(self::ERROR_CCP_CREST_URL, __METHOD__));
        }

        return $endpoint;
    }

    /**
     * get character data
     * @param $accessToken
     * @return array
     */
    private function getCharacterData($accessToken){
        $endpoints = $this->getEndpoints($accessToken);
        $characterData = [];

        $endpoint = $this->walkEndpoint($accessToken, $endpoints, [
            'decode',
            'character'
        ]);

        if( !empty($endpoint) ){
            $characterData['character'] = (new Mapper\CrestCharacter($endpoint))->getData();

            if(isset($endpoint['corporation'])){
                $characterData['corporation'] = (new Mapper\CrestCorporation($endpoint['corporation']))->getData();
            }
        }

        return $characterData;
    }

    /*
    private function getCharacterLocation($accessToken){
        $endpoints = $this->getEndpoints($accessToken);
        $endpoint = $this->walkEndpoint($accessToken, $endpoints, [
            'decode',
            'character',
            'location'
        ]);

        var_dump($endpoint);

        die(' END getCharacterLocation() ');


        $characterData = [];
        return $characterData;
    } */

    /**
     * update character
     * @param $characterData
     * @return \Model\CharacterModel
     * @throws \Exception
     */
    private function updateCharacter($characterData){

        $characterModel = null;
        $corporationModel = null;
        $allianceModel = null;

        if( !empty($characterData['corporation']) ){
            $corporationModel = Model\BasicModel::getNew('CorporationModel');
            $corporationModel->getById($characterData['corporation']['id'], 0);
            $corporationModel->copyfrom($characterData['corporation']);
            $corporationModel->save();
        }

        if( !empty($characterData['alliance']) ){
            $allianceModel = Model\BasicModel::getNew('AllianceModel');
            $allianceModel->getById($characterData['alliance']['id'], 0);
            $allianceModel->copyfrom($characterData['alliance']);
            $allianceModel->save();
        }

        if( !empty($characterData['character']) ){
            $characterModel = Model\BasicModel::getNew('CharacterModel');
            $characterModel->getById($characterData['character']['id'], 0);
            $characterModel->copyfrom($characterData['character']);
            $characterModel->corporationId = $corporationModel;
            $characterModel->allianceId = $allianceModel;
            $characterModel->save();
        }

        return $characterModel;
    }

    /**
     * check response "Header" data for errors
     * @param $headers
     * @param string $requestUrl
     * @param string $contentType
     */
    private function checkResponseHeaders($headers, $requestUrl = '', $contentType = ''){
        $headers = (array)$headers;
        if(preg_grep ('/^X-Deprecated/i', $headers)){
            $this->getLogger('error')->write(sprintf(self::ERROR_RESOURCE_DEPRECATED, $requestUrl, $contentType));
        }
    }

    /**
     * get "Authorization:" Header data
     * -> This header is required for any Auth-required endpoints!
     * @return string
     */
    private function getAuthorizationHeader(){
        return base64_encode(
            Controller::getEnvironmentData('SSO_CCP_CLIENT_ID') . ':'
            . Controller::getEnvironmentData('SSO_CCP_SECRET_KEY')
        );
    }


    static function getAuthorizationEndpoint(){
        return \Base::instance()->get('PATHFINDER.API.CCP_SSO') . '/oauth/authorize';
    }

    static function getVerifyAuthorizationCodeEndpoint(){
        return \Base::instance()->get('PATHFINDER.API.CCP_SSO') . '/oauth/token';
    }

    static function getVerifyUserEndpoint(){
        return \Base::instance()->get('PATHFINDER.API.CCP_SSO') . '/oauth/verify';
    }

    static function getCrestEndpoint(){
        return \Base::instance()->get('PATHFINDER.API.CCP_CREST');
    }
}