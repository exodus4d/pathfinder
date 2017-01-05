<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.02.15
 * Time: 23:30
 */

namespace Controller;

use lib\Config;
use lib\Socket;
use Model;

class AccessController extends Controller {

    /**
     * event handler
     * @param \Base $f3
     */
    function beforeroute(\Base $f3) {
        parent::beforeroute($f3);

        // Any route/endpoint of a child class of this one,
        // requires a valid logged in user!
        $loginCheck = $this->checkLogTimer($f3);

        if( !$loginCheck ){
            // no user found or login timer expired
            $this->logout($f3);

            if( $f3->get('AJAX') ){
                // unauthorized request
                $f3->status(403);
            }else{
                // redirect to landing page
                $f3->reroute('@login');
            }

            // die() triggers unload() function
            die();
        }
    }

    /**
     * broadcast map data to clients
     * -> send over TCP Socket
     * @param Model\MapModel $map
     * @return int (number of active connections for this map)
     */
    protected function broadcastMapData(Model\MapModel $map){
        $mapData = $this->getFormattedMapData($map);
        return (int)(new Socket( Config::getSocketUri() ))->sendData('mapUpdate', $mapData);
    }

    /**
     * get formatted Map Data
     * @param Model\MapModel $map
     * @return array
     */
    protected function getFormattedMapData(Model\MapModel $map){
        $mapData = $map->getData();

        return [
            'config' => $mapData->mapData,
            'data' => [
                'systems' => $mapData->systems,
                'connections' => $mapData->connections,
            ]
        ];
    }

}