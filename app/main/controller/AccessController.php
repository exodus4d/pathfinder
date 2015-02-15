<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.02.15
 * Time: 23:30
 */

namespace Controller;

use Model\User;

class AccessController extends Controller {

    function __construct() {
        parent::__construct();
    }

    /**
     * event handler
     */
    function beforeroute() {

        parent::beforeroute();

        if($this->isLoggedIn()){
            $accessRoute = true;
        }else{
            // try to verify user
            $accessRoute = $this->verify('exodus 4d', 'test');
        }

        if(!$accessRoute){
            $this->f3->reroute('/login');
        }

    }

    /**
     * verifies weather a given username and password is valid
     * @param $userName
     * @param $password
     * @return bool
     */
    private function verify($userName, $password) {

        $verify = false;

        // check if user is already logged in
        $isLoggedId = $this->isLoggedIn();

        if($isLoggedId){
            $verify = true;
        }else{
            $user = new \Model\UserModel($this->f3->get('DB'));

            $auth = new \Auth($user, array('id' => 'name', 'pw' => 'password'));
            $loginResult = $auth->login($userName, $password);

            if($loginResult){
                // login

                // two step user authentication
                $user->getByAuth($userName, $password);

                if(! $user->dry()){
                    $this->logIn($user);
                    $verify = true;
                }
            }
        }

        return $verify;
    }

    /**
     * checks weather a user is currently logged in
     * @return bool
     */
    private function isLoggedIn(){

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
                $user = new \Model\UserModel($this->f3->get('DB'));
                $user->getById($this->f3->get('SESSION.user.id'));

                if(! $user->dry()){
                    $this->logOut($user);
                }
            }
        }

        return $loggedIn;
    }

    /**
     * @param $user
     */
    private function logOut($user){
        $this->f3->clear('SESSION.user');
    }

    /**
     * log user in by mapper obj
     * @param $user
     */
    private function logIn($user){
        // user verified -> set Session login
        new \DB\SQL\Session($this->f3->get('DB'));

        $dateTime = new \DateTime();
        $this->f3->set('SESSION.user.time', $dateTime->getTimestamp());
        $this->f3->set('SESSION.user.name', $user->name);
        $this->f3->set('SESSION.user.name', $user->name);
    }


}