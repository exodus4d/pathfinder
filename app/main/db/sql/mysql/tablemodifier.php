<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 19.12.2015
 * Time: 12:47
 *
 * This is an "on top" extension for "Schema Builder"
 * see: https://github.com/ikkez/f3-schema-builder
 *
 * Features:
 * - FOREIGN KEY CONSTRAINTS (single column key)
 */

namespace DB\SQL\MySQL;
use DB\SQL;

class TableModifier extends SQL\TableModifier {

    const TEXT_ConstraintNotValid = 'Constraint `%s` is not valid';


    /**
     * return table foreign key constraints as assoc array
     * -> if §constraint is passed, constraints are limited to that column
     * @param null| SQL\MySQL\Constraint $constraint
     * @return Constraint[]
     */
    public function listConstraint($constraint = null){

        $constraintName = '%';
        $keys = [];
        if($constraint instanceof Constraint){
            // list constraints for given column in this table
            $constraintName = $constraint->getConstraintName() . '%';
            $keys = $constraint->getKeys();
        }

        $this->db->exec("USE information_schema");
        $constraintsData = $this->db->exec("
          SELECT
            *
          FROM
            referential_constraints
          WHERE
            constraint_schema = :db AND
            table_name = :table AND
            constraint_name LIKE :constraint_name
        ", [
            ':db' => $this->db->name(),
            ':table' => $this->name,
            ':constraint_name' => $constraintName
        ]);
        // switch back to current DB
        $this->db->exec("USE " . $this->db->quotekey($this->db->name()));

        $constraints = [];
        foreach($constraintsData as $data){
            $constraints[$data['CONSTRAINT_NAME']] = new Constraint($this, $keys, $data['REFERENCED_TABLE_NAME'] );
        }

        return $constraints;
    }

    /**
     * checks whether a constraint name exists or not
     * -> does not check constraint params
     * @param SQL\MySQL\Constraint $constraint
     * @return bool
     */
    public function constraintExists($constraint){
        $constraints = $this->listConstraint();
        return array_key_exists($constraint->getConstraintName(), $constraints);
    }

    /**
     * drop foreign key constraint
     * @param SQL\MySQL\Constraint $constraint
     */
    public function dropConstraint($constraint){
        if($constraint->isValid()){
            $this->queries[] = "ALTER TABLE " . $this->db->quotekey($this->name) . "
                                DROP FOREIGN KEY " . $this->db->quotekey($constraint->getConstraintName()) . ";";
        }else{
            trigger_error(sprintf(self::TEXT_ConstraintNotValid, 'table: ' . $this->name . ' constraintName: ' . $constraint->getConstraintName()));
        }
    }

    /**
     * Add/Update foreign key constraint
     * @param SQL\MySQL\Constraint $constraint
     */
    public function addConstraint($constraint){

        if($constraint->isValid()){
            $this->queries[] = "
              ALTER TABLE " . $this->db->quotekey($this->name) . "
                ADD CONSTRAINT " . $this->db->quotekey($constraint->getConstraintName()) . "
                FOREIGN KEY (" . implode(', ', $constraint->getKeys()) . ")
                REFERENCES " . $this->db->quotekey($constraint->getReferencedTable()) . " (" . implode(', ', $constraint->getReferencedCols()) . ")
                  ON DELETE " . $constraint->getOnDelete() . "
                  ON UPDATE " . $constraint->getOnUpdate() . ";";
        }else{
            trigger_error(sprintf(self::TEXT_ConstraintNotValid, 'table: ' . $this->name . ' constraintName: ' . $constraint->getConstraintName()));
        }
    }
}

/**
 * Class Column
 * @package DB\SQL\MySQL
 */
class Column extends SQL\Column {

    const TEXT_TableNameMissing = 'Table name missing for FOREIGN KEY in `%s`';

    /**
     * drop constraint from this column
     * @param Constraint $constraint
     */
    public function dropConstraint(Constraint $constraint){
        $this->table->dropConstraint($constraint);
    }

    /**
     * add constraint to this column
     * @param Constraint $constraint
     */
    public function addConstraint(Constraint $constraint){
            $this->table->addConstraint($constraint);
    }

    /**
     * @see \DB\SQL\MySQL\TableModifier->constraintExists();
     * @param Constraint $constraint
     * @return mixed
     */
    public function constraintExists(Constraint $constraint){
        return $this->table->constraintExists($constraint);
    }

