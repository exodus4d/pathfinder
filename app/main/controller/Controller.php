<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 23:48
 */

namespace Controller;
use Model;
use DB;

class Controller {

    protected $f3;
    private $template;

    function __construct(){

        $this->f3 = \Base::instance();

        // initiate DB connection
        DB\Database::instance('PF');
    }

    /**
     * @param mixed $template
     */
    public function setTemplate($template){
        $this->template = $template;
    }

    /**
     * @return mixed
     */
    public function getTemplate(){
        return $this->template;
    }

    /**
     * event handler
     * @param $f3
     */
    function beforeroute($f3) {

    }

    /**
     * event handler
     */
    function afterroute() {
        if($this->template){
            echo \Template::instance()->render( $this->template );

        }
    }

    /**
     * set change the DB connection
     * @param string $database
     */
    protected function setDB($database = 'PF'){
        DB\Database::instance()->setDB($database);
    }

    /**
     * get current user model
     * @param int $ttl
     * @return bool|null
     * @throws \Exception
     */
    protected function _getUser($ttl = 5){

        $user = false;
        $userId = $this->f3->get('SESSION.user.id');

        if($userId > 0){
            $userModel = Model\BasicModel::getNew('UserModel');
            $userModel->getById($userId, $ttl);

            if( !$userModel->dry() ){
                $user = $userModel;
            }
        }

        return $user;
    }

    /**
     * check weather the page is IGB trusted or not
     * @return mixed
     */
    static function isIGBTrusted(){

        $igbHeaderData = self::getIGBHeaderData();

        return $igbHeaderData->trusted;
    }

    /**
     * extract all eve IGB specific header data
     * @return object
     */
    static function getIGBHeaderData(){
        $data = (object) [];
        $data->trusted = false;
        $data->values = [];
        $headerData = apache_request_headers();

        foreach($headerData as $key => $value){
            if (strpos($key, 'EVE_') === 0) {
                $key = str_replace('EVE_', '', $key);
                $key = strtolower($key);

                if (
                    $key === 'trusted' &&
                    $value === 'Yes'
                ) {
                    $data->trusted = true;
                }

                $data->values[$key] = $value;
            }
        }

        return $data;
    }

    /**
     * check if the current request was send from inGame
     * @return bool
     */
    static function isIGB(){
        $isIGB = false;

        $igbHeaderData = self::getIGBHeaderData();

        if(count($igbHeaderData->values) > 0){
            $isIGB = true;
        }

        return $isIGB;
    }

    /**
     * verifies weather a given username and password is valid
     * @param $userName
     * @param $password
     * @return Model\UserModel|null
     */
    protected function _verifyUser($userName, $password) {

        $validUser = null;

        $user =  Model\BasicModel::getNew('UserModel', 0);

        $user->getByName($userName);

        // check userName is valid
        if( !$user->dry() ){
            // check if password is valid
            $isValid = $user->verify($password);

            if($isValid === true){
                $validUser = $user;
            }
        }

        return $validUser;
    }


    /**
     * log the current user out
     * @param $f3
     */
    public function logOut($f3){

        // destroy session
        $f3->clear('SESSION');

        if( !$f3->get('AJAX') ){
            // redirect to landing page
            $f3->reroute('@landing');
        }else{
            $return = (object) [];
            $return->reroute = $f3->get('BASE') . $f3->alias('landing');
            $return->error[] = $this->getUserLoggedOffError();

            echo json_encode($return);
            die();
        }
    }

    /**
     * get error object is a user is not found/logged of
     * @return object
     */
    protected function getUserLoggedOffError(){
        $userError = (object) [];
        $userError->type = 'error';
        $userError->message = 'User not found';

        return $userError;
    }

    /**
     * get a log controller e.g. "debug"
     * @param $loggerType
     * @return mixed
     */
    static function getLogger($loggerType){
        return LogController::getLogger($loggerType);
    }

    /**
     * removes illegal characters from a Hive-key that are not allowed
     * @param $key
     * @return mixed
     */
    static function formatHiveKey($key){
        $illegalCharacters = ['-'];
        return str_replace($illegalCharacters, '', $key);
    }


} 