<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 26.02.15
 * Time: 21:12
 */

namespace Model;

use DB\SQL\Schema;
use Controller;
use Controller\Api\Route;

class ConnectionModel extends BasicModel{

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
            'belongs-to-one' => 'Model\MapModel',
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
            'belongs-to-one' => 'Model\SystemModel',
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
            'belongs-to-one' => 'Model\SystemModel',
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
        'eolUpdated' => [
            'type' => Schema::DT_TIMESTAMP,
            'default' => null
        ]
    ];

    /**
     * set an array with all data for a system
     * @param $systemData
     */
    public function setData($systemData){

        foreach((array)$systemData as $key => $value){

            if( !is_array($value) ){
                if( $this->exists($key) ){
                    $this->$key = $value;
                }
            }elseif($key == 'type'){
                // json field
                $this->$key = $value;
            }
        }
    }

    /**
     * get connection data as array
     * @return array
     */
    public function getData(){

        $connectionData = [
            'id' => $this->id,
            'source' => $this->source->id,
            'target' => $this->target->id,
            'scope' => $this->scope,
            'type' => $this->type,
            'updated' => strtotime($this->updated),
            'eolUpdated' => strtotime($this->eolUpdated)
        ];

        return $connectionData;
    }

    /**
     * setter for connection type
     * @param $type
     * @return int|number
     */
    public function set_type($type){
        $newTypes = (array)json_decode($type);

        // set EOL timestamp
        if( !in_array('wh_eol', $newTypes) ){
            $this->eolUpdated = null;
        }elseif(
            in_array('wh_eol', $newTypes) &&
            !in_array('wh_eol', (array)$this->type) // $this->type == null for new connection! (e.g. map import)
        ){
            // connection EOL status change
            $this->touch('eolUpdated');
        }

        return $type;
    }

    /**
     * check object for model access
     * @param CharacterModel $characterModel
     * @return mixed
     */
    public function hasAccess(CharacterModel $characterModel){
        return $this->mapId->hasAccess($characterModel);
    }

    /**
     * set default connection type by search route between endpoints
     */
    public function setDefaultTypeData(){
        if(
            is_object($this->source) &&
            is_object($this->target)
        ){
            $routeController = new Route();
            $routeController->initJumpData();
            $route = $routeController->findRoute($this->source->name, $this->target->name, 1);

            if($route['routePossible']){
                $this->scope = 'stargate';
                $this->type = ['stargate'];
            }else{
                $this->scope = 'wh';
                $this->type = ['wh_fresh'];
            }
        }
    }

    /**
     * check whether this connection is a wormhole or not
     * @return bool
     */
    public function isWormhole(){
        return ($this->scope === 'wh');
    }

    /**
     * check whether this model is valid or not
     * @return bool
     */
    public function isValid(){
        $isValid = true;

        // check if source/target system are not equal
        // check if source/target belong to same map
        if(
            is_object($this->source) &&
            is_object($this->target) &&
            $this->get('source', true) === $this->get('target', true) ||
            $this->source->get('mapId', true) !== $this->target->get('mapId', true)
        ){
            $isValid = false;
        }

        return $isValid;
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * return false will stop any further action
     * @param ConnectionModel $self
     * @param $pkeys
     * @return bool
     */
    public function beforeInsertEvent($self, $pkeys){
        // check for "default" connection type and add them if missing
        // -> get() with "true" returns RAW data! important for JSON table column check!
        $types = (array)json_decode( $this->get('type', true) );

        if(
            !$this->scope ||
            empty($types)
        ){
            $this->setDefaultTypeData();
        }

        return parent::beforeInsertEvent($self, $pkeys);
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterInsertEvent($self, $pkeys){
        parent::afterInsertEvent($self, $pkeys);

        $self->logActivity('connectionCreate');
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterUpdateEvent($self, $pkeys){
        parent::afterUpdateEvent($self, $pkeys);

        $self->logActivity('connectionUpdate');
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * @param self $self
     * @param $pkeys
     */
    public function afterEraseEvent($self, $pkeys){
        parent::afterUpdateEvent($self, $pkeys);

        $self->logActivity('connectionDelete');
    }

    /**
     * log character activity create/update/delete events
     * @param string $action
     */
    protected function logActivity($action){

        if(
            $this->enableActivityLogging &&
            (
                $action === 'connectionDelete' ||
                !empty($this->fieldChanges)
            ) &&
            $this->get('mapId')->isActivityLogEnabled()
        ){
            // TODO implement "dependency injection" for active character object...
            $controller = new Controller\Controller();
            $currentActiveCharacter = $controller->getCharacter();
            $characterId = is_null($currentActiveCharacter) ? 0 : $currentActiveCharacter->_id;
            $mapId = $this->get('mapId', true);

            parent::bufferActivity($characterId, $mapId, $action);
        }
    }

    /**
     * save connection and check if obj is valid
     * @return ConnectionModel|false
     */
    public function save(){
        return ( $this->isValid() ) ? parent::save() : false;
    }

    /**
     * delete a connection
     * @param CharacterModel $characterModel
     */
    public function delete(CharacterModel $characterModel){
        if( !$this->dry() ){
            // check if character has access
            if($this->hasAccess($characterModel)){
                $this->erase();
            }
        }
    }

    /**
     * see parent
     */
    public function clearCacheData(){
        parent::clearCacheData();

        // clear map cache as well
        $this->mapId->clearCacheData();
    }

    /**
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     */
    public static function setup($db=null, $table=null, $fields=null){
        $status = parent::setup($db,$table,$fields);

        if($status === true){
            $status = parent::setMultiColumnIndex(['source', 'target', 'scope']);
        }

        return $status;
    }
} 