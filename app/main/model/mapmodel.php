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

class MapModel extends BasicModel {

    protected $table = 'map';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true,
            'after' => 'updated'
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
            ]
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
            ]
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'icon' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
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

    protected $validate = [
        'name' => [
            'length' => [
                'min' => 3
            ]
        ],
        'icon' => [
            'length' => [
                'min' => 3
            ]
        ],
        'scopeId' => [
            'regex' => '/^[1-9]+$/'
        ],
        'typeId' => [
            'regex' => '/^[1-9]+$/'
        ]
    ];

    /**
     * set map data by an associative array
     * @param $data
     */
    public function setData($data){

        foreach((array)$data as $key => $value){

            if($key == 'created'){
                continue;
            }

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
     */
    public function getData(){
        // check if there is cached data
        $mapDataAll = $this->getCacheData();

        if(is_null($mapDataAll)){
            // no cached map data found

            $mapData = (object) [];
            $mapData->id = $this->id;
            $mapData->name = $this->name;
            $mapData->icon = $this->icon;
            $mapData->created = strtotime($this->created);
            $mapData->updated = strtotime($this->updated);

            // map scope
            $mapData->scope = (object) [];
            $mapData->scope->id = $this->scopeId->id;
            $mapData->scope->name = $this->scopeId->name;
            $mapData->scope->label = $this->scopeId->label;

            // map type
            $mapData->type = (object) [];
            $mapData->type->id = $this->typeId->id;
            $mapData->type->name = $this->typeId->name;
            $mapData->type->classTab = $this->typeId->classTab;

            // map access
            $mapData->access = (object) [];
            $mapData->access->user = [];
            $mapData->access->corporation = [];
            $mapData->access->alliance = [];

            // get access object data -------------------------------------
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

            // merge all data ---------------------------------------------
            $mapDataAll = (object) [];
            $mapDataAll->mapData = $mapData;

            // map system data --------------------------------------------
            $mapDataAll->systems = $this->getSystemData();

            // map connection data ----------------------------------------
            $mapDataAll->connections = $this->getConnectionData();

            // max caching time for a map
            // the cached date has to be cleared manually on any change
            // this includes system, connection,... changes (all dependencies)
            $this->updateCacheData($mapDataAll, '', 300);
        }

        return $mapDataAll;
    }

    /**
     * get blank system model pre-filled with default SDE data
     * -> check for "inactive" systems on this map first!
     * @param int $systemId
     * @return SystemModel
     */
    public function getNewSystem($systemId){
        // check for "inactive" system
        $system = $this->getSystemByCCPId($systemId);
        if( is_null($system) ){
            // get blank system
            $systemController = new System();
            $systems = $systemController->getSystemModelByIds([$systemId]);
            $system = reset($systems);
            $system->mapId = $this->_id;
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
     * get all connections in this map
     * @return ConnectionModel[]
     */
    public function getConnections(){
        $connections = [];

        $this->filter('connections', [
            'active = :active AND source > 0 AND target > 0',
            ':active' => 1
        ]);

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

            // check whether the corporation already has map access
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

        $this->filter('mapCharacters', ['active = ?', 1]);

        if($this->mapCharacters){
            foreach($this->mapCharacters as $characterMapModel){
                $characters[] = $characterMapModel->characterId;
            }
        }

        return $characters;
    }

    /**
     * get all character models that are currently online "viewing" this map
     * @return CharacterModel[]
     */
    private function getActiveCharacters(){
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
                $characters = array_merge($characters, $corporation->getCharacters());
            }
        }elseif($this->isAlliance()){
            $alliances = $this->getAlliances();

            foreach($alliances as $alliance){
                $characters = array_merge($characters, $alliance->getCharacters());
            }
        }

        return $characters;
    }

    /**
     * get data for all characters that are currently online "viewing" this map
     * -> the result of this function is cached!
     * @return \stdClass[]
     */
    private function getCharactersData(){
        // check if there is cached data
        $charactersData = $this->getCacheData('CHARACTERS');

        if(is_null($charactersData)){
            $charactersData = [];
            $characters = $this->getActiveCharacters();

            foreach($characters as $character){
                $charactersData[] = $character->getData(true);
            }

            // cache active characters (if found)
            if(!empty($charactersData)){
                $this->updateCacheData($charactersData, 'CHARACTERS', 5);
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
     * delete this map and all dependencies
     * @param CharacterModel $characterModel
     */
    public function delete(CharacterModel $characterModel){
        if( !$this->dry() ){
            // check if character has access
            if($this->hasAccess($characterModel)){
                // all map related tables will be deleted on cascade
                $this->erase();
            }
        }
    }

    /**
     * check if "activity logging" is enabled for this map type
     * @return bool
     */
    public function isActivityLogEnabled(){
        $f3 = self::getF3();
        $activityLogEnabled = false;

        if( $this->isAlliance() ){
            if( $f3->get('PATHFINDER.MAP.ALLIANCE.ACTIVITY_LOGGING') ){
                $activityLogEnabled = true;
            }
        }elseif( $this->isCorporation() ){
            if( $f3->get('PATHFINDER.MAP.CORPORATION.ACTIVITY_LOGGING') ){
                $activityLogEnabled = true;
            }
        }elseif( $this->isPrivate() ){
            if( $f3->get('PATHFINDER.MAP.PRIVATE.ACTIVITY_LOGGING') ){
                $activityLogEnabled = true;
            }
        }

        return $activityLogEnabled;
    }

    /**
     * checks whether this map is private map
     * @return bool
     */
    public function isPrivate(){
        $isPrivate = false;

        if($this->typeId->id == 2){
            $isPrivate = true;
        }

        return $isPrivate;
    }

    /**
     * checks whether this map is corporation map
     * @return bool
     */
    public function isCorporation(){
        $isCorporation = false;

        if($this->typeId->id == 3){
            $isCorporation = true;
        }

        return $isCorporation;
    }

    /**
     * checks whether this map is alliance map
     * @return bool
     */
    public function isAlliance(){
        $isAlliance = false;

        if($this->typeId->id == 4){
            $isAlliance = true;
        }

        return $isAlliance;
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
     * save a system to this map
     * @param SystemModel $system
     * @param int $posX
     * @param int $posY
     * @param null|CharacterModel $character
     * @return mixed
     */
    public function saveSystem( SystemModel $system, $posX = 10, $posY = 0, $character = null){
        $system->setActive(true);
        $system->mapId = $this->id;
        $system->posX = $posX;
        $system->posY = $posY;
        $system->createdCharacterId = $character;
        $system->updatedCharacterId = $character;
        return $system->save();
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
     * @return false|ConnectionModel
     */
    public function saveConnection(ConnectionModel $connection){
        $connection->mapId = $this;
        return $connection->save();
    }

    /**
     * get all active characters (with active log)
     * grouped by systems
     * @return \stdClass
     */
    public function getUserData(){

        // get systems for this map
        // the getData() function is cached. So this is more suitable than getSystems();
        $mapDataAll = $this->getData();

        // get data of characters which have with map access
        $activeUserCharactersData = $this->getCharactersData();

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
                    // user has NO log data. If its an corp/ally map not each member is active
                    // user is not relevant for this function!
                    unset($activeUserCharactersData[$key]);
                }
            }

            // add system if active users were found
            if(count($systemUserData->user) > 0){
                $mapUserData->data->systems[] = $systemUserData;
            }
        }

        return $mapUserData;
    }

    /**
     * save a map
     * @return mixed
     */
    public function save(){

        $mapModel = parent::save();

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

}
