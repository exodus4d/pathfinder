<?php

if (!file_exists(__DIR__ . 'public/' . $_SERVER['REQUEST_URI'])) {
    $_GET['_url'] = $_SERVER['REQUEST_URI'];
}

return false;