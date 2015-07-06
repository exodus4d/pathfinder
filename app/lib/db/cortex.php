<?php

/**
 *  Cortex - a general purpose mapper for the PHP Fat-Free Framework
 *
 *  The contents of this file are subject to the terms of the GNU General
 *  Public License Version 3.0. You may not use this file except in
 *  compliance with the license. Any of the license terms and conditions
 *  can be waived if you get permission from the copyright holder.
 *
 *  crafted by   __ __     __
 *              |__|  |--.|  |--.-----.-----.
 *              |  |    < |    <|  -__|-- __|
 *              |__|__|__||__|__|_____|_____|
 *
 *  Copyright (c) 2014 by ikkez
 *  Christian Knuth <ikkez0n3@gmail.com>
 *  https://github.com/ikkez/F3-Sugar/
 *
 *  @package DB
 *  @version 1.4.0
 *  @since 24.04.2012
 *  @date 04.06.2015
 */

namespace DB;
use DB\SQL\Schema;

class Cortex extends Cursor {

	protected
		// config
		$db,            // DB object [ \DB\SQL, \DB\Jig, \DB\Mongo ]
		$table,         // selected table, string
		$fluid,         // fluid sql schema mode, boolean
		$fieldConf,     // field configuration, array
		$ttl,           // default mapper schema ttl
		$rel_ttl,       // default mapper rel ttl
		$primary,       // SQL table primary key
		// behaviour
		$smartLoading,  // intelligent lazy eager loading, boolean
		$standardiseID, // return standardized '_id' field for SQL when casting
		// internals
		$dbsType,       // mapper engine type [jig, sql, mongo]
		$fieldsCache,   // relation field cache
		$saveCsd,       // mm rel save cascade
		$collection,    // collection
		$relFilter,     // filter for loading related models
		$hasCond,       // IDs of records the next find should have
		$whitelist,     // restrict to these fields
		$relWhitelist,  // restrict relations to these fields
		$grp_stack,     // stack of group conditions
		$countFields,   // relational counter buffer
		$preBinds,      // bind values to be prepended to $filter
		$vFields,       // virtual fields buffer
		$_ttl;          // rel_ttl overwrite

	/** @var Cursor */
	protected $mapper;

	/** @var CortexQueryParser */
	protected $queryParser;

	static
		$init = false;  // just init without mapper

	const
		// special datatypes
		DT_SERIALIZED = 'SERIALIZED',
		DT_JSON = 'JSON',

		// error messages
		E_ARRAY_DATATYPE = 'Unable to save an Array in field %s. Use DT_SERIALIZED or DT_JSON.',
		E_CONNECTION = 'No valid DB Connection given.',
		E_NO_TABLE = 'No table specified.',
		E_UNKNOWN_DB_ENGINE = 'This unknown DB system is not supported: %s',
		E_FIELD_SETUP = 'No field setup defined',
		E_UNKNOWN_FIELD = 'Field %s does not exist in %s.',
		E_INVALID_RELATION_OBJECT = 'You can only save hydrated mapper objects',
		E_NULLABLE_COLLISION = 'Unable to set NULL to the NOT NULLABLE field: %s',
		E_WRONG_RELATION_CLASS = 'Relations only works with Cortex objects',
		E_MM_REL_VALUE = 'Invalid value for many field "%s". Expecting null, split-able string, hydrated mapper object, or array of mapper objects.',
		E_MM_REL_CLASS = 'Mismatching m:m relation config from class `%s` to `%s`.',
		E_MM_REL_FIELD = 'Mismatching m:m relation keys from `%s` to `%s`.',
		E_REL_CONF_INC = 'Incomplete relation config for `%s`. Linked key is missing.',
		E_MISSING_REL_CONF = 'Cannot create related model. Specify a model name or relConf array.',
		E_HAS_COND = 'Cannot use a "has"-filter on a non-bidirectional relation field';

	/**
	 * init the ORM, based on given DBS
	 * @param null|object $db
	 * @param string      $table
	 * @param null|bool   $fluid
	 * @param int         $ttl
	 */
	public function __construct($db = NULL, $table = NULL, $fluid = NULL, $ttl = 0)
	{
		if (!is_null($fluid))
			$this->fluid = $fluid;
		if (!is_object($this->db=(is_string($db=($db?:$this->db))?\Base::instance()->get($db):$db)))
			trigger_error(self::E_CONNECTION);
		if ($this->db instanceof Jig)
			$this->dbsType = 'jig';
		elseif ($this->db instanceof SQL)
			$this->dbsType = 'sql';
		elseif ($this->db instanceof Mongo)
			$this->dbsType = 'mongo';
		if ($table)
			$this->table = $table;
		if ($this->dbsType != 'sql')
			$this->primary = '_id';
		elseif (!$this->primary)
			$this->primary = 'id';
		if (!$this->table && !$this->fluid)
			trigger_error(self::E_NO_TABLE);
		$this->ttl = $ttl ?: 60;
		if (!$this->rel_ttl)
			$this->rel_ttl = 0;
		$this->_ttl = $this->rel_ttl ?: 0;
		if (static::$init == TRUE) return;
		if ($this->fluid)
			static::setup($this->db,$this->getTable(),array());
		$this->initMapper();
	}

	/**
	 * create mapper instance
	 */
	public function initMapper()
	{
		switch ($this->dbsType) {
			case 'jig':
				$this->mapper = new Jig\Mapper($this->db, $this->table);
				break;
			case 'sql':
				$this->mapper = new SQL\Mapper($this->db, $this->table, $this->whitelist,
					($this->fluid)?0:$this->ttl);
				break;
			case 'mongo':
				$this->mapper = new Mongo\Mapper($this->db, $this->table);
				break;
			default:
				trigger_error(sprintf(self::E_UNKNOWN_DB_ENGINE,$this->dbsType));
		}
		$this->queryParser = CortexQueryParser::instance();
		$this->reset();
		$this->clearFilter();
		$f3 = \Base::instance();
		$this->smartLoading = $f3->exists('CORTEX.smartLoading') ?
			$f3->get('CORTEX.smartLoading') : TRUE;
		$this->standardiseID = $f3->exists('CORTEX.standardiseID') ?
			$f3->get('CORTEX.standardiseID') : TRUE;
		if(!empty($this->fieldConf))
			foreach($this->fieldConf as &$conf) {
				$conf=static::resolveRelationConf($conf);
				unset($conf);
			}
	}

	/**
	 * get fields or set whitelist / blacklist of fields
	 * @param array $fields
	 * @param bool  $exclude
	 * @return array
	 */
	public function fields(array $fields=array(), $exclude=false)
	{
		if ($fields)
			// collect restricted fields for related mappers
			foreach($fields as $i=>$val)
				if(is_int(strpos($val,'.'))) {
					list($key, $relField) = explode('.',$val,2);
					$this->relWhitelist[$key][(int)$exclude][] = $relField;
					unset($fields[$i]);
				}
		$schema = $this->whitelist ?: $this->mapper->fields();
		if (!$schema && !$this->dbsType != 'sql' && $this->dry()) {
			$schema = $this->load()->mapper->fields();
			$this->reset();
		}
		if (!$this->whitelist && $this->fieldConf)
			$schema=array_unique(array_merge($schema,array_keys($this->fieldConf)));
		if (!$fields || empty($fields))
			return $schema;
		elseif ($exclude) {
			$this->whitelist=array_diff($schema,$fields);
		} else
			$this->whitelist=$fields;
		$id=$this->dbsType=='sql'?$this->primary:'_id';
		if(!in_array($id,$this->whitelist))
			$this->whitelist[]=$id;
		$this->initMapper();
		return $this->whitelist;
	}

	/**
	 * set model definition
	 * config example:
	 *  array('title' => array(
	 *          'type' => \DB\SQL\Schema::DT_TEXT,
	 *          'default' => 'new record title',
	 *          'nullable' => true
	 *          )
	 *        '...' => ...
	 *  )
	 * @param array $config
	 */
	function setFieldConfiguration(array $config)
	{
		$this->fieldConf = $config;
		$this->reset();
	}

	/**
	 * returns model field conf array
	 * @return array|null
	 */
	public function getFieldConfiguration()
	{
		return $this->fieldConf;
	}

	/**
	 * kick start to just fetch the config
	 * @return array
	 */
	static public function resolveConfiguration()
	{
		static::$init=true;
		$self = new static();
		static::$init=false;
		$conf = array (
			'table'=>$self->getTable(),
			'fieldConf'=>$self->getFieldConfiguration(),
			'db'=>$self->db,
			'fluid'=>$self->fluid,
			'primary'=>$self->primary,
		);
		unset($self);
		return $conf;
	}

	/**
	 * give this model a reference to the collection it is part of
	 * @param CortexCollection $cx
	 */
	public function addToCollection($cx) {
		$this->collection = $cx;
	}

	/**
	 * returns the collection where this model lives in
	 * @return CortexCollection
	 */
	protected function getCollection()
	{
		return ($this->collection && $this->smartLoading)
			? $this->collection : false;
	}

	/**
	 * returns model table name
	 * @return string
	 */
	public function getTable()
	{
		if (!$this->table && $this->fluid)
			$this->table = strtolower(get_class($this));
		return $this->table;
	}

	/**
	 * setup / update table schema
	 * @static
	 * @param $db
	 * @param $table
	 * @param $fields
	 * @return bool
	 */
	static public function setup($db=null, $table=null, $fields=null)
	{
		/** @var Cortex $self */
		$self = get_called_class();
		if (is_null($db) || is_null($table) || is_null($fields))
			$df = $self::resolveConfiguration();
		if (!is_object($db=(is_string($db=($db?:$df['db']))?\Base::instance()->get($db):$db)))
			trigger_error(self::E_CONNECTION);
		if (strlen($table=$table?:$df['table'])==0)
			trigger_error(self::E_NO_TABLE);
		if (is_null($fields))
			if (!empty($df['fieldConf']))
				$fields = $df['fieldConf'];
			elseif(!$df['fluid']) {
				trigger_error(self::E_FIELD_SETUP);
				return false;
			} else
				$fields = array();
		if ($db instanceof SQL) {
			$schema = new Schema($db);
			// prepare field configuration
			if (!empty($fields))
				foreach($fields as $key => &$field) {
					// fetch relation field types
					$field = static::resolveRelationConf($field);
					// check m:m relation
					if (array_key_exists('has-many', $field)) {
						// m:m relation conf [class,to-key,from-key]
						if (!is_array($relConf = $field['has-many'])) {
							unset($fields[$key]);
							continue;
						}
						$rel = $relConf[0]::resolveConfiguration();
						// check if foreign conf matches m:m
						if (array_key_exists($relConf[1],$rel['fieldConf'])
							&& !is_null($rel['fieldConf'][$relConf[1]])
							&& $relConf['hasRel'] == 'has-many') {
							// compute mm table name
							$mmTable = isset($relConf[2]) ? $relConf[2] :
								static::getMMTableName(
									$rel['table'], $relConf[1], $table, $key,
									$rel['fieldConf'][$relConf[1]]['has-many']);
							if (!in_array($mmTable,$schema->getTables())) {
								$mmt = $schema->createTable($mmTable);
								$mmt->addColumn($relConf[1])->type($relConf['relFieldType']);
								$mmt->addColumn($key)->type($field['type']);
								$index = array($relConf[1],$key);
								sort($index);
								$mmt->addIndex($index);
								$mmt->build();
							}
						}
					}
					// skip virtual fields with no type
					if (!array_key_exists('type', $field)) {
						unset($fields[$key]);
						continue;
					}
					// transform array fields
					if (in_array($field['type'], array(self::DT_JSON, self::DT_SERIALIZED)))
						$field['type']=$schema::DT_TEXT;
					// defaults values
					if (!array_key_exists('nullable', $field))
						$field['nullable'] = true;
					unset($field);
				}
			if (!in_array($table, $schema->getTables())) {
				// create table
				$table = $schema->createTable($table);
				foreach ($fields as $field_key => $field_conf)
					$table->addColumn($field_key, $field_conf);
				if(isset($df) && $df['primary'] != 'id') {
					$table->addColumn($df['primary'])->type_int();
					$table->primary($df['primary']);
				}
				$table->build();
			} else {
				// add missing fields
				$table = $schema->alterTable($table);
				$existingCols = $table->getCols();
				foreach ($fields as $field_key => $field_conf)
					if (!in_array($field_key, $existingCols))
						$table->addColumn($field_key, $field_conf);
				// remove unused fields
				// foreach ($existingCols as $col)
				//     if (!in_array($col, array_keys($fields)) && $col!='id')
				//     $table->dropColumn($col);
				$table->build();
			}
		}
		return true;
	}

