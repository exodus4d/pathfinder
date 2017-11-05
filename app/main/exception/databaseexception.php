<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 25.08.2017
 * Time: 20:31
 */

namespace Exception;

class DatabaseException extends BaseException {

    public function __construct(string $message){
        parent::__construct($message, self::DB_EXCEPTION);
    }
}