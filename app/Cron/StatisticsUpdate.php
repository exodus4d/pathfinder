<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 16.10.2016
 * Time: 21:31
 */

namespace Exodus4D\Pathfinder\Cron;

class StatisticsUpdate extends AbstractCron {

    /**
     * log text
     */
    const LOG_TEXT_STATISTICS = ', %5s rows deleted';

    /**
     * delete old statistics
     * -> older than 1 year
     * >> php index.php "/cron/deleteStatisticsData"
     * @param \Base $f3
     */
    function deleteStatisticsData(\Base $f3){
        $this->logStart(__FUNCTION__);

        $currentYear = (int)date('o');
        $currentWeek = (int)date('W');
        $expiredYear = $currentYear - 1;

        $pfDB = $f3->DB->getDB('PF');

        $queryData = [
            'yearWeekEnd' => strval($expiredYear) . str_pad($currentWeek, 2, 0, STR_PAD_LEFT)
        ];

        $sql = "DELETE FROM
                   activity_log
                WHERE
                  CONCAT(`year`, `week`) < :yearWeekEnd";

        $pfDB->exec($sql, $queryData);

        $deletedLogsCount = $pfDB->count();

        // Log --------------------------------------------------------------------------------------------------------
        $total = $count = $importCount = $deletedLogsCount;

        $text = sprintf(self::LOG_TEXT_STATISTICS, $deletedLogsCount);
        $this->logEnd(__FUNCTION__, $total, $count, $importCount, 0, $text);
    }
}