<?php

class NewsModel extends \DB\Cortex {

	protected
		$fieldConf = array(
			'title' => array(
				'type' => \DB\SQL\Schema::DT_VARCHAR128
			),
			'text' => array(
				'type' => \DB\SQL\Schema::DT_TEXT
			),
			'author' => array(
				'belongs-to-one' => '\AuthorModel',
			),
			'tags' => array(
				'belongs-to-many' => '\TagModel',
			),
			'tags2' => array(
				'has-many' => array('\TagModel','news','news_tags'),
//				'has-many' => array('\TagModel','news'),
			),
		),
//		$primary='nid',
		$table = 'news',
		$db = 'DB';

}