<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 17.05.15
 * Time: 20:43
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;
use lib\Config;

class CorporationModel extends AbstractPathfinderModel {

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

    /**
     * corp rights that can be stored to a corp
     */
    const RIGHTS = [
        'map_update',
        'map_delete',
        'map_import',
        'map_export'
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
        'ticker' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'memberCount' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0
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
            'has-many' => ['Model\Pathfinder\CharacterModel', 'corporationId']
        ],
        'mapCorporations' => [
            'has-many' => ['Model\Pathfinder\CorporationMapModel', 'corporationId']
        ],
        'corporationRights' => [
            'has-many' => ['Model\Pathfinder\CorporationRightModel', 'corporationId']
        ],
        'corporationStructures' => [
            'has-many' => ['Model\Pathfinder\CorporationStructureModel', 'corporationId']
        ],
        'structures' => [
            'has-many' => ['Model\Pathfinder\StructureModel', 'corporationId']
        ]
    ];

    /**
     * get cooperation data
     * @param bool $addRights
     * @return \stdClass
     * @throws \Exception
     */
    public function getData(bool $addRights = true) : \stdClass {
        $cooperationData = (object) [];

        $cooperationData->id = $this->id;
        $cooperationData->name = $this->name;
        $cooperationData->shared = $this->shared;

        if($addRights){
            if($corporationRights = $this->getRights()){
                foreach($corporationRights as $corporationRight){
                    $cooperationData->rights[] = $corporationRight->getData();
                }
            }
        }

        return $cooperationData;
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     * @return bool
     */
    public function beforeUpdateEvent($self, $pkeys) : bool {
        // if model changed, 'update' col needs to be updated as well
        // -> data no longer "outdated"
        $this->touch('updated');

        return parent::beforeUpdateEvent($self, $pkeys);
    }

    /**
     * get all maps for this corporation
     * @param array $mapIds
     * @param array $options
     * @return array
     */
    public function getMaps($mapIds = [], $options = []) : array {
        $maps = [];
        $this->filterRel();

        if(!empty($mapIds)){
            $filters = [];
            $filters[] = ['mapId IN (:mapId)', ':mapId' => $mapIds];
            $this->filter('mapCorporations', $this->mergeWithRelFilter('mapCorporations', $this->mergeFilter($filters)), $this->getRelFilterOption('mapCorporations'));
        }

        if($this->mapCorporations){
            $mapCount = 0;
            foreach($this->mapCorporations as $mapCorporation){
                $validActive = !$options['addInactive'] ? $mapCorporation->mapId->isActive() : true;
                $validMapCount = !$options['ignoreMapCount'] ? $mapCount < Config::getMapsDefaultConfig('corporation')['max_count'] : true;

                if($validActive && $validMapCount){
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
     * get all structure data for this corporation
     * @param array $systemIds
     * @return array
     */
    public function getStructuresData(array $systemIds = []) : array {
        $structuresData = [];

        $this->filter('corporationStructures', ['active = ?', 1]);
        $this->has('corporationStructures.structureId', ['active = ?', 1]);

        if($systemIds){
            if(count($systemIds) == 1){
                $filterSystems = 'systemId = ?';
                $filterSystemIds = reset($systemIds);
            }else{
                $filterSystems = 'systemId IN (?)';
                $filterSystemIds = $systemIds;
            }

            $this->has('corporationStructures.structureId', [$filterSystems, $filterSystemIds]);
        }

        if($this->corporationStructures) {
            foreach($this->corporationStructures as $corporationStructure){
                $structuresData[] = $corporationStructure->structureId->getData();
            }
        }

        return $structuresData;
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
            $response = self::getF3()->ccpClient()->getCorporationRoles($this->_id, $accessToken);
            if( !empty($response['roles']) ){
                $characterRolesData = (array)$response['roles'];
            }
        }

        return $characterRolesData;
    }

    /**
     * get all corporation rights
     * @param array $options
     * @return CorporationRightModel[]
     * @throws \Exception
     */
    public function getRights($options = []) : array {
        $corporationRights = [];
        // get available rights
        $right = self::getNew('RightModel');
        if($rights = $right->find(['active = ? AND name IN (?)', 1, self::RIGHTS])){
            // get already stored rights
            if( !$options['addInactive'] ){
                $this->filter('corporationRights', ['active = ?', 1]);
            }

            foreach($rights as $i => $tempRight){
                $corporationRight = false;
                if($this->corporationRights){
                    foreach($this->corporationRights as $tempCorporationRight){
                        /**
                         * @var $tempCorporationRight CorporationRightModel
                         */
                        if($tempCorporationRight->get('rightId', true) === $tempRight->_id){
                            $corporationRight = $tempCorporationRight;
                            break;
                        }
                    }
                }

                if(!$corporationRight){
                    $corporationRight = self::getNew('CorporationRightModel');
                    $corporationRight->corporationId = $this;
                    $corporationRight->rightId = $tempRight;
                    $corporationRight->roleId = RoleModel::getDefaultRole();
                }

                $corporationRights[] = $corporationRight;
            }
        }

        return $corporationRights;
    }

    /**
     * load corporation by Id either from DB or load data from API
     * @param int $id
     * @param int $ttl
     * @param bool $isActive
     * @return bool
     */
    public function getById(int $id, int $ttl = self::DEFAULT_SQL_TTL, bool $isActive = true) : bool {
        $loaded = parent::getById($id, $ttl, $isActive);
        if($this->isOutdated()){
            // request corporation data
            $corporationData = self::getF3()->ccpClient()->getCorporationData($id);
            if( !empty($corporationData) ){
                // check for NPC corporation
                $corporationData['isNPC'] = self::getF3()->ccpClient()->isNpcCorporation($id);

                $this->copyfrom($corporationData, ['id', 'name', 'ticker', 'memberCount', 'isNPC']);
                $this->save();
            }
        }

        return $loaded;
    }

    /**
     * add new structure for this corporation
     * @param StructureModel $structure
     */
    public function saveStructure(StructureModel $structure){
        if( !$structure->dry() ){
            $corporationStructure = $this->rel('corporationStructures');
            $corporationStructure->corporationId = $this;
            $corporationStructure->structureId = $structure;
            $corporationStructure->save();
        }
    }

    /**
     * @see parent
     */
    public function filterRel() : void {
        $this->filter('mapCorporations', self::getFilter('active', true), ['order' => 'created']);
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