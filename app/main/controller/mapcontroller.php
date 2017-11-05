<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 21:18
 */

namespace Controller;

use lib\Config;


class MapController extends AccessController {

    /**
     * @param \Base $f3
     */
    public function init(\Base $f3) {
        $character = $this->getCharacter();

        // page title
        $f3->set('tplPageTitle', $character->name . ' | ' .  Config::getPathfinderData('name'));

        // main page content
        $f3->set('tplPageContent', false);

        // JS main file
        $f3->set('tplJsView', 'mappage');
    }

} 