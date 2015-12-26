<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 29.03.15
 * Time: 20:50
 */

namespace Controller\Api;
use Controller;
use controller\MailController;
use Model;
use Exception;
use DB;

class User extends Controller\Controller{

    /**
     * valid reasons for captcha images
     * @var array
     */
    private static $captchaReason = ['createAccount', 'deleteAccount'];

    /**
     * login function
     * @param $f3
     */
    public function logIn($f3){
        $data = $data = $f3->get('POST');

        $return = (object) [];

        $user = null;

        if($data['loginData']){
            $loginData = $data['loginData'];
            $user = $this->logUserIn( $loginData['userName'], $loginData['userPassword'] );
        }

        // set "vague" error
        if(is_null($user)){
            $return->error = [];
            $loginError = (object) [];
            $loginError->type = 'login';
            $return->error[] = $loginError;
        }else{
            // update/check api data
            $user->updateApiData();

            // route user to map app
            $return->reroute = self::getEnvironmentData('URL') . $f3->alias('map');
        }

        echo json_encode($return);
    }

    /**
     * core function for user login
     * @param $userName
     * @param $password
     * @return Model\UserModel|null
     */
    private function logUserIn($userName, $password){

        // try to verify user
        $user = $this->_verifyUser($userName, $password);

        if( !is_null($user)){
            // user is verified -> ready for login

            // set Session login
            $dateTime = new \DateTime();

            $this->f3->set('SESSION.user', [
                'time' => $dateTime->getTimestamp(),
                'name' => $user->name,
                'id' => $user->id
            ]);

            // save user login information
            $user->touch('lastLogin');
            $user->save();

            // save log
            $logText = "id: %s, name: %s, ip: %s";
            self::getLogger( $this->f3->get('PATHFINDER.LOGFILES.LOGIN') )->write(
                sprintf($logText, $user->id, $user->name, $this->f3->get('IP'))
            );
        }

        return $user;
    }

    /**
     * get captcha image and store key to session
     * @param $f3
     */
    public function getCaptcha($f3){
        $data = $f3->get('POST');

        $return = (object) [];
        $return->error = [];

        // check if reason for captcha generation is valid
        if(
            isset($data['reason']) &&
            in_array( $data['reason'], self::$captchaReason)
        ){
            $reason = $data['reason'];

            $im = imagecreatetruecolor(1, 1);
            $colorText = imagecolorallocate($im, 102, 200, 79);
            $colorBG = imagecolorallocate($im, 49, 51, 53);

            $img = new \Image();
            $imgDump = $img->captcha(
                'fonts/oxygen-bold-webfont.ttf',
                14,
                6,
                'SESSION.' . $reason,
                '',
                $colorText,
                $colorBG
            )->dump();

            $return->img = $f3->base64( $imgDump,  'image/png');
        }else{
            $captchaError = (object) [];
            $captchaError->type = 'error';
            $captchaError->message = 'Could not create captcha image';
            $return->error[] = $captchaError;
        }

        echo json_encode($return);
    }

    /**
     * delete the character log entry for the current active (main) character
     * @param $f3
     */
    public function deleteLog($f3){

        $user = $this->_getUser();
        if($user){
            $activeUserCharacter = $user->getActiveUserCharacter();

            if($activeUserCharacter){
                $character = $activeUserCharacter->getCharacter();

                if($characterLog = $character->getLog()){
                    $characterLog->erase();
                }
            }
        }
    }

    /**
     * log the current user out + clear character system log data
     * @param $f3
     */
    public function logOut($f3){
        $this->deleteLog($f3);
        parent::logOut($f3);
    }

