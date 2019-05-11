<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 14.10.2017
 * Time: 15:56
 */

namespace Model\Universe;

use DB\SQL;
use DB\SQL\Schema;

class StructureModel extends AbstractUniverseModel {

    protected $table = 'structure';

    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'systemId' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0,
            'index' => true
        ],
        'typeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Universe\TypeModel',
            'constraint' => [
                [
                    'table' => 'type',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'x' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0
        ],
        'y' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0
        ],
        'z' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => false,
            'default' => 0
        ]
    ];

    /**
     * get data from object
     * -> more fields can be added in here if needed
     * @return \stdClass
     */
    public function getData(): \stdClass {
        $data = (object) [];
        if(!$this->dry()){
            $data->id = $this->_id;
            $data->name = $this->name;
        }
        return $data;
    }

    /**
     * load data from API into $this and save $this
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->getUniverseStructureData($id, $accessToken);
        if(!empty($data)){
            /**
             * @var $type TypeModel
             */
            $type = $this->rel('typeId');
            $type->loadById($data['typeId'], $accessToken, $additionalOptions);
            $data['typeId'] = $type;

            $this->copyfrom($data, ['id', 'name', 'systemId', 'typeId', 'position']);
            $this->save();
        }
    }

    /**
     * overwrites parent
     * @param null|SQL $db
     * @param null $table
     * @param null $fields
     * @return bool
     * @throws \Exception
     */
    public static function setup($db = null, $table = null, $fields = null){
        if($status = parent::setup($db, $table, $fields)){
            //change `id` column to BigInt
            $schema = new Schema($db);
            $typeQuery = $schema->findQuery($schema->dataTypes[Schema::DT_BIGINT]);
            $db->exec("ALTER TABLE " . $db->quotekey('structure') .
                " MODIFY COLUMN " . $db->quotekey('id')  . " " . $typeQuery . " NOT NULL");
        }
        return $status;
    }

}