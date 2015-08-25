<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 21.02.15
 * Time: 00:12
 */

namespace Exception;


class ValidationException extends BaseException {

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


    public function __construct($message, $field = 0){

        parent::__construct($message, self::VALIDATION_FAILED);

        $this->setField($field);
    }
} 