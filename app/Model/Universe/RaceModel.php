<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 22.10.2019
 * Time: 03:21
 */

namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;

class RaceModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'race';

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
        'factionId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\FactionModel',
            'constraint' => [
                [
                    'table' => 'faction',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'stations' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\StationModel', 'raceId']
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
        $data->faction  = $this->factionId->getData();

        return $data;
    }

    /**
     * load data from API into $this and save $this
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->send('getUniverseRace', $id);
        if(!empty($data) && !isset($data['error'])){
            /**
             * @var $faction FactionModel
             */
            $faction = $this->rel('factionId');
            $faction->loadById($data['factionId'], $accessToken, $additionalOptions);
            $data['factionId'] = $faction;

            $this->copyfrom($data, ['id', 'name', 'description', 'factionId']);
            $this->save();
        }
    }
}