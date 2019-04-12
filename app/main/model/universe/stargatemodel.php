<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 19.05.2018
 * Time: 04:30
 */

namespace Model\Universe;

use DB\SQL\Schema;

class StargateModel extends AbstractUniverseModel {

    protected $table = 'stargate';

    protected $fieldConf = [
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'systemId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Universe\SystemModel',
            'constraint' => [
                [
                    'table' => 'system',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
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
            'validate' => 'notDry'
        ],
        'destinationSystemId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Universe\SystemModel',
            'constraint' => [
                [
                    'table' => 'system',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'x' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => false,
            'default' => 0
        ],
        'y' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => false,
            'default' => 0
        ],
        'z' => [
            'type' => Schema::DT_BIGINT,
            'nullable' => false,
            'default' => 0
        ]
    ];

    public function getData(){

        $stargateData               = (object) [];
        $stargateData->id           = $this->_id;
        $stargateData->type         = $this->typeId->name;
        $stargateData->destination  = $this->destinationSystemId->name;

        return $stargateData;
    }

    /**
     * setter for positions array (x/y/z)
     * @param $position
     * @return null
     */
    public function set_position($position){
        $position = (array)$position;
        if(count($position) === 3){
            $this->x = $position['x'];
            $this->y = $position['y'];
            $this->z = $position['z'];
        }
        return null;
    }

    /**
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->getUniverseStargateData($id);

        if(!empty($data)){

            if($this->get('systemId', true) !== $data['systemId']){
                // new stargate or system changed
                /**
                 * @var $system SystemModel
                 */
                $system = $this->rel('systemId');
                $system->loadById($data['systemId'], $accessToken, $additionalOptions);
                $data['systemId'] = $system;
            }

            if($this->get('typeId', true) !== $data['typeId']){
                /**
                 * @var $type TypeModel
                 */
                $type = $this->rel('typeId');
                $type->loadById($data['typeId'], $accessToken, $additionalOptions);
                $data['typeId'] = $type;
            }

            if($this->get('destinationSystemId', true) !== $data['destination']->system_id){
                // new stargate or destinationSystem changed
                /**
                 * @var $destinationSystem SystemModel
                 */
                $destinationSystem = $this->rel('destinationSystemId');
                // no loadById() here! we don´t want to insert/update systems that do not exist yet
                $destinationSystem->getById($data['destination']->system_id, 0);

                if( !$destinationSystem->dry() ){
                    $data['destinationSystemId'] = $destinationSystem;
                    $this->copyfrom($data, ['id', 'name', 'position', 'systemId', 'typeId', 'destinationSystemId']);
                    $this->save();
                }
            }
        }
    }

    /**
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     * @throws \Exception
     */
    public static function setup($db = null, $table = null, $fields = null){
        if($status = parent::setup($db, $table, $fields)){
            $status = parent::setMultiColumnIndex(['systemId', 'destinationSystemId'], true);
        }
        return $status;
    }
}