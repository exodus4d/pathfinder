<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 29.03.15
 * Time: 20:50
 */

namespace Controller\Api;


use Controller;
use Model\Pathfinder;
use Exception;

class User extends Controller\Controller{

    // captcha specific session keys
    const SESSION_CAPTCHA_ACCOUNT_UPDATE            = 'SESSION.CAPTCHA.ACCOUNT.UPDATE';
    const SESSION_CAPTCHA_ACCOUNT_DELETE            = 'SESSION.CAPTCHA.ACCOUNT.DELETE';

    // user specific session keys
    const SESSION_KEY_USER                          = 'SESSION.USER';
    const SESSION_KEY_USER_ID                       = 'SESSION.USER.ID';
    const SESSION_KEY_USER_NAME                     = 'SESSION.USER.NAME';

    // character specific session keys
    const SESSION_KEY_CHARACTERS                    = 'SESSION.CHARACTERS';

    // temp login character data (during HTTP redirects on login)
    const SESSION_KEY_TEMP_CHARACTER_DATA           = 'SESSION.TEMP_CHARACTER_DATA';

    // log text
    const LOG_LOGGED_IN                             = 'userId: [%10s], userName: [%30s], charId: [%20s], charName: %s';
    const LOG_DELETE_ACCOUNT                        = 'userId: [%10s], userName: [%30s]';


    /**
     * valid reasons for captcha images
     * @var array
     */
    private static $captchaReason = [self::SESSION_CAPTCHA_ACCOUNT_UPDATE, self::SESSION_CAPTCHA_ACCOUNT_DELETE];

    /**
     * login a valid character
     * @param Pathfinder\CharacterModel $character
     * @return bool
     * @throws Exception
     */
    protected function loginByCharacter(Pathfinder\CharacterModel &$character) : bool {
        $login = false;

        if($user = $character->getUser()){
            // check if character belongs to current user
            // -> If there is already a logged in user! (e.g. multi character use)
            $currentUser = $this->getUser();
            $timezone = $this->getF3()->get('getTimeZone')();

            $sessionCharacters = [
                [
                    'ID' => $character->_id,
                    'NAME' => $character->name,
                    'TIME' => (new \DateTime('now', $timezone))->getTimestamp()
                ]
            ];

            if(
                is_null($currentUser) ||
                $currentUser->_id !== $user->_id
            ){
                // user has changed OR new user -----------------------------------------------------------------------
                //-> set user/character data to session
                $this->getF3()->set(self::SESSION_KEY_USER, [
                    'ID' => $user->_id,
                    'NAME' => $user->name
                ]);
            }else{
                // user has NOT changed -------------------------------------------------------------------------------
                $sessionCharacters = $character::mergeSessionCharacterData($sessionCharacters);
            }

            $this->getF3()->set(self::SESSION_KEY_CHARACTERS, $sessionCharacters);

            $character->updateCloneData();
            $character->updateRoleData();

            // save user login information ----------------------------------------------------------------------------
            $character->touch('lastLogin');
            $character->save();

            // write login log ----------------------------------------------------------------------------------------
            self::getLogger('CHARACTER_LOGIN')->write(
                sprintf(self::LOG_LOGGED_IN,
                    $user->_id,
                    $user->name,
                    $character->_id,
                    $character->name
                )
            );

            // set temp character data --------------------------------------------------------------------------------
            // -> pass character data over for next http request (reroute())
            $this->setTempCharacterData($character->_id);

            $login = true;
        }

        return $login;
    }

    /**
     * validate cookie character information
     * -> return character data (if valid)
     * @param \Base $f3
     * @throws Exception
     */
    public function getCookieCharacter(\Base $f3){
        $data = $f3->get('POST');
        $cookieName = (string)$data['cookie'];

        $return = (object) [];
        $return->error = [];

        if( !empty($cookieData = $this->getCookieByName($cookieName) )){
            // cookie data is valid -> validate data against DB (security check!)
            // -> add characters WITHOUT permission to log in too!
            if( !empty($characters = $this->getCookieCharacters(array_slice($cookieData, 0, 1, true), false)) ){
                // character is valid and allowed to login
                $return->character = reset($characters)->getData();
                // get Session status for character
                if($activeCharacter = $this->getCharacter()){
                    if($activeUser = $activeCharacter->getUser()){
                        if($sessionCharacterData = $activeUser->findSessionCharacterData($return->character->id)){
                            $return->character->hasActiveSession = true;
                        }
                    }
                }
            }else{
                $characterError = (object) [];
                $characterError->type = 'warning';
                $characterError->message = 'This can happen through "invalid cookies(SSO)", "login restrictions", "ESI problems".';
                $return->error[] = $characterError;
            }
        }

        echo json_encode($return);
    }

