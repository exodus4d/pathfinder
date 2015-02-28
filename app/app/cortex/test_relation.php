<?php

use App\Controller;

class Test_Relation {

	/**
	 * unify results for better comparison
	 */
	private function getResult($result)
	{
		$out = array();
		foreach ($result as $row) {
			if(is_object($row))
				$row = $row->cast();
			unset($row['_id']);
			unset($row['id']);
			unset($row['aid']);
			unset($row['uid']);
			unset($row['nid']);
			unset($row['tid']);
			unset($row['pid']);
			unset($row['profile_id']);
			foreach ($row as $col => $val) {
				if (empty($val) || is_null($val))
					unset($row[$col]);
			}
			$out[] = $row;
		}
		return $out;
	}

	function run($db,$type)
	{
		$test = new \Test();

		// clear existing data
		\AuthorModel::setdown();
		\TagModel::setdown();
		\NewsModel::setdown();
		\ProfileModel::setdown();

		// setup models
		\AuthorModel::setup();
		\TagModel::setup();
		\NewsModel::setup();
		\ProfileModel::setup();

		// setup Author
		///////////////////////////////////
		$author_id = array();

		$author = new \AuthorModel();
		$ac=$author::resolveConfiguration();
		$author_pk = (is_int(strpos($type,'sql'))?$ac['primary']:'_id');

		$author->name = 'Johnny English';
		$author->save();
		$author_id[] = $author->_id;
		$author->reset();
		$author->name = 'Ridley Scott';
		$author->save();
		$author_id[] = $author->_id;
		$author->reset();
		$author->name = 'James T. Kirk';
		$author->save();
		$author_id[] = $author->_id;
		$author->reset();

		$allauthors = $author->find()->castAll();
		$allauthors = $this->getResult($allauthors);
		$test->expect(
			json_encode($allauthors) ==
			'[{"name":"Johnny English"},{"name":"Ridley Scott"},{"name":"James T. Kirk"}]',
			$type.': all AuthorModel items created'
		);

		// setup Tags
		///////////////////////////////////
		$tag_id = array();

		$tag = new \TagModel();
		$tc=$tag::resolveConfiguration();
		$tag_pk = (is_int(strpos($type,'sql'))?$tc['primary']:'_id');

		$tag->title = 'Web Design';
		$tag->save();
		$tag_id[] = $tag->_id;
		$tag->reset();
		$tag->title = 'Responsive';
		$tag->save();
		$tag_id[] = $tag->_id;
		$tag->reset();
		$tag->title = 'Usability';
		$tag->save();
		$tag_id[] = $tag->_id;
		$tag->reset();

		$allTags = $this->getResult($tag->find());
		$test->expect(
			json_encode($allTags) ==
			'[{"title":"Web Design"},{"title":"Responsive"},{"title":"Usability"}]',
			$type.': all TagModel items created'
		);

		// setup News
		///////////////////////////////////
		$news_id = array();

		$news = new \NewsModel();
		$nc=$news::resolveConfiguration();
		$news_pk = (is_int(strpos($type,'sql'))?$nc['primary']:'_id');

		$news->title = 'Responsive Images';
		$news->text = 'Lorem Ipsun';
		$news->save();
		$news_id[] = $news->_id;
		$news->reset();
		$news->title = 'CSS3 Showcase';
		$news->text = 'News Text 2';
		$news->save();
		$news_id[] = $news->_id;
		$news->reset();
		$news->title = 'Touchable Interfaces';
		$news->text = 'Lorem Foo';
		$news->save();
		$news_id[] = $news->_id;
		$news->reset();

		$allnews = $this->getResult($news->find());
		$test->expect(
			json_encode($allnews) ==
			'[{"title":"Responsive Images","text":"Lorem Ipsun"},{"title":"CSS3 Showcase","text":"News Text 2"},{"title":"Touchable Interfaces","text":"Lorem Foo"}]',
			$type.': all NewsModel items created'
		);

		// belongs-to author relation
		///////////////////////////////////

		$author->load();
		$news->load(array($news_pk.' = ?',$news_id[0]));
		$news->author = $author;
		$news->save();
		$news->reset();
		$news->load(array($news_pk.' = ?', $news_id[0]));
		$test->expect(
			$news->author->name == 'Johnny English',
			$type.': belongs-to-one: author relation created'
		);

		$news->author = NULL;
		$news->save();
		$news->reset();
		$news->load(array($news_pk.' = ?', $news_id[0]));
		$test->expect(
			empty($news->author),
			$type.': belongs-to-one: author relation released'
		);

		$news->author = $author->_id;
		$news->save();
		$news->reset();
		$news->load(array($news_pk.' = ?', $news_id[0]));
		$test->expect(
			$news->author->name == 'Johnny English',
			$type.': belongs-to-one: relation created by raw id'
		);

		// belongs-to-many tag relation
		///////////////////////////////////

		$tag1 = new \TagModel();
		$tag1->load(array($tag_pk.' = ?', $tag_id[0]));
		$tag2 = new \TagModel();
		$tag2->load(array($tag_pk.' = ?', $tag_id[1]));
		$news->tags = array($tag1,$tag2);
		$news->save();
		$news->reset();
		$news->load(array($news_pk.' = ?', $news_id[0]));
		$test->expect(
			$news->tags[0]->title == 'Web Design' && $news->tags[1]->title == 'Responsive',
			$type.': belongs-to-many: relations created with array of mapper objects'
		);

		$news->reset();
		$news->load(array($news_pk.' = ?', $news_id[1]));
		$news->tags = array($tag_id[1],$tag_id[2]);
		$news->save();
		$news->reset();
		$news->load(array($news_pk.' = ?', $news_id[1]));
		$test->expect(
			$news->tags[0]->title == 'Responsive' && $news->tags[1]->title == 'Usability',
			$type.': belongs-to-many: relations created with array of IDs'
		);

		$news->tags = null;
		$news->save();
		$news->reset();
		$news->load(array($news_pk.' = ?', $news_id[1]));
		$test->expect(
			empty($news->tags),
			$type.': belongs-to-many: relations released'
		);

		$tag->reset();
		$news->load(array($news_pk.' = ?', $news_id[1]));
		$news->tags = $tag->load(array($tag_pk.' != ?',$tag_id[0]));
		$news->save();
		$news->reset();
		$news->load(array($news_pk.' = ?', $news_id[1]));
		$test->expect(
			$news->tags[0]->title == 'Responsive' && $news->tags[1]->title == 'Usability',
			$type.': belongs-to-many: relations created with hydrated mapper'
		);


		$news->reset();
		$tag->reset();
		$news->load(array($news_pk.' = ?', $news_id[2]));
		$news->tags = $tag_id[0].';'.$tag_id[2];
		$news->save();
		$news->reset();
		$news->load(array($news_pk.' = ?', $news_id[2]));
		$test->expect(
			$news->tags[0]->title == 'Web Design' && $news->tags[1]->title == 'Usability',
			$type.': belongs-to-many: relations created with split-able string'
		);
		$test->expect(
			is_object($news->tags) && $news->tags instanceof \DB\CortexCollection,
			$type.': belongs-to-many: result is collection'
		);


		// has-one relation
		///////////////////////////////////
		$profile = new ProfileModel();
		$pc=$profile::resolveConfiguration();
		$profile_pk = (is_int(strpos($type,'sql'))?$pc['primary']:'_id');

		$profile->message = 'Hello World';
		$profile->author = $author->load(array($author_pk.' = ?',$author_id[0]));
		$profile->save();
		$profile_id = $profile->_id;
		$profile->reset();
		$author->reset();
		$author->load(array($author_pk.' = ?', $author_id[0]));
		$profile->load(array($profile_pk.' = ?', $profile_id));
		$test->expect(
			$author->profile->message == 'Hello World' &&
			$profile->author->name == "Johnny English",
			$type.': has-one: relation assigned'
		);

		$profile->reset();
		$profile->message = 'I\'m feeling lucky';
		$profile->image = 'lolcat.jpg';
		$author->reset();
		$author->load(array($author_pk.' = ?',$author_id[1]));
		$author->profile = $profile;
		$author->save();
		$profile->reset();
		$author->reset();
		$author->load(array($author_pk.' = ?', $author_id[1]));
		$test->expect(
			$author->profile->message == 'I\'m feeling lucky',
			$type.': has-one: inverse relation'
		);


		// has-many relation
		///////////////////////////////////

		$author->load(array($author_pk.' = ?', $author_id[0]));
		$result = $this->getResult($author->news);
		$test->expect(
			$result[0]['title'] == "Responsive Images" &&
			$result[0]['tags'][0]['title'] == 'Web Design' &&
			$result[0]['tags'][1]['title'] == 'Responsive',
			$type.': has-many inverse relation'
		);

		// many to many relation
		///////////////////////////////////

		$news->load(array($news_pk.' = ?',$news_id[0]));
		$news->tags2 = array($tag_id[0],$tag_id[1]);
		$news->save();
		$news->reset();
		$news->load(array($news_pk.' = ?',$news_id[0]));
		$test->expect(
			$news->tags2[0]['title'] == 'Web Design' &&
			$news->tags2[1]['title'] == 'Responsive',
			$type.': many-to-many relation created'
		);

		$test->expect(
			is_object($news->tags2) && $news->tags2 instanceof \DB\CortexCollection,
			$type.': many-to-many: result is collection'
		);

		$news->load(array($news_pk.' = ?', $news_id[0]));
		$news->tags2 = NULL;
		$news->save();
		$news->reset();
		$news->load(array($news_pk.' = ?', $news_id[0]));
		$test->expect(
			is_null($news->tags2),
			$type.': many-to-many relation released'
		);

		$all = $news->find();
		$test->expect(
			$all[1]->tags2 === NULL
			&& $all[2]->author === NULL,
			$type.': empty relations are NULL'
		);

		$arr = $news->cast();
		$test->expect(
			is_array($arr['tags']),
			$type.': collection becomes array in casted model'
		);

		if ($type == 'mongo') {
			$test->expect(
				is_string($arr['_id']),
				$type.': id becomes string in casted model'
			);
		}

		///////////////////////////////////
		return $test->results();
	}

}