	/**
	 * erase all model data, handle with care
	 * @param null $db
	 * @param null $table
	 */
	static public function setdown($db=null, $table=null)
	{
		$self = get_called_class();
		if (is_null($db) || is_null($table))
			$df = $self::resolveConfiguration();
		if (!is_object($db=(is_string($db=($db?:$df['db']))?\Base::instance()->get($db):$db)))
			trigger_error(self::E_CONNECTION);
		if (strlen($table=strtolower($table?:$df['table']))==0)
			trigger_error(self::E_NO_TABLE);
		if (isset($df) && !empty($df['fieldConf']))
			$fields = $df['fieldConf'];
		else
			$fields = array();
		$deletable = array();
		$deletable[] = $table;
		foreach ($fields as $key => $field) {
			$field = static::resolveRelationConf($field);
			if (array_key_exists('has-many',$field)) {
				if (!is_array($relConf = $field['has-many']))
					continue;
				$rel = $relConf[0]::resolveConfiguration();
				// check if foreign conf matches m:m
				if (array_key_exists($relConf[1],$rel['fieldConf']) && !is_null($relConf[1])
					&& key($rel['fieldConf'][$relConf[1]]) == 'has-many') {
					// compute mm table name
					$deletable[] = isset($relConf[2]) ? $relConf[2] :
						static::getMMTableName(
							$rel['table'], $relConf[1], $table, $key,
							$rel['fieldConf'][$relConf[1]]['has-many']);
				}
			}
		}

		if($db instanceof Jig) {
			/** @var Jig $db */
			$dir = $db->dir();
			foreach ($deletable as $item)
				if(file_exists($dir.$item))
					unlink($dir.$item);
		} elseif($db instanceof SQL) {
			/** @var SQL $db */
			$schema = new Schema($db);
			$tables = $schema->getTables();
			foreach ($deletable as $item)
				if(in_array($item, $tables))
					$schema->dropTable($item);
		} elseif($db instanceof Mongo) {
			/** @var Mongo $db */
			foreach ($deletable as $item)
				$db->selectCollection($item)->drop();
		}
	}

	/**
	 * computes the m:m table name
	 * @param string $ftable foreign table
	 * @param string $fkey   foreign key
	 * @param string $ptable own table
	 * @param string $pkey   own key
	 * @param null|array $fConf  foreign conf [class,key]
	 * @return string
	 */
	static protected function getMMTableName($ftable, $fkey, $ptable, $pkey, $fConf=null)
	{
		if ($fConf) {
			list($fclass, $pfkey) = $fConf;
			$self = get_called_class();
			// check for a matching config
			if (!is_int(strpos($fclass, $self)))
				trigger_error(sprintf(self::E_MM_REL_CLASS, $fclass, $self));
			if ($pfkey != $pkey)
				trigger_error(sprintf(self::E_MM_REL_FIELD,
					$fclass.'.'.$pfkey, $self.'.'.$pkey));
		}
		$mmTable = array($ftable.'__'.$fkey, $ptable.'__'.$pkey);
		natcasesort($mmTable);
		$return = strtolower(str_replace('\\', '_', implode('_mm_', $mmTable)));
		return $return;
	}

	/**
	 * get mm table name from config
	 * @param array $conf own relation config
	 * @param string $key relation field
	 * @param null|array $fConf optional foreign config
	 * @return string
	 */
	protected function mmTable($conf, $key, $fConf=null)
	{
		if (!isset($conf['refTable'])) {
			// compute mm table name
			$mmTable = isset($conf[2]) ? $conf[2] :
				static::getMMTableName($conf['relTable'],
					$conf['relField'], $this->getTable(), $key, $fConf);
			$this->fieldConf[$key]['has-many']['refTable'] = $mmTable;
		} else
			$mmTable = $conf['refTable'];
		return $mmTable;
	}

	/**
	 * resolve relation field types
	 * @param $field
	 * @return mixed
	 */
	protected static function resolveRelationConf($field)
	{
		if (array_key_exists('belongs-to-one', $field)) {
			// find primary field definition
			if (!is_array($relConf = $field['belongs-to-one']))
				$relConf = array($relConf, '_id');
			// set field type
			if ($relConf[1] == '_id')
				$field['type'] = Schema::DT_INT4;
			else {
				// find foreign field type
				$fc = $relConf[0]::resolveConfiguration();
				$field['belongs-to-one']['relPK'] = $fc['primary'];
				$field['type'] = $fc['fieldConf'][$relConf[1]]['type'];
			}
			$field['nullable'] = true;
			$field['relType'] = 'belongs-to-one';
		}
		elseif (array_key_exists('belongs-to-many', $field)){
			$field['type'] = self::DT_JSON;
			$field['nullable'] = true;
			$field['relType'] = 'belongs-to-many';
		}
		elseif (array_key_exists('has-many', $field)){
			$field['relType'] = 'has-many';
			if (!isset($field['type']))
				$field['type'] = Schema::DT_INT;
			$relConf = $field['has-many'];
			if(!is_array($relConf))
				return $field;
			$rel = $relConf[0]::resolveConfiguration();
			if(array_key_exists('has-many',$rel['fieldConf'][$relConf[1]])) {
				$field['has-many']['hasRel'] = 'has-many';
				$field['has-many']['relTable'] = $rel['table'];
				$field['has-many']['relField'] = $relConf[1];
				$field['has-many']['relFieldType'] = isset($rel['fieldConf'][$relConf[1]]['type']) ?
					$rel['fieldConf'][$relConf[1]]['type'] : Schema::DT_INT;
				$field['has-many']['relPK'] = isset($relConf[3])?$relConf[3]:$rel['primary'];
			} else {
				$field['has-many']['hasRel'] = 'belongs-to-one';
				$toConf=$rel['fieldConf'][$relConf[1]]['belongs-to-one'];
				if (is_array($toConf))
					$field['has-many']['relField'] = $toConf[1];
			}
		} elseif(array_key_exists('has-one', $field))
			$field['relType'] = 'has-one';
		return $field;
	}

	/**
	 * Return an array of result arrays matching criteria
	 * @param null $filter
	 * @param array $options
	 * @param int $ttl
	 * @param int $rel_depths
	 * @return array
	 */
	public function afind($filter = NULL, array $options = NULL, $ttl = 0, $rel_depths = 1)
	{
		$result = $this->find($filter, $options, $ttl);
		return $result ? $result->castAll($rel_depths): NULL;
	}

	/**
	 * Return an array of objects matching criteria
	 * @param array|null $filter
	 * @param array|null $options
	 * @param int        $ttl
	 * @return CortexCollection
	 */
	public function find($filter = NULL, array $options = NULL, $ttl = 0)
	{
		$sort=false;
		if ($this->dbsType!='sql') {
			if (!empty($this->countFields))
				// see if reordering is needed
				foreach($this->countFields as $counter) {
					if ($options && isset($options['order']) &&
						preg_match('/count_'.$counter.'\h+(asc|desc)/i',$options['order'],$match))
						$sort=true;
				}
			if ($sort) {
				// backup slice settings
				if (isset($options['limit'])) {
					$limit = $options['limit'];
					unset($options['limit']);
				}
				if (isset($options['offset'])) {
					$offset = $options['offset'];
					unset($options['offset']);
				}
			}
		}
		$this->_ttl=$ttl?:$this->rel_ttl;
		$result = $this->filteredFind($filter,$options,$ttl);
		if (empty($result))
			return false;
		foreach($result as &$record) {
			$record = $this->factory($record);
			unset($record);
		}
		if (!empty($this->countFields))
			// add counter for NoSQL engines
			foreach($this->countFields as $counter)
				foreach($result as &$mapper) {
					$cr=$mapper->get($counter);
					$mapper->virtual('count_'.$counter,$cr?count($cr):null);
					unset($mapper);
				}
		$cc = new CortexCollection();
		$cc->setModels($result);
		if($sort) {
			$cc->orderBy($options['order']);
			$cc->slice(isset($offset)?$offset:0,isset($limit)?$limit:NULL);
		}
		$this->clearFilter();
		return $cc;
	}

