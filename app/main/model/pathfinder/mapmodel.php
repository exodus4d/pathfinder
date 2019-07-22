<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 22:10
 */

namespace Model\Pathfinder;

use DB\CortexCollection;
use DB\SQL\Schema;
use data\file\FileHandler;
use Exception\ConfigException;
use lib\Config;
use lib\logging;

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
            'belongs-to-one' => 'Model\Pathfinder\MapScopeModel',
            'constraint' => [
                [
                    'table' => 'map_scope',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry',
            'activity-log' => true
        ],
        'typeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\MapTypeModel',
            'constraint' => [
                [
                    'table' => 'map_type',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry',
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
        'persistentSignatures' => [
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
            'has-many' => ['Model\Pathfinder\SystemModel', 'mapId']
        ],
        'connections' => [
            'has-many' => ['Model\Pathfinder\ConnectionModel', 'mapId']
        ],
        'mapCharacters' => [
            'has-many' => ['Model\Pathfinder\CharacterMapModel', 'mapId']
        ],
        'mapCorporations' => [
            'has-many' => ['Model\Pathfinder\CorporationMapModel', 'mapId']
        ],
        'mapAlliances' => [
            'has-many' => ['Model\Pathfinder\AllianceMapModel', 'mapId']
        ]
    ];

    /**
     * set data by associative array
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
     * get data
     * -> this includes system and connection data as well
     * @return \stdClass
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
            $mapData->persistentSignatures                  = $this->persistentSignatures;

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
            }elseif($this->isCorporation()){
                $corporations = $this->getCorporations();
                $corporationData = [];

                foreach($corporations as $corporation){
                    $corporationData[] = $corporation->getData();
                }
                $mapData->access->corporation = $corporationData;
            }elseif($this->isAlliance()){
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
            $mapDataAll->systems = $this->getSystemsData();

            // map connection data ------------------------------------------------------------------------------------
            $mapDataAll->connections = $this->getConnectionsData();

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
    protected function validate_name(string $key, string $val) : bool {
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
    protected function validate_slackWebHookURL(string $key, string $val) : bool {
        return $this->validate_WebHookURL($key, $val, 'slack');
    }

    /**
     * validate Discord History WebHook URL
     * @param string $key
     * @param string $val
     * @return bool
     * @throws \Exception\ValidationException
     */
    protected function validate_discordWebHookURLHistory(string $key, string $val) : bool {
        return $this->validate_WebHookURL($key, $val, 'discord');
    }

    /**
     * validate Discord Rally WebHook URL
     * @param string $key
     * @param string $val
     * @return bool
     * @throws \Exception\ValidationException
     */
    protected function validate_discordWebHookURLRally(string $key, string $val) : bool {
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
    protected function validate_WebHookURL(string $key, string $val, string $type) : bool {
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
    public function getNewSystem(int $systemId) : SystemModel {
        // check for "inactive" system
        $system = $this->getSystemByCCPId($systemId);
        if(is_null($system)){
            /**
             * NO ->rel() here! we work with unsaved models
             * @var $system SystemModel
             */
            $system = self::getNew('SystemModel');
            $system->systemId = $systemId;
            $system->mapId = $this;
            $system->setType();
        }

        $system->setActive(true);

        return $system;
    }

    /**
     * get blank connection model for given source/target systems
     * @param SystemModel $sourceSystem
     * @param SystemModel $targetSystem
     * @return ConnectionModel
     * @throws \Exception
     */
    public function getNewConnection(SystemModel $sourceSystem, SystemModel $targetSystem) : ConnectionModel {
        /**
         * @var $connection ConnectionModel
         */
        $connection = self::getNew('ConnectionModel');
        $connection->mapId = $this;
        $connection->source = $sourceSystem;
        $connection->target = $targetSystem;
        return $connection;
    }

    /**
     * search for a system by id
     * @param int $id
     * @return SystemModel|null
     */
    public function getSystemById(int $id) : ?SystemModel {
        /**
         * @var $system SystemModel
         */
        $system = $this->rel('systems');
        $system->filterRel();

        $filters = [
            self::getFilter('id', $id),
            self::getFilter('mapId', $this->_id),
            self::getFilter('active', true)
        ];

        return $system->findone($this->mergeFilter($filters)) ? : null;
    }

    /**
     * search for a system by CCPs systemId
     * -> "active" column is NOT checked
     * -> removed systems become "active" = 0
     * @param int $systemId
     * @param array $addFilters
     * @return SystemModel|null
     */
    public function getSystemByCCPId(int $systemId, array $addFilters = []) : ?SystemModel {
        /**
         * @var $system SystemModel
         */
        $system = $this->rel('systems');
        $system->filterRel();

        $filters = [
            self::getFilter('systemId', $systemId),
            self::getFilter('mapId', $this->_id)
        ];

        // add optional filter -> e.g. search for "active = 1" system
        foreach($addFilters as $filter){
            $filters[] = $filter;
        }

        return $system->findone($this->mergeFilter($filters)) ? : null;
    }

    /**
     * get either all system models in this map
     * @return SystemModel[]
     */
    protected function getSystems(){
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
    public function getSystemsData() : array{
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
     * @return ConnectionModel|null
     */
    public function getConnectionById(int $id) : ?ConnectionModel {
        /**
         * @var $connection ConnectionModel
         */
        $connection = $this->rel('connections');
        $connection->filterRel();

        $filters = [
            self::getFilter('id', $id),
            self::getFilter('mapId', $this->_id),
            self::getFilter('active', true)
        ];

        return $connection->findone($this->mergeFilter($filters)) ? : null;
    }

    /**
     * get connections in this map
     * -> $connectionIds can be used for filter
     * @param null $connectionIds
     * @param string $scope
     * @return CortexCollection|array
     */
    public function getConnections($connectionIds = null, $scope = ''){
        $filters = [
            self::getFilter('source', 0, '>'),
            self::getFilter('target', 0, '>')
        ];

        if(!empty($scope)){
            $filters[] = self::getFilter('scope', $scope);
        }

        if(!empty($connectionIds)){
            $filters[] = self::getFilter('id', $connectionIds, 'IN');
        }

        return $this->relFind('connections', $this->mergeFilter($filters)) ? : [];
    }

    /**
     * get all connection data in this map
     * @return \stdClass[]
     */
    public function getConnectionsData() : array {
        $connectionData = [];
        $connections  = $this->getConnections();

        foreach($connections as $connection){
            /**
             * @var $connection ConnectionModel
             */
            $connectionData[] = $connection->getData(true);
        }

        return $connectionData;
    }

    /**
     * get all structures data for this map
     * @param array $systemIds
     * @return array
     */
    public function getStructuresData(array $systemIds = []) : array {
        $structuresData = [];
        $corporations = $this->getAllCorporations();

        foreach($corporations as $corporation){
            // corporations should be unique
            if( !isset($structuresData[$corporation->_id]) ){
                // get all structures for current corporation
                $corporationStructuresData = $corporation->getStructuresData($systemIds);
                if( !empty($corporationStructuresData) ){
                    // corporation has structures
                    $structuresData[$corporation->_id] = [
                        'id' => $corporation->_id,
                        'name' => $corporation->name,
                        'structures' => $corporationStructuresData
                    ];
                }
            }
        }

        return $structuresData;
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
                $characterMap->characterId = $obj;
                $characterMap->mapId = $this;
                $characterMap->save();

                $newAccessGranted = true;
            }
        }elseif($obj instanceof CorporationModel){

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
        }elseif($obj instanceof AllianceModel){

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
     */
    public function hasAccess(CharacterModel $characterModel) : bool {
        $hasAccess = false;

        if($this->valid()){
            // get all maps the user has access to
            // this includes corporation and alliance maps
            foreach($characterModel->getMaps() as $map){
                if($map->_id === $this->_id){
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
     * get corporations that have access to this map
     * @return CorporationModel[]
     */
    public function getCorporations() : array {
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
     * get alliances that have access to this map
     * @return AllianceModel[]
     */
    public function getAlliances() : array {
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
     * get all character models that are currently online "viewing" this map
     * @param array $options filter options
     * @return CharacterModel[]
     */
    private function getAllCharacters($options = []) : array {
        $characters = [];

        if($this->isPrivate()){
            // add active character for each user
            foreach($this->getCharacters() as $character){
                $characters[] = $character;
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
     * get all corporations that have access
     * -> for private maps -> get corporations from characters
     * -> for corporation maps -> get corporations
     * -> for alliance maps -> get corporations from alliances
     * @return CorporationModel[]
     */
    public function getAllCorporations() : array {
        $corporations = [];

        if($this->isPrivate()){
            foreach($this->getCharacters() as $character){
                if(
                    $character->hasCorporation() &&
                    !array_key_exists($character->get('corporationId', true), $corporations)
                ){
                    $corporations[$character->getCorporation()->_id] = $character->getCorporation();
                }
            }
        }elseif($this->isCorporation()){
            $corporations = $this->getCorporations();
        }elseif($this->isAlliance()){
            foreach($this->getAlliances() as $alliance){
                foreach($alliance->getCharacters() as $character){
                    if(
                        $character->hasCorporation() &&
                        !array_key_exists($character->get('corporationId', true), $corporations)
                    ){
                        $corporations[$character->getCorporation()->_id] = $character->getCorporation();
                    }
                }
            }
        }

        return $corporations;
    }

    /**
     * @param string $action
     * @return logging\LogInterface
     * @throws ConfigException
     */
    public function newLog(string $action = '') : Logging\LogInterface{
        $logChannelData = $this->getLogChannelData();
        $logObjectData = $this->getLogObjectData();
        $log = (new logging\MapLog($action, $logChannelData))->setTempData($logObjectData);

        // update map history *.log files -----------------------------------------------------------------------------
        if($this->isHistoryLogEnabled()){
            // check socket config
            if(Config::validSocketConnect(Config::getSocketUri())){
                $log->addHandler('socket', 'json', $this->getSocketConfig());
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
    public function getMap() : MapModel{
        return $this;
    }

    /**
     * get object relevant data for model log channel
     * @return array
     */
    public function getLogChannelData() : array {
        return [
            'channelId' => $this->_id,
            'channelName' => $this->name
        ];
    }
    /**
     * get object relevant data for model log object
     * @return array
     */
    public function getLogObjectData() : array {
        return [
            'objId' => $this->_id,
            'objName' => $this->name
        ];
    }

    /**
     * map log formatter callback
     * @return \Closure
     */
    protected function getLogFormatter(){
        return function(&$rowDataObj){
            unset($rowDataObj['extra']);
        };
    }

    /**
     * check if "activity logging" is enabled for this map type
     * @return bool
     */
    public function isActivityLogEnabled() : bool {
        return $this->logActivity && (bool) Config::getMapsDefaultConfig($this->typeId->name)['log_activity_enabled'];
    }

    /**
     * check if "history logging" is enabled for this map type
     * @return bool
     */
    public function isHistoryLogEnabled() : bool {
        return $this->logHistory && (bool) Config::getMapsDefaultConfig($this->typeId->name)['log_history_enabled'];
    }

    /**
     * check if "Slack WebHook" is enabled for this map type
     * @param string $channel
     * @return bool
     * @throws ConfigException
     */
    public function isSlackChannelEnabled(string $channel) : bool {
        $enabled = false;
        // check global Slack status
        if((bool)Config::getPathfinderData('slack.status')){
            // check global map default config for this channel
            switch($channel){
                case 'slackChannelHistory': $defaultMapConfigKey = 'send_history_slack_enabled'; break;
                case 'slackChannelRally': $defaultMapConfigKey = 'send_rally_slack_enabled'; break;
                default: throw new ConfigException(sprintf(self::ERROR_SLACK_CHANNEL, $channel));
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
     * @throws ConfigException
     */
    public function isDiscordChannelEnabled(string $channel) : bool {
        $enabled = false;
        // check global Slack status
        if((bool)Config::getPathfinderData('discord.status')){
            // check global map default config for this channel
            switch($channel){
                case 'discordWebHookURLHistory': $defaultMapConfigKey = 'send_history_discord_enabled'; break;
                case 'discordWebHookURLRally': $defaultMapConfigKey = 'send_rally_discord_enabled'; break;
                default: throw new ConfigException(sprintf(self::ERROR_DISCORD_CHANNEL, $channel));
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
     */
    public function isMailSendEnabled(string $type) : bool{
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
    public function getStreamConfig(bool $abs = false) : \stdClass{
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
    public function getSocketConfig() : \stdClass{
        $config = (object) [];
        $config->dsn = Config::getSocketUri();
        $config->streamConf = $this->getStreamConfig(true);
        return $config;
    }

    /**
     * get Config for Slack WebHook cURL calls
     * -> https://api.slack.com/incoming-webhooks
     * @param string $channel
     * @return \stdClass
     */
    public function getSlackWebHookConfig(string $channel = '') : \stdClass{
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
    public function getDiscordWebHookConfig(string $channel = '') : \stdClass {
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
     */
    public function getSMTPConfig(string $type, bool $addJson = true) : \stdClass {
        $config = Config::getSMTPConfig();
        $config->to = Config::getNotificationMail($type);
        $config->addJson = $addJson;
        return $config;
    }

    /**
     * checks whether this map is private map
     * @return bool
     */
    public function isPrivate() : bool {
        return ($this->typeId->id === 2);
    }

    /**
     * checks whether this map is corporation map
     * @return bool
     */
    public function isCorporation() : bool {
        return ($this->typeId->id === 3);
    }

    /**
     * checks whether this map is alliance map
     * @return bool
     */
    public function isAlliance() : bool {
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
     * get deeplink url for map
     * -> optional return link for map + system
     * @param int $systemId
     * @return string
     */
    public function getDeeplinkUrl(int $systemId = 0) : string {
        $url = '';
        if( !$this->dry() ){
            $param =  rawurlencode(base64_encode($this->_id));
            $param .=  $systemId ? '_' . rawurlencode(base64_encode($systemId)) : '';
            $url = $this->getF3()->get('SCHEME') . '://' . $this->getF3()->get('HOST') . $this->getF3()->alias('map', ['*' => '/' . $param]);
        }
        return $url;
    }

    /**
     * get log file data
     * @param int $offset
     * @param int $limit
     * @return array
     */
    public function getLogData(int $offset = FileHandler::LOG_FILE_OFFSET, int $limit = FileHandler::LOG_FILE_LIMIT) : array {
        $streamConf = $this->getStreamConfig();

        $rowFormatter = $this->getLogFormatter();
        $rowParser = function(string &$rowData, array &$data) use ($rowFormatter){
            if( !empty($rowDataObj = (array)json_decode($rowData, true)) ){
                $rowFormatter($rowDataObj);
                $data[] = $rowDataObj;
            }
        };

        return FileHandler::instance()->readFileReverse($streamConf->stream, $offset, $limit, $rowParser);
    }

    /**
     * save a system to this map
     * @param SystemModel $system
     * @param CharacterModel $character
     * @param int $posX
     * @param int $posY
     * @return false|ConnectionModel
     */
    public function saveSystem(SystemModel $system, CharacterModel $character, $posX = 10, $posY = 0){
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
    public function searchConnection(SystemModel $sourceSystem, SystemModel $targetSystem) : ?ConnectionModel {
        $connection = null;

        // check if both systems belong to this map
        if(
            $sourceSystem->get('mapId', true) === $this->_id &&
            $targetSystem->get('mapId', true) === $this->_id
        ){
            $filter = $this->mergeFilter([
                $this->mergeFilter([self::getFilter('source', $sourceSystem->id, '=', 'A'), self::getFilter('target', $targetSystem->id, '=', 'A')]),
                $this->mergeFilter([self::getFilter('source', $targetSystem->id, '=', 'B'), self::getFilter('target', $sourceSystem->id, '=', 'B')])
            ], 'or');

            $connection = $this->relFindOne('connections', $filter);
        }

        return $connection;
    }

    /**
     * @see parent
     */
    public function filterRel() : void {
        $this->filter('connections', self::getFilter('active', true));
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
     * @return false|ConnectionModel|MapModel
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
     * @return CortexCollection
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
