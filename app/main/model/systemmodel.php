<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 23.02.15
 * Time: 23:56
 */

namespace Model;

use DB\SQL\Schema;

class SystemModel extends BasicModel {

    const MAX_POS_X = 2300;
    const MAX_POS_Y = 498;

    protected $table = 'system';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'mapId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\MapModel',
            'constraint' => [
                [
                    'table' => 'map',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'systemId' => [
            'type' => Schema::DT_INT,
            'index' => true,
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'alias' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'regionId' => [
            'type' => Schema::DT_INT,
            'index' => true,
        ],
        'region' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'constellationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
        ],
        'constellation' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'effect' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'typeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\SystemTypeModel',
            'constraint' => [
                [
                    'table' => 'system_type',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'security' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'trueSec' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 1
        ],
        'statusId' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 1,
            'index' => true,
            'belongs-to-one' => 'Model\SystemStatusModel',
            'constraint' => [
                [
                    'table' => 'system_status',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'locked' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'rally' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'description' => [
            'type' => Schema::DT_VARCHAR512,
            'nullable' => false,
            'default' => ''
        ],
        'posX' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0
        ],
        'posY' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0
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
        ],
        'signatures' => [
            'has-many' => ['Model\SystemSignatureModel', 'systemId']
        ]
    ];

    /**
     * set an array with all data for a system
     * @param $systemData
     */
    public function setData($systemData){

        foreach((array)$systemData as $key => $value){

            if($key == 'created'){
                continue;
            }

            if(!is_array($value)){
                if($this->exists($key)){
                    $this->$key = $value;
                }
            }else{
                // special array data
                if($key == 'constellation'){
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
     * get map data as object
     * @return object
     */
    public function getData(){

        // check if there is cached data
        $systemData = $this->getCacheData();

        if(is_null($systemData)){
            // no cached system data found

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

            $systemData->statics = $this->getStaticWormholeData();

            $systemData->position = (object) [];
            $systemData->position->x = $this->posX;
            $systemData->position->y = $this->posY;

            if($this->createdCharacterId){
                $systemData->created = (object) [];
                $systemData->created->character = $this->createdCharacterId->getData();
                $systemData->created->created = strtotime($this->created);
            }

            if($this->updatedCharacterId){
                $systemData->updated = (object) [];
                $systemData->updated->character = $this->updatedCharacterId->getData();
                $systemData->updated->updated = strtotime($this->updated);
            }

            // max caching time for a system
            // the cached date has to be cleared manually on any change
            // this includes system, connection,... changes (all dependencies)
            $this->updateCacheData($systemData, '', 300);
        }

        return $systemData;
    }

    /**
     * setter for system security value
     * @param $trueSec
     * @return float
     */
    public function set_trueSec($trueSec){

        if(
            $trueSec > 0 &&
            $trueSec < 0.1
        ){
            // 0.3 is still a LS -> no rounding
            $trueSec = 0.1;
        }else{
            $trueSec = round($trueSec, 1);
        }

        return $trueSec;
    }

    /**
     * setter validation for x coordinate
     * @param $posX
     * @return int|number
     */
    public function set_posX($posX){
        $posX = abs($posX);
        if($posX > self::MAX_POS_X){
            $posX = self::MAX_POS_X;
        }

        return $posX;
    }

    /**
     * setter validation for y coordinate
     * @param $posY
     * @return int|number
     */
    public function set_posY($posY){
        $posY = abs($posY);
        if($posY > self::MAX_POS_Y){
            $posY = self::MAX_POS_Y;
        }

        return $posY;
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
        $this->filter('signatures', ['active = ?', 1], ['order' => 'name']);

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
        $signature = null;

        if($this->hasAccess($accessObject)){
            $this->filter('signatures', ['active = ? AND id = ?', 1, $id]);
            if($this->signatures){
                $signature = reset( $this->signatures );
            }
        }

        return $signature;
    }

    /**
     * get a signature by its "unique" 3-digit name
     * @param $accessObject
     * @param $name
     * @return mixed|null
     */
    public function getSignatureByName($accessObject, $name){
        $signature = null;

        if($this->hasAccess($accessObject)){
            $this->filter('signatures', ['active = ? AND name = ?', 1, $name]);
            if($this->signatures){
                $signature = reset( $this->signatures );
            }
        }

        return $signature;
    }

    /**
     * checks weather this system is a wormhole
     * @return bool
     */
    protected function isWormhole(){
        $isWormhole = false;

        if($this->typeId->id == 1){
            $isWormhole = true;
        }

        return $isWormhole;
    }

    /**
     * get static WH data for this system
     * -> any WH system has at least one static WH
     * @return array
     * @throws \Exception
     */
    protected function getStaticWormholeData(){
        $wormholeData = [];

        // check if this system is a wormhole
        if($this->isWormhole()){
            $systemWormholeModel = self::getNew('SystemWormholeModel');
            $systemStatics = $systemWormholeModel->find([
                'constellationId = :constellationId',
                ':constellationId' => $this->constellationId
            ]);

            if( is_object($systemStatics) ){
                foreach($systemStatics as $systemStatic){
                    $wormholeData[] = $systemStatic->getData();
                }
            }
        }

        return $wormholeData;
    }

    /**
     * see parent
     */
    public function clearCacheData(){
        parent::clearCacheData();

        // clear map cache as well
        $this->mapId->clearCacheData();
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
            $status = parent::setMultiColumnIndex(['mapId', 'systemId'], true);
        }

        return $status;
    }

} 