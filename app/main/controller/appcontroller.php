<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 28.04.15
 * Time: 21:27
 */

namespace Controller;
use Controller\Ccp as Ccp;

class AppController extends Controller {

    /**
     * event handler after routing
     * @param \Base $f3
     */
    public function afterroute(\Base $f3){
        parent::afterroute($f3);

        // clear all SSO related temp data
        $f3->clear(Ccp\Sso::SESSION_KEY_SSO);
    }

    /**
     * show main login (index) page
     * @param \Base $f3
     */
    public function init(\Base $f3) {
        // page title
        $f3->set('pageTitle', 'Login');

        // main page content
        $f3->set('pageContent', $f3->get('PATHFINDER.VIEW.LOGIN'));

        // body element class
        $f3->set('bodyClass', 'pf-body pf-landing');

        // landing page is always IGB trusted
        $f3->set('trusted', 1);

        // JS main file
        $f3->set('jsView', 'login');
    }

}