<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 16.10.2016
 * Time: 21:31
 */

namespace cron;

class StatisticsUpdate extends AbstractCron {

    const LOG_TEXT_STATISTICS = '%s (%d rows)';

    /**
     * delete old statistics
     * -> older than 1 year
     * >> php index.php "/cron/deleteStatisticsData"
     * @param \Base $f3
     */
    function deleteStatisticsData(\Base $f3){
        $this->setMaxExecutionTime();

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

        // Log ------------------------
        $log = new \Log('cron_' . __FUNCTION__ . '.log');
        $log->write( sprintf(self::LOG_TEXT_STATISTICS, __FUNCTION__, $deletedLogsCount) );
    }
}