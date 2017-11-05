<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 19.08.2017
 * Time: 04:10
 */

namespace Model;


interface LogModelInterface {

    public function getLogObjectData(): array;

    public function getMap(): MapModel;

    public function getLogData(): array;
}