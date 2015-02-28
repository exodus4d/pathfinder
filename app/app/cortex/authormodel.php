<?php

class AuthorModel extends \DB\Cortex {

	protected
		$fieldConf = array(
			'name' => array(
				'type' => \DB\SQL\Schema::DT_VARCHAR256
			),
			'mail' => array(
				'type' => \DB\SQL\Schema::DT_VARCHAR256
			),
			'website' => array(
				'type' => \DB\SQL\Schema::DT_VARCHAR256
			),
			'news' => array(
				'has-many' => array('\NewsModel','author'),
			),
			'profile' => array(
				'has-one' => array('\ProfileModel','author'),
			),
		),
//		$primary = 'aid',
		$table = 'author',
		$db = 'DB';

}
