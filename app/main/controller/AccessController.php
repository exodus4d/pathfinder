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

            if($minutes <= $this->f3->get('PATHFINDER.TIMER.LOGGED')){
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

    /**
     * get error object is a user is not found/logged of
     * @return object
     */
    protected function getUserLoggedOffError(){
        $userError = (object) [];
        $userError->type = 'error';
        $userError->message = 'User not found';

        return $userError;
    }

}