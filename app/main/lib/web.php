<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 12.03.2016
 * Time: 12:28
 */

namespace Lib;

class Web extends \Web {

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
        ).'.url';
    }

    /**
     * perform curl() request
     * -> caches response by returned HTTP Cache header data
     * @param string $url
     * @param array|null $options
     * @return array|FALSE|mixed
     */
    public function request($url,array $options = null) {
        $f3 = \Base::instance();

        if( !$f3->exists( $hash = $this->getCacheKey($url, $options) ) ){
            $result = parent::request($url, $options);
            $statusCode = $this->getStatuscodeFromHeaders( $result['headers'] );

            if($statusCode == 200){
                // request succeeded -> check if response should be cached
                if( $ttl = $this->getCacheTimeFromHeaders( $result['headers'] ) ){
                    $f3->set($hash, $result, $ttl);
                }
            }
        }else{
            $result = $f3->get($hash);
        }

        return $result;
    }

}