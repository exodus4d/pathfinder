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
     * max file count that should be deleted in this session
     */
    const DEFAULT_FILE_LIMIT                = 1000;

    /**
     * timestamp (seconds) filter files by mTime()
     * -> default = "no filter"
     * @var int
     */
    static $filterTime                      = 0;

    /**
     * recursive file filter by mTime
     * @param string $dir
     * @param int $mTime
     * @param int $limit
     * @return array|\LimitIterator
     */
    static function getFilesByMTime(string $dir, $mTime = null, $limit = self::DEFAULT_FILE_LIMIT){
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

            // limit max files
            $files = new \LimitIterator($files, 0, $limit);
        }

        return $files;
    }

}