## *PATHFINDER*
Mapping tool for [*EVE ONLINE*](https://www.eveonline.com)

- Project [https://www.pathfinder.exodus4d.de](https://www.pathfinder.exodus4d.de)
- Official Forum post [https://forums.eveonline.com](https://forums.eveonline.com/default.aspx?g=posts&m=6021776#post6021776)
- Screenshots [imgur.com](http://imgur.com/a/k2aVa)
- Video [youtube.com](https://www.youtube.com/channel/UC7HU7XEoMbqRwqxDTbMjSPg)
- Community [google +](https://plus.google.com/u/0/b/110257318165279088853/110257318165279088853)
- Licence [MIT](http://opensource.org/licenses/MIT)

##### IMPORTANT Information:
**The setup and installation process in ``1.0.0RC1`` and is not backwards compatible with previous beta releases (check wiki)!**

**Feel free to check the code for bugs and security issues.
Issues should be reported in the [Issue](https://github.com/exodus4d/pathfinder/issues) section.**

If you are looking for installation help, please check the [wiki](https://github.com/exodus4d/pathfinder/wiki).
More information will be added once the beta is over and the first stable build is released.

## Project structure

```
  |-- (0755) app            --> backend [*.php]
      |-- app               --> "Fat Free Framework" extensions
      |-- lib               --> "Fat Free Framework"
      |-- main              --> "PATHFINDER" root
      |-- config.ini        --> config "f3" framework
      |-- cron.ini          --> config - cronjobs
      |-- environment.ini   --> config - system environment
      |-- pathfinder.ini    --> config - pathfinder
      |-- requirements.ini  --> config - system requirements
      |-- routes.ini        --> config - routes
  |-- (0755) export         --> DB export data
      |-- sql               --> static DB data for import (pathfinder.sql)
  |-- (0755) favicon        --> Favicons
  |-- (0755) js             --> JS source files (raw)
      |-- app               --> "PASTHFINDER" core files (not used for production )
      |-- lib               --> 3rd partie extension/library (not used for production )
      |-- app.js            --> require.js config (!required for production!)
  |-- (0777) logs           --> log files
      |-- ...
  | -- node_modules         --> node.js modules (not used for production)
      |-- ...
  |-- (0755) public         --> frontend source
      |-- css               --> CSS dist/build folder (minified)
      |-- fonts             --> (icon)-Fonts
      |-- img               --> images
      |-- js                --> JS dist/build folder and source maps (minified, uglified)
      |-- templates         --> templates
  |-- sass                  --> SCSS source (not used for production )
      |-- ...
  |-- (0777) tmp            --> cache folder
      |-- ...
  |-- (0755) .htaccess      --> reroute/caching rules ("Apache" only!)
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
