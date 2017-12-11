<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 29.07.2017
 * Time: 11:31
 */

namespace Controller\Ccp;


use Controller\Controller;
use Model\BasicModel;

class Universe extends Controller {

    /**
     * Set up "Universe" Database
     * @param \Base $f3
     * @throws \Exception
     */
    public function setupDB(\Base $f3){
        $this->setupRegions($f3);
        $this->setupConstellations($f3);
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
}