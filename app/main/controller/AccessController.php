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
     * @param $f3
     */
    function beforeroute($f3) {

        $loginCheck = $this->_checkLogIn();

        if( !$loginCheck ){
            // no user found or LogIn timer expired
            $this->logOut($f3);
        }

        parent::beforeroute($f3);
    }

    /**
     * checks weather a user is currently logged in
     * @return bool
     */
    private function _checkLogIn(){

        $loginCheck = false;

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
                $loginCheck = true;
            }
        }

        return $loginCheck;
    }

}