<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 14.05.2018
 * Time: 19:29
 */

namespace Model\Universe;

use DB\SQL\Schema;

class SystemModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'system';

    /**
     *
     */
    const ERROR_INVALID_WORMHOLE = 'Invalid wormhole name "%s" for system: "%s"';

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
            'belongs-to-one' => 'Model\Universe\ConstellationModel',
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
            'belongs-to-one' => 'Model\Universe\StarModel',
            'constraint' => [
                [
                    'table' => 'star',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'factionId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Universe\FactionModel',
            'constraint' => [
                [
                    'table' => 'faction',
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
        'shattered' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
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
            'has-many' => ['Model\Universe\PlanetModel', 'systemId']
        ],
        'statics' => [
            'has-many' => ['Model\Universe\SystemStaticModel', 'systemId']
        ],
        'stargates' => [
            'has-many' => ['Model\Universe\StargateModel', 'systemId']
        ]
    ];

    /**
     * get system data
     * -> this includes constellation, region, star, planets as well
     * @return \stdClass
     */
    public function getData(){

        $systemData                 = (object) [];
        $systemData->id             = $this->_id;
        $systemData->name           = $this->name;
        $systemData->constellation  = $this->constellationId->getData();
        $systemData->security       = $this->security;
        $systemData->trueSec        = (float)$this->trueSec;
        $systemData->effect         = $this->effect;
        $systemData->shattered      = (bool)$this->shattered;

        if($this->starId){
            $systemData->star       = $this->starId->getData();
        }

        if($this->factionId){
            $systemData->faction    = $this->factionId->getData();
        }

        if( !empty($planetsData = $this->getPlanetsData()) ){
            $systemData->planets    = $planetsData;
        }

        if( !empty($staticsData = $this->getStaticsData()) ){
            $systemData->statics    = $staticsData;
        }

        if( !empty($stargatesData = $this->getStargatesData()) ){
            $systemData->stargates  = $stargatesData;
        }

        return $systemData;
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
        if(!preg_match('/^j\d+$/i', $this->name)){
            // check for "Abyssal" system
            if(
                $this->get('constellationId', true) >= 22000001 &&
                $this->get('constellationId', true) <= 22000025
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
     * setter for positions array (x/y/z)
     * @param $position
     * @return null
     */
    public function set_position($position){
        $position = (array)$position;
        if(count($position) === 3){
            $this->x = $position['x'];
            $this->y = $position['y'];
            $this->z = $position['z'];
        }
        return null;
    }

    /**
     * setter for static systems (wormholes)
     * -> comma separated string or array
     * @param $staticNames
     * @return null
     */
    public function set_staticNames($staticNames){
        $staticNames = array_unique(is_string($staticNames) ? explode(',', $staticNames) : (array)$staticNames);
        $this->virtual('staticNames', array_map('strtoupper', $staticNames));
        return null;
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterUpdateEvent($self, $pkeys){
        $staticNames = (array)$self->staticNames;

        if(
            count($staticNames) > 0 &&                      // make sure statics are set. In case a wh system get updated without statics are set
            preg_match('/^c\d+$/i', $self->security) // make sure it is a wormhole
        ){
            foreach((array)$self->statics as $static){
                if(in_array($static->wormholeId->name, $staticNames)){
                    unset($staticNames[array_search($static->wormholeId->name, $staticNames)]);
                }else{
                    $static->erase();
                }
            }

            // add new statics
            foreach($staticNames as $staticName){
                $static = $self->rel('statics');
                /**
                 * @var $wormhole WormholeModel
                 */
                $wormhole = $static->rel('wormholeId')->getByForeignKey('name', $staticName, ['limit' => 1]);
                if( !$wormhole->dry() ){
                    $static->systemId = $self;
                    $static->wormholeId = $wormhole;
                    $static->save();
                }
            }
        }

        // build search index
        $self->buildIndex();

        return parent::afterUpdateEvent($self, $pkeys);
    }

    /**
     * get data from all planets
     * @return array
     */
    protected function getPlanetsData(){
        $planetsData = [];

        if($this->planets){
            foreach($this->planets as &$planet){
                /**
                 * @var $planet PlanetModel
                 */
                $planetsData[] = $planet->getData();
            }
        }
        return $planetsData;
    }

    /**
     * get data from all static wormholes
     * @return array
     */
    protected function getStaticsData(){
        $staticsData = [];

        if($this->statics){
            foreach($this->statics as &$static){
                /**
                 * @var $static SystemStaticModel
                 */
                $staticsData[] = $static->getData();
            }
        }
        return $staticsData;
    }

    /**
     * get data from all stargates
     * @return array
     */
    protected function getStargatesData(){
        $stargatesData = [];

        if($this->stargates){
            foreach($this->stargates as &$stargate){
                /**
                 * @var $stargate StargateModel
                 */
                $stargatesData[] = $stargate->getData();
            }
        }
        return $stargatesData;
    }

    /**
     * update system from ESI
     */
    public function updateModel(){
        if( !$this->dry() ){
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
        $data = self::getF3()->ccpClient()->getUniverseSystemData($id);

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
        if( !$this->dry() ){
            $data = self::getF3()->ccpClient()->getUniverseSystemData($this->_id);
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
        if( !$this->dry() ){
            $data = self::getF3()->ccpClient()->getUniverseSystemData($this->_id);
            if(!empty($data)){
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
}