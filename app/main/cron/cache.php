<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 25.06.2016
 * Time: 14:59
 */

namespace cron;

use data\filesystem\Search;

class Cache extends AbstractCron {

    const LOG_TEXT                          = '%s [%\'_10s] files, size [%\'_10s] byte, not writable [%\'_10s] files, errors [%\'_10s], exec (%.3Fs)';

    /**
     * default max expire for files (seconds)
     */
    const CACHE_EXPIRE_MAX                  = 864000;

    /**
     * @param \Base $f3
     * @return int
     */
    protected function getExpireMaxTime(\Base $f3): int {
        $expireTime =  (int)$f3->get('PATHFINDER.CACHE.EXPIRE_MAX');
        return ($expireTime >= 0) ? $expireTime : self::CACHE_EXPIRE_MAX;
    }
    
    /**
     * clear expired cached files
     * >> php index.php "/cron/deleteExpiredCacheData"
     * @param \Base $f3
     */
    function deleteExpiredData(\Base $f3){
        $this->setMaxExecutionTime();
        $time_start = microtime(true);

        // cache dir (dir is recursively searched...)
        $cacheDir = $f3->get('TEMP');

        $filterTime = (int)strtotime('-' . $this->getExpireMaxTime($f3) . ' seconds');
        $expiredFiles = Search::getFilesByMTime($cacheDir, $filterTime, Search::DEFAULT_FILE_LIMIT);

        $deletedFiles = 0;
        $deletedSize = 0;
        $notWritableFiles = 0;
        $deleteErrors = 0;
        foreach($expiredFiles as $filename => $file) {
            /**
             * @var $file \SplFileInfo
             */
            if($file->isFile()){
                if( $file->isWritable() ){
                    $tmpSize = $file->getSize();
                    if( unlink($file->getRealPath()) ){
                        $deletedSize += $tmpSize;
                        $deletedFiles++;
                    }else{
                        $deleteErrors++;
                    }
                }else{
                    $notWritableFiles++;
                }
            }
        }

        $execTime = microtime(true) - $time_start;

        // Log ------------------------
        $log = new \Log('cron_' . __FUNCTION__ . '.log');
        $log->write( sprintf(self::LOG_TEXT, __FUNCTION__, $deletedFiles, $deletedSize, $notWritableFiles, $deleteErrors, $execTime) );
    }

}
