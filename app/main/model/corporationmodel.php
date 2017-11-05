<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 17.05.15
 * Time: 20:43
 */

namespace Model;

use DB\SQL\Schema;
use lib\Config;

class CorporationModel extends BasicModel {

    protected $table = 'corporation';

    /**
     * all available corp roles EVE has
     * -> a corp member has granted roles 0 up to all roles
     */
    const CCP_ROLES = [
        'director',
        'personnel_manager',
        'accountant',
        'security_officer',
        'factory_manager',
        'station_manager',
        'auditor',
        'hangar_take_1',
        'hangar_take_2',
        'hangar_take_3',
        'hangar_take_4',
        'hangar_take_5',
        'hangar_take_6',
        'hangar_take_7',
        'hangar_query_1',
        'hangar_query_2',
        'hangar_query_3',
        'hangar_query_4',
        'hangar_query_5',
        'hangar_query_6',
        'hangar_query_7',
        'account_take_1',
        'account_take_2',
        'account_take_3',
        'account_take_4',
        'account_take_5',
        'account_take_6',
        'account_take_7',
        'diplomat',
        'config_equipment',
        'container_take_1',
        'container_take_2',
        'container_take_3',
        'container_take_4',
        'container_take_5',
        'container_take_6',
        'container_take_7',
        'rent_office',
        'rent_factory_facility',
        'rent_research_facility',
        'junior_accountant',
        'config_starbase_equipment',
        'trader',
        'communications_officer',
        'contract_manager',
        'starbase_defense_operator',
        'starbase_fuel_technician',
        'fitting_manager',
        'terrestrial_combat_officer',
        'terrestrial_logistics_officer'
    ];

    /**
     * corp roles that give admin access for a corp
     */
    const ADMIN_ROLES = [
        'director',
        'personnel_manager',
        'security_officer'
    ];

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'shared' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'isNPC' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'corporationCharacters' => [
            'has-many' => ['Model\CharacterModel', 'corporationId']
        ],
        'mapCorporations' => [
            'has-many' => ['Model\CorporationMapModel', 'corporationId']
        ]
    ];

    /**
     * get all cooperation data
     * @return \stdClass
     */
    public function getData(){
        $cooperationData = (object) [];

        $cooperationData->id = $this->id;
        $cooperationData->name = $this->name;
        $cooperationData->shared = $this->shared;

        return $cooperationData;
    }

    /**
     * get all maps for this corporation
     * @return MapModel[]
     */
    public function getMaps(){
        $maps = [];

        $this->filter('mapCorporations',
            ['active = ?', 1],
            ['order' => 'created']
        );

        if($this->mapCorporations){
            $mapCount = 0;
            foreach($this->mapCorporations as $mapCorporation){
                if(
                    $mapCorporation->mapId->isActive() &&
                    $mapCount < Config::getMapsDefaultConfig('corporation')['max_count']
                ){
                    $maps[] = $mapCorporation->mapId;
                    $mapCount++;
                }
            }
        }

        return $maps;
    }

    /**
     * get all characters in this corporation
     * @param array $characterIds
     * @param array $options
     * @return CharacterModel[]
     */
    public function getCharacters($characterIds = [], $options = []){
        $characters = [];
        $filter = ['active = ?', 1];

        if( !empty($characterIds) ){
            $filter[0] .= ' AND id IN (?)';
            $filter[] =  $characterIds;
        }

        $this->filter('corporationCharacters', $filter);

        if($options['hasLog']){
            // just characters with active log data
            $this->has('corporationCharacters.characterLog', ['active = ?', 1]);
        }

        if($this->corporationCharacters){
            foreach($this->corporationCharacters as $character){
                $characters[] = $character;
            }
        }

        return $characters;
    }

    /**
     * get roles for each character in this corp
     * -> CCP API call
     * @param string $accessToken
     * @return array
     */
    public function getCharactersRoles($accessToken){
        $characterRolesData = [];
        if(
            !empty($accessToken) &&
            !$this->isNPC
        ){
            $characterRolesData = self::getF3()->ccpClient->getCorporationRoles($this->_id, $accessToken);
        }

        return $characterRolesData;
    }

    /**
     * get all corporations
     * @param array $options
     * @return \DB\CortexCollection
     */
    public static function getAll($options = []){
        $query = [
            'active = :active',
            ':active' => 1
        ];

        if( !$options['addNPC'] ){
            $query[0] .= ' AND isNPC = :isNPC';
            $query[':isNPC'] = 1;
        }

        return (new self())->find($query);
    }
} 