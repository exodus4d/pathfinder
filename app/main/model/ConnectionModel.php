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
    protected $ttl = 5;
    protected $rel_ttl = 5;

    protected $fieldConf = array(
        'mapId' => array(
            'belongs-to-one' => 'Model\MapModel'
        ),
        'type' => array(
            'type' => self::DT_JSON
        )
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

                    if($key == 'source'){
                        // set mapId
                        $sourceSystem = self::getNew('SystemModel');
                        $sourceSystem->getById( $this->$key );
                        $this->mapId = $sourceSystem->mapId;
                    }
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
            'source' => $this->source,
            'target' => $this->target,
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
        $sourceSystem = self::getNew('SystemModel');
        $sourceSystem->getById( $this->source );

        $targetSystem = self::getNew('SystemModel');
        $targetSystem->getById( $this->target);

        if(
            $sourceSystem->dry() ||
            $targetSystem->dry() ||
            $sourceSystem->mapId->id !== $targetSystem->mapId->id
        ){
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

} 