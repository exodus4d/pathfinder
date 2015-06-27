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
     * show the main landing page
     * @param $f3
     */
    public function showLandingpage($f3) {

        // main page content
        $f3->set('pageContent','templates/view/landingpage.html');

        // body element class
        $this->f3->set('bodyClass', 'pf-body pf-landing');

        // landing page is always IGB trusted
        $f3->set('trusted', 1);

        // JS main file
        $f3->set('jsView', 'landingpage');

        // check if user is in game
        $f3->set('isIngame', self::isIGB() );
        $this->f3->set('igbTest', 123 );

        $this->setTemplate('templates/view/index.html');
    }

} 