    /**
     * get captcha image and store key to session
     * @param \Base $f3
     */
    public function getCaptcha(\Base $f3){
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
                $reason,
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
     * log the current user out + clear character system log data
     * @param \Base $f3
     * @throws Exception
     */
    public function logout(\Base $f3){
        $this->logoutCharacter($f3, false, true, true, true);
    }

    /**
     * remote open ingame information window (character, corporation or alliance) Id
     * -> the type is auto-recognized by CCP
     * @param \Base $f3
     * @throws Exception
     */
    public function openIngameWindow(\Base $f3){
        $data = $f3->get('POST');

        $return = (object) [];
        $return->error = [];

        if( $targetId = (int)$data['targetId']){
            $activeCharacter = $this->getCharacter();

            $response =  $f3->ccpClient()->openWindow($targetId, $activeCharacter->getAccessToken());

            if(empty($response)){
                $return->targetId = $targetId;
            }else{
                $error = (object) [];
                $error->type = 'error';
                $error->message = $response['error'];
                $return->error[] = $error;
            }
        }

        echo json_encode($return);
    }

    /**
     * update user account data
     * -> a fresh user automatically generated on first login with a new character
     * -> see SSO login
     * @param \Base $f3
     * @throws Exception
     */
    public function saveAccount(\Base $f3){
        $data = $f3->get('POST');

        $return = (object) [];
        $return->error = [];

        $captcha = $f3->get(self::SESSION_CAPTCHA_ACCOUNT_UPDATE);

        // reset captcha -> forces user to enter new one
        $f3->clear(self::SESSION_CAPTCHA_ACCOUNT_UPDATE);

        $newUserData = null;

        if( isset($data['formData']) ){
            $formData = $data['formData'];

            try{
                if($activeCharacter = $this->getCharacter()){
                    $user = $activeCharacter->getUser();

                    // captcha is send -> check captcha ---------------------------------------------------------------
                    if(
                        isset($formData['captcha']) &&
                        !empty($formData['captcha'])
                    ){
                        if($formData['captcha'] === $captcha){
                            // change/set sensitive user data requires captcha!

                            // set username
                            if(
                                isset($formData['name']) &&
                                !empty($formData['name'])
                            ){
                                $user->name = $formData['name'];
                            }

                            // set email
                            if(
                                isset($formData['email']) &&
                                isset($formData['email_confirm']) &&
                                !empty($formData['email']) &&
                                !empty($formData['email_confirm']) &&
                                $formData['email'] == $formData['email_confirm']
                            ){
                                $user->email = $formData['email'];
                            }

                            // save/update user model
                            // this will fail if model validation fails!
                            $user->save();

                        }else{
                            // captcha was send but not valid -> return error
                            $captchaError = (object) [];
                            $captchaError->type = 'error';
                            $captchaError->message = 'Captcha does not match';
                            $return->error[] = $captchaError;
                        }
                    }

                    // sharing config ---------------------------------------------------------------------------------
                    if(isset($formData['share'])){
                        $privateSharing = (int)$formData['privateSharing'];
                        $corporationSharing = (int)$formData['corporationSharing'];
                        $allianceSharing = (int)$formData['allianceSharing'];

                        // update private/corp/ally
                        $corporation = $activeCharacter->getCorporation();
                        $alliance = $activeCharacter->getAlliance();

                        if(is_object($corporation)){
                            $corporation->shared = $corporationSharing;
                            $corporation->save();
                        }

                        if(is_object($alliance)){
                            $alliance->shared = $allianceSharing;
                            $alliance->save();
                        }

                        $activeCharacter->shared = $privateSharing;
                        $activeCharacter->save();
                    }

                    // character config -------------------------------------------------------------------------------
                    if(isset($formData['character'])){
                        $activeCharacter->copyfrom($formData, ['logLocation', 'selectLocation']);

                        $activeCharacter->save();
                    }

                    // get fresh updated user object
                    $newUserData = $user->getData();
                }

            }catch(Exception\ValidationException $e){
                $return->error[] = $e->getError();
            }catch(Exception\RegistrationException $e){
                $return->error[] = $e->getError();
            }

            // return new/updated user data
            $return->userData = $newUserData;
        }

        echo json_encode($return);
    }

    /**
     * delete current user account from DB
     * @param \Base $f3
     * @throws Exception
     */
    public function deleteAccount(\Base $f3){
        $data = $f3->get('POST.formData');
        $return = (object) [];

        $captcha = $f3->get(self::SESSION_CAPTCHA_ACCOUNT_DELETE);

        // reset captcha -> forces user to enter new one
        $f3->clear(self::SESSION_CAPTCHA_ACCOUNT_DELETE);

        if(
            isset($data['captcha']) &&
            !empty($data['captcha']) &&
            $data['captcha'] === $captcha
        ){
            $activeCharacter = $this->getCharacter();
            $user = $activeCharacter->getUser();

            if($user){
                // save log
                self::getLogger('DELETE_ACCOUNT')->write(
                    sprintf(self::LOG_DELETE_ACCOUNT, $user->id, $user->name)
                );

                $this->logoutCharacter($f3, true, true, true, true);
                $user->erase();
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