<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 26.02.15
 * Time: 21:12
 */

namespace Model;


class ConnectionModel extends BasicModel{

    protected $table = 'connection';


    protected $fieldConf = [
        'mapId' => [
            'belongs-to-one' => 'Model\MapModel'
        ],
        'source' => [
            'belongs-to-one' => 'Model\SystemModel'
        ],
        'target' => [
            'belongs-to-one' => 'Model\SystemModel'
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
     * setter for id
     * @param $id
     */
    public function set_id($id){
        // connection id should never been set automatically
        // -> no return
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

} 