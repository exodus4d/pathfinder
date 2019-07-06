<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 04.08.2017
 * Time: 22:13
 */

namespace lib\logging;


use lib\Monolog;
use Monolog\Logger;

abstract class AbstractLog implements LogInterface {

    const ERROR_LEVEL               = 'Invalid log level "%s"';
    const ERROR_TAG                 = 'Invalid log tag "%s"';
    const ERROR_HANDLER_KEY         = 'Handler key "%s" not found in handlerConfig (%s)';
    const ERROR_HANDLER_PARAMS      = 'No handler parameters found for handler key "%s"';

    /**
     * PSR-3 log levels
     */
    const LEVEL                     = ['emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug'];

    /**
     * log tags
     */
    const TAG                       = ['danger', 'warning', 'information', 'success', 'primary', 'default'];

    /**
     * @var null|\Base
     */
    protected $f3                   = null;

    /**
     * log Handler type with Formatter type
     * -> check Monolog::HANDLER and Monolog::FORMATTER
     * @var array
     */
    protected $handlerConfig        = ['stream' => 'line'];

    /**
     * log Processors, array with either callable functions or Processor class with __invoce() method
     * -> functions used to add "extra" data to a log
     * @var array
     */
    protected $processorConfig      = ['psr' => null];

    /**
     * some handler need individual configuration parameters
     * -> see $handlerConfig end getHandlerParams()
     * @var array
     */
    protected $handlerParamsConfig  = [];

    /**
     * multiple Log() objects can be marked as "grouped"
     * -> Logs with Slack Handler should be grouped by map (send multiple log data in once
     * @var array
     */
    protected $handlerGroups        = [];

    /**
     * @var string
     */
    protected $message              = '';

    /**
     * @var string
     */
    protected $action               = '';

    /**
     * @var string
     */
    protected $channelType          = '';

    /**
     * log level from self::LEVEL
     * -> private - use setLevel() to set
     * @var string
     */
    private $level                  = 'debug';

    /**
     * log tag from self::TAG
     * -> private - use setTag() to set
     * @var string
     */
    private $tag                    = 'default';

    /**
     * log data (main log data)
     * @var array
     */
    private $data                   = [];

    /**
     * (optional) temp data for logger (will not be stored with the log entry)
     * @var array
     */
    private $tmpData                = [];

    /**
     * buffer multiple logs with the same chanelType and store all at once
     * @var bool
     */
    private $buffer                 = true;


    public function __construct(string $action){
        $this->setF3();
        $this->action       = $action;

        // add custom log processor callback -> add "extra" (meta) data
        $f3 = $this->f3;
        $processorExtraData = function($record) use (&$f3){
            $record['extra'] = [
                'path' => $f3->get('PATH'),
                'ip' => $f3->get('IP')
            ];
            return $record;
        };

        // add log processor -> remove §tempData from log
        $processorClearTempData = function($record){
            $record['context'] = array_diff_key($record['context'], $this->getTempData());
            return $record;
        };

        // init processorConfig. IMPORTANT: first processor gets executed at the end!
        $this->processorConfig = ['cleaTempData' => $processorClearTempData] + [ 'addExtra' => $processorExtraData] + $this->processorConfig;
    }

    /**
     * set $f3 base object
     */
    public function setF3(){
        $this->f3 = \Base::instance();
    }

    /**
     * @param $message
     */
    public function setMessage(string $message){
        $this->message = $message;
    }

    /**
     * @param string $level
     * @throws \Exception
     */
    public function setLevel(string $level){
        if( in_array($level, self::LEVEL)){
            $this->level = $level;
        }else{
            throw new \Exception( sprintf(self::ERROR_LEVEL, $level));
        }
    }

    /**
     * @param string $tag
     * @throws \Exception
     */
    public function setTag(string $tag){
        if( in_array($tag, self::TAG)){
            $this->tag = $tag;
        }else{
            throw new \Exception( sprintf(self::ERROR_TAG, $tag));
        }
    }

    /**
     * @param array $data
     * @return LogInterface
     */
    public function setData(array $data) : LogInterface{
        $this->data = $data;
        return $this;
    }

    /**
     * @param array $data
     * @return LogInterface
     */
    public function setTempData(array $data) : LogInterface{
        $this->tmpData = $data;
        return $this;
    }

