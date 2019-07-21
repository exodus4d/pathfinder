<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.02.15
 * Time: 20:43
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;
use Controller;
use Controller\Api\User as User;
use Exception;
use lib\Config;
use lib\logging;

class UserModel extends AbstractPathfinderModel {

    /**
     * @var string
     */
    protected $table = 'user';

    /**
     * @var array
     */
    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'index' => true,
            'validate' => true
        ],
        'email' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'validate' => true
        ],
        'userCharacters' => [
            'has-many' => ['Model\Pathfinder\UserCharacterModel', 'userId']
        ]
    ];

    /**
     * get all data for this user
     * -> ! caution ! this function returns sensitive data! (e.g. email,..)
     * -> user getSimpleData() for faster performance and public user data
     * @return \stdClass
     * @throws Exception
     */
    public function getData() : \stdClass {

        // get public user data for this user
        $userData = $this->getSimpleData();

        // add sensitive user data
        $userData->email = $this->email;

        // all chars
        $userData->characters = [];
        $characters = $this->getCharacters();
        foreach($characters as $character){
            /**
             * @var $character CharacterModel
             */
            $userData->characters[] = $character->getData();
        }

        // get active character with log data
        $activeCharacter = $this->getActiveCharacter();
        $userData->character = $activeCharacter->getData(true, true);

        return $userData;
    }

    /**
     * get public user data
     * - check out getData() for all user data
     * @return \stdClass
     */
    public function getSimpleData() : \stdClass{
        $userData = (object) [];
        $userData->id = $this->id;
        $userData->name = $this->name;

        return $userData;
    }

    /**
     * check if new user registration is allowed
     * @param UserModel $self
     * @param $pkeys
     * @return bool
     * @throws Exception\RegistrationException
     */
    public function beforeInsertEvent($self, $pkeys) : bool {
        $registrationStatus = Controller\Controller::getRegistrationStatus();
        switch($registrationStatus){
            case 0:
                throw new Exception\RegistrationException('User registration is currently not allowed');
                break;
            case 1:
                return true;
                break;
            default:
                return false;
        }
    }

    /**
     * @param self $self
     * @param $pkeys
     */
    public function afterEraseEvent($self, $pkeys){
        $this->sendDeleteMail();
    }

    /**
     * send delete confirm mail to  this user
     */
    protected function sendDeleteMail(){
        if($this->isMailSendEnabled()){
            $log = new Logging\UserLog('userDelete', $this->getLogChannelData());
            $log->addHandler('mail', 'mail', $this->getSMTPConfig());
            $log->setMessage('Delete Account - {channelName}');
            $log->setData([
                'message' =>'Your account was successfully deleted.'
            ]);
            $log->buffer();
        }
    }

    /**
     * checks whether user has a valid email address and pathfinder has a valid SMTP config
     * @return bool
     */
    protected function isMailSendEnabled() : bool {
        return Config::isValidSMTPConfig($this->getSMTPConfig());
    }

    /**
     * get SMTP config for this user
     * @return \stdClass
     */
    protected function getSMTPConfig() : \stdClass {
        $config = Config::getSMTPConfig();
        $config->to = $this->email;
        return $config;
    }

    /**
     * validate name column
     * @param string $key
     * @param string $val
     * @return bool
     * @throws Exception\ValidationException
     */
    protected function validate_name(string $key, string $val) : bool {
        $valid = true;
        if(
            mb_strlen($val) < 3 ||
            mb_strlen($val) > 80
        ){
            $valid = false;
            $this->throwValidationException($key);
        }
        return $valid;
    }

    /**
     * validate email column
     * @param string $key
     * @param string $val
     * @return bool
     * @throws Exception\ValidationException
     */
    protected function validate_email(string $key, string $val) : bool {
        $valid = true;
        if ( !empty($val) && \Audit::instance()->email($val) == false ){
            $valid = false;
            $this->throwValidationException($key);
        }
        return $valid;
    }

    /**
     * check whether this character has already a user assigned to it
     * @return bool
     */
    public function hasUserCharacters() : bool {
        $this->filter('userCharacters', ['active = ?', 1]);
        return is_object($this->userCharacters);
    }

    /**
     * get current character data from session
     * -> if $characterId == 0 -> get first character data (random)
     * @param int $characterId
     * @param bool $objectCheck
     * @return array
     * @throws Exception
     */
    public function getSessionCharacterData($characterId = 0, $objectCheck = true) : array {
        $data = [];
        $characterId = (int)$characterId;
        $currentSessionUser = (array)$this->getF3()->get(User::SESSION_KEY_USER);

        if($this->_id === $currentSessionUser['ID']){
            // user matches session data
            if($characterId > 0){
                $data = $this->findSessionCharacterData($characterId);
            }elseif(
                is_array($sessionCharacters = $this->getF3()->get(User::SESSION_KEY_CHARACTERS)) && // check for null
                !empty($sessionCharacters)
            ){
                // no character was requested ($requestedCharacterId = 0) AND session characters were found
                // -> get first matched character (e.g. user open /login browser tab)
                $data = $sessionCharacters[0];
            }
        }

        if(
            $objectCheck === true &&
            !empty($data)
        ){
            // check if character still exists on DB (e.g. was manually removed in the meantime)
            // -> This should NEVER happen just for security and "local development"
            /**
             * @var $character CharacterModel
             */
            $character = AbstractPathfinderModel::getNew('CharacterModel');
            $character->getById((int)$data['ID']);

            if(
                $character->dry() ||
                !$character->hasUserCharacter()
            ){
                // character data is invalid!
                $data = [];
            }
        }

        return $data;
    }

    /**
     * search in session data for $characterId
     * @param int $characterId
     * @return array
     */
    public function findSessionCharacterData(int $characterId) : array {
        $data = [];
        if($characterId){
            $sessionCharacters = (array)$this->getF3()->get(User::SESSION_KEY_CHARACTERS);
            // search for specific characterData
            foreach($sessionCharacters as $characterData){
                if($characterId === (int)$characterData['ID']){
                    $data = $characterData;
                    break;
                }
            }
        }
        return $data;
    }

    /**
     * get all userCharacters models for a user
     * characters will be checked/updated on login by CCP API call
     * @return UserCharacterModel[]
     */
    public function getUserCharacters(){
        $this->filter('userCharacters', ['active = ?', 1]);

        $userCharacters = [];
        if($this->userCharacters){
            $userCharacters = $this->userCharacters;
        }

        return $userCharacters;
    }

    /**
     * get the current active character for this user
     * -> EITHER - the current active one for the current user
     * -> OR - get the first active one
     * @return null|CharacterModel
     * @throws Exception
     */
    public function getActiveCharacter() : ?CharacterModel {
        $activeCharacter = null;
        $controller = new Controller\Controller();
        $currentActiveCharacter = $controller->getCharacter();

        if(
            !is_null($currentActiveCharacter) &&
            $currentActiveCharacter->getUser()->_id === $this->id
        ){
            $activeCharacter = &$currentActiveCharacter;
        }else{
            // set "first" found as active for this user
            if($activeCharacters = $this->getActiveCharacters()){
                $activeCharacter = $activeCharacters[0];
            }
        }

        return $activeCharacter;
    }

    /**
     * get all characters for this user
     * @return CharacterModel[]
     */
    public function getCharacters() : array {
        $characters = [];
        $userCharacters = $this->getUserCharacters();

        foreach($userCharacters as $userCharacter){
            /**
             * @var $userCharacter UserCharacterModel
             */
            if( $currentCharacter = $userCharacter->getCharacter() ){
                // check if userCharacter has a valid character
                // -> this should never fail!
                $characters[] = $currentCharacter;
            }
        }

        return $characters;
    }

    /**
     * get all active characters (with log entry)
     * hint: a user can have multiple active characters
     * @return CharacterModel[]
     */
    public function getActiveCharacters() : array {
        $activeCharacters = [];

        foreach($this->getUserCharacters() as $userCharacter){
            /**
             * @var $userCharacter UserCharacterModel
             */
            $characterModel = $userCharacter->getCharacter();
            if($characterLog = $characterModel->getLog()){
                $activeCharacters[] = $characterModel;
            }
        }

        return $activeCharacters;
    }

    /**
     * get object relevant data for model log channel
     * @return array
     */
    public function getLogChannelData() : array{
        return [
            'channelId' => $this->_id,
            'channelName' => $this->name
        ];
    }


} 