<?php
namespace Exodus4D\Pathfinder;

use Exodus4D\Pathfinder\Lib;

session_name('pathfinder_session');

$composerAutoloader = 'vendor/autoload.php';
if(file_exists($composerAutoloader)){
    require_once($composerAutoloader);
}else{
    die("Couldn't find '$composerAutoloader'. Did you run `composer install`?");
}

$f3 = \Base::instance();
$f3->set('NAMESPACE', __NAMESPACE__);

// load main config
$f3->config('app/config.ini', true);

// load environment dependent config
Lib\Config::instance($f3);

// initiate cron-jobs
Lib\Cron::instance();

$f3->run();