<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 29.07.2017
 * Time: 16:49
 */

namespace Model\Universe;

use DB\SQL\Schema;

class ConstellationModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'constellation';

    /**
     * @var array
     */
    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'regionId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Universe\RegionModel',
            'constraint' => [
                [
                    'table' => 'region',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'x' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => false,
            'default' => 0
        ],
        'y' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => false,
            'default' => 0
        ],
        'z' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => false,
            'default' => 0
        ],
        'systems' => [
            'has-many' => ['Model\Universe\SystemModel', 'constellationId']
        ]
    ];

    /**
     * get data
     * @return \stdClass
     */
    public function getData(){
        $constellationData          = (object) [];
        $constellationData->id      = $this->_id;
        $constellationData->name    = $this->name;
        $constellationData->region  = $this->regionId->getData();

        return $constellationData;
    }

    /**
     * setter for positions array (x/y/z)
     * @param $position
     * @return null
     */
    public function set_position($position){
        $position = (array)$position;
        if(count($position) === 3){
            $this->x = $position['x'];
            $this->y = $position['y'];
            $this->z = $position['z'];
        }
        return null;
    }

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->getUniverseConstellationData($id);
        if(!empty($data)){
            /**
             * @var $region RegionModel
             */
            $region = $this->rel('regionId');
            $region->loadById($data['regionId'], $accessToken, $additionalOptions);
            $data['regionId'] = $region;

            $this->copyfrom($data, ['id', 'name', 'regionId', 'position']);
            $this->save();
        }
    }

    /**
     * load systems data for this constellation
     */
    public function loadSystemsData(){
        if( !$this->dry() ){
            $data = self::getF3()->ccpClient()->getUniverseConstellationData($this->_id);
            if(!empty($data)){
                foreach((array)$data['systems'] as $systemId){
                    /**
                     * @var $system SystemModel
                     */
                    $system = $this->rel('systems');
                    $system->loadById($systemId);
                    $system->reset();
                }
            }
        }
    }

}