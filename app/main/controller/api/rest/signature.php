<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 08.03.2019
 * Time: 16:20
 */

namespace Controller\Api\Rest;


use Model\Pathfinder;

class Signature extends AbstractRestController {

    /**
     * save or update a full signature data set
     * @param \Base $f3
     * @throws \Exception
     */
    public function post(\Base $f3){
        $requestData = $this->getRequestData($f3);
        $signaturesData = [];

        if($systemId = (int)$requestData['systemId']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $system Pathfinder\SystemModel
             */
            $system = Pathfinder\AbstractPathfinderModel::getNew('SystemModel');
            $system->getById($systemId, 0);
            if($system->hasAccess($activeCharacter)){
                // if there is any changed/deleted/updated signature
                // -> we need to update signature history data for the system
                $updateSignaturesHistory = false;

                foreach((array)$requestData['signatures'] as $data){
                    // we assume "systemId" or each signature is same for each signature
                    unset($data['systemId']);

                    $signature = $system->getSignatureByName((string)$data['name']);

                    if(is_null($signature)){
                        $signature = $system->getNewSignature();
                    }else{
                        // description should not overwrite existing description
                        if(!empty($signature->description)){
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
                    }

                    $signature->setData($data);
                    $signature->save($activeCharacter);
                    $signaturesData[] = $signature->getData();
                    $updateSignaturesHistory = true;

                    $signature->reset();
                }

                // delete "old" signatures ----------------------------------------------------------------------------
                if((bool)$requestData['deleteOld']){
                    $updatedSignatureIds = array_column($signaturesData, 'id');
                    $signatures = $system->getSignatures();
                    foreach($signatures as $signature){
                        if(!in_array($signature->_id, $updatedSignatureIds)){
                            if($signature->delete()){
                                $updateSignaturesHistory = true;
                            }
                        }
                    }
                }

                if($updateSignaturesHistory){
                    // signature count changed -> clear fieldsCache[]
                    $system->reset(false);
                    $system->updateSignaturesHistory($activeCharacter, 'sync');
                }
            }
        }

        $this->out($signaturesData);
    }

    /**
     * put (insert) signature
     * @param \Base $f3
     * @throws \Exception
     */
    public function put(\Base $f3){
        $requestData = $this->getRequestData($f3);
        $signaturesData = [];

        if($systemId = (int)$requestData['systemId']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $system Pathfinder\SystemModel
             */
            $system = Pathfinder\AbstractPathfinderModel::getNew('SystemModel');
            $system->getById($systemId);
            if($system->hasAccess($activeCharacter)){
                $signature = $system->getNewSignature();
                $signature->setData($requestData);
                $signature->save($activeCharacter);
                $signaturesData[] = $signature->getData();

                $signature->systemId->updateSignaturesHistory($activeCharacter, 'add');
            }
        }

        $this->out($signaturesData);
    }

    /**
     * update existing signature
     * @param \Base $f3
     * @param $params
     * @throws \Exception
     */
    public function patch(\Base $f3, $params){
        $requestData = $this->getRequestData($f3);
        $signaturesData = [];

        if($signatureId = (int)$params['id']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $signature Pathfinder\SystemSignatureModel
             */
            $signature = Pathfinder\AbstractPathfinderModel::getNew('SystemSignatureModel');
            $signature->getById($signatureId);
            if($signature->hasAccess($activeCharacter)){
                // if groupId changed
                if(array_key_exists('groupId', $requestData)){
                    //  -> typeId set to 0
                    $requestData['typeId'] = 0;
                    //  -> connectionId set to 0
                    $requestData['connectionId'] = 0;
                }

                if($signature->hasChanged($requestData)){
                    $signature->setData($requestData);
                    $signature->save($activeCharacter);
                    $signaturesData[] = $signature->getData();

                    $signature->systemId->updateSignaturesHistory($activeCharacter, 'edit');
                }
            }
        }

        $this->out($signaturesData);
    }

    /**
     * @param \Base $f3
     * @param $params
     * @throws \Exception
     */
    public function delete(\Base $f3, $params){
        $requestData = $this->getRequestData($f3);
        $signatureIds = array_map('intval', explode(',', (string)$params['id']));
        $deletedSignatureIds = [];

        if($systemId = (int)$requestData['systemId']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $system Pathfinder\SystemModel
             */
            $system = Pathfinder\AbstractPathfinderModel::getNew('SystemModel');
            $system->getById($systemId);

            if($system->hasAccess($activeCharacter)){
                // if there is any changed/deleted/updated signature
                // -> we need to update signature history data for the system
                $updateSignaturesHistory = false;

                /**
                 * @var $signature Pathfinder\SystemSignatureModel
                 */
                $signature = $system->rel('signatures');
                foreach($signatureIds as $signatureId){
                    $signature->getById($signatureId);
                    // make sure signature belongs to main system (user has access)
                    if($signature->get('systemId', true) == $systemId){
                        if($signature->delete()){
                            $deletedSignatureIds[] = $signatureId;
                            $updateSignaturesHistory = true;
                        }
                        $signature->reset();
                    }
                }

                if($updateSignaturesHistory){
                    $system->updateSignaturesHistory($activeCharacter, 'delete');
                }
            }
        }

        $this->out($deletedSignatureIds);
    }

}