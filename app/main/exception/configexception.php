<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 20.10.2018
 * Time: 18:53
 */

namespace Exception;


class ConfigException extends PathfinderException {

    protected $codes = [
        1000 => 500
    ];

}