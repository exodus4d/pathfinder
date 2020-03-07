<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 21.02.15
 * Time: 00:12
 */

namespace Exodus4D\Pathfinder\Exception;


class ValidationException extends PathfinderException {

    /**
     * @var array
     */
    protected $codes = [
        2000 => 422
    ];

    /**
     * table column that triggers the exception
     * @var string
     */
    private $field;

    /**
     * ValidationException constructor.
     * @param string $message
     * @param string $field
     */
    public function __construct(string $message, string $field = ''){
        parent::__construct($message, 2000);
        $this->field = $field;
    }

    /**
     * get error object
     * @return \stdClass
     */
    public function getError() : \stdClass {
        $error = parent::getError();
        $error->field = $this->field;
        return $error;
    }
} 