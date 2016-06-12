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

    // captcha specific session keys
    const SESSION_CAPTCHA_ACCOUNT_UPDATE            = 'SESSION.CAPTCHA.ACCOUNT.UPDATE';
    const SESSION_CAPTCHA_ACCOUNT_DELETE            = 'SESSION.CAPTCHA.ACCOUNT.DELETE';

    // user specific session keys
    const SESSION_KEY_USER                          = 'SESSION.USER';
    const SESSION_KEY_USER_ID                       = 'SESSION.USER.ID';
    const SESSION_KEY_USER_NAME                     = 'SESSION.USER.NAME';

    // character specific session keys
    const SESSION_KEY_CHARACTER                     = 'SESSION.CHARACTER';
    const SESSION_KEY_CHARACTER_ID                  = 'SESSION.CHARACTER.ID';
    const SESSION_KEY_CHARACTER_NAME                = 'SESSION.CHARACTER.NAME';
    const SESSION_KEY_CHARACTER_TIME                = 'SESSION.CHARACTER.TIME';
    const SESSION_KEY_CHARACTER_PREV_SYSTEM_ID      = 'SESSION.CHARACTER.PREV_SYSTEM_ID';

    const SESSION_KEY_CHARACTER_ACCESS_TOKEN        = 'SESSION.CHARACTER.ACCESS_TOKEN';
    const SESSION_KEY_CHARACTER_REFRESH_TOKEN       = 'SESSION.CHARACTER.REFRESH_TOKEN';

    // log text
    const LOG_LOGGED_IN                             = 'userId: %s, userName: %s, charId: %s, charName: %s';

    /**
     * valid reasons for captcha images
     * @var string array
     */
    private static $captchaReason = [self::SESSION_CAPTCHA_ACCOUNT_UPDATE, self::SESSION_CAPTCHA_ACCOUNT_DELETE];

    /**
     * login a valid character
     * @param Model\CharacterModel $characterModel
     * @return bool
     */
    protected function loginByCharacter(Model\CharacterModel &$characterModel){
        $login = false;

        if($user = $characterModel->getUser()){
            // set user/character data to session -------------------
            $this->f3->set(self::SESSION_KEY_USER, [
                'ID' => $user->_id,
                'NAME' => $user->name
            ]);

            $dateTime = new \DateTime();
            $this->f3->set(self::SESSION_KEY_CHARACTER, [
                'ID' => $characterModel->_id,
                'NAME' => $characterModel->name,
                'TIME' => $dateTime->getTimestamp()
            ]);

            // save user login information ---------------------------
            $characterModel->touch('lastLogin');
            $characterModel->save();

            // write login log --------------------------------------
            self::getLogger( $this->f3->get('PATHFINDER.LOGFILES.LOGIN') )->write(
                sprintf(self::LOG_LOGGED_IN,
                    $user->_id,
                    $user->name,
                    $characterModel->_id,
                    $characterModel->name
                )
            );

            $login = true;
        }

        return $login;
    }

    /**
     * validate cookie character information
     * -> return character data (if valid)
     * @param \Base $f3
     */
    public function getCookieCharacter($f3){
        $data = $f3->get('POST');

        $return = (object) [];
        $return->error = [];

        if( !empty($data['cookie']) ){
            if( !empty($cookieData = $this->getCookieByName($data['cookie']) )){
                // cookie data is valid -> validate data against DB (security check!)
                if( !empty($characters = $this->getCookieCharacters(array_slice($cookieData, 0, 1, true))) ){
                    // character is valid and allowed to login
                    $return->character = reset($characters)->getData();
                }else{
                    $characterError = (object) [];
                    $characterError->type = 'warning';
                    $characterError->message = 'This can happen through "invalid cookie data", "login restrictions", "CREST problems".';
                    $return->error[] = $characterError;
                }
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
     * delete the character log entry for the current active (main) character
     * @param \Base $f3
     */
    public function deleteLog(\Base $f3){
        $activeCharacter = $this->getCharacter();
        if($activeCharacter){
            if($characterLog = $activeCharacter->getLog()){
                $characterLog->erase();
            }
        }
    }

    /**
     * log the current user out + clear character system log data
     * @param \Base $f3
     */
    public function logout(\Base $f3){
        $this->deleteLog($f3);
        parent::logout($f3);
    }

    /**
     * update user account data
     * -> a fresh user automatically generated on first login with a new character
     * -> see CREST SSO login
     * @param \Base $f3
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
                if($activeCharacter = $this->getCharacter(0)){
                    $user = $activeCharacter->getUser();

                    // captcha is send -> check captcha ---------------------------------
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

                    // sharing config ---------------------------------------------------
                    if(isset($formData['share'])){
                        $privateSharing = 0;
                        $corporationSharing = 0;
                        $allianceSharing = 0;

                        if(isset($formData['privateSharing'])){
                            $privateSharing = 1;
                        }

                        if(isset($formData['corporationSharing'])){
                            $corporationSharing = 1;
                        }

                        if(isset($formData['allianceSharing'])){
                            $allianceSharing = 1;
                        }

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

                    // get fresh updated user object
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
     * delete current user account from DB
     * @param \Base $f3
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
            $activeCharacter = $this->getCharacter(0);
            $user = $activeCharacter->getUser();

            if($user){
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

                    $this->logout($f3);
                    die();
                }
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