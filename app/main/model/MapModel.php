<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 16.02.15
 * Time: 22:10
 */

namespace Model;


class MapModel extends BasicModel{

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
        'mapUsers' => array(
            'has-many' => array('Model\UserMapModel', 'mapId')
        ),
        'systems' => array(
            'has-many' => array('Model\SystemModel', 'mapId')
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
        ],
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
            }else{
                // special array data
                if($key == 'scope'){
                    $this->scopeId = $value['id'];
                }elseif($key == 'type'){
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

        $mapData = [
            'id' => $this->id,
            'name' => $this->name,
            'scope' => [
                'id' => $this->scopeId->id,
                'name' => $this->scopeId->name,
                'label' => $this->scopeId->label
            ],
            'type' => [
                'id' => $this->typeId->id,
                'name' => $this->typeId->name,
                'classTab' => $this->typeId->classTab
            ],
            'icon' => $this->icon,
            'updated' => strtotime($this->updated)


        ];

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
    public function getSystem( $systemId ){
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
     * set map access for an object (user or alliance)
     * @param $obj
     */
    public function setAccess($obj){

        if($obj instanceof UserModel){
            // private map
            // get all userModels who have map access
            $userMaps = $this->getRelatedModels('UserMapModel', 'mapId');

            $userFound = false;
            if($userMaps){
                foreach($userMaps as $userMap){
                    if($userMap->userId->id !== $obj->id){
                        // remove map access
                        $userMap->erase();
                    }else{
                        $userFound = true;
                    }
                }
            }

            if(!$userFound){
                // set user who has access to this map
                $userMap = self::getNew('UserMapModel');
                $userMap->userId = $obj;
                $userMap->mapId = $this;
                $userMap->save();
            }
        }
    }

    /**
     * checks weather an object (user or alliance) has
     * @param $accessObject
     * @return bool
     */
    public function hasAccess($accessObject){
        $hasAccess = false;

        if($accessObject instanceof UserModel){
            // get all userModels who have map access
            $userMaps = $this->getRelatedModels('UserMapModel', 'mapId');
            if($userMaps){
                foreach($userMaps as $userMap){
                    if($userMap->userId->id === $accessObject->id){
                        $hasAccess = true;
                        break;
                    }
                }
            }
        }

        return $hasAccess;
    }

    /**
     * get all user models with access to this map model
     * @return array
     */
    public function getUsers(){
        $this->filter('mapUsers', array('active = ?', 1));

        $users = [];
        if($this->mapUsers){
            foreach($this->mapUsers as $mapUser){
                $users[] = $mapUser->userId;
            }
        }

        return $users;
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
     * checks weather a map is private or not
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

        $mapUserData = (object) [];
        $mapUserData->config = (object) [];
        $mapUserData->config->id = $this->id;
        $mapUserData->data = (object) [];
        $mapUserData->data->systems = [];
        foreach($systems as $system){
            $systemUserData = (object) [];
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



} 