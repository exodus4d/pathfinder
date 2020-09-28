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
}