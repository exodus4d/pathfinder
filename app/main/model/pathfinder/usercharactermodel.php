<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 28.03.15
 * Time: 21:49
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;

class UserCharacterModel extends AbstractPathfinderModel {

    protected $table = 'user_character';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'userId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\UserModel',
            'constraint' => [
                [
                    'table' => 'user',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'characterId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'unique' => true,
            'belongs-to-one' => 'Model\Pathfinder\CharacterModel',
            'constraint' => [
                [
                    'table' => 'character',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ]
    ];

    /**
     * event "Hook"
     * -> remove user if there are no other characters bound to this user
     * @param UserCharacterModel $self
     * @param $pkeys
     */
    public function afterEraseEvent($self, $pkeys){
        if(
            is_object($self->userId) &&
            is_null($self->userId->userCharacters)
        ){
            $self->userId->erase();
        }
    }

    /**
     * get the character model of this character
     * @return mixed
     */
    public function getCharacter(){
        return $this->characterId;
    }

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
            $status = parent::setMultiColumnIndex(['userId', 'characterId'], true);
        }
        return $status;
    }

} 