<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 28.03.15
 * Time: 16:41
 */

namespace Model;


class UserApiModel extends BasicModel {

    protected $table = 'user_api';
    protected $ttl = 0;
    protected $rel_ttl = 0;

    protected $fieldConf = array(
        'userId' => array(
            'belongs-to-one' => 'Model\UserModel'
        ),
        'characters' => array(
            'has-many' => array('Model\UserCharacterModel', 'apiId')
        )
    );

    /**
     * get all characters for this API
     * @return array|mixed
     */
    public function getCharacters(){
        $this->filter('characters', array('active = ?', 1));

        $characters = [];
        if($this->characters){
            $characters = $this->characters;
        }

        return $characters;
    }

} 