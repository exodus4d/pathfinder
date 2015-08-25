<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 07.06.15
 * Time: 18:16
 */

namespace Model;


class SystemStaticModel extends BasicModel {

    protected $table = 'system_static';

    /**
     * get systemStatic data as object
     * @return object
     */
    public function getData(){

        $systemStaticData = (object) [];
        $systemStaticData->security = $this->security;
        $systemStaticData->name = $this->name;

        return $systemStaticData;
    }
}
