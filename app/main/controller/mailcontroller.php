<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 30.08.2015
 * Time: 14:48
 */

namespace controller;

class MailController extends \SMTP{


    public function __construct(){

        $host   = Controller::getEnvironmentData('SMTP_HOST');
        $port   = Controller::getEnvironmentData('SMTP_PORT');
        $scheme = Controller::getEnvironmentData('SMTP_SCHEME');
        $user   = Controller::getEnvironmentData('SMTP_USER');
        $pw     = Controller::getEnvironmentData('SMTP_PASS');

        parent::__construct($host,$port,$scheme,$user,$pw);

        // error handling
        $this->set('Errors-to', '' . Controller::getEnvironmentData('SMTP_ERROR') . '>');
        $this->set('MIME-Version', '1.0');
        $this->set('Content-Type', 'text/html; charset=ISO-8859-1');
    }

    /**
     * send registration mail
     * @param $to
     * @param $msg
     * @return bool
     */
    public function sendRegistration($to, $msg){
        $this->set('To', '<' . $to . '>');
        $this->set('From', 'Pathfinder <' . Controller::getEnvironmentData('SMTP_FROM') . '>');
        $this->set('Subject', 'Account information');
        $status = $this->send($msg);

        return $status;
    }

    /**
     * send invite key mail
     * @param $to
     * @param $msg
     * @return bool
     */
    public function sendInviteKey($to, $msg){
        $this->set('To', '<' . $to . '>');
        $this->set('From', 'Pathfinder <' . Controller::getEnvironmentData('SMTP_FROM') . '>');
        $this->set('Subject', 'Registration Key');
        $status = $this->send($msg);

        return $status;
    }

    /**
     * send mail to removed user account
     * @param $to
     * @param $msg
     * @return bool
     */
    public function sendDeleteAccount($to, $msg){
        $this->set('To', '<' . $to . '>');
        $this->set('From', 'Pathfinder <' . Controller::getEnvironmentData('SMTP_FROM') . '>');
        $this->set('Subject', 'Account deleted');
        $status = $this->send($msg);

        return $status;
    }
}