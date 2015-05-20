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

    protected $fieldConf = array(
        'allianceId' => array(
            'belongs-to-one' => 'Model\AllianceModel'
        ),
        'mapId' => array(
            'belongs-to-one' => 'Model\MapModel'
        )
    );


}