<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 29.03.15
 * Time: 20:50
 */

namespace Controller\Api;
use Controller;
use Model;
use Exception;

class User extends Controller\Controller{

    /**
     * login function
     * @param $f3
     */
    public function logIn($f3){
        $data = $data = $f3->get('POST');

        $return = (object) [];

        $loginSuccess = false;

        if($data['loginData']){
            $loginData = $data['loginData'];
            $loginSuccess = $this->logUserIn( $loginData['userName'], $loginData['userPassword'] );
        }

        // set "vague" error
        if($loginSuccess !== true){

            $return->error = [];
            $loginError = (object) [];
            $loginError->type = 'login';
            $return->error[] = $loginError;
        }else{
            // route user to map app
            $return->reroute = $f3->get('BASE') . $f3->alias('map');
        }

        echo json_encode($return);
    }

    /**
     * core function for user login
     * @param $userName
     * @param $password
     * @return bool
     */
    private function logUserIn($userName, $password){
        $loginSuccess = false;

        // try to verify user
        $user = $this->_verifyUser($userName, $password);

        if($user !== false){
            // user is verified -> ready for login

            // set Session login
            $dateTime = new \DateTime();
            $this->f3->set('SESSION.user.time', $dateTime->getTimestamp());
            $this->f3->set('SESSION.user.name', $user->name);
            $this->f3->set('SESSION.user.id', $user->id);

            // save user login information
            $user->touch('lastLogin');
            $user->save();

            // update/check api data
            // $this->_updateCharacterData();
            $loginSuccess = true;
        }

        return $loginSuccess;
    }

    /**
     * get captcha image and store key to session
     * @param $f3
     */
    public function getCaptcha($f3){

        $img = new \Image();

        $imgDump = $img->captcha(
            'fonts/oxygen-bold-webfont.ttf',
            14,
            6,
            'SESSION.captcha_code',
            '',
            '0x66C84F',
            '0x313335'
        )->dump();

        echo $f3->base64( $imgDump,  'image/png');
    }

    /**
     * delete the character log entry for the current active (main) character
     */
    public function deleteLog(){

        $user = $this->_getUser();

        $activeUserCharacter = $user->getActiveUserCharacter();

        if($activeUserCharacter){
            $character = $activeUserCharacter->getCharacter();

            if(is_object($character->characterLog)){
                $character->characterLog->erase();
                $character->save();
            }
        }
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
     * save/update user data
     * @param $f3
     */
    public function saveConfig($f3){
        $data = $f3->get('POST');

        $return = (object) [];
        $return->error = [];

        $captcha = $f3->get('SESSION.captcha_code');

        // reset captcha -> forces user to enter new one
        $f3->clear('SESSION.captcha_code');

        $newUserData = null;

        // check user if if he is new
        $loginAfterSave = false;

        if( isset($data['settingsData']) ){
            $settingsData = $data['settingsData'];

            try{
                $user = $this->_getUser();

                // captcha is send -> check captcha
                if(
                    isset($settingsData['captcha']) &&
                    !empty($settingsData['captcha'])
                ){


                    if($settingsData['captcha'] === $captcha){
                        // change/set sensitive user data requires captcha!

                        if($user === false){
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

                        // check if the user already has a main character
                        // if not -> save the next best character as main
                        $mainUserCharacter = $user->getMainUserCharacter();

                        foreach($settingsData['keyId'] as $i => $keyId){
                            $api = null;
                            $userCharacters = [];

                            // search for existing API model
                            foreach($apiModels as $key => $apiModel){
                                if($apiModel->keyId == $keyId){
                                    $api = $apiModel;
                                    // get existing characters in case api model already exists
                                    $userCharacters = $api->getUserCharacters();

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

                            // check each API Model if valid
                            $newUserCharacters = $api->requestCharacters();

                            if(empty($newUserCharacters)){
                                // no characters found -> return warning
                                $characterError = (object) [];
                                $characterError->type = 'warning';
                                $characterError->keyId = $api->keyId;
                                $characterError->vCode = $api->vCode;
                                $characterError->message = 'No characters found';
                                $return->error[] = $characterError;
                            }else{
                                $api->save();
                                // find existing character
                                foreach($newUserCharacters as $newUserCharacter){

                                    $matchedUserCharacter = $newUserCharacter;

                                    foreach($userCharacters as $key => $userCharacter){
                                        if($userCharacter->characterId->id == $newUserCharacter->characterId->id){
                                            // user character fond -> update this one
                                            $matchedUserCharacter = $userCharacter;
                                            unset($userCharacters[$key]);
                                            break;
                                        }
                                    }

                                    $matchedUserCharacter->apiId = $api;
                                    $matchedUserCharacter->userId = $user;

                                    $matchedUserCharacter->save();
                                }
                            }

                            // delete characters that are no longer in this API
                            foreach($userCharacters as $userCharacter){
                                print_r('delete Character: ' . $userCharacter->id);
                            }
                        }

                        // delete API models that no longer exists
                        foreach($apiModels as $apiModel){
                            $apiModel->delete();
                        }

                        // set main character if no main character exists
                        if(is_null($mainUserCharacter)){
                            $user->setMainCharacterId();
                        }

                    }


                    // set main character
                    if( isset($settingsData['mainCharacterId']) ){
                        $user->setMainCharacterId((int)$settingsData['mainCharacterId']);
                    }

                    // save/update user model
                    // this will fail if model validation fails!
                    $user->save();

                    // log user in (in case he is new
                    if($loginAfterSave){
                        $this->logUserIn( $user->name, $settingsData['password'] );

                        // return reroute path
                        $return->reroute = $this->f3->get('BASE') . $this->f3->alias('map');
                    }

                    // get fresh updated user object
                    $user = $this->_getUser();
                    $newUserData = $user->getData();

                }
            }catch(Exception\ValidationException $e){
                $validationError = (object) [];
                $validationError->type = 'error';
                $validationError->field = $e->getField();
                $validationError->message = $e->getMessage();
                $return->error[] = $validationError;
            }


            // return new/updated user data
            $return->userData = $newUserData;

        }
        echo json_encode($return);
    }
} 