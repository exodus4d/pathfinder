<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 21.04.2018
 * Time: 15:49
 */

namespace Exodus4D\Pathfinder\Controller\Api;

use Exodus4D\Pathfinder\Controller;
use Exodus4D\Pathfinder\Controller\Ccp as Ccp;
use Exodus4D\Pathfinder\Model;

class Universe extends Controller\AccessController {

    const PAGE_SIZE_SYSTEMS = 50;

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

    /**
     * get system data for all systems within a constellation
     * @param \Base $f3
     * @param array $params
     * @throws \Exception
     */
    public function constellationData(\Base $f3, $params){
        $constellationId = isset($params['arg1']) ? (int)$params['arg1'] : 0;

        $return = (object) [];
        $return->error = [];
        $return->systemsData = [];

        $constellation = Model\Universe\AbstractUniverseModel::getNew('ConstellationModel');
        $constellation->getById($constellationId);
        if($constellation->valid() && $constellation->systems){
            /**
             * @var Model\Universe\SystemModel $system
             */
            foreach($constellation->systems as $system){
                if($systemData = $system->fromIndex()){
                    $return->systemsData[] = $systemData;
                }
            }
        }

        echo json_encode($return);
    }
}