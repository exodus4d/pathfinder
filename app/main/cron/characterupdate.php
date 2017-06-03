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

    const CHARACTER_LOG_INACTIVE            =   300;

    /**
     * max count of "inactive" character log data that will be checked for offline status
     */
    const CHARACTERS_UPDATE_LOGS_MAX        =   20;

    /**
     * get "inactive" time for character log data in seconds
     * @param \Base $f3
     * @return int
     */
    protected function getCharacterLogInactiveTime(\Base $f3){
        $logInactiveTime =  (int)$f3->get('PATHFINDER.CACHE.CHARACTER_LOG_INACTIVE');
        return ($logInactiveTime >= 0) ? $logInactiveTime : self::CHARACTER_LOG_INACTIVE;
    }

    /**
     * delete all character log data that were set to "active = 0"  after X seconds of no changes
     * -> see deactivateLogData()
     * >> php index.php "/cron/deleteLogData"
     * @param \Base $f3
     */
    public function deleteLogData(\Base $f3){
        DB\Database::instance()->getDB('PF');
        $logInactiveTime = $this->getCharacterLogInactiveTime($f3);

        /**
         * @var $characterLogModel Model\CharacterLogModel
         */
        $characterLogModel = Model\BasicModel::getNew('CharacterLogModel', 0);

        // find character logs that were not checked recently and update
        $characterLogs = $characterLogModel->find([
            'TIMESTAMPDIFF(SECOND, updated, NOW() ) > :lifetime',
            ':lifetime' => $logInactiveTime
        ], [
            'order' => 'updated asc',
            'limit' => self::CHARACTERS_UPDATE_LOGS_MAX
        ]);

        if(is_object($characterLogs)){
            foreach($characterLogs as $characterLog){
                /**
                 * @var $characterLog Model\CharacterLogModel
                 */
                // force characterLog as "updated" even if no changes were made
                $characterLog->characterId->updateLog([
                    'markUpdated' =>  true,
                    'suppressHTTPErrors' => true
                ]);
            }
        }
    }

    /**
     * clean up outdated character data e.g. kicked until status
     * >> php index.php "/cron/cleanUpCharacterData"
     * @param \Base $f3
     */
    public function cleanUpCharacterData(\Base $f3){
        DB\Database::instance()->getDB('PF');

        /**
         * @var $characterModel Model\CharacterModel
         */
        $characterModel = Model\BasicModel::getNew('CharacterModel', 0);

        $characters = $characterModel->find([
            'active = :active AND TIMESTAMPDIFF(SECOND, kicked, NOW() ) > 0',
            ':active' => 1
        ]);


        if(is_object($characters)){
            foreach($characters as $character){
                /**
                 * @var $character Model\CharacterModel
                 */
                $character->kick();
                $character->save();
            }
        }
    }

    /**
     * delete expired character authentication data
     * authentication data is used for cookie based login
     * >> php index.php "/cron/deleteAuthenticationData"
     * @param \Base $f3
     */
    public function deleteAuthenticationData($f3){
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