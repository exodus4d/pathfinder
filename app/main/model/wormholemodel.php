<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 14.11.2015
 * Time: 22:21
 */

namespace Model;

use DB\SQL\Schema;

class WormholeModel extends BasicModel {

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
        'security' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'massTotal' => [
            'type' => Schema::DT_VARCHAR128, // varchar because > max int value
            'nullable' => false,
            'default' => 0
        ],
        'massIndividual' => [
            'type' => Schema::DT_VARCHAR128, // varchar because > max int value
            'nullable' => false,
            'default' => 0
        ],
        'massRegeneration' => [
            'type' => Schema::DT_VARCHAR128, // varchar because > max int value
            'nullable' => false,
            'default' => 0
        ],
        'maxStableTime' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 1,
            'index' => true,
        ],
        'signatureStrength' => [
            'type' => Schema::DT_FLOAT,
            'nullable' => true,
            'default' => null
        ]
    ];

    /**
     * No static columns added
     * @var bool
     */
    protected $addStaticFields = false;

    /**
     * setter for "signatureStrength"
     * @param $value
     * @return mixed|null|string
     * @throws \Exception
     */
    public function set_signatureStrength($value){
        $value = (float)$value ? $value : null;

        return $value;
    }

    /**
     * get wormhole data as object
     * @return object
     */
    public function getData(){
        $systemStaticData = (object) [];
        $systemStaticData->name = $this->name;
        $systemStaticData->security = $this->security;

        // total (max) available wormhole mass
        $systemStaticData->massTotal = $this->massTotal;

        // individual jump mass (max) per jump
        $systemStaticData->massIndividual = $this->massIndividual;

        // lifetime (max) for this wormhole
        $systemStaticData->maxStableTime =  $this->maxStableTime;

        // mass regeneration value per day
        if($this->massRegeneration > 0){
            $systemStaticData->massRegeneration = $this->massRegeneration;
        }

        // signature strength as defined by http://wiki.eve-inspiracy.com/index.php?title=Wormhole_Signature_Strength_List
        if($this->signatureStrength){
            $systemStaticData->signatureStrength = $this->signatureStrength;
        }

        return $systemStaticData;
    }

}