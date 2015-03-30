<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.02.15
 * Time: 23:30
 */

namespace Controller;
use Model;

class AccessController extends Controller {

    function __construct() {
        parent::__construct();
    }

    /**
     * event handler
     */
    function beforeroute() {

        $isLoggedIn = $this->_isLoggedIn();

        if($isLoggedIn){
            $accessRoute = true;
        }else{
            $userName = 'user_exodus';
            $password = 'password';

            // try to verify user
            $accessRoute = $this->_verifyUser($userName, $password);

            if(!$accessRoute){
                // add new User
                try{
                    $this->_registerUser($userName, $password);
                }catch(\Exception\ValidationException $e){
                    // registration failed
                    $this->f3->error($e->getCode(), $e->getMessage());
                }
            }
        }


        if(
            !$this->f3->get('AJAX') &&
            !$accessRoute
        ){
            $this->f3->reroute('/login');
        }

        parent::beforeroute();

    }

    /**
     * stores a new user in database
     * @param $username
     * @param $password
     * @return null
     */
    private function _registerUser($username, $password){

        $user = Model\BasicModel::getNew('UserModel');

        $user->name = $username;
        $user->password = $user::generatePasswordHash($password);
        $user->save();

        return $user;
    }

    /**
     * verifies weather a given username and password is valid
     * @param $userName
     * @param $password
     * @return bool
     */
    private function _verifyUser($userName, $password) {

        $verify = false;

        $user =  Model\BasicModel::getNew('UserModel');

        $user->getByName($userName);

        $isValid = $user->verify($password);

        if($isValid === true){
            $this->_logIn($user);
            $verify = true;
        }

        return $verify;
    }

    /**
     * checks weather a user is currently logged in
     * @return bool
     */
    private function _isLoggedIn(){

        $loggedIn = false;

        if($this->f3->get('SESSION.user.time') > 0){
            // check logIn time
            $logInTime = new \DateTime();
            $logInTime->setTimestamp($this->f3->get('SESSION.user.time'));
            $now = new \DateTime();

            $timeDiff = $now->diff($logInTime);

            $minutes = $timeDiff->days * 60 * 24 * 60;
            $minutes += $timeDiff->h * 60;
            $minutes += $timeDiff->i;

            if($minutes <= $this->f3->get('LOGIN_TIME')){
                $loggedIn = true;
            }else{
                // log out
                // get user model
                $user = Model\BasicModel::getNew('UserModel');
                $user->getById($this->f3->get('SESSION.user.id'));

                if(! $user->dry()){
                    $this->_logOut($user);
                }
            }
        }

        return $loggedIn;
    }

    /**
     * @param $user
     */
    private function _logOut($user){
        $this->f3->clear('SESSION');
    }

    /**
     * log user in by mapper obj
     * @param $user
     */
    private function _logIn($user){
        // user verified -> set Session login
        $dateTime = new \DateTime();
        $this->f3->set('SESSION.user.time', $dateTime->getTimestamp());
        $this->f3->set('SESSION.user.name', $user->name);
        $this->f3->set('SESSION.user.id', $user->id);

        // update/check api data
        $this->_updateCharacterData();
    }

    /**
     *
     * @return bool|null
     */
    protected function _getUser(){

        $user = Model\BasicModel::getNew('UserModel', 5);
        $user->getById($this->f3->get('SESSION.user.id'));

        if($user->dry()){
            $user = false;
        }

        return $user;
    }

    /**
     * updates character data for all characters the current user has
     * API access
     * @return bool
     */
    protected function _updateCharacterData(){
        $user = $this->_getUser();

        $characters = false;

        if($user){
            $apiController = new CcpApiController();
            $apiController->addUser($user);
            $characters = $apiController->updateCharacterData();
        }

        return $characters;
    }


}