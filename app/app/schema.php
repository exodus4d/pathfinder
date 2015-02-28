<?php

namespace App;

class Schema extends Controller
{

    private
        $roundTime = 0,
        $current_test = 1,
        $current_engine,
        $f3,
        $test,
        $tname;

    private function getTime()
    {
        $time = microtime(TRUE) - $this->f3->get('timer') - $this->roundTime;
        $this->roundTime = microtime(TRUE) - $this->f3->get('timer');
        return ' [ '.sprintf('%.3f', $time).'s ]';
    }

    private function getTestDesc($text)
    {
        return $this->getTime().' '.$this->current_engine.': #'.$this->current_test++.' - '.$text;
    }

    function get()
    {
        $this->f3 = \Base::instance();
        $this->test = new \Test;

        $this->f3->set('QUIET', false);
        $this->f3->set('CACHE', false);

        $dbs = array(
            /*'mysql' => new \DB\SQL(
                'mysql:host=localhost;port=3306;dbname=fatfree', 'fatfree', ''
            ),*/
            'sqlite' => new \DB\SQL(
                'sqlite::memory:'
            // 'sqlite:db/sqlite.db'
            ),
            /*'pgsql' => new \DB\SQL(
                'pgsql:host=localhost;dbname=fatfree', 'fatfree', 'fatfree'
            ),*/
            /*'sqlsrv2012' => new \DB\SQL(
                'sqlsrv:SERVER=LOCALHOST\SQLEXPRESS2012;Database=fatfree','fatfree', 'fatfree'
            ),*/
            /*'sqlsrv2008' => new \DB\SQL(
                'sqlsrv:SERVER=LOCALHOST\SQLEXPRESS2008;Database=fatfree','fatfree', 'fatfree'
            )*/
	);

        $this->roundTime = microtime(TRUE) - \Base::instance()->get('timer');
        $this->tname = 'test_table';

        foreach ($dbs as $type => $db) {
            $this->current_engine = $type;
            $this->runTestSuite($db);
            $this->current_test = 1;
        }
        $this->f3->set('results', $this->test->results());
    }

