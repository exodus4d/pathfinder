<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 01.05.2016
 * Time: 19:17
 */

namespace Data\Mapper;


class CrestServiceStatus extends AbstractIterator {

    protected static $map = [
        'dust' => 'dust',
        'eve' => 'eve',
        'server' => 'server'
    ];
}