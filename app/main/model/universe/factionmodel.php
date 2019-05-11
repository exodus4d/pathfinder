<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 30.03.2019
 * Time: 09:51
 */

namespace Model\Universe;


use DB\SQL\Schema;


class FactionModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'faction';

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
        'sizeFactor' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0
        ],
        'stationCount' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0
        ],
        'stationSystemCount' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0
        ],
        'systems' => [
            'has-many' => ['Model\Universe\SystemModel', 'factionId']
        ]
    ];

    /**
     * get data
     * @return \stdClass
     */
    public function getData(){
        $factionData                = (object) [];
        $factionData->id            = $this->_id;
        $factionData->name          = $this->name;

        return $factionData;
    }

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->getUniverseFactionData($id);
        if(!empty($data)){
            $this->copyfrom($data, ['id', 'name', 'description', 'sizeFactor', 'stationCount', 'stationSystemCount']);
            $this->save();
        }
    }
}