<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 29.11.2018
 * Time: 18:12
 */

namespace Exception;


class DateException extends PathfinderException {
    protected $codes = [
        3000 => 500         // invalid DateRange
    ];
}