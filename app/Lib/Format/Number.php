<?php


namespace Exodus4D\Pathfinder\Lib\Format;


class Number extends \Prefab {

    /**
     * convert Bytes to string + suffix
     * @param int $bytes
     * @param int $precision
     * @return string
     */
    public function bytesToString($bytes,$precision = 2) : string {
        $result = '0';
        if($bytes){
            $base = log($bytes, 1024);
            $suffixes = ['', 'KB', 'M', 'GB', 'TB'];
            $result = round(pow(1024, $base - floor($base)), $precision) .''. $suffixes[(int)floor($base)];
        }
        return $result;
    }
}