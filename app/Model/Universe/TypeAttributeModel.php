<?php
/**
 * Created by PhpStorm.
 * User: Exodus4D
 * Date: 15.08.2019
 * Time: 22:00
 */

namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;

class TypeAttributeModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'type_attribute';

    /**
     * @var array
     */
    protected $fieldConf = [
        'typeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\TypeModel',
            'constraint' => [
                [
                    'table' => 'type',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'attributeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\DogmaAttributeModel',
            'constraint' => [
                [
                    'table' => 'dogma_attribute',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'value' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0
        ]
    ];

    /**
     * No static columns added
     * @var bool
     */
    protected $addStaticFields = false;

    /**
     * @return \stdClass
     */
    public function getData(){
        $typeAttributeData          = $this->attributeId->getData();
        $typeAttributeData->value   = (float)$this->value;

        return $typeAttributeData;
    }

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){}

    /**
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     * @throws \Exception
     */
    public static function setup($db = null, $table = null, $fields = null){
        if($status = parent::setup($db, $table, $fields)){
            $status = parent::setMultiColumnIndex(['typeId', 'attributeId'], true);
        }
        return $status;
    }
}