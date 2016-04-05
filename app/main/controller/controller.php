<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 23:48
 */

namespace Controller;
use Controller\Api as Api;
use Model;
use DB;

class Controller {

    /**
     * @var \Base
     */
    protected $f3;

    /**
     * @var string template for render
     */
    protected $template;

    /**
     * @param string $template
     */
    protected function setTemplate($template){
        $this->template = $template;
    }

    /**
     * @return string
     */
    protected function getTemplate(){
        return $this->template;
    }

    /**
     * set $f3 base object
     * @param \Base $f3
     */
    protected function setF3(\Base $f3){
        $this->f3 = $f3;
    }

    /**
     * get $f3 base object
     * @return \Base
     */
    protected function getF3(){
        if( !($this->f3 instanceof \Base) ){
            $this->setF3( \Base::instance() );
        }
        return $this->f3;
    }

    /**
     * event handler for all "views"
     * some global template variables are set in here
     * @param \Base $f3
     */
    function beforeroute(\Base $f3) {
        $this->setF3($f3);

        // initiate DB connection
        DB\Database::instance('PF');

        // init user session
        $this->initSession();

        if( !$f3->get('AJAX') ){
            // set page parameters for static page render
            // check if user is in game (IGB active)
            $f3->set('isIngame', self::isIGB() );

            // js path (build/minified or raw uncompressed files)
            $f3->set('pathJs', 'public/js/' . $f3->get('PATHFINDER.VERSION') );

            $this->setTemplate( $f3->get('PATHFINDER.VIEW.INDEX') );
        }
    }

    /**
     * event handler after routing
     * -> render view
     * @param \Base $f3
     */
    public function afterroute(\Base $f3){
        if($this->getTemplate()){
            // Ajax calls don´t need a page render..
            // this happens on client side
            echo \Template::instance()->render( $this->getTemplate() );
        }
    }

    /**
     * set change the DB connection
     * @param string $database
     * @return DB\SQL
     */
    protected function getDB($database = 'PF'){
        return DB\Database::instance()->getDB($database);
    }

    /**
     * init new Session handler
     */
    protected function initSession(){
        // init DB Session (not file based)
        if( $this->getDB('PF') instanceof DB\SQL){
            new DB\SQL\Session($this->getDB('PF'));
        }
    }

    /**
     * get current character model
     * @param int $ttl
     * @return Model\CharacterModel|null
     * @throws \Exception
     */
    public function getCharacter($ttl = 0){
        $character = null;

        if( $this->getF3()->exists(Api\User::SESSION_KEY_CHARACTER_ID) ){
            $characterId = (int)$this->getF3()->get(Api\User::SESSION_KEY_CHARACTER_ID);
            if($characterId){
                /**
                 * @var $characterModel \Model\CharacterModel
                 */
                $characterModel = Model\BasicModel::getNew('CharacterModel');
                $characterModel->getById($characterId, $ttl);

                if( !$characterModel->dry() ){
                    $character = &$characterModel;
                }
            }
        }

        return $character;
    }

    /**
     * log out current user
     * @param \Base $f3
     */
    public function logOut(\Base $f3){
        // destroy session
        $f3->clear('SESSION');

        if( $f3->get('AJAX') ){
            $params = $f3->get('POST');
            $return = (object) [];
            if(
                isset($params['reroute']) &&
                (bool)$params['reroute']
            ){
                $return->reroute = rtrim(self::getEnvironmentData('URL'), '/') . $f3->alias('login');
            }else{
                // no reroute -> errors can be shown
                $return->error[] = $this->getLogoutError();
            }

            echo json_encode($return);
            die();
        }else{
            // redirect to landing page
            $f3->reroute('@login');
        }
    }

    /**
     * check weather the page is IGB trusted or not
     * @return boolean
     */
    static function isIGBTrusted(){
        $igbHeaderData = self::getIGBHeaderData();
        return $igbHeaderData->trusted;
    }

