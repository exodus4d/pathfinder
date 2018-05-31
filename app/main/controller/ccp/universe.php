<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 29.07.2017
 * Time: 11:31
 */

namespace Controller\Ccp;


use Controller\Controller;
use lib\Util;
use Model;

class Universe extends Controller {

    /**
     * Set up "Universe" Database
     * @param \Base $f3
     * @throws \Exception
     */
    public function setupDB(\Base $f3){
        //$this->setupWormholes($f3);
        //var_dump($this->getSystemsIndex());
        //var_dump($this->getSystemData(30000001));
        //var_dump($this->getSystemData(30000002));
        //var_dump($this->getSystemData('Lashesih'));
    }

    /*  currently not used
    protected function setupRegions(\Base $f3){
        $regionsWhitelist = [
            10000002 // The Forge (13 constellations -> 93 systems)
        ];
        $regionIds = $f3->ccpClient->getUniverseRegions();
        $regionIds = array_intersect ($regionsWhitelist, $regionIds);

        $region = Model\Universe\BasicUniverseModel::getNew('RegionModel');
        foreach($regionIds as $regionId){
            $region->loadById($regionId);
            $region->loadConstellationsData();

            foreach((array)$region->constellations as $constellation){
               $constellation->loadSystemsData();
            }

            $region->reset();
        }
    }*/

    /* currently not used
    protected function setupConstellations(\Base $f3){
        $constellationsWhitelist = [
            20000014 // Mal (11 systems)
        ];
        $constellationIds = $f3->ccpClient->getUniverseConstellations();
        $constellationIds = array_intersect ($constellationsWhitelist, $constellationIds);
        $constellation = Model\Universe\BasicUniverseModel::getNew('ConstellationModel');
        foreach($constellationIds as $constellationId){
            $constellation->loadById($constellationId);
            $constellation->loadSystemsData();
            $constellation->reset();
        }
    }*/

    /**
     * setup category + all dependencies (e.g. groups, types)
     * -> $length = 0 -> setup all groups
     * @param int $categoryId
     * @param int $offset
     * @param int $length
     * @return array
     * @throws \Exception
     */
    public function setupCategory(int $categoryId, int $offset = 0, int $length = 0){
        $return = [];
        if($categoryId){
            /**
             * @var $category Model\Universe\CategoryModel
             */
            $category = Model\Universe\BasicUniverseModel::getNew('CategoryModel');
            $category->loadById($categoryId);
            $groupIds =  $category->loadGroupsData($offset, $length);
            foreach((array)$category->groups as $group){
                // only load types for changed groups (not all)
                if(in_array($group->_id, $groupIds)){
                    $return[$group->_id] = $group->loadTypesData();
                }
            }
        }
        return $return;
    }

    /**
     * setup categories + all dependencies (e.g. groups, types)
     * id 2 -> Celestial (>100 groups -> >1000 types)
     * id 6 -> Ship (45 groups -> 490 types)
     * id 65 -> Structure (10 groups -> 33 types)
     * @param array $categoriesWhitelist
     * @return array
     * @throws \Exception
     */
    public function setupCategories(array $categoriesWhitelist = []){
        $return = [];
        $categoryIds = $this->getF3()->ccpClient->getUniverseCategories();
        $categoryIds = array_intersect ($categoriesWhitelist, $categoryIds);
        foreach($categoryIds as $categoryId){
            $return[$categoryId] = $this->setupCategory($categoryId);
        }
        return $return;
    }

    /**
     * setup groups + all dependencies (e.g. types)
     * id 6 -> Sun (29 types)
     * id 7 -> Planet (9 types)
     * id 10 -> Stargate (17 types)
     * id 988 -> Wormhole (89 types)
     * @param array $groupsWhitelist
     * @return array
     * @throws \Exception
     */
    protected function setupGroups(array $groupsWhitelist = []){
        $return = [];
        $groupIds = $this->getF3()->ccpClient->getUniverseGroups();
        $groupIds = array_intersect ($groupsWhitelist, $groupIds);
        /**
         * @var $group Model\Universe\GroupModel
         */
        $group = Model\Universe\BasicUniverseModel::getNew('GroupModel');
        foreach($groupIds as $groupId){
            $group->loadById($groupId);
            $return[$group->_id] = $group->loadTypesData();
            $group->reset();
        }
        return $return;
    }

