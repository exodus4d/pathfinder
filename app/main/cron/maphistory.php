<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 22.12.2018
 * Time: 15:48
 */

namespace Cron;

use data\mapper\SortingIterator;
use data\file\FileHandler;
use data\filesystem\Search;

class MapHistory extends AbstractCron {

    /**
     * log msg for truncateFiles() cronjob
     */
    const LOG_TEXT              = '%s [%4s] log files, [%s] truncated, [%4s] not writable, [%4s] read error, [%4s] write error, [%4s] rename error, [%4s] delete error, exec (%.3Fs)';

    /**
     * default log file size limit before truncate, bytes (1MB)
     */
    const LOG_SIZE_THRESHOLD    = 1024 * 1024;

    /**
     * default count of log files that will be truncated
     */
    const LOG_COUNT             = 3;

    /**
     * default line limit after truncate
     */
    const LOG_LINES             = 1000;

    /**
     * get max log size threshold before truncate
     * @param \Base $f3
     * @return int
     */
    protected function getMaxLogSize(\Base $f3) : int {
        $logSize = (int)$f3->get('PATHFINDER.HISTORY.LOG_SIZE_THRESHOLD');
        return ($logSize >= 0) ? ($logSize * 1024 * 1024) : self::LOG_SIZE_THRESHOLD;
    }

    /**
     * get max log entries (lines) after truncate
     * @param \Base $f3
     * @return int
     */
    protected function getMaxLogLines(\Base $f3) : int {
        $logLines = (int)$f3->get('PATHFINDER.HISTORY.LOG_LINES');
        return ($logLines >= 0) ? $logLines : self::LOG_LINES;
    }

    /**
     * truncate map history log files and keep size small
     * >> php index.php "/cron/truncateMapHistoryLogFiles"
     * @param \Base $f3
     */
    function truncateFiles(\Base $f3){
        $timeStart = microtime(true);

        $largeFiles = 0;
        $notWritableFiles = 0;
        $readErrors = 0;
        $writeErrors = 0;
        $renameErrors = 0;
        $deleteErrors = 0;
        $truncatedFileNames = [];

        if($f3->exists('PATHFINDER.HISTORY.LOG', $dir)){
            $fileHandler = FileHandler::instance();

            $dir = $f3->fixslashes('./' . $dir . 'map/');
            $files = Search::getFilesBySize($dir, $this->getMaxLogSize($f3));

            // sort by file size
            $files = new SortingIterator($files, function( \SplFileInfo $a, \SplFileInfo $b){
                return $b->getSize() - $a->getSize();
            });

            // limit files count for truncate
            $files = new \LimitIterator($files, 0, self::LOG_COUNT);

            foreach($files as $filename => $file){
                /**
                 * @var $file \SplFileInfo
                 */
                if($file->isFile()){
                    $largeFiles++;
                    if($file->isWritable()){
                        // read newest logs from large files (reverse order) -> new log entries were appended...
                        $rowsData = $fileHandler->readFileReverse($file->getRealPath(), 0, self::LOG_LINES);
                        if(!empty($rowsData)){
                            // create temp file...
                            $temp = tempnam(sys_get_temp_dir(), 'map_');
                            // write newest logs into temp file...
                            $fileSizeNew = file_put_contents($temp, implode(PHP_EOL, array_reverse($rowsData)) . PHP_EOL, LOCK_EX);
                            if($fileSizeNew){
                                // move temp file from PHP temp dir into Pathfinders history log dir...
                                // ... overwrite old log file with new file
                                if(rename($temp, $file->getRealPath())){
                                    $truncatedFileNames[] = $file->getFilename();
                                    // map history logs should be writable for non cronjob user too
                                    @chmod($file->getRealPath(), 0666);
                                }else{
                                    $renameErrors++;
                                }
                            }else{
                                $writeErrors++;
                            }
                        }else{
                            $readErrors++;
                        }
                    }else{
                        $notWritableFiles++;
                    }
                }
            }
        }

        $execTime = microtime(true) - $timeStart;

        // Log ------------------------
        $log = new \Log('cron_' . __FUNCTION__ . '.log');
        $log->write(sprintf(self::LOG_TEXT, __FUNCTION__, $largeFiles, implode(', ', $truncatedFileNames), $notWritableFiles, $readErrors, $writeErrors, $renameErrors, $deleteErrors, $execTime));
    }
}