<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 21.02.15
 * Time: 00:12
 */

namespace Exception;


class ValidationException extends BaseException {

    /**
     * table column that triggers the exception
     * @var string
     */
    private $field;

    /**
     * @return string
     */
    public function getField(): string {
        return $this->field;
    }

    /**
     * @param string $field
     */
    public function setField(string $field){
        $this->field = $field;
    }


    public function __construct(string $message, string $field = ''){
        parent::__construct($message, self::VALIDATION_EXCEPTION);
        $this->setField($field);
    }

    /**
     * get error object
     * @return \stdClass
     */
    public function getError(){
        $error = (object) [];
        $error->type = 'error';
        $error->field = $this->getField();
        $error->message = $this->getMessage();
        return $error;
    }
} 