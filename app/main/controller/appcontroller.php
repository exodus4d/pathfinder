<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 28.04.15
 * Time: 21:27
 */

namespace Controller;


class AppController extends Controller {

    public function showLandingpage($f3) {

        // main page content
        $f3->set('pageContent','templates/view/parts/landingpage.html');

        // body element class
        $this->f3->set('bodyClass', 'pf-body pf-landing');

        // splash page is always IGB trusted
        $f3->set('trusted', 1);

        // JS main file
        $f3->set('jsView', 'app/landingpage');

        $this->setTemplate('templates/view/index.html');
    }

} 