<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 19.08.2017
 * Time: 04:10
 */

namespace Exodus4D\Pathfinder\Model\Pathfinder;


interface LogModelInterface {

    public function getLogObjectData(): array;

    public function getMap(): MapModel;

    public function getLogData(): array;
}