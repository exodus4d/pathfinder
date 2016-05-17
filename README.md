## *PATHFINDER*
Mapping tool for [*EVE ONLINE*](https://www.eveonline.com)

- Project URL [https://www.pathfinder-w.space](https://www.pathfinder-w.space)
- **NEW** Features: [checkout](https://www.pathfinder-w.space#pf-landing-gallery)
- Official Forum post [https://forums.eveonline.com](https://forums.eveonline.com/default.aspx?g=posts&m=6021776#post6021776)
- Screenshots [imgur.com](http://imgur.com/a/k2aVa)
- Video [youtube.com](https://www.youtube.com/channel/UC7HU7XEoMbqRwqxDTbMjSPg)
- Community [google +](https://plus.google.com/+Pathfinder-wSpace)
- Licence [MIT](http://opensource.org/licenses/MIT)

#### Development
- **NEW** Test server
  - URL: http://www.dev.pathfinder-w.space
  - Running current `develop` branch
  - Using Singularity (SISI) CREST (make sure to use your test-server client)
  - Available for public testing (e.g. new feature,.. )
  - Database will be cleared from time to time
- Installation guide:
  - [wiki](https://github.com/exodus4d/pathfinder/wiki)
- Developer chat [Slack](https://slack.com) :
  - https://pathfinder-eve-online.slack.com
  - Please send me a mail for invite: pathfinder@exodus4d.de

**Feel free to check the code for bugs and security issues.
Issues should be reported in the [Issue](https://github.com/exodus4d/pathfinder/issues) section.**

***

### Project structure

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
      |-- app               --> "PASTHFINDER" core files (not used for production)
      |-- lib               --> 3rd partie extension/library (not used for production)
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
  |-- sass                  --> SCSS source (not used for production)
      |-- ...
  |-- (0777) tmp            --> cache folder
      |-- ...
  |-- (0755) .htaccess      --> reroute/caching rules ("Apache" only!)
  |-- (0755) index.php

  --------------------------
  CI/CD config files:
  --------------------------
  |-- build.js              --> "RequireJs Optimizer" config (not used for production)
  |-- config.rb             --> "Compass" config (not used for production)
  |-- gulpfile.js           --> "Gulp" task config (not used for production )
  |-- package.json          --> "Node.js" dependency config (not used for production)
  |-- README.md             --> This file :) (not used for production)
```

***

### Thanks!

It took me month of time in development until this project got into the first *BETA*. If you like it, please help to improve it.
(report bugs, find security issues,...)
