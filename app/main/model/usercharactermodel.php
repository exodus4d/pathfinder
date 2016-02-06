<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 28.03.15
 * Time: 21:49
 */

namespace Model;

use DB\SQL\Schema;

class UserCharacterModel extends BasicModel {

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
            'belongs-to-one' => 'Model\UserModel',
            'constraint' => [
                [
                    'table' => 'user',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'apiId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\UserApiModel',
            'constraint' => [
                [
                    'table' => 'user_api',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'characterId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\CharacterModel',
            'constraint' => [
                [
                    'table' => 'character',
                    'on-delete' => 'CASCADE'
                ]
            ]
        ],
        'isMain' => [
            'type' => Schema::DT_BOOLEAN,
            'nullable' => false,
            'default' => 0,
            'index' => true
        ]
    ];

    /**
     * set an array with all data for a character
     * @param $characterData
     */
    public function setData($characterData){

        foreach((array)$characterData as $key => $value){

            if(!is_array($value)){
                if($this->exists($key)){
                    $this->$key = $value;
                }
            }
        }
    }

    /**
     * get all character data
     * @param $addCharacterLogData
     * @return array
     */
    public function getData($addCharacterLogData = false){

        // get characterModel
        $characterModel = $this->getCharacter();

        // get static character data
        $characterData = $characterModel->getData($addCharacterLogData);

        // add user specific character data
        $characterData->isMain = $this->isMain;

        // check for corporation
        if( is_object( $characterModel->corporationId ) ){
            $characterData->corporation = $characterModel->corporationId->getData();
        }

        // check for alliance
        if( is_object( $characterModel->allianceId ) ){
            $characterData->alliance = $characterModel->allianceId->getData();
        }

        return $characterData;
    }

    /**
     * check if this character is Main character or not
     * @return bool
     */
    public function isMain(){
        $isMain = false;
        if($this->isMain == 1){
            $isMain = true;
        }

        return $isMain;
    }

    /**
     * set this character as main character
     */
    public function setMain($value = 0){
        $this->isMain = $value;
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
     */
    public static function setup($db=null, $table=null, $fields=null){
        $status = parent::setup($db,$table,$fields);

        if($status === true){
            $status = parent::setMultiColumnIndex(['userId', 'apiId', 'characterId'], true);
            if($status === true){
                $status = parent::setMultiColumnIndex(['userId', 'apiId']);
            }
        }

        return $status;
    }

} 