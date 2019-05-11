<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 18.05.2018
 * Time: 17:50
 */

namespace Model\Universe;

use DB\SQL\Schema;

class SystemStaticModel extends AbstractUniverseModel {

    protected $table = 'system_static';

    protected $fieldConf = [
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
        'wormholeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Universe\WormholeModel',
            'constraint' => [
                [
                    'table' => 'wormhole',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ]
    ];

    /**
     * No static columns added
     * @var bool
     */
    protected $addStaticFields = false;

    /**
     * get static data
     * @return null|string
     */
    public function getData(){
        return $this->wormholeId ? $this->wormholeId->name : null;
    }
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){}

    /**
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     * @throws \Exception
     */
    public static function setup($db = null, $table = null, $fields = null){
        if($status = parent::setup($db, $table, $fields)){
            $status = parent::setMultiColumnIndex(['systemId', 'wormholeId'], true);
        }
        return $status;
    }
}