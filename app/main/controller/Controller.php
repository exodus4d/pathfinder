<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 23:48
 */

namespace Controller;
use Model;

class Controller {

    protected $f3;
    private $template;

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

    function __construct(){

        $f3 = \Base::instance();
        $this->f3 = $f3;

        // init DB
        $this->setDB('PF');
    }

    /**
     * event handler
     */
    function beforeroute() {

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
     * set/change DB connection
     * @param $type
     */
    protected function setDB($type = ''){

        if($type === 'CCP'){
            // CCP DB
            $db = new \DB\SQL(
                $this->f3->get('DB_CCP_DNS') . $this->f3->get('DB_CCP_NAME'),
                $this->f3->get('DB_CCP_USER'),
                $this->f3->get('DB_CCP_PASS')
            );
        }else{
            // Pathfinder DB
            $db = new \DB\SQL(
                $this->f3->get('DB_DNS') . $this->f3->get('DB_NAME'),
                $this->f3->get('DB_USER'),
                $this->f3->get('DB_PASS')
            );
        }
        $this->f3->set('DB', $db);

        // set DB timezone to UTC +00:00 (eve server time)
        $this->f3->get('DB')->exec('SET @@session.time_zone = "+00:00";');
    }

    /**
     * get current user model
     * @return bool|null
     * @throws \Exception
     */
    protected function _getUser(){

        $user = false;
        $userId = $this->f3->get('SESSION.user.id');

        if($userId > 0){
            $userModel = Model\BasicModel::getNew('UserModel');
            $userModel->getById($userId);

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
     * @return bool user object if valid
     */
    protected function _verifyUser($userName, $password) {

        $validUser = false;

        $user =  Model\BasicModel::getNew('UserModel');

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
     * logout function
     */
    public function logOut(){

        // destroy session
        $this->f3->clear('SESSION');

        if( !$this->f3->get('AJAX') ){
            // redirect to landing page
            $this->f3->reroute('@landing');
        }else{
            $return = (object) [];
            $return->reroute = $this->f3->get('BASE') . $this->f3->alias('landing');
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