<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 14.02.15
 * Time: 21:28
 */

namespace Data\Mapper;

class CcpSystemsMapper extends AbstractIterator {

    protected static $map = [
        'system_id' => 'systemId',
        'system_name' => 'name',
        'connstallation_id' => ['constellation' => 'id'],
        'constallation_name' => ['constellation' => 'name'],
        'region_id' => ['region' => 'id'],
        'region_name' => ['region' => 'name']
    ];

    /**
     * map iterator
     * @return array
     */
    public function getData(){

        // "system trueSec" mapping -------------------------------------------
        self::$map['trueSec'] = function($iterator){
            $trueSec = self::formatTrueSec($iterator['system_security']);
            return $trueSec;
        };

        // "system effect" mapping --------------------------------------------
        self::$map['effect'] = function($iterator){
            $effect = $iterator['effect'];

            switch($iterator['effect']){
                case 'magnetar':
                    $effect = 'magnetar';
                    break;
                case 'red giant':
                    $effect = 'redGiant';
                    break;
                case 'pulsar':
                    $effect = 'pulsar';
                    break;
                case 'wolf-rayet star':
                    $effect = 'wolfRayet';
                    break;
                case 'cataclysmic variable':
                    $effect = 'cataclysmic';
                    break;
                case 'black hole':
                    $effect = 'blackHole';
                    break;
            }

            return $effect;
        };

        // "system security" mapping ------------------------------------------
        self::$map['security'] = function($iterator){
            $security = '';

            if(
                $iterator['constellation']['id'] >= 22000001 &&
                $iterator['constellation']['id'] <= 22000025
            ){
                // "Abyssal" system
                $security = 'A';
            }elseif(
                $iterator['security'] == 7 ||
                $iterator['security'] == 8 ||
                $iterator['security'] == 9
            ){
                // k-space system
                $trueSec = self::formatTrueSec($iterator['system_security']);

                if($trueSec <= 0){
                    $security = '0.0';
                }elseif($trueSec < 0.5){
                    $security = 'L';
                }else{
                    $security = 'H';
                }
            }elseif(
                $iterator['security'] == 1 ||
                $iterator['security'] == 2 ||
                $iterator['security'] == 3 ||
                $iterator['security'] == 4 ||
                $iterator['security'] == 5 ||
                $iterator['security'] == 6
            ){
                // standard wormhole system
                $security = 'C' . $iterator['security'];
            }elseif(
                $iterator['security'] == 13
            ){
                // shattered wormhole system
                $security = 'SH';
            }

            return $security;
        };

        // "system type" mapping ----------------------------------------------
        self::$map['type'] = function($iterator){

            // TODO refactor
            $type = 'w-space';
            $typeId = 1;
            if(
                $iterator['constellation']['id'] >= 22000001 &&
                $iterator['constellation']['id'] <= 22000025
            ){
                // "Abyssal" system
                $type = 'a-space';
                $typeId = 3;
            }elseif(
                $iterator['security'] == 7 ||
                $iterator['security'] == 8 ||
                $iterator['security'] == 9
            ){
                $type = 'k-space';
                $typeId = 2;
            }

            return [
                'id' => $typeId,
                'name' => $type
            ];
        };

        iterator_apply($this, 'self::recursiveIterator', [$this]);

        return iterator_to_array($this, false);
    }

    /**
     * format trueSec
     * @param $trueSec
     * @return float
     */
    static function formatTrueSec($trueSec){
        $positive = ($trueSec > 0);
        $trueSec = round((float)$trueSec, 1, PHP_ROUND_HALF_DOWN);

        if($positive && $trueSec <= 0){
            $trueSec = 0.1;
        }
        return $trueSec;
    }

    static function recursiveIterator($iterator){

        while ( $iterator -> valid() ) {
            if ( $iterator->hasChildren() ) {
                $iterator->offsetSet($iterator->key(), self::recursiveIterator( $iterator->getChildren() )->getArrayCopy() );
            }else {

                while( $iterator -> valid() ){

                    // check for mapping key
                    if(array_key_exists($iterator->key(), self::$map)){

                        if(is_array(self::$map[$iterator->key()])){
                            // a -> array mapping

                            $parentKey = array_keys( self::$map[$iterator->key()] )[0];
                            $entryKey = array_values( self::$map[$iterator->key()] )[0];

                            // check if key already exists
                            if($iterator->offsetExists($parentKey)){
                                $currentValue = $iterator->offsetGet($parentKey);
                                // add new array entry
                                $currentValue[$entryKey] = $iterator->current();

                                $iterator->offsetSet( $parentKey, $currentValue  );
                            }else{
                                $iterator->offsetSet( $parentKey, [$entryKey => $iterator->current() ]  );
                            }

                            $removeOldEntry = true;
                        }elseif(is_object(self::$map[$iterator->key()])){
                            // a -> a (format by function)

                            $formatFunction = self::$map[$iterator->key()];

                            $iterator->offsetSet( $iterator->key(), call_user_func($formatFunction, $iterator)  );

                            // just value change no key change
                            $removeOldEntry = false;
                            $iterator->next();
                        }else{
                            // a -> b mapping
                            $iterator->offsetSet( self::$map[$iterator->key()], $iterator->current() );

                            $removeOldEntry = true;
                        }

                        // remove "old" entry
                        if($removeOldEntry){
                            $iterator->offsetUnset($iterator->key());
                        }

                    }else{
                        // continue with next entry
                        $iterator -> next();
                    }

                }
            }

            $iterator -> next();
        }

        return $iterator;
    }

} 