	/**
	 * wrapper for custom find queries
	 * @param array $filter
	 * @param array $options
	 * @param int $ttl
	 * @param bool $count
	 * @return array|false array of underlying cursor objects
	 */
	protected function filteredFind($filter = NULL, array $options = NULL, $ttl = 0, $count=false)
	{
		if ($this->grp_stack) {
			if ($this->dbsType == 'mongo') {
				$group = array(
					'keys' => $this->grp_stack['keys'],
					'reduce' => 'function (obj, prev) {'.$this->grp_stack['reduce'].'}',
					'initial' => $this->grp_stack['initial'],
					'finalize' => $this->grp_stack['finalize'],
				);
				if ($options && isset($options['group'])) {
					if(is_array($options['group']))
						$options['group'] = array_merge($options['group'],$group);
					else {
						$keys = explode(',',$options['group']);
						$keys = array_combine($keys,array_fill(0,count($keys),1));
						$group['keys'] = array_merge($group['keys'],$keys);
						$options['group'] = $group;
					}
				} else
					$options = array('group'=>$group);
			}
			if($this->dbsType == 'sql') {
				if ($options && isset($options['group']))
					$options['group'].= ','.$this->grp_stack;
				else
					$options['group'] = $this->grp_stack;
			}
			// Jig can't group yet, but pending enhancement https://github.com/bcosca/fatfree/pull/616
		}
		if ($this->dbsType == 'sql' && !$count) {
			$m_refl=new \ReflectionObject($this->mapper);
			$m_ad_prop=$m_refl->getProperty('adhoc');
			$m_ad_prop->setAccessible(true);
			$m_refl_adhoc=$m_ad_prop->getValue($this->mapper);
			$m_ad_prop->setAccessible(false);
			unset($m_ad_prop,$m_refl);
		}
		$hasJoin = array();
		if ($this->hasCond) {
			foreach($this->hasCond as $key => $hasCond) {
				$addToFilter = null;
				if ($deep = is_int(strpos($key,'.'))) {
					$key = rtrim($key,'.');
					$hasCond = array(null,null);
				}
				list($has_filter,$has_options) = $hasCond;
				$type = $this->fieldConf[$key]['relType'];
				$fromConf = $this->fieldConf[$key][$type];
				switch($type) {
					case 'has-one':
					case 'has-many':
						if (!is_array($fromConf))
							trigger_error(sprintf(self::E_REL_CONF_INC, $key));
						$id = $this->dbsType == 'sql' ? $this->primary : '_id';
						if ($type=='has-many' && isset($fromConf['relField'])
							&& $fromConf['hasRel'] == 'belongs-to-one')
							$id=$fromConf['relField'];
						// many-to-many
						if ($type == 'has-many' && $fromConf['hasRel'] == 'has-many') {
							if (!$deep && $this->dbsType == 'sql'
								&& !isset($has_options['limit']) && !isset($has_options['offset'])) {
								$hasJoin = array_merge($hasJoin,
									$this->_hasJoinMM_sql($key,$hasCond,$filter,$options));
								$options['group'] = (isset($options['group'])?$options['group'].',':'').
									$this->db->quotekey($this->table.'.'.$this->primary);
								$groupFields = explode(',', preg_replace('/"/','',$options['group']));
								// all non-aggregated fields need to be present in the GROUP BY clause
								if (isset($m_refl_adhoc) && preg_match('/sybase|dblib|odbc|sqlsrv/i',$this->db->driver()))
									foreach (array_diff($this->mapper->fields(),array_keys($m_refl_adhoc)) as $field)
										if (!in_array($this->table.'.'.$field,$groupFields))
											$options['group'] .= ', '.$this->db->quotekey($this->table.'.'.$field);
							}
							elseif ($result = $this->_hasRefsInMM($key,$has_filter,$has_options,$ttl))
								$addToFilter = array($id.' IN ?', $result);
						} // *-to-one
						elseif ($result = $this->_hasRefsIn($key,$has_filter,$has_options,$ttl))
							$addToFilter = array($id.' IN ?', $result);
						break;
					// one-to-*
					case 'belongs-to-one':
						if (!$deep && $this->dbsType == 'sql'
							&& !isset($has_options['limit']) && !isset($has_options['offset'])) {
							if (!is_array($fromConf))
								$fromConf = array($fromConf, '_id');
							$rel = $fromConf[0]::resolveConfiguration();
							if ($this->dbsType == 'sql' && $fromConf[1] == '_id')
								$fromConf[1] = $rel['primary'];
							$hasJoin[] = $this->_hasJoin_sql($key,$rel['table'],$hasCond,$filter,$options);
						} elseif ($result = $this->_hasRefsIn($key,$has_filter,$has_options,$ttl))
								$addToFilter = array($key.' IN ?', $result);
						break;
					default:
						trigger_error(self::E_HAS_COND);
				}
				if (isset($result) && !isset($addToFilter))
					return false;
				elseif (isset($addToFilter)) {
					if (!$filter)
						$filter = array('');
					if (!empty($filter[0]))
						$filter[0] .= ' and ';
					$cond = array_shift($addToFilter);
					if ($this->dbsType=='sql')
						$cond = $this->_sql_quoteCondition($cond,$this->db->quotekey($this->getTable()));
					$filter[0] .= '('.$cond.')';
					$filter = array_merge($filter, $addToFilter);
				}
			}
			$this->hasCond = null;
		}
		$filter = $this->queryParser->prepareFilter($filter,$this->dbsType,$this->fieldConf);
		if ($this->dbsType=='sql') {
			$qtable = $this->db->quotekey($this->table);
			if (isset($options['order']) && $this->db->driver() == 'pgsql')
				// PostgreSQLism: sort NULL values to the end of a table
				$options['order'] = preg_replace('/\h+DESC/i',' DESC NULLS LAST',$options['order']);
			if (!empty($hasJoin)) {
				// assemble full sql query
				$adhoc='';
				if ($count)
					$sql = 'SELECT COUNT(*) AS '.$this->db->quotekey('rows').' FROM '.$qtable;
				else {
					if (!empty($this->preBinds)) {
						$crit = array_shift($filter);
						$filter = array_merge($this->preBinds,$filter);
						array_unshift($filter,$crit);
					}
					if (!empty($m_refl_adhoc))
						foreach ($m_refl_adhoc as $key=>$val)
							$adhoc.=', '.$val['expr'].' AS '.$key;
					$sql = 'SELECT '.$qtable.'.*'.$adhoc.' FROM '.$qtable;
				}
				$sql .= ' '.implode(' ',$hasJoin).' WHERE '.$filter[0];
				if (!$count) {
					if (isset($options['group']))
						$sql .= ' GROUP BY '.$this->_sql_quoteCondition($options['group'], $this->table);
					if (isset($options['order']))
						$sql .= ' ORDER BY '.$options['order'];
					if (preg_match('/mssql|sqlsrv|odbc/', $this->db->driver()) &&
						(isset($options['limit']) || isset($options['offset']))) {
						$ofs=isset($options['offset'])?(int)$options['offset']:0;
						$lmt=isset($options['limit'])?(int)$options['limit']:0;
						if (strncmp($this->db->version(),'11',2)>=0) {
							// SQL Server 2012
							if (!isset($options['order']))
								$sql.=' ORDER BY '.$this->db->quotekey($this->primary);
							$sql.=' OFFSET '.$ofs.' ROWS'.($lmt?' FETCH NEXT '.$lmt.' ROWS ONLY':'');
						} else {
							// SQL Server 2008
							$order=(!isset($options['order']))
								?($this->db->quotekey($this->table.'.'.$this->primary)):$options['order'];
							$sql=str_replace('SELECT','SELECT '.($lmt>0?'TOP '.($ofs+$lmt):'').' ROW_NUMBER() '.
								'OVER (ORDER BY '.$order.') AS rnum,',$sql);
							$sql='SELECT * FROM ('.$sql.') x WHERE rnum > '.($ofs);
						}
					} else {
						if (isset($options['limit']))
							$sql.=' LIMIT '.(int)$options['limit'];
						if (isset($options['offset']))
							$sql.=' OFFSET '.(int)$options['offset'];
					}
				}
				unset($filter[0]);
				$result = $this->db->exec($sql, $filter, $ttl);
				if ($count)
					return $result[0]['rows'];
				foreach ($result as &$record) {
					// factory new mappers
					$mapper = clone($this->mapper);
					$mapper->reset();
					// TODO: refactor this. Reflection can be removed for F3 >= v3.4.1
					$mapper->query= array($record);
					$m_adhoc = empty($adhoc) ? array() : $m_refl_adhoc;
					foreach ($record as $key=>$val)
						if (isset($m_refl_adhoc[$key]))
							$m_adhoc[$key]['value']=$val;
						else
							$mapper->set($key, $val);
					if (!empty($adhoc)) {
						$refl = new \ReflectionObject($mapper);
						$prop = $refl->getProperty('adhoc');
						$prop->setAccessible(true);
						$prop->setValue($mapper,$m_adhoc);
						$prop->setAccessible(false);
					}
					$record = $mapper;
					unset($record, $mapper);
				}
				return $result;
			} elseif (!empty($this->preBinds) && !$count) {
				// bind values to adhoc queries
				if (!$filter)
					// we (PDO) need any filter to bind values
					$filter = array('1=1');
				$crit = array_shift($filter);
				$filter = array_merge($this->preBinds,$filter);
				array_unshift($filter,$crit);
			}
		}
		return ($count)
			? $this->mapper->count($filter,$ttl)
			: $this->mapper->find($filter,$this->queryParser->prepareOptions($options,$this->dbsType),$ttl);
	}

	/**
	 * Retrieve first object that satisfies criteria
	 * @param null  $filter
	 * @param array $options
	 * @param int   $ttl
	 * @return Cortex
	 */
	public function load($filter = NULL, array $options = NULL, $ttl = 0)
	{
		$this->reset();
		$this->_ttl=$ttl?:$this->rel_ttl;
		$res = $this->filteredFind($filter, $options, $ttl);
		if ($res) {
			$this->mapper->query = $res;
			$this->first();
		} else
			$this->mapper->reset();
		$this->emit('load');
		return $this;
	}

	/**
	 * add has-conditional filter to next find call
	 * @param string $key
	 * @param array $filter
	 * @param null $options
	 * @return $this
	 */
	public function has($key, $filter, $options = null) {
		if (is_string($filter))
			$filter=array($filter);
		if (is_int(strpos($key,'.'))) {
			list($key,$fkey) = explode('.',$key,2);
			if (!isset($this->hasCond[$key.'.']))
				$this->hasCond[$key.'.'] = array();
			$this->hasCond[$key.'.'][$fkey] = array($filter,$options);
		} else {
			if (!isset($this->fieldConf[$key]))
				trigger_error(sprintf(self::E_UNKNOWN_FIELD,$key,get_called_class()));
			if (!isset($this->fieldConf[$key]['relType']))
				trigger_error(self::E_HAS_COND);
			$this->hasCond[$key] = array($filter,$options);
		}
		return $this;
	}

	/**
	 * return IDs of records that has a linkage to this mapper
	 * @param string $key     relation field
	 * @param array  $filter  condition for foreign records
	 * @param array  $options filter options for foreign records
	 * @param int    $ttl
	 * @return array|false
	 */
	protected function _hasRefsIn($key, $filter, $options, $ttl = 0)
	{
		$type = $this->fieldConf[$key]['relType'];
		$fieldConf = $this->fieldConf[$key][$type];
		// one-to-many shortcut
		$rel = $this->getRelFromConf($fieldConf,$key);
		$hasSet = $rel->find($filter, $options, $ttl);
		if (!$hasSet)
			return false;
		$hasSetByRelId = array_unique($hasSet->getAll($fieldConf[1], true));
		return empty($hasSetByRelId) ? false : $hasSetByRelId;
	}

	/**
	 * return IDs of own mappers that match the given relation filter on pivot tables
	 * @param string $key
	 * @param array $filter
	 * @param array $options
	 * @param int $ttl
	 * @return array|false
	 */
	protected function _hasRefsInMM($key, $filter, $options, $ttl=0)
	{
		$fieldConf = $this->fieldConf[$key]['has-many'];
		$rel = $this->getRelInstance($fieldConf[0],null,$key,true);
		$hasSet = $rel->find($filter,$options,$ttl);
		$result = false;
		if ($hasSet) {
			$hasIDs = $hasSet->getAll('_id',true);
			$mmTable = $this->mmTable($fieldConf,$key);
			$pivot = $this->getRelInstance(null,array('db'=>$this->db,'table'=>$mmTable));
			$pivotSet = $pivot->find(array($key.' IN ?',$hasIDs),null,$ttl);
			if ($pivotSet)
				$result = array_unique($pivotSet->getAll($fieldConf['relField'],true));
		}
		return $result;
	}

	/**
	 * build query for SQL pivot table join and merge conditions
	 */
	protected function _hasJoinMM_sql($key, $hasCond, &$filter, &$options)
	{
		$fieldConf = $this->fieldConf[$key]['has-many'];
		$hasJoin = array();
		$mmTable = $this->mmTable($fieldConf,$key);
		$hasJoin[] = $this->_sql_left_join($this->primary,$this->table,$fieldConf['relField'],$mmTable);
		$hasJoin[] = $this->_sql_left_join($key,$mmTable,$fieldConf['relPK'],$fieldConf['relTable']);
		$this->_sql_mergeRelCondition($hasCond,$fieldConf['relTable'],$filter,$options);
		return $hasJoin;
	}

	/**
	 * build query for single SQL table join and merge conditions
	 */
	protected function _hasJoin_sql($key, $table, $cond, &$filter, &$options)
	{
		$relConf = $this->fieldConf[$key]['belongs-to-one'];
		$relModel = is_array($relConf)?$relConf[0]:$relConf;
		$rel = $this->getRelInstance($relModel,null,$key);
		$fkey = is_array($this->fieldConf[$key]['belongs-to-one']) ?
			$this->fieldConf[$key]['belongs-to-one'][1] : $rel->primary;
		$query = $this->_sql_left_join($key,$this->table,$fkey,$table);
		$this->_sql_mergeRelCondition($cond,$table,$filter,$options);
		return $query;
	}

