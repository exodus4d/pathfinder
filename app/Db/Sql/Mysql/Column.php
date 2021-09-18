<?php

namespace Exodus4D\Pathfinder\Db\Sql\Mysql;

use DB\SQL;

/**
 * Class Column
 * @package DB\SQL\MySQL
 */
class Column extends SQL\Column
{

    const TEXT_TableNameMissing = 'Table name missing for FOREIGN KEY in `%s`';

    /**
     * drop constraint from this column
     * @param Constraint $constraint
     */
    public function dropConstraint(Constraint $constraint)
    {
        $this->table->dropConstraint($constraint);
    }

    /**
     * add constraint to this column
     * @param Constraint $constraint
     */
    public function addConstraint(Constraint $constraint)
    {
        $this->table->addConstraint($constraint);
    }

    /**
     * @param Constraint $constraint
     * @return mixed
     */
    public function constraintExists(Constraint $constraint)
    {
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
     * @return Constraint
     */
    public function newConstraint($constraintData)
    {

        $constraint = null;

        if (isset($constraintData['table'])) {
            if (isset($constraintData['column'])) {
                $constraintData['column'] = (array)$constraintData['column'];
            } else {
                $constraintData['column'] = ['id'];
            }

            $constraint = new Constraint($this->table, $this->name, $constraintData['table'], $constraintData['column']);

            if (isset($constraintData['on-delete'])) {
                $constraint->setOnDelete($constraintData['on-delete']);
            }

            if (isset($constraintData['on-update'])) {
                $constraint->setOnUpdate($constraintData['on-update']);
            }

        } else {
            trigger_error(sprintf(self::TEXT_TableNameMissing, $this->table->name . '->' . $this->name));
        }

        return $constraint;
    }
}