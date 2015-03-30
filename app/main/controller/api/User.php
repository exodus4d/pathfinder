<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 29.03.15
 * Time: 20:50
 */

namespace Controller\Api;


class User extends \Controller\AccessController{

    public function saveConfig($f3){
        $data = $f3->get('POST');

        if($data['configData']){
            $configData = $data['configData'];
            $user = $this->_getUser();

            if($user){
                $user->setMainCharacterId((int)$configData['mainCharacterId']);
            }

        }
        echo json_encode([]);
    }
} 