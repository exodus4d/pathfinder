<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 25.06.2016
 * Time: 14:59
 */

namespace cron;

use data\filesystem\Search;
use Controller;

class Cache {

    const LOG_TEXT = '%s [%\'_10s] files, size [%\'_10s] byte, not writable [%\'_10s] files, errors [%\'_10s], exec (%.3Fs)';

    /**
     * clear expired cached files
     * >> >php index.php "/cron/deleteExpiredCacheData"
     * @param \Base $f3
     */
    function deleteExpiredData(\Base $f3){
        $time_start = microtime(true);

        // cache dir (dir is recursively searched...)
        $cacheDir = $f3->get('TEMP');

        $filterTime = (int)strtotime('-' . $f3->get('PATHFINDER.CACHE.EXPIRE_MAX') . ' seconds');
        $expiredFiles = Search::getFilesByMTime($cacheDir, $filterTime);

        $deletedFiles = 0;
        $deletedSize = 0;
        $notWritableFiles = 0;
        $deleteErrors = 0;
        foreach($expiredFiles as $filename => $file) {
            /**
             * @var $file \SplFileInfo
             */
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

        $execTime = microtime(true) - $time_start;

        // Log ------------------------
        $log = Controller\LogController::getLogger('cron_' . __FUNCTION__);
        $log->write( sprintf(self::LOG_TEXT, __FUNCTION__, $deletedFiles, $deletedSize, $notWritableFiles, $deleteErrors, $execTime) );
    }

}
