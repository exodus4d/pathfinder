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
            'default' => 0,
            'index' => true,
        ],
        'typeId' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0,
            'index' => true,
        ],
        'connection' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\ConnectionModel',
            'constraint' => [
                [
                    'table' => 'connection',
                    'on-delete' => 'CASCADE'
                ]
            ]
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
     * get signature data
     * @return \stdClass
     */
    public function getData(){

        $signatureData                              = (object) [];
        $signatureData->id                          = $this->id;
        $signatureData->groupId                     = $this->groupId;
        $signatureData->typeId                      = $this->typeId;
        $signatureData->name                        = $this->name;
        $signatureData->description                 = $this->description;

        $signatureData->created                     = (object) [];
        $signatureData->created->created            = strtotime($this->created);
        if( is_object($this->createdCharacterId) ){
            $signatureData->created->character      = $this->createdCharacterId->getData();
        }

        $signatureData->updated                     = (object) [];
        $signatureData->updated->updated            = strtotime($this->updated);
        if( is_object($this->updatedCharacterId) ){
            $signatureData->updated->character      = $this->updatedCharacterId->getData();
        }

        if( is_object($this->connection) ){
            $signatureData->connection      = $this->connection->getData();
        }

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
     * @param CharacterModel $characterModel
     * @return bool
     */
    public function hasAccess(CharacterModel $characterModel){
        return $this->systemId->hasAccess($characterModel);
    }

    /**
     * delete signature
     * @param CharacterModel $characterModel
     */
    public function delete(CharacterModel $characterModel){
        if( !$this->dry() ){
            // check if character has access
            if($this->hasAccess($characterModel)){
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