<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 21:18
 */

namespace Controller;

class MapController extends AccessController {

    /**
     * @param \Base $f3
     */
    public function init($f3) {
        $character = $this->getCharacter();

        // page title
        $pageTitle = $character ? $character->name : 'Map';
        $f3->set('pageTitle', $pageTitle);

        // main page content
        $f3->set('pageContent', false);

        // body element class
        $f3->set('bodyClass', 'pf-body');

        // JS main file
        $f3->set('jsView', 'mappage');
    }

} 