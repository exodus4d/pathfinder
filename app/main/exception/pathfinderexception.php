<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 21.02.15
 * Time: 00:41
 */

namespace Exception;


class PathfinderException extends \Exception {

    /**
     * default HTTP response code for PathfinderExceptions
     * -> can be specified by using custom Exception codes
     */
    const DEFAULT_RESPONSECODE              = 500;

    /**
     * lists all exception codes
     * @var array
     */
    protected $codes = [
        0 => self::DEFAULT_RESPONSECODE
    ];

    public function __construct(string $message, int $code = 0){
        if( !array_key_exists($code, $this->codes) ){
            // exception code not specified by child class
            $code = 0;
        }
        parent::__construct($message, $code);
    }

    /**
     * get error object
     * @return \stdClass
     */
    public function getError() : \stdClass {
        $error = (object) [];
        $error->type = 'error';
        $error->code = $this->getResponseCode();
        $error->status = @constant('Base::HTTP_' .  $this->getResponseCode());
        $error->message = $this->getMessage();
        //$error->trace = $this->getTraceAsString();
        $error->trace = $this->getTrace();
        return $error;
    }

    /**
     * returns the HTTP response code for the client from exception
     * -> if Exception is not handled/catched 'somewhere' this code is used by the final onError handler
     * @return int
     */
    public function getResponseCode() : int {
        return $this->codes[$this->getCode()];
    }
} 