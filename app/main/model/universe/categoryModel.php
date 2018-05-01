<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 13.04.2018
 * Time: 23:49
 */

namespace Model\Universe;

use DB\SQL\Schema;

class CategoryModel extends BasicUniverseModel {

    protected $table = 'category';

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
        'groups' => [
            'has-many' => ['Model\Universe\GroupModel', 'categoryId']
        ]
    ];

    /**
     * get category data
     * @return object
     */
    public function getData(){
        $categoryData = (object) [];
        $categoryData->id = $this->id;
        $categoryData->name = $this->name;

        if($groupsData = $this->getGroupsData()){
            $categoryData->groups = $groupsData;
        }

        return $categoryData;
    }

    /**
     * get all groups for this category
     * @return array|mixed
     */
    protected function getGroups(){
        $groups = [];
        $this->filter('groups', [
            'published = :published',
            ':published' => 1
        ]);

        if($this->groups){
            $groups = $this->groups;
        }

        return $groups;
    }

    /**
     * @return array
     */
    protected function getGroupsData() : array {
        $groupsData = [];
        $groups = $this->getGroups();

        foreach($groups as $group){
            $groupsData[] = $group->getData();
        }

        return $groupsData;
    }

    /**
     * load data from API into $this and save $this
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient->getUniverseCategoryData($id);
        if(!empty($data)){
            $this->copyfrom($data, ['id', 'name', 'published']);
            $this->save();
        }
    }

    /**
     * load groups data for this category
     */
    public function loadGroupsData(){
        if( !$this->dry() ){
            $data = self::getF3()->ccpClient->getUniverseCategoryData($this->_id);
            if(!empty($data)){
                foreach((array)$data['groups'] as $groupId){
                    $group = $this->rel('groups');
                    $group->loadById($groupId);
                    $group->reset();
                }
            }
        }
    }
}