<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.02.15
 * Time: 23:30
 */

namespace Controller;
use Controller\Api as Api;
use Model;

class AccessController extends Controller {

    /**
     * event handler
     * @param \Base $f3
     */
    function beforeroute(\Base $f3) {
        parent::beforeroute($f3);

        // Any CMS route of a child class of this one, requires a
        // valid logged in user!
        $loginCheck = $this->checkLogIn($f3);

        if( !$loginCheck ){
            // no user found or LogIn timer expired
            $this->logOut($f3);
        }
    }

    /**
     * checks weather a user is currently logged in
     * @param \Base $f3
     * @return bool
     */
    private function checkLogIn($f3){
        $loginCheck = false;

        if($f3->get(Api\User::SESSION_KEY_CHARACTER_TIME) > 0){
            // check logIn time
            $logInTime = new \DateTime();
            $logInTime->setTimestamp( $f3->get(Api\User::SESSION_KEY_CHARACTER_TIME) );
            $now = new \DateTime();

            $timeDiff = $now->diff($logInTime);

            $minutes = $timeDiff->days * 60 * 24 * 60;
            $minutes += $timeDiff->h * 60;
            $minutes += $timeDiff->i;

            if($minutes <= $f3->get('PATHFINDER.TIMER.LOGGED')){
                $loginCheck = true;
            }
        }

        return $loginCheck;
    }

}