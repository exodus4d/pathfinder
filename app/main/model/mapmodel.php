<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 22:10
 */

namespace Model;

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
        'mapUsers' => [
            'has-many' => ['Model\UserMapModel', 'mapId']
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
     * @return array
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
                $users = $this->getUsers();
                $userData = [];
                foreach($users as $user){
                    $userData[] = $user->getSimpleData();
                }
                $mapData->access->user = $userData;
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
     * search for a system by id
     * @param $systemId
     * @return null
     */
    public function getSystem($systemId){
        $searchSystem = null;

        if($systemId > 0){
            $systems = $this->getSystems();
            foreach($systems as $system){
                if($system->id == $systemId){
                    $searchSystem = $system;
                    break;
                }
            }
        }

        return $searchSystem;
    }

    /**
     * get all system models in this map
     * @return array|mixed
     */
    public function getSystems(){
        // orderBy x-Coordinate for cleaner frontend animation (left to right)
        $this->filter('systems',
            ['active = :active AND id > 0',
                ':active' => 1
        ],
            ['order' => 'posX']);

        $systems = [];
        if($this->systems){
            $systems = $this->systems;
        }

        return $systems;
    }

    /**
     * get all system data for all systems in this map
     * @return array
     */
    public function getSystemData(){

        $systems  = $this->getSystems();

        $systemData = [];
        foreach($systems as $system){
            $systemData[] = $system->getData();
        }

        return $systemData;
    }

    /**
     * get all connections in this map
     * @return array|mixed
     */
    public function getConnections(){
        $this->filter('connections', [
            'active = :active AND source > 0 AND target > 0',
            ':active' => 1
        ]);

        $connections = [];
        if($this->connections){
            $connections = $this->connections;
        }

        return $connections;
    }

    /**
     * get all connection data in this map
     * @return array
     */
    public function getConnectionData(){
        $connections  = $this->getConnections();

        $connectionData = [];
        foreach($connections as $connection){
            $connectionData[] = $connection->getData();
        }

        return $connectionData;
    }

    /**
     * set map access for an object (user, corporation or alliance)
     * @param $obj
     */
    public function setAccess($obj){

        $newAccessGranted = false;

        if($obj instanceof UserModel){
            // private map

            // check whether the user has already map access
            $this->has('mapUsers', ['active = 1 AND userId = :userId', ':userId' => $obj->id]);
            $result = $this->findone(['id = :id', ':id' => $this->id]);

            if($result === false){
                // grant access for the user
                $userMap = self::getNew('UserMapModel');
                $userMap->userId = $obj;
                $userMap->mapId = $this;
                $userMap->save();

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
     * @param $clearKeys
     */
    public function clearAccess($clearKeys = ['user', 'corporation', 'alliance']){

        foreach($clearKeys as $key){
            switch($key){
                case 'user':
                    foreach((array)$this->mapUsers as $obj){
                        $obj->erase();
                    };
                    break;
                case 'corporation':
                    foreach((array)$this->mapCorporations as $obj){
                        $obj->erase();
                    };
                    break;
                case 'alliance':
                    foreach((array)$this->mapAlliances as $obj){
                        $obj->erase();
                    };
                    break;
            }
        }
    }

    /**
     * checks weather a user has access to this map or not
     * @param $user
     * @return bool
     */
    public function hasAccess($user){
        $hasAccess = false;

        if(
            !$this->dry() &&
            $user instanceof UserModel
        ){

            // get all maps the user has access to
            // this includes corporation and alliance maps
            $maps = $user->getMaps();

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
     * get all user models that have access to this map
     * note: This function is just for "private" maps
     * @return array
     */
    public function getUsers(){
        $users = [];

        if($this->isPrivate()){
            $this->filter('mapUsers', ['active = ?', 1]);

            if($this->mapUsers){
                foreach($this->mapUsers as $mapUser){
                    $users[] = $mapUser->userId;
                }
            }
        }

        return $users;
    }

    /**
     * get all character models that are currently online "viewing" this map
     * @return array
     */
    private function getCharacters(){
        $characters = [];

        if($this->isPrivate()){
            $users = $this->getUsers();

            foreach($users as $user){
                // get all active character logs for a user
                $tempActiveUserCharacters = $user->getActiveUserCharacters();

                foreach($tempActiveUserCharacters as $tempActiveUserCharacter){
                    $characters[] = $tempActiveUserCharacter;
                }
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
     * @return array
     */
    private function getCharactersData(){

        // check if there is cached data
        $charactersData = $this->getCacheData('CHARACTERS');

        if(is_null($charactersData)){
            $charactersData = [];
            $characters = $this->getCharacters();

            foreach($characters as $character){
                $charactersData[] = $character->getData(true);
            }

            // cache active characters (if found)
            if(!empty($charactersData)){
                $this->updateCacheData($charactersData, 'CHARACTERS', 10);
            }
        }

        return $charactersData;
    }

    /**
     * get all corporations that have access to this map
     * @return array
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
     * @return array
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
     * @param $accessObject
     */
    public function delete($accessObject){

        if(!$this->dry()){
            // check if editor has access
            if($this->hasAccess($accessObject)){
                // all map related tables will be deleted on cascade

                // delete map
                $this->erase();
            }
        }
    }

    /**
     * checks weather this map is private map
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
     * checks weather this map is corporation map
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
     * checks weather this map is alliance map
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
     * get all active characters (with active log)
     * grouped by systems
     * @return object
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
                $mapModel->clearAccess(['user', 'alliance']);
            }elseif( $mapModel->isAlliance() ){
                $mapModel->clearAccess(['user', 'corporation']);
            }
        }

        return $mapModel;
    }

}