	/**
	 * assemble SQL join query string
	 */
	protected function _sql_left_join($skey,$sTable,$fkey,$fTable)
	{
		$skey = $this->db->quotekey($skey);
		$sTable = $this->db->quotekey($sTable);
		$fkey = $this->db->quotekey($fkey);
		$fTable = $this->db->quotekey($fTable);
		return 'LEFT JOIN '.$fTable.' ON '.$sTable.'.'.$skey.' = '.$fTable.'.'.$fkey;
	}

	/**
	 * merge condition of relation with current condition
	 * @param array $cond		condition of related model
	 * @param string $table		table of related model
	 * @param array $filter		current filter to merge with
	 * @param array $options	current options to merge with
	 */
	protected function _sql_mergeRelCondition($cond, $table, &$filter, &$options)
	{
		$table = $this->db->quotekey($table);
		if (!empty($cond[0])) {
			$whereClause = '('.array_shift($cond[0]).')';
			$whereClause = $this->_sql_quoteCondition($whereClause,$table);
			if (!$filter)
				$filter = array($whereClause);
			elseif (!empty($filter[0]))
				$filter[0] = '('.$this->_sql_quoteCondition($filter[0],
					$this->db->quotekey($this->table)).') and '.$whereClause;
			$filter = array_merge($filter, $cond[0]);
		}
		if ($cond[1] && isset($cond[1]['group'])) {
			$hasGroup = preg_replace('/(\w+)/i', $table.'.$1', $cond[1]['group']);
			$options['group'] .= ','.$hasGroup;
		}
	}

	protected function _sql_quoteCondition($cond, $table)
	{
		$db = $this->db;
		if (preg_match('/[`\'"\[\]]/i',$cond))
			return $cond;
		return preg_replace_callback('/\w+/i',function($match) use($table,$db) {
			if (preg_match('/\b(AND|OR|IN|LIKE|NOT)\b/i',$match[0]))
				return $match[0];
			return $table.'.'.$db->quotekey($match[0]);
		}, $cond);
	}

	/**
	 * add filter for loading related models
	 * @param string $key
	 * @param array $filter
	 * @param array $option
	 * @return $this
	 */
	public function filter($key,$filter=null,$option=null)
	{
		if (is_int(strpos($key,'.'))) {
			list($key,$fkey) = explode('.',$key,2);
			if (!isset($this->relFilter[$key.'.']))
				$this->relFilter[$key.'.'] = array();
			$this->relFilter[$key.'.'][$fkey] = array($filter,$option);
		} else
			$this->relFilter[$key] = array($filter,$option);
		return $this;
	}

	/**
	 * removes one or all relation filter
	 * @param null|string $key
	 */
	public function clearFilter($key = null)
	{
		if (!$key)
			$this->relFilter = array();
		elseif(isset($this->relFilter[$key]))
			unset($this->relFilter[$key]);
	}

	/**
	 * merge the relation filter to the query criteria if it exists
	 * @param string $key
	 * @param array $crit
	 * @return array
	 */
	protected function mergeWithRelFilter($key,$crit)
	{
		if (array_key_exists($key, $this->relFilter) &&
			!empty($this->relFilter[$key][0]))
		{
			$filter = $this->relFilter[$key][0];
			$crit[0] .= ' and '.array_shift($filter);
			$crit = array_merge($crit, $filter);
		}
		return $crit;
	}

	/**
	 * returns the option condition for a relation filter, if defined
	 * @param string $key
	 * @return array null
	 */
	protected function getRelFilterOption($key)
	{
		return (array_key_exists($key, $this->relFilter) &&
			!empty($this->relFilter[$key][1]))
			? $this->relFilter[$key][1] : null;
	}

	/**
	 * Delete object/s and reset ORM
	 * @param $filter
	 * @return void
	 */
	public function erase($filter = null)
	{
		$filter = $this->queryParser->prepareFilter($filter, $this->dbsType);
		if (!$filter && $this->emit('beforeerase')!==false) {
			if ($this->fieldConf) {
				foreach($this->fieldConf as $field => $conf)
					if (isset($conf['has-many']) &&
						$conf['has-many']['hasRel']=='has-many')
						$this->set($field,null);
				$this->save();
			}
			$this->mapper->erase();
			$this->emit('aftererase');
		} elseif($filter)
			$this->mapper->erase($filter);
	}

	/**
	 * Save mapped record
	 * @return mixed
	 **/
	function save()
	{
		if ($new = $this->dry()) {
			if ($this->emit('beforeinsert')===false)
				return false;
			$result=$this->insert();
		} else {
			if ($this->emit('beforeupdate')===false)
				return false;
			$result=$this->update();
		}
		// update changed collections
		$fields = $this->fieldConf;
		if ($fields)
			foreach($fields as $key=>$conf)
				if (!empty($this->fieldsCache[$key]) && $this->fieldsCache[$key] instanceof CortexCollection
					&& $this->fieldsCache[$key]->hasChanged())
					$this->set($key,$this->fieldsCache[$key]->getAll('_id',true));

		// m:m save cascade
		if (!empty($this->saveCsd)) {
			foreach($this->saveCsd as $key => $val) {
				if($fields[$key]['relType'] == 'has-many') {
					$relConf = $fields[$key]['has-many'];
					$mmTable = $this->mmTable($relConf,$key);
					$rel = $this->getRelInstance(null, array('db'=>$this->db, 'table'=>$mmTable));
					$id = $this->get($relConf['relPK'],true);
					// delete all refs
					if (is_null($val))
						$rel->erase(array($relConf['relField'].' = ?', $id));
					// update refs
					elseif (is_array($val)) {
						$rel->erase(array($relConf['relField'].' = ?', $id));
						foreach($val as $v) {
							$rel->set($key,$v);
							$rel->set($relConf['relField'],$id);
							$rel->save();
							$rel->reset();
						}
					}
					unset($rel);
				} elseif($fields[$key]['relType'] == 'has-one') {
					$val->save();
				}
			}
			$this->saveCsd = array();
		}
		$this->emit($new?'afterinsert':'afterupdate');
		return $result;
	}

	/**
	 * Count records that match criteria
	 * @param null $filter
	 * @param int $ttl
	 * @return mixed
	 */
	public function count($filter = NULL, $ttl = 60)
	{
		$has=$this->hasCond;
		$count=$this->filteredFind($filter,null,$ttl,true);
		$this->hasCond=$has;
		return $count;
	}

	/**
	 * Count records that are currently loaded
	 * @return int
	 */
	public function loaded() {
		return count($this->mapper->query);
	}

	/**
	 * add a virtual field that counts occurring relations
	 * @param $key
	 */
	public function countRel($key) {
		if (isset($this->fieldConf[$key])){
			// one-to-one, one-to-many
			if ($this->fieldConf[$key]['relType'] == 'belongs-to-one') {
				if ($this->dbsType == 'sql') {
					$this->set('count_'.$key,'count('.$key.')');
					$this->grp_stack=(!$this->grp_stack)?$key:$this->grp_stack.','.$key;
				} elseif ($this->dbsType == 'mongo')
					$this->_mongo_addGroup(array(
						'keys'=>array($key=>1),
						'reduce' => 'prev.count_'.$key.'++;',
						"initial" => array("count_".$key => 0)
					));
				else
					trigger_error('Cannot add direct relational counter.');
			} elseif($this->fieldConf[$key]['relType'] == 'has-many') {
				$relConf=$this->fieldConf[$key]['has-many'];
			 	if ($relConf['hasRel']=='has-many') {
					// many-to-many
					if ($this->dbsType == 'sql') {
						$mmTable = $this->mmTable($relConf,$key);
						$filter = array($this->db->quotekey($mmTable).'.'.$this->db->quotekey($relConf['relField'])
							.' = '.$this->db->quotekey($this->getTable()).'.'.$this->db->quotekey($this->primary));
						$from=$mmTable;
						if (array_key_exists($key, $this->relFilter) &&
							!empty($this->relFilter[$key][0])) {
							$options=array();
							$from = $mmTable.' '.$this->_sql_left_join($key,$mmTable,$relConf['relPK'],$relConf['relTable']);
							$relFilter = $this->relFilter[$key];
							$this->_sql_mergeRelCondition($relFilter,$relConf['relTable'],$filter,$options);
						}
						$filter = $this->queryParser->prepareFilter($filter,$this->dbsType,$this->fieldConf);
						$crit = array_shift($filter);
						if (count($filter)>0)
							$this->preBinds+=$filter;
						$this->set('count_'.$key,'(select count('.$mmTable.'.'.$relConf['relField'].') from '.$from.
							' where '.$crit.' group by '.$mmTable.'.'.$relConf['relField'].')');
					} else {
						// count rel
						$this->countFields[]=$key;
					}
				} elseif($this->fieldConf[$key]['has-many']['hasRel']=='belongs-to-one') {
					// many-to-one
					if ($this->dbsType == 'sql') {
						$fConf=$relConf[0]::resolveConfiguration();
						$fTable=$this->db->quotekey($fConf['table']);
						$fKey=$this->db->quotekey($fConf['primary']);
						$rKey=$this->db->quotekey($relConf[1]);
						$pKey=$this->db->quotekey($this->primary);
						$table=$this->db->quotekey($this->getTable());
						$crit = $fTable.'.'.$rKey.' = '.$table.'.'.$pKey;
						$filter = $this->mergeWithRelFilter($key,array($crit));
						$filter = $this->queryParser->prepareFilter($filter,$this->dbsType,$this->fieldConf);
						$crit = array_shift($filter);
						if (count($filter)>0)
							$this->preBinds+=$filter;
						$this->set('count_'.$key,'(select count('.$fTable.'.'.$fKey.') from '.$fTable.' where '.
									$crit.' group by '.$fTable.'.'.$rKey.')');
					} else {
						// count rel
						$this->countFields[]=$key;
					}
				}
			}
		}
	}

	/**
	 * merge mongo group options array
	 * @param $opt
	 */
	protected function _mongo_addGroup($opt){
		if (!$this->grp_stack)
			$this->grp_stack = array('keys'=>array(),'initial'=>array(),'reduce'=>'','finalize'=>'');
		if (isset($opt['keys']))
			$this->grp_stack['keys']+=$opt['keys'];
		if (isset($opt['reduce']))
			$this->grp_stack['reduce'].=$opt['reduce'];
		if (isset($opt['initial']))
			$this->grp_stack['initial']+=$opt['initial'];
		if (isset($opt['finalize']))
			$this->grp_stack['finalize'].=$opt['finalize'];
	}

	/**
	 * update a given date or time field with the current time
	 * @param string $key
	 */
	public function touch($key) {
		if (isset($this->fieldConf[$key])
			&& isset($this->fieldConf[$key]['type'])) {
			$type = $this->fieldConf[$key]['type'];
			$date = ($this->dbsType=='sql' && preg_match('/mssql|sybase|dblib|odbc|sqlsrv/',
				$this->db->driver())) ? 'Ymd' : 'Y-m-d';
			if ($type == Schema::DT_DATETIME || Schema::DT_TIMESTAMP)
				$this->set($key,date($date.' H:i:s'));
			elseif ($type == Schema::DT_DATE)
				$this->set($key,date($date));
		}
	}

