<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 07.06.15
 * Time: 18:16
 */

namespace Model;

use DB\SQL\Schema;

class SystemWormholeModel extends BasicModel {

    protected $table = 'system_wormhole';

    protected $fieldConf = [
        'constellationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
        ],
        'wormholeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\WormholeModel',
            'constraint' => [
                [
                    'table' => 'wormhole',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
    ];

    /**
     * get wormhole data as object
     * @return object
     */
    public function getData(){

        $systemWormholeData = $this->wormholeId->getData();

        return $systemWormholeData;
    }
}
