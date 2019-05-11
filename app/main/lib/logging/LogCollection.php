<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 16.09.2017
 * Time: 11:23
 */

namespace lib\logging;


class LogCollection extends AbstractLog {

    const ERROR_EMPTY               = __CLASS__ . ' is empty';

    /**
     * handlers for this collection
     * -> no default is set
     * @var array
     */
    protected $handlerConfig        = [];

    /**
     * processors for this collection
     * -> no default is set
     * @var array
     */
    protected $processorConfig      = [];

    /**
     * @var null|\SplObjectStorage
     */
    private $collection             = null;

    public function __construct(string $action){
        parent::__construct($action);

        $this->collection = new \SplObjectStorage();
    }

    /**
     * get first Log from Collection
     * @return AbstractLog
     * @throws \Exception
     */
    protected function getPrimaryLog(): AbstractLog{
        $this->collection->rewind();
        if($this->collection->valid()){
            /**
             * @var $log AbstractLog
             */
            $log = $this->collection->current();
        }else{
            throw new \Exception( self::ERROR_EMPTY);
        }

        return $log;
    }

    /**
     * add a new log object to this collection
     * @param AbstractLog $log
     * @throws \Exception
     */
    public function addLog(AbstractLog $log){
        if(!$this->collection->contains($log)){
            if(!$this->collection->count()){
                // first log sets the default for this collection
                $this->channelType = $log->getChannelType();

                // get relevant handlerKeys for this collection
                $handlerGroups = array_flip($log->getHandlerGroups());

                // remove handlers that are not relevant for this collection
                $handlerConfig = $log->getHandlerConfig();
                $handlerConfigGroup = array_intersect_key($handlerConfig, $handlerGroups);

                // remove handlersParams that are not relevant for this collection
                $handlerParamsConfig = $log->getHandlerParamsConfig();
                $handlerParamsConfigGroup = array_intersect_key($handlerParamsConfig, $handlerGroups);

                // add all handlers that are relevant for this collection
                foreach($handlerConfigGroup as $handlerKey => $formatterKey){
                    $handlerParams = array_key_exists($handlerKey, $handlerParamsConfigGroup) ? $handlerParamsConfigGroup[$handlerKey] : null;
                    $this->addHandler($handlerKey, $formatterKey, $handlerParams);
                }

                // add processors for this collection
                $this->processorConfig = $log->getProcessorConfig();
            }

            $this->setMessage($log->getMessage());
            $this->setTag($log->getTag());

            $this->collection->attach($log);
        }
    }

    /**
     * @param string $message
     */
    public function setMessage(string $message){
        $currentMessage = parent::getMessage();
        if(empty($currentMessage)){
            $newMessage = $message;
        }elseif($message !== $currentMessage){
            $newMessage = 'multi changes';
        }else{
            $newMessage = $currentMessage ;
        }

        parent::setMessage($newMessage);
    }

    /**
     * @param string $tag
     * @throws \Exception
     */
    public function setTag(string $tag){
        $currentTag = parent::getTag();
        switch($currentTag){
            case 'default':
                // no specific tag set so far... set new
                $newTag = $tag; break;
            case 'information':
                // do not change "information" tag (mixed tag logs in this collection)
                $newTag = $currentTag; break;
            default:
                // set mixed tag -> "information"
                $newTag = ($tag !== $currentTag) ? 'information': $tag;
        }

        parent::setTag($newTag);
    }

    /**
     * get log data for all logs in this collection
     * @return array
     */
    public function getData() : array{
        $this->collection->rewind();
        $data = [];
        while($this->collection->valid()){
            $data[] = $this->collection->current()->getData();
            $this->collection->next();
        }
        return $data;
    }

    /**
     * @return string
     * @throws \Exception
     */
    public function getChannelName() : string{
        return $this->getPrimaryLog()->getChannelName();
    }

    /**
     * @return string
     * @throws \Exception
     */
    public function getLevel() : string{
        return $this->getPrimaryLog()->getLevel();
    }

    /**
     * @return bool
     * @throws \Exception
     */
    public function hasBuffer() : bool{
        return $this->getPrimaryLog()->hasBuffer();
    }

    /**
     * @return array
     * @throws \Exception
     */
    public function getTempData() : array{
        return $this->getPrimaryLog()->getTempData();
    }



}