    /**
     * save/update "map sharing" configurations for all map types
     * the user has access to
     * @param $f3
     */
    public function saveSharingConfig($f3){
        $data = $f3->get('POST');

        $return = (object) [];

        $privateSharing = 0;
        $corporationSharing = 0;
        $allianceSharing = 0;

        $user = $this->_getUser();

        if($user){

            // form values
            if(isset($data['formData'])){
                $formData = $data['formData'];

                if(isset($formData['privateSharing'])){
                    $privateSharing = 1;
                }

                if(isset($formData['corporationSharing'])){
                    $corporationSharing = 1;
                }

                if(isset($formData['allianceSharing'])){
                    $allianceSharing = 1;
                }
            }

            $user->sharing = $privateSharing;
            $user->save();

            // update corp/ally ---------------------------------------------------------------

            $activeUserCharacter = $user->getActiveUserCharacter();

            if(is_object($activeUserCharacter)){
                $corporation = $activeUserCharacter->getCharacter()->getCorporation();
                $alliance = $activeUserCharacter->getCharacter()->getAlliance();

                if(is_object($corporation)){
                    $corporation->sharing = $corporationSharing;
                    $corporation->save();
                }

                if(is_object($alliance)){
                    $alliance->sharing = $allianceSharing;
                    $alliance->save();
                }
            }

            $return->userData = $user->getData();
        }

        echo json_encode($return);
    }

    /**
     * search for a registration key model
     * e.g. for new user registration with "invite" feature enabled
     * @param $email
     * @param $registrationKey
     * @return bool|Model\RegistrationKeyModel
     * @throws Exception
     */
    protected function getRegistrationKey($email, $registrationKey){
        $registrationKeyModel = Model\BasicModel::getNew('RegistrationKeyModel');
        $registrationKeyModel->load([
            'registrationKey = :registrationKey AND
            email = :email AND
            used = 0 AND
            active = 1',
            ':registrationKey' => $registrationKey,
            ':email' => $email
        ]);

        if( $registrationKeyModel->dry() ){
            return false;
        }else{
            return $registrationKeyModel;
        }
    }

    /**
     * check if there is already an active Key for a mail
     * @param $email
     * @param bool|false $used
     * @return bool|null
     * @throws Exception
     */
    protected function findRegistrationKey($email, $used = false){

        $queryPart = 'email = :email AND active = 1';

        if(is_int($used)){
            $queryPart .= ' AND used = ' . $used;
        }

        $registrationKeyModel = Model\BasicModel::getNew('RegistrationKeyModel');
        $registrationKeyModels = $registrationKeyModel->find([
            $queryPart,
            ':email' => $email
        ]);

        if( is_object($registrationKeyModels) ){
            return $registrationKeyModels;
        }else{
            return false;
        }
    }

