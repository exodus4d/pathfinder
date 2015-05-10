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

        $return = new \stdClass();

        $loginSuccess = false;

        if($data['loginData']){
            $loginData = $data['loginData'];


            // try to verify user
            $user = $this->_verifyUser($loginData['userName'], $loginData['userPassword']);

            if($user !== false){
                // user is verified -> ready for login
                $loginSuccess = $this->_logIn($user);
            }
        }

        // set "vague" error
        if($loginSuccess !== true){

            $return->error = [];
            $loginError = new \stdClass();
            $loginError->type = 'login';
            $return->error[] = $loginError;
        }else{
            // route user to map app
            $return->reroute = $f3->get('BASE') . $f3->alias('map');
        }

        echo json_encode($return);
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

        $return = new \stdClass();

        if($data['settingsData']){
            $settingsData = $data['settingsData'];
            $user = $this->_getUser();

            if($user === false){
                // new user registration
                $user = $mapType = Model\BasicModel::getNew('UserModel');
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

            // save API data
            if(
                array_key_exists('keyId', $settingsData) &&
                array_key_exists('vCode', $settingsData) &&
                is_array($settingsData['keyId']) &&
                is_array($settingsData['vCode'])
            ){

                // get all existing API models for this user
                $apiModels = $user->getAPIs();

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
                        // no characters found
                        $return->error = [];
                        $characterError = new \stdClass();
                        $characterError->type = 'api';
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
                                if($userCharacter->characterId == $newUserCharacter->characterId){
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
            }

            // set main character
            if(
                array_key_exists('mainCharacterId', $settingsData)
            ){
                $user->setMainCharacterId((int)$settingsData['mainCharacterId']);
            }

            // save user model
            $user->save();

            // return new/updated user data
            $return->userData = $user->getData();


        }
        echo json_encode($return);
    }
} 