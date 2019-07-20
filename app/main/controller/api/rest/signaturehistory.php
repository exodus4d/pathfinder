<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 02.03.2019
 * Time: 16:44
 */

namespace Controller\Api\Rest;


use Model\Pathfinder;
use lib\Config;

class SignatureHistory extends AbstractRestController {

    /**
     * get historic signature data
     * @param \Base $f3
     * @param $params
     * @throws \Exception
     */
    public function get(\Base $f3, $params){
        $historyData = [];

        if($systemId = (int)$params['id']){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $system Pathfinder\SystemModel
             */
            $system = Pathfinder\AbstractPathfinderModel::getNew('SystemModel');
            $system->getById($systemId);

            if($system->hasAccess($activeCharacter)){
                $historyDataAll = $system->getSignaturesHistory();
                foreach($historyDataAll as $historyEntry){
                    $label = [
                        $historyEntry['character']->name,
                        $historyEntry['action'],
                        count($historyEntry['signatures']),
                        Config::formatTimeInterval((int)(microtime(true) - $historyEntry['stamp']))
                    ];

                    $historyData[] = [
                        'value' => md5((string)$historyEntry['stamp']),
                        'text' => implode('%%', $label)
                    ];
                }
            }
        }

        $this->out($historyData);
    }

    /**
     * put (load) historic signature data
     * @param \Base $f3
     * @throws \Exception
     */
    public function put(\Base $f3){
        $requestData = $this->getRequestData($f3);
        $signaturesData = [];

        if(
            ($systemId = (int)$requestData['systemId']) &&
            ($stamp = (string)$requestData['stamp'])
        ){
            $activeCharacter = $this->getCharacter();

            /**
             * @var $system Pathfinder\SystemModel
             */
            $system = Pathfinder\AbstractPathfinderModel::getNew('SystemModel');
            $system->getById($systemId, 0);
            if($system->hasAccess($activeCharacter)){
                if($historyEntry = $system->getSignatureHistoryEntry($stamp)){
                    $updateSignaturesHistory = false;

                    // history entry found for $stamp -> format signatures data
                    // -> same format as if they would come from client for save
                    foreach($historyEntry['signatures'] as $signatureData){
                        $data = [
                            'id'            => (int)$signatureData->id,
                            'groupId'       => (int)$signatureData->groupId,
                            'typeId'        => (int)$signatureData->typeId,
                            'connectionId'  => (int)$signatureData->connectionId,
                            'name'          => (string)$signatureData->name,
                            'description'   => (string)$signatureData->description,
                        ];

                        $signature = $system->getSignatureById($data['id']);

                        if(is_null($signature)){
                            $signature = $system->getNewSignature();
                        }

                        $signature->setData($data);
                        $signature->save($activeCharacter);
                        $signaturesData[] = $signature->getData();
                        $updateSignaturesHistory = true;

                        $signature->reset();
                    }

                    // delete "old" signatures ------------------------------------------------------------------------
                    $updatedSignatureIds = array_column($signaturesData, 'id');
                    $signatures = $system->getSignatures();
                    foreach($signatures as $signature){
                        if(!in_array($signature->_id, $updatedSignatureIds)){
                            if($signature->delete()){
                                $updateSignaturesHistory = true;
                            }
                        }
                    }

                    if($updateSignaturesHistory){
                        // signature count changed -> clear fieldsCache[]
                        $system->reset(false);
                        $system->updateSignaturesHistory($activeCharacter, 'undo');
                    }
                }
            }
        }

        $this->out($signaturesData);
    }
}