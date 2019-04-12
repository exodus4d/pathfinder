<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 25.08.2017
 * Time: 18:45
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;

abstract class AbstractMapTrackingModel extends AbstractPathfinderModel implements LogModelInterface {

    /**
     * @var array
     */
    private $trackingFieldConf = [
        'createdCharacterId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\CharacterModel',
            'constraint' => [
                [
                    'table' => 'character',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ],
        'updatedCharacterId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Model\Pathfinder\CharacterModel',
            'constraint' => [
                [
                    'table' => 'character',
                    'on-delete' => 'CASCADE'
                ]
            ],
            'validate' => 'notDry'
        ]
    ];

    /**
     * get static character  fields for this model instance
     * @return array
     */
    protected function getStaticFieldConf(): array{
        return array_merge(parent::getStaticFieldConf(), $this->trackingFieldConf);
    }

    /**
     * log character activity create/update/delete events
     * @param string $action
     */
    protected function logActivity($action){
        // check if activity logging is enabled for this object
        if($this->enableActivityLogging){
            // check for field changes
            if(
                mb_stripos(mb_strtolower($action), 'delete') !== false ||
                !empty($this->fieldChanges)
            ){
                $this->newLog($action)->setCharacter($this->updatedCharacterId)->setData($this->fieldChanges)->buffer();
            }
        }
    }

    /**
     * validates all required columns of this class
     * @return bool
     * @throws \Exception\DatabaseException
     */
    public function isValid(): bool {
        if($valid = parent::isValid()){
            foreach($this->trackingFieldConf as $key => $colConf){
                if($this->exists($key)){
                    $valid = $this->validateField($key, $this->$key);
                    if(!$valid){
                        break;
                    }
                }else{
                    $valid = false;
                    $this->throwDbException('Missing table column "' . $this->getTable(). '.' . $key . '"');
                    break;
                }
            }
        }

        return $valid;
    }

    /**
     * get log file data
     * @return array
     */
    public function getLogData(): array {
        return [];
    }

    /**
     * save connection
     * @param CharacterModel $characterModel
     * @return ConnectionModel|false
     */
    public function save(CharacterModel $characterModel = null){
        if($this->dry()){
            $this->createdCharacterId = $characterModel;
        }
        $this->updatedCharacterId = $characterModel;

        return parent::save();
    }

}