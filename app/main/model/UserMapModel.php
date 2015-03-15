<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 28.02.15
 * Time: 11:57
 */

namespace Model;


class UserMapModel extends BasicModel {

    protected $table = 'user_map';
    protected $ttl = 5;
    protected $rel_ttl = 5;

    protected $fieldConf = array(
        'userId' => array(
            'belongs-to-one' => 'Model\UserModel'
        ),
        'mapId' => array(
            'belongs-to-one' => 'Model\MapModel'
        )
    );



} 