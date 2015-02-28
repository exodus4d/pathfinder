<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 21.02.15
 * Time: 00:12
 */

namespace Exception;


class ValidationException extends BaseException {

    public function __construct($message, $code = 0){
        parent::__construct($message, $code);
    }
} 