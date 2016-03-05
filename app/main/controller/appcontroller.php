<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 28.04.15
 * Time: 21:27
 */

namespace Controller;


class AppController extends Controller {

    /**
     * show main login (index) page
     * @param $f3
     */
    public function init($f3) {
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