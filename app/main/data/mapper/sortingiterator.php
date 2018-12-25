<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 24.12.2018
 * Time: 00:55
 */

namespace data\mapper;


class SortingIterator extends \ArrayIterator {

    public function __construct(\Traversable $iterator, callable $callback){
        parent::__construct(iterator_to_array($iterator));

        // sort by custom function
        $this->uasort($callback);
    }
}