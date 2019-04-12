<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 16.03.2019
 * Time: 23:29
 */

namespace Controller\Api\Rest;


use Model\Pathfinder;

class Structure extends AbstractRestController {

    /**
     * @param \Base $f3
     * @throws \Exception
     */
    public function post(\Base $f3){
        $requestData = $this->getRequestData($f3);
        $structuresData = $requestData ? $this->update($requestData) : [];
        $this->out($structuresData);
    }

    /**
     * @param \Base $f3
     * @throws \Exception
     */
    public function put(\Base $f3){
        $requestData = $this->getRequestData($f3);
        $structuresData = $requestData ? $this->update([$requestData]) : [];
        $this->out($structuresData);
    }

    /**
     * @param \Base $f3
     * @param $params
     * @throws \Exception
     */
    public function patch(\Base $f3, $params){
        $requestData = $this->getRequestData($f3);
        $structuresData = (($structureId = (int)$params['id']) && ($structureId == (int)$requestData['id'])) ? $this->update([$requestData]) : [];
        $this->out($structuresData);
    }

    /**
     * @param \Base $f3
     * @param $params
     * @throws \Exception
     */
    public function delete(\Base $f3, $params){
        $deletedStructureIds = [];

        if($structureId = (int)$params['id']){
            $activeCharacter = $this->getCharacter();
            /**
             * @var $structure Pathfinder\StructureModel
             */
            $structure = Pathfinder\AbstractPathfinderModel::getNew('StructureModel');
            $structure->getById($structureId);
            if($structure->hasAccess($activeCharacter) && $structure->erase()){
                $deletedStructureIds[] = $structureId;
            }
        }
        $this->out($deletedStructureIds);
    }

    /**
     * @param array $structuresData
     * @return array
     * @throws \Exception
     */
    private function update(array $structuresData) : array {
        $data = [];

        $activeCharacter = $this->getCharacter();
        if($activeCharacter->hasCorporation()){
            // structures always belong to a corporation
            /**
             * @var $structure Pathfinder\StructureModel
             */
            $structure = Pathfinder\AbstractPathfinderModel::getNew('StructureModel');
            foreach($structuresData as $structureData){
                // reset on loop start because of potential "continue"
                $structure->reset();

                if(!empty($structureData['id']) && $structureId = (int)$structureData['id']){
                    // update specific structure
                    $structure->getById($structureId);
                    if(!$structure->hasAccess($activeCharacter)){
                        continue;
                    }
                }elseif(!isset($structureData['id'])){
                    // from clipboard -> search by structure by name
                    $structure->getByName($activeCharacter->getCorporation(), (string)$structureData['name'], (int)$structureData['systemId']);
                }

                $isNew = $structure->dry();

                $structure->setData($structureData);
                $structure->save();

                if($isNew){
                    $activeCharacter->getCorporation()->saveStructure($structure);
                }

                // group all updated structures by corporation -> just for return
                $corporationsStructureData = $structure->getDataByCorporations();
                foreach($corporationsStructureData as $corporationId => $corporationStructureData){
                    if(isset($data[$corporationId])){
                        $data[$corporationId]['structures'] = array_merge(
                            $data[$corporationId]['structures'],
                            $corporationStructureData['structures']
                        );
                    }else{
                        $data[$corporationId] = $corporationStructureData;
                    }
                }
            }
        }

        return $data;
    }
}