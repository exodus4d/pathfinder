<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 01.03.15
 * Time: 18:37
 */

namespace Controller\Api;
use Model;

class Connection extends \Controller\AccessController{

    /**
     * event handler
     */
    function beforeroute() {

        parent::beforeroute();

        // set header for all routes
        header('Content-type: application/json');
    }

    /**
     * save a new connection or updates an existing (drag/drop) between two systems
     * @param $f3
     */
    public function save($f3){

        $connectionData = (array)$f3->get('POST.connectionData');

        $user = $this->_getUser();

        $connection = Model\BasicModel::getNew('ConnectionModel');
        $connection->getById($connectionData['id']);
        $connection->setData($connectionData);

        $newConnectionData = [];
        if(
            $connection->isValid() &&
            $connection->hasAccess($user)
        ){
            $connection->save();
            $newConnectionData = $connection->getData();
        }

        echo json_encode($newConnectionData);
    }

    public function delete($f3){
        $connectionIds = $f3->get('POST.connectionIds');

        $user = $this->_getUser();
        $connection = Model\BasicModel::getNew('ConnectionModel');

        foreach($connectionIds as $connectionId){

            $connection->getById($connectionId);
            $connection->delete($user);

            $connection->reset();
        }

        echo json_encode([]);
    }

} 