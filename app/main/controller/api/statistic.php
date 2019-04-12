<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 03.10.2016
 * Time: 00:29
 */

namespace controller\api;

use Controller;
use lib\Config;
use Model\Pathfinder\CharacterModel;

class Statistic extends Controller\AccessController {

    /**
     * concat a year and calendar week number
     * week numbers > 10 will get prefixed with "0"
     * -> e.g. year 2016, week 2 => "201602"
     * @param int $year
     * @param int $week
     * @return string
     */
    protected function concatYearWeek($year, $week){
        return strval($year) . str_pad($week, 2, 0, STR_PAD_LEFT);
    }

    /**
     * get max count of weeks in a year
     * @param $year
     * @return int
     */
    protected function getIsoWeeksInYear($year){
        $week = 0;
        try{
            $date = new \DateTime;
            $date->setISODate($year, 53);
            $week = ($date->format('W') === '53' ? 53 : 52);
        }catch(\Exception $e){}
        return $week;
    }

    /**
     * get number of weeks for a given period
     * @param string $period
     * @param int $year
     * @return int
     */
    protected function getWeekCount($period, $year){
        $weeksInYear = $this->getIsoWeeksInYear($year);

        switch($period){
            case 'yearly':
                $weekCount = $weeksInYear;
                break;
            case 'monthly':
                $weekCount = 4;
                break;
            case 'weekly':
            default:
                $weekCount = 1;
                break;
        }

        return $weekCount;
    }

    /**
     * calculate calendar week and year for a given offset (weekCount)
     * -> count forward OR backward
     * @param int $year
     * @param int $week
     * @param int $weekCount
     * @param bool $backwards
     * @return array
     */
    protected function calculateYearWeekOffset($year, $week, $weekCount, $backwards = false){
        $offset = [
            'year' => (int)$year,
            'week' => (int)$week
        ];

        $weeksInYear = $this->getIsoWeeksInYear($year);

        // just for security...
        if($offset['week'] > $weeksInYear){
            $offset['week'] = $weeksInYear;
        }elseif($offset['week'] <= 0){
            $offset['week'] = 1;
        }

        for($i = 1; $i < $weekCount; $i++){

            if($backwards){
                // calculate backward
                $offset['week']--;

                if($offset['week'] <= 0){
                    // year change -> reset yearWeeks
                    $offset['year']--;
                    $offset['week'] = $this->getIsoWeeksInYear($offset['year']);
                }
            }else{
                // calculate forward
                $offset['week']++;

                if($offset['week'] > $weeksInYear){
                    // year change -> reset yearWeeks
                    $offset['week'] = 1;
                    $offset['year']++;
                    $weeksInYear = $this->getIsoWeeksInYear($offset['year']);
                }
            }
        }

        return $offset;
    }

