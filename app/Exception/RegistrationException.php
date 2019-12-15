<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 15.08.2015
 * Time: 21:21
 */

namespace Exodus4D\Pathfinder\Exception;


class RegistrationException extends PathfinderException{

    /**
     * @var array
     */
    protected $codes = [
        2000 => 403
    ];

    /**
     * form field name that causes this exception
     * @var string
     */
    private $field;

    /**
     * RegistrationException constructor.
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