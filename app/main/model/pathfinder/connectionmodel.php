<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 26.02.15
 * Time: 21:12
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;
use Controller\Api\Route;
use lib\logging;

class ConnectionModel extends AbstractMapTrackingModel {

    protected $table = 'connection';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'mapId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\MapModel',
            'constraint' => [
                [
                    'table' => 'map',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'source' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\SystemModel',
            'constraint' => [
                [
                    'table' => 'system',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'activity-log' => true
        ],
        'target' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\SystemModel',
            'constraint' => [
                [
                    'table' => 'system',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'activity-log' =>  true
        ],
        'scope' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
        ],
        'type' => [
            'type' => self::DT_JSON,
            'activity-log' => true
        ],
        'sourceEndpointType' => [
            'type' => self::DT_JSON,
            'activity-log' => true
        ],
        'targetEndpointType' => [
            'type' => self::DT_JSON,
            'activity-log' => true
        ],
        'eolUpdated' => [
            'type' => Schema::DT_TIMESTAMP,
            'default' => null
        ],
        'signatures' => [
            'has-many' => ['Model\Pathfinder\SystemSignatureModel', 'connectionId']
        ],
        'connectionLog' => [
            'has-many' => ['Model\Pathfinder\ConnectionLogModel', 'connectionId']
        ]
    ];

    /**
     * allowed connection types
     * @var array
     */
    protected static $connectionTypeWhitelist = [
        // base type for scopes
        'abyssal',
        'jumpbridge',
        'stargate',
        // wh mass reduction types
        'wh_fresh',
        'wh_reduced',
        'wh_critical',
        // wh jump mass types
        'wh_jump_mass_s',
        'wh_jump_mass_m',
        'wh_jump_mass_l',
        'wh_jump_mass_xl',
        // other types
        'wh_eol',
        'preserve_mass'
    ];

    /**
     * get connection data
     * @param bool $addSignatureData
     * @param bool $addLogData
     * @return \stdClass
     */
    public function getData($addSignatureData = false, $addLogData = false){
        $connectionData = (object) [];
        $connectionData->id             = $this->id;
        $connectionData->source         = $this->source->id;
        $connectionData->target         = $this->target->id;
        $connectionData->scope          = $this->scope;
        $connectionData->type           = $this->type;
        $connectionData->updated        = strtotime($this->updated);
        $connectionData->created        = strtotime($this->created);
        $connectionData->eolUpdated     = strtotime($this->eolUpdated);

        if( !empty($endpointsData = $this->getEndpointsData()) ){
            $connectionData->endpoints = $endpointsData;
        }

        if($addSignatureData){
            if( !empty($signaturesData = $this->getSignaturesData()) ){
                $connectionData->signatures = $signaturesData;
            }
        }

        if($addLogData){
            if( !empty($logsData = $this->getLogsData()) ){
                $connectionData->logs = $logsData;
            }
        }

        return $connectionData;
    }

    /**
     * setter for connection type
     * @param $type
     * @return int|number
     */
    public function set_type($type){
        // remove unwanted types -> they should not be send from client
        // -> reset keys! otherwise JSON format results in object and not in array
        $type = array_values(array_intersect(array_unique((array)$type), self::$connectionTypeWhitelist));

        // set EOL timestamp
        if( !in_array('wh_eol', $type) ){
            $this->eolUpdated = null;
        }elseif(
            in_array('wh_eol', $type) &&
            !in_array('wh_eol', (array)$this->type) // $this->type == null for new connection! (e.g. map import)
        ){
            // connection EOL status change
            $this->touch('eolUpdated');
        }

        return $type;
    }

    /**
     * setter for endpoints data (data for source/target endpoint)
     * @param $endpointsData
     */
    public function set_endpoints($endpointsData){
        if(!empty($endpointData = (array)$endpointsData['source'])){
            $this->setEndpointData('source', $endpointData);
        }
        if(!empty($endpointData = (array)$endpointsData['target'])){
            $this->setEndpointData('target', $endpointData);
        }
    }

    /**
     * set connection endpoint related data
     * @param string $label (source||target)
     * @param array $endpointData
     */
    public function setEndpointData(string $label, array $endpointData = []){
        if($this->exists($field = $label . 'EndpointType')){
            $types = empty($types = (array)$endpointData['types']) ? null : $types;
            if($this->$field != $types){
                $this->$field = $types;
            }
        }
    }

    /**
     * check object for model access
     * @param CharacterModel $characterModel
     * @return bool
     */
    public function hasAccess(CharacterModel $characterModel) : bool {
        $access = false;
        if( !$this->dry() ){
            $access = $this->mapId->hasAccess($characterModel);
        }
        return $access;
    }

    /**
     * set default connection type by search route between endpoints
     * @throws \Exception
     */
    public function setDefaultTypeData(){
        if(
            is_object($this->source) &&
            is_object($this->target)
        ){
            if(
                $this->source->isAbyss() ||
                $this->target->isAbyss()
            ){
                $this->scope = 'abyssal';
                $this->type = ['abyssal'];
            }else{
                $routeController = new Route();
                $route = $routeController->searchRoute($this->source->systemId, $this->target->systemId, 1);

                if($route['routePossible']){
                    $this->scope = 'stargate';
                    $this->type = ['stargate'];
                }else{
                    $this->scope = 'wh';
                    $this->type = ['wh_fresh'];
                }
            }
        }
    }

    /**
     * check whether this connection is a wormhole or not
     * @return bool
     */
    public function isWormhole() : bool {
        return ($this->scope === 'wh');
    }

    /**
     * check whether this model is valid or not
     * @return bool
     * @throws \Exception\DatabaseException
     */
    public function isValid() : bool {
        if($valid = parent::isValid()){
            // check if source/target system are not equal
            // check if source/target belong to same map
            if(
                is_object($this->source) &&
                is_object($this->target) &&
                $this->get('source', true) === $this->get('target', true) ||
                $this->source->get('mapId', true) !== $this->target->get('mapId', true)
            ){
                $valid = false;
            }
        }

        return $valid;
    }

    /**
     *  Event "Hook" function
     * can be overwritten
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     * @return bool
     * @throws \Exception\DatabaseException
     */
    public function beforeInsertEvent($self, $pkeys) : bool {
        // check for "default" connection type and add them if missing
        // -> get() with "true" returns RAW data! important for JSON table column check!
        $types = (array)json_decode($this->get('type', true));
        if(
            !$this->scope ||
            empty($types)
        ){
            $this->setDefaultTypeData();
        }

        return $this->isValid() ? parent::beforeInsertEvent($self, $pkeys) : false;
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterInsertEvent($self, $pkeys){
        $self->clearCacheData();
        $self->logActivity('connectionCreate');
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterUpdateEvent($self, $pkeys){
        $self->clearCacheData();
        $self->logActivity('connectionUpdate');
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * @param self $self
     * @param $pkeys
     */
    public function afterEraseEvent($self, $pkeys){
        $self->clearCacheData();
        $self->logActivity('connectionDelete');
    }

    /**
     * @param string $action
     * @return logging\LogInterface
     * @throws \Exception\ConfigException
     */
    public function newLog(string $action = '') : Logging\LogInterface {
        return $this->getMap()->newLog($action)->setTempData($this->getLogObjectData());
    }

    /**
     * @return MapModel
     */
    public function getMap() : MapModel {
        return $this->get('mapId');
    }

    /**
     * delete a connection
     * @param CharacterModel $characterModel
     * @return bool
     */
    public function delete(CharacterModel $characterModel) : bool {
        return ($this->valid() && $this->hasAccess($characterModel)) ? $this->erase() : false;
    }

    /**
     * get object relevant data for model log
     * @return array
     */
    public function getLogObjectData() : array {
        return [
            'objId' => $this->_id,
            'objName' => $this->scope
        ];
    }

    /**
     * see parent
     */
    public function clearCacheData(){
        $this->mapId->clearCacheData();
    }

    /**
     * get all signatures that are connected with this connection
     * @return array|mixed
     */
    public function getSignatures(){
        $signatures = [];
        $this->filter('signatures', [
            'active = :active',
            ':active' => 1
        ]);

        if($this->signatures){
            $signatures = $this->signatures;
        }

        return $signatures;
    }

    /**
     * get all jump logs that are connected with this connection
     * @return array|mixed
     */
    public function getLogs(){
        $logs = [];

        if($this->connectionLog){
            $logs = $this->connectionLog;
        }

        return $logs;
    }

    /**
     * get endpoint data for $type (source || target)
     * @param string $type
     * @return array
     */
    protected function getEndpointData(string $type) : array {
        $endpointData = [];

        if($this->exists($field = $type . 'EndpointType') && !empty($types = (array)$this->$field)){
            $endpointData['types'] = $types;
        }

        return $endpointData;
    }

    /**
     * get all endpoint data for this connection
     * @return array
     */
    protected function getEndpointsData() : array {
        $endpointsData = [];

        if(!empty($endpointData = $this->getEndpointData('source'))){
            $endpointsData['source'] = $endpointData;
        }
        if(!empty($endpointData = $this->getEndpointData('target'))){
            $endpointsData['target'] = $endpointData;
        }

        return $endpointsData;
    }

    /**
     * get all signature data linked to this connection
     * @return array
     */
    public function getSignaturesData() : array {
        $signaturesData = [];
        $signatures = $this->getSignatures();

        foreach($signatures as $signature){
            $signaturesData[] = $signature->getData();
        }

        return $signaturesData;
    }

    /**
     * get all connection log data linked to this connection
     * @return array
     */
    public function getLogsData() : array {
        $logsData = [];
        $logs = $this->getLogs();

        foreach($logs as $log){
            $logsData[] = $log->getData();
        }

        return $logsData;
    }

    /**
     * get blank connectionLog model
     * @return ConnectionLogModel
     * @throws \Exception
     */
    public function getNewLog() : ConnectionLogModel {
        /**
         * @var $log ConnectionLogModel
         */
        $log = self::getNew('ConnectionLogModel');
        $log->connectionId = $this;
        return $log;
    }

    /**
     * log new mass for this connection
     * @param CharacterLogModel $characterLog
     * @return ConnectionModel
     * @throws \Exception
     */
    public function logMass(CharacterLogModel $characterLog) : self {
        if( !$characterLog->dry() ){
            $log = $this->getNewLog();
            $log->shipTypeId = $characterLog->shipTypeId;
            $log->shipTypeName = $characterLog->shipTypeName;
            $log->shipMass = $characterLog->shipMass;
            $log->characterId = $characterLog->characterId->_id;
            $log->characterName = $characterLog->characterId->name;
            $log->save();
        }

        return $this;
    }

    /**
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     * @throws \Exception
     */
    public static function setup($db = null, $table = null, $fields = null){
        if($status = parent::setup($db, $table, $fields)){
            $status = parent::setMultiColumnIndex(['source', 'target', 'scope']);
        }
        return $status;
    }
} 