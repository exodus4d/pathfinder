<?php

$f3 = require('app/lib/base.php');

// load main config
$f3->config('app/config.ini');

// load route config
$f3->config('app/routes.ini');

// load cron config
$f3->config('app/cron.ini');

// initiate cron-jobs
Cron::instance();

$f3->run();
