<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 22:10
 */

namespace Model;

use Controller\Api\System;
use DB\SQL\Schema;
use data\file\FileHandler;
use lib\Config;
use lib\logging;
use Exception\PathfinderException;

class MapModel extends AbstractMapTrackingModel {

    protected $table = 'map';

    /**
     * cache key prefix for getCharactersData();
     */
    const DATA_CACHE_KEY_CHARACTER                  = 'CHARACTERS';

    const ERROR_SLACK_CHANNEL                       = 'Invalid #Slack channel column [%s]';
    const ERROR_DISCORD_CHANNEL                     = 'Invalid #Discord channel column [%s]';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true,
            'activity-log' => true
        ],
        'scopeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\MapScopeModel',
            'constraint' => [
                [
                    'table' => 'map_scope',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'validate_notDry',
            'activity-log' => true
        ],
        'typeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\MapTypeModel',
            'constraint' => [
                [
                    'table' => 'map_type',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'validate_notDry',
            'activity-log' => true
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true,
            'validate' => true
        ],
        'icon' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
        ],
        'deleteExpiredConnections' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'activity-log' => true
        ],
        'deleteEolConnections' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'activity-log' => true
        ],
        'persistentAliases' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'activity-log' => true
        ],
        'logActivity' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'activity-log' => true
        ],
        'logHistory' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0,
            'activity-log' => true
        ],
        'slackWebHookURL' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'validate' => true
        ],
        'slackUsername' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
        ],
        'slackIcon' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
        ],
        'slackChannelHistory' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
        ],
        'slackChannelRally' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
        ],
        'discordUsername' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'activity-log' => true
        ],
        'discordWebHookURLRally' => [
            'type' => Schema::DT_VARCHAR256,
            'nullable' => false,
            'default' => '',
            'validate' => true
        ],
        'discordWebHookURLHistory' => [
            'type' => Schema::DT_VARCHAR256,
            'nullable' => false,
            'default' => '',
            'validate' => true
        ],
        'systems' => [
            'has-many' => ['Model\SystemModel', 'mapId']
        ],
        'connections' => [
            'has-many' => ['Model\ConnectionModel', 'mapId']
        ],
        'mapCharacters' => [
            'has-many' => ['Model\CharacterMapModel', 'mapId']
        ],
        'mapCorporations' => [
            'has-many' => ['Model\CorporationMapModel', 'mapId']
        ],
        'mapAlliances' => [
            'has-many' => ['Model\AllianceMapModel', 'mapId']
        ]
    ];

    /**
     * set map data by an associative array
     * @param array $data
     */
    public function setData($data){
        unset($data['id']);
        unset($data['created']);
        unset($data['updated']);
        unset($data['createdCharacterId']);
        unset($data['updatedCharacterId']);

        foreach((array)$data as $key => $value){
            if(!is_array($value)){
                if($this->exists($key)){
                    $this->$key = $value;
                }
            }else{
                // special array data
                if($key == 'scope'){
                    $this->scopeId = (int)$value['id'];
                }elseif($key == 'type'){
                    $this->typeId = (int)$value['id'];
                }
            }
        }
    }

    /**
     * get map data
     * -> this includes system and connection data as well!
     * @return \stdClass
     * @throws PathfinderException
     * @throws \Exception
     */
    public function getData(){
        // check if there is cached data
        $mapDataAll = $this->getCacheData();

        if(is_null($mapDataAll)){
            // no cached map data found

            $mapData                                        = (object) [];
            $mapData->id                                    = $this->id;
            $mapData->name                                  = $this->name;
            $mapData->icon                                  = $this->icon;
            $mapData->deleteExpiredConnections              = $this->deleteExpiredConnections;
            $mapData->deleteEolConnections                  = $this->deleteEolConnections;
            $mapData->persistentAliases                     = $this->persistentAliases;

            // map scope
            $mapData->scope                                 = (object) [];
            $mapData->scope->id                             = $this->scopeId->id;
            $mapData->scope->name                           = $this->scopeId->name;
            $mapData->scope->label                          = $this->scopeId->label;

            // map type
            $mapData->type                                  = (object) [];
            $mapData->type->id                              = $this->typeId->id;
            $mapData->type->name                            = $this->typeId->name;
            $mapData->type->classTab                        = $this->typeId->classTab;

            // map logging
            $mapData->logging                               = (object) [];
            $mapData->logging->activity                     = $this->isActivityLogEnabled();
            $mapData->logging->history                      = $this->isHistoryLogEnabled();

            // map Slack logging
            $mapData->logging->slackHistory                 = $this->isSlackChannelEnabled('slackChannelHistory');
            $mapData->logging->slackRally                   = $this->isSlackChannelEnabled('slackChannelRally');
            $mapData->logging->slackWebHookURL              = $this->slackWebHookURL;
            $mapData->logging->slackUsername                = $this->slackUsername;
            $mapData->logging->slackIcon                    = $this->slackIcon;
            $mapData->logging->slackChannelHistory          = $this->slackChannelHistory;
            $mapData->logging->slackChannelRally            = $this->slackChannelRally;

            // map Discord logging
            $mapData->logging->discordRally                 = $this->isDiscordChannelEnabled('discordWebHookURLRally');
            $mapData->logging->discordUsername              = $this->discordUsername;
            $mapData->logging->discordWebHookURLRally       = $this->discordWebHookURLRally;
            $mapData->logging->discordWebHookURLHistory     = $this->discordWebHookURLHistory;

            // map mail logging
            $mapData->logging->mailRally                    = $this->isMailSendEnabled('RALLY_SET');

            // map access
            $mapData->access                                = (object) [];
            $mapData->access->character                     = [];
            $mapData->access->corporation                   = [];
            $mapData->access->alliance                      = [];

            $mapData->created                               = (object) [];
            $mapData->created->created                      = strtotime($this->created);
            if(is_object($this->createdCharacterId)){
                $mapData->created->character                = $this->createdCharacterId->getData();
            }

            $mapData->updated                               = (object) [];
            $mapData->updated->updated                      = strtotime($this->updated);
            if(is_object($this->updatedCharacterId)){
                $mapData->updated->character                = $this->updatedCharacterId->getData();
            }

            // get access object data ---------------------------------------------------------------------------------
            if($this->isPrivate()){
                $characters = $this->getCharacters();
                $characterData = [];
                foreach($characters as $character){
                    $characterData[] = $character->getData();
                }
                $mapData->access->character = $characterData;
            } elseif($this->isCorporation()){
                $corporations = $this->getCorporations();
                $corporationData = [];

                foreach($corporations as $corporation){
                    $corporationData[] = $corporation->getData();
                }
                $mapData->access->corporation = $corporationData;
            } elseif($this->isAlliance()){
                $alliances = $this->getAlliances();
                $allianceData = [];

                foreach($alliances as $alliance){
                    $allianceData[] = $alliance->getData();
                }
                $mapData->access->alliance = $allianceData;
            }

            // merge all data -----------------------------------------------------------------------------------------
            $mapDataAll = (object) [];
            $mapDataAll->mapData = $mapData;

            // map system data ----------------------------------------------------------------------------------------
            $mapDataAll->systems = $this->getSystemData();

            // map connection data ------------------------------------------------------------------------------------
            $mapDataAll->connections = $this->getConnectionData();

            // max caching time for a map
            // the cached date has to be cleared manually on any change
            // this includes system, connection,... changes (all dependencies)
            $this->updateCacheData($mapDataAll, '', self::DEFAULT_CACHE_TTL);
        }

        return $mapDataAll;
    }

    /**
     * validate name column
     * @param string $key
     * @param string $val
     * @return bool
     * @throws \Exception\ValidationException
     */
    protected function validate_name(string $key, string $val): bool {
        $valid = true;
        if(mb_strlen($val) < 3){
            $valid = false;
            $this->throwValidationException($key);
        }
        return $valid;
    }

    /**
     * validate Slack WebHook URL
     * @param string $key
     * @param string $val
     * @return bool
     * @throws \Exception\ValidationException
     */
    protected function validate_slackWebHookURL(string $key, string $val): bool {
        return $this->validate_WebHookURL($key, $val, 'slack');
    }

    /**
     * validate Discord History WebHook URL
     * @param string $key
     * @param string $val
     * @return bool
     * @throws \Exception\ValidationException
     */
    protected function validate_discordWebHookURLHistory(string $key, string $val): bool {
        return $this->validate_WebHookURL($key, $val, 'discord');
    }

    /**
     * validate Discord Rally WebHook URL
     * @param string $key
     * @param string $val
     * @return bool
     * @throws \Exception\ValidationException
     */
    protected function validate_discordWebHookURLRally(string $key, string $val): bool {
        return $this->validate_WebHookURL($key, $val, 'discord');
    }

    /**
     * validate Slack/Discord WebHook URL
     * @param string $key
     * @param string $val
     * @param string $type
     * @return bool
     * @throws \Exception\ValidationException
     */
    protected function validate_WebHookURL(string $key, string $val, string $type): bool {
        $valid = true;
        if( !empty($val) ){
            $hosts = [
                'slack' => ['hooks.slack.com'],
                'discord' => ['discordapp.com', 'ptb.discordapp.com']
            ];

            if(
                !\Audit::instance()->url($val) ||
                !in_array(parse_url($val, PHP_URL_HOST), $hosts[$type])
            ){
                $valid = false;
                $this->throwValidationException($key);
            }
        }
        return $valid;
    }

    /**
     * @param $channel
     * @return string
     */
    protected function set_slackChannelHistory($channel){
        return $this->formatSlackChannelName($channel);
    }

    /**
     * @param $channel
     * @return string
     */
    protected function set_slackChannelRally($channel){
        return $this->formatSlackChannelName($channel);
    }

    /**
     * convert a Slack channel name into correct format
     * @param $channel
     * @return string
     */
    private function formatSlackChannelName($channel){
        $channel = strtolower(str_replace(' ','', trim(trim((string)$channel), '#@')));
        if($channel){
            $channel = '#' . $channel;
        }
        return $channel;
    }

    /**
     * Event "Hook" function
     * @param self $self
     * @param $pkeys
     */
    public function afterInsertEvent($self, $pkeys){
        $self->clearCacheData();
        $self->logActivity('mapCreate');
    }

    /**
     * Event "Hook" function
     * @param self $self
     * @param $pkeys
     */
    public function afterUpdateEvent($self, $pkeys){
        $self->clearCacheData();

        $activity = ($self->isActive()) ? 'mapUpdate' : 'mapDelete';
        $self->logActivity($activity);
    }

    /**
     * Event "Hook" function
     * @param self $self
     * @param $pkeys
     */
    public function afterEraseEvent($self, $pkeys){
        $self->clearCacheData();
        $self->deleteLogFile();
    }

    /**
     * see parent
     */
    public function clearCacheData(){
        parent::clearCacheData();

        // clear character data with map access as well!
        parent::clearCacheDataWithPrefix(self::DATA_CACHE_KEY_CHARACTER);
    }

    /**
     * get blank system model pre-filled with default SDE data
     * -> check for "inactive" systems on this map first!
     * @param int $systemId
     * @return SystemModel
     * @throws \Exception
     */
    public function getNewSystem($systemId){
        // check for "inactive" system
        $system = $this->getSystemByCCPId($systemId);
        if( is_null($system) ){
            // get blank system
            $systemController = new System();
            $systems = $systemController->getSystemModelByIds([$systemId]);
            if( count($systems) ){
                $system = reset($systems);
                $system->mapId = $this->_id;
            }else{
                // should NEVER happen -> systemId does NOT exist in New Eden!!
                $this->getF3()->error(500, 'SystemId "' . $systemId . '"" does not exist in EVE!' );
            }

        }
        $system->setActive(true);

        return $system;
    }

    /**
     * get blank connection model for given source/target systems
     * @param SystemModel $sourceSystem
     * @param SystemModel $targetSystem
     * @return ConnectionModel
     */
    public function getNewConnection(SystemModel $sourceSystem, SystemModel $targetSystem){
        /**
         * @var $connection ConnectionModel
         */
        $connection = $this->rel('connections');
        $connection->mapId = $this;
        $connection->source = $sourceSystem;
        $connection->target = $targetSystem;
        return $connection;
    }

    /**
     * search for a system by id
     * @param int $id
     * @return null|SystemModel
     */
    public function getSystemById($id){
        /**
         * @var $system SystemModel
         */
        $system = $this->rel('systems');
        $result = $system->findone([
            'active = 1 AND mapId = :mapId AND id = :id',
            ':mapId' => $this->id,
            ':id' => $id
        ]);
        return is_object($result) ? $result : null;
    }

    /**
     * search for a system by CCPs systemId
     * -> "active" column is NOT checked
     * -> removed systems become "active" = 0
     * @param int $systemId
     * @param array $filter
     * @return null|SystemModel
     */
    public function getSystemByCCPId($systemId, $filter = []){
        /**
         * @var $system SystemModel
         */
        $system = $this->rel('systems');

        $query = [
            'mapId = :mapId AND systemId = :systemId',
            ':mapId' => $this->id,
            ':systemId' => $systemId
        ];

        // add optional filter -> e.g. search for "active = 1" system
        foreach($filter as $column => $value){
            $query[0] .= ' AND' . $this->db->quotekey($column) . ' = :' . $column;
            $query[':' . $column] = $value;
        }

        $result = $system->findone($query);
        return is_object($result) ? $result : null;
    }

    /**
     * get either all system models in this map
     * @return SystemModel[]
     */
    public function getSystems(){
        $systems = [];

        // orderBy x-Coordinate for smoother frontend animation (left to right)
        $this->filter('systems', ['active = 1'],
            ['order' => 'posX']
        );

        if($this->systems){
            $systems = $this->systems;
        }

        return $systems;
    }

    /**
     * get all system data for all systems in this map
     * @return \stdClass[]
     * @throws \Exception
     */
    public function getSystemData(){
        $systemData = [];
        $systems  = $this->getSystems();

        foreach($systems as $system){
            /**
             * @var $system SystemModel
             */
            $systemData[] = $system->getData();
        }

        return $systemData;
    }

    /**
     * search for a connection by id
     * @param int $id
     * @return null|ConnectionModel
     */
    public function getConnectionById($id){
        /**
         * @var $connection ConnectionModel
         */
        $connection = $this->rel('connections');
        $result = $connection->findone([
            'active = 1 AND mapId = :mapId AND id = :id',
            ':mapId' => $this->id,
            ':id' => $id
        ]);
        return is_object($result) ? $result : null;
    }

    /**
     * get all connections in this map
     * @param null $connectionIds
     * @param string $scope
     * @return ConnectionModel[]
     */
    public function getConnections($connectionIds = null, $scope = ''){
        $connections = [];

        $query = [
            'active = :active AND source > 0 AND target > 0',
            ':active' => 1
        ];

        if(!empty($scope)){
            $query[0] .= ' AND scope = :scope';
            $query[':scope'] = $scope;
        }

        if(!empty($connectionIds)){
            $query[0] .= ' AND id IN (?)';
            $query[] =  $connectionIds;
        }

        $this->filter('connections', $query);

        if($this->connections){
            $connections = $this->connections;
        }

        return $connections;
    }

    /**
     * get all connection data in this map
     * @return \stdClass[]
     */
    public function getConnectionData(){
        $connectionData = [];
        $connections  = $this->getConnections();

        foreach($connections as $connection){
            /**
             * @var $connection ConnectionModel
             */
            $connectionData[] = $connection->getData();
        }

        return $connectionData;
    }

    /**
     * set map access for an object (character, corporation or alliance)
     * @param $obj
     * @throws \Exception
     */
    public function setAccess($obj){

        $newAccessGranted = false;

        if($obj instanceof CharacterModel){
            // private map

            // check whether the user has already map access
            $this->has('mapCharacters', ['active = 1 AND characterId = :characterId', ':characterId' => $obj->id]);
            $result = $this->findone(['id = :id', ':id' => $this->id]);

            if($result === false){
                // grant access for the character
                $characterMap = self::getNew('CharacterMapModel');
                $characterMap->	characterId = $obj;
                $characterMap->mapId = $this;
                $characterMap->save();

                $newAccessGranted = true;
            }
        } elseif($obj instanceof CorporationModel){

            // check whether the corporation already has map access
            $this->has('mapCorporations', ['active = 1 AND corporationId = :corporationId', ':corporationId' => $obj->id]);
            $result = $this->findone(['id = :id', ':id' => $this->id]);

            if($result === false){
                // grant access for this corporation
                $corporationMap = self::getNew('CorporationMapModel');
                $corporationMap->corporationId = $obj;
                $corporationMap->mapId = $this;
                $corporationMap->save();

                $newAccessGranted = true;
            }
        } elseif($obj instanceof AllianceModel){

            // check whether the alliance already has map access
            $this->has('mapAlliances', ['active = 1 AND allianceId = :allianceId', ':allianceId' => $obj->id]);
            $result = $this->findone(['id = :id', ':id' => $this->id]);

            if($result === false){
                $allianceMap = self::getNew('AllianceMapModel');
                $allianceMap->allianceId = $obj;
                $allianceMap->mapId = $this;
                $allianceMap->save();

                $newAccessGranted = true;
            }
        }

        if($newAccessGranted){
            // mark this map as updated
            $this->setUpdated();
        }

    }

    /**
     * clear access for a given type of objects
     * @param array $clearKeys
     */
    public function clearAccess($clearKeys = ['character', 'corporation', 'alliance']){
        foreach($clearKeys as $key){
            switch($key){
                case 'character':
                    foreach((array)$this->mapCharacters as $characterMapModel){
                        /**
                         * @var CharacterMapModel $characterMapModel
                         */
                        $characterMapModel->erase();
                    };
                    break;
                case 'corporation':
                    foreach((array)$this->mapCorporations as $corporationMapModel){
                        /**
                         * @var CorporationMapModel $corporationMapModel
                         */
                        $corporationMapModel->erase();
                    };
                    break;
                case 'alliance':
                    foreach((array)$this->mapAlliances as $allianceMapModel){
                        /**
                         * @var AllianceMapModel $allianceMapModel
                         */
                        $allianceMapModel->erase();
                    };
                    break;
            }
        }
    }

    /**
     * checks whether a character has access to this map or not
     * @param CharacterModel $characterModel
     * @return bool
     * @throws PathfinderException
     */
    public function hasAccess(CharacterModel $characterModel){
        $hasAccess = false;

        if( !$this->dry() ){
            // get all maps the user has access to
            // this includes corporation and alliance maps
            $maps = $characterModel->getMaps();
            foreach($maps as $map){
                if($map->id === $this->id){
                    $hasAccess = true;
                    break;
                }
            }
        }

        return $hasAccess;
    }

    /**
     * get all (private) characters for this map
     * @return CharacterModel[]
     */
    private function getCharacters(){
        $characters = [];
        $filter = ['active = ?', 1];

        if( !empty($characterIds) ){
            $filter[0] .= ' AND id IN (?)';
            $filter[] =  $characterIds;
        }

        $this->filter('mapCharacters', $filter);

        if($this->mapCharacters){
            foreach($this->mapCharacters as $characterMapModel){
                $characters[] = $characterMapModel->characterId;
            }
        }

        return $characters;
    }

    /**
     * get all character models that are currently online "viewing" this map
     * @param array $options filter options
     * @return CharacterModel[]
     */
    private function getAllCharacters($options = []){
        $characters = [];

        if($this->isPrivate()){
            $activeCharacters = $this->getCharacters();

            // add active character for each user
            foreach($activeCharacters as $activeCharacter){
                $characters[] = $activeCharacter;
            }
        }elseif($this->isCorporation()){
            $corporations = $this->getCorporations();

            foreach($corporations as $corporation){
                $characters = array_merge($characters, $corporation->getCharacters([], $options));
            }
        }elseif($this->isAlliance()){
            $alliances = $this->getAlliances();

            foreach($alliances as $alliance){
                $characters = array_merge($characters, $alliance->getCharacters([], $options));
            }
        }

        return $characters;
    }

    /**
     * get data for ALL characters with map access
     * -> The result of this function is cached!
     * @param array $options
     * @return array|null|\stdClass
     * @throws \Exception
     */
    public function getCharactersData($options = []){
        // check if there is cached data
        $charactersData = $this->getCacheData(self::DATA_CACHE_KEY_CHARACTER);

        if(is_null($charactersData)){
            $charactersData = [];
            $characters = $this->getAllCharacters($options);

            foreach($characters as $character){
                $charactersData[] = $character->getData(true);
            }

            // cache active characters (if found)
            if(!empty($charactersData)){
                $this->updateCacheData($charactersData, self::DATA_CACHE_KEY_CHARACTER, 5);
            }
        }

        return $charactersData;
    }

    /**
     * get all corporations that have access to this map
     * @return CorporationModel[]
     */
    public function getCorporations(){
        $corporations = [];

        if($this->isCorporation()){
            $this->filter('mapCorporations', ['active = ?', 1]);

            if($this->mapCorporations){
                foreach($this->mapCorporations as $mapCorporation){
                    $corporations[] = $mapCorporation->corporationId;
                }
            }
        }

        return $corporations;
    }

    /**
     * get all alliances that have access to this map
     * @return AllianceModel[]
     */
    public function getAlliances(){
        $alliances = [];

        if($this->isAlliance()){
            $this->filter('mapAlliances', ['active = ?', 1]);

            if($this->mapAlliances){
                foreach($this->mapAlliances as $mapAlliance){
                    $alliances[] = $mapAlliance->allianceId;
                }
            }
        }

        return $alliances;
    }

    /**
     * @param string $action
     * @return Logging\LogInterface
     * @throws PathfinderException
     */
    public function newLog($action = ''): Logging\LogInterface{
        $logChannelData = $this->getLogChannelData();
        $logObjectData = $this->getLogObjectData();
        $log = (new logging\MapLog($action, $logChannelData))->setTempData($logObjectData);

        // update map history *.log files -----------------------------------------------------------------------------
        if($this->isHistoryLogEnabled()){
            // check socket config
            if(Config::validSocketConnect()){
                $log->addHandler('zmq', 'json', $this->getSocketConfig());
            }else{
                // update log file local (slow)
                $log->addHandler('stream', 'json', $this->getStreamConfig());
            }
        }

        // send map history to Slack channel --------------------------------------------------------------------------
        $slackChannelKey = 'slackChannelHistory';
        if($this->isSlackChannelEnabled($slackChannelKey)){
            $log->addHandler('slackMap', null, $this->getSlackWebHookConfig($slackChannelKey));
            $log->addHandlerGroup('slackMap');
        }

        // send map history to Discord channel ------------------------------------------------------------------------
        $discordChannelKey = 'discordWebHookURLHistory';
        if($this->isDiscordChannelEnabled($discordChannelKey)){
            $log->addHandler('discordMap', null, $this->getDiscordWebHookConfig($discordChannelKey));
            $log->addHandlerGroup('discordMap');
        }

        // update map activity ----------------------------------------------------------------------------------------
        $log->logActivity($this->isActivityLogEnabled());

        return $log;
    }

    /**
     * @return MapModel
     */
    public function getMap(): MapModel{
        return $this;
    }

    /**
     * get object relevant data for model log channel
     * @return array
     */
    public function getLogChannelData() : array{
        return [
            'channelId' => $this->_id,
            'channelName' => $this->name
        ];
    }
    /**
     * get object relevant data for model log object
     * @return array
     */
    public function getLogObjectData() : array{
        return [
            'objId' => $this->_id,
            'objName' => $this->name
        ];
    }

    protected function getLogFormatter(){
        return function(&$rowDataObj){
            unset($rowDataObj['extra']);
        };
    }

    /**
     * check if "activity logging" is enabled for this map type
     * @return bool
     * @throws PathfinderException
     */
    public function isActivityLogEnabled(): bool {
        return $this->logActivity && (bool) Config::getMapsDefaultConfig($this->typeId->name)['log_activity_enabled'];
    }

    /**
     * check if "history logging" is enabled for this map type
     * @return bool
     * @throws PathfinderException
     */
    public function isHistoryLogEnabled(): bool {
        return $this->logHistory && (bool) Config::getMapsDefaultConfig($this->typeId->name)['log_history_enabled'];
    }

    /**
     * check if "Slack WebHook" is enabled for this map type
     * @param string $channel
     * @return bool
     * @throws PathfinderException
     */
    public function isSlackChannelEnabled(string $channel): bool {
        $enabled = false;
        // check global Slack status
        if((bool)Config::getPathfinderData('slack.status')){
            // check global map default config for this channel
            switch($channel){
                case 'slackChannelHistory': $defaultMapConfigKey = 'send_history_slack_enabled'; break;
                case 'slackChannelRally': $defaultMapConfigKey = 'send_rally_slack_enabled'; break;
                default: throw new PathfinderException(sprintf(self::ERROR_SLACK_CHANNEL, $channel));
            }

            if((bool) Config::getMapsDefaultConfig($this->typeId->name)[$defaultMapConfigKey]){
                $config = $this->getSlackWebHookConfig($channel);
                if($config->slackWebHookURL && $config->slackChannel){
                    $enabled = true;
                }
            }
        }

        return $enabled;
    }

    /**
     * check if "Discord WebHook" is enabled for this map type
     * @param string $channel
     * @return bool
     * @throws PathfinderException
     */
    public function isDiscordChannelEnabled(string $channel): bool {
        $enabled = false;
        // check global Slack status
        if((bool)Config::getPathfinderData('discord.status')){
            // check global map default config for this channel
            switch($channel){
                case 'discordWebHookURLHistory': $defaultMapConfigKey = 'send_history_discord_enabled'; break;
                case 'discordWebHookURLRally': $defaultMapConfigKey = 'send_rally_discord_enabled'; break;
                default: throw new PathfinderException(sprintf(self::ERROR_DISCORD_CHANNEL, $channel));
            }

            if((bool) Config::getMapsDefaultConfig($this->typeId->name)[$defaultMapConfigKey]){
                $config = $this->getDiscordWebHookConfig($channel);
                if($config->slackWebHookURL){
                    $enabled = true;
                }
            }
        }

        return $enabled;
    }

    /**
     * check if "E-Mail" Log is enabled for this map
     * @param string $type
     * @return bool
     * @throws PathfinderException
     */
    public function isMailSendEnabled(string $type): bool{
        $enabled = false;
        if((bool) Config::getMapsDefaultConfig($this->typeId->name)['send_rally_mail_enabled']){
            $enabled = Config::isValidSMTPConfig($this->getSMTPConfig($type));
        }

        return $enabled;
    }

    /**
     * get config for stream logging
     * @param bool $abs absolute path
     * @return \stdClass
     */
    public function getStreamConfig(bool $abs = false): \stdClass{
        $config = (object) [];
        $config->stream = '';
        if( $this->getF3()->exists('PATHFINDER.HISTORY.LOG', $dir) ){
            $config->stream .= $abs ? $this->getF3()->get('ROOT') . '/' : './';
            $config->stream .= $dir . 'map/map_' . $this->_id . '.log';
            $config->stream = $this->getF3()->fixslashes($config->stream);
        }
        return $config;
    }

    /**
     * get config for Socket connection (e.g. where to send log data)
     * @return \stdClass
     */
    public function getSocketConfig(): \stdClass{
        $config = (object) [];
        $config->uri = Config::getSocketUri();
        $config->streamConf = $this->getStreamConfig(true);
        return $config;
    }

    /**
     * get Config for Slack WebHook cURL calls
     * -> https://api.slack.com/incoming-webhooks
     * @param string $channel
     * @return \stdClass
     */
    public function getSlackWebHookConfig(string $channel = ''): \stdClass{
        $config = (object) [];
        $config->slackWebHookURL = $this->slackWebHookURL;
        $config->slackUsername = $this->slackUsername;
        $config->slackIcon = $this->slackIcon;
        if($channel && $this->exists($channel) && !empty($this->$channel)){
            $config->slackChannel = $this->$channel;
        }
        return $config;
    }

    /**
     * get Config for Discord WebHook cURL calls
     * @param string $channel
     * @return \stdClass
     */
    public function getDiscordWebHookConfig(string $channel = ''): \stdClass {
        $config = (object) [];
        $config->slackUsername = $this->discordUsername;
        if($channel && $this->exists($channel) && !empty($this->$channel)){
            $config->slackWebHookURL = $this->$channel . '/slack';
        }
        return $config;
    }

    /**
     * get Config for SMTP connection and recipient address
     * @param string $type
     * @param bool $addJson
     * @return \stdClass
     * @throws PathfinderException
     */
    public function getSMTPConfig(string $type, bool $addJson = true): \stdClass{
        $config = Config::getSMTPConfig();
        $config->to = Config::getNotificationMail($type);
        $config->addJson = $addJson;
        return $config;
    }

    /**
     * checks whether this map is private map
     * @return bool
     */
    public function isPrivate(){
        return ($this->typeId->id === 2);
    }

    /**
     * checks whether this map is corporation map
     * @return bool
     */
    public function isCorporation(){
        return ($this->typeId->id === 3);
    }

    /**
     * checks whether this map is alliance map
     * @return bool
     */
    public function isAlliance(){
        return ($this->typeId->id === 4);
    }

    /**
     *
     * @return mixed|null
     */
    public function getScope(){
        $scope = null;
        if( $this->scopeId->isActive() ){
            $scope = $this->scopeId;
        }
        return $scope;
    }

    /**
     * get log file data
     * @param int $offset
     * @param int $limit
     * @return array
     */
    public function getLogData(int $offset = FileHandler::LOG_FILE_OFFSET, int $limit = FileHandler::LOG_FILE_LIMIT): array {
        $streamConf = $this->getStreamConfig();
        return FileHandler::readLogFile($streamConf->stream, $offset, $limit, $this->getLogFormatter());
    }

    /**
     * save a system to this map
     * @param SystemModel $system
     * @param CharacterModel $character
     * @param int $posX
     * @param int $posY
     * @return false|ConnectionModel
     */
    public function saveSystem( SystemModel $system, CharacterModel $character, $posX = 10, $posY = 0){
        $system->setActive(true);
        $system->mapId = $this->id;
        $system->posX = $posX;
        $system->posY = $posY;
        return $system->save($character);
    }

    /**
     * search for a connection by (source -> target) system ids
     * -> this also searches the revers way (target -> source)
     * @param SystemModel $sourceSystem
     * @param SystemModel $targetSystem
     * @return ConnectionModel|null
     */
    public function searchConnection(SystemModel $sourceSystem, SystemModel $targetSystem){
        // check if both systems belong to this map
        if(
            $sourceSystem->get('mapId', true) === $this->id &&
            $targetSystem->get('mapId', true) === $this->id
        ){
            $this->filter('connections', [
                'active = :active AND
            (
                (
                    source = :sourceId AND
                    target = :targetId
                ) OR (
                    source = :targetId AND
                    target = :sourceId
                )
            )',
                ':active' => 1,
                ':sourceId' => $sourceSystem->id,
                ':targetId' => $targetSystem->id,
            ], ['limit'=> 1]);

            return ($this->connections) ? reset($this->connections) : null;
        }else{
            return null;
        }
    }

    /**
     * save new connection
     * -> connection scope/type is automatically added
     * @param ConnectionModel $connection
     * @param CharacterModel $character
     * @return false|ConnectionModel
     */
    public function saveConnection(ConnectionModel $connection, CharacterModel $character){
        $connection->mapId = $this;
        return $connection->save($character);
    }

    /**
     * delete existing log file
     */
    protected function deleteLogFile(){
        $config = $this->getStreamConfig();
        if(is_file($config->stream)){
            // try to set write access
            if(!is_writable($config->stream)){
                chmod($config->stream, 0666);
            }
            @unlink($config->stream);
        }
    }

    /**
     * get all active characters (with active log)
     * grouped by systems
     * @return \stdClass
     * @throws PathfinderException
     * @throws \Exception
     */
    public function getUserData(){

        // get systems for this map
        // the getData() function is cached. So this is more suitable than getSystems();
        $mapDataAll = $this->getData();

        // get data of characters which have with map access
        $activeUserCharactersData = $this->getCharactersData(['hasLog' => true]);

        // sort characters by "active" status
        $sortByActiveLog = function($a, $b){
            if($a->log->active == $b->log->active){
                return 0;
            }else{
                return ($a->log->active && !$b->log->active) ? 0 : 1;
            }
        };

        $mapUserData = (object)[];
        $mapUserData->config = (object)[];
        $mapUserData->config->id = $this->id;
        $mapUserData->data = (object)[];
        $mapUserData->data->systems = [];
        foreach($mapDataAll->systems as $systemData){
            $systemUserData = (object)[];
            $systemUserData->id = $systemData->systemId;
            $systemUserData->user = [];

            // check if a system has active characters
            foreach($activeUserCharactersData as $key => $activeUserCharacterData){

                if(isset($activeUserCharacterData->log)){
                    // user as log data
                    if($activeUserCharacterData->log->system->id == $systemData->systemId){
                        $systemUserData->user[] = $activeUserCharacterData;

                        // remove user from array -> speed up looping over characters.
                        // each userCharacter can only be active in a SINGLE system
                        unset($activeUserCharactersData[$key]);
                    }
                }else{
                    // character has NO log data. If its an corp/ally map not each member is active
                    // -> character is not relevant for this function!
                    unset($activeUserCharactersData[$key]);
                }
            }

            // add system if active users were found
            if(count($systemUserData->user) > 0){
                usort($systemUserData->user, $sortByActiveLog);
                $mapUserData->data->systems[] = $systemUserData;
            }
        }

        return $mapUserData;
    }

    /**
     * @param CharacterModel|null $characterModel
     * @return false|MapModel
     */
    public function save(CharacterModel $characterModel = null){
        /**
         * @var $mapModel MapModel
         */
        $mapModel = parent::save($characterModel);

        // check if map type has changed and clear access objects
        if( !$mapModel->dry() ){
            if( $mapModel->isPrivate() ){
                $mapModel->clearAccess(['corporation', 'alliance']);
            }elseif( $mapModel->isCorporation() ){
                $mapModel->clearAccess(['character', 'alliance']);
            }elseif( $mapModel->isAlliance() ){
                $mapModel->clearAccess(['character', 'corporation']);
            }
        }

        return $mapModel;
    }

    /**
     * get all maps
     * @param array $mapIds
     * @param array $options
     * @return \DB\CortexCollection
     */
    public static function getAll($mapIds = [], $options = []){
        $query = [
            'id IN :mapIds',
            ':mapIds' => $mapIds
        ];
        if( !$options['addInactive'] ){
            $query[0] .= ' AND active = :active';
            $query[':active'] = 1;
        }

        return (new self())->find($query);
    }
}
