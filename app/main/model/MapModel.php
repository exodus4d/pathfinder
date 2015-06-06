<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 22:10
 */

namespace Model;


class MapModel extends BasicModel {

    protected $table = 'map';
    protected $ttl = 5;
    protected $rel_ttl = 5;

    protected $fieldConf = array(
        'scopeId' => array(
            'belongs-to-one' => 'Model\MapScopeModel'
        ),
        'typeId' => array(
            'belongs-to-one' => 'Model\MapTypeModel'
        ),
        'systems' => array(
            'has-many' => array('Model\SystemModel', 'mapId')
        ),
        'mapUsers' => array(
            'has-many' => array('Model\UserMapModel', 'mapId')
        ),
        'mapCorporations' => array(
            'has-many' => array('Model\CorporationMapModel', 'mapId')
        ),
        'mapAlliances' => array('has-many' => array(
            'Model\AllianceMapModel', 'mapId')
        )
    );

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

            if(!is_array($value)){
                if($this->exists($key)){
                    $this->$key = $value;
                }
            } else{
                // special array data
                if($key == 'scope'){
                    $this->scopeId = $value['id'];
                } elseif($key == 'type'){
                    $this->typeId = $value['id'];
                }
            }
        }
    }


    /**
     * get map data for for response
     * @return array
     */
    public function getData(){

        $mapData = ['id' => $this->id, 'name' => $this->name, 'scope' => ['id' => $this->scopeId->id, 'name' => $this->scopeId->name, 'label' => $this->scopeId->label], 'type' => ['id' => $this->typeId->id, 'name' => $this->typeId->name, 'classTab' => $this->typeId->classTab], 'icon' => $this->icon, 'updated' => strtotime($this->updated), 'access' => ['user' => [], 'corporation' => [], 'alliance' => []]];

        // get access object data -------------
        if($this->isPrivate()){
            $users = $this->getUsers();
            $userData = [];

            foreach($users as $user){
                $userData[] = $user->getSimpleData();
            }
            $mapData['access']['user'] = $userData;
        } elseif($this->isCorporation()){
            $corporations = $this->getCorporations();
            $corporationData = [];

            foreach($corporations as $corporation){
                $corporationData[] = $corporation->getData();
            }
            $mapData['access']['corporation'] = $corporationData;
        } elseif($this->isAlliance()){
            $alliances = $this->getAlliances();
            $allianceData = [];

            foreach($alliances as $alliance){
                $allianceData[] = $alliance->getData();
            }
            $mapData['access']['alliance'] = $allianceData;
        }

        return $mapData;
    }

    /**
     * get all system models for this map
     * @return array|mixed
     */
    public function getSystems(){
        $this->filter('systems', array('active = ?', 1));

        $systems = [];
        if($this->systems){
            $systems = $this->systems;
        }

        return $systems;
    }

    /**
     * search for a system by id
     * @param $systemId
     * @return null
     */
    public function getSystem($systemId){
        $systems = $this->getSystems();
        $searchSystem = null;
        foreach($systems as $system){
            if($system->id == $systemId){
                $searchSystem = $system;
                break;
            }
        }

        return $searchSystem;
    }

    /**
     * get all system data for all systems in this map
     * @return array
     */
    public function getSystemData(){
        $systems = $this->getRelatedModels('SystemModel', 'mapId', null, 5);

        $systemData = [];
        if(is_object($systems)){
            foreach($systems as $system){
                $systemData[] = $system->getData();
            }
        }

        return $systemData;
    }

    /**
     * get all connection data in this map
     * @return array
     */
    public function getConnectionData(){
        $connections = $this->getRelatedModels('ConnectionModel', 'mapId', null, 5);

        $connectionData = [];
        if(is_object($connections)){
            foreach($connections as $connection){
                $connectionData[] = $connection->getData();
            }
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

            // check whether the user already has map access
            $this->has('mapUsers', array('active = 1 AND userId = :userId', ':userId' => $obj->id));
            $result = $this->findone(array('id = :id', ':id' => $this->id));

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
            $this->has('mapCorporations', array('active = 1 AND corporationId = :corporationId', ':corporationId' => $obj->id));
            $result = $this->findone(array('id = :id', ':id' => $this->id));

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
            $this->has('mapAlliances', array('active = 1 AND allianceId = :allianceId', ':allianceId' => $obj->id));
            $result = $this->findone(array('id = :id', ':id' => $this->id));

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

        if($user instanceof UserModel){

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
     * @return array
     */
    public function getUsers(){
        $users = [];

        if($this->isPrivate()){
            $this->filter('mapUsers', array('active = ?', 1));

            if($this->mapUsers){
                foreach($this->mapUsers as $mapUser){
                    $users[] = $mapUser->userId;
                }
            }
        }

        return $users;
    }

    /**
     * get all corporations that have access to this map
     * @return array
     */
    public function getCorporations(){
        $corporations = [];

        if($this->isCorporation()){
            $this->filter('mapCorporations', array('active = ?', 1));

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
            $this->filter('mapAlliances', array('active = ?', 1));

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
     */
    public function delete($accessObject){

        if(!$this->dry()){
            // check if editor has access
            if($this->hasAccess($accessObject)){
                // get all userModels who have map access
                $userMaps = $this->getRelatedModels('UserMapModel', 'mapId');
                if(is_object($userMaps)){
                    foreach($userMaps as $userMap){
                        $userMap->erase();
                    }
                }

                // get all connections
                $connections = $this->getRelatedModels('ConnectionModel', 'mapId');
                if(is_object($connections)){
                    foreach($connections as $connection){
                        $connection->erase();
                    }
                }

                // get all systems
                $systems = $this->getRelatedModels('SystemModel', 'mapId');
                if(is_object($systems)){
                    foreach($systems as $system){
                        $system->erase();
                    }
                }

                // delete map
                $this->erase();
            }
        }
    }

    /**
     * checks weather a map is private map or not
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
     * checks weather a map is corporation map or not
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
     * checks weather a map is alliance map or not
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
        $systems = $this->getSystems();
        // get users with map access
        $users = $this->getUsers();

        $activeUserCharactersData = [];
        foreach($users as $user){
            // get all active character logs for a user
            $tempActiveUserCharacters = $user->getActiveUserCharacters();

            foreach($tempActiveUserCharacters as $tempActiveUserCharacter){
                $activeUserCharactersData[] = $tempActiveUserCharacter->getData(true);
            }
        }

        $mapUserData = (object)[];
        $mapUserData->config = (object)[];
        $mapUserData->config->id = $this->id;
        $mapUserData->data = (object)[];
        $mapUserData->data->systems = [];
        foreach($systems as $system){
            $systemUserData = (object)[];
            $systemUserData->id = $system->id;
            $systemUserData->user = [];

            // check if a system has active characters
            foreach($activeUserCharactersData as $key => $activeUserCharacterData){
                if($activeUserCharacterData->log->system->Id == $system->systemId){
                    $systemUserData->user[] = $activeUserCharacterData;

                    // remove user from array -> speed up looping over characters.
                    // each userCharacter can only be active in a SINGLE system
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
