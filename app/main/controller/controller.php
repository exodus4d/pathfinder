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
     * event handler for all "views"
     * some global template variables are set in here
     * @param $f3
     */
    function beforeroute($f3) {

        // check if user is in game
        $f3->set('isIngame', self::isIGB() );

        // js path (build/minified or raw uncompressed files)
        $f3->set('pathJs', 'public/js/' . $f3->get('PATHFINDER.VERSION') );
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
     * get all eve IGB specific header data
     * @return object
     */
    static function getIGBHeaderData(){
        $data = (object) [];
        $data->trusted = false;
        $data->values = [];
        $headerData = apache_request_headers();

        foreach($headerData as $key => $value){
            $key = strtolower($key);
            $key = str_replace('eve_', 'eve-', $key);


            if (strpos($key, 'eve-') === 0) {
                $key = str_replace('eve-', '', $key);

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
        $f3->clear('SESSION.user');
        $f3->sync('SESSION');

        if( !$f3->get('AJAX') ){
            // redirect to landing page
            $f3->reroute('@landing');
        }else{
            $return = (object) [];
            $return->reroute = self::getEnvironmentData('URL') . $f3->alias('landing');
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
     * get the current registration status
     * 0=registration stop |1=new registration allowed
     * @return int
     */
    static function getRegistrationStatus(){
        return (int)\Base::instance()->get('PATHFINDER.REGISTRATION.STATUS');
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
        $illegalCharacters = ['-', ' '];
        return strtolower( str_replace($illegalCharacters, '', $key) );
    }

    /**
     * get environment specific configuration data
     * @param $key
     * @return mixed|null
     */
    static function getEnvironmentData($key){
        $f3 = \Base::instance();
        $environment = $f3->get('PATHFINDER.ENVIRONMENT.SERVER');
        $environmentKey = 'PATHFINDER.ENVIRONMENT[' . $environment . '][' . $key . ']';
        $data = null;

        if( $f3->exists($environmentKey) ){
            $data = $f3->get($environmentKey);
        }

        return $data;
    }


    /**
     * function is called on each error
     * @param $f3
     */
    public function showError($f3){

        // set HTTP status
        if(!empty($f3->get('ERROR.code'))){
            $f3->status($f3->get('ERROR.code'));
        }

        if($f3->get('AJAX')){
            // error on ajax call
            header('Content-type: application/json');

            $return = (object) [];
            $error = (object) [];
            $error->type = 'error';
            $error->code = $f3->get('ERROR.code');
            $error->status = $f3->get('ERROR.status');
            $error->message = $f3->get('ERROR.text');

            // append stack trace for greater debug level
            if( $f3->get('DEBUG') === 3){
                $error->trace = $f3->get('ERROR.trace');
            }

            // check if error is a PDO Exception
            if(strpos(strtolower( $f3->get('ERROR.text') ), 'duplicate') !== false){
                preg_match_all('/\'([^\']+)\'/', $f3->get('ERROR.text'), $matches, PREG_SET_ORDER);

                if(count($matches) === 2){
                    $error->field = $matches[1][1];
                    $error->message = 'Value "' . $matches[0][1] . '" already exists';
                }
            }

            $return->error[] = $error;

            echo json_encode($return);
        }else{
            echo $f3->get('ERROR.text');
        }

        die();
    }

} 