	/**
	 * Bind value to key
	 * @return mixed
	 * @param $key string
	 * @param $val mixed
	 */
	function set($key, $val)
	{
		$fields = $this->fieldConf;
		unset($this->fieldsCache[$key]);
		// pre-process if field config available
		if (!empty($fields) && isset($fields[$key]) && is_array($fields[$key])) {
			// handle relations
			if (isset($fields[$key]['belongs-to-one'])) {
				// one-to-many, one-to-one
				if (is_null($val))
					$val = NULL;
				elseif (is_object($val) &&
					!($this->dbsType=='mongo' && $val instanceof \MongoId)) {
					// fetch fkey from mapper
					if (!$val instanceof Cortex || $val->dry())
						trigger_error(self::E_INVALID_RELATION_OBJECT);
					else {
						$relConf = $fields[$key]['belongs-to-one'];
						$rel_field = (is_array($relConf) ? $relConf[1] : '_id');
						$val = $val->get($rel_field,true);
					}
				} elseif ($this->dbsType == 'mongo' && !$val instanceof \MongoId)
					$val = new \MongoId($val);
			} elseif (isset($fields[$key]['has-one'])){
				$relConf = $fields[$key]['has-one'];
				if (is_null($val)) {
					$val = $this->get($key);
					$val->set($relConf[1],NULL);
				} else {
					if (!$val instanceof Cortex) {
						$rel = $this->getRelInstance($relConf[0],null,$key);
						$rel->load(array('_id = ?', $val));
						$val = $rel;
					}
					$val->set($relConf[1], $this->_id);
				}
				$this->saveCsd[$key] = $val;
				return $val;
			} elseif (isset($fields[$key]['belongs-to-many'])) {
				// many-to-many, unidirectional
				$fields[$key]['type'] = self::DT_JSON;
				$relConf = $fields[$key]['belongs-to-many'];
				$rel_field = (is_array($relConf) ? $relConf[1] : '_id');
				$val = $this->getForeignKeysArray($val, $rel_field, $key);
			}
			elseif (isset($fields[$key]['has-many'])) {
				// many-to-many, bidirectional
				$relConf = $fields[$key]['has-many'];
				if ($relConf['hasRel'] == 'has-many') {
					// custom setter
					$val = $this->emit('set_'.$key, $val);
					$val = $this->getForeignKeysArray($val,'_id',$key);
					$this->saveCsd[$key] = $val; // array of keys
					return $val;
				} elseif ($relConf['hasRel'] == 'belongs-to-one') {
					// TODO: many-to-one, bidirectional, inverse way
					trigger_error("not implemented");
				}
			}
			// convert array content
			if (is_array($val) && $this->dbsType == 'sql')
				if ($fields[$key]['type'] == self::DT_SERIALIZED)
					$val = serialize($val);
				elseif ($fields[$key]['type'] == self::DT_JSON)
					$val = json_encode($val);
				else
					trigger_error(sprintf(self::E_ARRAY_DATATYPE, $key));
			// add nullable polyfill
			if ($val === NULL && ($this->dbsType == 'jig' || $this->dbsType == 'mongo')
				&& array_key_exists('nullable', $fields[$key]) && $fields[$key]['nullable'] === false)
				trigger_error(sprintf(self::E_NULLABLE_COLLISION,$key));
			// MongoId shorthand
			if ($this->dbsType == 'mongo' && !$val instanceof \MongoId) {
				if ($key == '_id')
					$val = new \MongoId($val);
				elseif (preg_match('/INT/i',$fields[$key]['type'])
					&& !isset($fields[$key]['relType']))
					$val = (int) $val;
			}
			if (preg_match('/BOOL/i',$fields[$key]['type'])) {
				$val = !$val || $val==='false' ? false : (bool) $val;
				if ($this->dbsType == 'sql')
					$val = (int) $val;
			}
		}
		// fluid SQL
		if ($this->fluid && $this->dbsType == 'sql') {
			$schema = new Schema($this->db);
			$table = $schema->alterTable($this->table);
			// add missing field
			if (!in_array($key,$table->getCols())) {
				// determine data type
				if (isset($this->fieldConf[$key]) && isset($this->fieldConf[$key]['type']))
					$type = $this->fieldConf[$key]['type'];
				elseif (is_int($val)) $type = $schema::DT_INT;
				elseif (is_double($val)) $type = $schema::DT_DOUBLE;
				elseif (is_float($val)) $type = $schema::DT_FLOAT;
				elseif (is_bool($val)) $type = $schema::DT_BOOLEAN;
				elseif (date('Y-m-d H:i:s', strtotime($val)) == $val) $type = $schema::DT_DATETIME;
				elseif (date('Y-m-d', strtotime($val)) == $val) $type = $schema::DT_DATE;
				elseif (\UTF::instance()->strlen($val)<=255) $type = $schema::DT_VARCHAR256;
				else $type = $schema::DT_TEXT;
				$table->addColumn($key)->type($type);
				$table->build();
				// update mapper fields
				$newField = $table->getCols(true);
				$newField = $newField[$key];
				$refl = new \ReflectionObject($this->mapper);
				$prop = $refl->getProperty('fields');
				$prop->setAccessible(true);
				$fields = $prop->getValue($this->mapper);
				$fields[$key] = $newField + array('value'=>NULL,'changed'=>NULL);
				$prop->setValue($this->mapper,$fields);
			}
		}
		// custom setter
		$val = $this->emit('set_'.$key, $val);
		return $this->mapper->set($key, $val);
	}

	/**
	 * call custom field handlers
	 * @param $event
	 * @param $val
	 * @return mixed
	 */
	protected function emit($event, $val=null)
	{
		if (isset($this->trigger[$event])) {
			if (preg_match('/^[sg]et_/',$event)) {
				$val = (is_string($f=$this->trigger[$event])
					&& preg_match('/^[sg]et_/',$f))
					? call_user_func(array($this,$event),$val)
					: \Base::instance()->call($f,array($this,$val));
			} else
				$val = \Base::instance()->call($this->trigger[$event],array($this,$val));
		} elseif (preg_match('/^[sg]et_/',$event) && method_exists($this,$event)) {
			$this->trigger[] = $event;
			$val = call_user_func(array($this,$event),$val);
		}
		return $val;
	}

	/**
	 * Define a custom field setter
	 * @param $key
	 * @param $func
	 */
	public function onset($key,$func) {
		$this->trigger['set_'.$key] = $func;
	}

	/**
	 * Define a custom field getter
	 * @param $key
	 * @param $func
	 */
	public function onget($key,$func) {
		$this->trigger['get_'.$key] = $func;
	}

	/**
	 * virtual mapper field setter
	 * @param string $key
	 * @param mixed|callback $val
	 * @return mixed|null
	 */
	public function virtual($key,$val) {
		$this->vFields[$key]=$val;
	}

