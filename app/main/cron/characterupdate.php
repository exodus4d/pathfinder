<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 30.07.2015
 * Time: 19:35
 */

namespace Cron;


use Model\Pathfinder;

class CharacterUpdate extends AbstractCron {

    /**
     * default character_log time until a log entry get re-checked by cronjob
     */
    const CHARACTER_LOG_INACTIVE            =   180;

    /**
     * max count of "inactive" character log data that will be checked for offline status
     */
    const CHARACTERS_UPDATE_LOGS_MAX        =   10;

    /**
     * get "inactive" time for character log data in seconds
     * @param \Base $f3
     * @return int
     */
    protected function getCharacterLogInactiveTime(\Base $f3){
        $logInactiveTime = (int)$f3->get('PATHFINDER.CACHE.CHARACTER_LOG_INACTIVE');
        return ($logInactiveTime >= 0) ? $logInactiveTime : self::CHARACTER_LOG_INACTIVE;
    }

    /**
     * delete all character log data that have not changed since X seconds
     * -> see deactivateLogData()
     * >> php index.php "/cron/deleteLogData"
     * @param \Base $f3
     * @throws \Exception
     */
    function deleteLogData(\Base $f3){
        $this->setMaxExecutionTime();
        $logInactiveTime = $this->getCharacterLogInactiveTime($f3);

        /**
         * @var $characterLogModel Pathfinder\CharacterLogModel
         */
        $characterLogModel = Pathfinder\AbstractPathfinderModel::getNew('CharacterLogModel');

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
                 * @var $characterLog Pathfinder\CharacterLogModel
                 */
                if(is_object($characterLog->characterId)){
                    if($accessToken = $characterLog->characterId->getAccessToken()){
                        if($this->isOnline($accessToken)){
                            // force characterLog as "updated" even if no changes were made
                            $characterLog->touch('updated');
                            $characterLog->save();
                        }else{
                            $characterLog->erase();
                        }
                    }
                }else{
                    // character_log does not have a character assigned -> delete
                    $characterLog->erase();
                }
            }
        }
    }

    /**
     * clean up outdated character data e.g. kicked until status
     * >> php index.php "/cron/cleanUpCharacterData"
     * @param \Base $f3
     * @throws \Exception
     */
    function cleanUpCharacterData(\Base $f3){
        $this->setMaxExecutionTime();

        /**
         * @var $characterModel Pathfinder\CharacterModel
         */
        $characterModel = Pathfinder\AbstractPathfinderModel::getNew('CharacterModel');

        $characters = $characterModel->find([
            'active = :active AND TIMESTAMPDIFF(SECOND, kicked, NOW() ) > 0',
            ':active' => 1
        ]);

        if(is_object($characters)){
            foreach($characters as $character){
                /**
                 * @var $character Pathfinder\CharacterModel
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
     * @throws \Exception
     */
    function deleteAuthenticationData(\Base $f3){
        $this->setMaxExecutionTime();

        /**
         * @var $authenticationModel Pathfinder\CharacterAuthenticationModel
         */
        $authenticationModel = Pathfinder\AbstractPathfinderModel::getNew('CharacterAuthenticationModel');

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