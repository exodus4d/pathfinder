<?php


namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;

class SovereigntyMapModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'sovereignty_map';

    /**
     * @var array
     */
    protected $fieldConf = [
        'systemId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'unique' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\SystemModel',
            'constraint' => [
                [
                    'table' => 'system',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'factionId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\FactionModel',
            'constraint' => [
                [
                    'table' => 'faction',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'allianceId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\AllianceModel',
            'constraint' => [
                [
                    'table' => 'alliance',
                    'on-delete' => 'CASCADE'
                ]
            ]
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
        ]
    ];

    /**
     * No static columns added
     * @var bool
     */
    protected $addStaticFields = false;

    /**
     * get data
     * @return \stdClass
     */
    public function getData(){
        $data                       = (object) [];

        if($this->factionId){
            $data->faction          = $this->factionId->getData();
        }else{
            if($this->allianceId){
                $data->alliance     = $this->allianceId->getData();
            }

            if($this->corporationId){
                $data->corporation  = $this->corporationId->getData();
            }
        }

        return $data;
    }

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){}
}