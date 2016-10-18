<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 23.02.15
 * Time: 23:56
 */

namespace Model;

use controller\MailController;
use DB\SQL\Schema;
use lib\Config;

class SystemModel extends BasicModel {

    const MAX_POS_X = 2300;
    const MAX_POS_Y = 498;

    protected $table = 'system';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true,
            'activity-log' => true
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
        'systemId' => [
            'type' => Schema::DT_INT,
            'index' => true,
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'alias' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
        ],
        'regionId' => [
            'type' => Schema::DT_INT,
            'index' => true,
        ],
        'region' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'constellationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
        ],
        'constellation' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'effect' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'typeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\SystemTypeModel',
            'constraint' => [
                [
                    'table' => 'system_type',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'security' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'trueSec' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 1
        ],
        'statusId' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 1,
            'index' => true,
            'belongs-to-one' => 'Model\SystemStatusModel',
            'constraint' => [
                [
                    'table' => 'system_status',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'activity-log' => true
        ],
        'locked' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0,
            'activity-log' => true
        ],
        'rallyUpdated' => [
            'type' => Schema::DT_TIMESTAMP,
            'default' => null
        ],
        'rallyPoke' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'description' => [
            'type' => Schema::DT_VARCHAR512,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
        ],
        'posX' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0
        ],
        'posY' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0
        ],
        'createdCharacterId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\CharacterModel',
            'constraint' => [
                [
                    'table' => 'character',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'updatedCharacterId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\CharacterModel',
            'constraint' => [
                [
                    'table' => 'character',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'signatures' => [
            'has-many' => ['Model\SystemSignatureModel', 'systemId']
        ],
        'connectionsSource' => [
            'has-many' => ['Model\ConnectionModel', 'source']
        ],
        'connectionsTarget' => [
            'has-many' => ['Model\ConnectionModel', 'target']
        ]
    ];

    /**
     * set an array with all data for a system
     * @param array $systemData
     */
    public function setData($systemData){

        foreach((array)$systemData as $key => $value){

            if($key == 'created'){
                continue;
            }

            if(!is_array($value)){
                if($this->exists($key)){
                    $this->$key = $value;
                }
            }else{
                // special array data
                if($key == 'constellation'){
                    $this->constellationId = (int)$value['id'];
                    $this->constellation = $value['name'];
                }elseif($key == 'region'){
                    $this->regionId = (int)$value['id'];
                    $this->region = $value['name'];
                }elseif($key == 'type'){
                    $this->typeId = (int)$value['id'];
                }elseif($key == 'status'){
                    $this->statusId = (int)$value['id'];
                }elseif($key == 'position'){
                    $this->posX = (int)$value['x'];
                    $this->posY = (int)$value['y'];
                }
            }
        }
    }

    /**
     * get map data as object
     * @return \stdClass
     * @throws \Exception
     */
    public function getData(){

        // check if there is cached data
        $systemData = $this->getCacheData();

        if(is_null($systemData)){
            // no cached system data found

            $systemData = (object) [];
            $systemData->id = $this->id;
            $systemData->mapId = is_object($this->mapId) ? $this->get('mapId', true) : 0;
            $systemData->systemId = $this->systemId;
            $systemData->name = $this->name;
            $systemData->alias = $this->alias;
            $systemData->effect = $this->effect;
            $systemData->security = $this->security;
            $systemData->trueSec = $this->trueSec;

            $systemData->region = (object) [];
            $systemData->region->id = $this->regionId;
            $systemData->region->name = $this->region;

            $systemData->constellation = (object) [];
            $systemData->constellation->id = $this->constellationId;
            $systemData->constellation->name = $this->constellation;

            $systemData->type = (object) [];
            $systemData->type->id = $this->typeId->id;
            $systemData->type->name = $this->typeId->name;

            $systemData->status = (object) [];
            $systemData->status->id = is_object($this->statusId) ? $this->statusId->id : 1;
            $systemData->status->name = is_object($this->statusId) ? $this->statusId->name : 'unknown';

            $systemData->locked = $this->locked;
            $systemData->rallyUpdated = strtotime($this->rallyUpdated);
            $systemData->rallyPoke = $this->rallyPoke;
            $systemData->description = $this->description;

            $systemData->statics = $this->getStaticWormholeData();

            $systemData->position = (object) [];
            $systemData->position->x = $this->posX;
            $systemData->position->y = $this->posY;


            $systemData->created = (object) [];
            $systemData->created->created = strtotime($this->created);
            if( is_object($this->createdCharacterId) ){
                $systemData->created->character = $this->createdCharacterId->getData();
            }

            $systemData->updated = (object) [];
            $systemData->updated->updated = strtotime($this->updated);
            if( is_object($this->updatedCharacterId) ){
                $systemData->updated->character = $this->updatedCharacterId->getData();
            }

            // max caching time for a system
            // the cached date has to be cleared manually on any change
            // this includes system, connection,... changes (all dependencies)
            $this->updateCacheData($systemData, '', 300);
        }

        return $systemData;
    }

    /**
     * setter for system security value
     * @param float $trueSec
     * @return float
     */
    public function set_trueSec($trueSec){
        if(
            $trueSec > 0 &&
            $trueSec < 0.1
        ){
            // 0.3 is still a LS -> no rounding
            $trueSec = 0.1;
        }else{
            $trueSec = round($trueSec, 1);
        }

        return $trueSec;
    }

    /**
     * setter validation for x coordinate
     * @param int $posX
     * @return int
     */
    public function set_posX($posX){
        $posX = abs($posX);
        if($posX > self::MAX_POS_X){
            $posX = self::MAX_POS_X;
        }

        return $posX;
    }

    /**
     * setter validation for y coordinate
     * @param int $posY
     * @return int
     */
    public function set_posY($posY){
        $posY = abs($posY);
        if($posY > self::MAX_POS_Y){
            $posY = self::MAX_POS_Y;
        }

        return $posY;
    }

    /**
     * setter for system rally timestamp
     * @param int $rally
     * @return null|string
     */
    public function set_rallyUpdated($rally){
        $rally = (int)$rally;

        switch($rally){
            case 0:
                $rally = null;
                break;
            case 1:
                // new rally point set
                $rally = date('Y-m-d H:i:s', time());
                // flag system for mail poke -> after save()
                $this->virtual('newRallyPointSet', true);
                break;
            default:
                $rally = date('Y-m-d H:i:s', $rally);
                break;
        }

        return $rally;
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterInsertEvent($self, $pkeys){
        parent::afterInsertEvent($self, $pkeys);

        $self->logActivity('systemCreate');
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     * @return bool
     */
    public function beforeUpdateEvent($self, $pkeys){
        $status = parent::beforeUpdateEvent($self, $pkeys);

        if( !$self->isActive()){
            // system becomes inactive
            // reset "rally point" fields
            $self->rallyUpdated = 0;
            $self->rallyPoke = false;

            // delete connections
            $connections = $self->getConnections();
            foreach($connections as $connection){
                $connection->erase();
            }
        }

        return $status;
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterUpdateEvent($self, $pkeys){
        parent::afterUpdateEvent($self, $pkeys);

        // check if rally point mail should be send
        if(
            $self->newRallyPointSet &&
            $self->rallyPoke
        ){
            $self->sendRallyPointMail();
        }

        $activity = ($self->isActive()) ? 'systemUpdate' : 'systemDelete';
        $self->logActivity($activity);
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * @param self $self
     * @param $pkeys
     */
    public function afterEraseEvent($self, $pkeys){
        parent::afterUpdateEvent($self, $pkeys);

        $self->logActivity('systemDelete');
    }

    /**
     * log character activity create/update/delete events
     * @param string $action
     */
    protected function logActivity($action){
        if(
            $this->enableActivityLogging &&
            (
                $action === 'systemDelete' ||
                !empty($this->fieldChanges)
            ) &&
            $this->get('mapId')->isActivityLogEnabled()
        ){
            $characterId = $this->get('updatedCharacterId', true);
            $mapId = $this->get('mapId', true);

            parent::bufferActivity($characterId, $mapId, $action);
        }
    }

    /**
     * check object for model access
     * @param CharacterModel $characterModel
     * @return bool
     */
    public function hasAccess(CharacterModel $characterModel){
        return $this->mapId->hasAccess($characterModel);
    }

    /**
     * delete a system from a map
     * hint: signatures and connections will be deleted on cascade
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
     * get all connections of this system
     * @return ConnectionModel[]
     */
    public function getConnections(){
        $connections = [];

        $this->filter('connectionsTarget', [
            'active = :active AND target = :targetId',
            ':active' => 1,
            ':targetId' => $this->_id
        ]);
        if($this->connectionsTarget){
            foreach($this->connectionsTarget as $connection){
                $connections[$connection->_id] = $connection;
            }
        }

        $this->filter('connectionsSource', [
            'active = :active AND source = :sourceId',
            ':active' => 1,
            ':sourceId' => $this->_id
        ]);
        if($this->connectionsSource){
            foreach($this->connectionsSource as $connection){
                $connections[$connection->_id] = $connection;
            }
        }

        return $connections;
    }

    /**
     * get all signatures of this system
     * @return SystemSignatureModel[]
     */
    public function getSignatures(){
        $signatures = [];
        $this->filter('signatures', ['active = ?', 1], ['order' => 'name']);

        if($this->signatures){
            $signatures = $this->signatures;
        }

        return $signatures;
    }

    /**
     * get all data for all Signatures in this system
     * @return \stdClass[]
     */
    public function getSignaturesData(){
        $signaturesData = [];
        $signatures = $this->getSignatures();

        foreach($signatures as $signature){
            $signaturesData[] = $signature->getData();
        }

        return $signaturesData;
    }

    /**
     * get Signature by id and check for access
     * @param CharacterModel $characterModel
     * @param $id
     * @return null|SystemSignatureModel
     */
    public function getSignatureById(CharacterModel $characterModel, $id){
        $signature = null;

        if($this->hasAccess($characterModel)){
            $this->filter('signatures', ['active = ? AND id = ?', 1, $id]);
            if($this->signatures){
                $signature = reset( $this->signatures );
            }
        }

        return $signature;
    }

    /**
     * get a signature by its "unique" 3-digit name
     * @param CharacterModel $characterModel
     * @param string $name
     * @return null|SystemSignatureModel
     */
    public function getSignatureByName(CharacterModel $characterModel, $name){
        $signature = null;

        if($this->hasAccess($characterModel)){
            $this->filter('signatures', ['active = ? AND name = ?', 1, $name]);
            if($this->signatures){
                $signature = reset( $this->signatures );
            }
        }

        return $signature;
    }

    /**
     * check whether this system is a wormhole
     * @return bool
     */
    public function isWormhole(){
        return ($this->typeId->id === 1);
    }

    /**
     * check whether this syste is a shattered wormhole
     * @return bool
     */
    public function isShatteredWormhole(){
        return ($this->isWormhole() && $this->security === 'SH');
    }

    /**
     * get static WH data for this system
     * -> any WH system has at least one static WH
     * @return \stdClass[]
     * @throws \Exception
     */
    protected function getStaticWormholeData(){
        $wormholeData = [];

        // only wormholes have "static" connections
        if($this->isWormhole()){
            // get static systems by "constellationId" --------------------------------------------
            $constellationWormholeModel = self::getNew('ConstellationWormholeModel');
            $systemStatics = $constellationWormholeModel->find([
                'constellationId = :constellationId',
                ':constellationId' => $this->constellationId
            ]);

            if( is_object($systemStatics) ){
                foreach($systemStatics as $systemStatic){
                    $wormholeData[] = $systemStatic->getData();
                }
            }

            // get static systems by "systemId" (shattered wormholes) -----------------------------
            $systemWormholeModel = self::getNew('SystemWormholeModel');
            $systemStatics = $systemWormholeModel->find([
                'systemId = :systemId',
                ':systemId' => $this->systemId
            ]);

            if( is_object($systemStatics) ){
                foreach($systemStatics as $systemStatic){
                    $wormholeData[] = $systemStatic->getData();
                }
            }
        }

        return $wormholeData;
    }

    /**
     * send rally point information by mail
     */
    protected function sendRallyPointMail(){
        $recipient = Config::getNotificationMail('RALLY_SET');

        if(
            $recipient &&
            \Audit::instance()->email($recipient)
        ){
            $updatedCharacterId = (int) $this->get('updatedCharacterId', true);
            /**
             * @var $character CharacterModel
             */
            $character = $this->rel('updatedCharacterId');
            $character->getById( $updatedCharacterId );
            if( !$character->dry() ){
                $body = [];
                $body[] = "Map:\t\t" . $this->mapId->name;
                $body[] = "System:\t\t" . $this->name;
                $body[] = "Region:\t\t" . $this->region;
                $body[] = "Security:\t" . $this->security;
                $body[] = "Character:\t" . $character->name;
                $body[] = "Time:\t\t" . date('g:i a; F j, Y', strtotime($this->rallyUpdated) );
                $bodyMsg = implode("\r\n", $body);

                (new MailController())->sendRallyPoint($recipient, $bodyMsg);
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
            $status = parent::setMultiColumnIndex(['mapId', 'systemId'], true);
        }

        return $status;
    }

} 