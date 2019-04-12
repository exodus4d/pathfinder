<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 21.04.2018
 * Time: 15:49
 */

namespace Controller\Api;

use Controller;
use Controller\Ccp as Ccp;
use Model;

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
     * search systems by name
     * @param \Base $f3
     * @param $params
     * @throws \Exception
     */
    public function systems(\Base $f3, $params){
        $getData = (array)$f3->get('GET');
        $page = isset($getData['page']) ? (int)max($getData['page'],1) : 1;
        $search = isset($params['arg1']) ? (string)$params['arg1'] : '';
        $morePages = false;
        $count = 0;

        $return = (object) [];
        $return->results = [];

        // some "edge cases" for testing trueSec rounding...
        //$searchToken = 'H472-N'; // -0.000001 -> 0.0
        //$searchToken = 'X1E-OQ'; // -0.099426 -> -0.10
        //$searchToken = 'BKK4-H'; // -0.049954 -> -0.05
        //$searchToken = 'Uhtafal'; // 0.499612 -> 0.5 (HS)
        //$searchToken = 'Oshaima'; // 0.453128 -> 0.5 (HS)
        //$searchToken = 'Ayeroilen'; // 0.446568 -> 0.4 (LS)
        //$searchToken = 'Enderailen'; // 0.448785 -> 0.4 (LS)
        //$searchToken = 'Neziel'; // 0.449943 -> 0.4 (LS)
        //$searchToken = 'Naga'; // 0.033684 -> 0.1 (LS)

        if( strlen($search) >= 3 ){
            $offset = ($page - 1) * self::PAGE_SIZE_SYSTEMS;
            $system = Model\Universe\AbstractUniverseModel::getNew('SystemModel');

            $filter = [
                'id LIKE :id OR name LIKE :name',
                ':id'   => $search . '%',           // -> match first
                ':name' => '%' . $search . '%'      // -> match between
            ];
            $options = [
                'order' => 'name',
                'offset' => $offset,
                'limit' => self::PAGE_SIZE_SYSTEMS
            ];
            $count = $system->count($filter);
            $endCount = $offset + self::PAGE_SIZE_SYSTEMS;
            $morePages = $endCount < $count;

            $systems = $system->find($filter, $options);
            if($systems){
                foreach($systems as $system){
                    if($systemData = $system->fromIndex()){
                        $return->results[] = $systemData;
                    }
                }
            }
        }

        $return->pagination = ['more' => $morePages, 'count' => $count];

        echo json_encode($return);
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
        if( !$constellation->dry() && $constellation->systems){
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