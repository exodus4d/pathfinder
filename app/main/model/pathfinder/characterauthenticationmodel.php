<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 25.04.2016
 * Time: 19:33
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;
use Controller;

class CharacterAuthenticationModel extends AbstractPathfinderModel{

    protected $table = 'character_authentication';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'characterId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\CharacterModel',
            'constraint' => [
                [
                    'table' => 'character',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'selector' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'index' => true,
            'unique' => true
        ],
        'token' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => '',
            'index' => true
        ],
        'expires' => [
            'type' => Schema::DT_TIMESTAMP,
            'default' => Schema::DF_CURRENT_TIMESTAMP,
            'index' => true
        ]
    ];


    /**
     * Event "Hook" function
     * can be overwritten
     * @param CharacterAuthenticationModel $self
     * @param $pkeys
     * @return bool
     */
    public function beforeEraseEvent($self, $pkeys) : bool {
        // clear existing client Cookies as well
        $cookieName = Controller\Controller::COOKIE_PREFIX_CHARACTER;
        $cookieName .= '_' . $this->characterId->getCookieName();
        $self::getF3()->clear('COOKIE.' . $cookieName);
        return true;
    }

}