	/**
	 * Retrieve contents of key
	 * @return mixed
	 * @param string $key
	 * @param bool $raw
	 */
	function &get($key,$raw = false)
	{
		// handle virtual fields
		if (isset($this->vFields[$key])) {
			$out = (is_callable($this->vFields[$key]))
				? call_user_func($this->vFields[$key], $this) : $this->vFields[$key];
			return $out;
		}
		$fields = $this->fieldConf;
		$id = $this->primary;
		if ($key == '_id' && $this->dbsType == 'sql')
			$key = $id;
		if ($this->whitelist && !in_array($key,$this->whitelist)) {
			$out = null;
			return $out;
		}
		if ($raw) {
			$out = $this->exists($key) ? $this->mapper->{$key} : NULL;
			return $out;
		}
		if (!empty($fields) && isset($fields[$key]) && is_array($fields[$key])
			&& !array_key_exists($key,$this->fieldsCache)) {
			// load relations
			if (isset($fields[$key]['belongs-to-one'])) {
				// one-to-X, bidirectional, direct way
				if (!$this->exists($key) || is_null($this->mapper->{$key}))
					$this->fieldsCache[$key] = null;
				else {
					// get config for this field
					$relConf = $fields[$key]['belongs-to-one'];
					// fetch related model
					$rel = $this->getRelFromConf($relConf,$key);
					// am i part of a result collection?
					if ($cx = $this->getCollection()) {
						// does the collection has cached results for this key?
						if (!$cx->hasRelSet($key)) {
							// build the cache, find all values of current key
							$relKeys = array_unique($cx->getAll($key,true));
							// find related models
							$crit = array($relConf[1].' IN ?', $relKeys);
							$relSet = $rel->find($this->mergeWithRelFilter($key, $crit),
								$this->getRelFilterOption($key),$this->_ttl);
							// cache relSet, sorted by ID
							$cx->setRelSet($key, $relSet ? $relSet->getBy($relConf[1]) : NULL);
						}
						// get a subset of the preloaded set
						$result = $cx->getSubset($key,(string) $this->get($key,true));
						$this->fieldsCache[$key] = $result ? $result[0] : NULL;
					} else {
						$crit = array($relConf[1].' = ?', $this->get($key, true));
						$crit = $this->mergeWithRelFilter($key, $crit);
						$this->fieldsCache[$key] = $rel->findone($crit,
							$this->getRelFilterOption($key),$this->_ttl);
					}
				}
			}
			elseif (($type = isset($fields[$key]['has-one']))
				|| isset($fields[$key]['has-many'])) {
				$type = $type ? 'has-one' : 'has-many';
				$fromConf = $fields[$key][$type];
				if (!is_array($fromConf))
					trigger_error(sprintf(self::E_REL_CONF_INC, $key));
				$rel = $this->getRelInstance($fromConf[0],null,$key,true);
				$relFieldConf = $rel->getFieldConfiguration();
				$relType = key($relFieldConf[$fromConf[1]]);
				// one-to-*, bidirectional, inverse way
				if ($relType == 'belongs-to-one') {
					$toConf = $relFieldConf[$fromConf[1]]['belongs-to-one'];
					if(!is_array($toConf))
						$toConf = array($toConf, $id);
					if ($toConf[1] != $id && (!$this->exists($toConf[1])
							|| is_null($this->mapper->get($toConf[1]))))
						$this->fieldsCache[$key] = null;
					elseif($cx = $this->getCollection()) {
						// part of a result set
						if(!$cx->hasRelSet($key)) {
							// emit eager loading
							$relKeys = $cx->getAll($toConf[1],true);
							$crit = array($fromConf[1].' IN ?', $relKeys);
							$relSet = $rel->find($this->mergeWithRelFilter($key,$crit),
								$this->getRelFilterOption($key),$this->_ttl);
							$cx->setRelSet($key, $relSet ? $relSet->getBy($fromConf[1],true) : NULL);
						}
						$result = $cx->getSubset($key, array($this->get($toConf[1])));
						$this->fieldsCache[$key] = $result ? (($type == 'has-one')
							? $result[0][0] : CortexCollection::factory($result[0])) : NULL;
					} else {
						$crit = array($fromConf[1].' = ?', $this->get($toConf[1],true));
						$crit = $this->mergeWithRelFilter($key, $crit);
						$opt = $this->getRelFilterOption($key);
						$this->fieldsCache[$key] = (($type == 'has-one')
							? $rel->findone($crit,$opt,$this->_ttl)
							: $rel->find($crit,$opt,$this->_ttl)) ?: NULL;
					}
				}
				// many-to-many, bidirectional
				elseif ($relType == 'has-many') {
					$toConf = $relFieldConf[$fromConf[1]]['has-many'];
					$mmTable = $this->mmTable($fromConf,$key,$toConf);
					// create mm table mapper
					if (!$this->get($id,true)) {
						$this->fieldsCache[$key] = null;
						return $this->fieldsCache[$key];
					}
					$id = $toConf['relPK'];
					$rel = $this->getRelInstance(null,array('db'=>$this->db,'table'=>$mmTable));
					if ($cx = $this->getCollection()) {
						if (!$cx->hasRelSet($key)) {
							// get IDs of all results
							$relKeys = $cx->getAll($id,true);
							// get all pivot IDs
							$mmRes = $rel->find(array($fromConf['relField'].' IN ?', $relKeys),null,$this->_ttl);
							if (!$mmRes)
								$cx->setRelSet($key, NULL);
							else {
								$pivotRel = array();
								$pivotKeys = array();
								foreach($mmRes as $model) {
									$val = $model->get($key,true);
									$pivotRel[ (string) $model->get($fromConf['relField'])][] = $val;
									$pivotKeys[] = $val;
								}
								// cache pivot keys
								$cx->setRelSet($key.'_pivot', $pivotRel);
								// preload all rels
								$pivotKeys = array_unique($pivotKeys);
								$fRel = $this->getRelInstance($fromConf[0],null,$key,true);
								$crit = array($toConf['relPK'].' IN ?', $pivotKeys);
								$relSet = $fRel->find($this->mergeWithRelFilter($key, $crit),
									$this->getRelFilterOption($key),$this->_ttl);
								$cx->setRelSet($key, $relSet ? $relSet->getBy($id) : NULL);
								unset($fRel);
							}
						}
						// fetch subset from preloaded rels using cached pivot keys
						$fkeys = $cx->getSubset($key.'_pivot', array($this->get($id)));
						$this->fieldsCache[$key] = $fkeys ?
							CortexCollection::factory($cx->getSubset($key, $fkeys[0])) : NULL;
					} // no collection
					else {
						// find foreign keys
						$results = $rel->find(
							array($fromConf['relField'].' = ?', $this->get($fromConf['relPK'],true)),null,$this->_ttl);
						if(!$results)
							$this->fieldsCache[$key] = NULL;
						else {
							$fkeys = $results->getAll($key,true);
							// create foreign table mapper
							unset($rel);
							$rel = $this->getRelInstance($fromConf[0],null,$key,true);
							// load foreign models
							$filter = array($toConf['relPK'].' IN ?', $fkeys);
							$filter = $this->mergeWithRelFilter($key, $filter);
							$this->fieldsCache[$key] = $rel->find($filter,
								$this->getRelFilterOption($key),$this->_ttl);
						}
					}
				}
			}
			elseif (isset($fields[$key]['belongs-to-many'])) {
				// many-to-many, unidirectional
				$fields[$key]['type'] = self::DT_JSON;
				$result = !$this->exists($key) ? null :$this->mapper->get($key);
				if ($this->dbsType == 'sql')
					$result = json_decode($result, true);
				if (!is_array($result))
					$this->fieldsCache[$key] = $result;
				else {
					// create foreign table mapper
					$relConf = $fields[$key]['belongs-to-many'];
					$rel = $this->getRelFromConf($relConf,$key);
					$fkeys = array();
					foreach ($result as $el)
						$fkeys[] = is_int($el)||ctype_digit($el)?(int)$el:(string)$el;
					// if part of a result set
					if ($cx = $this->getCollection()) {
						if (!$cx->hasRelSet($key)) {
							// find all keys
							$relKeys = ($cx->getAll($key,true));
							if ($this->dbsType == 'sql'){
								foreach ($relKeys as &$val) {
									$val = substr($val, 1, -1);
									unset($val);
								}
								$relKeys = json_decode('['.implode(',',$relKeys).']');
							} else
								$relKeys = call_user_func_array('array_merge', $relKeys);
							// get related models
							$crit = array($relConf[1].' IN ?', array_unique($relKeys));
							$relSet = $rel->find($this->mergeWithRelFilter($key, $crit),
								$this->getRelFilterOption($key),$this->_ttl);
							// cache relSet, sorted by ID
							$cx->setRelSet($key, $relSet ? $relSet->getBy($relConf[1]) : NULL);
						}
						// get a subset of the preloaded set
						$this->fieldsCache[$key] = CortexCollection::factory($cx->getSubset($key, $fkeys));
					} else {
						// load foreign models
						$filter = array($relConf[1].' IN ?', $fkeys);
						$filter = $this->mergeWithRelFilter($key, $filter);
						$this->fieldsCache[$key] = $rel->find($filter,
							$this->getRelFilterOption($key),$this->_ttl);
					}
				}
			}
			// resolve array fields
			elseif (isset($fields[$key]['type'])) {
				if ($this->dbsType == 'sql') {
					if ($fields[$key]['type'] == self::DT_SERIALIZED)
						$this->fieldsCache[$key] = unserialize($this->mapper->{$key});
					elseif ($fields[$key]['type'] == self::DT_JSON)
						$this->fieldsCache[$key] = json_decode($this->mapper->{$key},true);
				}
				if ($this->exists($key) && preg_match('/BOOL/i',$fields[$key]['type'])) {
					$this->fieldsCache[$key] = (bool) $this->mapper->{$key};
				}
			}
		}
		// fetch cached value, if existing
		$val = array_key_exists($key,$this->fieldsCache) ? $this->fieldsCache[$key]
			: (($this->exists($key)) ? $this->mapper->{$key} : null);
		if ($this->dbsType == 'mongo' && $val instanceof \MongoId) {
			// conversion to string makes further processing in template, etc. much easier
			$val = (string) $val;
		}
		// custom getter
		$out = $this->emit('get_'.$key, $val);
		return $out;
	}

	/**
	 * find the ID values of given relation collection
	 * @param $val string|array|object|bool
	 * @param $rel_field string
	 * @param $key string
	 * @return array|Cortex|null|object
	 */
	protected function getForeignKeysArray($val, $rel_field, $key)
	{
		if (is_null($val))
			return NULL;
		if (is_object($val) && $val instanceof CortexCollection)
			$val = $val->expose();
		elseif (is_string($val))
			// split-able string of collection IDs
			$val = \Base::instance()->split($val);
		elseif (!is_array($val) && !(is_object($val)
				&& ($val instanceof Cortex && !$val->dry())))
			trigger_error(sprintf(self::E_MM_REL_VALUE, $key));
		// hydrated mapper as collection
		if (is_object($val)) {
			$nval = array();
			while (!$val->dry()) {
				$nval[] = $val->get($rel_field,true);
				$val->next();
			}
			$val = $nval;
		}
		elseif (is_array($val)) {
			// array of single hydrated mappers, raw ID value or mixed
			$isMongo = ($this->dbsType == 'mongo');
			foreach ($val as &$item) {
				if (is_object($item) &&
					!($isMongo && $item instanceof \MongoId)) {
					if (!$item instanceof Cortex || $item->dry())
						trigger_error(self::E_INVALID_RELATION_OBJECT);
					else $item = $item->get($rel_field,true);
				}
				if ($isMongo && $rel_field == '_id' && is_string($item))
					$item = new \MongoId($item);
				if (is_numeric($item))
					$item = (int) $item;
				unset($item);
			}
		}
		return $val;
	}

	/**
	 * creates and caches related mapper objects
	 * @param string $model
	 * @param array $relConf
	 * @param string $key
	 * @param bool $pushFilter
	 * @return Cortex
	 */
	protected function getRelInstance($model=null,$relConf=null,$key='',$pushFilter=false)
	{
		if (!$model && !$relConf)
			trigger_error(self::E_MISSING_REL_CONF);
		$relConf = $model ? $model::resolveConfiguration() : $relConf;
		$relName = ($model?:'Cortex').'\\'.$relConf['db']->uuid().
			'\\'.$relConf['table'].'\\'.$key;
		if (\Registry::exists($relName)) {
			$rel = \Registry::get($relName);
			$rel->reset();
		} else {
			$rel = $model ? new $model : new Cortex($relConf['db'], $relConf['table']);
			if (!$rel instanceof Cortex)
				trigger_error(self::E_WRONG_RELATION_CLASS);
			\Registry::set($relName, $rel);
		}
		// restrict fields of related mapper
		if(!empty($key) && isset($this->relWhitelist[$key])) {
			if (isset($this->relWhitelist[$key][0]))
				$rel->fields($this->relWhitelist[$key][0],false);
			if (isset($this->relWhitelist[$key][1]))
				$rel->fields($this->relWhitelist[$key][1],true);
		}
		if ($pushFilter && !empty($key)) {
			if (isset($this->relFilter[$key.'.'])) {
				foreach($this->relFilter[$key.'.'] as $fkey=>$conf)
					$rel->filter($fkey,$conf[0],$conf[1]);
			}
			if (isset($this->hasCond[$key.'.'])) {
				foreach($this->hasCond[$key.'.'] as $fkey=>$conf)
					$rel->has($fkey,$conf[0],$conf[1]);
			}
		}
		return $rel;
	}

	/**
	 * get relation model from config
	 * @param $fieldConf
	 * @param $key
	 * @return Cortex
	 */
	protected function getRelFromConf(&$fieldConf, $key) {
		if (!is_array($fieldConf))
			$fieldConf = array($fieldConf, '_id');
		$rel = $this->getRelInstance($fieldConf[0],null,$key,true);
		if($this->dbsType=='sql' && $fieldConf[1] == '_id')
			$fieldConf[1] = $rel->primary;
		return $rel;
	}

	/**
	 * returns a clean/dry model from a relation
	 * @param string $key
	 * @return Cortex
	 */
	public function rel($key)
	{
		$rt = $this->fieldConf[$key]['relType'];
		$rc = $this->fieldConf[$key][$rt];
		if (!is_array($rc))
			$rc = array($rc,'_id');
		return $this->getRelInstance($rc[0],null,$key);
	}

	/**
	 * Return fields of mapper object as an associative array
	 * @return array
	 * @param bool|Cortex $obj
	 * @param int|array $rel_depths depths to resolve relations
	 */
	public function cast($obj = NULL, $rel_depths = 1)
	{
		$fields = $this->mapper->cast( ($obj) ? $obj->mapper : null );
		if (!empty($this->vFields))
			foreach(array_keys($this->vFields) as $key)
				$fields[$key]=$this->get($key);
		if (is_int($rel_depths))
			$rel_depths = array('*'=>$rel_depths-1);
		elseif (is_array($rel_depths))
			$rel_depths['*'] = isset($rel_depths['*'])?--$rel_depths['*']:-1;
		if (!empty($this->fieldConf)) {
			$fields += array_fill_keys(array_keys($this->fieldConf),NULL);
			if($this->whitelist)
				$fields = array_intersect_key($fields, array_flip($this->whitelist));
			$mp = $obj ? : $this;
			foreach ($fields as $key => &$val) {
				// post process configured fields
				if (isset($this->fieldConf[$key]) && is_array($this->fieldConf[$key])) {
					// handle relations
					$rd = isset($rel_depths[$key]) ? $rel_depths[$key] : $rel_depths['*'];
					if ((is_array($rd) || $rd >= 0) && $type=preg_grep('/[belongs|has]-(to-)*[one|many]/',
							array_keys($this->fieldConf[$key]))) {
						$relType=$type[0];
						// cast relations
						$val = (($relType == 'belongs-to-one' || $relType == 'belongs-to-many')
							&& !$mp->exists($key)) ? NULL : $mp->get($key);
						if ($val instanceof Cortex)
							$val = $val->cast(null, $rd);
						elseif ($val instanceof CortexCollection)
							$val = $val->castAll($rd);
					}
					// extract array fields
					elseif (isset($this->fieldConf[$key]['type'])) {
						if ($this->dbsType == 'sql') {
							if ($this->fieldConf[$key]['type'] == self::DT_SERIALIZED)
								$val=unserialize($mp->mapper->{$key});
							elseif ($this->fieldConf[$key]['type'] == self::DT_JSON)
								$val=json_decode($mp->mapper->{$key}, true);
						}
						if ($this->exists($key)
							&& preg_match('/BOOL/i',$this->fieldConf[$key]['type'])) {
							$val = (bool) $mp->mapper->{$key};
						}
					}
				}
				if ($this->dbsType == 'mongo' && $key == '_id')
					$val = (string) $val;
				if ($this->dbsType == 'sql' && $key == 'id' && $this->standardiseID) {
					$fields['_id'] = $val;
					unset($fields[$key]);
				}
				unset($val);
			}
		}
		// custom getter
		foreach ($fields as $key => &$val) {
			$val = $this->emit('get_'.$key, $val);
			unset($val);
		}
		return $fields;
	}

