<?php
session_name('pathfinder_session');

$composerAutoloader = 'vendor/autoload.php';
if(file_exists($composerAutoloader)){
    require_once($composerAutoloader);
}

$f3 = require_once('app/lib/base.php');

// load main config
$f3->config('app/config.ini', true);

// load environment dependent config
lib\Config::instance($f3);

// initiate cron-jobs
Cron::instance();

$f3->run();