    /**
     * get all eve IGB specific header data
     * @return \stdClass
     */
    static function getIGBHeaderData(){
        $data = (object) [];
        $data->trusted = false;
        $data->values = [];
        $headerData = self::getRequestHeaders();

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
     * Helper function to return all headers because
     * getallheaders() is not available under nginx
     * @return array (string $key -> string $value)
     */
    static function getRequestHeaders(){
        $headers = [];

        $serverData = self::getServerData();

        if(
            function_exists('apache_request_headers') &&
            $serverData->type === 'apache'
        ){
            // Apache Webserver
            $headers = apache_request_headers();
        }else{
            // Other webserver, e.g. Nginx
            // Unfortunately this "fallback" does not work for me (Apache)
            // Therefore we can´t use this for all servers
            // https://github.com/exodus4d/pathfinder/issues/58
            foreach($_SERVER as $name => $value){
                if(substr($name, 0, 5) == 'HTTP_'){
                    $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
                }
            }
        }
        
        return $headers;
    }

    /**
     * get some server information
     * @param int $ttl cache time (default: 1h)
     * @return \stdClass
     */
    static function getServerData($ttl = 3600){
        $f3 = \Base::instance();
        $cacheKey = 'PF_SERVER_INFO';

        if( !$f3->exists($cacheKey) ){
            $serverData = (object) [];
            $serverData->type = 'unknown';
            $serverData->version = 'unknown';
            $serverData->requiredVersion = 'unknown';
            $serverData->phpInterfaceType = php_sapi_name();

            if(strpos(strtolower($_SERVER['SERVER_SOFTWARE']), 'nginx' ) !== false){
                // Nginx server
                $serverSoftwareArgs = explode('/', strtolower( $_SERVER['SERVER_SOFTWARE']) );
                $serverData->type = reset($serverSoftwareArgs);
                $serverData->version = end($serverSoftwareArgs);
                $serverData->requiredVersion = $f3->get('REQUIREMENTS.SERVER.NGINX.VERSION');
            }elseif(strpos(strtolower($_SERVER['SERVER_SOFTWARE']), 'apache' ) !== false){
                // Apache server
                $serverData->type = 'apache';
                $serverData->requiredVersion = $f3->get('REQUIREMENTS.SERVER.APACHE.VERSION');

                // try to get the apache version...
                if(function_exists('apache_get_version')){
                    // function does not exists if PHP is running as CGI/FPM module!
                    $matches = preg_split('/[\s,\/ ]+/', strtolower( apache_get_version() ) );
                    if(count($matches) > 1){
                        $serverData->version = $matches[1];
                    }
                }
            }

            // cache data for one day
            $f3->set($cacheKey, $serverData, $ttl);
        }

        return $f3->get($cacheKey);
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
     * get error object is a user is not found/logged of
     * @return \stdClass
     */
    protected function getLogoutError(){
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
     * @param string $loggerType
     * @return \Log
     */
    static function getLogger($loggerType){
        return LogController::getLogger($loggerType);
    }

    /**
     * removes illegal characters from a Hive-key that are not allowed
     * @param $key
     * @return string
     */
    static function formatHiveKey($key){
        $illegalCharacters = ['-', ' '];
        return strtolower( str_replace($illegalCharacters, '', $key) );
    }

    /**
     * get environment specific configuration data
     * @param string $key
     * @return string|null
     */
    static function getEnvironmentData($key){
        $f3 = \Base::instance();
        $environment = self::getEnvironment();
        $environmentKey = 'ENVIRONMENT[' . $environment . '][' . $key . ']';
        $data = null;

        if( $f3->exists($environmentKey) ){
            $data = $f3->get($environmentKey);
        }
        return $data;
    }

    /**
     * get current server environment status
     * -> "DEVELOP" or "PRODUCTION"
     * @return string
     */
    static function getEnvironment(){
        $f3 = \Base::instance();
        return $f3->get('ENVIRONMENT.SERVER');
    }

    /**
     * check if current server is "PRODUCTION"
     * @return bool
     */
    static function isProduction(){
        return self::getEnvironment() == 'PRODUCTION';
    }

    /**
     * get required MySQL variable value
     * @param $key
     * @return string|null
     */
    static function getRequiredMySqlVariables($key){
        $f3 = \Base::instance();
        $requiredMySqlVarKey = 'REQUIREMENTS[MYSQL][VARS][' . $key . ']';
        $data = null;

        if( $f3->exists($requiredMySqlVarKey) ){
            $data = $f3->get($requiredMySqlVarKey);
        }
        return $data;
    }

    /**
     * get a program URL by alias
     * -> if no $alias given -> get "default" route (index.php)
     * @param null $alias
     * @return bool|string
     */
    protected function getRouteUrl($alias = null){
        $url = false;

        if(!empty($alias)){
            // check given alias is a valid (registered) route
            if(array_key_exists($alias, $this->getF3()->get('ALIASES'))){
                $url = $this->getF3()->alias($alias);
            }
        }elseif($this->getF3()->get('ALIAS')){
            // get current URL
            $url = $this->getF3()->alias( $this->getF3()->get('ALIAS') );
        }else{
            // get main (index.php) URL
            $url = $this->getF3()->alias('login');
        }

        return $url;
    }

    /**
     * get a custom userAgent string for API calls
     * @return string
     */
    protected function getUserAgent(){
        $userAgent = '';
        $userAgent .= $this->getF3()->get('PATHFINDER.NAME');
        $userAgent .=  ' - ' . $this->getF3()->get('PATHFINDER.VERSION');
        $userAgent .=  ' | ' . $this->getF3()->get('PATHFINDER.CONTACT');
        $userAgent .=  ' (' . $_SERVER['SERVER_NAME'] . ')';

        return $userAgent;
    }

    /**
     * onError() callback function
     * -> on AJAX request -> return JSON with error information
     * -> on HTTP request -> render error page
     * @param \Base $f3
     */
    public function showError(\Base $f3){
        // set HTTP status
        $errorCode = $f3->get('ERROR.code');
        if(!empty($errorCode)){
            $f3->status($errorCode);
        }

        // collect error info ---------------------------------------
        $return = (object) [];
        $error = (object) [];
        $error->type = 'error';
        $error->code = $errorCode;
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

        // return error information ---------------------------------
        if($f3->get('AJAX')){
            header('Content-type: application/json');
            echo json_encode($return);
            die();
        }else{
            // set error data for template rendering
            $error->redirectUrl = $this->getRouteUrl();
            $f3->set('errorData', $error);

            if( preg_match('/^4[0-9]{2}$/', $error->code) ){
                // 4xx error -> render error page
                $f3->set('pageContent', $f3->get('PATHFINDER.STATUS.4XX'));
            }elseif( preg_match('/^5[0-9]{2}$/', $error->code) ){
                $f3->set('pageContent', $f3->get('PATHFINDER.STATUS.5XX'));
            }

            echo \Template::instance()->render( $f3->get('PATHFINDER.VIEW.INDEX') );
            die();
        }
    }

    /**
     * Callback for framework "unload"
     * check -> config.ini
     * @param \Base $f3
     * @return bool
     */
    public function unload(\Base $f3){
        return true;
    }

} 