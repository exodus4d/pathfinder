<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 21.03.15
 * Time: 21:59
 */

namespace Controller\Api;
use Model;


class Signature extends \Controller\AccessController{

    /**
     * event handler
     * @param $f3
     */
    function beforeroute($f3) {

        parent::beforeroute($f3);

        // set header for all routes
        header('Content-type: application/json');
    }

    /**
     * get signature data for systems
     * @param $f3
     */
    public function getAll($f3){
        $signatureData = [];
        $systemIds = $f3->get('POST.systemIds');

        $user = $this->_getUser();

        $system = Model\BasicModel::getNew('SystemModel');

        foreach($systemIds as $systemId){
            $system->getById($systemId);

            if(!$system->dry()){

                // check access
                if($system->hasAccess($user)){
                    $signatureData = $system->getSignaturesData();
                }
            }
        }

        echo json_encode($signatureData);
    }

    /**
     * save or update a full signature data set
     * or save/update just single or multiple signature data
     * @param $f3
     */
    public function save($f3){
        $requestData = $f3->get('POST');

        $signatureData = null;

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
            $user = $this->_getUser();

            if($user){
                $activeCharacter = $user->getActiveUserCharacter();
                $system = Model\BasicModel::getNew('SystemModel');

                // update/add all submitted signatures
                foreach($signatureData as $data){
                    $system->getById( (int)$data['systemId']);

                    if(!$system->dry()){
                        // update/save signature

                        $signature = null;
                        if( isset($data['pk']) ){
                            // try to get system by "primary key"
                            $signature = $system->getSignatureById($user, (int)$data['pk']);
                        }elseif( isset($data['name']) ){
                            $signature = $system->getSignatureByName($user, $data['name']);
                        }

                        if( is_null($signature) ){
                            $signature = Model\BasicModel::getNew('SystemSignatureModel');
                        }

                        $signature->updatedCharacterId = $activeCharacter->getCharacter();

                        if($signature->dry()){
                            // new signature
                            $signature->systemId = $system;
                            $signature->createdCharacterId = $activeCharacter->getCharacter();
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

                                // description should not be updated
                                unset( $data['description'] );

                                // wormhole typeID can´t figured out/saved by the sig reader dialog
                                if($data['groupId'] == 5){
                                    unset( $data['typeId'] );
                                }

                                $newData = $data;
                            }

                            $signature->setData($newData);
                        }


                        $signature->save();

                        // get a fresh signature object with the new data. This is a bad work around!
                        // but i could not figure out what the problem was when using the signature model, saved above :(
                        // -> some caching problems
                        $newSignature = Model\BasicModel::getNew('SystemSignatureModel');
                        $newSignature->getById( $signature->id, 0);

                        $return->signatures[] = $newSignature->getData();

                        $signature->reset();
                    }

                    $system->reset();
                }
            }
        }

        echo json_encode($return);
    }

    /**
     * delete signatures
     * @param $f3
     */
    public function delete($f3){
        $signatureIds = $f3->get('POST.signatureIds');

        $user = $this->_getUser();
        $signature = Model\BasicModel::getNew('SystemSignatureModel');

        foreach($signatureIds as $signatureId){
            $signature->getById($signatureId);

            $signature->delete($user);
            $signature->reset();
        }

        echo json_encode([]);
    }


} 