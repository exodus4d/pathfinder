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
     * @param $params
     * @return bool
     * @throws \Exception
     * @throws \Exception\PathfinderException
     * @throws \ZMQSocketException
     */
    function beforeroute(\Base $f3, $params): bool {
        if($return = parent::beforeroute($f3, $params)){
            // Any route/endpoint of a child class of this one,
            // requires a valid logged in user!
            if( !$this->isLoggedIn($f3) ){
                // no character found or login timer expired
                $this->logoutCharacter();

                if($f3->get('AJAX')){
                    // unauthorized request
                    $f3->status(403);
                }else{
                    // redirect to landing page
                    $f3->reroute(['login']);
                }
                // skip route handler and afterroute()
                $return = false;
            }
        }

        return $return;
    }

    /**
     * get current character and check if it is a valid character
     * @param \Base $f3
     * @return bool
     * @throws \Exception
     * @throws \Exception\PathfinderException
     */
    protected function isLoggedIn(\Base $f3): bool {
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
     * @throws \Exception\PathfinderException
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

            if($minutes <= Config::getPathfinderData('timer.logged')){
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
     * @throws \Exception
     * @throws \Exception\PathfinderException
     * @throws \ZMQSocketException
     */
    protected function broadcastMapData(Model\MapModel $map){
        $mapData = $this->getFormattedMapData($map);
        return (int)(new Socket( Config::getSocketUri() ))->sendData('mapUpdate', $mapData);
    }

    /**
     * get formatted Map Data
     * @param Model\MapModel $map
     * @return array
     * @throws \Exception
     * @throws \Exception\PathfinderException
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