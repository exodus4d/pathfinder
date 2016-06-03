<?php
$f3 = require('app/lib/base.php');

// load main config
$f3->config('app/config.ini');

// load environment dependent config
lib\Config::instance();

// initiate cron-jobs
Cron::instance();

$f3->run();