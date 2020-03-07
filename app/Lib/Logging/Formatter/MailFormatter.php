<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 07.10.2017
 * Time: 14:49
 */

namespace Exodus4D\Pathfinder\Lib\Logging\Formatter;

use Exodus4D\Pathfinder\Lib\Config;
use Monolog\Formatter;

class MailFormatter implements Formatter\FormatterInterface {

    /**
     * @param array $record
     * @return mixed|string
     */
    public function format(array $record){

        $tplDefaultData = [
            'tplPretext' => $record['message'],
            'tplGreeting' => \Markdown::instance()->convert(str_replace('*', '', $record['message'])),
            'message' => false,
            'tplText2' => false,
            'tplClosing' => 'Fly save!',
            'actionPrimary' => false,
            'appName' => Config::getPathfinderData('name'),
            'appUrl' => Config::getEnvironmentData('URL'),
            'appHost' => $_SERVER['HTTP_HOST'],
            'appContact' => Config::getPathfinderData('contact'),
            'appMail' => Config::getPathfinderData('email'),
        ];

        $tplData = array_replace_recursive($tplDefaultData, (array)$record['context']['data']['main']);

        return \Template::instance()->render('templates/mail/basic_inline.html', 'text/html', $tplData);
    }

    /**
     * @param array $records
     * @return mixed|string
     */
    public function formatBatch(array $records){
        $message = '';
        foreach ($records as $key => $record) {
            $message .= $this->format($record);
        }

        return $message;
    }

}