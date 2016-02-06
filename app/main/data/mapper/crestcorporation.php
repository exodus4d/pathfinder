<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 31.01.2016
 * Time: 03:55
 */

namespace Data\Mapper;


class CrestCorporation extends AbstractIterator {

    protected static $map = [
        'id' => 'id',
        'name' => 'name',
        'isNPC' => 'isNPC'
    ];

}