<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 23:48
 */

namespace Controller;
use Controller\Api as Api;
use Controller\Ccp\Sso as Sso;
use lib\Config;
use Model;
use DB;

class Controller {

    // cookie specific keys (names)
    const COOKIE_NAME_STATE                         = 'cookie';
    const COOKIE_PREFIX_CHARACTER                   = 'char';

    // log text
    const LOG_UNAUTHORIZED                          = 'User-Agent: [%s]';
    const ERROR_SESSION_SUSPECT                     = 'Suspect id: [%45s], ip: [%45s], new ip: [%45s], User-Agent: [%s]';

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
        // store all user activities that are buffered for logging in this request
        self::storeActivities();

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

        // init DB based Session (not file based)
        if( $this->getDB('PF') instanceof DB\SQL){
            // init session with custom "onsuspect()" handler
            new DB\SQL\Session($this->getDB('PF'), 'sessions', true, function($session, $sid){
                $f3 = $this->getF3();
                if( ($ip = $session->ip() )!= $f3->get('IP') ){
                    // IP address changed -> not critical
                    self::getLogger('SESSION_SUSPECT')->write( sprintf(
                        self::ERROR_SESSION_SUSPECT,
                        $sid,
                        $session->ip(),
                        $f3->get('IP'),
                        $f3->get('AGENT')
                    ));
                    // no more error handling here
                    return true;
                }elseif($session->agent() != $f3->get('AGENT') ){
                    // The default behaviour destroys the suspicious session.
                    return false;
                }

                return true;
            });
        }
    }

    /**
     * get cookies "state" information
     * -> whether user accepts cookies
     * @return bool
     */
    protected function getCookieState(){
        return (bool)count( $this->getCookieByName(self::COOKIE_NAME_STATE) );
    }

    /**
     * search for existing cookies
     * -> either a specific cookie by its name
     * -> or get multiple cookies by their name (search by prefix)
     * @param $cookieName
     * @param bool $prefix
     * @return array
     */
    protected function getCookieByName($cookieName, $prefix = false){
        $data = [];

        if(!empty($cookieName)){
            $cookieData = (array)$this->getF3()->get('COOKIE');
            if($prefix === true){
                // look for multiple cookies with same prefix
                foreach($cookieData as $name => $value){
                    if(strpos($name, $cookieName) === 0){
                        $data[$name] = $value;
                    }
                }
            }elseif( isset($cookieData[$cookieName]) ){
                // look for a single cookie
                $data[$cookieName] = $cookieData[$cookieName];
            }
        }

        return $data;
    }

    /**
     * set/update logged in cookie by character model
     * -> store validation data in DB
     * @param Model\CharacterModel $character
     */
    protected function setLoginCookie(Model\CharacterModel $character){

        if( $this->getCookieState() ){
            $expireSeconds = (int) $this->getF3()->get('PATHFINDER.LOGIN.COOKIE_EXPIRE');
            $expireSeconds *= 24 * 60 * 60;

            $timezone = new \DateTimeZone( $this->getF3()->get('TZ') );
            $expireTime = new \DateTime('now', $timezone);

            // add cookie expire time
            $expireTime->add(new \DateInterval('PT' . $expireSeconds . 'S'));

            // unique "selector" -> to facilitate database look-ups (small size)
            // -> This is preferable to simply using the database id field,
            // which leaks the number of active users on the application
            $selector = bin2hex(mcrypt_create_iv(12, MCRYPT_DEV_URANDOM));

            // generate unique "validator" (strong encryption)
            // -> plaintext set to user (cookie), hashed version of this in DB
            $size = mcrypt_get_iv_size(MCRYPT_CAST_256, MCRYPT_MODE_CFB);
            $validator = bin2hex(mcrypt_create_iv($size, MCRYPT_DEV_URANDOM));

            // generate unique cookie token
            $token = hash('sha256', $validator);

            // get unique cookie name for this character
            $name = $character->getCookieName();

            $authData = [
                'characterId'   => $character,
                'selector'      => $selector,
                'token'         => $token,
                'expires'       => $expireTime->format('Y-m-d H:i:s')
            ];

            $authenticationModel = $character->rel('characterAuthentications');
            $authenticationModel->copyfrom($authData);
            $authenticationModel->save();

            $cookieValue = implode(':', [$selector, $validator]);

            // get cookie name -> save new one OR update existing cookie
            $cookieName = 'COOKIE.' . self::COOKIE_PREFIX_CHARACTER . '_' . $name;
            $this->getF3()->set($cookieName, $cookieValue, $expireSeconds);
        }
    }

    /**
     * get characters from given cookie data
     * -> validate cookie data
     * -> validate characters
     * -> cf. Sso->requestAuthorization() ( equivalent DB based login)
     * @param array $cookieData
     * @return array
     * @throws \Exception
     */
    protected function getCookieCharacters($cookieData = []){
        $characters = [];

        if(
            $this->getCookieState() &&
            !empty($cookieData)
        ){
            /**
             * @var $characterAuth Model\CharacterAuthenticationModel
             */
            $characterAuth = Model\BasicModel::getNew('CharacterAuthenticationModel');

            $timezone = new \DateTimeZone( $this->getF3()->get('TZ') );
            $currentTime = new \DateTime('now', $timezone);

            foreach($cookieData as $name => $value){
                // remove invalid cookies
                $invalidCookie = false;

                $data = explode(':', $value);
                if(count($data) === 2){
                    // cookie data is well formatted
                    $characterAuth->getByForeignKey('selector', $data[0], ['limit' => 1]);

                    // validate expire data
                    // validate token
                    if( !$characterAuth->dry() ){
                        if(
                            strtotime($characterAuth->expires) >= $currentTime->getTimestamp() &&
                            hash_equals($characterAuth->token, hash('sha256', $data[1]))
                        ){
                            // cookie information is valid
                            // -> try to update character information from CREST
                            // e.g. Corp has changed, this also ensures valid "access_token"
                            /**
                             * @var $character Model\CharacterModel
                             */
                            $updateStatus = $characterAuth->characterId->updateFromCrest();

                            if( empty($updateStatus) ){
                                // make sure character data is up2date!
                                // -> this is not the case if e.g. userCharacters was removed "ownerHash" changed...
                                $character = $characterAuth->rel('characterId');
                                $character->getById( $characterAuth->get('characterId', true) );

                                // check if character still has user (is not the case of "ownerHash" changed
                                // check if character is still authorized to log in (e.g. corp/ally or config has changed
                                // -> do NOT remove cookie on failure. This can be a temporary problem (e.g. CREST is down,..)
                                if(
                                    $character->hasUserCharacter() &&
                                    $character->isAuthorized()
                                ){
                                    $characters[$name] = $character;
                                }
                            }
                        }else{
                            // clear existing authentication data from DB
                            $characterAuth->erase();
                            $invalidCookie = true;
                        }
                    }else{
                        $invalidCookie = true;
                    }
                    $characterAuth->reset();
                }else{
                    $invalidCookie = true;
                }

                // remove invalid cookie
                if($invalidCookie){
                    $this->getF3()->clear('COOKIE.' . $name);
                }
            }
        }

        return $characters;
    }

    /**
     * get current character data from session
     * ->
     * @return array
     */
    public function getSessionCharacterData(){
        $data = [];

        if($user = $this->getUser()){
            $requestedCharacterId = 0;

            // get all characterData from currently active characters
            if($this->getF3()->get('AJAX')){
                // Ajax request -> get characterId from Header (if already available!)
                $header = $this->getRequestHeaders();
                $requestedCharacterId = (int)$header['Pf-Character'];

                if(
                    $requestedCharacterId > 0 &&
                    (int)$this->getF3()->get(Api\User::SESSION_KEY_TEMP_CHARACTER_ID) === $requestedCharacterId
                ){
                    // requested characterId is "now" available on the client  (Javascript)
                    // -> clear temp characterId for next character login/switch
                    $this->getF3()->clear(Api\User::SESSION_KEY_TEMP_CHARACTER_ID);
                }
            }

            if($requestedCharacterId <= 0){
                // Ajax BUT characterID not yet set as HTTP header
                // OR non Ajax -> get characterId from temp session (e.g. from HTTP redirect)
                $requestedCharacterId = (int)$this->getF3()->get(Api\User::SESSION_KEY_TEMP_CHARACTER_ID);
            }

            $data = $user->getSessionCharacterData($requestedCharacterId);
        }

        return $data;
    }

    /**
     * checks whether a user/character is currently logged in
     * @param \Base $f3
     * @return bool
     */
    protected function checkLogTimer($f3){
        $loginCheck = false;
        $characterData = $this->getSessionCharacterData();

        if( !empty($characterData) ){
            // check logIn time
            $logInTime = new \DateTime();
            $logInTime->setTimestamp( (int)$characterData['TIME'] );
            $now = new \DateTime();

            $timeDiff = $now->diff($logInTime);

            $minutes = $timeDiff->days * 60 * 24 * 60;
            $minutes += $timeDiff->h * 60;
            $minutes += $timeDiff->i;

            if($minutes <= $f3->get('PATHFINDER.TIMER.LOGGED')){
                $loginCheck = true;
            }
        }

        return $loginCheck;
    }

    /**
     * get current character
     * @param int $ttl
     * @return Model\CharacterModel|null
     * @throws \Exception
     */
    public function getCharacter($ttl = 0){
        $character = null;
        $characterData = $this->getSessionCharacterData();

        if( !empty($characterData) ){
            /**
             * @var $characterModel Model\CharacterModel
             */
            $characterModel = Model\BasicModel::getNew('CharacterModel');
            $characterModel->getById( (int)$characterData['ID'], $ttl);

            if(
                !$characterModel->dry() &&
                $characterModel->hasUserCharacter()
            ){
                $character = &$characterModel;
            }
        }

        return $character;
    }

    /**
     * get current user
     * @param int $ttl
     * @return Model\UserModel|null
     */
    public function getUser($ttl = 0){
        $user = null;

        if( $this->getF3()->exists(Api\User::SESSION_KEY_USER_ID) ){
            $userId = (int)$this->getF3()->get(Api\User::SESSION_KEY_USER_ID);
            if($userId){
                /**
                 * @var $userModel Model\UserModel
                 */
                $userModel = Model\BasicModel::getNew('UserModel');
                $userModel->getById($userId, $ttl);

                if(
                    !$userModel->dry() &&
                    $userModel->hasUserCharacters()
                ){
                    $user = &$userModel;
                }
            }
        }

        return $user;
    }

    public function getCharacterSessionData(){

    }

    /**
     * log out current character
     * @param \Base $f3
     */
    public function logout(\Base $f3){
        $params = (array)$f3->get('POST');

        // ----------------------------------------------------------
        // delete server side cookie validation data
        // for the active character
        if(
            $params['clearCookies'] === '1' &&
            ( $activeCharacter = $this->getCharacter())
        ){
            $activeCharacter->logout();
        }

        // destroy session login data -------------------------------
        $f3->clear('SESSION');
    }

    /**
     * get EVE server status from CREST
     * @param \Base $f3
     */
    public function getEveServerStatus(\Base $f3){
        $return = (object) [];
        $return->error = [];

        // server status can be cached for some seconds
        $cacheKey = 'eve_server_status';
        if( !$f3->exists($cacheKey) ){
            $sso = new Sso();
            $return->status = $sso->getCrestServerStatus();

            if( !$return->status->crestOffline ){
                $f3->set($cacheKey, $return, 60);
            }
        }else{
            // get from cache
            $return = $f3->get($cacheKey);
        }

        echo json_encode($return);
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
     * -> this function is called on each request!
     * -> configured in config.ini
     * @param \Base $f3
     * @return bool
     */
    public function unload(\Base $f3){
        // track some 4xx Client side errors
        // 5xx errors are handled in "ONERROR" callback
        $status = http_response_code();
        $halt = false;

        switch( $status ){
            case 403: // Unauthorized
                self::getLogger('UNAUTHORIZED')->write(sprintf(
                    self::LOG_UNAUTHORIZED,
                    $f3->get('AGENT')
                ));
                $halt = true;
                break;
        }

        // Ajax
        if(
            $halt &&
            $f3->get('AJAX')
        ){
            $params = (array)$f3->get('POST');
            $response = (object) [];
            $response->type = 'error';
            $response->code = $status;
            $response->message = 'Access denied: User not found';

            $return = (object) [];
            if( (bool)$params['reroute']){
                $return->reroute = rtrim(self::getEnvironmentData('URL'), '/') . $f3->alias('login');
            }else{
                // no reroute -> errors can be shown
                $return->error[] = $response;
            }

            echo json_encode($return);
            die();
        }

        return true;
    }

    /**
     * get controller by class name
     * -> controller class is searched within all controller directories
     * @param $className
     * @return null|\Controller\
     * @throws \Exception
     */
    static function getController($className){
        $controller = null;
        // add subNamespaces for controller classes
        $subNamespaces = ['Api', 'Ccp'];

        for($i = 0; $i <= count($subNamespaces); $i++){
            $path = [__NAMESPACE__];
            $path[] = ( isset($subNamespaces[$i - 1]) ) ? $subNamespaces[$i - 1] : '';
            $path[] = $className;
            $classPath = implode('\\', array_filter($path));

            if(class_exists($classPath)){
                $controller = new $classPath();
                break;
            }
        }

        if( is_null($controller) ){
            throw new \Exception( sprintf('Controller class "%s" not found!', $className) );
        }

        return $controller;
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
     * get the current registration status
     * 0=registration stop |1=new registration allowed
     * @return int
     */
    static function getRegistrationStatus(){
        return (int)\Base::instance()->get('PATHFINDER.REGISTRATION.STATUS');
    }

    /**
     * get a Logger object by Hive key
     * -> set in pathfinder.ini
     * @param string $type
     * @return \Log|null
     */
    static function getLogger($type){
        return LogController::getLogger($type);
    }

    /**
     * store activity log data to DB
     */
    static function storeActivities(){
        LogController::instance()->storeActivities();
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
        return Config::getEnvironmentData($key);
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

} 