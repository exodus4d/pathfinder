<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 09.02.15
 * Time: 20:43
 */

namespace Model;

class UserModel extends \DB\SQL\Mapper {

    private $tableName = 'user';

    function __construct(\DB\SQL $db) {
        parent::__construct($db, $this->tableName);
    }

    public function getById($id) {
        return $this->load( array('id=?', $id) );
    }

    public function getByAuth($name, $password){
        return $this->load( array('name=? AND password=?', $name, $password) );
    }
} 