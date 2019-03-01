<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 26.11.2016
 * Time: 17:32
 */

namespace lib;

class Util {

    /**
     * convert array keys to upper/lowercase -> recursive
     * @param $arr
     * @param int $case
     * @return array
     */
    static function arrayChangeKeyCaseRecursive($arr, $case = CASE_LOWER){
        if(is_array($arr)){
            $arr = array_map( function($item){
                if( is_array($item) )
                    $item = self::arrayChangeKeyCaseRecursive($item);
                return $item;
            }, array_change_key_case((array)$arr, $case));
        }

        return $arr;
    }

    /**
     * flatten multidimensional array ignore keys
     * @param array $array
     * @return array
     */
    static function arrayFlattenByValue(array $array) : array {
        $return = [];
        array_walk_recursive($array, function($value) use (&$return) { $return[] = $value; });
        return $return;
    }

    /**
     * flatten multidimensional array merge keys
     * -> overwrites duplicate keys!
     * @param array $array
     * @return array
     */
    static function arrayFlattenByKey(array $array) : array {
        $return = [];
        array_walk_recursive($array, function($value, $key) use (&$return) { $return[$key] = $value; });
        return $return;
    }

    /**
     * checks whether an array is associative or not (sequential)
     * @param mixed $array
     * @return bool
     */
    static function is_assoc($array): bool {
        $isAssoc = false;
        if(
            is_array($array) &&
            array_keys($array) !== range(0, count($array) - 1)
        ){
            $isAssoc = true;
        }

        return $isAssoc;
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
     * obsucre string e.g. password (hide last characters)
     * @param string $string
     * @param int $maxHideChars
     * @return string
     */
    static function obscureString(string $string, int $maxHideChars = 10): string {
        $formatted = '';
        $length = mb_strlen((string)$string);
        if($length > 0){
            $hideChars = ($length < $maxHideChars) ? $length : $maxHideChars;
            $formatted = substr_replace($string, str_repeat('_', min(3, $length)), -$hideChars) .
                ' [' . $length . ']';
        }
        return $formatted;
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

    /**
     * get some information about a $source file/dir
     * @param string|null $source
     * @return array
     */
    static function filesystemInfo(?string $source) : array {
        $info = [];
        if(is_dir($source)){
            $info['isDir'] = true;
        }elseif(is_file($source)){
            $info['isFile'] = true;
        }
        if(!empty($info)){
            $info['chmod'] = substr(sprintf('%o', fileperms($source)), -4);
        }
        return $info;
    }

    /**
     * round DateTime to interval
     * @param \DateTime $dateTime
     * @param string $type
     * @param int $interval
     * @param string $round
     */
    static function roundToInterval(\DateTime &$dateTime, string $type = 'sec', int $interval = 5, string $round = 'floor'){
        $hours = $minutes = $seconds = 0;

        $roundInterval = function(string $format, int $interval, string $round) : int {
            return call_user_func($round, $format / $interval) * $interval;
        };

        switch($type){
            case 'hour':
                $hours = $roundInterval($dateTime->format('H'), $interval, $round);
                break;
            case 'min':
                $hours = $dateTime->format('H');
                $minutes = $roundInterval($dateTime->format('i'), $interval, $round);
                break;
            case 'sec':
                $hours = $dateTime->format('H');
                $minutes = $dateTime->format('i');
                $seconds = $roundInterval($dateTime->format('s'), $interval, $round);
                break;
        }

        $dateTime->setTime($hours, $minutes, $seconds);
    }
}