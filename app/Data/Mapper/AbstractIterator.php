<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 31.01.2016
 * Time: 04:06
 */

namespace Exodus4D\Pathfinder\Data\Mapper;

use Exodus4D\Pathfinder\Lib\Util;

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

    /**
     * AbstractIterator constructor.
     * @param $data
     */
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
     * convert array keys to camelCase
     * @param $array
     * @return array
     */
    protected function camelCaseKeys($array){
        return Util::arrayChangeKeys($array, [\Base::instance(), 'camelcase']);
    }

    /**
     * recursive iterator function called on every node
     * @param AbstractIterator $iterator
     * @return AbstractIterator
     */
    static function recursiveIterator(AbstractIterator $iterator){

        $keyWhitelist = array_keys(static::$map);

        while($iterator->valid()){

            if( isset(static::$map[$iterator->key()]) ){
                $mapValue = static::$map[$iterator->key()];

                // check for mapping key
                if(
                    $iterator->hasChildren() &&
                    Util::is_assoc($iterator->current())
                ){
                    // recursive call for child elements
                    $iterator->offsetSet($iterator->key(), forward_static_call(array('self', __METHOD__), $iterator->getChildren())->getArrayCopy());
                    $iterator->next();
                }elseif(is_array($mapValue)){
                    // a -> array mapping
                    $parentKey = array_keys($mapValue)[0];
                    $entryKey = array_values($mapValue)[0];

                    // check if key already exists
                    if($iterator->offsetExists($parentKey)){
                        $currentValue = $iterator->offsetGet($parentKey);
                        // add new array entry
                        $currentValue[$entryKey] = $iterator->current();
                        $iterator->offsetSet($parentKey, $currentValue);
                    }else{
                        $iterator->offsetSet($parentKey, [$entryKey => $iterator->current()]);
                        $keyWhitelist[] = $parentKey;
                    }

                    $iterator->offsetUnset($iterator->key());
                }elseif(is_object($mapValue)){
                    // a -> a (format by function)
                    $formatFunction = $mapValue;
                    $iterator->offsetSet($iterator->key(), call_user_func($formatFunction, $iterator));

                    // just value change no key change
                    $iterator->next();
                }elseif($mapValue !== $iterator->key()){
                    // a -> b mapping (key changed)
                    $iterator->offsetSet($mapValue, $iterator->current());
                    $iterator->offsetUnset($iterator->key());
                    $keyWhitelist[] = $mapValue;
                }else{
                    // a -> a (no changes)
                    $iterator->next();
                }

            }elseif(
                static::$removeUnmapped &&
                !in_array($iterator->key(), $keyWhitelist)
            ){
                $iterator->offsetUnset($iterator->key());
            }else{
                $iterator->next();
            }

        }

        return $iterator;
    }

}