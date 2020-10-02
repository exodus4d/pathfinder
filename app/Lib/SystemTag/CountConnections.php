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
                
        // empty array to append tags to,        
        // iterate over systems and append tag to $tags if security matches targetSystem security 
        // and it is not our home (locked)
        $tags = array();
        foreach ($systems as $system) {
            if ($system->security === $targetClass && !$system->locked) {
                array_push($tags, $system->tag);
            }
        };

        // REMOVE DEBUGGING
        $debugfile = fopen("debuglog.txt", "a");
        fwrite($debugfile, "security: $targetClass\n");
        fwrite($debugfile, print_r($tags, true));

        // try to assign "s(tatic)" tag to connections from our home by checking if source is locked, 
        // if dest is static, and finally if "s" (18) tag is already taken
        if ($sourceSystem->locked){
            if($targetClass == "C5" || $targetClass == "0.0" ){
                if(!in_array(18, $tags)) {
                    return 18;
                }
            }
        }

        // return 0 if array is empty
        if (count($tags) === 0) {
            return 0;
        }

        // sort and uniq tags array and iterate to return first empty value 
        sort($tags);
        $tags = array_unique($tags);           
        $tag = 0;
        while($tags[$tag] == $tag) {
            $tag++;
        }
        
        // REMOVE DEBUGGING        
        fwrite($debugfile, "tag: $tag\n");
        fclose($debugfile);

        return $tag;
    }
}
