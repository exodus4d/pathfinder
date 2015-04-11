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
     */
    function beforeroute() {

        parent::beforeroute();

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
                $signatures = $system->getSignatures($user);

                if($signatures){
                    foreach($signatures as $signature){
                        $signatureData[] = $signature->getData();
                    }
                }

            }

        }

        echo json_encode($signatureData);
    }

    /**
     * save or update a full signature data set
     * or save/update just single signature data
     * @param $f3
     */
    public function save($f3){
        $signatureData = $f3->get('POST');
        $user = $this->_getUser();

        $newSignatureData = false;

        if($user){
            $system = Model\BasicModel::getNew('SystemModel');
            $system->getById($signatureData['systemId']);

            $activeCharacter = $user->getActiveCharacter();
            if(!$system->dry()){
                // update/save signature

                $signature = $system->getSignatureById($user, $signatureData['pk']);

                if($signature){
                    if($signature->dry()){
                        // new signature
                        $signature->systemId = $system;
                        $signature->createdCharacterId = $activeCharacter->characterId;
                        $signature->setData($signatureData);
                    }else{
                        // update signature (single data)
                        $newData = [
                            $signatureData['name'] => $signatureData['value']
                        ];
                        $signature->setData($newData);
                    }

                    $signature->updatedCharacterId = $activeCharacter->characterId;
                    $signature->save();
                    $newSignatureData = $signature->getData();
                }
            }

            if(!$newSignatureData){
                $this->f3->error(401, 'Signature could not be saved.');
            }
        }


        echo json_encode($newSignatureData);
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