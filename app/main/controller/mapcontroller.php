<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 21:18
 */

namespace Controller;

use lib\Config;
use lib\Resource;


class MapController extends AccessController {

    /**
     * @param \Base $f3
     * @throws \Exception
     */
    public function init(\Base $f3) {
        $resource = Resource::instance();
        $resource->register('script', 'app/mappage');

        $character = $this->getCharacter();

        // characterId
        $f3->set('tplCharacterId', $character->id);

        // page title
        $f3->set('tplPageTitle', $character->name . ' | ' .  Config::getPathfinderData('name'));

        // main page content
        $f3->set('tplPageContent', false);

        // JS main file
        $f3->set('tplJsView', 'mappage');
    }

} 