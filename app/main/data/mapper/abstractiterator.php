<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 31.01.2016
 * Time: 04:06
 */

namespace data\mapper;


class AbstractIterator extends \RecursiveArrayIterator {

    /**
     * iterator mapping
     * -> overwrite in child classes (late static binding)
     * @var array
     */
    protected static $map = [];

    /**
     * remove unmapped values from Array
     * -> see $map
     * @var bool
     */
    protected static $removeUnmapped = true;


    function __construct($data){
        parent::__construct($data, \RecursiveIteratorIterator::SELF_FIRST);
    }

    /**
     * map iterator
     * @return array
     */
    public function getData(){
        iterator_apply($this, 'self::recursiveIterator', [$this]);

        return iterator_to_array($this, true);
    }

    /**
     * recursive iterator function called on every node
     * @param $iterator
     * @return mixed
     */
    static function recursiveIterator($iterator){

        while($iterator->valid()){

            if(array_key_exists($iterator->key(), static::$map)){
                // check for mapping key
                if($iterator->hasChildren()){

                    // recursive call for child elements
                    $iterator->offsetSet($iterator->key(), forward_static_call(array('self', __METHOD__), $iterator->getChildren())->getArrayCopy());
                    $iterator->next();
                }elseif(is_array(static::$map[$iterator->key()])){
                    // a -> array mapping
                    $parentKey = array_keys(static::$map[$iterator->key()])[0];
                    $entryKey = array_values(static::$map[$iterator->key()])[0];

                    // check if key already exists
                    if($iterator->offsetExists($parentKey)){
                        $currentValue = $iterator->offsetGet($parentKey);
                        // add new array entry
                        $currentValue[$entryKey] = $iterator->current();

                        $iterator->offsetSet($parentKey, $currentValue);
                    }else{
                        $iterator->offsetSet($parentKey, [$entryKey => $iterator->current()]);
                    }


                }elseif(is_object(static::$map[$iterator->key()])){
                    // a -> a (format by function)
                    $formatFunction = static::$map[$iterator->key()];
                    $iterator->offsetSet($iterator->key(), call_user_func($formatFunction, $iterator));

                    // just value change no key change
                    $iterator->next();
                }elseif(static::$map[$iterator->key()] !== $iterator->key()){
                    // a -> b mapping (key changed)
                    $iterator->offsetSet(static::$map[$iterator->key()], $iterator->current());
                    $iterator->offsetUnset($iterator->key());
                }else{
                    // a -> a (no changes)
                    $iterator->next();
                }

            }elseif(
                static::$removeUnmapped &&
                !in_array($iterator->key(), static::$map)

            ){
                $iterator->offsetUnset($iterator->key());
            }else{
                $iterator->next();
            }
        }

        return $iterator;
    }

}