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
        //$this->setupRegions($f3);
        //$this->setupConstellations($f3);
        //$this->setupCategories($f3);
    }

    /**
     * get all regions from CCP and store region data
     * @param \Base $f3
     * @throws \Exception
     */
    private function setupRegions(\Base $f3){
        $this->getDB('UNIVERSE');
        $regionIds = $f3->ccpClient->getRegions();
        $regionModel = BasicModel::getNew('Universe\RegionModel');

        foreach($regionIds as $regionId){
            $regionModel->getById($regionId);

            if($regionModel->dry()){
                $regionData = $f3->ccpClient->getRegionData($regionId);
                if( !empty($regionData) ){
                    $regionModel->copyfrom($regionData, ['id', 'name', 'description']);
                    $regionModel->save();
                }
            }

            $regionModel->reset();
        }
    }

    /**
     * get all constellations from CCP and store constellation data
     * @param \Base $f3
     * @throws \Exception
     */
    private function setupConstellations(\Base $f3){
        $this->getDB('UNIVERSE');
        $constellationIds = $f3->ccpClient->getConstellations();
        $constellationModel = BasicModel::getNew('Universe\ConstellationModel');

        foreach($constellationIds as $constellationId){
            $constellationModel->getById($constellationId);

            if($constellationModel->dry()){
                $constellationData = $f3->ccpClient->getConstellationData($constellationId);

                if( !empty($constellationData) ){
                   // $constellationModel->copyfrom($constellationData, ['id', 'name', 'regionId']);
                    $constellationModel->copyfrom($constellationData, function($fields){
                        // add position coordinates as separate columns
                        if(is_array($fields['position'])){
                            $position = $fields['position'];
                            if(
                                isset($position['x']) &&
                                isset($position['y']) &&
                                isset($position['z'])
                            ){
                                $fields['x'] = $position['x'];
                                $fields['y'] = $position['y'];
                                $fields['z'] = $position['z'];
                            }
                        }

                        // filter relevant data for insert
                        return array_intersect_key($fields, array_flip(['id', 'name', 'regionId', 'x', 'y', 'z']));
                    });

                    $constellationModel->save();
                }
            }

            $constellationModel->reset();
        }
    }

    /**
     * @param \Base $f3
     * @throws \Exception
     */
    private function setupCategories(\Base $f3){
        $categoryIdsWhitelist = [
            6, // Ship
            65 // Structure
        ];
        $categoryIds = $f3->ccpClient->getUniverseCategories();
        $categoryIds = array_intersect ($categoryIdsWhitelist, $categoryIds);
        $categoryModel = Model\Universe\BasicUniverseModel::getNew('CategoryModel');
        foreach($categoryIds as $categoryId){
            $categoryModel->loadById($categoryId);
            $categoryModel->loadGroupsData();

            foreach((array)$categoryModel->groups as $group){
                $group->loadTypesData();
            }

            $categoryModel->reset();
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