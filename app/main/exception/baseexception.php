<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 21.02.15
 * Time: 00:41
 */

namespace Exception;


class BaseException extends \Exception {

    const VALIDATION_EXCEPTION              = 403;
    const REGISTRATION_EXCEPTION            = 403;
    const CONFIG_VALUE_EXCEPTION            = 500;
    const DB_EXCEPTION                      = 500;

    public function __construct(string $message, int $code = 0){
        parent::__construct($message, $code);
    }

} 