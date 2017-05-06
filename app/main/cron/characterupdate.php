<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 30.07.2015
 * Time: 19:35
 */

namespace cron;
use DB;
use Model;


class CharacterUpdate {

    const CHARACTER_LOG_ACTIVE = 300;
    const CHARACTER_LOG_INACTIVE = 300;

    /**
     * get "active" time for character log data in seconds
     * -> get default value in case of nothing found in *.ini file
     * @param \Base $f3
     * @return int
     */
    protected function getCharacterLogActiveTime($f3){
        $logActiveTime = (int)$f3->get('PATHFINDER.CACHE.CHARACTER_LOG_ACTIVE');
        return ($logActiveTime >= 0) ? $logActiveTime : self::CHARACTER_LOG_ACTIVE;
    }

    /**
     * get "incactive" time for character log data in seconeds
     * @param \Base $f3
     * @return int
     */
    protected function getCharacterLogInactiveTime($f3){
        $logInactiveTime =  (int)$f3->get('PATHFINDER.CACHE.CHARACTER_LOG_INACTIVE');
        return ($logInactiveTime >= 0) ? $logInactiveTime : self::CHARACTER_LOG_INACTIVE;
    }

    /**
     * set character log data as inactive in case of not changed within X seconds
     * >> php index.php "/cron/deactivateLogData"
     * @param \Base $f3
     */
    function deactivateLogData($f3){
        DB\Database::instance()->getDB('PF');
        $logActiveTime = $this->getCharacterLogActiveTime($f3);

        /**
         * @var $characterLogModel Model\CharacterLogModel
         */
        $characterLogModel = Model\BasicModel::getNew('CharacterLogModel', 0);

        // find expired character logs
        $characterLogs = $characterLogModel->find([
            'active = :active AND TIMESTAMPDIFF(SECOND, updated, NOW() ) > :lifetime',
            ':active' => 1,
            ':lifetime' => $logActiveTime
        ]);

        if(is_object($characterLogs)){
            foreach($characterLogs as $characterLog){
                /**
                 * @var $characterLog Model\CharacterLogModel
                 */
                $characterLog->setActive(false);
                $characterLog->save();
            }
        }
    }

    /**
     * delete all character log data that were set to "active = 0"  after X seconds of no changes
     * -> see deactivateLogData()
     * >> php index.php "/cron/deleteLogData"
     * @param \Base $f3
     */
    function deleteLogData($f3){
        DB\Database::instance()->getDB('PF');
        $logInactiveTime = $this->getCharacterLogInactiveTime($f3);

        /**
         * @var $characterLogModel Model\CharacterLogModel
         */
        $characterLogModel = Model\BasicModel::getNew('CharacterLogModel', 0);

        // find expired character logs
        $characterLogs = $characterLogModel->find([
            'active = :active AND TIMESTAMPDIFF(SECOND, updated, NOW() ) > :lifetime',
            ':active' => 0,
            ':lifetime' => $logInactiveTime
        ]);

        if(is_object($characterLogs)){
            foreach($characterLogs as $characterLog){
                /**
                 * @var $characterLog Model\CharacterLogModel
                 */
                $characterLog->erase();
            }
        }
    }

    /**
     * delete expired character authentication data
     * authentication data is used for cookie based login
     * >> php index.php "/cron/deleteAuthenticationData"
     * @param \Base $f3
     */
    function deleteAuthenticationData($f3){
        DB\Database::instance()->getDB('PF');

        /**
         * @var $authenticationModel Model\CharacterAuthenticationModel
         */
        $authenticationModel = Model\BasicModel::getNew('CharacterAuthenticationModel', 0);

        // find expired authentication data
        $authentications = $authenticationModel->find([
            '(expires - NOW()) <= 0'
        ]);

        if(is_object($authentications)){
            foreach($authentications as $authentication){
                $authentication->erase();
            }
        }
    }

}