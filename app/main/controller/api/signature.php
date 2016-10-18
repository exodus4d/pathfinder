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
     * event handler
     * @param \Base $f3
     */
    function beforeroute(\Base $f3) {
        // set header for all routes
        header('Content-type: application/json');
        parent::beforeroute($f3);
    }

    /**
     * get signature data for systems
     * -> return value of this is limited to a "SINGLE" system
     * @param \Base $f3
     */
    public function getAll(\Base $f3){
        $signatureData = [];
        $systemIds = (array)$f3->get('POST.systemIds');

        if( !empty($systemIds) ){
            $activeCharacter = $this->getCharacter();

            /**
             * @var Model\SystemModel $system
             */
            $system = Model\BasicModel::getNew('SystemModel');
            foreach($systemIds as $systemId){
                $system->getById($systemId);
                if(
                    !$system->dry() &&
                    $system->hasAccess($activeCharacter)
                ){
                    $signatureData = $system->getSignaturesData();
                }

                $system->reset();
            }
        }

        echo json_encode($signatureData);
    }

    /**
     * save or update a full signature data set
     * or save/update just single or multiple signature data
     * @param \Base $f3
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
                // this key should not be saved (it is an obj)
                unset($data['updated']);

                $system->getById( (int)$data['systemId']);

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

                    if( is_null($signature) ){
                        $signature = Model\BasicModel::getNew('SystemSignatureModel');
                    }

                    if($signature->dry()){
                        // new signature
                        $signature->systemId = $system;
                        $signature->updatedCharacterId = $activeCharacter;
                        $signature->createdCharacterId = $activeCharacter;
                        $signature->setData($data);
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

                            // if groupID changed -> typeID set to 0
                            if($data['name'] == 'groupId'){
                                $newData['typeId'] = 0;
                            }

                        }else{
                            // update complete signature (signature reader dialog)

                            // systemId should not be updated
                            unset( $data['systemId'] );

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
                            // Character should only be changed if something else has changed
                            $signature->updatedCharacterId = $activeCharacter;
                            $signature->setData($newData);
                        }
                    }

                    $signature->save();
                    $updatedSignatureIds[] = $signature->id;

                    // get a fresh signature object with the new data. This is a bad work around!
                    // but i could not figure out what the problem was when using the signature model, saved above :(
                    // -> some caching problems
                    /**
                     * @var $newSignature Model\SystemSignatureModel
                     */
                    $newSignature = Model\BasicModel::getNew('SystemSignatureModel');
                    $newSignature->getById( $signature->id, 0);

                    $return->signatures[] = $newSignature->getData();

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
                        if( !in_array($tempSignature->id, $updatedSignatureIds)){
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
     */
    public function delete(\Base $f3){
        $signatureIds = $f3->get('POST.signatureIds');
        $activeCharacter = $this->getCharacter();

        /**
         * @var Model\SystemSignatureModel $signature
         */
        $signature = Model\BasicModel::getNew('SystemSignatureModel');
        foreach($signatureIds as $signatureId){
            $signature->getById($signatureId);
            $signature->delete( $activeCharacter );
            $signature->reset();
        }

        echo json_encode([]);
    }

} 