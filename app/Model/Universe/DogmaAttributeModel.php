<?php
/**
 * Created by PhpStorm.
 * User: Exodus4D
 * Date: 15.08.2019
 * Time: 22:00
 */

namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;

class DogmaAttributeModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'dogma_attribute';

    /**
     * @var array
     */
    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'displayName' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => true,
            'default' => null
        ],
        'description' => [
            'type' => Schema::DT_TEXT
        ],
        'published' => [
            'type' => Schema::DT_BOOL,
            'nullable' => true,
            'default' => null
        ],
        'stackable' => [
            'type' => Schema::DT_BOOL,
            'nullable' => true,
            'default' => null
        ],
        'highIsGood' => [
            'type' => Schema::DT_BOOL,
            'nullable' => true,
            'default' => null
        ],
        'defaultValue' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0
        ],
        'iconId' => [
            'type' => Schema::DT_INT,
            'nullable' => true,
            'default' => null
        ],
        'unitId' => [
            'type' => Schema::DT_INT,
            'nullable' => true,
            'default' => null
        ],
        'attributeTypes' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\TypeAttributeModel', 'attributeId']
        ]
    ];

    /**
     * get data
     * @return \stdClass
     */
    public function getData(){
        $attributeData              = (object) [];
        $attributeData->id          = $this->_id;
        $attributeData->name        = $this->name;
        $attributeData->description = $this->description;

        return $attributeData;
    }

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->send('getDogmaAttribute', $id);
        if(!empty($data) && !isset($data['error'])){
            $this->copyfrom($data, ['id', 'name', 'displayName', 'description', 'published', 'stackable', 'highIsGood', 'defaultValue', 'iconId', 'unitId']);
            $this->save();
        }
    }
}