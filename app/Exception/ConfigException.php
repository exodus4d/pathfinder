<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 20.10.2018
 * Time: 18:53
 */

namespace Exodus4D\Pathfinder\Exception;


class ConfigException extends PathfinderException {

    /**
     * @var array
     */
    protected $codes = [
        1000 => 500
    ];

}