<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 19.05.2015
 * Time: 20:01
 */

namespace Model;


class CorporationMapModel extends BasicModel {

    protected $table = 'corporation_map';

    protected $fieldConf = array(
        'corporationId' => array(
            'belongs-to-one' => 'Model\CorporationModel'
        ),
        'mapId' => array(
            'belongs-to-one' => 'Model\MapModel'
        )
    );

    /**
     * see parent
     */
    public function clearCacheData(){
        parent::clearCacheData();

        // clear map cache as well
        $this->mapId->clearCacheData();
    }

}