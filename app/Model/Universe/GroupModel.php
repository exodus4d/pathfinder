<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 13.04.2018
 * Time: 23:58
 */

namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;

class GroupModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table                        = 'group';

    /**
     * @var bool
     */
    public $storeDogmaAttributes            = TypeModel::DEFAULT_STORE_DOGMA_ATTRIBUTES;

    /**
     * @var array
     */
    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'published' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'categoryId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\CategoryModel',
            'constraint' => [
                [
                    'table' => 'category',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'types' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\TypeModel', 'groupId']
        ]
    ];

    /**
     * get group data
     * @param array $additionalData
     * @return null|object
     */
    public function getData(array $additionalData = []){
        $groupData = (object) [];
        $groupData->id = $this->_id;
        $groupData->name = $this->name;

        if($typesData = $this->getTypesData($additionalData)){
            $groupData->types = $typesData;
        }

        return $groupData;
    }

    /**
     * get all types for this group
     * @param bool $published
     * @return array|mixed
     */
    public function getTypes(bool $published = true){
        $types = [];
        if($published){
            $this->filter('types', [
                'published = :published',
                ':published' => 1
            ]);
        }

        if($this->types){
            $types = $this->types;
        }

        return $types;
    }

    /**
     * @param array $additionalData
     * @return array
     */
    protected function getTypesData(array $additionalData = []) : array {
        $typesData = [];
        $types = $this->getTypes();

        foreach($types as $type){
            $typesData[] = $type->getData($additionalData);
        }

        return $typesData;
    }

    /**
     * count all types in this group
     * @param bool $published
     * @return int
     */
    public function getTypesCount(bool $published = true) : int {
        return $this->valid() ? count($this->getTypes($published)) : 0;
    }

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        if(!empty($data = self::getUniverseGroupData($id))){
            /**
             * @var $category CategoryModel
             */
            $category = $this->rel('categoryId');
            $category->loadById($data['categoryId'], $accessToken, $additionalOptions);
            $data['categoryId'] = $category;

            $this->copyfrom($data, ['id', 'name', 'published', 'categoryId']);
            $this->save();
        }
    }

    /**
     * load types data for this group
     * @param int $offset
     * @param int $length   0 -> all types
     * @return array
     */
    public function loadTypesData(int $offset = 0, int $length = 0) : array {
        $info = ['countAll' => 0, 'countChunk' => 0, 'count' => 0, 'offset' => $offset];

        if(
            $this->valid() &&
            !empty($data = self::getUniverseGroupData($this->_id))
        ){
            $info['countAll'] = count($data['types']);

            array_multisort($data['types'], SORT_ASC, SORT_NUMERIC);
            if($length){
                $data['types'] = array_slice($data['types'], $offset, $length);
            }

            $info['countChunk'] = count($data['types']);
            foreach($data['types'] as $typeId){
                /**
                 * @var $type TypeModel
                 */
                $type = $this->rel('types');
                $type->storeDogmaAttributes = $this->storeDogmaAttributes;
                $type->loadById($typeId);
                $type->reset();

                $info['count']++;
                $info['offset']++;
            }
        }

        return $info;
    }

    /**
     * @param int $id
     * @return array
     */
    public static function getUniverseGroupData(int $id) : array {
        return self::getF3()->ccpClient()->send('getUniverseGroup', $id);
    }

    /**
     * @return array
     */
    public static function getUniverseGroups() : array {
        return self::getF3()->ccpClient()->send('getUniverseGroups');
    }

    /**
     * @param int $id
     * @return array
     */
    public static function getUniverseGroupTypes(int $id) : array {
        return empty($data = self::getUniverseGroupData($id)) ? [] : $data['types'];
    }
}