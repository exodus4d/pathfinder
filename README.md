## *PATHFINDER*
Mapping tool for [*EVE ONLINE*](https://www.eveonline.com)

- Project[https://www.pathfinder.exodus4d.de](https://www.pathfinder.exodus4d.de)
- Community[google +](https://plus.google.com/u/0/b/110257318165279088853/110257318165279088853)
- Screenshots[imgur.com](http://imgur.com/a/k2aVa)
- Media[youtube.com](https://www.youtube.com/channel/UC7HU7XEoMbqRwqxDTbMjSPg)
- Licence[MIT](http://opensource.org/licenses/MIT)

##### Beta Information
> This project is still in beta phase and is not officially released! Feel free to check the code for security issues.
You can not get the project to work, on your own server, until some required SQL dumps have been included to this repository!
I will provide all required dumps once the beta phase is over.

## Requirements
#### APACHE Webserver 
  - PHP 5.3.4 or higher
  - PCRE 8.02 or higher (usually shipped with PHP package, but needs to be additionally updated on CentOS or Red Hat systems)
  - mod_rewrite and mod_headers enabled
  - GD libary (for Image plugin)
  - cURL, sockets or stream extension (for Web plugin)
  - Gzip compression
  
> Nginx and Lighttpd configurations are also possible.
http://fatfreeframework.com/system-requirements
#### Database
  - mysql: MySQL 5.x
  - sqlite: SQLite 3 and SQLite 2
  - pgsql: PostgreSQL
  - sqlsrv: Microsoft SQL Server / SQL Azure
  - mssql, dblib, sybase: FreeTDS / Microsoft SQL Server / Sybase
  - odbc: ODBC v3
  - oci: Oracle

>Here is a list of links to DSN connection details for all currently supported engines in the SQL layer:
http://fatfreeframework.com/sql

## Setup
#### Backend (PHP)

*PATHFINDER* is pretty easy to configure! If you are not planning "getting your hands dirty" with programming stuff,
you don´t have to change a lot. All configuration files can be found here:
- [config.ini](https://github.com/exodus4d/pathfinder/blob/master/app/config.ini) Main config **(DO NOT CHANGE)**
- [pathfinder.ini](https://github.com/exodus4d/pathfinder/blob/master/app/pathfinder.ini) Pathfinder config
- [cron.ini](https://github.com/exodus4d/pathfinder/blob/master/app/cron.ini) Cronjob config
- [routes.ini](https://github.com/exodus4d/pathfinder/blob/master/app/routes.ini) Routes config **(DO NOT CHANGE)**

> The default configuration should be fine in most cases. Edit all values with caution!

#### Frontend (JS)
There is **no** need to change any javascript configuration, except *Signature names* that can be changed/added
- [init.js](https://github.com/exodus4d/pathfinder/blob/master/js/app/init.js) Main config **(DO NOT CHANGE)**
- [signature_type.js](https://github.com/exodus4d/pathfinder/blob/master/js/app/config/signature_type.js) Signature mapping config **(DO NOT CHANGE)**
- [system_effect](https://github.com/exodus4d/pathfinder/blob/master/js/app/config/system_effect.js) System effect config **(DO NOT CHANGE)**

> If you found any *Signature Names* or other information missing in these files, please create an [Issue](https://github.com/exodus4d/pathfinder/issues) for that!
I´ll try to fix it with the next release.
If you still want to change anything in here, make sure to run the `build` process afterwards (see below).

## Development Environment
*PATHFINDER* comes along with a simple, [*Gulp*](http://gulpjs.com/) based, build process.
There are two main *Gulp tasks* that should help you.
- `default` task is designed for *"continuous development"* scenario
- `production` task is designed for *"production deployment"* scenario

> If you are **not** planning to change the codebase, you don´t have to do the following steps!

**1. Install [Node.js](https://nodejs.org)(> v.4.0.1) with [npm](https://www.npmjs.com/)**

**2. [Copy/Fork](https://help.github.com/articles/fork-a-repo/) this Repo**
  ```
  $ git clone https://github.com/exodus4d/pathfinder.git
  ```
**3. Install all required `node_modules` for *"continuous development"* from `package.json` (e.g.[Gulp](http://gulpjs.com/))**
  ```
  $ npm install
  ```
**4. Run *Gulp* task `default` with your version `tag` as param. It will do:**
 - clean `dist` folder (./public/js/x.x.x)
 - init file watcher for \*.js changes
 - running [jsHint](http://jshint.com/docs/) on file change
 - copying **raw** *\*.js* files from *./js* to `dist` folder on file change
  ```
  $ gulp default --tag v0.0.10
  ```

## Production Environment
**1. Install all required dependencies (check "Development Environment" steps )**

**2. Run *Gulp* task `production` with your version `tag` as param. It will do:**
 - clean `dist` folder (./public/js/x.x.x)
 - running [jsHint](http://jshint.com/docs/)
 - running [requireJs Optimizer](http://requirejs.org/docs/optimization.html) (see [build.js](https://github.com/exodus4d/pathfinder/blob/master/build.js))
    - minify \*.js files
    - uglyfy \*.js files
    - combine \*.js dependencies
    - generate \.js `source maps`
    - copying **compressed** *\*.js* to `dist` folder for production deployment
  ```
  $ gulp production --tag v0.0.10
  ```
> The `production` task may take some seconds (30+ seconds)!
As a result, you should have all generated \*.js files ready for deployment in the `dist` folder.
The unique version `tag` in this path should ensure that `cache busting` is working correct.

## CSS generation
If you are planning to change/edit any *CSS* styles, you need to install [Compass](http://compass-style.org/),
in order to build the single \*.css file out of the **raw** \*.scss source files.

**1. [Ruby install](https://www.ruby-lang.org/en/)**

**2. [Compass install](http://compass-style.org/install/)**

**3. Start *Compass* file watcher for \*.scss changes in project `root` (see [config.rb](https://github.com/exodus4d/pathfinder/blob/master/config.rb))**
  ```
  $ compass watch
  ```
> This will watch all \*.scss files for changes and generate a compressed \*.css file (./public/css/pathfinder.css).
Don´t worry about `cache busting`. Your current version `tag` will be added to the final path (e.g. ./public/css/pathfinder.css?v.0.0.10)

## SQL Schema
To get *PATHFINDER* to work, you will need (at least) **two** databases. The first one is the [SDE](https://developers.eveonline.com/resource/static-data-export)
from *CCP*. The second database is *PATHFINDERS*´s own DB. Make sure, you have the correct DB export for your version!

**1. *CCP* Static Data Export ([SDE](https://developers.eveonline.com/resource/static-data-export))**

You need to import the Eve SDE into the database specified in the `DB_CCP_*` settings. You can do this like the following:
  ```
  wget https://www.fuzzwork.co.uk/dump/mysql-latest.tar.bz2
  tar xf mysql-latest.tar.bz2
  cd mysql-{}/
  mysql -u -p __DATABASE_NAME__ < db_file.sql
  ```
> If you need an older versions of the SDE, check out[**Fuzzwork**](https://www.fuzzwork.co.uk/dump/)´s awesome dumps!

**2. *PATHFINDER* Clean Data Export ([CDE](https://www.google.de))**
> Make sure, that all column `indexes` and foreign `key constraints` have been imported correct!
Otherwise you will get DB errors and the cache engine can not track all tables (Models), which may result in bad performance!

## Cronjob configuration
*PATHFINDER* requires some dynamic `system data` from *CCP*´s [XML APIv2](http://wiki.eve-id.net/APIv2_Page_Index).
This data is automatically imported by a [*Cron-Job*](https://en.wikipedia.org/wiki/Cron) into the DB.

Moreover, there are some predefined *Cron-Jobs* that handle some `db maintenance` and clean up tasks.

You have to setup a **single** *Cron-Jobs* for this, that handles **all** other *Cron-Jobs* and works as a "*dispatcher*".
 - **Important**: Block access to `[YOUR INSTALLATION]/cron` (e.g. by `.htaccess` or edit `cron.ini`)
 - Trigger `[YOUR INSTALLATION]/cron` by [*CLI*](http://php.net/manual/en/features.commandline.php) **every minute**, e.g create `cron.phpx`:
 ``` php
    exec('wget -qO- /dev/null [YOUR INSTALLATION]/cron &> /dev/null', $out, $result);
    echo "start:";
    echo "Returncode: " .$result ."<br>";
    echo "Ausgabe des Scripts: " ."<br>";
    echo "<pre>"; print_r($out);
 ```
 - ... or use [*CURL*](http://php.net/manual/en/book.curl.php) for this ;)

## Project structure

```
  |-- (0755) app              --> backend [*.php]
      |-- app               --> "Fat Free Framework" extensions
      |-- lib               --> "Fat Free Framework"
      |-- main              --> "PATHFINDER" root
      |-- config.ini        --> config "f3" framework
      |-- cron.ini          --> config cronjobs
      |-- pathfinder.ini    --> config pathfinder
      |-- routes.ini        --> config routes
  |-- (0755) build_js       --> JS build folder and source maps (minified, uglified)
      |-- app               --> "PATHFINDER" core files
      |-- lib               --> 3rd partie extension/library
      |-- build.txt         --> generated build summary
  |-- (0755) js             --> JS source files (raw)
      |-- app               --> "PASTHFINDER" core files (not used for production )
      |-- lib               --> 3rd partie extension/library (not used for production )
      |-- app.js            --> require.js config (!required for production!)
  |-- (0777) logs           --> log files
      |-- ...
  | -- node_modules         --> node.js modules (not used for production) [check "Development Environment" section]
      |-- ...
  |-- (0755) public         --> frontend source
      |-- css               --> CSS dist/build folder (minified)
      |-- fonts             --> (icon)-Fonts
      |-- img               --> images
      |-- js                --> JS dist/build folder
      |-- templates         --> templates
  |-- sass                  --> SCSS source (not used for production )
      |-- ...
  |-- (0777) tmp            --> cache folder
      |-- ...
  |-- (0755) .htaccess      --> reroute/caching rules
  |-- (0755) index.php

  --------------------------
  CI/CD config files:
  --------------------------
  |-- build.js              --> "RequireJs Optimizer" config (not used for production )
  |-- config.rb             --> "Compass" config (not used for production )
  |-- gulpfile.js           --> "Gulp" task config (not used for production )
  |-- package.json          --> "Node.js" dependency config (not used for production )
  |-- README.md             --> This file :) (not used for production )
```

## Thanks!
I´m very proud that **you** are using *PATHFINDER*!

It took me month of time in development until this project got into the first *BETA*. If you like it, please help to improve it.
(report bugs, find security issues,...)