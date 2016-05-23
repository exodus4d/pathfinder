<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 23.05.2016
 * Time: 20:32
 */

namespace data\mapper;


class CcpCharacterMapper extends AbstractIterator {


    protected static $map = [
        'characterID' => ['character' => 'id'],
        'characterName' => ['character' => 'name'],

        'race' => 'race',

        'bloodlineID' => ['blood' => 'id'],
        'bloodline' => ['blood' => 'name'],

        'ancestryID' => ['origin' => 'id'],
        'ancestry' => ['origin' => 'name'],

        'corporationID' => ['corp' => 'id'],
        'corporation' => ['corp' => 'name'],
        'corporationDate' => ['corp' => 'date'],

        'allianceID' => ['alli' => 'id'],
        'alliance' => ['alli' => 'name'],
        'allianceDate' => ['alli' => 'date'],

        'securityStatus' => 'security'
    ];
}