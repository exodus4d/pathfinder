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

        // Any route/endpoint of a child class of this one,
        // requires a valid logged in user!
        $loginCheck = $this->checkLogTimer($f3);

        if( !$loginCheck ){
            // no user found or LogIn timer expired
            $this->logOut($f3);
        }
    }

}