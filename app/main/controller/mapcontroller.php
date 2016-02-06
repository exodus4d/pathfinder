<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 21:18
 */

namespace Controller;

class MapController extends \Controller\AccessController {

    public function init($f3) {

        // page title
        $f3->set('pageTitle', 'Maps');

        // main page content
        $f3->set('pageContent', false);

        // body element class
        $f3->set('bodyClass', 'pf-body');

        // set trust attribute to template
        $f3->set('trusted', (int)self::isIGBTrusted());

        // JS main file
        $f3->set('jsView', 'mappage');
    }

} 