<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 01.04.2016
 * Time: 19:48
 */

namespace Data\Mapper;


class IgbHeader extends AbstractIterator {

    protected static $map = [
        'charid' => ['character' => 'id'],
        'charname' => ['character' => 'name'],

        // --------------------------------------------------------------------

        'solarsystemid' =>  ['system' => 'id'],
        'solarsystemname' => ['system' => 'name'],

        'constellationid' => ['constellation' => 'id'],
        'constellationname' => ['constellation' => 'name'],

        'regionid' => ['region' => 'id'],
        'regionname' => ['region' => 'name'],

        // --------------------------------------------------------------------

        'shiptypeid' => ['ship' => 'typeId'],
        'shiptypename' => ['ship' => 'typeName'],
        'shipid' => ['ship' => 'id'],
        'shipname' => ['ship' => 'name'],

        'stationid' => ['station' => 'id'],
        'stationname' => ['station' => 'name'],

        // --------------------------------------------------------------------

        'corpid' => ['corporation' => 'id'],
        'corpname' => ['corporation' => 'name'],

        'allianceid' => ['alliance' => 'id'],
        'alliancename' => ['alliance' => 'name']
    ];
}