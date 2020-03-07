<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 18.05.2018
 * Time: 23:52
 */

namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;

class StarModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'star';

    /**
     * @var array
     */
    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'typeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\TypeModel',
            'constraint' => [
                [
                    'table' => 'type',
                    'on-delete' => 'SET NULL'
                ]
            ],
            'validate' => 'notDry'
        ],
        'age' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => true,
            'default' => null
        ],
        'radius' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => true,
            'default' => null
        ],
        'temperature' => [
            'type' => Schema::DT_INT,
            'nullable' => true,
            'default' => null
        ],
        'luminosity' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => true,
            'default' => null
        ],
        'spectralClass' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => true,
            'default' => null
        ],
        'system' => [
            'has-one' => ['Exodus4D\Pathfinder\Model\Universe\SystemModel', 'starId']
        ]
    ];

    /**
     * get data
     * @return \stdClass
     */
    public function getData(){
        $starData                   = (object) [];
        $starData->id               = $this->_id;
        $starData->name             = $this->typeId->name;

        return $starData;
    }

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->send('getUniverseStar', $id);
        if(!empty($data)){
            /**
             * @var $type TypeModel
             */
            $type = $this->rel('typeId');
            $type->loadById($data['typeId'], $accessToken, $additionalOptions);
            $data['typeId'] = $type;

            $this->copyfrom($data, ['id', 'name', 'typeId', 'age', 'radius', 'temperature', 'luminosity', 'spectralClass']);
            $this->save();
        }
    }
}