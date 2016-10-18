<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 01.03.15
 * Time: 18:37
 */

namespace Controller\Api;
use Controller;
use Model;

class Connection extends Controller\AccessController {

    /**
     * @param \Base $f3
     */
    function beforeroute(\Base $f3) {
        // set header for all routes
        header('Content-type: application/json');
        parent::beforeroute($f3);
    }

    /**
     * save a new connection or updates an existing (drag/drop) between two systems
     * if a connection is changed (drag&drop) to another system. -> this function is called for update
     * @param \Base $f3
     */
    public function save(\Base $f3){
        $postData = (array)$f3->get('POST');
        $newConnectionData = [];

        if(
            isset($postData['connectionData']) &&
            isset($postData['mapData'])
        ){
            $mapData = (array)$postData['mapData'];
            $connectionData = (array)$postData['connectionData'];

            $activeCharacter = $this->getCharacter();

            // get map model and check map access
            /**
             * @var Model\MapModel $map
             */
            $map = Model\BasicModel::getNew('MapModel');
            $map->getById( (int)$mapData['id'] );

            if( $map->hasAccess($activeCharacter) ){
                $source = $map->getSystemById( $connectionData['source'] );
                $target = $map->getSystemById( $connectionData['target'] );

                if(
                    !is_null($source) &&
                    !is_null($target)
                ){
                    /**
                     * @var $connection Model\ConnectionModel
                     */
                    $connection = Model\BasicModel::getNew('ConnectionModel');
                    $connection->getById( (int)$connectionData['id'] );

                    // search if systems are neighbors
                    $routeController = new Route();
                    $routeController->initJumpData();
                    $route = $routeController->findRoute($connectionData['sourceName'], $connectionData['targetName'], 1);

                    if($route['routePossible'] == true){
                        // systems are next to each other
                        $connectionData['scope'] = 'stargate';
                        $connectionData['type'] = ['stargate'];
                    }elseif($connectionData['scope'] == 'stargate'){
                        // connection scope changed -> this can not be a stargate
                        $connectionData['scope'] = 'wh';
                        $connectionData['type'] = ['wh_fresh'];
                    }

                    $connectionData['mapId'] = $map;

                    // "updated" should not be set by client e.g. after manual drag&drop
                    unset($connectionData['updated']);

                    $connection->setData($connectionData);

                    if( $connection->isValid() ){
                        $connection->save();

                        $newConnectionData = $connection->getData();
                    }
                }
            }
        }

        echo json_encode($newConnectionData);
    }

    /**
     * delete connection
     * @param \Base $f3
     * @throws \Exception
     */
    public function delete(\Base $f3){
        $connectionIds = $f3->get('POST.connectionIds');
        $activeCharacter = $this->getCharacter();

        /**
         * @var Model\ConnectionModel $connection
         */
        $connection = Model\BasicModel::getNew('ConnectionModel');
        foreach($connectionIds as $connectionId){
            $connection->getById($connectionId);
            $connection->delete( $activeCharacter );

            $connection->reset();
        }

        echo json_encode([]);
    }

} 