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

    protected $fieldConf = [
        'userId' => [
            'belongs-to-one' => 'Model\UserModel'
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