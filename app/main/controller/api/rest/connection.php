<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 10.11.2018
 * Time: 12:10
 */

namespace Controller\Api\Rest;

use Model\Pathfinder;

class Connection extends AbstractRestController {

    /**
     * save a new connection or updates an existing (drag/drop) between two systems
     * if a connection is changed (drag&drop) to another system. -> this function is called for update
     * @param \Base $f3
     * @throws \Exception
     */
    public function put(\Base $f3){
        $requestData = $this->getRequestData($f3);
        $connectionData = [];

        if($mapId = (int)$requestData['mapId']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $map Pathfinder\MapModel
             */
            $map = Pathfinder\AbstractPathfinderModel::getNew('MapModel');
            $map->getById($mapId);
            if($map->hasAccess($activeCharacter)){
                $source = $map->getSystemById((int)$requestData['source']);
                $target = $map->getSystemById((int)$requestData['target']);

                if(
                    !is_null($source) &&
                    !is_null($target)
                ){
                    /**
                     * @var $connection Pathfinder\ConnectionModel
                     */
                    $connection = Pathfinder\AbstractPathfinderModel::getNew('ConnectionModel');
                    $connection->getById((int)$requestData['id']);

                    $connection->mapId = $map;
                    $connection->source = $source;
                    $connection->target = $target;
                    $connection->copyfrom($connectionData, ['scope', 'type']);

                    // change the default type for the new connection
                    $connection->setDefaultTypeData();

                    if($connection->save($activeCharacter)){
                        $connectionData = $connection->getData();

                        // broadcast map changes
                        $this->broadcastMap($connection->mapId);
                    }
                }
            }
        }

        $this->out($connectionData);
    }

    /**
     * @param \Base $f3
     * @param $params
     * @throws \Exception
     */
    public function delete(\Base $f3, $params){
        $requestData = $this->getRequestData($f3);
        $connectionIds = array_map('intval', explode(',', (string)$params['id']));
        $deletedConnectionIds = [];

        if($mapId = (int)$requestData['mapId']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $map Pathfinder\MapModel
             */
            $map = Pathfinder\AbstractPathfinderModel::getNew('MapModel');
            $map->getById($mapId);
            if($map->hasAccess($activeCharacter)){
                foreach($connectionIds as $connectionId){
                    if($connection = $map->getConnectionById($connectionId)){
                        if($connection->delete($activeCharacter)){
                            $deletedConnectionIds[] = $connectionId;
                        }
                        $connection->reset();
                    }
                }

                // broadcast map changes
                if(count($deletedConnectionIds)){
                    $this->broadcastMap($map);
                }
            }
        }

        $this->out($deletedConnectionIds);
    }
}