	/**
	 * cast a related collection of mappers
	 * @param string|array $key  array of mapper objects, or field name
	 * @param int $rel_depths  depths to resolve relations
	 * @return array    array of associative arrays
	 */
	function castField($key, $rel_depths=0)
	{
		if (!$key)
			return NULL;
		$mapper_arr = $this->get($key);
		if(!$mapper_arr)
			return NULL;
		$out = array();
		foreach ($mapper_arr as $mp)
			$out[] = $mp->cast(null,$rel_depths);
		return $out;
	}

	/**
	 * wrap result mapper
	 * @param Cursor|array $mapper
	 * @return Cortex
	 */
	protected function factory($mapper)
	{
		if (is_array($mapper)) {
			$mp = clone($this->mapper);
			$mp->reset();
			$cx = $this->factory($mp);
			$cx->copyfrom($mapper);
		} else {
			$cx = clone($this);
			$cx->reset(false);
			$cx->mapper = $mapper;
		}
		$cx->emit('load');
		return $cx;
	}

	public function dry() {
		return $this->mapper->dry();
	}

	/**
	 * hydrate the mapper from hive key or given array
	 * @param string|array $key
	 * @param callback|array|string $fields
	 * @return NULL
	 */
	public function copyfrom($key, $fields = null)
	{
		$f3 = \Base::instance();
		$srcfields = is_array($key) ? $key : $f3->get($key);
		if ($fields)
			if (is_callable($fields))
				$srcfields = $fields($srcfields);
			else {
				if (is_string($fields))
					$fields = $f3->split($fields);
				$srcfields = array_intersect_key($srcfields, array_flip($fields));
			}
		foreach ($srcfields as $key => $val) {
			if (isset($this->fieldConf[$key]) && isset($this->fieldConf[$key]['type'])) {
				if ($this->fieldConf[$key]['type'] == self::DT_JSON && is_string($val))
					$val = json_decode($val);
				elseif ($this->fieldConf[$key]['type'] == self::DT_SERIALIZED && is_string($val))
					$val = unserialize($val);
			}
			$this->set($key, $val);
		}
	}

	/**
	 * copy mapper values into hive key
	 * @param string $key the hive key to copy into
	 * @param int $relDepth the depth of relations to resolve
	 * @return NULL|void
	 */
	public function copyto($key, $relDepth=0) {
		\Base::instance()->set($key, $this->cast(null,$relDepth));
	}

	public function skip($ofs = 1)
	{
		$this->reset(false);
		if ($this->mapper->skip($ofs))
			return $this;
		else
			$this->reset(false);
	}

	public function first()
	{
		$this->reset(false);
		$this->mapper->first();
		return $this;
	}

	public function last()
	{
		$this->reset(false);
		$this->mapper->last();
		return $this;
	}

	/**
	 * reset and re-initialize the mapper
	 * @param bool $mapper
	 * @return NULL|void
	 */
	public function reset($mapper = true)
	{
		if ($mapper)
			$this->mapper->reset();
		$this->fieldsCache=array();
		$this->saveCsd=array();
		$this->countFields=array();
		$this->preBinds=array();
		$this->grp_stack=null;
		// set default values
		if (($this->dbsType == 'jig' || $this->dbsType == 'mongo')
			&& !empty($this->fieldConf))
			foreach($this->fieldConf as $field_key => $field_conf)
				if (array_key_exists('default',$field_conf)) {
					$val = ($field_conf['default'] === \DB\SQL\Schema::DF_CURRENT_TIMESTAMP)
						? date('Y-m-d H:i:s') : $field_conf['default'];
					$this->set($field_key, $val);
				}
	}

	/**
	 * check if a certain field exists in the mapper or
	 * or is a virtual relation field
	 * @param string $key
	 * @param bool $relField
	 * @return bool
	 */
	function exists($key, $relField = false) {
		if (!$this->dry() && $key == '_id') return true;
		return $this->mapper->exists($key) ||
			($relField && isset($this->fieldConf[$key]['relType']));
	}

	/**
	 * clear any mapper field or relation
	 * @param string $key
	 * @return NULL|void
	 */
	function clear($key) {
		unset($this->fieldsCache[$key]);
		if (isset($this->fieldConf[$key]['relType']))
			$this->set($key,null);
		$this->mapper->clear($key);
	}

	function insert() {
		$res = $this->mapper->insert();
		if (is_array($res))
			$res = $this->mapper;
		if (is_object($res))
			$res = $this->factory($res);
		return is_int($res) ? $this : $res;
	}

	function update() {
		$res = $this->mapper->update();
		if (is_array($res))
			$res = $this->mapper;
		if (is_object($res))
			$res = $this->factory($res);
		return is_int($res) ? $this : $res;
	}

	function dbtype() {
		return $this->mapper->dbtype();
	}

	public function __destruct() {
		unset($this->mapper);
	}

	public function __clone() {
		$this->mapper = clone($this->mapper);
	}

	function getiterator() {
//		return new \ArrayIterator($this->cast(null,false));
		return new \ArrayIterator(array());
	}
}


class CortexQueryParser extends \Prefab {

	const
		E_BRACKETS = 'Invalid query: unbalanced brackets found',
		E_INBINDVALUE = 'Bind value for IN operator must be a populated array',
		E_ENGINEERROR = 'Engine not supported',
		E_MISSINGBINDKEY = 'Named bind parameter `%s` does not exist in filter arguments';

	protected
		$queryCache = array();

	/**
	 * converts the given filter array to fit the used DBS
	 *
	 * example filter:
	 *   array('text = ? AND num = ?','bar',5)
	 *   array('num > ? AND num2 <= ?',5,10)
	 *   array('num1 > num2')
	 *   array('text like ?','%foo%')
	 *   array('(text like ? OR text like ?) AND num != ?','foo%','%bar',23)
	 *
	 * @param array $cond
	 * @param string $engine
	 * @param null $fieldConf
	 * @return array|bool|null
	 */
	public function prepareFilter($cond, $engine,$fieldConf=null)
	{
		if (is_null($cond)) return $cond;
		if (is_string($cond))
			$cond = array($cond);
		$f3 = \Base::instance();
		$cacheHash = $f3->hash($f3->stringify($cond)).'.'.$engine;
		if (isset($this->queryCache[$cacheHash]))
			// load from memory
			return $this->queryCache[$cacheHash];
		elseif ($f3->exists('CORTEX.queryParserCache')
			&& ($ttl = (int) $f3->get('CORTEX.queryParserCache'))) {
			$cache = \Cache::instance();
			// load from cache
			if ($f3->get('CACHE') && $ttl && ($cached = $cache->exists($cacheHash, $ncond))
				&& $cached[0] + $ttl > microtime(TRUE)) {
				$this->queryCache[$cacheHash] = $ncond;
				return $ncond;
			}
		}
		$where = array_shift($cond);
		$args = $cond;
		$where = str_replace(array('&&', '||'), array('AND', 'OR'), $where);
		// prepare IN condition
		$where = preg_replace('/\bIN\b\s*\(\s*(\?|:\w+)?\s*\)/i', 'IN $1', $where);
		switch ($engine) {
			case 'jig':
				$ncond = $this->_jig_parse_filter($where, $args);
				break;
			case 'mongo':
				$parts = $this->splitLogical($where);
				if (is_int(strpos($where, ':')))
					list($parts, $args) = $this->convertNamedParams($parts, $args);
				foreach ($parts as &$part) {
					$part = $this->_mongo_parse_relational_op($part, $args, $fieldConf);
					unset($part);
				}
				$ncond = $this->_mongo_parse_logical_op($parts);
				break;
			case 'sql':
				// preserve identifier
				$where = preg_replace('/(?!\B)_id/', 'id', $where);
				$parts = $this->splitLogical($where);
				// ensure positional bind params
				if (is_int(strpos($where, ':')))
					list($parts, $args) = $this->convertNamedParams($parts, $args);
				$ncond = array();
				foreach ($parts as &$part) {
					// enhanced IN handling
					if (is_int(strpos($part, '?'))) {
						$val = array_shift($args);
						if (is_int($pos = strpos($part, 'IN ?'))) {
							if (!is_array($val) || empty($val))
								trigger_error(self::E_INBINDVALUE);
							$bindMarks = str_repeat('?,', count($val) - 1).'?';
							$part = substr($part, 0, $pos).'IN ('.$bindMarks.')';
							$ncond = array_merge($ncond, $val);
						} else
							$ncond[] = $val;
					}
					unset($part);
				}
				array_unshift($ncond, implode(' ', $parts));
				break;
			default:
				trigger_error(self::E_ENGINEERROR);
		}
		$this->queryCache[$cacheHash] = $ncond;
		if(isset($ttl) && $f3->get('CACHE')) {
			// save to cache
			$cache = \Cache::instance();
			$cache->set($cacheHash,$ncond,$ttl);
		}
		return $ncond;
	}

