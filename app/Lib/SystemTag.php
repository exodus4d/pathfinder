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

        foreach($systemClasses as $systemClass){
            $tagsInUse = array();

            foreach($systems as $system){
                if($system->security == $systemClass && !$system->locked && gettype($system->tag) == "string"){
                    array_push($tagsInUse, SystemTag::tagToInt($system->tag));
                }
            }
            sort($tagsInUse);

            $availableTags = array();
            $i = 0;
            while(count($availableTags) < 5) {
                if(!in_array($i, $tagsInUse)) {
                    array_push($availableTags, SystemTag::intToTag($i));
                }
                $i++;
            }
            array_push($tags, $availableTags);
        }
        return json_encode($tags);
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

    /**
     * converts character tag to integer
     * @param string $tag
     * @return int
     */
    static function tagToInt(string $tag): int {
        if (strlen($tag) === 1){
            $int = ord($tag) - 97;
        } else {
            $chars = str_split($tag);
            $int = ((ord($chars[0]) - 96) * 26) + (ord($chars[1]) - 97);
        }
        return $int;
    }
}