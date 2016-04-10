<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 12.03.2016
 * Time: 12:28
 */

namespace Lib;

use controller\LogController;

class Web extends \Web {

    const ERROR_DEFAULT_MSG                 = 'method: \'%s\', url: \'%s\'';
    const ERROR_STATUS_UNKNOWN              = 'HTTP response - unknown HTTP status: \'%s\'. url: \'%s\'';
    const ERROR_TIMEOUT                     = 'Request timeout \'%ss\'. url: \'%s\'';


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
    protected function getStatuscodeFromHeaders($headers = []){
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
    protected function getCacheTimeFromHeaders($headers = []){
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
    protected function getCacheKey($url, $options = null){
        $f3 = \Base::instance();

        $headers = isset($options['header']) ? implode($this->eol, (array) $options['header']) : '';

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
     * @return array|FALSE|mixed
     */
    public function request($url,array $options = null, $additionalOptions = []) {
        $f3 = \Base::instance();

        if( !$f3->exists( $hash = $this->getCacheKey($url, $options) ) ){
            $result = parent::request($url, $options);
            $result['timeout'] = false;
            $statusCode = $this->getStatuscodeFromHeaders( $result['headers'] );

            switch($statusCode){
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
                case 500:
                case 501:
                case 502:
                case 503:
                case 505:
                    $f3->error($statusCode, $this->getErrorMessageFromJsonResponse(
                        $options['method'],
                        $url,
                        json_decode($result['body'])
                    ));
                    break;
                case 504:
                case 0:
                    // timeout -> response should not be cached
                    $result['timeout'] = true;

                    if($additionalOptions['suppressTimeoutErrors'] !== true){
                        // set error...
                        $f3->error(504, $this->getErrorMessageFromJsonResponse(
                            $options['method'],
                            $url
                        ));
                    }

                    // log error
                    LogController::getLogger('error')->write(
                        sprintf(self::ERROR_TIMEOUT, $options['timeout'], $url)
                    );
                    break;
                default:
                    // unknown status
                    LogController::getLogger('error')->write(
                        sprintf(self::ERROR_STATUS_UNKNOWN, $statusCode, $url)
                    );
                    break;
            }
        }else{
            $result = $f3->get($hash);
        }

        return $result;
    }

    /**
     * get error message from response object
     * @param $method
     * @param $url
     * @param null|\stdClass $responseBody
     * @return string
     */
    protected function getErrorMessageFromJsonResponse($method, $url, $responseBody = null){
        if( empty($responseBody->message) ){
            $message = sprintf(self::ERROR_DEFAULT_MSG, $method, $url);
        }else{
            $message = $responseBody->message . ', url: \'' . $url . '\'';
        }

        return $message;
    }

}