<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 19.05.2015
 * Time: 20:14
 */

namespace Model;


class AllianceMapModel extends BasicModel {


    protected $table = 'alliance_map';

    protected $fieldConf = [
        'allianceId' => [
            'belongs-to-one' => 'Model\AllianceModel'
        ],
        'mapId' => [
            'belongs-to-one' => 'Model\MapModel'
        ]
    ];

    /**
     * see parent
     */
    public function clearCacheData(){
        parent::clearCacheData();

        // clear map cache as well
        $this->mapId->clearCacheData();
    }
}