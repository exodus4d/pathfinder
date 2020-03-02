<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 22.10.2019
 * Time: 03:00
 */

namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;

class StationModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'station';

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
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'corporationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\CorporationModel',
            'constraint' => [
                [
                    'table' => 'corporation',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'raceId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\RaceModel',
            'constraint' => [
                [
                    'table' => 'race',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'services' => [
            'type' => self::DT_JSON
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
        $data           = (object) [];
        $data->id       = $this->_id;
        $data->name     = $this->name;
        $data->type     = $this->typeId->getData();
        $data->services = $this->services ? : [];

        // according to ESIs Swagger conf, "raceId" AND "corporationId"(= "owner") are optional
        // -> I haven´t seen any imported NPC station data where "raceId" OR "corporationId" not exist
        if($this->corporationId){
            $data->corporation = $this->corporationId->getData();
        }

        if($this->raceId){
            $data->race = $this->raceId->getData();
        }

        return $data;
    }

    /**
     * load data from API into $this and save $this
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->send('getUniverseStation', $id);
        if(!empty($data) && !isset($data['error'])){
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

            if($data['corporationId']){
                /**
                 * @var $faction CorporationModel
                 */
                $corporation = $this->rel('corporationId');
                $corporation->loadById($data['corporationId'], $accessToken, $additionalOptions);
                $data['corporationId'] = $corporation;
            }

            if($data['raceId']){
                /**
                 * @var $race RaceModel
                 */
                $race = $this->rel('raceId');
                $race->loadById($data['raceId'], $accessToken, $additionalOptions);
                $data['raceId'] = $race;
            }

            $this->copyfrom($data, ['id', 'name', 'systemId', 'typeId', 'corporationId', 'raceId', 'services', 'position']);
            $this->save();
        }
    }

}