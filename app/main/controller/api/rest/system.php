<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 09.11.2018
 * Time: 12:34
 */

namespace Controller\Api\Rest;

use Model;

class System extends AbstractRestController {

    /**
     * put (insert) system
     * @param \Base $f3
     * @throws \Exception
     */
    public function put(\Base $f3){
        $requestData = $this->getRequestData($f3);
        $systemData = [];

        if($mapId = (int)$requestData['mapId']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $map Model\MapModel
             */
            $map = Model\BasicModel::getNew('MapModel');
            $map->getById($mapId);
            if($map->hasAccess($activeCharacter)){
                $system = $map->getNewSystem($requestData['systemId']);
                $systemData = $this->update($system, $requestData)->getData();
            }
        }

        $this->out($systemData);
    }

    /**
     * update existing system
     * @param \Base $f3
     * @param $params
     * @throws \Exception
     */
    public function patch(\Base $f3, $params){
        $requestData = $this->getRequestData($f3);
        $systemData = [];

        if($systemId = (int)$params['id']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $system Model\SystemModel
             */
            $system = Model\BasicModel::getNew('SystemModel');
            $system->getById($systemId);

            if($system->hasAccess($activeCharacter)){
                $systemData = $this->update($system, $requestData)->getData();
            }
        }

        $this->out($systemData);
    }

    /**
     * @param \Base $f3
     * @param $params
     * @throws \ZMQSocketException
     * @throws \Exception
     */
    public function delete(\Base $f3, $params){
        $requestData = $this->getRequestData($f3);
        $systemIds = array_map('intval', explode(',', (string)$params['id']));
        $deletedSystemIds = [];

        if($mapId = (int)$requestData['mapId']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var Model\MapModel $map
             */
            $map = Model\BasicModel::getNew('MapModel');
            $map->getById($mapId);

            if($map->hasAccess($activeCharacter)){
                $newSystemModel = Model\BasicModel::getNew('SystemModel');
                foreach($systemIds as $systemId){
                    if($system = $map->getSystemById($systemId)){
                        // check whether system should be deleted OR set "inactive"
                        if($this->checkDeleteMode($map, $system)){
                            // delete log
                            // -> first set updatedCharacterId -> required for activity log
                            $system->updatedCharacterId = $activeCharacter;
                            $system->update();

                            // ... now get fresh object and delete..
                            $newSystemModel->getById($system->_id, 0);
                            $newSystemModel->erase();
                            $newSystemModel->reset();
                        }else{
                            // keep data -> set "inactive"
                            $system->setActive(false);
                            $system->save($activeCharacter);
                        }

                        $system->reset();

                        $deletedSystemIds[] = $systemId;
                    }
                }
                // broadcast map changes
                if(count($deletedSystemIds)){
                    $this->broadcastMapData($map);
                }
            }
        }

        $this->out($deletedSystemIds);
    }

    // ----------------------------------------------------------------------------------------------------------------

    /**
     * update system with new data
     * @param Model\SystemModel $system
     * @param array $systemData
     * @return Model\SystemModel
     * @throws \ZMQSocketException
     * @throws \Exception
     */
    private function update(Model\SystemModel $system, array $systemData) : Model\SystemModel {
        $activeCharacter = $this->getCharacter();

        // statusId === 0  is 'auto' status -> keep current status
        // -> relevant systems that already have a status (inactive systems)
        if( (int)$systemData['statusId'] <= 0 ){
            unset($systemData['statusId']);
        }

        if( !$system->dry() ){
            // activate system (e.g. was inactive))
            $system->setActive(true);
        }

        $system->setData($systemData);
        $system->save($activeCharacter);

        // get data from "fresh" model (e.g. some relational data has changed: "statusId")
        /**
         * @var $newSystem Model\SystemModel
         */
        $newSystem = Model\BasicModel::getNew('SystemModel');
        $newSystem->getById($system->_id, 0);
        $newSystem->clearCacheData();

        // broadcast map changes
        $this->broadcastMapData($newSystem->mapId);

        return $newSystem;
    }

    /**
     * checks whether a system should be "deleted" or set "inactive" (keep some data)
     * @param Model\MapModel $map
     * @param Model\SystemModel $system
     * @return bool
     */
    private function checkDeleteMode(Model\MapModel $map, Model\SystemModel $system) : bool {
        $delete = true;

        if( !empty($system->description) ){
            // never delete systems with custom description set!
            $delete = false;
        }elseif(
            $map->persistentAliases &&
            !empty($system->alias) &&
            ($system->alias != $system->name)
        ){
            // map setting "persistentAliases" is active (default) AND
            // alias is set and != name
            $delete = false;
        }

        return $delete;
    }

}