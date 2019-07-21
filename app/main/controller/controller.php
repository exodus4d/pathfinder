<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 08.02.15
 * Time: 23:48
 */

namespace Controller;

use Controller\Api as Api;
use Exception\PathfinderException;
use lib\api\CcpClient;
use lib\Config;
use lib\db\SQL;
use lib\Resource;
use lib\Monolog;
use lib\Util;
use Model\Pathfinder;
use DB;

class Controller {

    // cookie specific keys (names)
    const COOKIE_NAME_STATE                         = 'cookie';
    const COOKIE_PREFIX_CHARACTER                   = 'char';

    // log text
    const ERROR_SESSION_SUSPECT                     = 'id: [%45s], ip: [%45s], User-Agent: [%s]';
    const ERROR_TEMP_CHARACTER_ID                   = 'Invalid temp characterId: %s';

    const NOTIFICATION_TYPES                        = ['danger', 'warning', 'info', 'success'];
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
     * get $f3 base object
     * @return \Base
     */
    protected function getF3() : \Base {
        return \Base::instance();
    }

    /**
     * get DB connection
     * @param string $alias
     * @return SQL|null
     */
    protected function getDB(string $alias = 'PF') : ?SQL {
        return $this->getF3()->DB->getDB($alias);
    }

    /**
     * event handler for all "views"
     * some global template variables are set in here
     * @param \Base $f3
     * @param $params
     * @return bool
     */
    function beforeroute(\Base $f3, $params) : bool {
        // init user session
        $this->initSession($f3);

        if($f3->get('AJAX')){
            header('Content-Type: application/json');

            // send "maintenance" Header -> e.g. before server update
            if($modeMaintenance = (int)Config::getPathfinderData('login.mode_maintenance')){
                header('Pf-Maintenance: ' . $modeMaintenance);
            }
        }else{
            $this->initResource($f3);

            $this->setTemplate( Config::getPathfinderData('view.index') );
        }

        return true;
    }

    /**
     * event handler after routing
     * -> render view
     * @param \Base $f3
     */
    public function afterroute(\Base $f3){
        // send preload/prefetch headers
        $resource = Resource::instance();
        if($resource->getOption('output') === 'header'){
            header($resource->buildHeader(), false);
        }

        if($file = $this->getTemplate()){
            // Ajax calls don´t need a page render..
            // this happens on client side
            echo \Template::instance()->render($file);
        }
    }

    /**
     * init new Session handler
     * @param \Base $f3
     */
    protected function initSession(\Base $f3){
        $session = null;

        if(
            $f3->get('SESSION_CACHE') === 'mysql' &&
            ($db = $f3->DB->getDB('PF')) instanceof SQL
        ){
            if(!headers_sent() && session_status()!=PHP_SESSION_ACTIVE){
                /**
                 * callback() for suspect sessions
                 * @param $session
                 * @param $sid
                 * @return bool
                 */
                $onSuspect = function($session, $sid){
                    self::getLogger('SESSION_SUSPECT')->write( sprintf(
                        self::ERROR_SESSION_SUSPECT,
                        $sid,
                        $session->ip(),
                        $session->agent()
                    ));
                    // .. continue with default onSuspect() handler
                    // -> destroy session
                    return false;
                };

                new DB\SQL\MySQL\Session($db, 'sessions', true, $onSuspect);
            }
        }
    }

    /**
     * init new Resource handler
     * @param \Base $f3
     */
    protected function initResource(\Base $f3){
        $resource = Resource::instance();
        $resource->setOption('filePath', [
            'style'     => $f3->get('BASE') . '/public/css/' . Config::getPathfinderData('version'),
            'script'    => $f3->get('BASE') . '/public/js/' . Config::getPathfinderData('version'),
            'font'      => $f3->get('BASE') . '/public/fonts',
            'document'  => $f3->get('BASE') . '/public/templates',
            'image'     => $f3->get('BASE') . '/public/img'
        ]);

        $resource->register('style', 'pathfinder');

        $resource->register('script', 'lib/require');
        $resource->register('script', 'app');

        $resource->register('font', 'oxygen-regular-webfont');
        $resource->register('font', 'oxygen-bold-webfont');
        $resource->register('font', 'fa-regular-400');
        $resource->register('font', 'fa-solid-900');
        $resource->register('font', 'fa-brands-400');

        $f3->set('tplResource', $resource);
    }

