<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 12.03.2016
 * Time: 12:28
 */

namespace lib;

use controller\LogController;

class Web extends \Web {

    const ERROR_STATUS_LOG                  = 'HTTP %s: \'%s\' | url: %s \'%s\'%s';

    /**
     * max retry attempts (cURL requests) for a single resource until giving up...
     * -> this is because SSO API is not very stable
     * 2 == (initial request + 2 retry == max of 3)
     */
    const RETRY_COUNT_MAX                   = 2;

    /**
     * end of line
     * @var string
     */
    private $eol = "\r\n";

    /**
     * get status code from Header data array
     * @param array $headers
     * @return int
     */
    protected function getStatusCodeFromHeaders(array $headers = []) : int {
        $statusCode = 0;
        if(
            preg_match(
                '/HTTP\/1\.\d (\d{3}?)/',
                implode($this->eol, $headers),
                $matches
            )
        ){
            $statusCode = (int)$matches[1];
        }
        return $statusCode;
    }

    /**
     * get cache time in seconds from Header data array
     * @param array $headers
     * @return int
     */
    protected function getCacheTimeFromHeaders(array $headers = []) : int {
        $cacheTime = 0;
        if(
            preg_match(
                '/Cache-Control:(.*?)max-age=([0-9]+)/',
                implode($this->eol, $headers),
                $matches
            )
        ){
            $cacheTime = (int)$matches[2];
        }elseif(
            preg_match(
                '/Access-Control-Max-Age: ([0-9]+)/',
                implode($this->eol, $headers),
                $matches
            )
        ){
            $cacheTime = (int)$matches[1];
        }
        return $cacheTime;
    }

    /**
     * get a unique cache kay for a request
     * @param $url
     * @param null $options
     * @return string
     */
    protected function getCacheKey(string $url, $options = null) : string {
        $f3 = \Base::instance();

        $headers = isset($options['header']) ? implode($this->eol, (array)$options['header']) : '';

        return $f3->hash(
            $options['method'] . ' '
            . $url . ' '
            . $headers
        ) . 'url';
    }

    /**
     * perform curl() request
     * -> caches response by returned HTTP Cache header data
     * @param string $url
     * @param array|null $options
     * @param array $additionalOptions
     * @param int $retryCount request counter for failed call
     * @return array|FALSE|mixed
     */
    public function request($url, array $options = null, array $additionalOptions = [], int $retryCount = 0){
        $f3 = \Base::instance();

        if( !$f3->exists($hash = $this->getCacheKey($url, $options), $result) ){
            // set max retry count in case of request error
            $retryCountMax = isset($additionalOptions['retryCountMax']) ? (int)$additionalOptions['retryCountMax'] : self::RETRY_COUNT_MAX;

            // retry same request until retry limit is reached
            $retry = false;

            $result = parent::request($url, $options);
            $result['timeout'] = false;
            $statusCode = $this->getStatusCodeFromHeaders( $result['headers'] );

            switch($statusCode){
                case 100:
                case 200:
                    // request succeeded -> check if response should be cached
                    $ttl = $this->getCacheTimeFromHeaders( $result['headers'] );

                    if(
                        $ttl > 0 &&
                        !empty( json_decode( $result['body'], true ) )
                    ){
                        $f3->set($hash, $result, $ttl);
                    }
                    break;
                case 401:
                case 415:
                    // unauthorized
                    $errorMsg = $this->getErrorMessageFromJsonResponse(
                        $statusCode,
                        $options['method'],
                        $url,
                        json_decode($result['body'])
                    );

                    // if request not within downTime time range -> log error
                    if( !Config::inDownTimeRange() ){
                        LogController::getLogger('ERROR')->write($errorMsg);
                    }
                    break;
                case 500:
                case 501:
                case 502:
                case 503:
                case 505:
                    $retry = true;

                    if($retryCount == $retryCountMax){
                        $errorMsg = $this->getErrorMessageFromJsonResponse(
                            $statusCode,
                            $options['method'],
                            $url,
                            json_decode($result['body'])
                        );

                        // if request not within downTime time range -> log error
                        if( !Config::inDownTimeRange() ){
                            LogController::getLogger('ERROR')->write($errorMsg);
                        }

                        // trigger error
                        if($additionalOptions['suppressHTTPErrors'] !== true){
                            $f3->error($statusCode, $errorMsg);
                        }
                    }
                    break;
                case 504:
                case 0:
                    $retry = true;

                    if($retryCount == $retryCountMax){
                        // timeout -> response should not be cached
                        $result['timeout'] = true;

                        $errorMsg = $this->getErrorMessageFromJsonResponse(
                            504,
                            $options['method'],
                            $url,
                            json_decode($result['body'])
                        );

                        // if request not within downTime time range -> log error
                        if( !Config::inDownTimeRange() ){
                            LogController::getLogger('ERROR')->write($errorMsg);
                        }

                        if($additionalOptions['suppressHTTPErrors'] !== true){
                            $f3->error(504, $errorMsg);
                        }
                    }
                    break;
                default:
                    // unknown status
                    $errorMsg = $this->getErrorMessageFromJsonResponse(
                        $statusCode,
                        $options['method'],
                        $url
                    );

                    if( !Config::inDownTimeRange() ){
                        LogController::getLogger('ERROR')->write($errorMsg);
                    }
                    break;
            }

            if(
                $retry &&
                $retryCount < $retryCountMax
            ){
                $retryCount++;
                $this->request($url, $options, $additionalOptions, $retryCount);
            }
        }

        return $result;
    }

    /**
     * get error message from response object
     * @param int $code
     * @param string $method
     * @param string $url
     * @param null|\stdClass $responseBody
     * @return string
     */
    protected function getErrorMessageFromJsonResponse($code, $method, $url, $responseBody = null){
        if( empty($responseBody->message) ){
            $message = @constant('Base::HTTP_' . $code);
        }else{
            $message = $responseBody->message;
        }

        $body = '';
        if( !is_null($responseBody) ){
            $body = ' | body: ' . print_r($responseBody, true);
        }

        return sprintf(self::ERROR_STATUS_LOG, $code, $message, $method, $url, $body);
    }

}