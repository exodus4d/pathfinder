<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 15.04.2018
 * Time: 19:41
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;
use Model\Universe;


class StructureModel extends AbstractPathfinderModel {

    /**
     * @var string
     */
    protected $table = 'structure';

    /**
     * categoryId (from ESI) that holds all "groups" with structure "types"
     */
    const CATEGORY_STRUCTURE_ID = 65;

    /**
     * @var array
     */
    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'structureId' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'corporationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\CorporationModel',
            'constraint' => [
                [
                    'table' => 'corporation',
                    'on-delete' => 'SET NULL'
                ]
            ]
        ],
        'systemId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'validate' => true
        ],
        'statusId' => [
            'type' => Schema::DT_INT,
            'default' => 1,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\StructureStatusModel',
            'constraint' => [
                [
                    'table' => 'structure_status',
                    'on-delete' => 'SET NULL'
                ]
            ]
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'description' => [
            'type' => Schema::DT_VARCHAR512,
            'nullable' => false,
            'default' => ''
        ],
        'structureCorporations' => [
            'has-many' => ['Model\Pathfinder\CorporationStructureModel', 'structureId']
        ]
    ];

    /**
     * set data by associative array
     * @param array $data
     */
    public function setData(array $data){
        $this->copyfrom($data, ['structureId', 'corporationId', 'systemId', 'statusId', 'name', 'description']);
    }
    /**
     * get structure data
     * @return \stdClass
     * @throws \Exception
     */
    public function getData() : \stdClass {
        $structureData                      = (object) [];
        $structureData->id                  = $this->_id;
        $structureData->systemId            = $this->systemId;
        $structureData->status              = $this->statusId->getData();
        $structureData->name                = $this->name;
        $structureData->description         = $this->description;

        if($this->structureId){
            $structureData->structure       = $this->getUniverseTypeData($this->structureId);
        }

        if($this->corporationId){
            $structureData->owner           = (object) [];
            $structureData->owner->id       = $this->corporationId->_id;
            $structureData->owner->name     = $this->corporationId->name;
        }

        $structureData->updated = (object) [];
        $structureData->updated->updated = strtotime($this->updated);

        return $structureData;
    }

    /**
     * set structureId (universeType) for this structure
     * @param $structureId
     * @return int|null
     */
    public function set_structureId($structureId) : ?int {
        $structureId = (int)$structureId;
        return $structureId ? : null;
    }

    /**
     * set corporationId (owner) for this structure
     * -> if corporation does not exists in DB -> load from API
     * @param int $corporationId
     * @return int|null
     */
    public function set_corporationId(int $corporationId) : ?int {
        $oldCorporationId = $this->get('corporationId', true) ? : 0;

        if($corporationId){
            if($corporationId !== $oldCorporationId){
                // make sure there is already corporation data stored for new corporationId
                /**
                 * @var CorporationModel $corporation
                 */
                $corporation = $this->rel('corporationId');
                $corporation->getById($corporationId);
                if($corporation->dry()){
                    $corporationId = null;
                }
            }
        }else{
            $corporationId = null;
        }

        return $corporationId;
    }
    /**
     * validates systemId
     * @param string $key
     * @param string $val
     * @return bool
     */
    protected function validate_systemId(string $key, string $val): bool {
        $valid = true;

        if( !$this->dry() && $this->systemId !== (int)$val ){
            // structure always belongs to the same system
            $valid = false;
        }

        return $valid;
    }

    /**
     * check whether this model is valid or not
     * @return bool
     */
    public function isValid(): bool {
        if($valid = parent::isValid()){
            // structure always belongs to a systemId
            if(!(int)$this->systemId){
                $valid = false;
            }
        }

        return $valid;
    }

    /**
     * Event "Hook" function
     * can be overwritten
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     * @return bool
     */
    public function beforeInsertEvent($self, $pkeys) : bool {
        return $this->isValid() ? parent::beforeInsertEvent($self, $pkeys) : false;
    }

    /**
     * check access by chraacter
     * @param CharacterModel $characterModel
     * @return bool
     */
    public function hasAccess(CharacterModel $characterModel) : bool {
        $access = false;
        if($characterModel->hasCorporation()){
            $this->filter('structureCorporations', ['active = ?', 1]);
            $this->has('structureCorporations.corporationId', ['active = ?', 1]);
            $this->has('structureCorporations.corporationId', ['id = ?', $characterModel->get('corporationId', true)]);

            if($this->structureCorporations){
                $access = true;
            }
        }

        return $access;
    }

    /**
     * get structure data grouped by corporations
     * @return array
     * @throws \Exception
     */
    public function getDataByCorporations() : array {
        $structuresData = [];
        foreach((array)$this->structureCorporations as $structureCorporation){
            if($structureCorporation->isActive() && $structureCorporation->corporationId->isActive()){
                $structuresData[$structureCorporation->corporationId->_id] = [
                    'id' => $structureCorporation->corporationId->_id,
                    'name' => $structureCorporation->corporationId->name,
                    'structures' => [$this->getData()]
                ];
            }
        }

        return $structuresData;
    }

    /**
     * load structure by $corporation, $name and $systemId
     * @param CorporationModel $corporation
     * @param string $name
     * @param int $systemId
     */
    public function getByName(CorporationModel $corporation, string $name, int $systemId) {
        if( !$corporation->dry() && $name){
            $this->has('structureCorporations', ['corporationId = :corporationId', ':corporationId' => $corporation->_id]);
            $this->load(['name = :name AND systemId = :systemId AND active = :active',
                ':name' => $name,
                ':systemId' => $systemId,
                ':active' => 1
            ]);
        }
    }

    /**
     * get universe type data for structureId
     * @param int $structureId
     * @return \stdClass
     * @throws \Exception
     */
    protected function getUniverseTypeData(int $structureId) : \stdClass {
        /**
         * @var $type Universe\TypeModel
         */
        $type = Universe\AbstractUniverseModel::getNew('TypeModel');
        $type->getById($structureId);
        return $type->dry() ? (object)[] : $type->getData();
    }
}