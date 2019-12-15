<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 25.06.2016
 * Time: 14:59
 */

namespace Exodus4D\Pathfinder\Cron;

use Exodus4D\Pathfinder\Data\Filesystem\Search;

class Cache extends AbstractCron {

    /**
     * log text
     */
    const LOG_TEXT                          = ', size [%\'_10s] byte, not writable [%\'_10s] files, errors [%\'_10s]';

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
    function deleteExpiredCacheData(\Base $f3){
        $this->logStart(__FUNCTION__);

        // cache dir (dir is recursively searched...)
        $cacheDir = $f3->get('TEMP');

        $filterTime = (int)strtotime('-' . $this->getExpireMaxTime($f3) . ' seconds');
        $expiredFiles = Search::getFilesByMTime($cacheDir, $filterTime, Search::DEFAULT_FILE_LIMIT);

        $totalFiles = 0;
        $deletedFiles = 0;
        $deletedSize = 0;
        $notWritableFiles = 0;
        $deleteErrors = 0;
        foreach($expiredFiles as $filename => $file) {
            /**
             * @var $file \SplFileInfo
             */
            if($file->isFile()){
                $totalFiles++;
                if($file->isWritable()){
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

        // Log --------------------------------------------------------------------------------------------------------
        $total = $totalFiles;
        $importCount = $total;
        $count = $deletedFiles;

        $text = sprintf(self::LOG_TEXT, $deletedSize, $notWritableFiles, $deleteErrors);
        $this->logEnd(__FUNCTION__, $total, $count, $importCount, 0, $text);
    }

}
