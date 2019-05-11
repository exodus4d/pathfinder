<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 29.07.2017
 * Time: 11:31
 */

namespace Controller\Ccp;

use Controller\Controller;
use lib\Util;
use Model;

class Universe extends Controller {

    const SESSION_KEY_SYSTEM_IDS                    = 'SESSION.SETUP.SYSTEM_IDS';


    /*  currently not used
    protected function setupRegions(\Base $f3){
        $regionsWhitelist = [
            10000002 // The Forge (13 constellations -> 93 systems)
        ];
        $regionIds = $f3->ccpClient()->getUniverseRegions();
        $regionIds = array_intersect($regionsWhitelist, $regionIds);

        $region = Model\Universe\AbstractUniverseModel::getNew('RegionModel');
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
        $constellationIds = $f3->ccpClient()->getUniverseConstellations();
        $constellationIds = array_intersect($constellationsWhitelist, $constellationIds);
        $constellation = Model\Universe\AbstractUniverseModel::getNew('ConstellationModel');
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
    public function setupCategory(int $categoryId, int $offset = 0, int $length = 0) : array {
        $return = [];
        if($categoryId){
            /**
             * @var $category Model\Universe\CategoryModel
             */
            $category = Model\Universe\AbstractUniverseModel::getNew('CategoryModel');
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
    protected function setupCategories(array $categoriesWhitelist = []) : array {
        $return = [];
        $categoryIds = $this->getF3()->ccpClient()->getUniverseCategories();
        $categoryIds = array_intersect($categoriesWhitelist, $categoryIds);
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
    protected function setupGroups(array $groupsWhitelist = []) : array {
        $return = [];
        $groupIds = $this->getF3()->ccpClient()->getUniverseGroups();
        $groupIds = array_intersect($groupsWhitelist, $groupIds);
        /**
         * @var $group Model\Universe\GroupModel
         */
        $group = Model\Universe\AbstractUniverseModel::getNew('GroupModel');
        foreach($groupIds as $groupId){
            $group->loadById($groupId);
            $return[$group->_id] = $group->loadTypesData();
            $group->reset();
        }
        return $return;
    }

    // system search index methods ====================================================================================

    /**
     * build search index from all systems data
     * @param int $offset
     * @param int $length
     * @return array
     * @throws \Exception
     */
    public function buildSystemsIndex(int $offset = 0, int $length = 10) : array {
        $systemIds = $this->getSystemIds();
        $systemsAll = count($systemIds);
        $systemIds = array_slice($systemIds, $offset, $length);

        /**
         * @var $system Model\Universe\SystemModel
         */
        $system = Model\Universe\AbstractUniverseModel::getNew('SystemModel');
        $indexData = [];
        foreach($systemIds as $systemId){
            $system->getById($systemId);
            if($hashKeyId = $system->getHashKey()){
                $indexData[$hashKeyId] = $system->getData();
            }
            // offset must increase otherwise we get a endless loop
            // -> see /setup ajax build loop function
            $offset++;
        }

        $this->getF3()->mset($indexData, '', $system::CACHE_INDEX_EXPIRE_KEY);

        // ... add hashKeys for all table rows to tableIndex as well
        $system::buildTableIndex($system, array_keys($indexData));

        return ['countAll' => $systemsAll, 'countBuild' => count($systemIds), 'offset' => $offset];
    }

    /**
     * get systemIds for all systems
     * @return array
     * @throws \Exception
     */
    public function getSystemIds() : array {
        $f3 = $this->getF3();
        if( !$f3->exists(self::SESSION_KEY_SYSTEM_IDS, $systemIds) ){
            /**
             * @var $system Model\Universe\SystemModel
             */
            $system = Model\Universe\AbstractUniverseModel::getNew('SystemModel');
            if($systems = $system->find()){
                $systemIds = $systems->getAll('id');
                if(count($systemIds)){
                    sort($systemIds, SORT_NUMERIC);
                    $f3->set(self::SESSION_KEY_SYSTEM_IDS, $systemIds);
                }
            }
        }

        return (array)$systemIds;
    }

    /**
     * get complete system index (all systems)
     * @param bool $all
     * @return array
     */
    public function getSystemsIndex(bool $all = false) : array {
        $index = [];
        $cacheKeyTable = Model\Universe\AbstractUniverseModel::generateHashKeyTable('system');
        if($this->getF3()->exists($cacheKeyTable,$cacheKeys)){
            foreach((array)$cacheKeys as $cacheKeyRow){
                if(($data = $this->get($cacheKeyRow)) && is_object($data)){
                    $index[] = $all ? $data : $data->id;
                }
            }
        }
        return $index;
    }

    /**
     * clear complete systems search index for all systems
     */
    public function clearSystemsIndex(){
        $cacheKeyTable = Model\Universe\AbstractUniverseModel::generateHashKeyTable('system');
        if($this->getF3()->exists($cacheKeyTable,$cacheKeys)){
            foreach((array)$cacheKeys as $cacheKeyRow) {
                $this->clear($cacheKeyRow);
            }
            $this->getF3()->clear($cacheKeyTable);
        }
    }

    /**
     * look for existing systemData in index
     * -> if not exists -> try to build
     * @param int $systemId
     * @return null|\stdClass
     * @throws \Exception
     */
    public function getSystemData(int $systemId){
        $data = null;
        if($systemId){
            // ...check index for data
            $cacheKeyRow = Model\Universe\AbstractUniverseModel::generateHashKeyRow('system', $systemId);
            $data = $this->get($cacheKeyRow);
            if(!$data){
                // .. try to build index
                /**
                 * @var $system Model\Universe\SystemModel
                 */
                $system = Model\Universe\AbstractUniverseModel::getNew('SystemModel');
                $system->getById($systemId);
                $data = $system->buildIndex();
            }
        }
        return $data;
    }

    /**
     * look for existing cacheKey data
     * @param string $cacheKey
     * @return null|\stdClass
     */
    private function get(string $cacheKey){
        $data = null;
        if($this->getF3()->exists($cacheKey,$value)) {
            if(is_string($value) && strpos($value, Model\Universe\AbstractUniverseModel::CACHE_KEY_PREFIX) === 0) {
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
    private function clear(string $cacheKey){
        if($this->getF3()->exists($cacheKey,$value)) {
            if(is_string($value) && strpos($value, Model\Universe\AbstractUniverseModel::CACHE_KEY_PREFIX) === 0) {
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
            $universeIds = $f3->ccpClient()->search($categories, $search, $strict);
            if(isset($universeIds['error'])){
                // ESI error
                $universeNameData = $universeIds;
            }elseif( !empty($universeIds) ){
                $universeIds = Util::arrayFlattenByValue($universeIds);
                $universeNameData = $f3->ccpClient()->getUniverseNamesData($universeIds);
            }
        }
        return $universeNameData;
    }

}