    /**
     * save/update user account data
     * @param $f3
     */
    public function saveAccount($f3){
        $data = $f3->get('POST');

        $return = (object) [];
        $return->error = [];

        $captcha = $f3->get('SESSION.createAccount');

        // reset captcha -> forces user to enter new one
        $f3->clear('SESSION.createAccount');

        $newUserData = null;

        // check for new user
        $loginAfterSave = false;

        // valid registration key Model is required for new registration
        // if "invite" feature is enabled
        $registrationKeyModel = false;

        if( isset($data['settingsData']) ){
            $settingsData = $data['settingsData'];

            try{
                $user = $this->_getUser(0);

                // captcha is send -> check captcha
                if(
                    isset($settingsData['captcha']) &&
                    !empty($settingsData['captcha'])
                ){


                    if($settingsData['captcha'] === $captcha){
                        // change/set sensitive user data requires captcha!

                        if($user === false){

                            // check if registration key invite function is enabled
                            if($f3->get('PATHFINDER.REGISTRATION.INVITE') === 1 ){
                                $registrationKeyModel = $this->getRegistrationKey( $settingsData['email'], $settingsData['registrationKey'] );

                                if($registrationKeyModel === false){
                                    throw new Exception\RegistrationException('Registration key invalid', 'registrationKey');
                                }
                            }

                            // new user registration
                            $user = $mapType = Model\BasicModel::getNew('UserModel');
                            $loginAfterSave = true;

                            // set username
                            if(
                                isset($settingsData['name']) &&
                                !empty($settingsData['name'])
                            ){
                                $user->name = $settingsData['name'];
                            }
                        }

                        // change/set email
                        if(
                            isset($settingsData['email']) &&
                            isset($settingsData['email_confirm']) &&
                            !empty($settingsData['email']) &&
                            !empty($settingsData['email_confirm']) &&
                            $settingsData['email'] == $settingsData['email_confirm']
                        ){
                            $user->email = $settingsData['email'];
                        }

                        // change/set password
                        if(
                            isset($settingsData['password']) &&
                            isset($settingsData['password_confirm']) &&
                            !empty($settingsData['password']) &&
                            !empty($settingsData['password_confirm']) &&
                            $settingsData['password'] == $settingsData['password_confirm']
                        ){
                            $user->password = $settingsData['password'];
                        }
                    }else{
                        // captcha was send but not valid -> return error
                        $captchaError = (object) [];
                        $captchaError->type = 'error';
                        $captchaError->message = 'Captcha does not match';
                        $return->error[] = $captchaError;
                    }
                }

                // saving additional user info requires valid user object (no captcha required)
                if($user){

                    // save API data
                    if(
                        isset($settingsData['keyId']) &&
                        isset($settingsData['vCode']) &&
                        is_array($settingsData['keyId']) &&
                        is_array($settingsData['vCode'])
                    ){

                        // get all existing API models for this user
                        $apiModels = $user->getAPIs();

                        foreach($settingsData['keyId'] as $i => $keyId){
                            $api = null;

                            // search for existing API model
                            foreach($apiModels as $key => $apiModel){
                                if($apiModel->keyId == $keyId){
                                    $api = $apiModel;
                                    // make sure model is up2data -> cast()
                                    $api->cast();
                                    unset($apiModels[$key]);
                                    break;
                                }
                            }

                            if(is_null($api)){
                                // new API Key
                                $api = Model\BasicModel::getNew('UserApiModel');
                                $api->userId = $user;
                            }

                            $api->keyId = $keyId;
                            $api->vCode = $settingsData['vCode'][$i];
                            $api->save();

                            $characterCount = $api->updateCharacters();

                            if($characterCount == 0){
                                // no characters found -> return warning
                                $characterError = (object) [];
                                $characterError->type = 'warning';
                                $characterError->message = 'API verification failed. No Characters found for KeyId ' . $api->keyId;
                                $return->error[] = $characterError;
                            }
                        }

                        // delete API models that no longer exists
                        foreach($apiModels as $apiModel){
                            $apiModel->delete();
                        }

                        // get fresh updated user object (API info may have has changed)
                        $user = $this->_getUser(0);
                    }

                    // set main character
                    if( isset($settingsData['mainCharacterId']) ){
                        $user->setMainCharacterId((int)$settingsData['mainCharacterId']);
                    }

                    // check if the user already has a main character
                    // if not -> save the next best character as main
                    $mainUserCharacter = $user->getMainUserCharacter();

                    // set main character if no main character exists
                    if(is_null($mainUserCharacter)){
                        $user->setMainCharacterId();
                    }

                    // save/update user model
                    // this will fail if model validation fails!
                    $user->save();

                    if(is_object($registrationKeyModel)){
                        $registrationKeyModel->used = 1;
                        $registrationKeyModel->save();
                    }

                    // log user in (in case he is new
                    if($loginAfterSave){
                        $this->logUserIn( $user->name, $settingsData['password'] );

                        // return reroute path
                        $return->reroute = self::getEnvironmentData('URL') . $this->f3->alias('map');
                    }

                    // get fresh updated user object
                    $user = $this->_getUser(0);
                    $newUserData = $user->getData();
                }
            }catch(Exception\ValidationException $e){
                $validationError = (object) [];
                $validationError->type = 'error';
                $validationError->field = $e->getField();
                $validationError->message = $e->getMessage();
                $return->error[] = $validationError;
            }catch(Exception\RegistrationException $e){
                $registrationError = (object) [];
                $registrationError->type = 'error';
                $registrationError->field = $e->getField();
                $registrationError->message = $e->getMessage();
                $return->error[] = $registrationError;
            }

            // return new/updated user data
            $return->userData = $newUserData;

        }
        echo json_encode($return);
    }