    /**
     * build search index from all systems data
     * @param int $offset
     * @param int $length
     * @return array
     * @throws \Exception
     */
    public function buildSystemsIndex(int $offset = 0, int $length = 10){
        /**
         * @var $system Model\Universe\SystemModel
         */
        $system = Model\Universe\BasicUniverseModel::getNew('SystemModel');
        $systems = $system->find();
        $systemIds =  $systems->getAll('id', true);
        sort($systemIds, SORT_NUMERIC);
        $systemsAll = count($systemIds);
        $systemIds = array_slice($systemIds, $offset, $length);
        foreach($systemIds as $systemId){
            $system->getById($systemId);
            $system->buildIndex();
            $system->reset();
        }
        return ['countAll' => $systemsAll, 'countBuild' => count($systemIds)];
    }

    /**
     * get complete system index (all systems)
     * @return array
     */
    public function getSystemsIndex() : array {
        $index = [];
        $cacheKeyTable = Model\Universe\BasicUniverseModel::generateHashKeyTable('system');
        if($this->getF3()->exists($cacheKeyTable,$cacheKeys)){
            foreach((array)$cacheKeys as $cacheKeyRow){
                if(($data = $this->get($cacheKeyRow)) && is_object($data)){
                    $index[$data->id] = $data;
                }
            }
        }
        return $index;
    }

    /**
     * clear complete systems search index for all systems
     */
    public function clearSystemsIndex(){
        $cacheKeyTable = Model\Universe\BasicUniverseModel::generateHashKeyTable('system');
        if($this->getF3()->exists($cacheKeyTable,$cacheKeys)){
            foreach((array)$cacheKeys as $cacheKeyRow) {
                $this->clear($cacheKeyRow);
            }
            $this->getF3()->clear($cacheKeyTable);
        }
    }

    /**
     * look for existing systemData in index
     * -> id is either a valid systemId OR systemName
     * @param int|string $id
     * @return null|\stdClass
     */
    protected function getSystemData($id){
        $data = null;
        if($id){
            $cacheKeyRow = Model\Universe\BasicUniverseModel::generateHashKeyRow('system', $id);
            $data = $this->get($cacheKeyRow);
        }
        return $data;
    }

    /**
     * look for existing cacheKey data
     * @param string $cacheKey
     * @return null|\stdClass
     */
    protected function get(string $cacheKey){
        $data = null;
        if($this->getF3()->exists($cacheKey,$value)) {
            if(is_string($value) && strpos($value, Model\Universe\BasicUniverseModel::CACHE_KEY_PREFIX) === 0) {
                // value references an other cacheKey that holds data
                return $this->get($value);
            }elseif( !empty((array)$value) ){
                // stdClass data is not empty
                $data = (object)$value;
            }
        }
        return $data;
    }

    /**
     * clear cacheKey
     * @param string $cacheKey
     */
    protected function clear(string $cacheKey){
        if($this->getF3()->exists($cacheKey,$value)) {
            if(is_string($value) && strpos($value, Model\Universe\BasicUniverseModel::CACHE_KEY_PREFIX) === 0) {
                // value references another cacheKey -> clear that one as well
                $this->clear($value);
            }
            $this->getF3()->clear($cacheKey);
        }
    }

    /**
     * search universeName data by search term
     * @param array $categories
     * @param string $search
     * @param bool $strict
     * @return array
     */
    public static function searchUniverseNameData(array $categories, string $search, bool $strict = false) : array {
        $f3 = \Base::instance();
        $universeNameData = [];
        if( !empty($categories) && !empty($search)){
            $universeIds = $f3->ccpClient->search($categories, $search, $strict);
            if(isset($universeIds['error'])){
                // ESI error
                $universeNameData = $universeIds;
            }elseif( !empty($universeIds) ){
                $universeIds = Util::arrayFlattenByValue($universeIds);
                $universeNameData = $f3->ccpClient->getUniverseNamesData($universeIds);
            }
        }
        return $universeNameData;
    }

}