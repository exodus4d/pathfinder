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

        $accessRoute = $this->_isLoggedIn();

            /*
            $userName = 'user_exodus';
            $password = '1234567';

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
        */


        if(
            !$this->f3->get('AJAX') &&
            !$accessRoute
        ){
            $this->f3->reroute('@landing');
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
        $user->password = $password;
        $user->save();

        return $user;
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
                    $this->logOut();
                }
            }
        }

        return $loggedIn;
    }





}