<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.02.15
 * Time: 20:43
 */

namespace Model;

class UserModel extends BasicModel {

    protected $table = 'user';

    protected $validate = [
        'name' => [
            'length' => [
                'min' => 5,
                'max' => 20
            ],
            'regex' => '/^[ \w-_]+$/'
        ],
        'password' => [
            'length' => [
                'min' => 5,
                'max' => 255
            ]
        ]
    ];

    /**
     * generate password hash
     * @param $password
     * @return FALSE|string
     */
    public static function generatePasswordHash($password){
        // generate random id (23 chars)
        $salt = uniqid('', true);
        return \Bcrypt::instance()->hash($password, $salt);
    }

    /**
     * search for user by unique username
     * @param $name
     * @return array|FALSE
     */
    public function getByName($name){
        return $this->getByForeignKey('name', $name);
    }

    /**
     * verify a user by his wassword
     * @param $password
     * @return bool
     */
    public function verify($password){
        $valid = false;

        if(! $this->dry()){
            $valid = (bool) \Bcrypt::instance()->verify($password, $this->password);
        }

        return $valid;
    }

    /**
     * get all assessable map models for a single user
     * @return array
     */
    public function getMaps(){
        $userMaps = $this->getRelatedModels('UserMapModel', 'userId');

        $maps = [];
        foreach($userMaps as $userMap){
            $maps[] = $userMap->mapId;
        }

        return $maps;
    }


} 