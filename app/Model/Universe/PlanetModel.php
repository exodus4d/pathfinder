<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 19.05.2018
 * Time: 01:12
 */

namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;

class PlanetModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'planet';

    /**
     * @var array
     */
    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'systemId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\SystemModel',
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
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\TypeModel',
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
        $data               = (object) [];
        $data->name         = $this->name;

        $data->type         = (object) [];
        $data->type->name   = $this->typeId->name;

        return $data;
    }

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->send('getUniversePlanet', $id);
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