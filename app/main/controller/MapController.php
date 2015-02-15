<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 21:18
 */

namespace Controller;

class MapController extends AccessController {

    function __construct() {
        parent::__construct();
    }

    public function showMap() {
        $this->setTemplate('templates/view/map.html');

    }
} 