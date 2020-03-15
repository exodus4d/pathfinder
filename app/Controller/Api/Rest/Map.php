<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 12.03.2020
 * Time: 19:30
 */

namespace Exodus4D\Pathfinder\Controller\Api\Rest;


use Exodus4D\Pathfinder\Lib\Config;
use Exodus4D\Pathfinder\Model\Pathfinder;

class Map extends AbstractRestController {

    /**
     * error message missing character right for map delete
     */
    const ERROR_MAP_DELETE = 'Character %s does not have sufficient rights for map delete';

    /**
     * @param \Base $f3
     * @param       $test
     * @throws \Exception
     */
    public function put(\Base $f3, $test){
        $requestData = $this->getRequestData($f3);

        /**
         * @var $map Pathfinder\MapModel
         */
        $map = Pathfinder\AbstractPathfinderModel::getNew('MapModel');
        $mapData = $this->update($map, $requestData)->getData();

        $this->out($mapData);
    }

    /**
     * @param \Base $f3
     * @param       $params
     * @throws \Exception
     */
    public function patch(\Base $f3, $params){
        $requestData = $this->getRequestData($f3);
        $mapData = [];

        if($mapId = (int)$params['id']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $map Pathfinder\MapModel
             */
            $map = Pathfinder\AbstractPathfinderModel::getNew('MapModel');
            $map->getById($mapId);
            if($map->hasAccess($activeCharacter)){
                $mapData = $this->update($map, $requestData)->getData(true);
            }
        }

        $this->out($mapData);
    }

    /**
     * @param \Base $f3
     * @param       $params
     * @throws \Exception
     */
    public function delete(\Base $f3, $params){
        $deletedMapIds = [];

        if($mapId = (int)$params['id']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $map Pathfinder\MapModel
             */
            $map = Pathfinder\AbstractPathfinderModel::getNew('MapModel');
            $map->getById($mapId);

            if($map->hasAccess($activeCharacter)){
                // check if character has delete right for map type
                $hasRight = true;
                if($map->isCorporation()){
                    if($corpRight = $activeCharacter->getCorporation()->getRights(['map_delete'])){
                        if($corpRight[0]->get('roleId', true) !== $activeCharacter->get('roleId', true)){
                            $hasRight = false;
                        }
                    }
                }

                if($hasRight){
                    $map->setActive(false);
                    $map->save($activeCharacter);
                    $deletedMapIds[] = $mapId;
                    // broadcast map delete
                    $this->broadcastMapDeleted($mapId);
                }else{
                    $f3->set('HALT', true);
                    $f3->error(401, sprintf(self::ERROR_MAP_DELETE, $activeCharacter->name));
                }
            }
        }

        $this->out($deletedMapIds);
    }

    /**
     * @param Pathfinder\MapModel $map
     * @param array               $mapData
     * @return Pathfinder\MapModel
     * @throws \Exception
     */
    private function update(Pathfinder\MapModel $map, array $mapData) : Pathfinder\MapModel {
        $activeCharacter = $this->getCharacter();

        $map->setData($mapData);
        $typeChange = $map->changed('typeId');
        $map->save($activeCharacter);

        // save global map access. Depends on map "type" --------------------------------------------------------------
        /**
         * @param Pathfinder\AbstractPathfinderModel $primaryModel
         * @param array|null                         $modelIds
         * @param int                                $maxShared
         * @return int
         */
        $setMapAccess = function(Pathfinder\AbstractPathfinderModel &$primaryModel, ?array $modelIds = [], int $maxShared = 3) use (&$map) : int {
            $added = 0;
            $deleted = 0;
            if(is_array($modelIds)){
                // remove primaryModel id (-> re-add later)
                $modelIds = array_diff(array_map('intval', $modelIds), [$primaryModel->_id]);

                // avoid abuse -> respect share limits (-1 is because the primaryModel has also access)
                $modelIds = array_slice($modelIds, 0, max($maxShared - 1, 0));

                // add the primaryModel id back (again)
                $modelIds[] = $primaryModel->_id;

                // clear map access for entities that do not match the map "mapType"
                $deleted += $map->clearAccessByType();

                $compare = $map->compareAccess($modelIds);

                foreach((array)$compare['old'] as $modelId) {
                    $deleted += $map->removeFromAccess($modelId);
                }

                $modelClass = (new \ReflectionClass($primaryModel))->getShortName();
                $tempModel = Pathfinder\AbstractPathfinderModel::getNew($modelClass);
                foreach((array)$compare['new'] as $modelId) {
                    $tempModel->getById($modelId);
                    if(
                        $tempModel->valid() &&
                        (
                            $modelId == $primaryModel->_id ||   // primary model has always access (regardless of "shared" value)
                            $tempModel->shared == 1             // check if map shared is enabled
                        )
                    ){
                        $added += (int)$map->setAccess($tempModel);
                    }

                    $tempModel->reset();
                }
            }
            return $added + $deleted;
        };

        $accessChangeCount = 0;
        $mapDefaultConf = Config::getMapsDefaultConfig();
        if($map->isPrivate()){
            $accessChangeCount = $setMapAccess(
                $activeCharacter,
                $typeChange ? [$activeCharacter->_id] : $mapData['mapCharacters'],
                (int)$mapDefaultConf['private']['max_shared']
            );
        }elseif($map->isCorporation()){
            if($corporation = $activeCharacter->getCorporation()){
                $accessChangeCount = $setMapAccess(
                    $corporation,
                    $typeChange ? [$corporation->_id] : $mapData['mapCorporations'],
                    (int)$mapDefaultConf['corporation']['max_shared']
                );
            }
        }elseif($map->isAlliance()){
            if($alliance = $activeCharacter->getAlliance()){
                $accessChangeCount = $setMapAccess(
                    $alliance,
                    $typeChange ? [$alliance->_id] : $mapData['mapAlliances'],
                    (int)$mapDefaultConf['alliance']['max_shared']
                );
            }
        }

        if($accessChangeCount){
            $map->touch('updated');
            $map->save($activeCharacter);
        }

        // reload the same map model (refresh)
        // this makes sure all data is up2date
        $map->getById($map->_id, 0);

        // broadcast map Access -> and send map Data
        $this->broadcastMapAccess($map);

        return $map;
    }

    /**
     * broadcast characters with map access rights to WebSocket server
     * -> if characters with map access found -> broadcast mapData to them
     * @param Pathfinder\MapModel $map
     * @throws \Exception
     */
    protected function broadcastMapAccess(Pathfinder\MapModel $map){
        $mapAccess =  [
            'id' => $map->_id,
            'name' => $map->name,
            'characterIds' => array_map(function($data){
                return $data->id;
            }, $map->getCharactersData())
        ];

        $this->getF3()->webSocket()->write('mapAccess', $mapAccess);

        // map has (probably) active connections that should receive map Data
        $this->broadcastMap($map, true);
    }

    /**
     * broadcast map delete information to clients
     * @param int $mapId
     */
    private function broadcastMapDeleted(int $mapId){
        $this->getF3()->webSocket()->write('mapDeleted', $mapId);
    }
}