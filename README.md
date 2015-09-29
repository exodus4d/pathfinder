## *PATHFINDER*
Mapping tool for [*EVE ONLINE*](https://www.eveonline.com)

- Project [https://www.pathfinder.exodus4d.de](https://www.pathfinder.exodus4d.de)
- Community [google +](https://plus.google.com/u/0/b/110257318165279088853/110257318165279088853)
- Screenshots [imgur.com](http://imgur.com/a/k2aVa)
- Media [youtube.com](https://www.youtube.com/channel/UC7HU7XEoMbqRwqxDTbMjSPg)
- Licence [MIT](http://opensource.org/licenses/MIT)

##### IMPORTANT Information
**This project is still in beta phase and is not officially released! Feel free to check the code for bugs and security issues. Issues should be reported in the [Issue](https://github.com/exodus4d/pathfinder/issues) section.**

If you are looking for installation help, please check the [wiki](https://github.com/exodus4d/pathfinder/wiki) (DRAFT). More information will be added once the beta is over and the first stable build is released.

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
  | -- node_modules         --> node.js modules (not used for production)
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
