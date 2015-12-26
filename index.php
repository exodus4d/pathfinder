<?php

$f3 = require('app/lib/base.php');

// load main config
$f3->config('app/config.ini');

// load route config
$f3->config('app/routes.ini');

// load environment config
$f3->config('app/environment.ini');

// load pathfinder config
$f3->config('app/pathfinder.ini');

// load cron config
$f3->config('app/cron.ini');

// set base dir
$f3->set('BASE', \Controller\Controller::getEnvironmentData('BASE'));

// set debug  level (stacktrace)
$f3->set('DEBUG', \Controller\Controller::getEnvironmentData('DEBUG'));

// set debug  level (stacktrace)
$f3->set('URL', \Controller\Controller::getEnvironmentData('URL'));

// initiate cron-jobs
Cron::instance();

$f3->run();