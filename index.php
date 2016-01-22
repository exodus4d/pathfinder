<?php
$f3 = require('app/lib/base.php');

// load main config
$f3->config('app/config.ini');

// set base dir
$f3->set('BASE', \Controller\Controller::getEnvironmentData('BASE'));

// set debug  level (stacktrace)
$f3->set('DEBUG', \Controller\Controller::getEnvironmentData('DEBUG'));

// set debug  level (stacktrace)
$f3->set('URL', \Controller\Controller::getEnvironmentData('URL'));

// initiate cron-jobs
Cron::instance();

$f3->run();