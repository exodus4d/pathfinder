<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 28.01.2018
 * Time: 15:37
 */

namespace Model;

use DB\SQL\Schema;

class CorporationRightModel extends BasicModel {

    protected $table = 'corporation_right';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'corporationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\CorporationModel',
            'constraint' => [
                [
                    'table' => 'corporation',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'rightId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\RightModel',
            'constraint' => [
                [
                    'table' => 'right',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'roleId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\RoleModel',
            'constraint' => [
                [
                    'table' => 'role',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ]
    ];

    /**
     * set map data by an associative array
     * @param array $data
     */
    public function setData($data){
        unset($data['id']);
        unset($data['created']);
        unset($data['updated']);

        foreach((array)$data as $key => $value){
            if(!is_array($value)){
                if($this->exists($key)){
                    $this->$key = $value;
                }
            }
        }
    }

    /**
     * get cooperation right data
     * @return \stdClass
     */
    public function getData(){
        $cooperationRightData = (object) [];

        $cooperationRightData->right = $this->rightId->getData();
        $cooperationRightData->role = $this->roleId->getData();

        return $cooperationRightData;
    }

    /**
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     * @throws \Exception
     */
    public static function setup($db=null, $table=null, $fields=null){
        $status = parent::setup($db,$table,$fields);

        if($status === true){
            $status = parent::setMultiColumnIndex(['corporationId', 'rightId'], true);
        }

        return $status;
    }
}