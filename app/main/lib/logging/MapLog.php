<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 04.08.2017
 * Time: 22:08
 */

namespace lib\logging;


use controller\LogController;

class MapLog extends AbstractCharacterLog {

    /**
     * List of possible handlers (tested)
     * -> final handler will be set dynamic for per instance
     * @var array
     */
    protected $handlerConfig        = [
        //'stream'   => 'json',
        //'socket'   => 'json',
        //'slackMap' => 'json'
    ];

    /**
     * @var string
     */
    protected $channelType          = 'map';

    /**
     * @var bool
     */
    protected $logActivity          = false;


    public function __construct(string $action, array $objectData){
        parent::__construct($action, $objectData);

        $this->setLevel('info');
        $this->setTag($this->getTagFromAction());
    }

    /**
     * get log tag depending on log action
     * @return string
     */
    public function getTagFromAction(){
        $tag = parent::getTag();
        $actionParts = $this->getActionParts();
        switch($actionParts[1]){
            case 'create': $tag = 'success'; break;
            case 'update': $tag = 'warning'; break;
            case 'delete': $tag = 'danger'; break;
        }

        return $tag;
    }

    /**
     * @return string
     */
    public function getChannelName() : string {
        return $this->getChannelType() . '_' . $this->getChannelId();
    }

    /**
     * @return string
     */
    public function getMessage() : string {
        return $this->getActionParts()[0] . " '{objName}'";
    }

    /**
     * @return array
     */
    public function getData() : array {
        $data = parent::getData();

        // add system, connection, signature data -------------------------------------------------
        if(!empty($tempLogData = $this->getTempData())){
            $objectData['object'] = $tempLogData;
            $data = $objectData + $data;
        }

        // add human readable changes to string ---------------------------------------------------
        $data['formatted'] = $this->formatData($data);

        return $data;
    }

    /**
     * @param array $data
     * @return string
     */
    protected function formatData(array $data) : string {
        $actionParts = $this->getActionParts();
        $objectString = !empty($data['object']) ? "'" .  $data['object']['objName'] . "'" . ' #' . $data['object']['objId'] : '';
        $string = ucfirst($actionParts[1]) . 'd ' . $actionParts[0] . " " . $objectString;

        // format changed columns (recursive) ---------------------------------------------
        switch($actionParts[1]){
            case 'create':
            case 'update':
                $formatChanges = function(array $changes) use (&$formatChanges) : string {
                    $string = '';
                    foreach($changes as $field => $value){
                        if(is_array($value)){
                            $string .= $field . ": ";
                            $string .= $formatChanges($value);
                            $string .= next( $changes ) ? " , " : '';
                        }else{
                            if(is_numeric($value)){
                                $formattedValue = $value;
                            }elseif(is_null($value)){
                                $formattedValue = "NULL";
                            }elseif(empty($value)){
                                $formattedValue = "' '";
                            }elseif(is_string($value)){
                                $formattedValue = "'" . $this->f3->clean($value) . "'";
                            }else{
                                $formattedValue = (string)$value;
                            }

                            $string .= $formattedValue;
                            if($field == 'old'){
                                $string .= " ➜ ";
                            }
                        }
                    }
                    return $string;
                };

                $string .= ' | ' . $formatChanges($data['main']);
                break;
        }

        return $string;
    }

    /**
     * split $action "CamelCase" wise
     * @return array
     */
    protected function getActionParts() : array {
        return array_map('strtolower', preg_split('/(?=[A-Z])/', $this->getAction()));
    }

    /**
     * @param bool $logActivity
     */
    public function logActivity(bool $logActivity){
        $this->logActivity = $logActivity;
    }

    public function buffer(){
        parent::buffer();

        if($this->logActivity){
            // map logs should also used for "activity" logging
            LogController::instance()->push($this);
        }
    }

}