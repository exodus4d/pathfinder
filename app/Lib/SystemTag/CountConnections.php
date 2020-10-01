<?php

namespace Exodus4D\Pathfinder\Lib\SystemTag;

use Exodus4D\Pathfinder\Model\Pathfinder\ConnectionModel;
use Exodus4D\Pathfinder\Model\Pathfinder\MapModel;
use Exodus4D\Pathfinder\Model\Pathfinder\SystemModel;
use Exodus4D\Pathfinder\Model\Universe\AbstractUniverseModel;

class CountConnections implements SystemTagInterface
{
    /**
     * @param SystemModel $targetSystem
     * @param SystemModel $sourceSystem
     * @param MapModel $map
     * @return string|null
     * @throws \Exception
     */
    static function generateFor(SystemModel $targetSystem, SystemModel $sourceSystem, MapModel $map) : ?string
    {                       
        // set target class for new system being added to the map
        $targetClass = $targetSystem->security;
        
        // Get all systems from active map
        $systems = $map->getSystemsData();
                
        // empty array to append tags to
        $tags = array();
        
        // iterate over systems and append tag to $tags if security matches targetSystem security
        foreach ($systems as $system) {
            if ($system->security === $targetClass) {
                array_push($tags, $system->tag);
            }
        };            
        
        // sort tags array and iterate to return first empty value
        sort($tags);
        $tag = 0;
        while($tags[$tag] == $tag + 1) {
            $tag++;
        }

        return $tag + 1;
    }
}
