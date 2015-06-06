<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 23.02.15
 * Time: 23:56
 */

namespace Model;


class SystemModel extends BasicModel {

    protected $table = 'system';
    protected $ttl = 5;
    protected $rel_ttl = 5;

    protected $fieldConf = array(
        'mapId' => array(
            'belongs-to-one' => 'Model\MapModel'
        ),
        'typeId' => array(
            'belongs-to-one' => 'Model\SystemTypeModel'
        ),
        'statusId' => array(
            'belongs-to-one' => 'Model\SystemStatusModel'
        ),
        'createdCharacterId' => array(
            'belongs-to-one' => 'Model\CharacterModel'
        ),
        'updatedCharacterId' => array(
            'belongs-to-one' => 'Model\CharacterModel'
        ),
        'signatures' => array(
            'has-many' => array('Model\SystemSignatureModel', 'systemId')
        ),
    );

    /**
     * set an array with all data for a system
     * @param $systemData
     */
    public function setData($systemData){

        foreach((array)$systemData as $key => $value){

            if(!is_array($value)){
                if($this->exists($key)){
                    $this->$key = $value;
                }
            }else{
                // special array data
                if($key == 'type'){
                    $this->typeId = $value['id'];
                }elseif($key == 'constellation'){
                    $this->constellationId = $value['id'];
                    $this->constellation = $value['name'];
                }elseif($key == 'region'){
                    $this->regionId = $value['id'];
                    $this->region = $value['name'];
                }elseif($key == 'type'){
                    $this->typeId = $value['id'];
                }elseif($key == 'status'){
                    $this->statusId = $value['id'];
                }elseif($key == 'position'){
                    $this->posX = $value['x'];
                    $this->posY = $value['y'];
                }
            }
        }
    }

    /**
     * get map data as array
     * @return array
     */
    public function getData(){

        $systemData = (object) [];
        $systemData->id = $this->id;
        $systemData->mapId = is_object($this->mapId) ? $this->mapId->id : 0;
        $systemData->systemId = $this->systemId;
        $systemData->name = $this->name;
        $systemData->alias = $this->alias;
        $systemData->effect = $this->effect;
        $systemData->security = $this->security;
        $systemData->trueSec = $this->trueSec;

        $systemData->region = (object) [];
        $systemData->region->id = $this->regionId;
        $systemData->region->name = $this->region;

        $systemData->constellation = (object) [];
        $systemData->constellation->id = $this->constellationId;
        $systemData->constellation->name = $this->constellation;

        $systemData->type = (object) [];
        $systemData->type->id = $this->typeId->id;
        $systemData->type->name = $this->typeId->name;

        $systemData->status = (object) [];
        $systemData->status->id = is_object($this->statusId) ? $this->statusId->id : 0;
        $systemData->status->name = is_object($this->statusId) ? $this->statusId->name : '';

        $systemData->locked = $this->locked;
        $systemData->rally = $this->rally;
        $systemData->description = $this->description;

        $systemData->position = (object) [];
        $systemData->position->x = $this->posX;
        $systemData->position->y = $this->posY;

        $systemData->created = (object) [];
        $systemData->created->character = $this->createdCharacterId->getData();
        $systemData->created->created = strtotime($this->created);

        $systemData->updated = (object) [];
        $systemData->updated->character = $this->updatedCharacterId->getData();
        $systemData->updated->updated = strtotime($this->updated);

        return $systemData;
    }

    /**
     * check object for model access
     * @param $accessObject
     * @return bool
     */
    public function hasAccess($accessObject){
        return $this->mapId->hasAccess($accessObject);
    }

    /**
     * delete a system from a map
     * hint: signatures and connections will be deleted on cascade
     * @param $accessObject
     */
    public function delete($accessObject){

        if(! $this->dry()){
            // check if user has access
            if($this->hasAccess($accessObject)){
                $this->erase();
            }
        }
    }

    /**
     * get all signatures of this system
     * @return array
     */
    public function getSignatures(){
        $this->filter('signatures', array('active = ?', 1));

        $signatures = [];
        if($this->signatures){
            $signatures = $this->signatures;
        }

        return $signatures;
    }

    /**
     * get all data for all Signatures in this system
     * @return array
     */
    public function getSignaturesData(){
        $signatures = $this->getSignatures();

        $signaturesData = [];
        foreach($signatures as $signature){
            $signaturesData[] = $signature->getData();
        }

        return $signaturesData;
    }

    /**
     * get Signature by id and check for access
     * @param $accessObject
     * @param $id
     * @return bool|null
     */
    public function getSignatureById($accessObject, $id){
        $signature = false;

        if($this->hasAccess($accessObject)){
            $signature = self::getNew('SystemSignatureModel');
            $signature->getById($id);

            if(
                !$signature->dry() &&
                $signature->systemId->id !== $this->id
            ){
                // check if signature belongs to system -> security check
                $signature = false;
            }
        }

        return $signature;
    }


} 