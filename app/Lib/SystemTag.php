<?php

namespace Exodus4D\Pathfinder\Lib;

use Exodus4D\Pathfinder\Lib\SystemTag\SystemTagInterface;
use Exodus4D\Pathfinder\Model\Pathfinder\MapModel;
use Exodus4D\Pathfinder\Model\Pathfinder\SystemModel;

class SystemTag {

    /**
     * @param SystemModel $targetSystem
     * @param SystemModel $sourceSystem
     * @param MapModel $map
     * @return string|null
     */
    static function generateFor(SystemModel $targetSystem, SystemModel $sourceSystem, MapModel $map) : ?string
    {
        $config = Config::getPathfinderData('systemtag');

        if(!isset($config['STATUS']) || $config['STATUS'] !== 1) {
            return null;
        }

        $style = isset($config['STYLE']) ? $config['STYLE'] : 'countConnections';
        $className = '\\Exodus4D\\Pathfinder\\Lib\\SystemTag\\' . ucfirst($style);

        if(!class_exists($className) || !is_subclass_of($className, SystemTagInterface::class)) {
            return null;
        }

        return $className::generateFor($targetSystem, $sourceSystem, $map);
    }

    static function nextBookmarks(MapModel $map) : ?string
    {
        
        $systems = $map->getSystemsData();
        $systemClasses = ['H', 'L', '0.0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
        $tags = array();

        // REMOVE DEBUGGING
        $debugfile = fopen("taglog.txt", "a");        
        fwrite($debugfile, print_r($systemClasses, true));

        foreach($systemClasses as $systemClass){
            fwrite($debugfile, "starting loop for class: $systemClass\n");
            $i = 0;
            foreach($systems as $system){
                if($system->security == $systemClass && !$system->locked && $system->tag !== 's'){
                    $i++;
                }
                fwrite($debugfile, "i: $i, sec: $system->security, name: $system->name, tag: $system->tag\n");
            }
            array_push($tags, SystemTag::intToTag($i));
        }
        // REMOVE DEBUGGING                
        $rr = implode(',' ,$tags);
        fwrite($debugfile, "final tags: [$rr]\n");
        fclose($debugfile);

        return implode(',', $tags);
    }

     /**
     * converts integer to character tag
     * @param int $int
     * @return string
     */
    static function intToTag(int $int): string {
        if($int > 25){
            $chrCode1 = chr(97 + floor($int / 26) -1);
            $chrCode2 = chr(97 + $int - (floor($int/26) * 26));
            $tag = "$chrCode1$chrCode2";
        } else {
            $tag = chr(97 + $int);
        }
        return $tag;
    }
}