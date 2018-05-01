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
        $structureData = (array)$f3->get('POST');
        $activeCharacter = $this->getCharacter();

        $return = (object) [];
        $return->error = [];

        /**
         * @var $structure Model\StructureModel
         */
        $structure = Model\BasicModel::getNew('StructureModel');
        $structure->getById((int)$structureData['id']);

        if($structure->dry() || $structure->hasAccess($activeCharacter)){
            $newStructure = $structure->dry();
            try{
                $structure->copyfrom($structureData, ['structureId', 'corporationId', 'systemId', 'statusId', 'name', 'description']);
                $structure->save();

                if($newStructure){
                    $activeCharacter->getCorporation()->saveStructure($structure);
                }
                $return->structures = $structure->getDataByCorporations();
            }catch(Exception\ValidationException $e){
                $return->error[] = $e->getError();
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