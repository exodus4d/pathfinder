<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 26.02.15
 * Time: 21:12
 */

namespace Model;

use DB\SQL\Schema;

class ConnectionModel extends BasicModel{

    protected $table = 'connection';

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
        'source' => [
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
        'target' => [
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
        'scope' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'type' => [
            'type' => self::DT_JSON
        ]
    ];

    /**
     * set an array with all data for a system
     * @param $systemData
     */
    public function setData($systemData){

        foreach((array)$systemData as $key => $value){

            if( !is_array($value) ){
                if( $this->exists($key) ){
                    $this->$key = $value;
                }
            }elseif($key == 'type'){
                // json field
                $this->$key = $value;
            }
        }
    }

    /**
     * get connection data as array
     * @return array
     */
    public function getData(){

        $connectionData = [
            'id' => $this->id,
            'source' => $this->source->id,
            'target' => $this->target->id,
            'scope' => $this->scope,
            'type' => $this->type,
            'updated' => strtotime($this->updated)
        ];

        return $connectionData;
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
     * check weather this model is valid or not
     * @return bool
     */
    public function isValid(){
        $isValid = true;

        // check if source/target belong to same map
        if( $this->source->mapId->id !== $this->target->mapId->id ){
            $isValid = false;
        }

        return $isValid;
    }

    /**
     * delete a connection
     * @param $accessObject
     */
    public function delete($accessObject){

        if(!$this->dry()){
            // check if editor has access
            if($this->hasAccess($accessObject)){
                $this->erase();
            }
        }
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
            $status = parent::setMultiColumnIndex(['source', 'target', 'scope']);
        }

        return $status;
    }
} 