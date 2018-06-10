<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 21.04.2018
 * Time: 15:49
 */

namespace Controller\Api;

use Controller;
use Controller\Ccp as Ccp;

class Universe extends Controller\AccessController {

    /**
     * search static Universe data by string within categories
     * @param \Base $f3
     * @param $params
     */
    public function search(\Base $f3, $params){
        $postData = (array)$f3->get('POST');
        $categories = (array)$postData['categories'];
        $universeNameData = [];

        if(
            array_key_exists('arg1', $params) &&
            !empty($search = strtolower($params['arg1'])) &&
            !empty($categories)
        ){
            $universeNameData = Ccp\Universe::searchUniverseNameData($categories, $search);
        }

        echo json_encode($universeNameData);
    }
}