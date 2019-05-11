<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 29.07.17
 * Time: 15:20
 */

namespace Model\Universe;


use DB\SQL\Schema;

class RegionModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'region';

    /**
     * @var array
     */
    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'description' => [
            'type' => Schema::DT_TEXT
        ],
        'constellations' => [
            'has-many' => ['Model\Universe\ConstellationModel', 'regionId']
        ]
    ];

    /**
     * get data
     * @return \stdClass
     */
    public function getData(){
        $regionData                 = (object) [];
        $regionData->id             = $this->_id;
        $regionData->name           = $this->name;

        return $regionData;
    }

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->getUniverseRegionData($id);
        if(!empty($data)){
            $this->copyfrom($data, ['id', 'name', 'description']);
            $this->save();
        }
    }

    /**
     * load constellations data for this region
     */
    public function loadConstellationsData(){
        if( !$this->dry() ){
            $data = self::getF3()->ccpClient()->getUniverseRegionData($this->_id);
            if(!empty($data)){
                foreach((array)$data['constellations'] as $constellationsId){
                    /**
                     * @var $constellation ConstellationModel
                     */
                    $constellation = $this->rel('constellations');
                    $constellation->loadById($constellationsId);
                    $constellation->reset();
                }
            }
        }
    }
}