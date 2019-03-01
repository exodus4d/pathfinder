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
     * max file count that can be returned
     */
    const DEFAULT_FILE_LIMIT                = 1000;

    /**
     * recursive file filter by mTime
     * @param string $dir
     * @param null $mTime
     * @param int $limit
     * @return \Traversable
     */
    static function getFilesByMTime(string $dir, $mTime = null, $limit = self::DEFAULT_FILE_LIMIT)  : \Traversable {
        $mTime = is_null($mTime) ? time() : (int)$mTime;

        $filterCallback = function($current, $key, $iterator) use ($mTime) {
            /**
             * @var $current \RecursiveDirectoryIterator
             */
            if (
                !$current->isFile() || // allow recursion
                (
                    strpos($current->getFilename(), '.') !== 0 && // skip e.g. ".gitignore"
                    $current->getMTime() < $mTime // filter last modification date
                )
            ){
                return true;
            }
            return false;
        };

        return self::getFilesByCallback($dir, $filterCallback, $limit);
    }

    /**
     * recursive file filter by size
     * @param string $dir
     * @param int $size
     * @param int $limit
     * @return \Traversable
     */
    static function getFilesBySize(string $dir, int $size = 0, int $limit = self::DEFAULT_FILE_LIMIT)  : \Traversable {

        $filterCallback = function($current, $key, $iterator) use ($size) {
            /**
             * @var $current \RecursiveDirectoryIterator
             */
            if (
                !$current->isFile() || // allow recursion
                (
                    strpos($current->getFilename(), '.') !== 0 && // skip e.g. ".gitignore"
                    $current->getSize() > $size // filter file size
                )
            ){
                return true;
            }
            return false;
        };

        return self::getFilesByCallback($dir, $filterCallback, $limit);
    }

    /**
     * @param string $dir
     * @param \Closure $filterCallback
     * @param int $limit
     * @return \Traversable
     */
    private static function getFilesByCallback(string $dir, \Closure $filterCallback, int $limit = self::DEFAULT_FILE_LIMIT) : \Traversable {
        $files = new \ArrayIterator();
        if(is_dir($dir)){
            $directory = new \RecursiveDirectoryIterator( $dir, \FilesystemIterator::SKIP_DOTS );
            $files = new \RecursiveCallbackFilterIterator($directory, $filterCallback);
        }
        return new \LimitIterator($files, 0, $limit);
    }
}