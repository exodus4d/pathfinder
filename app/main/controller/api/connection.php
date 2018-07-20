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
     * save a new connection or updates an existing (drag/drop) between two systems
     * if a connection is changed (drag&drop) to another system. -> this function is called for update
     * @param \Base $f3
     * @throws \Exception
     */
    public function save(\Base $f3){
        $postData = (array)$f3->get('POST');

        $return = (object) [];
        $return->error = [];
        $return->connectionData = (object) [];

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

                    $connection->mapId = $map;
                    $connection->source = $source;
                    $connection->target = $target;
                    $connection->copyfrom($connectionData, ['scope', 'type']);

                    // change the default type for the new connection
                    $connection->setDefaultTypeData();

                    if($connection->save($activeCharacter)){
                        $return->connectionData = $connection->getData();

                        // broadcast map changes
                        $this->broadcastMapData($connection->mapId);
                    }else{
                        $return->error = $connection->getErrors();
                    }
                }
            }
        }

        echo json_encode($return);
    }

    /**
     * delete connection
     * @param \Base $f3
     * @throws \Exception
     */
    public function delete(\Base $f3){
        $mapId = (int)$f3->get('POST.mapId');
        $connectionIds = (array)$f3->get('POST.connectionIds');

        if($mapId){
            $activeCharacter = $this->getCharacter();

            /**
             * @var Model\MapModel $map
             */
            $map = Model\BasicModel::getNew('MapModel');
            $map->getById($mapId);

            if( $map->hasAccess($activeCharacter) ){
                foreach($connectionIds as $connectionId){
                    if( $connection = $map->getConnectionById($connectionId) ){
                        $connection->delete( $activeCharacter );

                        $connection->reset();
                    }
                }

                // broadcast map changes
                $this->broadcastMapData($map);
            }

        }

        echo json_encode([]);
    }

} 