    /**
     * send mail with registration key
     * -> check INVITE in pathfinder.ini
     * @param $f3
     * @throws Exception
     */
    public function sendInvite($f3){
        $data = $f3->get('POST.settingsData');
        $return = (object) [];

        // check invite limit
        // get handed out key count
        $tempRegistrationKeyModel = Model\BasicModel::getNew('RegistrationKeyModel');
        $tempRegistrationKeyModels = $tempRegistrationKeyModel->find([ '
            email != "" AND
            active = 1'
        ]);

        $totalKeys = 0;
        if(is_object($tempRegistrationKeyModels)){
            $totalKeys = $tempRegistrationKeyModels->count();
        }

        if(
            $f3->get('PATHFINDER.REGISTRATION.INVITE') == 1 &&
            $totalKeys < $f3->get('PATHFINDER.REGISTRATION.INVITE_LIMIT')
        ){
            // key limit not reached

            if(
                isset($data['email']) &&
                !empty($data['email'])
            ){
                $email = trim($data['email']);

                // check if mail is valid
                if( \Audit::instance()->email($email) ){

                    // new key for this mail is allowed
                    $registrationKeyModel = $this->findRegistrationKey($email, 0);

                    if($registrationKeyModel === false){

                        // check for total number of invites (active and inactive) -> prevent spamming
                        $allRegistrationKeysByMail = $this->findRegistrationKey($email);

                        if(
                            $allRegistrationKeysByMail == false ||
                            $allRegistrationKeysByMail->count() < 3
                        ){

                            // get a fresh key
                            $registrationKeyModel = Model\BasicModel::getNew('RegistrationKeyModel');
                            $registrationKeyModel->load(['
                                used = 0 AND
                                active = 1 AND
                                email = "" ',
                                ':email' => $email
                            ], ['limit' => 1]);

                        }else{
                            $validationError = (object) [];
                            $validationError->type = 'warning';
                            $validationError->message = 'The number of keys is limited by Email. You can not get more keys';
                            $return->error[] = $validationError;
                        }

                    }else{
                        $registrationKeyModel = $registrationKeyModel[0];
                    }

                    // send "old" key again or send a new key
                    if( is_object($registrationKeyModel) ){
                        $msg = 'Your personal Registration Key: ' . $registrationKeyModel->registrationKey;

                        $mailController = new MailController();
                        $status = $mailController->sendInviteKey($email, $msg);

                        if( $status ){
                            $registrationKeyModel->email = $email;
                            $registrationKeyModel->ip = $this->f3->get('IP');
                            $registrationKeyModel->save();
                        }
                    }

                }else{
                    $validationError = (object) [];
                    $validationError->type = 'error';
                    $validationError->field = 'email';
                    $validationError->message = 'Email is not valid';
                    $return->error[] = $validationError;
                }
            }
        }else{
            $validationError = (object) [];
            $validationError->type = 'warning';
            $validationError->message = 'The pool of beta keys has been exhausted, please try again in a few days/weeks';
            $return->error[] = $validationError;
        }

        echo json_encode($return);
    }

    /**
     * delete current user account from DB
     * @param $f3
     */
    public function deleteAccount($f3){
        $data = $f3->get('POST.formData');
        $return = (object) [];

        $captcha = $f3->get('SESSION.deleteAccount');

        // reset captcha -> forces user to enter new one
        $f3->clear('SESSION.deleteAccount');

        if(
            isset($data['captcha']) &&
            !empty($data['captcha']) &&
            $data['captcha'] === $captcha
        ){
            $user = $this->_getUser(0);

            $validUser = $this->_verifyUser( $user->name, $data['password']);

            if(
                is_object($validUser) &&
                is_object($user) &&
                $user->id === $validUser->id
            ){
                // send delete account mail
                $msg = 'Hello ' . $user->name . ',<br><br>';
                $msg .= 'your account data has been successfully deleted.';

                $mailController = new MailController();
                $status = $mailController->sendDeleteAccount($user->email, $msg);

                if($status){
                    // save log
                    $logText = "id: %s, name: %s, ip: %s";
                    self::getLogger( $this->f3->get('PATHFINDER.LOGFILES.DELETE_ACCOUNT') )->write(
                        sprintf($logText, $user->id, $user->name, $f3->get('IP'))
                    );

                    // remove user
                    $user->erase();

                    $this->logOut($f3);
                    die();
                }
            }else{
                // password does not match current user pw
                $passwordError = (object) [];
                $passwordError->type = 'error';
                $passwordError->message = 'Invalid password';
                $return->error[] = $passwordError;
            }
        }else{
            // captcha not valid -> return error
            $captchaError = (object) [];
            $captchaError->type = 'error';
            $captchaError->message = 'Captcha does not match';
            $return->error[] = $captchaError;
        }

        echo json_encode($return);
    }


} 