<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 15.08.2015
 * Time: 21:21
 */

namespace Exception;


class RegistrationException extends PathfinderException{

    protected $codes = [
        2000 => 403
    ];

    /**
     * form field name that causes this exception
     * @var string
     */
    private $field;

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