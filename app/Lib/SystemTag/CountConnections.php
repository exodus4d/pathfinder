<?php

namespace Exodus4D\Pathfinder\Lib\SystemTag;

use Exodus4D\Pathfinder\Model\Pathfinder\ConnectionModel;
use Exodus4D\Pathfinder\Model\Pathfinder\MapModel;
use Exodus4D\Pathfinder\Model\Pathfinder\SystemModel;
use Exodus4D\Pathfinder\Model\Universe\AbstractUniverseModel;
use Exodus4D\Pathfinder\Lib\SystemTag;

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
        $debugfile = fopen("jumplog.txt", "a");
        fwrite($debugfile, "security: $targetClass\n");
        fwrite($debugfile, print_r($tags, true));

        // try to assign "s(tatic)" tag to connections from our home by checking if source is locked, 
        // if dest is static, and finally if "s" (18) tag is already taken
        if ($sourceSystem->locked){
            fwrite($debugfile, "system is locked\n");
            if($targetClass == "C5" || $targetClass == "0.0" ){
                fwrite($debugfile, "target class is $targetClass\n");
                if(!in_array('s', $tags)) {
                    fwrite($debugfile, "s is not assigned\n");
                    return 's';
                }
            }
        }

        // return 'a' if array is empty
        if (count($tags) === 0) {
            return 'a';
        }

        // sort and uniq tags array and iterate to return first empty value 
        sort($tags);
        $tags = array_unique($tags);           
        $i = 0;
        while($tags[$i] == $i) {
            $i++;
        }
        
        $char = SystemTag::intToTag($i);

        // REMOVE DEBUGGING                
        fwrite($debugfile, "char: $char\n");
        fclose($debugfile);
        
        return $char;
    }
}