    /**
     * get a new column based constraint
     * $constraintData['table'] => referenceTable name (required)
     * $constraintData['id'] => referenceColumns (optional) default: ['id']
     * $constraintData['on-delete'] => ON DELETE action (optional) default: see \DB\SQL\MySQL\Constraint const
     * $constraintData['on-update'] => ON UPDATE action (optional) default: see \DB\SQL\MySQL\Constraint const
     *
     * @param array $constraintData
     * @return SQL\MySQL\Constraint
     */
    public function newConstraint($constraintData){

        $constraint = null;

        if(isset($constraintData['table'])){
            if(isset($constraintData['column'])){
                $constraintData['column'] = (array)$constraintData['column'];
            }else{
                $constraintData['column'] = ['id'];
            }

            $constraint = new Constraint($this->table, $this->name, $constraintData['table'], $constraintData['column']);

            if(isset($constraintData['on-delete'])){
                $constraint->setOnDelete($constraintData['on-delete']);
            }

            if(isset($constraintData['on-update'])){
                $constraint->setOnUpdate($constraintData['on-update']);
            }

        }else{
            trigger_error(sprintf(self::TEXT_TableNameMissing, $this->table->name . '->' . $this->name));
        }

        return $constraint;
    }
}

class Constraint {

    // available actions
    const ACTIONS_DELETE = ['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION'];
    const ACTIONS_UPDATE = ['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION'];

    // default actions
    const ACTION_DELETE = 'RESTRICT';
    const ACTION_UPDATE = 'RESTRICT';

    const TEXT_ActionNotSupported = 'Constraint action `%s` is not supported.';

    protected $table;
    protected $keys = [];
    protected $referencedTable = '';
    protected $referencedCols = [];
    protected $onDelete = self::ACTION_DELETE;
    protected $onUpdate = self::ACTION_UPDATE;

    /**
     * Constraint constructor.
     * @param SQL\TableBuilder $table
     * @param array $keys
     * @param string $referencedTable
     * @param array $referencedCols
     */
    public function __construct(SQL\TableBuilder $table, $keys = [], $referencedTable = '', $referencedCols = ['id']){
        $this->table = &$table;
        $this->setKeys($keys);
        $this->setReferencedTable($referencedTable);
        $this->setReferencedCols($referencedCols);
    }

    /**
     * @param mixed $keys
     */
    public function setKeys($keys){
        $this->keys = (array)$keys;
    }

    /**
     * @param mixed $referencedTable
     */
    public function setReferencedTable($referencedTable){
        $this->referencedTable = $referencedTable;
    }

    /**
     * @param mixed $referencedCols
     */
    public function setReferencedCols($referencedCols){
        $this->referencedCols = (array)$referencedCols;
    }

    /**
     * @param string $onDelete
     */
    public function setOnDelete($onDelete){
        if( in_array($onDelete, self::ACTIONS_DELETE) ){
            $this->onDelete = $onDelete;
        }else{
            trigger_error(sprintf(self::TEXT_ActionNotSupported, $onDelete));
        }
    }

    /**
     * @param string $onUpdate
     */
    public function setOnUpdate($onUpdate){
        if( in_array($onUpdate, self::ACTIONS_UPDATE) ){
            $this->onUpdate = $onUpdate;
        }else{
            trigger_error(sprintf(self::TEXT_ActionNotSupported, $onUpdate));
        }
    }

    /**
     * @return array
     */
    public function getKeys(){
        return $this->keys;
    }

    /**
     * @return string
     */
    public function getReferencedTable(){
        return $this->referencedTable;
    }

    /**
     * @return array
     */
    public function getReferencedCols(){
        return $this->referencedCols;
    }

    /**
     * @return string
     */
    public function getOnDelete(){
        return $this->onDelete;
    }

    /**
     * @return string
     */
    public function getOnUpdate(){
        return $this->onUpdate;
    }

    /**
     * get a constraint name for this table.
     * This can either be used to generate unique constraint names for foreign keys in parent tables
     * or generate a "part" of a name. e.g. for db-Query all constraints of this table (ignore columns)
     * by "LIKE" selecting "information_schema"
     * -> To get a certain constraint or generate a unique constraint, ALL params are required!
     * @return string
     */
    public function getConstraintName(){
        $constraintName = 'fk_' . $this->table->name;

        if(!empty($this->getKeys())){
            $constraintName .= '___' . implode('__', $this->getKeys());
            if(!empty($this->getReferencedTable())){
                $constraintName .= '___' . $this->getReferencedTable();
                if(!empty($this->getReferencedCols())){
                    $constraintName .= '___' . implode('__', $this->getReferencedCols());
                }
            }
        }

        return $constraintName;
    }

    /**
     * checks if constraint is valid
     * -> all required members must be set!
     * @return bool
     */
    public function isValid(){
        $valid = false;

        if(
            !empty($this->getKeys()) &&
            !empty($this->getReferencedTable()) &&
            !empty($this->getReferencedCols())
        ){
            $valid = true;
        }

        return $valid;
    }


}