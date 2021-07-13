<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 14.10.2017
 * Time: 15:56
 */

namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;
use Exodus4D\Pathfinder\Lib\Config;
use Exodus4D\Pathfinder\Lib\Util;

class TypeModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table                        = 'type';

    /**
     * default store option for 'dogma' typeAttributes data
     * -> set to true will store all typeAttributes from ESI for a type
     * -> should be enabled for specific types, where data is used by Pathfinder
     */
    const DEFAULT_STORE_DOGMA_ATTRIBUTES    = false;

    /**
     * @var bool
     */
    public $storeDogmaAttributes            = self::DEFAULT_STORE_DOGMA_ATTRIBUTES;

    /**
     * @var array
     */
    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'description' => [
            'type' => Schema::DT_TEXT
        ],
        'published' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'radius' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0
        ],
        'volume' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0
        ],
        'capacity' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0
        ],
        'mass' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0
        ],
        'groupId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\GroupModel',
            'constraint' => [
                [
                    'table' => 'group',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry',
        ],
        'marketGroupId' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0,
            'index' => true
        ],
        'packagedVolume' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0
        ],
        'portionSize' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0
        ],
        'graphicId' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0,
            'index' => true
        ],
        'stations' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\StationModel', 'typeId']
        ],
        'structures' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\StructureModel', 'typeId']
        ],
        'planets' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\PlanetModel', 'typeId']
        ],
        'stars' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\StarModel', 'typeId']
        ],
        'attributes' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\TypeAttributeModel', 'typeId']
        ],
        'stargates' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\StargateModel', 'typeId']
        ],
        'statics' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\SystemStaticModel', 'typeId']
        ]
    ];

    /**
     * set 'dogma_attributes' during ESI import process to a virtual field
     * -> 'dogma_attributes' get imported after type is saved
     * @see loadData()
     * @param $dogmaAttributesData
     * @return null
     */
    public function set_dogma_attributes($dogmaAttributesData){
        $this->virtual('dogmaAttributes', (array)$dogmaAttributesData);
        return null;
    }

    /**
     * special getter for 'wormhole' types
     * @return string|null
     */
    public function getWormholeName(){
        return self::formatWormholeName($this->name);
    }

    /**
     * @param bool $mapper
     * @param bool $essentials
     * @return NULL|void
     */
    public function reset($mapper = true, $essentials = true){
        $this->clearVirtual('dogmaAttributes');
        parent::reset($mapper, $essentials);
    }

    /**
     * get type data
     * @param array $additionalData
     * @return null|object
     */
    public function getData(array $additionalData = []){
        $typeData = (object) [];
        $typeData->id = $this->_id;
        $typeData->name = $this->name;

        foreach($additionalData as $key){
            if($key == 'attributes'){
                // add 'dogma' typeAttributes data
                $typeData->$key = $this->getAttributesData();
            }elseif($this->exists($key)){
                $typeData->$key = $this->$key;
            }
        }

        return $typeData;
    }

    /**
     * get wormholeData from object
     * @return \stdClass
     */
    public function getWormholeData() : \stdClass {
        $wormholeData = (object) [];
        if($this->valid()){
            $wormholeData->name = $this->getWormholeName();
            $wormholeData->static = $this->statics ? (bool)count($this->statics) : false;
            $wormholeData->security = '';
            $wormholeData->massTotal = null;
            $wormholeData->massIndividual = null;
            $wormholeData->maxStableTime = null;
            foreach($this->getAttributesData() as $id => $attributesData){
                switch($id){
                    case 1381: // 'wormholeTargetSystemClass' -> 'security'
                        $wormholeData->security = self::getSystemSecurityFromId((int)$attributesData['value']);
                        break;
                    case 1383: // 'wormholeMaxStableMass' -> 'massTotal'
                        $wormholeData->massTotal = $attributesData['value'];
                        break;
                    case 1385: // 'wormholeMaxJumpMass' -> 'massIndividual'
                        $wormholeData->massIndividual = $attributesData['value'];
                        break;
                    case 1384: // 'wormholeMassRegeneration' -> 'massRegeneration'
                        if($attributesData['value']){
                            $wormholeData->massRegeneration = $attributesData['value'];
                        }
                        break;
                    case 1382: // 'wormholeMaxStableTime' -> 'maxStableTime'
                        $wormholeData->maxStableTime = $attributesData['value'] / 60;
                        break;
                    case Config::ESI_DOGMA_ATTRIBUTE_SCANWHSTRENGTH_ID: // 'scanWormholeStrength' -> 'scanWormholeStrength'
                        $wormholeData->scanWormholeStrength = $attributesData['value'];
                        break;
                }
            }
        }
        return $wormholeData;
    }

    /**
     * get shipData from object
     * -> more fields can be added in here if needed
     * @return \stdClass
     */
    public function getShipData() : \stdClass {
        $shipData = (object) [];
        if($this->valid()){
            $shipData->typeId = $this->_id;
            $shipData->typeName = $this->name;
            $shipData->mass = $this->mass;
        }
        return $shipData;
    }

    /**
     * @return array
     */
    protected function getAttributesData() : array {
        $attributesData = [];

        if($this->attributes){
            foreach($this->attributes as $typeAttribute){
                /**
                 * @var $typeAttribute TypeAttributeModel
                 */
                $attributesData[] = get_object_vars($typeAttribute->getData());
            }
        }
        return Util::arrayGetBy($attributesData, 'id');
    }

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     */
    public function afterInsertEvent($self, $pkeys){
        $self->syncDogmaAttributes();

        return parent::afterInsertEvent($self, $pkeys);
    }

    /**
     * Event "Hook" function
     * @param self $self
     * @param $pkeys
     */
    public function afterUpdateEvent($self, $pkeys){
        $self->syncDogmaAttributes();

        return parent::afterUpdateEvent($self, $pkeys);
    }

    /**
     * sync existing 'dogma' typeAttributes data with "new/updated" typeAttributes
     * -> $this->dogmaAttributes must be set before calling this method
     */
    protected function syncDogmaAttributes(){
        if(
            $this->storeDogmaAttributes &&
            !empty($dogmaAttributesData = (array)$this->dogmaAttributes)
        ){
            foreach((array)$this->attributes as $typeAttribute){
                $key = array_search($typeAttribute->get('attributeId', true), array_column($dogmaAttributesData, 'attributeId'));
                if($key !== false){
                    // attribute still belongs to this 'type' -> update value
                    $typeAttribute->copyfrom($dogmaAttributesData[$key], ['value']);
                    $typeAttribute->save();

                    unset($dogmaAttributesData[$key]);
                    $dogmaAttributesData = array_values($dogmaAttributesData);
                }else{
                    // attribute no longer belongs to this 'type'
                    $typeAttribute->erase();
                }
            }

            // add new dogmaTypes
            foreach($dogmaAttributesData as $dogmaAttributeData){
                /**
                 * @var $typeAttribute TypeAttributeModel
                 * @var $dogmaAttribute DogmaAttributeModel
                 */
                $typeAttribute = $this->rel('attributes');
                $dogmaAttribute = $typeAttribute->rel('attributeId');
                $dogmaAttribute->loadById($dogmaAttributeData['attributeId']);
                if($dogmaAttribute->valid()){
                    $typeAttribute->typeId      = $this;
                    $typeAttribute->attributeId = $dogmaAttribute;
                    $typeAttribute->value       = $dogmaAttributeData['value'];
                    $typeAttribute->save();
                }
            }
        }
    }

    /**
     * manipulate 'dogma_attributes' array be reference
     * -> used to inject custom attributes (not available from ESI)
     * @param array $data
     */
    private function manipulateDogmaAttributes(array &$data){
        if(!$this->storeDogmaAttributes){
            // attributes should not get saved
            unset($data['dogma_attributes']);
        }elseif(!empty($data['dogma_attributes'])){
            switch($data['groupId']){
                case Config::ESI_GROUP_WORMHOLE_ID:
                    if(
                        !empty($wormholesCSVData = static::getCSVData('wormhole', 'name')) &&
                        !empty($wormholeCSVData = $wormholesCSVData[self::formatWormholeName($data['name'])])
                    ){
                        // found relevant wormhole data in *.csv for current type
                        if(!empty($scanWormholeStrength = (float)$wormholeCSVData['scanWormholeStrength'])){
                            $data['dogma_attributes'][] = [
                                'attributeId'   => Config::ESI_DOGMA_ATTRIBUTE_SCANWHSTRENGTH_ID,
                                'value'         => $scanWormholeStrength
                            ];
                        }
                    }
                    break;
            }
        }
    }

    /**
     * load data from API into $this and save $this
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->send('getUniverseType', $id);
        if(!empty($data)){
            $this->manipulateDogmaAttributes($data);

            /**
             * @var $group GroupModel
             */
            $group = $this->rel('groupId');
            $group->loadById($data['groupId'], $accessToken, $additionalOptions);
            $data['groupId'] = $group;

            $this->copyfrom($data);
            $this->save();
        }
    }

    /**
     * @param string|null $name
     * @return string|null
     */
    public static function formatWormholeName(?string $name) : ?string {
        return (!empty($name) && !empty($format = @end(explode(' ', $name)))) ? $format : null;
    }
}