    /**
     * query statistic data for "activity log"
     * -> group result by characterId
     * @param CharacterModel $character
     * @param int $typeId
     * @param int $yearStart
     * @param int $weekStart
     * @param int $yearEnd
     * @param int $weekEnd
     * @return array
     */
    protected function queryStatistic(CharacterModel $character, $typeId, $yearStart, $weekStart, $yearEnd, $weekEnd){
        $data = [];

        // can be either "characterId" || "corporationId" || "allianceId"
        // -> is required (>0) to limit the result to only accessible data for the given character!
        $objectId = 0;

        // add map-"typeId" (private/corp/ally) condition -------------------------------------------------------------
        // check  if "LOG_ACTIVITY_ENABLED" is active for a given "typeId"
        $sqlMapType = "";

        switch($typeId){
            case 2:
                if( Config::getMapsDefaultConfig('private')['log_activity_enabled'] ){
                    $sqlMapType .= " AND `character`.`id` = :objectId ";
                    $objectId = $character->_id;
                }
                break;
            case 3:
                if(
                    Config::getMapsDefaultConfig('corporation')['log_activity_enabled'] &&
                    $character->hasCorporation()
                ){
                    $sqlMapType .= " AND `character`.`corporationId` = :objectId ";
                    $objectId = $character->get('corporationId', true);
                }
                break;
            case 4:
                if(
                    Config::getMapsDefaultConfig('alliance')['log_activity_enabled'] &&
                    $character->hasAlliance()
                ){
                    $sqlMapType .= " AND `character`.`allianceId` = :objectId ";
                    $objectId = $character->get('allianceId', true);
                }
                break;
        }

        if($objectId > 0){

            $queryData = [
                ':active' => 1,
                ':objectId' => $objectId
            ];

            // date offset condition ----------------------------------------------------------------------------------
            $sqlDateOffset = " AND CONCAT(`log`.`year`, LPAD(`log`.`week`, 2, 0) ) BETWEEN  :yearWeekStart AND :yearWeekEnd ";

            $queryData[':yearWeekStart'] = $this->concatYearWeek($yearStart, $weekStart);
            $queryData[':yearWeekEnd'] = $this->concatYearWeek($yearEnd, $weekEnd);

            // build query --------------------------------------------------------------------------------------------
            $sql = "SELECT
                    `log`.`year`,
                    `log`.`week`,
                    `log`.`characterId`,
                    `character`.`name`,
                    `character`.`lastLogin`,
                    SUM(`log`.`mapCreate`) `mapCreate`,
                    SUM(`log`.`mapUpdate`) `mapUpdate`,
                    SUM(`log`.`mapDelete`) `mapDelete`,
                    SUM(`log`.`systemCreate`) `systemCreate`,
                    SUM(`log`.`systemUpdate`) `systemUpdate`,
                    SUM(`log`.`systemDelete`) `systemDelete`,
                    SUM(`log`.`connectionCreate`) `connectionCreate`,
                    SUM(`log`.`connectionUpdate`) `connectionUpdate`,
                    SUM(`log`.`connectionDelete`) `connectionDelete`,
                    SUM(`log`.`signatureCreate`) `signatureCreate`,
                    SUM(`log`.`signatureUpdate`) `signatureUpdate`, 
                    SUM(`log`.`signatureDelete`) `signatureDelete`
                FROM
                    `activity_log` `log` INNER JOIN
                    `character` ON
                      `character`.`id` = `log`.`characterId`
                WHERE
                    `log`.`active` = :active 
                    " . $sqlMapType . "
                    " . $sqlDateOffset . "
                GROUP BY
                    `log`.`year`,
                    `log`.`week`,
                    `log`.`characterId`
                ORDER BY
                    `log`.`year` DESC, `log`.`week` DESC";

            $result = $this->getDB()->exec($sql, $queryData);

            if( !empty($result) ){
                // group result by characterId
                foreach ($result as $key => &$entry) {
                    $tmp = $entry;
                    unset($tmp['characterId']);
                    unset($tmp['name']);
                    unset($tmp['lastLogin']);
                    $data[$entry['characterId']]['name'] = $entry['name'];
                    $data[$entry['characterId']]['lastLogin'] = strtotime($entry['lastLogin']);
                    $data[$entry['characterId']]['weeks'][ $entry['year'] . $entry['week'] ] = $tmp;
                }
            }
        }

        return $data;
    }

    /**
     * get statistics data
     * @param \Base $f3
     * @throws \Exception
     */
    public function getData(\Base $f3){
        $postData = (array)$f3->get('POST');
        $return = (object) [];

        $period = $postData['period'];
        $typeId = (int)$postData['typeId'];
        $yearStart = (int)$postData['year'];
        $weekStart = (int)$postData['week'];

        $currentYear = (int)date('o');
        $currentWeek = (int)date('W');

        if(
            $yearStart &&
            $weekStart
        ){
            $weekCount = $this->getWeekCount($period, $yearStart);
        }else{
            // if start date is not set -> calculate it from current data
            $tmpYear = $currentYear;
            if($period == 'yearly'){
                $tmpYear--;
            }
            $weekCount = $this->getWeekCount($period, $tmpYear);
            $offsetStart = $this->calculateYearWeekOffset($currentYear, $currentWeek, $weekCount, true);
            $yearStart = $offsetStart['year'];
            $weekStart = $offsetStart['week'];
        }

        // date offset for statistics query
        $offset = $this->calculateYearWeekOffset($yearStart, $weekStart, $weekCount);

        $activeCharacter = $this->getCharacter();

        $return->statistics = $this->queryStatistic($activeCharacter, $typeId, $yearStart, $weekStart, $offset['year'], $offset['week']);
        $return->period     = $period;
        $return->typeId     = $typeId;
        $return->weekCount  = $weekCount;
        $return->yearWeeks  = [
            $yearStart          => $this->getIsoWeeksInYear($yearStart),
            ($yearStart + 1)    => $this->getIsoWeeksInYear($yearStart + 1)
        ];

        // pagination offset
        $offsetNext         = $this->calculateYearWeekOffset($yearStart, $weekStart, $weekCount + 1);
        $offsetPrev         = $this->calculateYearWeekOffset($yearStart, $weekStart, $weekCount + 1, true);

        // check if "next" button is available (not in future)
        $currentCurrentDataConcat = intval($this->concatYearWeek($currentYear, $currentWeek));
        $offsetNextDateConcat =  intval($this->concatYearWeek($offsetNext['year'], $offsetNext['week']));
        if($offsetNextDateConcat <= $currentCurrentDataConcat){
            $return->next       = $offsetNext;
        }

        $return->prev       = $offsetPrev;
        $return->start      = ['year' => $yearStart, 'week' => $weekStart];
        $return->offset     = $offset;

        echo json_encode($return);
    }
}