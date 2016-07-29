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
        ]
    ];

    /**
     * No static columns added
     * @var bool
     */
    protected $addStaticFields = false;

    /**
     * format mass values
     * - no decimal separator
     * - char '.' for thousands separator
     * @param $value
     * @return string
     */
    static function formatMassValue($value){
        return number_format( $value, 0, '', '.' );
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
        $systemStaticData->massTotal = (object) [];
        $systemStaticData->massTotal->value = $this->massTotal;
        $systemStaticData->massTotal->format = self::formatMassValue($this->massTotal) . ' Kg';

        // individual jump mass (max) per jump
        $systemStaticData->massIndividual = (object) [];
        $systemStaticData->massIndividual->value = $this->massIndividual;
        $systemStaticData->massIndividual->format = self::formatMassValue($this->massIndividual) . ' Kg';

        // lifetime (max) for this wormhole
        $systemStaticData->maxStableTime =  (object) [];
        $systemStaticData->maxStableTime->value = $this->maxStableTime;
        $systemStaticData->maxStableTime->format = $this->maxStableTime . ' h';

        // mass regeneration value per day
        if($this->massRegeneration > 0){
            $systemStaticData->massRegeneration = (object) [];
            $systemStaticData->massRegeneration->value = $this->massRegeneration;
            $systemStaticData->massRegeneration->format = self::formatMassValue($this->massRegeneration) . ' Kg/day';
        }

        return $systemStaticData;
    }

}