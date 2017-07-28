<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 25.06.2016
 * Time: 16:58
 */

namespace data\filesystem;


class Search {

    /**
     * timestamp (seconds) filter files by mTime()
     * -> default = "no filter"
     * @var int
     */
    static $filterTime = 0;

    /**
     * recursive file filter by mTime
     * @param string $dir
     * @param int $mTime
     * @return array|\RecursiveCallbackFilterIterator
     */
    static function getFilesByMTime($dir, $mTime = null){
        $files = [];

        if(is_dir($dir)){
            if(is_null($mTime)){
                self::$filterTime = time();
            }else{
                self::$filterTime = (int)$mTime;
            }

            $directory = new \RecursiveDirectoryIterator( $dir, \FilesystemIterator::SKIP_DOTS );
            $files = new \RecursiveCallbackFilterIterator($directory, function ($current, $key, $iterator) {

                // Check for last modification date
                /**
                 * @var $current \RecursiveDirectoryIterator
                 */
                if (
                    !$current->isFile() || // allow recursion
                    (
                        strpos($current->getFilename(), '.') !== 0 && // skip e.g. ".gitignore"
                        $current->getMTime() < self::$filterTime // check last modification date
                    )
                ){
                    return true;
                }
                return false;
            });

            $files = new \RecursiveIteratorIterator($files);
        }

        return $files;
    }

}