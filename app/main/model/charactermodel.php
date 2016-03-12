<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 11.04.15
 * Time: 15:20
 */

namespace Model;

use Controller\Ccp;
use DB\SQL\Schema;

class CharacterModel extends BasicModel {

    protected $table = 'character';

    protected $fieldConf = [
        'lastLogin' => [
            'type' => Schema::DT_TIMESTAMP,
            'index' => true
        ],
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'ownerHash' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'crestAccessToken' => [
            'type' => Schema::DT_VARCHAR256
        ],
        'crestAccessTokenUpdated' => [
            'type' => Schema::DT_TIMESTAMP,
            'default' => Schema::DF_CURRENT_TIMESTAMP,
            'index' => true
        ],
        'crestRefreshToken' => [
            'type' => Schema::DT_VARCHAR256
        ],
        'corporationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\CorporationModel',
            'constraint' => [
                [
                    'table' => 'corporation',
                    'on-delete' => 'SET NULL'
                ]
            ]
        ],
        'allianceId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\AllianceModel',
            'constraint' => [
                [
                    'table' => 'alliance',
                    'on-delete' => 'SET NULL'
                ]
            ]
        ],
        'factionId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'factionName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'userCharacter' => [
            'has-one' => ['Model\UserCharacterModel', 'characterId']
        ],
        'characterLog' => [
            'has-one' => ['Model\CharacterLogModel', 'characterId']
        ]
    ];

    /**
     * get character data
     * @param bool|false $addCharacterLogData
     * @return \stdClass
     */
    public function getData($addCharacterLogData = false){

        // check if there is cached data
        // temporary disabled (performance test)
        $characterData = $this->getCacheData();

        if(is_null($characterData)){
            // no cached character data found
            $characterData = (object) [];
            $characterData->id = $this->id;
            $characterData->name = $this->name;

            if($addCharacterLogData){
                if($logModel = $this->getLog()){
                    $characterData->log = $logModel->getData();
                }
            }

            // check for corporation
            if($corporation = $this->getCorporation()){
                $characterData->corporation = $corporation->getData();
            }

            // check for alliance
            if($alliance = $this->getAlliance()){
                $characterData->alliance = $alliance->getData();
            }

            // max caching time for a system
            // the cached date has to be cleared manually on any change
            // this includes system, connection,... changes (all dependencies)
            $this->updateCacheData($characterData, '', 300);
        }

        return $characterData;
    }

    /**
     * set unique "ownerHash" for this character
     * -> Hash will change when  character is transferred (sold)
     * @param string $ownerHash
     * @return string
     */
    public function set_ownerHash($ownerHash){
        if (
            $this->hasUserCharacter() &&
            $this->ownerHash !== $ownerHash
        ){
            $this->userCharacter->erase();
        }
        return $ownerHash;
    }

    /**
     * set CREST accessToken for current session
     * -> update "tokenUpdated" column on change
     * -> this is required for expire checking!
     * @param string $accessToken
     * @return string
     */
    public function set_crestAccessToken($accessToken){
        if($this->crestAccessToken !== $accessToken){
            $this->touch('crestAccessTokenUpdated');
        }
        return $accessToken;
    }

    /**
     * check whether this character has already a user assigned to it
     * @return bool
     */
    public function hasUserCharacter(){
        return is_object($this->userCharacter);
    }

    /**
     * check whether this character has a corporation
     * @return bool
     */
    public function hasCorporation(){
        return is_object($this->corporationId);
    }

    /**
     * check whether this character has an alliance
     * @return bool
     */
    public function hasAlliance(){
        return is_object($this->allianceId);
    }

    /**
     * @return UserModel|null
     */
    public function getUser(){
        $user = null;
        if($this->hasUserCharacter()){
            /**
             * @var $user UserModel
             */
            $user = $this->userCharacter->userId;
        }
        return $user;
    }

    /**
     * get the corporation for this user
     * @return \Model\CorporationModel|null
     */
    public function getCorporation(){
        return $this->corporationId;
    }

    /**
     * get the alliance of this user
     * @return \Model\AllianceModel|null
     */
    public function getAlliance(){
        return $this->allianceId;
    }

    /**
     * get CREST API "access_token" from OAuth
     * @return bool|string
     */
    private function getAccessToken(){
        $accessToken = false;

        // check if there is already an "accessToken" for this user
        // check expire timer for stored "accessToken"
        if(
            !empty($this->crestAccessToken) &&
            !empty($this->crestAccessTokenUpdated)
        ){
            $timezone = new \DateTimeZone( $this->getF3()->get('TZ') );
            $tokenTime = \DateTime::createFromFormat(
                'Y-m-d H:i:s',
                $this->crestAccessTokenUpdated,
                $timezone
            );
            // add expire time buffer for this "accessToken"
            // token should be marked as "deprecated" BEFORE it actually expires.
            $timeBuffer = 2 * 60;
            $tokenTime->add(new \DateInterval('PT' . (Ccp\Sso::ACCESS_KEY_EXPIRE_TIME - $timeBuffer) . 'S'));

            $now = new \DateTime('now', $timezone);
            if($tokenTime->getTimestamp() > $now->getTimestamp()){
                $accessToken = $this->crestAccessToken;
            }
        }

        // if no "accessToken" was found -> get a fresh one by an existing "refreshToken"
        if(
            !$accessToken &&
            !empty($this->crestRefreshToken)
        ){
            // no accessToken found OR token is deprecated
            $ssoController = new Ccp\Sso();
            $accessData =  $ssoController->refreshAccessToken($this->crestRefreshToken);

            if(
                isset($accessData->accessToken) &&
                isset($accessData->refreshToken)
            ){
                $this->crestAccessToken = $accessData->accessToken;
                $this->save();

                $accessToken = $this->crestAccessToken;
            }
        }

        return $accessToken;
    }

    /**
     * checks whether this character is authorized to log in
     * -> check corp/ally whitelist config (pathfinder.ini)
     * @return bool
     */
    public function isAuthorized(){
        $isAuthorized = false;
        $f3 = self::getF3();

        $whitelistCorporations = $whitelistAlliance = [];
        if( !empty($f3->get('PATHFINDER.LOGIN.CORPORATION')) ){
            $whitelistCorporations = array_map('trim',(array) $f3->get('PATHFINDER.LOGIN.CORPORATION') );
        }
        if( !empty($f3->get('PATHFINDER.LOGIN.ALLIANCE')) ){
            $whitelistAlliance = array_map('trim',(array) $f3->get('PATHFINDER.LOGIN.ALLIANCE') );
        }

        if(
            empty($whitelistCorporations) &&
            empty($whitelistAlliance)
        ){
            // no corp/ally restrictions set -> any character is allowed to login
            $isAuthorized = true;
        }else{
            // check if character corporation is set in whitelist
            if(
                !empty($whitelistCorporations) &&
                $this->hasCorporation() &&
                in_array($this->getCorporation()->_id, $whitelistCorporations)
            ){
                $isAuthorized = true;
            }

            // check if character alliance is set in whitelist
            if(
                !$isAuthorized &&
                !empty($whitelistAlliance) &&
                $this->hasAlliance() &&
                in_array($this->getAlliance()->_id, $whitelistAlliance)
            ){
                $isAuthorized = true;
            }
        }

        return $isAuthorized;
    }

    /**
     * update character log (active system, ...)
     * -> CREST API request for character log data
     * @return CharacterModel
     */
    public function updateLog(){

        $characterModel = $this;
        $ssoController = new Ccp\Sso();

        $locationData = $ssoController->getCharacterLocationData($this->getAccessToken());

        if( empty((array)$locationData) ){
            // character is not in-game
            if(is_object($this->characterLog)){
                // delete existing log
                $this->characterLog->erase();
                $characterModel = $this->save();
            }
        }else{
            // character is currently in-game
            if( !$characterLog = $this->getLog() ){
                // create new log
                $characterLog = $this->rel('characterLog');
                $characterLog->characterId = $this;
            }
            $characterLog->setData($locationData);
            $characterLog->save();
            $this->characterLog = $characterLog;
            $characterModel = $this->save();
        }

        return $characterModel;
    }

    /**
     * get the character log entry for this character
     * @return bool|CharacterLogModel
     */
    public function getLog(){

        $characterLog = false;
        if(
            is_object($this->characterLog) &&
            !$this->characterLog->dry()
        ){
            $characterLog = $this->characterLog;
        }

        return $characterLog;
    }

} 