<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 07.06.15
 * Time: 18:16
 */

namespace Model;

use DB\SQL\Schema;

class ConstellationWormholeModel extends BasicModel {

    protected $table = 'constellation_wormhole';

    public static $enableDataExport = true;
    public static $enableDataImport = true;

    protected $fieldConf = [
        'constellationId' => [
            'type' => Schema::DT_INT,
            'index' => true,
        ],
        'wormholeId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\WormholeModel',
            'constraint' => [
                [
                    'table' => 'wormhole',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
    ];

    /**
     * get wormhole data as object
     * @return object
     */
    public function getData(){
        return  $this->wormholeId->getData();
    }

    /**
     * overwrites parent
     * @param null $db
     * @param null $table
     * @param null $fields
     * @return bool
     */
    public static function setup($db=null, $table=null, $fields=null){
        $status = parent::setup($db,$table,$fields);

        if($status === true){
            $status = parent::setMultiColumnIndex(['constellationId', 'wormholeId'], true);
        }

        return $status;
    }
}
