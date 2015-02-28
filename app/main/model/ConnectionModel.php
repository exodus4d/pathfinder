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
                }
            }elseif($key == 'type'){
                // json field
                $this->$key = $value;
            }
        }
    }

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

} 