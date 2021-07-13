<?php


namespace Exodus4D\Pathfinder\Controller\Api\Rest;

use Exodus4D\Pathfinder\Model;

class SystemSearch extends AbstractRestController {

    /**
     * system data properties that will be returned
     * -> filter system data, save bandwidth
     */
    const SYSTEM_DATA_KEYS = ['id', 'name', 'trueSec', 'security', 'effect', 'shattered'];

    /**
     * max results per page
     */
    const PAGE_SIZE_SYSTEMS = 50;

    /**
     * @param \Base $f3
     * @param       $params
     * @throws \Exception
     */
    public function get(\Base $f3, $params){
        $requestData = $this->getRequestData($f3);
        $morePages = false;
        $count = 0;

        $result = (object) [];
        $result->results = [];

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

        if(strlen($search = (string)$params['id']) >= 3){
            $page = max((int)$requestData['page'],1);
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

            /**
             * @var Model\Universe\SystemModel[] $systems
             */
            $systems = $system->find($filter, $options);
            if($systems){
                $allowedKeys = array_flip(self::SYSTEM_DATA_KEYS);
                foreach($systems as $system){
                    if($systemData = $system->fromIndex()){
                        $result->results[] = (object)array_intersect_key((array)$systemData, $allowedKeys);
                    }
                }
            }
        }

        $result->pagination = ['more' => $morePages, 'count' => $count];

        $this->out($result);
    }
}