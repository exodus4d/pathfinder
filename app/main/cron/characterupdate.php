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

    /**
     * delete all character log data
     * >> php index.php "/cron/deleteLogData"
     * @param \Base $f3
     */
    function deleteLogData($f3){
        $logExpire = (int)$f3->get('PATHFINDER.CACHE.CHARACTER_LOG');

        if($logExpire > 0){
            DB\Database::instance()->getDB('PF');

            /**
             * @var $characterLogModel Model\CharacterLogModel
             */
            $characterLogModel = Model\BasicModel::getNew('CharacterLogModel', 0);

            // find expired character logs
            $characterLogs = $characterLogModel->find([
                'TIMESTAMPDIFF(SECOND, updated, NOW() ) > :lifetime',
                ':lifetime' => $logExpire
            ]);

            if(is_object($characterLogs)){
                foreach($characterLogs as $characterLog){
                    $characterLog->erase();
                }
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