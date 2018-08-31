<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 21.03.15
 * Time: 21:59
 */

namespace Controller\Api;
use Controller;
use Model;


class Signature extends Controller\AccessController {

    /**
     * save or update a full signature data set
     * or save/update just single or multiple signature data
     * @param \Base $f3
     * @throws \Exception
     */
    public function save(\Base $f3){
        $requestData = $f3->get('POST');

        $signatureData = null;
        $systemId = (int)$requestData['systemId'];
        // delete all signatures that are not available in this request
        $deleteOldSignatures = (bool)$requestData['deleteOld'];

        $return = (object) [];
        $return->error = [];
        $return->signatures = [];

        if( isset($requestData['signatures']) ){
            // save multiple signatures
            $signatureData = $requestData['signatures'];
        }elseif( !empty($requestData) ){
            // single signature
            $signatureData = [$requestData];
        }

        if( !is_null($signatureData) ){
            $activeCharacter = $this->getCharacter();

            // signature ids that were updated/created
            $updatedSignatureIds = [];

            /**
             * @var Model\SystemModel $system
             */
            $system = Model\BasicModel::getNew('SystemModel');

            // update/add all submitted signatures
            foreach($signatureData as $data){
                $system->getById( (int)$data['systemId'], 0);

                if( !$system->dry() ){
                    // update/save signature

                    /**
                     * @var $signature Model\SystemSignatureModel
                     */
                    $signature = null;
                    if( isset($data['pk']) ){
                        // try to get system by "primary key"
                        $signature = $system->getSignatureById($activeCharacter, (int)$data['pk']);
                    }elseif( isset($data['name']) ){
                        $signature = $system->getSignatureByName($activeCharacter, $data['name']);
                    }

                    if(is_null($signature)){
                        $signature = $system->getNewSignature();
                    }

                    if($signature->dry()){
                        // new signature
                        $signature->copyfrom($data, ['name', 'groupId', 'typeId', 'description', 'connectionId']);
                    }else{
                        // update signature
                        if(
                            isset($data['name']) &&
                            isset($data['value'])
                        ){
                            // update single key => value pair
                            $newData = [
                                $data['name'] => $data['value']
                            ];

                            // if groupId changed
                            if($data['name'] == 'groupId'){
                                //  -> typeId set to 0
                                $newData['typeId'] = 0;
                                //  -> connectionId set to 0
                                $newData['connectionId'] = 0;
                            }

                            // if connectionId changed
                            if($data['name'] == 'connectionId'){
                                $newData['connectionId'] = (int)$newData['connectionId'];
                            }

                        }else{
                            // update complete signature (signature reader dialog)

                            // description should not overwrite existing description
                            if( !empty($signature->description) ){
                                unset( $data['description'] );
                            }

                            // prevent some data from overwrite manually changes
                            // wormhole typeID can not figured out/saved by the sig reader dialog
                            // -> type could not be identified -> do not overwrite them (e.g. sig update)
                            if(
                                $data['groupId'] == 5 ||
                                $data['typeId'] == 0
                            ){
                                unset( $data['typeId'] );
                            }

                            // "sig reader" should not overwrite signature group information
                            if(
                                $data['groupId'] == 0 &&
                                $signature->groupId > 0
                            ){
                                unset($data['groupId']);
                            }

                            $newData = $data;
                        }

                        if( $signature->hasChanged($newData) ){
                            $signature->copyfrom($newData, ['name', 'groupId', 'typeId', 'description', 'connectionId']);
                        }
                    }

                    $system->saveSignature($signature, $activeCharacter);

                    $updatedSignatureIds[] = $signature->_id;
                    $return->signatures[] = $signature->getData();

                    $signature->reset();
                }

                $system->reset();
            }

            // delete "old" signatures ------------------------------------------------------------------
            if(
                $deleteOldSignatures &&
                $systemId
            ){
                $system->getById($systemId);
                if(
                    !$system->dry() &&
                    $system->hasAccess($activeCharacter)
                ){
                    $allSignatures = $system->getSignatures();
                    foreach($allSignatures as $tempSignature){
                        if( !in_array($tempSignature->_id, $updatedSignatureIds)){
                            $tempSignature->delete( $activeCharacter );
                        }
                    }
                }
            }
        }

        echo json_encode($return);
    }

    /**
     * delete signatures
     * @param \Base $f3
     * @throws \Exception
     */
    public function delete(\Base $f3){
        $signatureIds = array_unique(array_map('intval', (array)$f3->get('POST.signatureIds')));
        $activeCharacter = $this->getCharacter();

        $return = (object) [];
        $return->deletedSignatureIds = [];

        /**
         * @var Model\SystemSignatureModel $signature
         */
        $signature = Model\BasicModel::getNew('SystemSignatureModel');
        foreach($signatureIds as $signatureId){
            $signature->getById($signatureId);
            if($signature->delete($activeCharacter)){
                $return->deletedSignatureIds[] = $signatureId;
            }
            $signature->reset();
        }

        echo json_encode($return);
    }

} 