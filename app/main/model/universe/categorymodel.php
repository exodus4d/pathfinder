<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 13.04.2018
 * Time: 23:49
 */

namespace Model\Universe;

use DB\SQL\Schema;

class CategoryModel extends AbstractUniverseModel {

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
     * @param array $additionalData
     * @return null|object
     */
    public function getData(array $additionalData = []){
        $categoryData = (object) [];
        $categoryData->id = $this->id;
        $categoryData->name = $this->name;

        if($groupsData = $this->getGroupsData($additionalData)){
            $categoryData->groups = $groupsData;
        }

        return $categoryData;
    }

    /**
     * get all groups for this category
     * @param bool $published
     * @return array|mixed
     */
    protected function getGroups(bool $published = true){
        $groups = [];
        if($published){
            $this->filter('groups', [
                'published = :published',
                ':published' => 1
            ]);
        }

        if($this->groups){
            $groups = $this->groups;
        }

        return $groups;
    }

    /**
     * @param array $additionalData
     * @return array
     */
    protected function getGroupsData(array $additionalData = []) : array {
        $groupsData = [];
        $groups = $this->getGroups();

        foreach($groups as $group){
            $groupsData[] = $group->getData($additionalData);
        }

        return $groupsData;
    }

    /**
     * count all types that belong to groups in this category
     * @param bool $published
     * @return int
     */
    public function getTypesCount(bool $published = true) : int {
        $count = 0;
        if( !$this->dry() ){
            /**
             * @var $group GroupModel
             */
            foreach($groups = $this->getGroups($published) as $group){
                $count += $group->getTypesCount($published);
            }
        }
        return $count;
    }

    /**
     * load data from API into $this and save $this
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->getUniverseCategoryData($id);
        if(!empty($data)){
            $this->copyfrom($data, ['id', 'name', 'published']);
            $this->save();
        }
    }

    /**
     * load groups data for this category
     * @param int $offset
     * @param int $length   0 -> all groups
     * @return array
     */
    public function loadGroupsData(int $offset = 0, int $length = 0) : array {
        $groupIds = [];
        if( !$this->dry() ){
            $data = self::getF3()->ccpClient()->getUniverseCategoryData($this->_id);
            if(!empty($data)){
                array_multisort($data['groups'], SORT_ASC, SORT_NUMERIC);
                if($length){
                    $data['groups'] = array_slice($data['groups'], $offset, $length);
                }
                foreach($data['groups'] as $groupId){
                    /**
                     * @var $group GroupModel
                     */
                    $group = $this->rel('groups');
                    $group->loadById($groupId);
                    $groupIds[] = $groupId;
                    $group->reset();
                }
            }
        }
        return $groupIds;
    }
}