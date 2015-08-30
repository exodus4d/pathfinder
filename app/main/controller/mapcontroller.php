<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 21:18
 */

namespace Controller;

class MapController extends \Controller\AccessController {

    function __construct() {
        parent::__construct();
    }


    public function showMap($f3) {

        $f3->set('pageContent', false);

        // body element class
        $this->f3->set('bodyClass', 'pf-body');

        // set trust attribute to template
        $this->f3->set('trusted', (int)self::isIGBTrusted());

        // JS main file
        $this->f3->set('jsView', 'mappage');

         $this->setTemplate('templates/view/index.html');
    }

} 