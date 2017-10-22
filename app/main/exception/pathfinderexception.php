<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 05.06.2017
 * Time: 19:19
 */

namespace Exception;


class PathfinderException extends BaseException{

    public function __construct($message){
        parent::__construct($message, self::CONFIG_VALUE_EXCEPTION);
    }
}