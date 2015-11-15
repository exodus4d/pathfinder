<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 07.06.15
 * Time: 18:16
 */

namespace Model;


class SystemWormholeModel extends BasicModel {

    protected $table = 'system_wormhole';

    protected $fieldConf = [
        'wormholeId' => [
            'belongs-to-one' => 'Model\WormholeModel'
        ]
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
