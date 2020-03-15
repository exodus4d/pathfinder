<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.02.15
 * Time: 23:30
 */

namespace Exodus4D\Pathfinder\Controller;


use Exodus4D\Pathfinder\Model\Pathfinder;

class AccessController extends Controller {

    /**
     * event handler
     * @param \Base $f3
     * @param $params
     * @return bool
     * @throws \Exception
     */
    function beforeroute(\Base $f3, $params) : bool {
        if($return = parent::beforeroute($f3, $params)){
            // Any route/endpoint of a child class of this one,
            // requires a valid logged in user!
            if($this->isLoggedIn($f3) !== 'OK'){
                // no character found or login timer expired
                $this->logoutCharacter($f3);
                // skip route handler and afterroute()
                $return = false;
            }
        }

        return $return;
    }

    /**
     * check login status and look or a valid character
     * @param \Base $f3
     * @return string
     * @throws \Exception
     */
    protected function isLoggedIn(\Base $f3) : string {
        $loginStatus = 'UNKNOWN';
        // disable ttl cache time here. Further getCharacter() calls should use a short ttl
        if($character = $this->getCharacter(0)){
            if($character->checkLoginTimer()){
                if(( $authStatus = $character->isAuthorized()) === 'OK'){
                    $loginStatus = 'OK';
                }else{
                    $loginStatus = $authStatus;
                }
            }else{
                $loginStatus = 'MAX LOGIN TIME EXCEEDED';
            }
        }else{
            $loginStatus = 'NO SESSION FOUND';
        }

        // log character access status in debug mode
        if(
            $loginStatus !== 'OK' &&
            $f3->get('DEBUG') === 3
        ){
            self::getLogger('CHARACTER_ACCESS')->write(
                sprintf(Pathfinder\CharacterModel::LOG_ACCESS,
                    $character->_id ,
                    $loginStatus,
                    $character->name
                )
            );
        }

        return $loginStatus;
    }

    /**
     * broadcast MapModel to clients
     * @param Pathfinder\MapModel $map
     * @param bool                $noCache
     */
    protected function broadcastMap(Pathfinder\MapModel $map, bool $noCache = false) : void {
        $this->broadcastMapData($this->getFormattedMapData($map, $noCache));
    }


    /**
     * broadcast map data to clients
     * -> send over TCP Socket
     * @param array|null $mapData
     */
    protected function broadcastMapData(?array $mapData) : void {
        if(!empty($mapData)){
            $this->getF3()->webSocket()->write('mapUpdate', $mapData);
        }
    }

    /**
     * get formatted Map Data
     * @param Pathfinder\MapModel $map
     * @param bool                $noCache
     * @return array|null
     */
    protected function getFormattedMapData(Pathfinder\MapModel $map, bool $noCache = false) : ?array {
        $data = null;
        try{
            $mapData = $map->getData($noCache);
            $data = [
                'config' => $mapData->mapData,
                'data' => [
                    'systems' => $mapData->systems,
                    'connections' => $mapData->connections,
                ]
            ];
        }catch(\Exception $e){

        }

        return $data;
    }

}