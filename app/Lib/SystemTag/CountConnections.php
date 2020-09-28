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
        $whConnections = array_filter($sourceSystem->getConnections(), function (ConnectionModel $connection) {
            return $connection->isWormhole();
        });
        $countWhConnections = count($whConnections);

        // If the source system is locked and has statics we assume it's our home
        // First static is always "1", second always "2" etc., K-connections always start after that and count up
        $statics = $sourceSystem->get_statics();
        if($sourceSystem->locked && is_array($statics) && count($statics)) {
            $staticTypeModels = AbstractUniverseModel::getNew('TypeModel')->find(['name IN ?', preg_filter('/^/', 'Wormhole ', $statics)]);
            if($staticTypeModels) {
                $i = 0;
                // Loop over statics till we find one matching the $targetSystem's security
                foreach($staticTypeModels as $static) {
                    $i++;
                    // Security of static and $targetSystem match -> tag as static number X
                    if($targetSystem->security === $static->getWormholeData()->security) {
                        return $i;
                    }
                }
            }
            // No static matched: count wh connections but reserve at least the number of statics
            return max(count($statics), $countWhConnections) + 1;
        }

        // New connection did not start in "home" -> tag by counting connections
        // Dont +1 because we don't want to count one "incoming" connection
        // But never use 0 (e.g. when a new chain is opened from a K-space system)
        return max($countWhConnections, 1);
    }
}
