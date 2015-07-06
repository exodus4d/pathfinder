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

        if($data['settingsData']){
            $settingsData = $data['settingsData'];

            $user = $this->_getUser();

            // captcha is send -> check captcha
            if(
                array_key_exists('captcha', $settingsData) &&
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
                            array_key_exists('name', $settingsData) &&
                            !empty($settingsData['name'])
                        ){
                            $user->name = $settingsData['name'];
                        }
                    }

                    // change/set email
                    if(
                        array_key_exists('email', $settingsData) &&
                        array_key_exists('email_confirm', $settingsData) &&
                        !empty($settingsData['email']) &&
                        !empty($settingsData['email_confirm']) &&
                        $settingsData['email'] == $settingsData['email_confirm']
                    ){
                        $user->email = $settingsData['email'];
                    }

                    // change/set password
                    if(
                        array_key_exists('password', $settingsData) &&
                        array_key_exists('password_confirm', $settingsData) &&
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
                    array_key_exists('keyId', $settingsData) &&
                    array_key_exists('vCode', $settingsData) &&
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
                        }

                        $api->userId = $user;
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
                if( array_key_exists('mainCharacterId', $settingsData) ){
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

                // get updated user object
                $user = $this->_getUser();
                $newUserData = $user->getData();

            }

            // return new/updated user data
            $return->userData = $newUserData;

        }
        echo json_encode($return);
    }
} 