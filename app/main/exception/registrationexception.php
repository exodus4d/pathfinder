<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 15.08.2015
 * Time: 21:21
 */

namespace Exception;


class RegistrationException extends BaseException{

    public function __construct($message){

        parent::__construct($message, self::REGISTRATION_FAILED);
    }
}