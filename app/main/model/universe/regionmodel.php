<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 29.07.17
 * Time: 15:20
 */

namespace Model\Universe;

use DB\SQL\Schema;

class RegionModel extends BasicUniverseModel {

    protected $table = 'region';

    /**
     * No static columns added
     * @var bool
     */
    protected $addStaticFields = false;

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
        ],
    ];

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){

    }
}