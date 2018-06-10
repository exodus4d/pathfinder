<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 24.04.2018
 * Time: 22:23
 */

namespace Controller\Api;

use Controller;
use Model;
use Exception;

class Structure extends Controller\AccessController {

    /**
     * save/update structure
     * @param \Base $f3
     * @throws Exception
     */
    public function save(\Base $f3){
        $requestData = (array)$f3->get('POST');
        $structuresData = (array)$requestData['structures'];
        $return = (object) [];
        $return->error = [];

        if($structuresData){
            $activeCharacter = $this->getCharacter();

            if($activeCharacter->hasCorporation()){
                // structures always belong to a corporation
                /**
                 * @var $structure Model\StructureModel
                 */
                $structure = Model\BasicModel::getNew('StructureModel');
                foreach ($structuresData as $structureData){
                    // reset on loop start because of potential "continue"
                    $structure->reset();

                    if(!empty($structureData['id']) && $structureId = (int)$structureData['id']){
                        // update specific structure
                        $structure->getById($structureId);
                        if( !$structure->hasAccess($activeCharacter) ){
                            continue;
                        }
                    }elseif( !isset($structureData['id']) ){
                        // from clipboard -> search by structure by name
                        $structure->getByName($activeCharacter->getCorporation(), (string)$structureData['name']);
                    }

                    $newStructure = $structure->dry();

                    try{
                        $structure->copyfrom($structureData, ['structureId', 'corporationId', 'systemId', 'statusId', 'name', 'description']);
                        $structure->save();

                        if($newStructure){
                            $activeCharacter->getCorporation()->saveStructure($structure);
                        }

                        // group all updated structures by corporation -> just for return
                        $corporationsStructureData = $structure->getDataByCorporations();
                        foreach($corporationsStructureData as $corporationId => $corporationStructureData){
                            if(isset($return->structures[$corporationId])){
                                $return->structures[$corporationId]['structures'] = array_merge(
                                    $return->structures[$corporationId]['structures'],
                                    $corporationStructureData['structures']
                                );
                            }else{
                                $return->structures[$corporationId] = $corporationStructureData;
                            }
                        }
                    }catch(Exception\ValidationException $e){
                        $return->error[] = $e->getError();
                    }
                }
            }
        }

        echo json_encode($return);
    }

    /**
     * delete structure
     * @param \Base $f3
     * @throws Exception
     */
    public function delete(\Base $f3){
        $structureData = (array)$f3->get('POST');
        $structureId = (int)$structureData['id'];

        $return = (object) [];

        if($structureId){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $structure Model\StructureModel
             */
            $structure = Model\BasicModel::getNew('StructureModel');
            $structure->getById($structureId);
            if($structure->hasAccess($activeCharacter) && $structure->erase()){
                $return->deletedStructureIds = [$structureId];
            }

        }

        echo json_encode($return);
    }
}