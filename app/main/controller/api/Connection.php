<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 01.03.15
 * Time: 18:37
 */

namespace Controller\Api;
use Model;

class Connection extends \Controller\AccessController{

    /**
     * event handler
     */
    function beforeroute() {

        parent::beforeroute();

        // set header for all routes
        header('Content-type: application/json');
    }

    /**
     * save a new connection or updates an existing (drag/drop) between two systems
     * @param $f3
     */
    public function save($f3){
        $postData = (array)$f3->get('POST');
        $newConnectionData = [];

        if(
            isset($postData['connectionData']) &&
            isset($postData['mapData'])
        ){
            $mapData = (array)$postData['mapData'];
            $connectionData = (array)$postData['connectionData'];

            $user = $this->_getUser();

            if($user){
                // get map model
                $map = Model\BasicModel::getNew('MapModel');
                $map->getById( (int)$mapData['id'] );

                // get source model (system)
                $source = Model\BasicModel::getNew('SystemModel');
                $source->getById( (int)$connectionData['source'] );

                // get target model (system)
                $target = Model\BasicModel::getNew('SystemModel');
                $target->getById( (int)$connectionData['target'] );

                // map model and systeme are required for a new connection!
                if(
                    !$map->dry() &&
                    !$source->dry() &&
                    !$target->dry()
                ){
                    $connection = Model\BasicModel::getNew('ConnectionModel');
                    $connection->getById( (int)$connectionData['id'] );
                    $connection->mapId = $map;
                    $connection->source = $source;
                    $connection->target = $target;

                    if(
                        $connection->isValid() &&
                        $connection->hasAccess($user)
                    ){
                        $connection->save();
                        $newConnectionData = $connection->getData();
                    }
                }


            }
        }

        echo json_encode($newConnectionData);
    }

    public function delete($f3){
        $connectionIds = $f3->get('POST.connectionIds');

        $user = $this->_getUser();
        $connection = Model\BasicModel::getNew('ConnectionModel');

        foreach($connectionIds as $connectionId){

            $connection->getById($connectionId);
            $connection->delete($user);

            $connection->reset();
        }

        echo json_encode([]);
    }

} 