<?php

class ProfileModel extends \DB\Cortex {

	protected
		$fieldConf = array(
			'message' => array(
				'type' => \DB\SQL\Schema::DT_TEXT
			),
			'image' => array(
				'type' => \DB\SQL\Schema::DT_VARCHAR256
			),
			'author' => array(
				'belongs-to-one' => '\AuthorModel'
			)
		),
//		$primary = 'profile_id',
		$table = 'profile',
		$db = 'DB';

}