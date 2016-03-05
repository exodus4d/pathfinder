<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 21.03.15
 * Time: 14:34
 */

namespace Model;

use DB\SQL\Schema;

class SystemSignatureModel extends BasicModel {

    protected $table = 'system_signature';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'systemId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\SystemModel',
            'constraint' => [
                [
                    'table' => 'system',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'groupId' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 1,
            'index' => true,
        ],
        'typeId' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 1,
            'index' => true,
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'description' => [
            'type' => Schema::DT_VARCHAR512,
            'nullable' => false,
            'default' => ''
        ],
        'createdCharacterId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\CharacterModel',
            'constraint' => [
                [
                    'table' => 'character',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'updatedCharacterId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\CharacterModel',
            'constraint' => [
                [
                    'table' => 'character',
                    'on-delete' => 'CASCADE'
                ]
            ]
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
     * compares a new data set (array) with the current values
     * and checks if something has changed
     * @param $signatureData
     * @return bool
     */
    public function hasChanged($signatureData){
        $hasChanged = false;

        foreach((array)$signatureData as $key => $value){
            if(
                $this->exists($key) &&
                $this->$key != $value
            ){
                $hasChanged = true;
                break;
            }
        }

        return $hasChanged;
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

    /**
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     */
    public static function setup($db=null, $table=null, $fields=null){
        $status = parent::setup($db,$table,$fields);

        if($status === true){
            $status = parent::setMultiColumnIndex(['systemId', 'typeId', 'groupId']);
        }

        return $status;
    }
} 