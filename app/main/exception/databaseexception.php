<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 25.08.2017
 * Time: 20:31
 */

namespace Exception;

class DatabaseException extends PathfinderException {

    protected $codes = [
        1500 => 500
    ];

    public function __construct(string $message){
        parent::__construct($message, 1500);
    }
}