<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 19.05.2018
 * Time: 01:12
 */

namespace Model\Universe;

use DB\SQL\Schema;

class PlanetModel extends AbstractUniverseModel {

    protected $table = 'planet';

    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'systemId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Universe\SystemModel',
            'constraint' => [
                [
                    'table' => 'system',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'typeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Universe\TypeModel',
            'constraint' => [
                [
                    'table' => 'type',
                    'on-delete' => 'SET NULL'
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
        ]
    ];

    /**
     * get data
     * @return \stdClass
     */
    public function getData(){
        $planetData                 = (object) [];
        $planetData->name           = $this->name;

        $planetData->type           = (object) [];
        $planetData->type->name     = $this->typeId->name;

        return $planetData;
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
        $data = self::getF3()->ccpClient()->getUniversePlanetData($id);
        if(!empty($data)){
            /**
             * @var $system SystemModel
             */
            $system = $this->rel('systemId');
            $system->loadById($data['systemId'], $accessToken, $additionalOptions);
            $data['systemId'] = $system;

            /**
             * @var $type TypeModel
             */
            $type = $this->rel('typeId');
            $type->loadById($data['typeId'], $accessToken, $additionalOptions);
            $data['typeId'] = $type;

            $this->copyfrom($data, ['id', 'name', 'systemId', 'typeId', 'position']);
            $this->save();
        }
    }

}