<?php

class TagModel extends \DB\Cortex {

	protected
		$fieldConf = array(
			'title' => array(
				'type' => \DB\SQL\Schema::DT_VARCHAR128
			),
			'news' => array(
				'has-many' => array('\NewsModel','tags2','news_tags'),
			),
		),
//		$primary = 'tid',
		$table = 'tags',
		$db = 'DB';

}