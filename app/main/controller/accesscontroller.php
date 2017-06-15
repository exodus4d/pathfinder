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
     * @param array $params
     */
    function beforeroute(\Base $f3, $params) {
        parent::beforeroute($f3, $params);

        // Any route/endpoint of a child class of this one,
        // requires a valid logged in user!
        $loginCheck = $this->isLoggedIn($f3);

        if( !$loginCheck ){
            // no user found or login timer expired
            $this->logout($f3);

            if( $f3->get('AJAX') ){
                // unauthorized request
                $f3->status(403);
            }else{
                // redirect to landing page
                $f3->reroute(['login']);
            }

            // die() triggers unload() function
            die();
        }
    }

    /**
     * get current character and check if it is a valid character
     * @param \Base $f3
     * @return bool
     */
    protected function isLoggedIn(\Base $f3){
        $loginCheck = false;
        if( $character = $this->getCharacter() ){
            if($this->checkLogTimer($f3, $character)){
                if($character->isAuthorized() === 'OK'){
                    $loginCheck = true;
                }
            }
        }

        return $loginCheck;
    }

    /**
     * checks whether a user/character is currently logged in
     * @param \Base $f3
     * @param Model\CharacterModel $character
     * @return bool
     */
    private function checkLogTimer(\Base  $f3, Model\CharacterModel $character){
        $loginCheck = false;

        if(
            !$character->dry() &&
            $character->lastLogin
        ){
            // check logIn time
            $logInTime = new \DateTime($character->lastLogin);
            $now = new \DateTime();

            $timeDiff = $now->diff($logInTime);

            $minutes = $timeDiff->days * 60 * 24 * 60;
            $minutes += $timeDiff->h * 60;
            $minutes += $timeDiff->i;

            if($minutes <= $f3->get('PATHFINDER.TIMER.LOGGED')){
                $loginCheck = true;
            }
        }

        return $loginCheck;
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