<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 25.08.2017
 * Time: 20:31
 */

namespace Exodus4D\Pathfinder\Exception;


class DatabaseException extends PathfinderException {

    /**
     * @var array
     */
    protected $codes = [
        1500 => 500
    ];

    /**
     * DatabaseException constructor.
     * @param string $message
     */
    public function __construct(string $message){
        parent::__construct($message, 1500);
    }
}