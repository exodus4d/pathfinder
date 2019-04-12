<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 13.04.2018
 * Time: 23:58
 */

namespace Model\Universe;

use DB\SQL\Schema;

class GroupModel extends AbstractUniverseModel {

    protected $table = 'group';

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
            'belongs-to-one' => 'Model\Universe\CategoryModel',
            'constraint' => [
                [
                    'table' => 'category',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'types' => [
            'has-many' => ['Model\Universe\TypeModel', 'groupId']
        ]
    ];

    /**
     * get group data
     * @param array $additionalData
     * @return null|object
     */
    public function getData(array $additionalData = []){
        $groupData = (object) [];
        $groupData->id = $this->id;
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
    protected function getTypes(bool $published = true){
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
        return $this->dry() ? 0 : count($this->getTypes($published));
    }

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->getUniverseGroupData($id);
        if(!empty($data)){
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
     * @return int
     */
    public function loadTypesData(){
        $count = 0;
        if( !$this->dry() ){
            $data = self::getF3()->ccpClient()->getUniverseGroupData($this->_id);
            if(!empty($data)){
                foreach((array)$data['types'] as $typeId){
                    /**
                     * @var $type TypeModel
                     */
                    $type = $this->rel('types');
                    $type->loadById($typeId);
                    $type->reset();
                    $count++;
                }
            }
        }
        return $count;
    }
}