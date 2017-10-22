<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 15.08.2015
 * Time: 21:21
 */

namespace Exception;


class RegistrationException extends BaseException{

    /**
     * form field name that causes this exception
     * @var string
     */
    private $field;

    /**
     * @return mixed
     */
    public function getField(){
        return $this->field;
    }

    /**
     * @param mixed $field
     */
    public function setField($field){
        $this->field = $field;
    }

    public function __construct($message, $field = ''){
        parent::__construct($message, self::REGISTRATION_EXCEPTION);
        $this->setField($field);
    }
}