	/**
	 * split where criteria string into logical chunks
	 * @param $cond
	 * @return array
	 */
	protected function splitLogical($cond)
	{
		return preg_split('/\s*((?<!\()\)|\((?!\))|\bAND\b|\bOR\b)\s*/i', $cond, -1,
			PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
	}

	/**
	 * converts named parameter filter to positional
	 * @param $parts
	 * @param $args
	 * @return array
	 */
	protected function convertNamedParams($parts, $args)
	{
		if (empty($args)) return array($parts, $args);
		$params = array();
		$pos = 0;
		foreach ($parts as &$part) {
			if (preg_match('/:\w+/i', $part, $match)) {
				if (!isset($args[$match[0]]))
					trigger_error(sprintf(self::E_MISSINGBINDKEY,
						$match[0]));
				$part = str_replace($match[0], '?', $part);
				$params[] = $args[$match[0]];
			} elseif (is_int(strpos($part, '?')))
				$params[] = $args[$pos++];
			unset($part);
		}
		return array($parts, $params);
	}

	/**
	 * convert filter array to jig syntax
	 * @param $where
	 * @param $args
	 * @return array
	 */
	protected function _jig_parse_filter($where, $args)
	{
		$parts = $this->splitLogical($where);
		if (is_int(strpos($where, ':')))
			list($parts, $args) = $this->convertNamedParams($parts, $args);
		$ncond = array();
		foreach ($parts as &$part) {
			if (in_array(strtoupper($part), array('AND', 'OR')))
				continue;
			// prefix field names
			$part = preg_replace('/([a-z_-]+)/i', '@$1', $part, -1, $count);
			// value comparison
			if (is_int(strpos($part, '?'))) {
				$val = array_shift($args);
				preg_match('/(@\w+)/i', $part, $match);
				// find like operator
				if (is_int(strpos($upart = strtoupper($part), ' @LIKE '))) {
					if ($not = is_int($npos = strpos($upart, '@NOT')))
						$pos = $npos;
					$val = $this->_likeValueToRegEx($val);
					$part = ($not ? '!' : '').'preg_match(?,'.$match[0].')';
				} // find IN operator
				else if (is_int($pos = strpos($upart, ' @IN '))) {
					if ($not = is_int($npos = strpos($upart, '@NOT')))
						$pos = $npos;
					$part = ($not ? '!' : '').'in_array('.substr($part, 0, $pos).
						',array(\''.implode('\',\'', $val).'\'))';
					unset($val);
				}
				// add existence check
				$part = '(isset('.$match[0].') && '.$part.')';
				if (isset($val))
					$ncond[] = $val;
			} elseif ($count >= 1) {
				// field comparison
				preg_match_all('/(@\w+)/i', $part, $matches);
				$chks = array();
				foreach ($matches[0] as $field)
					$chks[] = 'isset('.$field.')';
				$part = '('.implode(' && ',$chks).' && ('.$part.'))';
			}
			unset($part);
		}
		array_unshift($ncond, implode(' ', $parts));
		return $ncond;
	}

	/**
	 * find and wrap logical operators AND, OR, (, )
	 * @param $parts
	 * @return array
	 */
	protected function _mongo_parse_logical_op($parts)
	{
		$b_offset = 0;
		$ncond = array();
		$child = array();
		for ($i = 0, $max = count($parts); $i < $max; $i++) {
			$part = $parts[$i];
			if ($part == '(') {
				// add sub-bracket to parse array
				if ($b_offset > 0)
					$child[] = $part;
				$b_offset++;
			} elseif ($part == ')') {
				$b_offset--;
				// found closing bracket
				if ($b_offset == 0) {
					$ncond[] = ($this->_mongo_parse_logical_op($child));
					$child = array();
				} elseif ($b_offset < 0)
					trigger_error(self::E_BRACKETS);
				else
					// add sub-bracket to parse array
					$child[] = $part;
			} // add to parse array
			elseif ($b_offset > 0)
				$child[] = $part;
			// condition type
			elseif (!is_array($part)) {
				if (strtoupper($part) == 'AND')
					$add = true;
				elseif (strtoupper($part) == 'OR')
					$or = true;
			} else // skip
				$ncond[] = $part;
		}
		if ($b_offset > 0)
			trigger_error(self::E_BRACKETS);
		if (isset($add))
			return array('$and' => $ncond);
		elseif (isset($or))
			return array('$or' => $ncond);
		else
			return $ncond[0];
	}

	/**
	 * find and convert relational operators
	 * @param $part
	 * @param $args
	 * @param null $fieldConf
	 * @return array|null
	 */
	protected function _mongo_parse_relational_op($part, &$args, $fieldConf=null)
	{
		if (is_null($part))
			return $part;
		if (preg_match('/\<\=|\>\=|\<\>|\<|\>|\!\=|\=\=|\=|like|not like|in|not in/i', $part, $match)) {
			$var = is_int(strpos($part, '?')) ? array_shift($args) : null;
			$exp = explode($match[0], $part);
			$key = trim($exp[0]);
			// unbound value
			if (is_numeric($exp[1]))
				$var = $exp[1];
			// field comparison
			elseif (!is_int(strpos($exp[1], '?')))
				return array('$where' => 'this.'.$key.' '.$match[0].' this.'.trim($exp[1]));
			$upart = strtoupper($match[0]);
			// MongoID shorthand
			if ($key == '_id' || (isset($fieldConf[$key]) && isset($fieldConf[$key]['relType']))) {
				if (is_array($var))
					foreach ($var as &$id) {
						if (!$id instanceof \MongoId)
							$id = new \MongoId($id);
						unset($id);
					}
				elseif(!$var instanceof \MongoId)
					$var = new \MongoId($var);
			}
			// find LIKE operator
			if (in_array($upart, array('LIKE','NOT LIKE'))) {
				$rgx = $this->_likeValueToRegEx($var);
				$var = new \MongoRegex($rgx);
				if ($upart == 'NOT LIKE')
					$var = array('$not' => $var);
			} // find IN operator
			elseif (in_array($upart, array('IN','NOT IN'))) {
				$var = array(($upart=='NOT IN')?'$nin':'$in' => array_values($var));
			} // translate operators
			elseif (!in_array($match[0], array('==', '='))) {
				$opr = str_replace(array('<>', '<', '>', '!', '='),
					array('$ne', '$lt', '$gt', '$n', 'e'), $match[0]);
				$var = array($opr => (strtolower($var) == 'null') ? null :
						(is_object($var) ? $var : (is_numeric($var) ? $var + 0 : $var)));
			}
			return array($key => $var);
		}
		return $part;
	}

	/**
	 * @param string $var
	 * @return string
	 */
	protected function _likeValueToRegEx($var)
	{
		$lC = substr($var, -1, 1);
		// %var% -> /var/
		if ($var[0] == '%' && $lC == '%')
			$var = '/'.substr($var, 1, -1).'/';
		// var%  -> /^var/
		elseif ($lC == '%')
			$var = '/^'.substr($var, 0, -1).'/';
		// %var  -> /var$/
		elseif ($var[0] == '%')
			$var = '/'.substr($var, 1).'$/';
		return $var;
	}

	/**
	 * convert options array syntax to given engine type
	 *
	 * example:
	 *   array('order'=>'location') // default direction is ASC
	 *   array('order'=>'num1 desc, num2 asc')
	 *
	 * @param array $options
	 * @param string $engine
	 * @return array|null
	 */
	public function prepareOptions($options, $engine)
	{
		if (empty($options) || !is_array($options))
			return null;
		switch ($engine) {
			case 'jig':
				if (array_key_exists('order', $options))
					$options['order'] = str_replace(array('asc', 'desc'),
						array('SORT_ASC', 'SORT_DESC'), strtolower($options['order']));
				break;
			case 'mongo':
				if (array_key_exists('order', $options)) {
					$sorts = explode(',', $options['order']);
					$sorting = array();
					foreach ($sorts as $sort) {
						$sp = explode(' ', trim($sort));
						$sorting[$sp[0]] = (array_key_exists(1, $sp) &&
							strtoupper($sp[1]) == 'DESC') ? -1 : 1;
					}
					$options['order'] = $sorting;
				}
				if (array_key_exists('group', $options) && is_string($options['group'])) {
					$keys = explode(',',$options['group']);
					$options['group']=array('keys'=>array(),'initial'=>array(),
						'reduce'=>'function (obj, prev) {}','finalize'=>'');
					$keys = array_combine($keys,array_fill(0,count($keys),1));
					$options['group']['keys']=$keys;
					$options['group']['initial']=$keys;
				}
				break;
		}
		return $options;
	}
}

class CortexCollection extends \ArrayIterator {

	protected
		$relSets = array(),
		$pointer = 0,
		$changed = false,
		$cid;

	const
		E_UnknownCID = 'This Collection does not exist: %s',
		E_SubsetKeysValue = '$keys must be an array or split-able string, but %s was given.';

	public function __construct() {
		$this->cid = uniqid('cortex_collection_');
		parent::__construct();
	}

	//! Prohibit cloning to ensure an existing relation cache
	private function __clone() { }

	/**
	 * set a collection of models
	 * @param $models
	 */
	function setModels($models,$init=true) {
		array_map(array($this,'add'),$models);
		if ($init)
			$this->changed = false;
	}

	/**
	 * add single model to collection
	 * @param $model
	 */
	function add(Cortex $model) {
		$model->addToCollection($this);
		$this->append($model);
	}

	public function offsetSet($i, $val) {
		$this->changed=true;
		parent::offsetSet($i,$val);
	}

	public function hasChanged() {
		return $this->changed;
	}

	/**
	 * get a related collection
	 * @param $key
	 * @return null
	 */
	public function getRelSet($key) {
		return (isset($this->relSets[$key])) ? $this->relSets[$key] : null;
	}

	/**
	 * set a related collection for caching it for the lifetime of this collection
	 * @param $key
	 * @param $set
	 */
	public function setRelSet($key,$set) {
		$this->relSets[$key] = $set;
	}

	/**
	 * check if a related collection exists in runtime cache
	 * @param $key
	 * @return bool
	 */
	public function hasRelSet($key) {
		return array_key_exists($key,$this->relSets);
	}

	public function expose() {
		return $this->getArrayCopy();
	}

	/**
	 * get an intersection from a cached relation-set, based on given keys
	 * @param string $prop
	 * @param array|string $keys
	 * @return array
	 */
	public function getSubset($prop,$keys) {
		if (is_string($keys))
			$keys = \Base::instance()->split($keys);
		if (!is_array($keys))
			trigger_error(sprintf(self::E_SubsetKeysValue,gettype($keys)));
		if (!$this->hasRelSet($prop) || !($relSet = $this->getRelSet($prop)))
			return null;
		foreach ($keys as &$key) {
			if ($key instanceof \MongoId)
				$key = (string) $key;
			unset($key);
		}
		return array_values(array_intersect_key($relSet, array_flip($keys)));
	}

	/**
	 * returns all values of a specified property from all models
	 * @param string $prop
	 * @param bool $raw
	 * @return array
	 */
	public function getAll($prop, $raw = false)
	{
		$out = array();
		foreach ($this->getArrayCopy() as $model) {
			if ($model->exists($prop,true)) {
				$val = $model->get($prop, $raw);
				if (!empty($val))
					$out[] = $val;
			}
		}
		return $out;
	}

	/**
	 * cast all contained mappers to a nested array
	 * @param int|array $rel_depths depths to resolve relations
	 * @return array
	 */
	public function castAll($rel_depths=1) {
		$out = array();
		foreach ($this->getArrayCopy() as $model)
			$out[] = $model->cast(null,$rel_depths);
		return $out;
	}

	/**
	 * return all models keyed by a specified index key
	 * @param string $index
	 * @param bool $nested
	 * @return array
	 */
	public function getBy($index, $nested = false)
	{
		$out = array();
		foreach ($this->getArrayCopy() as $model)
			if ($model->exists($index)) {
				$val = $model->get($index, true);
				if (!empty($val))
					if($nested) $out[(string) $val][] = $model;
					else        $out[(string) $val] = $model;
			}
		return $out;
	}

	/**
	 * re-assort the current collection using a sql-like syntax
	 * @param $cond
	 */
	public function orderBy($cond){
		$cols=\Base::instance()->split($cond);
		$this->uasort(function($val1,$val2) use($cols) {
			foreach ($cols as $col) {
				$parts=explode(' ',$col,2);
				$order=empty($parts[1])?'ASC':$parts[1];
				$col=$parts[0];
				list($v1,$v2)=array($val1[$col],$val2[$col]);
				if ($out=strnatcmp($v1,$v2)*
					((strtoupper($order)=='ASC')*2-1))
					return $out;
			}
			return 0;
		});
	}

	/**
	 * slice the collection
	 * @param $offset
	 * @param null $limit
	 */
	public function slice($offset,$limit=null) {
		$this->rewind();
		$i=0;
		$del=array();
		while ($this->valid()) {
			if ($i < $offset)
				$del[]=$this->key();
			elseif ($i >= $offset && $limit && $i >= ($offset+$limit))
				$del[]=$this->key();
			$i++;
			$this->next();
		}
		foreach ($del as $ii)
			unset($this[$ii]);
	}

	static public function factory($records) {
		$cc = new self();
		$cc->setModels($records);
		return $cc;
	}

}