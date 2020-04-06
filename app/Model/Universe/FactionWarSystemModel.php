<?php


namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;

class FactionWarSystemModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'faction_war_system';

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
        'ownerFactionId' => [
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
        'occupierFactionId' => [
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
        'contested' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'victoryPoints' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0
        ],
        'victoryPointsThreshold' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0
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
        $data                           = (object) [];
        $data->contested                = $this->contested;

        if($this->ownerFactionId){
            $data->ownerFaction         = $this->ownerFactionId->getData();
            $data->victoryPercentage    = $this->getVictoryPercentage();

            if(
                $this->occupierFactionId &&
                $this->get('occupierFactionId', true) !== $this->get('ownerFactionId', true)
            ){
                $data->occupierFaction  = $this->occupierFactionId->getData();
            }
        }

        return $data;
    }

    /**
     * calculate victory progress in percent
     * @return int
     */
    protected function getVictoryPercentage() : int {
        $percent = 0;

        if($this->victoryPoints && $this->victoryPointsThreshold){
            $percent = floor((100 / $this->victoryPointsThreshold) * $this->victoryPoints);
        }

        return $percent;
    }

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){}
}