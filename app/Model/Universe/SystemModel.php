<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 14.05.2018
 * Time: 19:29
 */

namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;

class SystemModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'system';

    /**
     * @var array
     */
    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'constellationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\ConstellationModel',
            'constraint' => [
                [
                    'table' => 'constellation',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'starId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\StarModel',
            'constraint' => [
                [
                    'table' => 'star',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'security' => [
            'type' => Schema::DT_VARCHAR128
        ],
        'trueSec' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 1
        ],
        'securityStatus' => [
            'type' => Schema::DT_DOUBLE,
            'nullable' => false,
            'default' => 1
        ],
        'securityClass' => [
            'type' => Schema::DT_VARCHAR128,
        ],
        'effect' => [
            'type' => Schema::DT_VARCHAR128
        ],
        'x' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => false,
            'default' => 0
        ],
        'y' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => false,
            'default' => 0
        ],
        'z' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => false,
            'default' => 0
        ],
        'planets' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\PlanetModel', 'systemId']
        ],
        'statics' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\SystemStaticModel', 'systemId']
        ],
        'stargates' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\StargateModel', 'systemId']
        ],
        'stations' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\StationModel', 'systemId']
        ],
        'structures' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\StructureModel', 'systemId']
        ],
        'neighbour' => [
            'has-one' => ['Exodus4D\Pathfinder\Model\Universe\SystemNeighbourModel', 'systemId']
        ],
        'sovereignty' => [
            'has-one' => ['Exodus4D\Pathfinder\Model\Universe\SovereigntyMapModel', 'systemId']
        ],
        'factionWar' => [
            'has-one' => ['Exodus4D\Pathfinder\Model\Universe\FactionWarSystemModel', 'systemId']
        ]
    ];

    /**
     * get system data
     * -> this includes constellation, region, star, planets as well
     * @return \stdClass
     */
    public function getData(){
        $data                       = (object) [];
        $data->id                   = $this->_id;
        $data->name                 = $this->name;
        $data->constellation        = $this->constellationId->getData();
        $data->security             = $this->security;
        $data->trueSec              = (float)$this->trueSec;
        $data->effect               = $this->effect;
        $data->shattered            = false;

        if($this->starId){
            $data->star             = $this->starId->getData();
        }

        if($this->sovereignty){
            $data->sovereignty      = $this->sovereignty->getData();
        }

        if($this->factionWar){
            $data->factionWar       = $this->factionWar->getData();
        }

        if( !empty($planetsData = $this->getPlanetsData()) ){
            $data->planets          = $planetsData;

            // 'Shattered' systems have ONLY planets named with '(shattered)'
            // -> system 'Thera' has '(shattered)' AND other planets -> not shattered.
            // -> system 'J164104, 'J115422' - the only non-shattered wormholes which have a shattered planet -> not shattered.
            $data->shattered        = count(array_filter($planetsData, function($planetData){
                return property_exists($planetData, 'type') &&
                    (strpos(strtolower($planetData->type->name), '(shattered)') !== false);
            })) == count($planetsData);
        }

        if( !empty($staticsData = $this->getStaticsData()) ){
            $data->statics          = $staticsData;
        }

        if( !empty($stargatesData = $this->getStargatesData()) ){
            $data->stargates        = $stargatesData;
        }

        if( !empty($stationsData = $this->getStationsData()) ){
            $data->stations         = $stationsData;
        }

        return $data;
    }

    /**
     * setter for system name
     * @param $name
     * @return mixed
     */
    public function set_name($name){
        // name should never change
        // -> important for "Abyssal" systems where ESI don´t have correct system name
        if(!empty($this->name)){
            $name = $this->name;
        }
        return $name;
    }

    /**
     * setter for row (un-formatted) trueSec
     * @param $secStatus
     * @return double
     */
    public function set_securityStatus($secStatus){
        $secStatus = (double)$secStatus;
        // round for trueSec
        $positive = ($secStatus > 0);
        $trueSec = round($secStatus, 1, PHP_ROUND_HALF_DOWN);
        if($positive && $trueSec <= 0){
            $trueSec = 0.1;
        }
        $this->trueSec = $trueSec;
        // set 'security' for NON wormhole systems! -> those get updated from csv import
        // 'J1226-0' is also a wormhole with a '-' in the name! (single system)
        if(
            !preg_match('/^j(\d{6}|\d{4}-\d)$/i', $this->name) &&
            $this->name != 'Thera'
        ){
            $constellationId = (int)$this->get('constellationId', true);
            if($constellationId == 23000001){
                // "Pocket" system
                $security = 'P';
            }elseif(
                $constellationId >= 22000001 &&
                $constellationId <= 22000025
            ){
                // "Abyssal" system
                $security = 'A';
            }else{
                // k-space system
                if($trueSec <= 0){
                    $security = '0.0';
                }elseif($trueSec < 0.5){
                    $security = 'L';
                }else{
                    $security = 'H';
                }
            }

            $this->security = $security;
        }
        return $secStatus;
    }

    /**
     * setter for wormhole effect name
     * @param $effect
     * @return string|null
     */
    public function set_effect($effect){
        $effect = (string)$effect;
        return $effect ? : null;
    }

    /**
     * @param array $sovData
     * @return bool true if sovereignty data changed
     */
    public function updateSovereigntyData(array $sovData = []) : bool {
        $hasChanged     = false;
        $systemId       = (int)$sovData['systemId'];
        $factionId      = (int)$sovData['factionId'];
        $allianceId     = (int)$sovData['allianceId'];
        $corporationId  = (int)$sovData['corporationId'];

        if($this->valid()){
            if($systemId === $this->_id){
                // sov data belongs to this system
                $validSovData = (bool)max($factionId, $allianceId, $corporationId);
                if($validSovData){
                    // at least one of these Ids must exist for a sovereignty relation
                    /**
                     * @var $sovereignty SovereigntyMapModel
                     */
                    if(!$sovereignty = $this->sovereignty){
                        // insert new sovereignty data
                        $sovereignty = $this->rel('sovereignty');
                    }

                    $sovData['systemId'] = $this;

                    if($factionId){
                        // HS, L - systems have "faction war"
                        $sovData['allianceId'] = null;
                        $sovData['corporationId'] = null;

                        /**
                         * @var $faction FactionModel
                         */
                        $faction = $sovereignty->rel('factionId');
                        $faction->loadById($factionId);
                        $sovData['factionId'] = $faction;
                    }else{
                        // 0.0 - systems have sovereignty data by corp and/or ally
                        $sovData['factionId'] = null;

                        /**
                         * @var $alliance AllianceModel|null
                         */
                        $alliance = null;
                        if($allianceId){
                            $alliance = $sovereignty->rel('allianceId');
                            $alliance->loadById($allianceId);
                        }

                        /**
                         * @var $corporation CorporationModel|null
                         */
                        $corporation = null;
                        if($corporationId){
                            $corporation = $sovereignty->rel('corporationId');
                            $corporation->loadById($corporationId);
                        }

                        $sovData['allianceId'] = $alliance;
                        $sovData['corporationId'] = $corporation;
                    }

                    $sovereignty->copyfrom($sovData, ['systemId', 'factionId', 'allianceId', 'corporationId']);

                    // must be called before save(). Changed fields get reset after save() is called!
                    if($sovereignty->changed()){
                        $hasChanged = true;
                    }

                    $sovereignty->save();
                }elseif($this->sovereignty){
                    // delete existing sov data
                    // -> hint: WH - systems never have sovereignty data
                    $this->sovereignty->erase();
                    $hasChanged = true;
                }
            }
        }

        return $hasChanged;
    }

    /**
     * @param array $fwData
     * @return bool true if faction warfare data changed
     */
    public function updateFactionWarData(array $fwData = []) : bool {
        $hasChanged         = false;
        $systemId           = (int)$fwData['systemId'];
        $ownerFactionId     = (int)$fwData['ownerFactionId'];
        $occupierFactionId  = (int)$fwData['occupierFactionId'];

        if($this->valid()){
            if($systemId === $this->_id){
                /**
                 * @var $factionWar FactionWarSystemModel
                 */
                if(!$factionWar = $this->factionWar){
                    // insert new faction war data
                    $factionWar = $this->rel('factionWar');
                }

                $fwData['systemId'] = $this;

                if($ownerFactionId){
                    /**
                     * @var $ownerFaction FactionModel
                     */
                    $ownerFaction = $factionWar->rel('ownerFactionId');
                    $ownerFaction->loadById($ownerFactionId);
                    $fwData['ownerFactionId'] = $ownerFaction;
                }

                if($occupierFactionId){
                    /**
                     * @var $occupierFaction FactionModel
                     */
                    $occupierFaction = $factionWar->rel('occupierFactionId');
                    $occupierFaction->loadById($occupierFactionId);
                    $fwData['occupierFactionId'] = $occupierFaction;
                }

                $factionWar->copyfrom($fwData, ['systemId', 'ownerFactionId', 'occupierFactionId', 'contested', 'victoryPoints', 'victoryPointsThreshold']);

                // must be called before save(). Changed fields get reset after save() is called!
                if($factionWar->changed()){
                    $hasChanged = true;
                }

                $factionWar->save();
            }
        }

        return $hasChanged;
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterUpdateEvent($self, $pkeys){
        // build search index
        $self->buildIndex();
        return parent::afterUpdateEvent($self, $pkeys);
    }

    /**
     * get data from all planets
     * @return array
     */
    protected function getPlanetsData() : array {
        $planetsData = [];

        if($this->planets){
            /**
             * @var $planet PlanetModel
             */
            foreach($this->planets as &$planet){
                $planetsData[] = $planet->getData();
            }
        }
        return $planetsData;
    }

    /**
     * get data from all static wormholes
     * @return array
     */
    protected function getStaticsData() : array {
        $staticsData = [];

        if($this->statics){
            /**
             * @var $static SystemStaticModel
             */
            foreach($this->statics as &$static){
                $staticsData[] = $static->getData();
            }
        }
        return $staticsData;
    }

    /**
     * get data from all stargates
     * @return array
     */
    protected function getStargatesData() : array {
        $stargatesData = [];

        if($this->stargates){
            /**
             * @var $stargate StargateModel
             */
            foreach($this->stargates as &$stargate){
                $stargatesData[] = $stargate->getData();
            }
        }
        return $stargatesData;
    }

    /**
     * get data from all stations
     * @return array
     */
    protected function getStationsData() : array {
        $stationsData = [];

        if($this->stations){
            /**
             * @var $station StationModel
             */
            foreach($this->stations as &$station){
                $data = $station->getData();
                if(!$data->race){
                    // should never happen NPC stations always have a owning race
                    $data->race = (object) [];
                    $data->race->id = 0;
                    $data->race->name = 'unknown';
                    $data->race->faction = (object) [];
                    $data->race->faction->id = 0;
                    $data->race->faction->name = 'unknown';
                }

                if(!array_key_exists($data->race->faction->id, $stationsData)){
                    $stationsData[$data->race->faction->id] = [
                        'id' => $data->race->faction->id,
                        'name' => $data->race->name,
                        'stations' => []
                    ];
                }

                $stationsData[$data->race->faction->id]['stations'][] = $data;
            }
        }
        return $stationsData;
    }

    /**
     * update system from ESI
     */
    public function updateModel(){
        if($this->valid()){
            $this->loadData($this->_id);
            $this->loadPlanetsData();
        }
    }

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->send('getUniverseSystem', $id);

        if(!empty($data)){
            /**
             * @var $constellation ConstellationModel
             */
            $constellation = $this->rel('constellationId');
            $constellation->loadById($data['constellationId'], $accessToken, $additionalOptions);
            $data['constellationId'] = $constellation;

            // starId is optional since ESI v4 (e.g. Abyssal systems)
            if($data['starId']){
                /**
                 * @var $star StarModel
                 */
                $star = $this->rel('starId');
                $star->loadById($data['starId'], $accessToken, $additionalOptions);
                $data['starId'] = $star;
            }

            $this->copyfrom($data, ['id', 'name', 'constellationId', 'starId', 'securityStatus', 'securityClass', 'position']);
            $this->save();
        }
    }

    /**
     * load planets data for this system
     */
    public function loadPlanetsData(){
        if($this->valid()){
            $data = self::getF3()->ccpClient()->send('getUniverseSystem', $this->_id);
            if($data['planets']){
                // planets are optional since ESI v4 (e.g. Abyssal systems)
                foreach((array)$data['planets'] as $planetData){
                    /**
                     * @var $planet PlanetModel
                     */
                    $planet = $this->rel('planets');
                    $planet->loadById($planetData->planet_id);
                    $planet->reset();
                }
            }
        }
    }

    /**
     * load stargates for this system
     * -> stargates to destination system which is not in DB get ignored
     */
    public function loadStargatesData(){
        if($this->valid()){
            $data = self::getF3()->ccpClient()->send('getUniverseSystem', $this->_id);
            if($data['stargates']){
                foreach((array)$data['stargates'] as $stargateId){
                    /**
                     * @var $stargate StargateModel
                     */
                    $stargate = $this->rel('stargates');
                    $stargate->loadById($stargateId);
                    $stargate->reset();
                }
            }
        }
    }

    /**
     * load NPC owned stations for this system
     */
    public function loadStationsData(){
        if($this->valid()){
            $data = self::getF3()->ccpClient()->send('getUniverseSystem', $this->_id);
            if($data['stations']){
                foreach((array)$data['stations'] as $stationId){
                    /**
                     * @var $station SystemModel
                     */
                    $station = $this->rel('stations');
                    $station->loadById($stationId);
                    $station->reset();
                }
            }
        }
    }
}