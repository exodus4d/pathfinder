<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 28.01.2018
 * Time: 12:42
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;

class RoleModel extends AbstractPathfinderModel {

    protected $table = 'role';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'label' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'level' => [
            'type' => Schema::DT_INT,
            'index' => true
        ],
        'style' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'corporationRights' => [
            'has-many' => ['Model\Pathfinder\CorporationRightModel', 'roleId']
        ]
    ];

    protected static $tableData = [
        [
            'id' => 1,
            'name' => 'MEMBER',
            'label' => 'member',
            'level' => 2,
            'style' => 'default'
        ],
        [
            'id' => 2,
            'name' => 'SUPER',
            'label' => 'admin',
            'level' => 10,
            'style' => 'danger'
        ],
        [
            'id' => 3,
            'name' => 'CORPORATION',
            'label' => 'manager',
            'level' => 4,
            'style' => 'info'
        ]
    ];

    /**
     * get role data
     * @return \stdClass
     */
    public function getData(){
        $roleData = (object) [];

        $roleData->name = $this->name;
        $roleData->label = $this->label;
        $roleData->style = $this->style;

        return $roleData;
    }

    /**
     * get default role
     * @return self|null
     */
    public static function getDefaultRole(){
        return self::getRoleById(1);
    }

    /**
     * get admin role
     * @return self|null
     */
    public static function getAdminRole(){
        return self::getRoleById(2);
    }

    /**
     * get corporation admin role
     * @return self|null
     */
    public static function getCorporationManagerRole(){
        return self::getRoleById(3);
    }

    /**
     * get role by id
     * @param int $roleId
     * @return self|null
     */
    public static function getRoleById(int $roleId = 1){
        $role = new self();
        $role->getById($roleId);
        return $role->dry() ? null : $role;
    }

    /**
     * get all corporations
     * @return \DB\CortexCollection
     */
    public static function getAll(){
        $query = [
            'active = :active',
            ':active' => 1
        ];

        $options = [
            'order' => 'level'
        ];

        return (new self())->find($query, $options);
    }

}