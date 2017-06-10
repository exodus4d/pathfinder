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
}