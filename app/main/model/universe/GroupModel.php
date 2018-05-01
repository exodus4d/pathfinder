<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 13.04.2018
 * Time: 23:58
 */

namespace Model\Universe;

use DB\SQL\Schema;

class GroupModel extends BasicUniverseModel {

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
            ]
        ],
        'types' => [
            'has-many' => ['Model\Universe\TypeModel', 'groupId']
        ]
    ];

    /**
     * get group data
     * @return object
     */
    public function getData(){
        $groupData = (object) [];
        $groupData->id = $this->id;
        $groupData->name = $this->name;


        if($typesData = $this->getTypesData()){
            $groupData->types = $typesData;
        }

        return $groupData;
    }

    /**
     * get all types for this group
     * @return array|mixed
     */
    protected function getTypes(){
        $types = [];
        $this->filter('types', [
            'published = :published',
            ':published' => 1
        ]);

        if($this->types){
            $types = $this->types;
        }

        return $types;
    }

    /**
     * @return array
     */
    protected function getTypesData() : array {
        $typesData = [];
        $types = $this->getTypes();

        foreach($types as $type){
            $typesData[] = $type->getData();
        }

        return $typesData;
    }

    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient->getUniverseGroupData($id);
        if(!empty($data)){
            $category = $this->rel('categoryId');
            $category->loadById($data['categoryId'], $accessToken, $additionalOptions);
            $data['categoryId'] = $category;

            $this->copyfrom($data, ['id', 'name', 'published', 'categoryId']);
            $this->save();
        }
    }

    /**
     * load types data for this group
     */
    public function loadTypesData(){
        if( !$this->dry() ){
            $data = self::getF3()->ccpClient->getUniverseGroupData($this->_id);
            if(!empty($data)){
                foreach((array)$data['types'] as $typeId){
                    $type = $this->rel('types');
                    $type->loadById($typeId);
                    $type->reset();
                }
            }
        }
    }
}