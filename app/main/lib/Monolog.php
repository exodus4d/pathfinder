<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 04.08.2017
 * Time: 20:17
 */

namespace lib;


use controller\LogController;
use lib\logging;
use Monolog\Registry;
use Monolog\Formatter\FormatterInterface;
use Monolog\Handler\HandlerInterface;
use Monolog\Handler\BufferHandler;
use Monolog\Logger;


class Monolog extends \Prefab {

    const ERROR_FORMATTER                                   = 'Unknown log formatter for key "%s"';
    const ERROR_HANDLER                                     = 'Unknown log handler for key "%s"';
    const ERROR_PROCESSOR                                   = 'Unknown log processor for key "%s"';

    const FORMATTER = [
        'line'          => 'Monolog\Formatter\LineFormatter',
        'json'          => 'Monolog\Formatter\JsonFormatter',
        'html'          => 'Monolog\Formatter\HtmlFormatter',
        'mail'          => 'lib\logging\formatter\MailFormatter'
    ];

    const HANDLER = [
        'stream'        => 'Monolog\Handler\StreamHandler',
        'mail'          => 'Monolog\Handler\SwiftMailerHandler',
        'socket'        => 'lib\logging\handler\SocketHandler',
        'slackMap'      => 'lib\logging\handler\SlackMapWebhookHandler',
        'slackRally'    => 'lib\logging\handler\SlackRallyWebhookHandler',
        'discordMap'    => 'lib\logging\handler\DiscordMapWebhookHandler',
        'discordRally'  => 'lib\logging\handler\DiscordRallyWebhookHandler'
    ];

    const PROCESSOR = [
        'psr'           => 'Monolog\Processor\PsrLogMessageProcessor'
    ];

    /**
     * @var Logging\LogCollection[][]|Logging\MapLog[][]
     */
    private $logs =  [
        'solo'          => [],
        'groups'        => []
    ];

    public function __construct(){
        // set timezone for all Logger instances
        if(class_exists(Logger::class)){
            if( is_callable($getTimezone = \Base::instance()->get('getTimeZone')) ){
                Logger::setTimezone($getTimezone());
            };
        }else{
            LogController::getLogger('ERROR')->write(sprintf(Config::ERROR_CLASS_NOT_EXISTS_COMPOSER, Logger::class));
        }
    }

    /**
     * buffer log object, add to objectStorage collection
     * -> this buffered data can be stored/logged somewhere (e.g. DB/file) at any time
     * -> should be cleared afterwards!
     * @param Logging\AbstractLog $log
     * @throws \Exception
     */
    public function push(Logging\AbstractLog $log){
        // check whether $log should be "grouped" by common handlers
        if($log->isGrouped()){
            $groupHash = $log->getGroupHash();

            if(!isset($this->logs['groups'][$groupHash])){
                // create new log collection
               // $this->logs['groups'][$groupHash] = new Logging\LogCollection($log->getChannelName());
                $this->logs['groups'][$groupHash] = new Logging\LogCollection('mapDelete');
            }
            $this->logs['groups'][$groupHash]->addLog($log);

            // remove "group" handler from $log
            // each log should only be logged once per handler!
            $log->removeHandlerGroups();
        }

        $this->logs['solo'][] = $log;
    }

    /**
     * bulk process all stored logs -> send to Monolog lib
     */
    public function log(){

        foreach($this->logs as $logType => $logs){
            foreach($logs as $logKey => $log){
                $groupHash      = $log->getGroupHash();
                $level          = Logger::toMonologLevel($log->getLevel());

                // add new logger to Registry if not already exists
                if(Registry::hasLogger($groupHash)){
                    $logger = Registry::getInstance($groupHash);
                }else{
                    $logger = new Logger($log->getChannelName());

                    // disable microsecond timestamps (seconds should be fine)
                    $logger->useMicrosecondTimestamps(true);

                    // configure new $logger --------------------------------------------------------------------------
                    // get Monolog Handler with Formatter config
                    // -> $log could have multiple handler with different Formatters
                    $handlerConf = $log->getHandlerConfig();
                    foreach($handlerConf as $handlerKey => $formatterKey){
                        // get Monolog Handler class
                        $handlerParams = $log->getHandlerParams($handlerKey);
                        $handler = $this->getHandler($handlerKey, $handlerParams);

                        // get Monolog Formatter
                        $formatter = $this->getFormatter((string)$formatterKey);
                        if( $formatter instanceof FormatterInterface){
                            $handler->setFormatter($formatter);
                        }

                        if($log->hasBuffer()){
                            // wrap Handler into bufferHandler
                            // -> bulk save all logs for this $logger
                            $bufferHandler = new BufferHandler($handler);
                            $logger->pushHandler($bufferHandler);
                        }else{
                            $logger->pushHandler($handler);
                        }
                    }

                    // get Monolog Processor config
                    $processorConf = $log->getProcessorConfig();
                    foreach($processorConf as $processorKey => $processorCallback){
                        if(is_callable($processorCallback)){
                            // custom Processor callback function
                            $logger->pushProcessor($processorCallback);
                        }else{
                            // get Monolog Processor class
                            $processor = $this->getProcessor($processorKey);
                            $logger->pushProcessor($processor);
                        }
                    }

                    Registry::addLogger($logger, $groupHash);
                }

                $logger->addRecord($level, $log->getMessage(), $log->getContext());
            }
        }

        // clear log object storage
        $this->logs['groups'] = [];
        $this->logs['solo'] = [];
    }

    /**
     * get Monolog Formatter instance by key
     * @param string $formatKey
     * @return FormatterInterface|null
     * @throws \Exception
     */
    private function getFormatter(string $formatKey){
        $formatter = null;
        if(!empty($formatKey)){
            if(array_key_exists($formatKey, self::FORMATTER)){
                $formatClass = self::FORMATTER[$formatKey];
                $formatter = new $formatClass();
            }else{
                throw new \Exception(sprintf(self::ERROR_FORMATTER, $formatKey));
            }
        }

        return $formatter;
    }

    /**
     * get Monolog Handler instance by key
     * @param string $handlerKey
     * @param array $handlerParams
     * @return HandlerInterface
     * @throws \Exception
     */
    private function getHandler(string $handlerKey, array $handlerParams = []): HandlerInterface{
        if(array_key_exists($handlerKey, self::HANDLER)){
            $handlerClass = self::HANDLER[$handlerKey];
            $handler = new $handlerClass(...$handlerParams);
        }else{
            throw new \Exception(sprintf(self::ERROR_HANDLER, $handlerKey));
        }

        return $handler;
    }

    /**
     * get Monolog Processor instance by key
     * @param string $processorKey
     * @return callable
     * @throws \Exception
     */
    private function getProcessor(string $processorKey): callable {
        if(array_key_exists($processorKey, self::PROCESSOR)){
            $ProcessorClass = self::PROCESSOR[$processorKey];
            $processor = new  $ProcessorClass();
        }else{
            throw new \Exception(sprintf(self::ERROR_PROCESSOR, $processorKey));
        }

        return $processor;
    }


}