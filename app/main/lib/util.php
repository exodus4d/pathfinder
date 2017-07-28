<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 26.11.2016
 * Time: 17:32
 */

namespace Lib;

class Util {

    /**
     * convert array keys to upper/lowercase -> recursive
     * @param $arr
     * @param int $case
     * @return array
     */
    static function arrayChangeKeyCaseRecursive($arr, $case = CASE_LOWER){
        return array_map( function($item){
            if( is_array($item) )
                $item = self::arrayChangeKeyCaseRecursive($item);
            return $item;
        }, array_change_key_case($arr, $case));
    }

    /**
     * convert array keys by a custom callback
     * @param $arr
     * @param $callback
     * @return array
     */
    static function arrayChangeKeys($arr, $callback){
        return array_combine(
            array_map(function ($key) use ($callback){
               return $callback($key);
            }, array_keys($arr)), $arr
        );
    }

    /**
     * convert a string with multiple scopes into an array
     * @param string $scopes
     * @return array|null
     */
    static function convertScopesString($scopes){
        $scopes = array_filter(
            array_map('strtolower',
                (array)explode(' ', $scopes)
            )
        );

        if($scopes){
            sort($scopes);
        }else{
            $scopes = null;
        }

        return $scopes;
    }

    /**
     * get hash from an array of ESI scopes
     * @param array $scopes
     * @return string
     */
    static function getHashFromScopes($scopes){
        $scopes = (array)$scopes;
        sort($scopes);
        return md5(serialize($scopes));
    }
}