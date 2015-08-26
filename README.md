## *PATHFINDER*
Mapping tool for *EVE ONLINE*

url: https://www.pathfinder.exodus4d.de
## Directory structure (production)

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
