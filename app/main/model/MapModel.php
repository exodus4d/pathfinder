<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 22:10
 */

namespace Model;


class MapModel extends BasicModel{

    protected $table = 'map';

    protected $fieldConf = array(
        'scopeId' => array(
            'belongs-to-one' => 'Model\MapScopeModel'
        ),
        'typeId' => array(
            'belongs-to-one' => 'Model\MapTypeModel'
        )
    );

    protected $validate = [
        'name' => [
            'length' => [
                'min' => 3
            ]
        ],
        'icon' => [
            'length' => [
                'min' => 3
            ]
        ],
        'scopeId' => [
            'regex' => '/^[1-9]+$/'
        ],
        'typeId' => [
            'regex' => '/^[1-9]+$/'
        ],
    ];

    public function setData($data){

        foreach((array)$data as $key => $value){

            if(!is_array($value)){
                if($this->exists($key)){
                    $this->$key = $value;
                }
            }else{
                // special array data
                if($key == 'scope'){
                    $this->scopeId = $value['id'];
                }elseif($key == 'type'){
                    $this->typeId = $value['id'];
                }
            }
        }
    }


    /**
     * get map data for for response
     * @return array
     */
    public function getData(){

        $mapData = [
            'id' => $this->id,
            'name' => $this->name,
            'scope' => [
                'id' => $this->scopeId->id,
                'name' => $this->scopeId->name,
                'label' => $this->scopeId->label
            ],
            'type' => [
                'id' => $this->typeId->id,
                'name' => $this->typeId->name
            ],
            'icon' => $this->icon,
            'updated' => strtotime($this->updated)


        ];

        return $mapData;
    }

    /**
     * get all system data for all systems in this map
     * @return array
     */
    public function getSystemData(){
        $systems = $this->getRelatedModels('SystemModel', 'mapId');

        $systemData = [];
        foreach($systems as $system){
            $systemData[] = $system->getData();
        }

        return $systemData;
    }

    /**
     * get all connection data in this map
     * @return array
     */
    public function getConnectionData(){
        $connections = $this->getRelatedModels('ConnectionModel', 'mapId');

        $connectionData = [];
        foreach($connections as $connection){
            $connectionData[] = $connection->getData();
        }

        return $connectionData;
    }



} 