<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 24.05.2015
 * Time: 17:42
 */

namespace Controller\Api;

use Controller;
use Model\Pathfinder;

class Access extends Controller\AccessController {


    /**
     * search character/corporation or alliance by name
     * @param \Base $f3
     * @param $params
     * @throws \Exception
     */
    public function search($f3, $params){
        $accessData = [];

        if(
            array_key_exists('arg1', $params) &&
            array_key_exists('arg2', $params)
        ){
            $searchType = strtolower($params['arg1']);
            $searchToken = strtolower($params['arg2']);

            $accessModel = null;
            switch($searchType){
                case 'character':
                    $accessModel = Pathfinder\AbstractPathfinderModel::getNew('CharacterModel');
                    break;
                case 'corporation':
                    $accessModel = Pathfinder\AbstractPathfinderModel::getNew('CorporationModel');
                    break;
                case 'alliance':
                    $accessModel = Pathfinder\AbstractPathfinderModel::getNew('AllianceModel');
                    break;
            }

            if( is_object($accessModel) ){

                // find "active" entries that have their "sharing" option activated
                $accessList = $accessModel->find( [
                    "LOWER(name) LIKE :token AND " .
                    "active = 1 AND " .
                    "shared = 1 ",
                    ':token' => '%' . $searchToken . '%'
                ]);

                if($accessList){
                    foreach($accessList as $accessObject){
                        $accessData[] = $accessObject->getData();
                    }
                }
            }
        }

        echo json_encode($accessData);
    }

}