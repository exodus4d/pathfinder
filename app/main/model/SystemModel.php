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

    protected $fieldConf = array(
        'mapId' => array(
            'belongs-to-one' => 'Model\MapModel'
        ),
        'typeId' => array(
            'belongs-to-one' => 'Model\SystemTypeModel'
        ),
        'statusId' => array(
            'belongs-to-one' => 'Model\SystemStatusModel'
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
     * get map data for for response
     * @return array
     */
    public function getData(){

        $systemData = [
            'id' => $this->id,
            'mapId' => is_object($this->mapId) ? $this->mapId->id : 0,
            'systemId' => $this->systemId,
            'name' => $this->name,
            'alias' => $this->alias,
            'effect' => $this->effect,
            'security' => $this->security,
            'trueSec' => $this->trueSec,
            'region' => [
                'id' => $this->regionId,
                'name' => $this->region
            ],
            'constellation' => [
                'id' => $this->constellationId,
                'name' => $this->constellation
            ],
            'type' => [
                'id' => $this->typeId->id,
                'name' => $this->typeId->name
            ],
            'status' => [
                'id' => is_object($this->statusId) ? $this->statusId->id : 0,
                'name' => is_object($this->statusId) ? $this->statusId->name : ''
            ],
            'locked' => $this->locked,
            'rally' => $this->rally,
            'position' => [
                'x' => $this->posX,
                'y' => $this->posY
            ],
            'updated' => strtotime($this->updated)

        ];


        return $systemData;
    }

} 