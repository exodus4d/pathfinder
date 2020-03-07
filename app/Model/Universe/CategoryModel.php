<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 13.04.2018
 * Time: 23:49
 */

namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;

class CategoryModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'category';

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
        'groups' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\GroupModel', 'categoryId']
        ]
    ];

    /**
     * get category data
     * @param array $additionalData
     * @return null|object
     */
    public function getData(array $additionalData = []){
        $categoryData = (object) [];
        $categoryData->id = $this->_id;
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

        /**
         * @var $group GroupModel
         */
        foreach($groups as $group){
            $groupsData[] = $group->getData($additionalData);
        }

        return $groupsData;
    }

    /**
     * get groups count
     * @param bool $published
     * @return int
     */
    public function getGroupsCount(bool $published = true) : int {
        return $this->valid() ? count($this->getGroups($published)) : 0;
    }

    /**
     * count all types that belong to groups in this category
     * @param bool $published
     * @return int
     */
    public function getTypesCount(bool $published = true) : int {
        $count = 0;
        if($this->valid()){
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
        if(!empty($data = self::getUniverseCategoryData($id))){
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
        $info = ['countAll' => 0, 'countChunk' => 0, 'count' => 0, 'offset' => $offset, 'groupTypes' => []];

        if(
            $this->valid() &&
            !empty($data = self::getUniverseCategoryData($this->_id))
        ){
            $info['countAll'] = count($data['groups']);

            array_multisort($data['groups'], SORT_ASC, SORT_NUMERIC);
            if($length){
                $data['groups'] = array_slice($data['groups'], $offset, $length);
            }

            $info['countChunk'] = count($data['groups']);
            foreach($data['groups'] as $groupId){
                /**
                 * @var $group GroupModel
                 */
                $group = $this->rel('groups');
                $group->loadById($groupId);

                $info['groupTypes'][$groupId] = $group->loadTypesData();

                $group->reset();

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
    public static function getUniverseCategoryData(int $id) : array {
        return self::getF3()->ccpClient()->send('getUniverseCategory', $id);
    }

    /**
     * @return array
     */
    public static function getUniverseCategories() : array {
        return self::getF3()->ccpClient()->send('getUniverseCategories');
    }

    /**
     * @param int $id
     * @return array
     */
    public static function getUniverseCategoryGroups(int $id) : array {
        return empty($data = self::getUniverseCategoryData($id)) ? [] : $data['groups'];
    }

    /**
     * @param int $id
     * @return array
     */
    public static function getUniverseCategoryTypes(int $id) : array {
        $types = [];
        foreach($groupIds = self::getUniverseCategoryGroups($id) as $groupId){
            $types[$groupId] = GroupModel::getUniverseGroupTypes($groupId);
        }
        return $types;
    }
}