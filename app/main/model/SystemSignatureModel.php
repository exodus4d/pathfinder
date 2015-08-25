<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 21.03.15
 * Time: 14:34
 */

namespace Model;


class SystemSignatureModel extends BasicModel {

    protected $table = 'system_signature';

    protected $fieldConf = [
        'systemId' => [
            'belongs-to-one' => 'Model\SystemModel'
        ],
        'createdCharacterId' => [
            'belongs-to-one' => 'Model\CharacterModel'
        ],
        'updatedCharacterId' => [
            'belongs-to-one' => 'Model\CharacterModel'
        ]
    ];

    protected $validate = [
        'name' => [
            'length' => [
                'min' => 3
            ]
        ]
    ];

    /**
     * set an array with all data for a system
     * @param $signatureData
     */
    public function setData($signatureData){

        foreach((array)$signatureData as $key => $value){

            if(!is_array($value)){
                if($this->exists($key)){
                    $this->$key = $value;
                }
            }
        }
    }

    /**
     * get signature data as array
     * @return array
     */
    public function getData(){

        $signatureData = [
            'id' => $this->id,
            'groupId' => $this->groupId,
            'typeId' => $this->typeId,
            'name' => $this->name,
            'description' => $this->description,
            'created' => [
                'character' => $this->createdCharacterId->getData(),
                'created' => strtotime($this->created)
            ],
            'updated' => [
                'character' => $this->updatedCharacterId->getData(),
                'updated' => strtotime($this->updated)
            ]

        ];

        return $signatureData;
    }

    /**
     * check object for model access
     * @param $accessObject
     * @return bool
     */
    public function hasAccess($accessObject){
        return $this->systemId->hasAccess($accessObject);
    }

    public function delete($accessObject){

        if(!$this->dry()){
            // check if editor has access
            if($this->hasAccess($accessObject)){
                $this->erase();
            }
        }
    }
} 