    /**
     * get cookies "state" information
     * -> whether user accepts cookies
     * @return bool
     */
    protected function getCookieState() : bool {
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
    protected function getCookieByName($cookieName, $prefix = false) : array {
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
            }elseif(isset($cookieData[$cookieName])){
                // look for a single cookie
                $data[$cookieName] = $cookieData[$cookieName];
            }
        }

        return $data;
    }

    /**
     * set/update logged in cookie by character model
     * -> store validation data in DB
     * @param Pathfinder\CharacterModel $character
     * @throws \Exception
     */
    protected function setLoginCookie(Pathfinder\CharacterModel $character){
        if( $this->getCookieState() ){
            $expireSeconds = (int)Config::getPathfinderData('login.cookie_expire');
            $expireSeconds *= 24 * 60 * 60;

            $timezone = $this->getF3()->get('getTimeZone')();
            $expireTime = new \DateTime('now', $timezone);

            // add cookie expire time
            $expireTime->add(new \DateInterval('PT' . $expireSeconds . 'S'));

            // unique "selector" -> to facilitate database look-ups (small size)
            // -> This is preferable to simply using the database id field,
            // which leaks the number of active users on the application
            $selector = bin2hex( openssl_random_pseudo_bytes(12) );

            // generate unique "validator" (strong encryption)
            // -> plaintext set to user (cookie), hashed version of this in DB
            $size = openssl_cipher_iv_length('aes-256-cbc');
            $validator = bin2hex(openssl_random_pseudo_bytes($size) );

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
     *
     * @param array $cookieData
     * @param bool $checkAuthorization
     * @return Pathfinder\CharacterModel[]
     * @throws \Exception
     */
    protected function getCookieCharacters($cookieData = [], $checkAuthorization = true) : array {
        $characters = [];

        if(
            $this->getCookieState() &&
            !empty($cookieData)
        ){
            /**
             * @var $characterAuth Pathfinder\CharacterAuthenticationModel
             */
            $characterAuth = Pathfinder\AbstractPathfinderModel::getNew('CharacterAuthenticationModel');

            $timezone = $this->getF3()->get('getTimeZone')();
            $currentTime = new \DateTime('now', $timezone);

            foreach($cookieData as $name => $value){
                // remove invalid cookies
                $invalidCookie = false;

                $data = explode(':', $value);
                if(count($data) === 2){
                    // cookie data is well formatted
                    $characterAuth->getByForeignKey('selector', $data[0], ['limit' => 1]);

                    // validate "scope hash"
                    // -> either "normal" scopes OR "admin" scopes
                    // "expire data" and "validate token"
                    if( !$characterAuth->dry() ){
                        if(
                            strtotime($characterAuth->expires) >= $currentTime->getTimestamp() &&
                            hash_equals($characterAuth->token, hash('sha256', $data[1]))
                        ){
                            // cookie information is valid
                            // -> try to update character information from ESI
                            // e.g. Corp has changed, this also ensures valid "access_token"
                            /**
                             * @var $character Pathfinder\CharacterModel
                             */
                            $updateStatus = $characterAuth->characterId->updateFromESI();

                            if( empty($updateStatus) ){
                                // make sure character data is up2date!
                                // -> this is not the case if e.g. userCharacters was removed "ownerHash" changed...
                                $character = $characterAuth->rel('characterId');
                                $character->getById( $characterAuth->get('characterId', true) );

                                // check ESI scopes
                                $scopeHash = Util::getHashFromScopes($character->esiScopes);

                                if(
                                    $scopeHash === Util::getHashFromScopes(self::getScopesByAuthType()) ||
                                    $scopeHash === Util::getHashFromScopes(self::getScopesByAuthType('admin'))
                                ){
                                    // check if character still has user (is not the case of "ownerHash" changed
                                    // check if character is still authorized to log in (e.g. corp/ally or config has changed
                                    // -> do NOT remove cookie on failure. This can be a temporary problem (e.g. ESI is down,..)
                                    if( $character->hasUserCharacter() ){
                                        $authStatus = $character->isAuthorized();

                                        if(
                                            $authStatus == 'OK' ||
                                            !$checkAuthorization
                                        ){
                                            $character->virtual( 'authStatus', $authStatus);
                                        }

                                        $characters[$name] = $character;
                                    }
                                }else{
                                    // outdated/invalid ESI scopes
                                    $characterAuth->erase();
                                    $invalidCookie = true;
                                }
                            }else{
                                $invalidCookie = true;
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
     * @return array
     * @throws \Exception
     */
    public function getSessionCharacterData() : array {
        $data = [];
        if($user = $this->getUser()){
            $header = self::getRequestHeaders();
            $requestedCharacterId = (int)$header['Pf-Character'];
            if( !$this->getF3()->get('AJAX') ){
                $requestedCharacterId = (int)$_COOKIE['old_char_id'];
                if(!$requestedCharacterId){
                    $tempCharacterData = (array)$this->getF3()->get(Api\User::SESSION_KEY_TEMP_CHARACTER_DATA);
                    if((int)$tempCharacterData['ID'] > 0){
                        $requestedCharacterId = (int)$tempCharacterData['ID'];
                    }
                }
            }

            $data = $user->getSessionCharacterData($requestedCharacterId);
        }

        return $data;
    }

    /**
     * get current character
     * @param int $ttl
     * @return Pathfinder\CharacterModel|null
     * @throws \Exception
     */
    public function getCharacter(int $ttl = 0) : ?Pathfinder\CharacterModel {
        $character = null;

        if(!empty($characterData = $this->getSessionCharacterData())){
            /**
             * @var $characterModel Pathfinder\CharacterModel
             */
            $characterModel = Pathfinder\AbstractPathfinderModel::getNew('CharacterModel');
            $characterModel->getById((int)$characterData['ID'], $ttl);
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
     * @return Pathfinder\UserModel|null
     * @throws \Exception
     */
    public function getUser($ttl = 0) : ?Pathfinder\UserModel {
        $user = null;

        if($this->getF3()->exists(Api\User::SESSION_KEY_USER_ID, $userId)){
            /**
             * @var $userModel Pathfinder\UserModel
             */
            $userModel = Pathfinder\AbstractPathfinderModel::getNew('UserModel');
            $userModel->getById($userId, $ttl);

            if(
                !$userModel->dry() &&
                $userModel->hasUserCharacters()
            ){
                $user = &$userModel;
            }
        }

        return $user;
    }

    /**
     * set temp login character data (required during HTTP redirects on login)
     * @param int $characterId
     * @throws \Exception
     */
    protected function setTempCharacterData(int $characterId){
        if($characterId > 0){
            $tempCharacterData = [
                'ID'    => $characterId
            ];
            $this->getF3()->set(Api\User::SESSION_KEY_TEMP_CHARACTER_DATA, $tempCharacterData);
        }else{
            throw new \Exception( sprintf(self::ERROR_TEMP_CHARACTER_ID, $characterId) );
        }
    }

    /**
     * log out current character or all active characters (multiple browser tabs)
     * -> send response data to client
     * @param \Base $f3
     * @param bool $all
     * @param bool $deleteSession
     * @param bool $deleteLog
     * @param bool $deleteCookie
     * @throws \Exception
     */
    protected function logoutCharacter(\Base $f3, bool $all = false, bool $deleteSession = true, bool $deleteLog = true, bool $deleteCookie = false){
        $sessionCharacterData = (array)$f3->get(Api\User::SESSION_KEY_CHARACTERS);

        if($sessionCharacterData){
            $activeCharacterId = ($activeCharacter = $this->getCharacter()) ? $activeCharacter->_id : 0;
            /**
             * @var $character Pathfinder\CharacterModel
             */
            $character = Pathfinder\AbstractPathfinderModel::getNew('CharacterModel');
            $characterIds = [];
            foreach($sessionCharacterData as $characterData){
                if($characterData['ID'] === $activeCharacterId){
                    $characterIds[] = $activeCharacter->_id;
                    $activeCharacter->logout($deleteSession, $deleteLog, $deleteCookie);
                }elseif($all){
                    $character->getById($characterData['ID']);
                    $characterIds[] = $character->_id;
                    $character->logout($deleteSession, $deleteLog, $deleteCookie);
                }
                $character->reset();
            }

            if($characterIds){
                // broadcast logout information to webSocket server
                $f3->webSocket()->write('characterLogout', $characterIds);
            }
        }

        if($f3->get('AJAX')){
            $status = 403;
            $f3->status($status);

            $return = (object) [];
            $return->reroute = rtrim(self::getEnvironmentData('URL'), '/') . $f3->alias('login');
            $return->error[] = $this->getErrorObject($status, Config::getMessageFromHTTPStatus($status));

            echo json_encode($return);
        }else{
            // redirect to landing page
            $f3->reroute(['login']);
        }
    }

    /**
     * get EVE server status from ESI
     * @param \Base $f3
     * @throws \Exception
     */
    public function getEveServerStatus(\Base $f3){
        $esiStatusVersion = 'latest';
        $cacheKey = 'eve_server_status';

        if( !$f3->exists($cacheKey, $return) ){
            $return = (object) [];
            $return->error = [];

            /**
             * @var $client CcpClient
             */
            if($client = $f3->ccpClient()){
                $return->server = [
                    'name'              => strtoupper(self::getEnvironmentData('CCP_ESI_DATASOURCE')),
                    'status'            => 'offline',
                    'statusColor'       => 'red',
                ];
                $return->api = [
                    'name'              => 'ESI API',
                    'status'            => 'offline',
                    'statusColor'       => 'red',
                    'url'               => $client->getUrl(),
                    'timeout'           => $client->getTimeout(),
                    'connectTimeout'    => $client->getConnectTimeout(),
                    'readTimeout'       => $client->getReadTimeout(),
                    'proxy'             => ($proxy = $client->getProxy()) ? : 'false',
                    'verify'            => $client->getVerify(),
                    'debug'             => $client->getDebugRequests(),
                    'dataSource'        => $client->getDataSource(),
                    'statusVersion'     => $esiStatusVersion,
                    'routes'            => []
                ];

                $serverStatus = $client->getServerStatus();
                if( !isset($serverStatus['error']) ){
                    $statusData = $serverStatus['status'];
                    // calculate time diff since last server restart
                    $timezone = $f3->get('getTimeZone')();
                    $dateNow = new \DateTime('now', $timezone);
                    $dateServerStart = new \DateTime($statusData['startTime']);
                    $interval = $dateNow->diff($dateServerStart);
                    $startTimestampFormat = $interval->format('%hh %im');
                    if($interval->days > 0){
                        $startTimestampFormat = $interval->days . 'd ' . $startTimestampFormat;
                    }

                    $statusData['name']         = $return->server['name'];
                    $statusData['status']       = 'online';
                    $statusData['statusColor']  = 'green';
                    $statusData['startTime']    = $startTimestampFormat;
                    $return->server = $statusData;
                }else{
                    $return->error[] = (new PathfinderException($serverStatus['error'], 500))->getError();
                }

                $apiStatus = $client->getStatusForRoutes('latest');
                if( !isset($apiStatus['error']) ){
                    // find top status
                    $status = 'OK';
                    $color = 'green';
                    foreach($apiStatus['status'] as $statusData){
                        if('red' == $statusData['status']){
                            $status = 'unstable';
                            $color = $statusData['status'];
                            break;
                        }
                        if('yellow' == $statusData['status']){
                            $status = 'degraded';
                            $color = $statusData['status'];
                        }
                    }

                    $return->api['status']      = $status;
                    $return->api['statusColor'] = $color;
                    $return->api['routes']      = $apiStatus['status'];
                }else{
                    $return->error[] = (new PathfinderException($apiStatus['error'], 500))->getError();
                }

                if(empty($return->error)){
                    $f3->set($cacheKey, $return, 60);
                }
            }
        }

        echo json_encode($return);
    }

    /**
     * @param int $code
     * @param string $message
     * @param string $status
     * @param null $trace
     * @return \stdClass
     */
    protected function getErrorObject(int $code, string $message = '', string $status = '', $trace = null): \stdClass{
        $object = (object) [];
        $object->type = 'error';
        $object->code = $code;
        $object->status = empty($status) ? @constant('Base::HTTP_' . $code) : $status;
        if(!empty($message)){
            $object->message = $message;
        }
        if(!empty($trace)){
            $object->trace = $trace;
        }
        return $object;
    }

    /**
     * @param string $title
     * @param string $message
     * @param string $type
     * @return \stdClass
     */
    protected function getNotificationObject(string $title, $message = '', $type = 'danger') : \stdClass {
        $notification = (object) [];
        $notification->type = in_array($type, self::NOTIFICATION_TYPES) ? $type : 'danger';
        $notification->title = $title;
        $notification->message = $message;
        return $notification;
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
    protected function getUserAgent() : string {
        $userAgent = '';
        $userAgent .= Config::getPathfinderData('name');
        $userAgent .=  ' - ' . Config::getPathfinderData('version');
        $userAgent .=  ' | ' . Config::getPathfinderData('contact');
        $userAgent .=  ' (' . $_SERVER['SERVER_NAME'] . ')';

        return $userAgent;
    }

    /**
     * print error information in CLI mode
     * @param \stdClass $error
     */
    protected function echoErrorCLI(\stdClass $error){
        echo '[' . date('H:i:s') . '] ───────────────────────────' . PHP_EOL;
        foreach(get_object_vars($error) as $key => $value){
            $row = str_pad(' ',2 ) . str_pad($key . ':',10 );
            if($key == 'trace'){
                $value = preg_replace("/\r\n|\r|\n/", "\n" . str_pad(' ',12 ), $value);
                $row .= PHP_EOL . str_pad(' ',12 ) . $value;
            }else{
                $row .= $value;
            }
            echo $row . PHP_EOL;
        }
    }

    /**
     * onError() callback function
     * -> on AJAX request -> return JSON with error information
     * -> on HTTP request -> render error page
     * @param \Base $f3
     * @return bool
     */
    public function showError(\Base $f3){

        if(!headers_sent()){
            // collect error info -------------------------------------------------------------------------------------
            $errorData = $f3->get('ERROR');
            $exception = $f3->get('EXCEPTION');

            if($exception instanceof PathfinderException){
                // ... handle Pathfinder exceptions (e.g. validation Exceptions,..)
                $error = $exception->getError();
            }else{
                // ... handle error $f3->error() calls
                $error = $this->getErrorObject(
                    $errorData['code'],
                    $errorData['status'],
                    $errorData['text'],
                    $f3->get('DEBUG') >= 1 ? $errorData['trace'] : null
                );
            }

            // check if error is a PDO Exception ----------------------------------------------------------------------
            if(strpos(strtolower( $f3->get('ERROR.text') ), 'duplicate') !== false){
                preg_match_all('/\'([^\']+)\'/', $f3->get('ERROR.text'), $matches, PREG_SET_ORDER);

                if(count($matches) === 2){
                    $error->field = $matches[1][1];
                    $error->message = 'Value "' . $matches[0][1] . '" already exists';
                }
            }

            // set response status ------------------------------------------------------------------------------------
            if(!empty($error->code)){
                $f3->status($error->code);
            }

            if($f3->get('CLI')){
                $this->echoErrorCLI($error);
                // no further processing (no HTML output)
                return false;
            }elseif($f3->get('AJAX')){
                $return = (object) [];
                $return->error[] = $error;
                echo json_encode($return);
            }else{
                // non AJAX (e.g. GET/POST)
                // recursively clear existing output buffers
                while(ob_get_level()){
                    ob_end_clean();
                }

                $f3->set('tplPageTitle', 'ERROR - ' . $error->code);
                // set error data for template rendering
                $error->redirectUrl = $this->getRouteUrl();
                $f3->set('errorData', $error);

                // 4xx/5xx error -> set error page template
                if( preg_match('/^4[0-9]{2}$/', $error->code) ){
                    $f3->set('tplPageContent', Config::getPathfinderData('STATUS.4XX') );
                }elseif( preg_match('/^5[0-9]{2}$/', $error->code) ){
                    $f3->set('tplPageContent', Config::getPathfinderData('STATUS.5XX'));
                }

                // stop script - die(); after this fkt is done
                // -> unload() fkt is still called
                $f3->set('HALT', true);
            }
        }

        return true;
    }

    /**
     * Callback for framework "unload"
     * -> this function is called on each request!
     * -> configured in config.ini
     * @param \Base $f3
     * @return bool
     */
    public function unload(\Base $f3){
        // store all user activities that are buffered for logging in this request
        // this should work even on non HTTP200 responses
        $this->logActivities();

        return true;
    }

    /**
     * store activity log data to DB
     */
    protected function logActivities(){
        LogController::instance()->logActivities();
        Monolog::instance()->log();
    }

    /**
     * get controller by class name
     * -> controller class is searched within all controller directories
     * @param $className
     * @return null|Controller
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
     * get scope array by a "role"
     * @param string $authType
     * @return array
     */
    static function getScopesByAuthType(string $authType = '') : array {
        $scopes = array_filter((array)self::getEnvironmentData('CCP_ESI_SCOPES'));
        switch($authType){
            case 'admin':
                $scopesAdmin = array_filter((array)self::getEnvironmentData('CCP_ESI_SCOPES_ADMIN'));
                $scopes = array_merge($scopes, $scopesAdmin);
                break;
        }
        sort($scopes);
        return $scopes;
    }

    /**
     * Helper function to return all headers because
     * getallheaders() is not available under nginx
     * @return array (string $key -> string $value)
     */
    static function getRequestHeaders() : array {
        $headers = [];
        $headerPrefix = 'http_';
        $prefixLength = mb_strlen($headerPrefix);
        $serverData = self::getServerData();

        if(
            function_exists('apache_request_headers') &&
            $serverData->type === 'apache'
        ){
            // Apache WebServer
            $headers = apache_request_headers();
        }else{
            // Other WebServer, e.g. Nginx
            // Unfortunately this "fallback" does not work for me (Apache)
            // Therefore we can´t use this for all servers
            // https://github.com/exodus4d/pathfinder/issues/58
            foreach($_SERVER as $name => $value){
                $name = mb_strtolower($name);
                if(mb_substr($name, 0, $prefixLength) == $headerPrefix){
                    $headers[mb_convert_case(str_replace('_', '-', mb_substr($name, $prefixLength)), MB_CASE_TITLE)] = $value;
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
        return (int)Config::getPathfinderData('registration.status');
    }

    /**
     * get a Logger object by Hive key
     * -> set in pathfinder.ini
     * @param string $type
     * @return \Log
     */
    static function getLogger($type = 'DEBUG') : \Log {
        return LogController::getLogger($type);
    }

    /**
     * removes illegal characters from a Hive-key that are not allowed
     * @param $key
     * @return string
     */
    static function formatHiveKey($key) : string {
        $illegalCharacters = ['-', ' '];
        return strtolower(str_replace($illegalCharacters, '', $key));
    }

    /**
     * get environment specific configuration data
     * @param string $key
     * @return string|array|null
     */
    static function getEnvironmentData($key){
        return Config::getEnvironmentData($key);
    }

} 