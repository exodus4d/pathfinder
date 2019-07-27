<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 23.02.15
 * Time: 23:56
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;
use lib\logging;
use Controller\Ccp\Universe;

class SystemModel extends AbstractMapTrackingModel {

    /**
     * system position x max
     */
    const MAX_POS_X                         = 2440;

    /**
     * system position y max
     */
    const MAX_POS_Y                         = 1480;

    /**
     * max count of history signature data in cache
     */
    const MAX_SIGNATURES_HISTORY_DATA       = 10;

    /**
     * TTL for history signature data
     */
    const TTL_SIGNATURES_HISTORY            = 7200;

    /**
     * cache key prefix for getData(); result WITH log data
     */
    const DATA_CACHE_KEY_SIGNATURES_HISTORY = 'HISTORY_SIGNATURES';

    /**
     * @var string
     */
    protected $table                        = 'system';

    /**
     * @var array
     */
    protected $staticSystemDataCache        = [];

    /**
     * @var array
     */
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
            'belongs-to-one' => 'Model\Pathfinder\MapModel',
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
            'validate' => true
        ],
        'alias' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
        ],
        'typeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\SystemTypeModel',
            'constraint' => [
                [
                    'table' => 'system_type',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'statusId' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 1,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\SystemStatusModel',
            'constraint' => [
                [
                    'table' => 'system_status',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => true,
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
            'default' => 0,
            'activity-log' => true
        ],
        'description' => [
            'type' => Schema::DT_TEXT,
            'activity-log' => true,
            'validate' => true
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
        'signatures' => [
            'has-many' => ['Model\Pathfinder\SystemSignatureModel', 'systemId']
        ],
        'connectionsSource' => [
            'has-many' => ['Model\Pathfinder\ConnectionModel', 'source']
        ],
        'connectionsTarget' => [
            'has-many' => ['Model\Pathfinder\ConnectionModel', 'target']
        ]
    ];

    /**
     * set data by associative array
     * @param array $data
     */
    public function setData(array $data){
        $this->copyfrom($data, ['statusId', 'locked', 'rallyUpdated', 'position', 'description']);
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

            $systemData                         = (object) [];
            $systemData->id                     = $this->_id;
            $systemData->mapId                  = is_object($this->mapId) ? $this->get('mapId', true) : 0;
            $systemData->systemId               = $this->systemId;
            $systemData->alias                  = $this->alias;

            if(is_object($this->typeId)){
                $systemData->type               = $this->typeId->getData();
            }

            if(is_object($this->statusId)){
                $systemData->status             = $this->statusId->getData();
            }

            $systemData->locked                 = $this->locked;
            $systemData->rallyUpdated           = strtotime($this->rallyUpdated);
            $systemData->rallyPoke              = $this->rallyPoke;
            $systemData->description            = $this->description ? : '';

            $systemData->position               = (object) [];
            $systemData->position->x            = $this->posX;
            $systemData->position->y            = $this->posY;

            $systemData->created                = (object) [];
            $systemData->created->created       = strtotime($this->created);
            if(is_object($this->createdCharacterId)){
                $systemData->created->character = $this->createdCharacterId->getData();
            }

            $systemData->updated                = (object) [];
            $systemData->updated->updated       = strtotime($this->updated);
            if(is_object($this->updatedCharacterId)){
                $systemData->updated->character = $this->updatedCharacterId->getData();
            }

            // static system data -------------------------------------------------------------------------------------
            $systemData->name                   = $this->name;
            $systemData->security               = $this->security;
            $systemData->trueSec                = $this->trueSec;
            $systemData->effect                 = $this->effect;
            $systemData->shattered              = $this->shattered;

            $systemData->constellation          = (object) [];
            $systemData->constellation->id      = $this->constellationId;
            $systemData->constellation->name    = $this->constellation;

            $systemData->region                 = (object) [];
            $systemData->region->id             = $this->regionId;
            $systemData->region->name           = $this->region;

            $systemData->planets                = $this->planets ? : [];
            $systemData->statics                = $this->statics ? : [];

            if(is_object($this->faction)){
                $systemData->faction            = $this->faction;
            }

            // max caching time for a system
            // the cached date has to be cleared manually on any change
            // this includes system, connection,... changes (all dependencies)
            $this->updateCacheData($systemData);
        }

        return $systemData;
    }

    /**
     * get all static data
     * @return mixed|null|\stdClass
     * @throws \Exception
     */
    private function getStaticSystemData(){
        $staticData = null;
        if( !empty($this->staticSystemDataCache[$this->systemId]) ){
            $staticData = $this->staticSystemDataCache[$this->systemId];
        }else{
            $staticData = (new Universe())->getSystemData($this->systemId);
            if($staticData){
                $this->staticSystemDataCache = [$this->systemId => $staticData];
            }
        }
        return $staticData;
    }

    /**
     * get static system data by key
     * @param string $key
     * @return mixed|null
     * @throws \Exception
     */
    private function getStaticSystemValue(string $key){
        $value = null;
        if($staticData = $this->getStaticSystemData()){
            if(isset($staticData->$key)){
                $value = $staticData->$key;
            }
        }
        return $value;
    }

    /**
     * @param string $key
     * @param int $val
     * @return bool
     * @throws \Exception
     */
    protected function validate_systemId(string $key, int $val) : bool {
        $valid = true;
        // check if static system data exists for systemId = $val
        if( !(bool)(new Universe())->getSystemData($val) ){
            $valid = false;
            $this->throwValidationException($key, 'Validation failed: "' . $key . '" = "' . $val . '"');
        }

        return $valid;
    }

    /**
     * @param string $key
     * @param int $val
     * @return bool
     * @throws \Exception\ValidationException
     */
    protected function validate_statusId(string $key, int $val) : bool {
        $valid = true;
        if( !$this->rel('statusId')::getStatusById($val) ){
            $valid = false;
            $this->throwValidationException($key, 'Validation failed: "' . $key . '" = "' . $val . '"');
        }

        return $valid;
    }

    /**
     * @param string $key
     * @param string $val
     * @return bool
     * @throws \Exception\ValidationException
     */
    protected function validate_description(string $key, string $val) : bool {
        $valid = true;
        if(mb_strlen($val) > 9000){
            $valid = false;
            $this->throwValidationException($key, 'Validation failed: "' . $key . '" too long');
        }
        return $valid;
    }

    /**
     * setter for system alias
     * @param string $alias
     * @return string
     */
    public function set_alias($alias){
        $alias = trim($alias);

        // we don´t need redundant data. "name" is always preferred if "alias" is empty
        if($alias === $this->name){
            $alias = '';
        }

        return $alias;
    }

    /**
     * setter for statusId
     * @param $status
     */
    public function set_status($status){
        if($statusId = (int)$status['id']){
            $this->statusId = $statusId;
        }
    }

    /**
     * setter for position array
     * @param $position
     * @return null
     */
    public function set_position($position){
        $position = (array)$position;
        if(count($position) === 2){
            $this->posX = $position['x'];
            $this->posY = $position['y'];
        }
        return null;
    }

    /**
     * setter for x coordinate
     * @param int $posX
     * @return int
     */
    public function set_posX(int $posX) : int {
        $posX = abs($posX);
        if($posX > self::MAX_POS_X){
            $posX = self::MAX_POS_X;
        }

        return $posX;
    }

    /**
     * setter for y coordinate
     * @param int $posY
     * @return int
     */
    public function set_posY(int $posY) : int{
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
                break;
            default:
                $rally = date('Y-m-d H:i:s', $rally);
                break;
        }

        return $rally;
    }

    public function get_name(){
        return $this->getStaticSystemValue('name');
    }

    public function get_constellationId(){
        $constellationData = $this->getStaticSystemValue('constellation');
        return $constellationData ? $constellationData->id : null;
    }

    public function get_constellation(){
        $constellationData = $this->getStaticSystemValue('constellation');
        return $constellationData ? $constellationData->name : null;
    }

    public function get_regionId(){
        $constellationData = $this->getStaticSystemValue('constellation');
        return ($constellationData && $constellationData->region) ? $constellationData->region->id : null;
    }

    public function get_region(){
        $constellationData = $this->getStaticSystemValue('constellation');
        return ($constellationData && $constellationData->region) ? $constellationData->region->name : null;
    }

    public function get_faction(){
        return $this->getStaticSystemValue('faction');
    }

    public function get_security(){
        return $this->getStaticSystemValue('security');
    }

    public function get_trueSec(){
        return $this->getStaticSystemValue('trueSec');
    }

    public function get_effect(){
        return $this->getStaticSystemValue('effect');
    }

    public function get_shattered(){
        return $this->getStaticSystemValue('shattered');
    }

    public function get_statics(){
        return $this->getStaticSystemValue('statics');
    }

    public function get_planets(){
        return $this->getStaticSystemValue('planets');
    }

    /**
     * Event "Hook" function
     * @param self $self
     * @param $pkeys
     */
    public function afterInsertEvent($self, $pkeys){
        $self->clearCacheData();
        $self->logActivity('systemCreate');
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     * @return bool
     */
    public function beforeUpdateEvent($self, $pkeys) : bool {
        $status = parent::beforeUpdateEvent($self, $pkeys);

        if($status && !$self->isActive()){
            // reset "rally point" fields
            $self->rallyUpdated = 0;
            $self->rallyPoke = false;

            // delete connections
            foreach($self->getConnections() as $connection){
                $connection->erase();
            }

            // delete signatures
            if(!$self->getMap()->persistentSignatures){
                foreach($self->getSignatures() as $signature){
                    $signature->erase();
                }
            }
        }

        return $status;
    }

    /**
     * Event "Hook" function
     * @param self $self
     * @param $pkeys
     */
    public function afterUpdateEvent($self, $pkeys){
        $self->clearCacheData();
        $activity = ($self->isActive()) ? 'systemUpdate' : 'systemDelete';
        $self->logActivity($activity);
    }

    /**
     * Event "Hook" function
     * @param self $self
     * @param $pkeys
     */
    public function afterEraseEvent($self, $pkeys){
        $self->clearCacheData();
        $self->logActivity('systemDelete');
    }

    /**
     * get blank signature model
     * @return SystemSignatureModel
     * @throws \Exception
     */
    public function getNewSignature() : SystemSignatureModel {
        /**
         * @var $signature SystemSignatureModel
         */
        $signature = self::getNew('SystemSignatureModel');
        $signature->systemId = $this;
        return $signature;
    }

    /**
     * @param string $action
     * @return logging\LogInterface
     * @throws \Exception\ConfigException
     */
    public function newLog(string $action = '') : Logging\LogInterface{
        return $this->getMap()->newLog($action)->setTempData($this->getLogObjectData());
    }

    /**
     * @return MapModel
     */
    public function getMap() : MapModel {
        return $this->get('mapId');
    }

    /**
     * check object for model access
     * @param CharacterModel $characterModel
     * @return bool
     */
    public function hasAccess(CharacterModel $characterModel) : bool {
        return $this->mapId ? $this->mapId->hasAccess($characterModel) : false;
    }

    /**
     * delete a system from a map
     * hint: signatures and connections will be deleted on cascade
     * @param CharacterModel $characterModel
     * @return bool
     */
    public function delete(CharacterModel $characterModel){
        return ($this->valid() && $this->hasAccess($characterModel)) ? $this->erase() : false;
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
     * -> might be filtered by active has() filter
     * @return SystemSignatureModel[]
     */
    public function getSignatures(){
        return $this->signatures ? : [];
    }

    /**
     * get data for all Signatures in this system
     * @return \stdClass[]
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
     * get Signature by id and check for access
     * @param int $id
     * @return SystemSignatureModel|null
     */
    public function getSignatureById(int $id) : ?SystemSignatureModel {
        return $this->relFindOne('signatures', self::getFilter('id', $id));
    }

    /**
     * get a signature by its "unique" 3-digit name
     * @param string $name
     * @return SystemSignatureModel|null
     */
    public function getSignatureByName(string $name) : ?SystemSignatureModel {
        return $this->relFindOne('signatures', self::getFilter('name', $name));
    }

    /**
     * get data for all structures in this system
     * @return \stdClass[]
     */
    public function getStructuresData() : array {
        return $this->getMap()->getStructuresData([$this->systemId]);
    }

    /**
     * check whether this system is in w-space
     * @return bool
     */
    public function isWormhole() : bool {
        return ($this->typeId->id === 1);
    }

    /**
     * check whether this system is in k-space
     * @return bool
     */
    public function isKspace() : bool {
        return ($this->typeId->id === 2);
    }

    /**
     * check whether this system is in a-space
     * @return bool
     */
    public function isAbyss() : bool {
        return ($this->typeId->id === 3 && $this->security === 'A');
    }

    /**
     * send rally point poke to various "APIs"
     * -> send to a Slack channel
     * -> send to a Discord channel
     * -> send to an Email
     * @param array $rallyData
     * @param CharacterModel $characterModel
     * @throws \Exception\ConfigException
     */
    public function sendRallyPoke(array $rallyData, CharacterModel $characterModel){
        // rally log needs at least one handler to be valid
        $isValidLog = false;
        $log = new logging\RallyLog('rallySet', $this->getMap()->getLogChannelData());

        // Slack poke -----------------------------------------------------------------------------
        $slackChannelKey = 'slackChannelRally';
        if(
            $rallyData['pokeSlack'] === true &&
            $this->getMap()->isSlackChannelEnabled($slackChannelKey)
        ){
            $isValidLog = true;
            $log->addHandler('slackRally', null, $this->getMap()->getSlackWebHookConfig($slackChannelKey));
        }

        // Discord poke ---------------------------------------------------------------------------
        $discordChannelKey = 'discordWebHookURLRally';
        if(
            $rallyData['pokeDiscord'] === true &&
            $this->getMap()->isDiscordChannelEnabled($discordChannelKey)
        ){
            $isValidLog = true;

            $log->addHandler('discordRally', null, $this->getMap()->getDiscordWebHookConfig($discordChannelKey));
        }

        // Mail poke ------------------------------------------------------------------------------
        $mailAddressKey = 'RALLY_SET';
        if(
            $rallyData['pokeMail'] === true &&
            $this->getMap()->isMailSendEnabled('RALLY_SET')
        ){
            $isValidLog = true;
            $mailConf = $this->getMap()->getSMTPConfig($mailAddressKey, false);
            $log->addHandler('mail', 'mail', $mailConf);
        }

        // Buffer log -----------------------------------------------------------------------------
        if($isValidLog){
            $log->setTempData($this->getLogObjectData(true));
            $log->setCharacter($characterModel);
            if( !empty($rallyData['message']) ){
                $log->setData([
                    'message' => $rallyData['message']
                ]);
            }
            $log->buffer();
        }
    }

    /**
     * set system type based on security
     */
    public function setType(){
        switch($this->security){
            case 'H':
            case 'L':
            case '0.0':
                $typeId = 2; // k-space
                break;
            case 'A':
                $typeId = 3; // a-space
                break;
            default:
                $typeId = 1; // w-space
        }

        /**
         * @var $type MapTypeModel
         */
        $type = $this->rel('typeId');
        $type->getById($typeId);
        $this->typeId = $type;
    }

    /**
     * save signature for this system
     * @param SystemSignatureModel $signature
     * @param CharacterModel $character
     * @return false|ConnectionModel
     */
    public function saveSignature(SystemSignatureModel $signature, CharacterModel $character){
        $signature->systemId = $this;
        return $signature->save($character);
    }

    /**
     * get object relevant data for model log
     * @param bool $fullData
     * @return array
     */
    public function getLogObjectData($fullData = false) : array{
        $objectData = [
            'objId' => $this->_id,
            'objName' => $this->name
        ];

        if($fullData){
            $objectData['objUrl'] = $this->getMap()->getDeeplinkUrl($this->_id);
            $objectData['objAlias'] = $this->alias;
            $objectData['objRegion'] = $this->region;
            $objectData['objIsWormhole'] = $this->isWormhole();
            $objectData['objEffect'] = $this->effect;
            $objectData['objSecurity'] = $this->security;
            $objectData['objTrueSec'] = $this->trueSec;
            $objectData['objCountPlanets'] = count((array)$this->planets);
            $objectData['objDescription'] = $this->description;
        }

        return $objectData;
    }

    /**
     * @param string $stamp
     * @return array|null
     */
    public function getSignatureHistoryEntry(string $stamp) : ?array {
        $signatureHistoryData = array_filter($this->getSignaturesHistory(), function($historyEntry) use ($stamp){
            return md5($historyEntry['stamp']) == $stamp;
        });
        return empty($signatureHistoryData) ? null : reset($signatureHistoryData);
    }

    /**
     * @return array
     */
    public function getSignaturesHistory() : array {
        if(!is_array($signaturesHistoryData = $this->getCacheData(self::DATA_CACHE_KEY_SIGNATURES_HISTORY))){
            $signaturesHistoryData = [];
        }
        return $signaturesHistoryData;
    }

    /**
     * Updates the signature history cache
     * -> each (bulk) change to signatures of this system must result in a new signature history cache entry
     * -> This method also clears the cache of this system, so that new signature data gets returned for in getData()
     * @param CharacterModel $character
     * @param string $action
     * @throws \Exception
     */
    public function updateSignaturesHistory(CharacterModel $character, string $action = 'edit') : void {
        if(!$this->dry()){
            $signaturesHistoryData = $this->getSignaturesHistory();
            $historyEntry = [
                'stamp'         => microtime(true),
                'character'     => $character->getBasicData(),
                'action'        => $action,
                'signatures'    => $this->getSignaturesData()
            ];

            array_unshift($signaturesHistoryData, $historyEntry);

            // limit max history data
            array_splice($signaturesHistoryData, self::MAX_SIGNATURES_HISTORY_DATA);

            $this->updateCacheData($signaturesHistoryData, self::DATA_CACHE_KEY_SIGNATURES_HISTORY, self::TTL_SIGNATURES_HISTORY);

            // clear system cache here
            // -> Signature model updates should NOT update the system cache on change
            //    because a "bulk" change to signatures would clear the system cache multiple times
            $this->clearCacheData();
        }
    }

    /**
     * @see parent
     */
    public function clearCacheData(){
        parent::clearCacheData();

        // clear map cache as well
        $this->mapId->clearCacheData();
    }

    /**
     * @see parent
     */
    public function filterRel() : void {
        $this->filter('signatures', self::getFilter('active', true), ['order' => 'name']);
        $this->filter('connectionsTarget', self::getFilter('active', true));
        $this->filter('connectionsSource', self::getFilter('active', true));
    }

    /**
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     * @throws \Exception
     */
    public static function setup($db = null, $table = null, $fields = null){
        if($status = parent::setup($db, $table, $fields)){
            $status = parent::setMultiColumnIndex(['mapId', 'systemId'], true);
        }

        return $status;
    }

} 