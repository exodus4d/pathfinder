<?php

use App\Controller;

class Test_Syntax {

	function run($db,$type)
	{
		$test = new \Test();
		$tname = 'test_cortex';

		\DB\Cortex::setdown($db, $tname);

		$fields = array(
			'title' => array('type' => \DB\SQL\Schema::DT_TEXT),
			'num1' => array('type' => \DB\SQL\Schema::DT_INT4),
			'num2' => array('type' => \DB\SQL\Schema::DT_INT4),
		);
		\DB\Cortex::setup($db, $tname, $fields);

		// adding some testing data
		$cx = new \DB\Cortex($db, $tname);
		$cx->title = 'bar1';
		$cx->save();
		$cx->reset();

		$cx->title = 'baz2';
		$cx->num1 = 1;
		$cx->save();
		$cx->reset();

		$cx->title = 'foo3';
		$cx->num1 = 4;
		$cx->save();
		$cx->reset();

		$cx->title = 'foo4';
		$cx->num1 = 3;
		$cx->save();
		$cx->reset();

		$cx->title = 'foo5';
		$cx->num1 = 3;
		$cx->num2 = 5;
		$cx->save();
		$cx->reset();

		$cx->title = 'foo6';
		$cx->num1 = 3;
		$cx->num2 = 1;
		$cx->save();
		$cx->reset();

		$cx->title = 'foo7';
		$cx->num1 = 3;
		$cx->num2 = 10;
		$cx->save();
		$cx->reset();

		$cx->title = 'foo8';
		$cx->num1 = 5;
		$cx->save();
		$cx->reset();

		$cx->title = 'foo9';
		$cx->num1 = 8;
		$cx->save();
		$cx->reset();

		$result = $this->getResult($cx->find());

		$expected = array(
			0 => array(
				'title' => 'bar1',
			),
			1 => array(
				'num1' => 1,
				'title' => 'baz2',
			),
			2 => array(
				'num1' => 4,
				'title' => 'foo3',
			),
			3 => array(
				'num1' => 3,
				'title' => 'foo4',
			),
			4 => array(
				'num1' => 3,
				'num2' => 5,
				'title' => 'foo5',
			),
			5 => array(
				'num1' => 3,
				'num2' => 1,
				'title' => 'foo6',
			),
			6 => array(
				'num1' => 3,
				'num2' => 10,
				'title' => 'foo7',
			),
			7 => array(
				'num1' => 5,
				'title' => 'foo8',
			),
			8 => array(
				'num1' => 8,
				'title' => 'foo9',
			),
		);

		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': init mapper, adding records'
		);

		// operator =
		$result = $this->getResult($cx->find(array('title = ?', 'foo7')));
		$expected = array(
			0 => array(
				'num1' => 3,
				'num2' => 10,
				'title' => 'foo7',
			),
		);
		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': operator check: ='
		);

		// operator >
		$result = $this->getResult($cx->find(array('num1 > ?', 4)));
		$expected = array(
			0 => array(
				'num1' => 5,
				'title' => 'foo8',
			),
			1 => array(
				'num1' => 8,
				'title' => 'foo9',
			),
		);
		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': operator check: >'
		);

		// operator >=
		$result = $this->getResult($cx->find(array('num1 >= ?', 5)));
		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': operator check: >='
		);

		// operator <
		$result = $this->getResult($cx->find(array('num2 < ?', 2)));
		$expected = array(
			0 => array(
				'num1' => 3,
				'num2' => 1,
				'title' => 'foo6',
			),
		);
		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': operator check: <'
		);

		// operator <=
		$result = $this->getResult($cx->find(array('num2 <= ?', 1)));
		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': operator check: <='
		);

		// operator without binding
		$result = $this->getResult($cx->find(array('num1 > 4')));
		$expected = array(
			0 => array(
				'num1' => 5,
				'title' => 'foo8',
			),
			1 => array(
				'num1' => 8,
				'title' => 'foo9',
			),
		);
		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': operator without binding'
		);

		// field comparision
		$result = $this->getResult($cx->find(
			array('num2 > num1', 1)));
		$expected = array(
			0 => array(
				'num1' => 3,
				'num2' => 5,
				'title' => 'foo5',
			),
			1 => array(
				'num1' => 3,
				'num2' => 10,
				'title' => 'foo7',
			),
		);
		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': check field comparision'
		);

		// lookahead search
		$result = $this->getResult($cx->find(array('title like ?', '%o6')));
		$expected = array(
			0 => array(
				'num1' => 3,
				'num2' => 1,
				'title' => 'foo6',
			),
		);
		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': lookahead search'
		);

		// lookbehind search
		$result = $this->getResult($cx->find(array('title like ?', 'bar%')));
		$expected = array(
			0 => array(
				'title' => 'bar1',
			),
		);
		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': lookbehind search'
		);

		// full search
		$result = $this->getResult($cx->find(array('title like ?', '%a%')));
		$expected = array(
			0 => array(
				'title' => 'bar1',
			),
			1 => array(
				'num1' => 1,
				'title' => 'baz2',
			),
		);
		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': full search'
		);

		// negated search
		$result = $this->getResult($cx->find(array('title not like ?', 'foo%')));
		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': negated search'
		);

		// AND / OR chaining
		$result = $this->getResult($cx->find(
			array('(num2 < ? AND num1 > ?) OR title like ?', 2, 1, '%o9')));
		$expected = array(
			0 => array(
				'num1' => 3,
				'num2' => 1,
				'title' => 'foo6',
			),
			1 => array(
				'num1' => 8,
				'title' => 'foo9',
			),
		);
		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': check logical operator chaining'
		);

		// check limit
		$result = $this->getResult($cx->find(
			null, array('limit' => '2')));
		$expected = array(
			0 => array(
				'title' => 'bar1',
			),
			1 => array(
				'num1' => 1,
				'title' => 'baz2',
			),
		);
		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': check limit'
		);

		// check order
		$result = $this->getResult($cx->find(
			array('num2 >= ?', 1), array('order' => 'num2 desc')));
		$expected = array(
			0 => array(
				'num1' => 3,
				'num2' => 10,
				'title' => 'foo7',
			),
			1 => array(
				'num1' => 3,
				'num2' => 5,
				'title' => 'foo5',
			),
			2 => array(
				'num1' => 3,
				'num2' => 1,
				'title' => 'foo6',
			),
		);

		$test->expect(
			json_encode($result) == json_encode($expected),
			$type.': check order'
		);

		// IN search
		$rc = $cx->find(array('num1 IN ?',array(4,5,8)));
		$result = $rc->getAll('title');
		sort($result);
		$test->expect(
			json_encode($result) == json_encode(array('foo3','foo8','foo9')),
			$type.': IN operator'
		);

		$rc = $cx->find(array('num1 IN ? && num2 > ? && num2 NOT IN ?',array(3,4),1,array(10)));
		$result = $rc->getAll('title');
		$test->expect(
			json_encode($result) == json_encode(array('foo5')),
			$type.': enhanced IN, NOT IN operator'
		);

		///////////////////////////////////
		return $test->results();
	}

	/**
	 * unify results for better comparison
	 */
	private function getResult($result)
	{
		$out = array();
		foreach ($result as $row) {
			$row = $row->cast();
			unset($row['_id']);
			unset($row['id']);
			ksort($row);
			foreach ($row as $col => $val) {
				if (empty($val) || is_null($val))
					unset($row[$col]);
			}
			$out[] = $row;
		}
		return $out;
	}
}