    /**
     * add new Handler by $handlerKey
     * set its default Formatter by $formatterKey
     * @param string $handlerKey
     * @param string|null $formatterKey
     * @param \stdClass|null $handlerParams
     * @return LogInterface
     */
    public function addHandler(string $handlerKey, string $formatterKey = null, \stdClass $handlerParams = null) : LogInterface {
        if(!$this->hasHandlerKey($handlerKey)){
            $this->handlerConfig[$handlerKey] = $formatterKey;
            // add more configuration params for the new handler
            if(!is_null($handlerParams)){
                $this->handlerParamsConfig[$handlerKey] = $handlerParams;
            }
        }
        return $this;
    }

    /**
     * add new handler for Log() grouping
     * @param string $handlerKey
     * @return LogInterface
     */
    public function addHandlerGroup(string $handlerKey) : LogInterface {
        if(
            $this->hasHandlerKey($handlerKey) &&
            !$this->hasHandlerGroupKey($handlerKey)
        ){
            $this->handlerGroups[] = $handlerKey;
        }
        return $this;
    }

    /**
     * @return array
     */
    public function getHandlerConfig() : array{
        return $this->handlerConfig;
    }

    /**
     * get __construct() parameters for a given $handlerKey
     * @param string $handlerKey
     * @return array
     * @throws \Exception
     */
    public function getHandlerParams(string $handlerKey) : array {
        $params = [];

        if($this->hasHandlerKey($handlerKey)){
            switch($handlerKey){
                case 'stream': $params = $this->getHandlerParamsStream();
                    break;
                case 'mail': $params = $this->getHandlerParamsMail();
                    break;
                case 'socket': $params = $this->getHandlerParamsSocket();
                    break;
                case 'slackMap':
                case 'slackRally':
                case 'discordMap':
                case 'discordRally':
                    $params = $this->getHandlerParamsSlack($handlerKey);
                    break;
                default:
                    throw new \Exception( sprintf(self::ERROR_HANDLER_PARAMS, $handlerKey));
            }
        }else{
            throw new \Exception( sprintf(self::ERROR_HANDLER_KEY, $handlerKey, implode(', ', array_flip($this->handlerConfig))));
        }

        return $params;
    }

    /**
     * @return array
     */
    public function getHandlerParamsConfig() : array {
        return $this->handlerParamsConfig;
    }

    /**
     * @return array
     */
    public function getProcessorConfig() : array {
        return $this->processorConfig;
    }

    /**
     * @return string
     */
    public function getMessage() : string{
        return $this->message;
    }

    /**
     * @return string
     */
    public function getAction() : string{
        return $this->action;
    }

    /**
     * @return string
     */
    public function getChannelType() : string{
        return $this->channelType;
    }

    /**
     * @return string
     */
    public function getChannelName() : string{
        return $this->getChannelType();
    }

    /**
     * @return string
     */
    public function getLevel() : string{
        return $this->level;
    }

    /**
     * @return string
     */
    public function getTag() : string{
        return $this->tag;
    }

    /**
     * @return array
     */
    public function getData() : array{
        return $this->data;
    }
    /**
     * @return array
     */
    public function getContext() : array{
        $context = [
            'data' => $this->getData(),
            'tag' => $this->getTag()
        ];

        // add temp data (e.g. used for $message placeholder replacement
        $context += $this->getTempData();

        return $context;
    }

    /**
     * @return array
     */
    protected function getTempData() : array {
        return $this->tmpData;
    }

    /**
     * @return array
     */
    public function getHandlerGroups() : array{
        return $this->handlerGroups;
    }

    /**
     * get unique hash for this kind of logs (channel) and same $handlerGroups
     * @return string
     */
    public function getGroupHash() : string {
        $groupName = $this->getChannelName();
        if($this->isGrouped()){
            $groupName .= '_' . implode('_', $this->getHandlerGroups());
        }

        return $this->f3->hash($groupName);
    }

    /**
     * @param string $handlerKey
     * @return bool
     */
    public function hasHandlerKey(string $handlerKey) : bool{
        return array_key_exists($handlerKey, $this->handlerConfig);
    }

    /**
     * @param string $handlerKey
     * @return bool
     */
    public function hasHandlerGroupKey(string $handlerKey) : bool{
        return in_array($handlerKey, $this->getHandlerGroups());
    }

    /**
     * @return bool
     */
    public function hasBuffer() : bool{
        return $this->buffer;
    }

    /**
     * @return bool
     */
    public function isGrouped() : bool{
        return !empty($this->getHandlerGroups());
    }

