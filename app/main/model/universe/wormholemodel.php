<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 13.05.2018
 * Time: 18:36
 */

namespace Model\Universe;

use DB\SQL\Schema;

class WormholeModel extends BasicUniverseModel {

    protected $table = 'wormhole';

    public static $enableDataExport = true;
    public static $enableDataImport = true;

    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'index' => true,
            'unique' => true
        ],
        'typeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Universe\TypeModel',
            'constraint' => [
                [
                    'table' => 'type',
                    'on-delete' => 'SET NULL'
                ]
            ],
            'validate' => 'validate_notDry'
        ],
        'static' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'security' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'massTotal' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => true,
            'default' => null
        ],
        'massIndividual' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => true,
            'default' => null
        ],
        'massRegeneration' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => true,
            'default' => null
        ],
        'maxStableTime' => [
            'type' => Schema::DT_TINYINT,
            'nullable' => true,
            'default' => null
        ],
        'signatureStrength' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => true,
            'default' => null
        ],
        'systems' => [
            'has-many' => ['Model\Universe\SystemStaticModel', 'wormholeId']
        ]
    ];

    /**
     *  setter for typeId
     * @param string $typeId
     * @return string|int|null
     */
    public function set_typeId($typeId){
        if(!is_object($typeId)){
            /**
             * @var $type TypeModel
             */
            $type = $this->rel('typeId');
            $type->loadById((int)$typeId);
            $typeId = $type->dry() ? null : $type->_id;
        }
        return $typeId;
    }

    /**
     *  setter for massTotal
     * @param string $mass
     * @return int|null
     */
    public function set_massTotal($mass){
        $mass = (int)$mass;
        return $mass ? : null;
    }

    /**
     *  setter for massIndividual
     * @param string $mass
     * @return string|null
     */
    public function set_massIndividual($mass){
        $mass = (int)$mass;
        return $mass ? : null;
    }

    /**
     * setter for massRegeneration
     * @param $mass
     * @return int|null
     */
    public function set_massRegeneration($mass){
        $mass = (int)$mass;
        return $mass ? : null;
    }

    /**
     *  setter for maxStableTime
     * @param string $hours
     * @return int|null
     */
    public function set_maxStableTime($hours){
        $hours = (int)$hours;
        return $hours ? : null;
    }

    /**
     *  setter for signatureStrength
     * @param string $strength
     * @return float|null
     */
    public function set_signatureStrength($strength){
        $strength = (float)$strength;
        return $strength ? : null;
    }

    /**
     * @param array $fields
     * @return bool
     */
    public function exportData(array $fields = [
        'id', 'name', 'typeId', 'static', 'security', 'massTotal', 'massIndividual',
        'massRegeneration', 'maxStableTime', 'signatureStrength']
    ){
        return parent::exportData($fields);
    }

    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        var_dump('loadData');
        var_dump($id);
        /*
        $data = self::getF3()->ccpClient->getUniverseTypesData($id, $additionalOptions);
        if(!empty($data)){
            $group = $this->rel('groupId');
            $group->loadById($data['groupId'], $accessToken, $additionalOptions);
            $data['groupId'] = $group;

            $this->copyfrom($data);
            $this->save();
        } */
    }

    protected function loadDataByKey(string $key, $value){
        var_dump('loadData');
        var_dump($key);
        var_dump($value);
    }

}