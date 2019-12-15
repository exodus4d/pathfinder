<?php


namespace Model\Pathfinder;


use Model\AbstractModel;

abstract class AbstractPathfinderModel extends AbstractModel {

    /**
     * alias name for database connection
     */
    const DB_ALIAS                          = 'PF';

    /**
     * enables check for $fieldChanges on update/insert
     * -> fields that should be checked need an "activity-log" flag
     * in $fieldConf config
     * @var bool
     */
    protected $enableActivityLogging        = true;

    /**
     * changed fields (columns) on update/insert
     * -> e.g. for character "activity logging"
     * @var array
     */
    protected $fieldChanges                 = [];

    /**
     * change default "activity logging" status
     * -> enable/disable
     * @param $status
     */
    public function setActivityLogging(bool $status){
        $this->enableActivityLogging = $status;
    }

    /**
     * @param bool $mapper
     * @return NULL|void
     */
    public function reset($mapper = true){
        $this->fieldChanges = [];
        parent::reset($mapper);
    }

    /**
     * function should be overwritten in child classes with access restriction
     * @param CharacterModel $characterModel
     * @return bool
     */
    public function hasAccess(CharacterModel $characterModel) : bool {
        return true;
    }

    /**
     * set "updated" field to current timestamp
     * this is useful to mark a row as "changed"
     */
    protected function setUpdated(){
        if($this->_id > 0){
            $this->db->exec(
                ["UPDATE " . $this->table . " SET updated=NOW() WHERE id=:id"],
                [
                    [':id' => $this->_id]
                ]
            );
        }
    }

    /**
     * get old and new value from field, in case field is configured with 'activity-log'
     * @return array
     */
    protected function getFieldChanges() : array {
        $changes = [];

        if($this->enableActivityLogging){
            // filter fields, where "activity" (changes) should be logged
            $fieldConf = array_filter($this->fieldConf, function($fieldConf, $key) {
                return isset($fieldConf['activity-log']) ? (bool)$fieldConf['activity-log'] : false;
            }, ARRAY_FILTER_USE_BOTH);

            if($fieldKeys = array_keys($fieldConf)){
                // model has fields where changes should be logged
                $schema = $this->getMapper()->schema();
                foreach($fieldKeys as $key){
                    if($this->changed($key)){
                        $changes[$key] = [
                            'old' => $schema[$key]['initial'],
                            'new' => $schema[$key]['value']
                        ];
                    }
                }
            }
        }

        return $changes;
    }

    /**
     * @return mixed|void
     */
    public function save(){
        // save changed field value BEFORE ->save() it called!
        // parent::save() resets the schema and old values get replaced with new values
        $this->fieldChanges = $this->getFieldChanges();

        return parent::save();
    }
}