<?php

namespace App;

class Cortex extends Controller
{
	function get()
	{
		$f3 = \Base::instance();
		$f3->set('AUTOLOAD', $f3->get('AUTOLOAD').';app/cortex/');
		$f3->set('QUIET', false);

		$dbs = array(
			'sql' => new \DB\SQL('mysql:host=localhost;port=3306;dbname=fatfree', 'fatfree', ''),
//			'sql-sqlite' => new \DB\SQL('sqlite:data/sqlite.db'),
//			'sql-pgsql' => new \DB\SQL('pgsql:host=localhost;dbname=fatfree', 'fatfree', 'fatfree'),
			'jig' => new \DB\Jig('data/'),
			'mongo' => new \DB\Mongo('mongodb://localhost:27017', 'testdb'),
//			'sqlsrv2012' => new \DB\SQL('sqlsrv:SERVER=LOCALHOST\SQLEXPRESS2012;Database=fatfree','fatfree', 'fatfree'),
//			'sqlsrv2008' => new \DB\SQL('sqlsrv:SERVER=LOCALHOST\SQLEXPRESS2008;Database=fatfree','fatfree', 'fatfree'),
		);
		$results = array();

		// Test Syntax
		foreach ($dbs as $type => $db) {
			$test = new \Test_Syntax();
			$results = array_merge((array) $results, (array) $test->run($db, $type));
		}

		// Test Relations
		foreach ($dbs as $type => $db) {
			$f3->set('DB',$db);
			$test = new \Test_Relation();
			$results = array_merge((array) $results, (array) $test->run($db, $type));
		}

		// Test Filter
		foreach ($dbs as $type => $db) {
			$f3->set('DB',$db);
			$test = new \Test_Filter();
			$results = array_merge((array) $results, (array) $test->run($db, $type));
		}

		// Further Common Tests
		if (isset($dbs['sql'])) {
			$test = new \Test_Common();
			$f3->set('DB', $dbs['sql']);
			$results = array_merge((array) $results, (array) $test->run());
		}
		$f3->set('results', $results);
	}


}