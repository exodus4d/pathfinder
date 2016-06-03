<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.02.15
 * Time: 20:43
 */

namespace Model;

use DB\SQL\Schema;
use Controller;
use Controller\Api;
use Exception;

class UserModel extends BasicModel {

    protected $table = 'user';

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
            'index' => true
        ],
        'email' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'userCharacters' => [
            'has-many' => ['Model\UserCharacterModel', 'userId']
        ]
    ];

    protected $validate = [
        'name' => [
            'length' => [
                'min' => 3,
                'max' => 50
            ]
        ]
    ];

    /**
     * get all data for this user
     * -> ! caution ! this function returns sensitive data! (e.g. email,..)
     * -> user getSimpleData() for faster performance and public user data
     * @return \stdClass
     */
    public function getData(){

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
        $userData->character = $activeCharacter->getData(true);

        return $userData;
    }

    /**
     * get public user data
     * - check out getData() for all user data
     * @return \stdClass
     */
    public function getSimpleData(){
        $userData = (object) [];
        $userData->id = $this->id;
        $userData->name = $this->name;

        return $userData;
    }

    /**
     * validate and set a email address for this user
     * -> empty email is allowed!
     * @param string $email
     * @return string
     */
    public function set_email($email){
        if (
            !empty($email) &&
            \Audit::instance()->email($email) == false
        ) {
            // no valid email address
            $this->throwValidationError('email');
        }
        return $email;
    }

    /**
     * check if new user registration is allowed
     * @return bool
     * @throws Exception\RegistrationException
     */
    public function beforeInsertEvent(){
        $registrationStatus = Controller\Controller::getRegistrationStatus();

        switch($registrationStatus){
            case 0:
                $f3 = self::getF3();
                throw new Exception\RegistrationException($f3->get('PATHFINDER.REGISTRATION.MSG_DISABLED'));
                return false;
                break;
            case 1:
                return true;
                break;
            default:
                return false;
        }
    }

    /**
     * search for user by unique username
     * @param $name
     * @return array|FALSE
     */
    public function getByName($name){
        return $this->getByForeignKey('name', $name, [], 0);
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
     */
    public function getActiveCharacter(){
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
    public function getCharacters(){
        $userCharacters = $this->getUserCharacters();
        $characters = [];
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
    public function getActiveCharacters(){
        $userCharacters = $this->getUserCharacters();

        $activeCharacters = [];
        foreach($userCharacters as $userCharacter){
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

} 