## *PATHFINDER*
Mapping tool for *EVE ONLINE*

url: https://www.pathfinder.exodus4d.de

### Project requirements --------------------------------------------------
#### APACHE Webserver 
  - PHP 5.3.4 or higher
  - PCRE 8.02 or higher (usually shipped with PHP package, but needs to be additionally updated on CentOS or Red Hat systems)
  - mod_rewrite and mod_headers enabled
  - GD libary (for Image plugin)
  - cURL, sockets or stream extension (for Web plugin)
  - Gzip compression
  
  Nginx and Lighttpd configurations are also possible.
  http://fatfreeframework.com/system-requirements
#### Database
  - mysql: MySQL 5.x
  - sqlite: SQLite 3 and SQLite 2
  - pgsql: PostgreSQL
  - sqlsrv: Microsoft SQL Server / SQL Azure
  - mssql, dblib, sybase: FreeTDS / Microsoft SQL Server / Sybase
  - odbc: ODBC v3
  - oci: Oracle

  Here is a list of links to DSN connection details for all currently supported engines in the SQL layer:
  http://fatfreeframework.com/sql
#### Development Environment
  - t.b.a.

### Folder structure (production) ----------------------------------------

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
  | -- node_modules         --> node.js modules (not used for production )     
      |-- ...
  |-- (0755) public         --> frontend source
      |-- css               --> CSS build folder (minified)
      |-- fonts             --> Web/Icon fonts
      |-- img               --> images
      |-- templates         --> templates
  |-- sass                  --> SCSS source (not used for production )
      |-- ...
  |-- (0777) tmp            --> cache folder
      |-- ...
  |-- (0755) .htaccess      --> reroute/caching rules
  |-- (0755) index.php
```