    /**
     * remove all group handlers and their config params
     */
    public function removeHandlerGroups(){
        foreach($this->getHandlerGroups() as $handlerKey){
            $this->removeHandlerGroup($handlerKey);
        }
    }

    /**
     * @param string $handlerKey
     */
    public function removeHandlerGroup(string $handlerKey){
        unset($this->handlerConfig[$handlerKey]);
        unset($this->handlerParamsConfig[$handlerKey]);
    }

    // Handler parameters for Monolog\Handler\AbstractHandler ---------------------------------------------------------

    /**
     * @return array
     */
    protected function getHandlerParamsStream() : array{
        $params = [];
        if( !empty($conf = $this->handlerParamsConfig['stream']) ){
            $params[] = $conf->stream;
            $params[] = Logger::toMonologLevel($this->getLevel());  // min level that is handled;
            $params[] = true;                                       // bubble
            $params[] = 0666;                                       // permissions (default 644)
        }

        return $params;
    }

    /**
     * get __construct() parameters for SwiftMailerHandler() call
     * @return array
     */
    protected function getHandlerParamsMail() : array {
        $params = [];
        if( !empty($conf = $this->handlerParamsConfig['mail']) ){
            $transport = (new \Swift_SmtpTransport())
                ->setHost($conf->host)
                ->setPort($conf->port)
                ->setEncryption($conf->scheme)
                ->setUsername($conf->username)
                ->setPassword($conf->password)
                ->setStreamOptions([
                    'ssl' => [
                        'allow_self_signed' => true,
                        'verify_peer' => false
                    ]
                ]);

            $mailer = new \Swift_Mailer($transport);

            // callback function used instead of Swift_Message() object
            // -> we want the formatted/replaced message as subject
            $messageCallback = function($content, $records) use ($conf){
                $subject = 'No Subject';
                if(!empty($records)){
                    // build subject from first record -> remove "markdown"
                    $subject = str_replace(['*', '_'], '', $records[0]['message']);
                }

                $jsonData = @json_encode($records, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);


                $message = (new \Swift_Message())
                    ->setSubject($subject)
                    ->addPart($jsonData)
                    ->setFrom($conf->from)
                    ->setTo($conf->to)
                    ->setContentType('text/html')
                    ->setCharset('utf-8')
                    ->setMaxLineLength(1000);

                if($conf->addJson){
                    $jsonAttachment = (new \Swift_Attachment())
                        ->setFilename('data.json')
                        ->setContentType('application/json')
                        ->setBody($jsonData);
                    $message->attach($jsonAttachment);
                }

                return $message;
            };

            $params[] = $mailer;
            $params[] = $messageCallback;
            $params[] = Logger::toMonologLevel($this->getLevel());  // min level that is handled
            $params[] = true;                                       // bubble
        }

        return $params;
    }

    /**
     * get __construct() parameters for SocketHandler() call
     * @return array
     */
    protected function getHandlerParamsSocket() : array {
        $params = [];
        if( !empty($conf = $this->handlerParamsConfig['socket']) ){
            // meta data (required by receiver socket)
            $meta = [
                'logType' => 'mapLog',
                'stream'=> $conf->streamConf->stream
            ];

            $params[] = $conf->dsn;
            $params[] = Logger::toMonologLevel($this->getLevel());
            $params[] = true;
            $params[] = $meta;
        }

        return $params;
    }

    /**
     * get __construct() params for SlackWebhookHandler() call
     * @param string $handlerKey
     * @return array
     */
    protected function getHandlerParamsSlack(string $handlerKey) : array {
        $params = [];
        if( !empty($conf = $this->handlerParamsConfig[$handlerKey]) ){
            $params[] = $conf->slackWebHookURL;
            $params[] = $conf->slackChannel;
            $params[] = $conf->slackUsername;
            $params[] = true;                                       // $useAttachment
            $params[] = $conf->slackIcon;
            $params[] = true;                                       // $includeContext
            $params[] = false;                                      // $includeExtra
            $params[] = Logger::toMonologLevel($this->getLevel());  // min level that is handled
            $params[] = true;                                       // $bubble
            //$params[] = ['extra', 'context.tag'];                 // $excludeFields
            $params[] = [];                                         // $excludeFields
        }

        return $params;
    }

    /**
     * send this Log to global log buffer storage
     */
    public function buffer(){
        if( !empty($this->handlerParamsConfig) ){
            Monolog::instance()->push($this);
        }  
    }


}
