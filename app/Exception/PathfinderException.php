<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 21.02.15
 * Time: 00:41
 */

namespace Exodus4D\Pathfinder\Exception;


use Exodus4D\Pathfinder\Lib\Config;

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

    /**
     * PathfinderException constructor.
     * @param string $message
     * @param int $code
     */
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
        $error->status = Config::getHttpStatusByCode($this->getResponseCode());
        $error->text = $this->getMessage();
        if(\Base::instance()->get('DEBUG') >= 1){
            $error->trace = preg_split('/\R/', $this->getTraceAsString()); // no $this->>getTrace() here -> to much data
        }
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