    private function runTestSuite($db)
    {
        $schema = new \DB\SQL\Schema($db);

        $schema->dropTable($this->tname);

        // create table
        $table = $schema->createTable($this->tname);
        $table = $table->build();
        $result = $schema->getTables();
        $this->test->expect(
            in_array($this->tname, $result),
            $this->getTestDesc('create default table')
        );
        unset($result);

        $this->test->expect(
            $table instanceof \DB\SQL\TableModifier,
            $this->getTestDesc('$table->build() returns TableModifier')
        );

        // drop table
        $table->drop();
        $this->test->expect(
            in_array($this->tname, $schema->getTables()) == false,
            $this->getTestDesc('drop table')
        );
        unset($table);

        // create table with columns
        $table = $schema->createTable($this->tname);
        $table->addColumn('title')->type($schema::DT_VARCHAR128);
        $table->addColumn('number')->type($schema::DT_INT4);
        $table = $table->build();
        $r1 = $schema->getTables();
        $r2 = $table->getCols();
        $this->test->expect(
            in_array($this->tname, $r1) && in_array('id', $r2)
            && in_array('title', $r2) && in_array('number', $r2),
            $this->getTestDesc('create new table with additional columns')
        );
        unset($r1,$r2);

        // testing all datatypes
        foreach (array_keys($schema->dataTypes) as $index => $field) {
            // testing column type
            $table->addColumn('column_'.$index)->type($field);
            $table->build();
            $r1 = $table->getCols();
            $this->test->expect(
                in_array('column_'.$index, $r1),
                $this->getTestDesc('adding column ['.$field.'], nullable')
            );
        }
        unset($r1);

        // adding some testing data
        $mapper = new \DB\SQL\Mapper($db, $this->tname);
        $mapper->column_7 = 'hello world';
        $mapper->save();
        $mapper->reset();
        $result = $mapper->findone(array('column_7 = ?', 'hello world'))->cast();
        unset($mapper);
        $this->test->expect(
            $result['column_7'] == 'hello world',
            $this->getTestDesc('mapping dummy data')
        );

        // default value text, not nullable
        $table->addColumn('text_default_not_null')
                    ->type($schema::DT_VARCHAR128)
                    ->nullable(false)->defaults('foo bar');
        $table->build();
        $r1 = $table->getCols(true);
        $this->test->expect(
            in_array('text_default_not_null', array_keys($r1)) &&
            $r1['text_default_not_null']['default'] == 'foo bar' &&
            $r1['text_default_not_null']['nullable'] == false,
            $this->getTestDesc('adding column [VARCHAR128], not nullable with default value')
        );
        unset($r1);

        // some testing dummy data
        $mapper = new \DB\SQL\Mapper($db, $this->tname);
        $mapper->column_7 = 'tanduay';
        $mapper->save();
        $mapper->reset();
        $result = $mapper->findone(array('column_7 = ?','tanduay'))->cast();
        $this->test->expect(
            $result['column_7'] == 'tanduay' &&
            $result['text_default_not_null'] == 'foo bar',
            $this->getTestDesc('mapping dummy data')
        );
        unset($mapper,$result);

        // default value numeric, not nullable
        $table->addColumn('int_default_not_null')
              ->type($schema::DT_INT4)->nullable(false)->defaults(123);
        $table->build();
        $r1 = $table->getCols(true);
        $this->test->expect(
            in_array('int_default_not_null', array_keys($r1)) &&
            $r1['int_default_not_null']['default'] == 123 &&
            $r1['int_default_not_null']['nullable'] == false,
            $this->getTestDesc('adding column [INT4], not nullable with default value')
        );
        unset($r1);

        // adding testing data
        $mapper = new \DB\SQL\Mapper($db, $this->tname);
        $mapper->column_7 = 'test3';
        $mapper->save();
        $mapper->reset();
        $r1 = $mapper->findone(array('column_7 = ?','test3'))->cast();
        $this->test->expect(
            $r1['column_7'] == 'test3' &&
            $r1['int_default_not_null'] == 123,
            $this->getTestDesc('mapping dummy data')
        );
        unset($mapper,$r1);


        // default value text, nullable
        $table->addColumn('text_default_nullable')
              ->type($schema::DT_VARCHAR128)
              ->defaults('foo bar');
        $table->build();
        $r1 = $table->getCols(true);
        $this->test->expect(
            in_array('text_default_nullable', array_keys($r1)) &&
            $r1['text_default_nullable']['default'] == 'foo bar',
            $this->getTestDesc('adding column [VARCHAR128], nullable with default value')
        );
        unset($r1);

        // adding some dummy data
        $mapper = new \DB\SQL\Mapper($db, $this->tname);
        $mapper->column_7 = 'test4';
        $mapper->save();
        $mapper->reset();
        $mapper->column_7 = 'test5';
        $mapper->text_default_nullable = null;
        $mapper->save();
        $mapper->reset();
        $result = $mapper->find(array('column_7 = ? OR column_7 = ?','test4','test5'));
        foreach ($result as &$r)
            $r = $r->cast();

        $this->test->expect(
            array_key_exists(0, $result) && array_key_exists(1, $result) &&
            $result[0]['column_7'] == 'test4' && $result[0]['text_default_nullable'] == 'foo bar' &&
            $result[1]['column_7'] == 'test5' && $result[1]['text_default_nullable'] === null,
            $this->getTestDesc('mapping dummy data')
        );
        unset($mapper, $result);

        // default value numeric, nullable
        $table->addColumn('int_default_nullable')->type($schema::DT_INT4)->defaults(123);
        $table->build();
        $r1 = $table->getCols(true);
        $this->test->expect(
            in_array('int_default_nullable', array_keys($r1)) == true &&
            $r1['int_default_nullable']['default'] == 123,
            $this->getTestDesc('adding column [INT4], nullable with default value')
        );
        unset($r1);

        // adding dummy data
        $mapper = new \DB\SQL\Mapper($db, $this->tname);
        $mapper->column_7 = 'test6';
        $mapper->save();
        $mapper->reset();
        $mapper->column_7 = 'test7';
        $mapper->int_default_nullable = null;
        $mapper->save();
        $mapper->reset();
        $result = $mapper->find(array('column_7 = ? OR column_7 = ?', 'test6', 'test7'));
        foreach ($result as &$r)
            $r = $r->cast();

        $this->test->expect(
            array_key_exists(0, $result) && array_key_exists(1, $result) &&
            $result[0]['column_7'] == 'test6' && $result[0]['int_default_nullable'] === 123 &&
            $result[1]['column_7'] == 'test7' && $result[1]['int_default_nullable'] === null,
            $this->getTestDesc('mapping dummy data')
        );
        unset($mapper, $result);

        // current timestamp
        $table->addColumn('stamp')
              ->type($schema::DT_TIMESTAMP)
              ->nullable(false)
              ->defaults($schema::DF_CURRENT_TIMESTAMP);
        $table->build();
        $r1 = $table->getCols(true);
        $this->test->expect(
            in_array('stamp', array_keys($r1)) &&
            $r1['stamp']['default'] == $schema::DF_CURRENT_TIMESTAMP,
            $this->getTestDesc(
                'adding column [TIMESTAMP], not nullable with current_timestamp default value')
        );
        unset($r1);


        // datetime nullable
        $table->addColumn('datetime')->type_datetime()->nullable(true);
        $table->build();
        $r1 = $table->getCols(true);
        $this->test->expect(
            in_array('datetime', array_keys($r1)) &&
            $r1['datetime']['nullable'] == true,
            $this->getTestDesc(
                'adding column [DATETIME], nullable, no default')
        );
        unset($r1);


        // adding dummy data
        $mapper = new \DB\SQL\Mapper($db, $this->tname);
        $mapper->column_7 = 'test_datetime';
        $mapper->datetime = NULL;
        $mapper->save();
        $mapper->reset();
        $result = $mapper->find(array('column_7 = ?', 'test_datetime'));
        foreach ($result as &$r)
            $r = $r->cast();

        $this->test->expect(
            array_key_exists(0, $result) && $result[0]['column_7'] == 'test_datetime' &&
            $result[0]['datetime'] === null,
            $this->getTestDesc('mapping dummy data')
        );
        unset($mapper, $result);


        // rename column
        $table->renameColumn('text_default_not_null', 'title123');
        $table->build();
        $r1 = $table->getCols();
        $this->test->expect(
            in_array('title123', $r1) && !in_array('text_default_not_null', $r1),
            $this->getTestDesc('renaming column')
        );
        unset($r1);

        // adding dummy data
        $mapper = new \DB\SQL\Mapper($db, $this->tname);
        $mapper->title123 = 'test8';
        $mapper->save();
        $mapper->reset();
        $result = $mapper->findone(array('title123 = ?','test8'));
        $this->test->expect(
            !$result->dry(),
            $this->getTestDesc('mapping dummy data')
        );
        $table->renameColumn('title123', 'text_default_not_null');
        $table->build();
        unset($result,$mapper);
        
        // remove column
        $table->dropColumn('column_1');
        $table->build();
        $r1 = $table->getCols();
        $this->test->expect(
            !in_array('column_1', $r1),
            $this->getTestDesc('removing column')
        );
        unset($r1);

        // rename table
        $schema->dropTable('test123');
        $table->rename('test123');
        $result = $schema->getTables();
        $this->test->expect(
            in_array('test123', $result) && !in_array($this->tname, $result),
            $this->getTestDesc('renaming table')
        );
        $table->rename($this->tname);
        unset($result);

        // check record count
        $mapper = new \DB\SQL\Mapper($db, $this->tname);
        $this->test->expect(
            count($mapper->find()) == 9,
            $this->getTestDesc('check record count')
        );
        unset($mapper);

        // adding composite primary keys
        $table->addColumn('version')->type($schema::DT_INT4)->nullable(false)->defaults(1);
        $table->primary(array('id', 'version'));
        $table->build();
        $r1 = $table->getCols(true);
        $this->test->expect(!empty($r1) && isset($r1['version']) &&
            $r1['id']['pkey'] == true && $r1['version']['pkey'] == true,
            $this->getTestDesc('adding composite primary-keys')
        );
        unset($r1);

        // check record count
        $mapper = new \DB\SQL\Mapper($db, $this->tname);
        $this->test->expect(
            count($mapper->find()) == 9,
            $this->getTestDesc('check record count')
        );
        unset($mapper);

        // drop table
        $schema->dropTable($this->tname);
        $this->test->expect(
            !in_array($this->tname, $schema->getTables()),
            $this->getTestDesc('drop table')
        );

        // adding composite primary keys
        $table = $schema->createTable($this->tname);
        $table->addColumn('version')->type($schema::DT_INT4)
              ->defaults(1)->nullable(false);
        $table->primary(array('id', 'version'));
        $table = $table->build();
        $r1 = $table->getCols(true);

        $this->test->expect(!empty($r1) &&
            $r1['id']['pkey'] == true && $r1['version']['pkey'] == true,
            $this->getTestDesc('creating new table with composite key')
        );
        $this->test->expect(!empty($r1) &&
            $r1['version']['default'] == '1',
            $this->getTestDesc('default value on composite primary key')
        );
        unset($r1);

        // more fields to composite primary key table
        $table->addColumn('title')->type($schema::DT_VARCHAR256);
        $table->addColumn('title2')->type($schema::DT_TEXT);
        $table->addColumn('title_notnull')
              ->type($schema::DT_VARCHAR128)->nullable(false)->defaults("foo");
        $table->build();
        $r1 = $table->getCols(true);
        $this->test->expect(
            array_key_exists('title', $r1) &&
            array_key_exists('title_notnull', $r1) &&
            $r1['id']['pkey'] == true && $r1['version']['pkey'] == true,
            $this->getTestDesc('adding more fields to composite pk table')
        );
        unset($r1);

        // testing primary keys with inserted data
        $mapper = new \DB\SQL\Mapper($db, $this->tname);
        $mapper->title = 'test1';
        $mapper->save();
        $mapper->reset();

        $mapper->id = 1;
        $mapper->title = 'nullable';
        $mapper->version = 2;
        $mapper->save();
        $mapper->reset();

        $mapper->title = 'test3';
        $mapper->title2 = 'foobar';
        $mapper->title_notnull = 'bar';
        $mapper->save();

        $result = array_map(array($mapper,'cast'),$mapper->find());

        $cpk_expected = array(
            0=>array(
                'id' => 1,
                'version' => 1,
                'title' => 'test1',
                'title2' => NULL,
                'title_notnull' => 'foo',
            ),
            1=>array(
                'id' => 1,
                'version' => 2,
                'title' => 'nullable',
                'title2' => NULL,
                'title_notnull' => 'foo',
            ),
            2=>array(
                'id' => 2,
                'version' => 1,
                'title' => 'test3',
                'title2' => 'foobar',
                'title_notnull' => 'bar',
            ),
        );
        foreach ($result as &$r)
            ksort($r);
        foreach ($cpk_expected as &$r)
            ksort($r);
        $this->test->expect(
            json_encode($result) == json_encode($cpk_expected),
            $this->getTestDesc('adding items with composite primary-keys')
        );

        $schema->dropTable($this->tname);

        // indexes
        $table = $schema->createTable($this->tname);
        $table->addColumn('rawtest', array('type' => $schema::DT_VARCHAR256, 'default' => 'foo'));
        $table->addColumn('text')->type($schema::DT_TEXT);
        $table->addColumn('foo')->type($schema::DT_VARCHAR128)->index();
        $table = $table->build();
        $r1 = $table->getCols(true);
        $this->test->expect(
            isset($r1['rawtest']) && $r1['rawtest']['default'] = 'foo',
            $this->getTestDesc('adding column with options array')
        );
        $indexes = $table->listIndex();
        $this->test->expect(
            isset($indexes[$table->name.'___foo']),
            $this->getTestDesc('column index on table creation')
        );
        $table->addColumn('bar')->type($schema::DT_VARCHAR128)->index(true);
        $table->addColumn('baz')->type($schema::DT_VARCHAR128);
        $table->addIndex(array('foo', 'baz'));
        $table->build();
        $indexes = $table->listIndex();
        $this->test->expect(
            isset($indexes[$table->name.'___bar']),
            $this->getTestDesc('column index on table alteration')
        );
        $this->test->expect(
            isset($indexes[$table->name.'___bar']) && $indexes[$table->name.'___bar']['unique'] == true,
            $this->getTestDesc('unique index')
        );
        $this->test->expect(
            isset($indexes[$table->name.'___foo__baz']),
            $this->getTestDesc('index on combined columns')
        );

        if($this->current_engine == 'sqlite') {
            $table->dropColumn('rawtest');
            $table->build();
            $indexes = $table->listIndex();
            $this->test->expect(
                isset($indexes[$table->name.'___foo__baz']) && isset($indexes[$table->name.'___bar'])
                && $indexes[$table->name.'___bar']['unique'],
                $this->getTestDesc('preserve indexes after table rebuild')
            );
        }

        $table->dropIndex($table->name.'___bar');
        $table->build();
        $indexes = $table->listIndex();
        $this->test->expect(
            !array_key_exists($table->name.'___bar',$indexes),
            $this->getTestDesc('drop index')
        );

        // update column
        $table->updateColumn('bar',$schema::DT_TEXT);
        $table->build();
        $r1 = $table->getCols(true);
        $this->test->expect(
            array_key_exists('bar', $r1) && $r1['bar']['type'] == 'text',
            $this->getTestDesc('update column')
        );

        // create table with text not nullable column
        $table2 = $schema->createTable($this->tname.'_notnulltext');
        $table2->addColumn('desc')->type($schema::DT_TEXT)->nullable(false);
        $table2 = $table2->build();
        $r1 = $schema->getTables();
        $r2 = $table2->getCols(true);
        $this->test->expect(
            in_array($this->tname.'_notnulltext', $r1) && array_key_exists('desc', $r2)
            && $r2['desc']['nullable']==false,
            $this->getTestDesc('create new table with not nullable text column')
        );
        $table2->drop();

        
    }

}