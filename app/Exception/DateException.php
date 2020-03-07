<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 29.11.2018
 * Time: 18:12
 */

namespace Exodus4D\Pathfinder\Exception;


class DateException extends PathfinderException {

    /**
     * @var array
     */
    protected $codes = [
        3000 => 500         // invalid DateRange
    ];
}