<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 21.02.15
 * Time: 00:41
 */

namespace Exception;


class BaseException extends \Exception {

    const VALIDATION_FAILED = 403;
    const REGISTRATION_FAILED = 403;
    const CONFIGURATION_FAILED = 500;

    public function __construct($message, $code = 0){
        parent::__construct($message, $code);
    }

} 