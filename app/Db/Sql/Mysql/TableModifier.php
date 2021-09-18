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

namespace Exodus4D\Pathfinder\Db\Sql\Mysql;


use DB\SQL;

class TableModifier extends SQL\TableModifier {

    const TEXT_ConstraintNotValid = 'Constraint `%s` is not valid';


    /**
     * return table foreign key constraints as assoc array
     * -> if §constraint is passed, constraints are limited to that column
     * @param null| Constraint $constraint
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
     * @param Constraint $constraint
     * @return bool
     */
    public function constraintExists($constraint){
        $constraints = $this->listConstraint();
        return array_key_exists($constraint->getConstraintName(), $constraints);
    }

    /**
     * drop foreign key constraint
     * @param Constraint $constraint
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
     * @param Constraint $constraint
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
