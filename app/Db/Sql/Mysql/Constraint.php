<?php

namespace Exodus4D\Pathfinder\Db\Sql\Mysql;

use DB\SQL;

class Constraint
{

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
    public function __construct(SQL\TableBuilder $table, $keys = [], $referencedTable = '', $referencedCols = ['id'])
    {
        $this->table = &$table;
        $this->setKeys($keys);
        $this->setReferencedTable($referencedTable);
        $this->setReferencedCols($referencedCols);
    }

    /**
     * @param mixed $keys
     */
    public function setKeys($keys)
    {
        $this->keys = (array)$keys;
    }

    /**
     * @param mixed $referencedTable
     */
    public function setReferencedTable($referencedTable)
    {
        $this->referencedTable = $referencedTable;
    }

    /**
     * @param mixed $referencedCols
     */
    public function setReferencedCols($referencedCols)
    {
        $this->referencedCols = (array)$referencedCols;
    }

    /**
     * @param string $onDelete
     */
    public function setOnDelete($onDelete)
    {
        if (in_array($onDelete, self::ACTIONS_DELETE)) {
            $this->onDelete = $onDelete;
        } else {
            trigger_error(sprintf(self::TEXT_ActionNotSupported, $onDelete));
        }
    }

    /**
     * @param string $onUpdate
     */
    public function setOnUpdate($onUpdate)
    {
        if (in_array($onUpdate, self::ACTIONS_UPDATE)) {
            $this->onUpdate = $onUpdate;
        } else {
            trigger_error(sprintf(self::TEXT_ActionNotSupported, $onUpdate));
        }
    }

    /**
     * @return array
     */
    public function getKeys()
    {
        return $this->keys;
    }

    /**
     * @return string
     */
    public function getReferencedTable()
    {
        return $this->referencedTable;
    }

    /**
     * @return array
     */
    public function getReferencedCols()
    {
        return $this->referencedCols;
    }

    /**
     * @return string
     */
    public function getOnDelete()
    {
        return $this->onDelete;
    }

    /**
     * @return string
     */
    public function getOnUpdate()
    {
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
    public function getConstraintName()
    {
        $constraintName = 'fk_' . $this->table->name;

        if (!empty($this->getKeys())) {
            $constraintName .= '___' . implode('__', $this->getKeys());
            if (!empty($this->getReferencedTable())) {
                $constraintName .= '___' . $this->getReferencedTable();
                if (!empty($this->getReferencedCols())) {
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
    public function isValid()
    {
        $valid = false;

        if (
            !empty($this->getKeys()) &&
            !empty($this->getReferencedTable()) &&
            !empty($this->getReferencedCols())
        ) {
            $valid = true;
        }

        return $valid;
    }


}