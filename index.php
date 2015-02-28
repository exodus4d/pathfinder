<?php

$f3 = require('app/lib/base.php');

// sync program with eve server time
date_default_timezone_set('UTC');

// load configuration
$f3->config('app/config.cfg');

// load routes
$f3->config('app/routes.cfg');
//print_r($f3);
$f3->run();
