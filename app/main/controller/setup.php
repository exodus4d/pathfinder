<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 22.11.2015
 * Time: 10:59
 */

namespace Controller;

use Controller\Ccp\Universe;
use data\filesystem\Search;
use DB;
use DB\SQL;
use DB\SQL\MySQL as MySQL;
use lib\Config;
use lib\Util;
use Model;

class Setup extends Controller {

    /**
     * required environment variables
     * @var array
     */
    protected $environmentVars = [
        'ENVIRONMENT_CONFIG',
        'BASE',
        'URL',
        'DEBUG',
        'DB_PF_DNS',
        'DB_PF_NAME',
        'DB_PF_USER',
        'DB_PF_PASS',
        'DB_CCP_DNS',
        'DB_CCP_NAME',
        'DB_CCP_USER',
        'DB_CCP_PASS',
        'CCP_SSO_URL',
        'CCP_SSO_CLIENT_ID',
        'CCP_SSO_SECRET_KEY',
        'CCP_ESI_URL',
        'CCP_ESI_DATASOURCE',
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_SCHEME',
        'SMTP_USER',
        'SMTP_PASS',
        'SMTP_FROM',
        'SMTP_ERROR'
    ];

    /**
     * required database setup
     * @var array
     */
    protected $databases = [
        'PF' => [
            'info' => [],
            'models' => [
                'Model\UserModel',
                'Model\AllianceModel',
                'Model\CorporationModel',
                'Model\MapModel',
                'Model\MapScopeModel',
                'Model\MapTypeModel',
                'Model\SystemTypeModel',
                'Model\SystemStatusModel',
                'Model\SystemNeighbourModel',
                'Model\WormholeModel',
                'Model\RightModel',
                'Model\RoleModel',
                'Model\StructureModel',

                'Model\CharacterStatusModel',
                'Model\ConnectionScopeModel',
                'Model\StructureStatusModel',

                'Model\CharacterMapModel',
                'Model\AllianceMapModel',
                'Model\CorporationMapModel',

                'Model\CorporationRightModel',
                'Model\CorporationStructureModel',

                'Model\UserCharacterModel',
                'Model\CharacterModel',
                'Model\CharacterAuthenticationModel',
                'Model\CharacterLogModel',

                'Model\SystemModel',
                'Model\SystemWormholeModel',
                'Model\ConstellationWormholeModel',

                'Model\ConnectionModel',
                'Model\ConnectionLogModel',
                'Model\SystemSignatureModel',

                'Model\ActivityLogModel',

                'Model\SystemShipKillModel',
                'Model\SystemPodKillModel',
                'Model\SystemFactionKillModel',
                'Model\SystemJumpModel'
            ],
            'tables' =>  []
        ],
        'UNIVERSE' => [
            'info' => [],
            'models' => [
                'Model\Universe\TypeModel',
                'Model\Universe\GroupModel',
                'Model\Universe\CategoryModel',
                'Model\Universe\StructureModel',
                // 'Model\Universe\WormholeModel',
                // 'Model\Universe\StargateModel',
                // 'Model\Universe\StarModel',
                // 'Model\Universe\PlanetModel',
                // 'Model\Universe\SystemModel',
                // 'Model\Universe\ConstellationModel',
                // 'Model\Universe\RegionModel',
                // 'Model\Universe\SystemStaticModel'
            ],
            'tables' =>  []
        ],
        'CCP' => [
            'info' => [],
            'models' => [],
            'tables' =>  [
                'invTypes',
                'mapConstellations',
                'mapDenormalize',
                'mapLocationWormholeClasses',
                'mapRegions',
                'mapSolarSystemJumps',
                'mapSolarSystems'
            ]

        ]
    ];

    /**
     * @var DB\Database
     */
    protected $dbLib = null;

    /**
     * database error
     * @var bool
     */
    protected $databaseHasError = false;

    /**
     * event handler for all "views"
     * some global template variables are set in here
     * @param \Base $f3
     * @param array $params
     * @return bool
     * @throws \Exception\PathfinderException
     */
    function beforeroute(\Base $f3, $params): bool {
        // init dbLib class. Manages all DB connections
        $this->dbLib = DB\Database::instance();

        // page title
        $f3->set('tplPageTitle', 'Setup | ' . Config::getPathfinderData('name'));

        // main page content
        $f3->set('tplPageContent', Config::getPathfinderData('view.setup'));

        // body element class
        $f3->set('tplBodyClass', 'pf-landing');

        // js path (build/minified or raw uncompressed files)
        $f3->set('tplPathJs', 'public/js/' . Config::getPathfinderData('version') );

        return true;
    }

    /**
     * @param \Base $f3
     * @throws \Exception\PathfinderException
     */
    public function afterroute(\Base $f3) {
        // js view (file)
        $f3->set('tplJsView', 'setup');

        // set render functions (called within template)
        $f3->set('cacheType', function(){
            $cacheType = $this->getF3()->get('CACHE');
            if( strpos($cacheType, 'redis') !== false ){
                $cacheType = 'redis';
            }
            return $cacheType;
        });

        // simple counter (called within template)
        $counter = 0;
        $f3->set('tplCounter', function(string $action = 'add') use (&$counter){
            switch($action){
                case 'add': $counter++; break;
                case 'get': return $counter; break;
                case 'reset': $counter = 0; break;
            }
        });

        // render view
        echo \Template::instance()->render( Config::getPathfinderData('view.index') );
    }

    /**
     * main setup route handler
     * works as dispatcher for setup functions
     * -> for security reasons all /setup "routes" are dispatched by GET params
     * @param \Base $f3
     * @throws \Exception
     */
    public function init(\Base $f3){
        $params = $f3->get('GET');

        // enables automatic column fix
        $fixColumns = false;

        switch($params['action']){
            case 'createDB':
                $this->createDB($params['db']);
                break;
            case 'bootstrapDB':
                $this->bootstrapDB($params['db']);
                break;
            case 'fixCols':
                $fixColumns = true;
                break;
            case 'importTable':
                $this->importTable($params['model']);
                break;
            case 'exportTable':
                $this->exportTable($params['model']);
                break;
            case 'clearCache':
                $this->clearCache($f3);
                break;
            case 'invalidateCookies':
                $this->invalidateCookies($f3);
                break;
        }

        // set template data ----------------------------------------------------------------
        // set environment information
        $f3->set('environmentInformation', $this->getEnvironmentInformation($f3));

        // set server information
        $f3->set('serverInformation', $this->getServerInformation($f3));

        // set requirement check information
        $f3->set('checkRequirements', $this->checkRequirements($f3));

        // set php config check information
        $f3->set('checkPHPConfig', $this->checkPHPConfig($f3));

        // set system config check information
        $f3->set('checkSystemConfig', $this->checkSystemConfig($f3));

        // set map default config
        $f3->set('mapsDefaultConfig', $this->getMapsDefaultConfig($f3));

        // set database connection information
        $f3->set('checkDatabase', $this->checkDatabase($f3, $fixColumns));

        // set socket information
        $f3->set('socketInformation', $this->getSocketInformation());

        // set index information
        $f3->set('indexInformation', $this->getIndexData($f3));

        // set cache size
        $f3->set('cacheSize', $this->getCacheData($f3));
    }

    /**
     * IMPORTANT: This function is not required for setup. It just imports *.json -> DB
     *
     * imports wormhole static data for "shattered" systems
     * into table "system_wormhole"
     * -> a *.csv dump of this *.json file can e found under /export/csv
     * @param \Base $f3
     * @throws \Exception
     */
    protected function importSystemWormholesFromJson(\Base $f3){
        $path = $f3->get('EXPORT') .'json/statics.json';
        $pfDB = $this->getDB('PF');
        $ccpDB = $this->getDB('CCP');

        $content = file_get_contents($path);

        $jsonIterator = new \RecursiveIteratorIterator(
            new \RecursiveArrayIterator(json_decode($content, TRUE)),
            \RecursiveIteratorIterator::SELF_FIRST);

        $staticNames = [];

        $data = [];
        $tmpVal = (object) [];
        foreach ($jsonIterator as $key => $val) {
            if(is_array($val)) {
                if(isset($tmpVal->name)){
                    $data[] = $tmpVal;
                }
                $tmpVal = (object) [];
                $tmpVal->name = $key;
            } else {
                $tmpVal->wh = isset($tmpVal->wh) ? array_merge($tmpVal->wh, [$val]) :  [$val];
                $staticNames[] = $val;
            }
        }
        $data[] = $tmpVal;

        // get static IDs by name ------------------------------
        $staticNames = array_unique($staticNames);
        $staticNames = array_flip($staticNames);
        foreach($staticNames as $name => $index){
            $result  = $pfDB->exec("
                            SELECT
                              id
                            FROM " . $pfDB->quotekey(Model\BasicModel::getNew('WormholeModel')->getTable()) . "
                            WHERE " . $pfDB->quotekey('name') . " = :name",
                [':name' => $name]
            );
            $id = (int)$result[0]['id'];
            if($id){
                $staticNames[$name] = (int)$result[0]['id'];
            }else{
                $f3->error(500, 'Wormhole data missing in table "wormhole" for "name" = "' . $name . '"');
            }
        }

        // import data -----------------------------------------
        $systemWormhole = Model\BasicModel::getNew('SystemWormholeModel');
        foreach($data as $staticData){
            $result  = $ccpDB->exec("
                            SELECT
                              solarSystemID
                            FROM " . $ccpDB->quotekey('mapSolarSystems') . "
                            WHERE
                                " . $ccpDB->quotekey('solarSystemName') . " = :systemName",
                [':systemName' => $staticData->name]
            );

            $solarSystemID = (int)$result[0]['solarSystemID'];
            if($solarSystemID){
                foreach($staticData->wh as $wh){
                    $staticId = (int)$staticNames[$wh];
                    if($staticId){
                        // check if entry already exists
                        $systemWormhole->load(['systemId=? AND wormholeId=?', $solarSystemID, $staticId]);
                        if( $systemWormhole->dry() ){
                            $systemWormhole->systemId = $solarSystemID;
                            $systemWormhole->wormholeId = $staticId;
                            $systemWormhole->save();
                            $systemWormhole->reset();
                        }
                    }else{
                        $f3->error(500, 'Wormhole data missing for "name" = "' . $wh . '"');
                    }
                }
            }else{
                $f3->error(500, 'System "' . $staticData->name . '" not found on CCP´s [SDE] database');
            }
        }
    }

    /**
     * set environment information
     * @param \Base $f3
     * @return array
     */
    protected function getEnvironmentInformation(\Base $f3){
        $environmentData = [];
        // exclude some sensitive data (e.g. database, passwords)
        $excludeVars = [
            'DB_PF_DNS',    'DB_PF_NAME',   'DB_PF_USER',   'DB_PF_PASS',
            'DB_CCP_DNS',   'DB_CCP_NAME',  'DB_CCP_USER',  'DB_CCP_PASS'
        ];

        // obscure some values
        $obscureVars = ['CCP_SSO_CLIENT_ID', 'CCP_SSO_SECRET_KEY', 'SMTP_PASS'];

        foreach($this->environmentVars as $var){
            if( !in_array($var, $excludeVars) ){
                $value = Config::getEnvironmentData($var);
                $check = true;

                if(is_null($value)){
                    // variable missing
                    $check = false;
                    $value = '[missing]';
                }elseif( in_array($var, $obscureVars)){
                    $value = Util::obscureString($value);
                }

                $environmentData[$var] = [
                    'label' => $var,
                    'value' => ((empty($value) && !is_int($value)) ? '&nbsp;' : $value),
                    'check' => $check
                ];
            }
        }

        return $environmentData;
    }

    /**
     * get server information
     * @param \Base $f3
     * @return array
     */
    protected function getServerInformation(\Base $f3){
        $serverInfo = [
            'time' => [
                'label' => 'Time',
                'value' => date('Y/m/d H:i:s') . ' - (' . $f3->get('TZ') . ')'
            ],
            'os' => [
                'label' => 'OS',
                'value' => function_exists('php_uname') ? php_uname('s') : $_SERVER['OS']
            ],
            'name' => [
                'label' => 'Host name',
                'value' => function_exists('php_uname') ? php_uname('n') : $_SERVER['SERVER_NAME']
            ],
            'release' => [
                'label' => 'Release name',
                'value' => function_exists('php_uname') ? php_uname('r') : 'unknown'
            ],
            'version' => [
                'label' => 'Version info',
                'value' => function_exists('php_uname') ? php_uname('v') : 'unknown'
            ],
            'machine' => [
                'label' => 'Machine type',
                'value' => function_exists('php_uname') ? php_uname('m') : $_SERVER['PROCESSOR_ARCHITECTURE']
            ],
            'root' => [
                'label' => 'Document root',
                'value' => $f3->get('ROOT')
            ],
            'port' => [
                'label' => 'Port',
                'value' => $f3->get('PORT')
            ],
            'protocol' => [
                'label' => 'Protocol',
                'value' => strtoupper( $f3->get('SCHEME') )
            ]
        ];

        return $serverInfo;
    }

    /**
     * check all required backend requirements
     * (Fat Free Framework)
     * @param \Base $f3
     * @return array
     */
    protected function checkRequirements(\Base $f3){

        // server type ------------------------------------------------------------------
        $serverData = self::getServerData(0);

        $checkRequirements = [
            'serverType' => [
                'label' => 'Server type',
                'version' => $serverData->type,
                'check' => true
            ],
            'serverVersion' => [
                'label' => 'Server version',
                'required' => $serverData->requiredVersion,
                'version' => $serverData->version,
                'check' => version_compare( $serverData->version, $serverData->requiredVersion, '>='),
                'tooltip' => 'If not specified, please check your \'ServerTokens\' server config. (not critical)'
            ],
            'phpInterface' => [
                'label' => 'PHP interface type',
                'version' => $serverData->phpInterfaceType,
                'check' => empty($serverData->phpInterfaceType) ? false : true
            ],
            'php' => [
                'label' => 'PHP',
                'required' => number_format((float)$f3->get('REQUIREMENTS.PHP.VERSION'), 1, '.', ''),
                'version' => phpversion(),
                'check' => version_compare( phpversion(), $f3->get('REQUIREMENTS.PHP.VERSION'), '>=')
            ],
            'php_bit' => [
                'label' => 'php_int_size',
                'required' => ($f3->get('REQUIREMENTS.PHP.PHP_INT_SIZE') * 8 ) . '-bit',
                'version' => (PHP_INT_SIZE * 8) . '-bit',
                'check' => $f3->get('REQUIREMENTS.PHP.PHP_INT_SIZE') == PHP_INT_SIZE
            ],
            [
                'label' => 'PHP extensions'
            ],
            'pcre' => [
                'label' => 'PCRE',
                'required' => $f3->get('REQUIREMENTS.PHP.PCRE_VERSION'),
                'version' => strstr(PCRE_VERSION, ' ', true),
                'check' => version_compare( strstr(PCRE_VERSION, ' ', true), $f3->get('REQUIREMENTS.PHP.PCRE_VERSION'), '>=')
            ],
            'ext_pdo' => [
                'label' => 'PDO',
                'required' => 'installed',
                'version' => extension_loaded('pdo') ? 'installed' : 'missing',
                'check' => extension_loaded('pdo')
            ],
            'ext_pdoMysql' => [
                'label' => 'PDO_MYSQL',
                'required' => 'installed',
                'version' => extension_loaded('pdo_mysql') ? 'installed' : 'missing',
                'check' => extension_loaded('pdo_mysql')
            ],
            'ext_openssl' => [
                'label' => 'OpenSSL',
                'required' => 'installed',
                'version' => extension_loaded('openssl') ? 'installed' : 'missing',
                'check' => extension_loaded('openssl')
            ],
            'ext_xml' => [
                'label' => 'XML',
                'required' => 'installed',
                'version' => extension_loaded('xml') ? 'installed' : 'missing',
                'check' => extension_loaded('xml')
            ],
            'ext_gd' => [
                'label' => 'GD Library (for Image plugin)',
                'required' => 'installed',
                'version' => (extension_loaded('gd') && function_exists('gd_info')) ? 'installed' : 'missing',
                'check' => (extension_loaded('gd') && function_exists('gd_info'))
            ],
            'ext_curl' => [
                'label' => 'cURL (for Web plugin)',
                'required' => 'installed',
                'version' => (extension_loaded('curl') && function_exists('curl_version')) ? 'installed' : 'missing',
                'check' => (extension_loaded('curl') && function_exists('curl_version'))
            ],
            [
                'label' => 'Redis Server [optional]'
            ],
            'ext_redis' => [
                'label' => 'Redis',
                'required' => $f3->get('REQUIREMENTS.PHP.REDIS'),
                'version' => extension_loaded('redis') ? phpversion('redis') : 'missing',
                'check' => version_compare( phpversion('redis'), $f3->get('REQUIREMENTS.PHP.REDIS'), '>='),
                'tooltip' => 'Redis can replace the default file-caching mechanic. It is much faster!'
            ],
            [
                'label' => 'ØMQ TCP sockets [optional]'
            ],
            'ext_zmq' => [
                'label' => 'ZeroMQ extension',
                'required' => $f3->get('REQUIREMENTS.PHP.ZMQ'),
                'version' => extension_loaded('zmq') ? phpversion('zmq') : 'missing',
                'check' => version_compare( phpversion('zmq'), $f3->get('REQUIREMENTS.PHP.ZMQ'), '>='),
                'tooltip' => 'ØMQ PHP extension. Required for WebSocket configuration.'
            ],
            'lib_zmq' => [
                'label' => 'ZeroMQ installation',
                'required' => $f3->get('REQUIREMENTS.LIBS.ZMQ'),
                'version' => (class_exists('ZMQ') && defined('ZMQ::LIBZMQ_VER')) ? \ZMQ::LIBZMQ_VER : 'unknown',
                'check' => version_compare( (class_exists('ZMQ') && defined('ZMQ::LIBZMQ_VER')) ? \ZMQ::LIBZMQ_VER : 0, $f3->get('REQUIREMENTS.LIBS.ZMQ'), '>='),
                'tooltip' => 'ØMQ version. Required for WebSocket configuration.'
            ],
            [
                'label' => 'LibEvent library [optional]'
            ],
            'ext_event' => [
                'label' => 'Event extension',
                'required' => $f3->get('REQUIREMENTS.PHP.EVENT'),
                'version' => extension_loaded('event') ? phpversion('event') : 'missing',
                'check' => version_compare( phpversion('event'), $f3->get('REQUIREMENTS.PHP.EVENT'), '>='),
                'tooltip' => 'LibEvent PHP extension. Optional performance boost for WebSocket configuration.'
            ]
        ];

        if($serverData->type != 'nginx'){
            // default msg if module status not available
            $modNotFoundMsg = 'Module status can not be identified. '
                . 'This can happen if PHP runs as \'FastCGI\'. Please check manual! ';

            // mod_rewrite check ------------------------------------------------------------
            $modRewriteCheck = false;
            $modRewriteVersion = 'disabled';
            $modRewriteTooltip = false;
            if(function_exists('apache_get_modules')){
                if(in_array('mod_rewrite',apache_get_modules())){
                    $modRewriteCheck = true;
                    $modRewriteVersion = 'enabled';
                }
            }else{
                // e.g. Nginx server
                $modRewriteVersion = 'unknown';
                $modRewriteTooltip = $modNotFoundMsg;
            }

            $checkRequirements['mod_rewrite'] = [
                'label' => 'mod_rewrite',
                'required' => 'enabled',
                'version' => $modRewriteVersion,
                'check' => $modRewriteCheck,
                'tooltip' => $modRewriteTooltip
            ];

            // mod_headers check ------------------------------------------------------------
            $modHeadersCheck = false;
            $modHeadersVersion = 'disabled';
            $modHeadersTooltip = false;
            if(function_exists('apache_get_modules')){
                if(in_array('mod_headers',apache_get_modules())){
                    $modHeadersCheck = true;
                    $modHeadersVersion = 'enabled';
                }
            }else{
                // e.g. Nginx server
                $modHeadersVersion = 'unknown';
                $modHeadersTooltip = $modNotFoundMsg;
            }

            $checkRequirements['mod_headers'] = [
                'label' => 'mod_headers',
                'required' => 'enabled',
                'version' => $modHeadersVersion,
                'check' => $modHeadersCheck,
                'tooltip' => $modHeadersTooltip
            ];
        }

        return $checkRequirements;
    }

    /**
     * check PHP config (php.ini)
     * @param \Base $f3
     * @return array
     */
    protected function checkPHPConfig(\Base $f3): array {
        $phpConfig = [
            'exec' => [
                'label' => 'exec()',
                'required' => $f3->get('REQUIREMENTS.PHP.EXEC'),
                'version' => function_exists('exec'),
                'check' => function_exists('exec') == $f3->get('REQUIREMENTS.PHP.EXEC'),
                'tooltip' => 'exec() funktion. Check "disable_functions" in php.ini'
            ],
            'maxInputVars' => [
                'label' => 'max_input_vars',
                'required' => $f3->get('REQUIREMENTS.PHP.MAX_INPUT_VARS'),
                'version' => ini_get('max_input_vars'),
                'check' => ini_get('max_input_vars') >= $f3->get('REQUIREMENTS.PHP.MAX_INPUT_VARS'),
                'tooltip' => 'PHP default = 1000. Increase it in order to import larger maps.'
            ],
            'maxExecutionTime' => [
                'label' => 'max_execution_time',
                'required' => $f3->get('REQUIREMENTS.PHP.MAX_EXECUTION_TIME'),
                'version' => ini_get('max_execution_time'),
                'check' => ini_get('max_execution_time') >= $f3->get('REQUIREMENTS.PHP.MAX_EXECUTION_TIME'),
                'tooltip' => 'PHP default = 30. Max execution time for PHP scripts.'
            ],
            'htmlErrors' => [
                'label' => 'html_errors',
                'required' => $f3->get('REQUIREMENTS.PHP.HTML_ERRORS'),
                'version' => (int)ini_get('html_errors'),
                'check' => (bool)ini_get('html_errors') == (bool)$f3->get('REQUIREMENTS.PHP.HTML_ERRORS'),
                'tooltip' => 'Formatted HTML StackTrace on error.'
            ],
            [
                'label' => 'Session'
            ],
            'sessionSaveHandler' => [
                'label' => 'save_handler',
                'version' => ini_get('session.save_handler'),
                'check' => true,
                'tooltip' => 'PHP Session save handler (Redis is preferred).'
            ],
            'sessionSavePath' => [
                'label' => 'session.save_path',
                'version' => ini_get('session.save_path'),
                'check' => true,
                'tooltip' => 'PHP Session save path (Redis is preferred).'
            ],
            'sessionName' => [
                'label' => 'session.name',
                'version' => ini_get('session.name'),
                'check' => true,
                'tooltip' => 'PHP Session name.'
            ]
        ];

        return $phpConfig;
    }

    /**
     * check system environment vars
     * -> mostly relevant for development/build/deployment
     * @param \Base $f3
     * @return array
     */
    protected function checkSystemConfig(\Base $f3): array {
        $systemConf = [];
        if(function_exists('exec')){
            $gitOut = $composerOut = $rubyOut = $rubyGemsOut = $compassOut = $nodeOut = $npmOut = [];
            $gitStatus = $composerStatus = $rubyStatus = $rubyGemsStatus = $compassStatus = $nodeStatus = $npmStatus = 1;

            exec('git --version', $gitOut, $gitStatus);
            exec('composer -V', $composerOut, $composerStatus);
            exec('ruby -v', $rubyOut, $rubyStatus);
            exec('gem -v', $rubyGemsOut, $rubyGemsStatus);
            exec('compass -v', $compassOut, $compassStatus);
            exec('node -v', $nodeOut, $nodeStatus);
            exec('npm -v', $npmOut, $npmStatus);

            $normalizeVersion = function($version): string {
                return preg_replace("/[^0-9\.\s]/", '', (string)$version);
            };

            $systemConf = [
                'git' => [
                    'label' => 'Git',
                    'version' => $gitOut[0] ? 'installed' : 'missing',
                    'check' => $gitStatus == 0,
                    'tooltip' => 'Git # git --version : ' . $gitOut[0]
                ],
                'composer' => [
                    'label' => 'Composer',
                    'version' => $composerOut[0] ? 'installed' : 'missing',
                    'check' => $composerStatus == 0,
                    'tooltip' => 'Composer # composer -V : ' . $composerOut[0]
                ],
                'Ruby' => [
                    'label' => 'Ruby',
                    'version' => $rubyOut[0] ? 'installed' : 'missing',
                    'check' => $rubyStatus == 0,
                    'tooltip' => 'Ruby # ruby -v : ' . $rubyOut[0]
                ],
                'rubyGems' => [
                    'label' => 'Ruby gem',
                    'version' => $normalizeVersion($rubyGemsOut[0]) ?: 'missing',
                    'check' => $rubyGemsStatus == 0,
                    'tooltip' => 'gem # gem -v'
                ],
                'compass' => [
                    'label' => 'Compass',
                    'version' => $compassOut[0] ? 'installed' : 'missing',
                    'check' => $compassStatus == 0,
                    'tooltip' => 'Compass # compass -v : ' . $compassOut[0]
                ],
                'node' => [
                    'label' => 'NodeJs',
                    'required' => number_format((float)$f3->get('REQUIREMENTS.PATH.NODE'), 1, '.', ''),
                    'version' => $normalizeVersion($nodeOut[0]) ?: 'missing',
                    'check' => version_compare( $normalizeVersion($nodeOut[0]), number_format((float)$f3->get('REQUIREMENTS.PATH.NODE'), 1, '.', ''), '>='),
                    'tooltip' => 'NodeJs # node -v'
                ],
                'npm' => [
                    'label' => 'npm',
                    'required' => $f3->get('REQUIREMENTS.PATH.NPM'),
                    'version' => $normalizeVersion($npmOut[0]) ?: 'missing',
                    'check' => version_compare( $normalizeVersion($npmOut[0]), $f3->get('REQUIREMENTS.PATH.NPM'), '>='),
                    'tooltip' => 'npm # npm -v'
                ]
            ];
        }

        return $systemConf;
    }

    /**
     * get default map config
     * @param \Base $f3
     * @return array
     * @throws \Exception\PathfinderException
     */
    protected function getMapsDefaultConfig(\Base $f3): array {
        $matrix = \Matrix::instance();
        $mapsDefaultConfig = (array)Config::getMapsDefaultConfig();
        $matrix->transpose($mapsDefaultConfig);
        
        $mapConfig = ['mapTypes' => array_keys(reset($mapsDefaultConfig))];

        foreach($mapsDefaultConfig as $option => $defaultConfig){
            $tooltip = '';
            switch($option){
                case 'lifetime':
                    $label = 'Map lifetime (days)';
                    $tooltip = 'Unchanged/inactive maps get auto deleted afterwards (cronjob).';
                    break;
                case 'max_count':
                    $label = 'Max. maps count/user';
                    break;
                case 'max_shared':
                    $label = 'Map share limit/map';
                    $tooltip = 'E.g. A Corp map can be shared with X other corps.';
                    break;
                case 'max_systems':
                    $label = 'Max. systems count/map';
                    break;
                case 'log_activity_enabled':
                    $label = '<i class="fas fa-fw fa-chart-bar"></i> Activity statistics';
                    $tooltip = 'If "enabled", map admins can enable user statistics for a map.';
                    break;
                case 'log_history_enabled':
                    $label = '<i class="fas fa-fw fa-file-alt"></i> History log files';
                    $tooltip = 'If "enabled", map admins can pipe map logs to file. (one file per map)';
                    break;
                case 'send_history_slack_enabled':
                    $label = '<i class="fab fa-fw fa-slack-hash"></i> History log Slack';
                    $tooltip = 'If "enabled", map admins can set a Slack channel were map logs get piped to.';
                    break;
                case 'send_rally_slack_enabled':
                    $label = '<i class="fab fa-fw fa-slack-hash"></i> Rally point poke Slack';
                    $tooltip = 'If "enabled", map admins can set a Slack channel for rally point pokes.';
                    break;
                case 'send_history_discord_enabled':
                    $label = '<i class="fab fa-fw fa-discord"></i> History log Discord';
                    $tooltip = 'If "enabled", map admins can set a Discord channel were map logs get piped to.';
                    break;
                case 'send_rally_discord_enabled':
                    $label = '<i class="fab fa-fw fa-discord"></i> Rally point poke Discord';
                    $tooltip = 'If "enabled", map admins can set a Discord channel for rally point pokes.';
                    break;
                case 'send_rally_mail_enabled':
                    $label = '<i class="fas fa-fw fa-envelope"></i> Rally point poke Email';
                    $tooltip = 'If "enabled", rally point pokes can be send by Email (SMTP config + recipient address required).';
                    break;
                default:
                    $label = 'unknown';
            }

            $mapsDefaultConfig[$option] = [
                'label' => $label,
                'tooltip' => $tooltip,
                'data'  => $defaultConfig
            ];
        }

        $mapConfig['mapConfig'] = $mapsDefaultConfig;

        return $mapConfig;
    }

    /**
     * get database connection information
     * @param \Base $f3
     * @param bool|false $exec
     * @return array
     */
    protected function checkDatabase(\Base $f3, $exec = false){

        foreach($this->databases as $dbKey => $dbData){

            $dbLabel = '';
            $dbConfig = [];

            // DB connection status
            $dbConnected = false;
            // DB type (e.g. MySql,..)
            $dbDriver = 'unknown';
            // enable database ::create() function on UI
            $dbCreate = false;
            // enable database ::setup() function on UI
            $dbSetupEnable = false;
            // check  if everything is OK (connection, tables, columns, indexes,..)
            $dbStatusCheckCount = 0;
            // db queries for column fixes (types, indexes, unique)
            $dbColumnQueries = [];
            // tables that should exist in this DB
            $requiredTables = [];
            // get DB config
            $dbConfigValues = Config::getDatabaseConfig($dbKey);
            // check DB for valid connection
            $db = $this->dbLib->getDB($dbKey);
            // collection for errors
            $dbErrors = [];

            // check config that does NOT require a valid DB connection
            switch($dbKey){
                case 'PF':          $dbLabel = 'Pathfinder';            break;
                case 'UNIVERSE':    $dbLabel = 'EVE-Online universe';   break;
                case 'CCP':         $dbLabel = 'EVE-Online [SDE]';      break;
            }

            $dbName     = $dbConfigValues['NAME'];
            $dbUser     = $dbConfigValues['USER'];
            $dbAlias    = $dbConfigValues['ALIAS'];

            if($db){
                switch($dbKey){
                    case 'PF':
                    case 'UNIVERSE':
                        // enable (table) setup for this DB
                        $dbSetupEnable = true;

                        // get table data from model
                        foreach($dbData['models'] as $model){
                            $tableConfig =  call_user_func($model . '::resolveConfiguration');
                            $requiredTables[$tableConfig['table']] = [
                                'model' => $model,
                                'name' => $tableConfig['table'],
                                'fieldConf' => $tableConfig['fieldConf'],
                                'exists' => false,
                                'empty' => true,
                                'foreignKeys' => []
                            ];
                        }
                        break;
                    case 'CCP':
                        // get table model from static table array
                        foreach($dbData['tables'] as $tableName){
                            $requiredTables[$tableName] = [
                                'exists' => false,
                                'empty' => true
                            ];
                        }
                        break;
                }

                // db connect was successful
                $dbConnected = true;
                $dbDriver = $db->driver();
                $dbConfig = $this->checkDBConfig($f3, $db);

                // get tables
                $schema = new SQL\Schema($db);
                $currentTables = $schema->getTables();

                // check each table for changes
                foreach($requiredTables as $requiredTableName => $data){

                    $tableExists = false;
                    $tableRows = 0;
                    // Check if table status is OK (no errors/warnings,..)
                    $tableStatusCheckCount = 0;

                    $currentColumns = [];
                    if(in_array($requiredTableName, $currentTables)){
                        // Table exists
                        $tableExists = true;
                        // get existing table columns and column related constraints (if exists)
                        $tableModifierTemp = new MySQL\TableModifier($requiredTableName, $schema);
                        $currentColumns = $tableModifierTemp->getCols(true);
                        // get row count
                        $tableRows = $this->dbLib->getRowCount($requiredTableName, $dbKey);
                    }else{
                        // table missing
                        $dbStatusCheckCount++;
                        $tableStatusCheckCount++;
                    }

                    foreach((array)$data['fieldConf'] as $columnName => $fieldConf){
                        // if 'nullable' key not set in $fieldConf, Column was created with 'nullable' = true (Cortex default)
                        $fieldConf['nullable'] = isset($fieldConf['nullable']) ? (bool)$fieldConf['nullable'] : true;

                        $columnStatusCheck = true;
                        $foreignKeyStatusCheck = true;
                        $requiredTables[$requiredTableName]['fieldConf'][$columnName]['requiredType'] = $fieldConf['type'];
                        $requiredTables[$requiredTableName]['fieldConf'][$columnName]['requiredNullable'] = ($fieldConf['nullable']) ? '1' : '0';
                        $requiredTables[$requiredTableName]['fieldConf'][$columnName]['requiredIndex'] = ($fieldConf['index']) ? '1' : '0';
                        $requiredTables[$requiredTableName]['fieldConf'][$columnName]['requiredUnique'] = ($fieldConf['unique']) ? '1' : '0';

                        if(array_key_exists($columnName, $currentColumns)){
                            // column exists

                            // get tableModifier -> possible column update
                            $tableModifier = new MySQL\TableModifier($requiredTableName, $schema);

                            // get new column and copy Schema from existing column
                            $col = new MySQL\Column($columnName, $tableModifier);
                            $col->copyfrom($currentColumns[$columnName]);

                            $currentColType = $currentColumns[$columnName]['type'];
                            $currentNullable = $currentColumns[$columnName]['nullable'];
                            $hasNullable = $currentNullable ? '1' : '0';
                            $currentColIndexData = call_user_func($data['model'] . '::indexExists', [$columnName]);
                            $currentColIndex = is_array($currentColIndexData);
                            $hasIndex = ($currentColIndex) ? '1' : '0';
                            $hasUnique = ($currentColIndexData['unique']) ? '1' : '0';
                            $changedType = false;
                            $changedNullable = false;
                            $changedUnique = false;
                            $changedIndex = false;
                            $addConstraints = [];

                            // set (new) column information -------------------------------------------------------
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['exists'] = true;
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['currentType'] = $currentColType;
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['currentNullable'] = $hasNullable;
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['currentIndex'] = $hasIndex;
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['currentUnique'] = $hasUnique;

                            // check constraint -------------------------------------------------------------------
                            if(isset($fieldConf['constraint'])){
                                // add or update constraints
                                foreach((array)$fieldConf['constraint'] as $constraintData){
                                    $constraint = $col->newConstraint($constraintData);

                                    $foreignKeyExists = $col->constraintExists($constraint);

                                    // constraint information -> show in template
                                    $requiredTables[$requiredTableName]['foreignKeys'][] = [
                                        'exists' => $foreignKeyExists,
                                        'keyName' => $constraint->getConstraintName()
                                    ];

                                    if($foreignKeyExists){
                                        // drop constraint and re-add again at the and, in case something has changed
                                        $col->dropConstraint($constraint);
                                    }else{
                                        $tableStatusCheckCount++;
                                        $foreignKeyStatusCheck = false;
                                    }

                                    $addConstraints[] = $constraint;
                                }
                            }

                            // check type changed -----------------------------------------------------------------
                            if(
                                $fieldConf['type'] !== 'JSON' &&
                                !$schema->isCompatible($fieldConf['type'], $currentColType)
                            ){
                                // column type has changed
                                $changedType = true;
                                $columnStatusCheck = false;
                                $tableStatusCheckCount++;
                            }

                            // check if column nullable changed ---------------------------------------------------
                            if( $currentNullable != $fieldConf['nullable']){
                                $changedNullable = true;
                                $columnStatusCheck = false;
                                $tableStatusCheckCount++;
                            }

                            // check if column index changed ------------------------------------------------------
                            $indexUpdate = false;
                            $indexKey = (bool)$hasIndex;
                            $indexUnique = (bool)$hasUnique;

                            if($currentColIndex != $fieldConf['index']){
                                $changedIndex = true;
                                $columnStatusCheck = false;
                                $tableStatusCheckCount++;

                                $indexUpdate = true;
                                $indexKey = (bool)$fieldConf['index'];
                            }

                            // check if column unique changed -----------------------------------------------------
                            if($currentColIndexData['unique'] != $fieldConf['unique']){
                                $changedUnique = true;
                                $columnStatusCheck = false;
                                $tableStatusCheckCount++;

                                $indexUpdate = true;
                                $indexUnique = (bool)$fieldConf['unique'];
                            }

                            // build table with changed columns ---------------------------------------------------
                            if(!$columnStatusCheck || !$foreignKeyStatusCheck){

                                if(!$columnStatusCheck ){
                                    // IMPORTANT: setType is always required! Even if type has not changed
                                    $col->type($fieldConf['type']);

                                    // update "nullable"
                                    if($changedNullable){
                                        $col->nullable($fieldConf['nullable']);
                                    }

                                    // update/change/delete index/unique keys
                                    if($indexUpdate){
                                        if($hasIndex){
                                            $tableModifier->dropIndex($columnName);
                                        }

                                        if($indexKey){
                                            $tableModifier->addIndex($columnName, $indexUnique);
                                        }
                                    }
                                    $tableModifier->updateColumn($columnName, $col);
                                }

                                // (re-)add constraints !after! index update is done
                                // otherwise index update will fail if there are existing constraints
                                foreach($addConstraints as $constraint){
                                    $col->addConstraint($constraint);
                                }

                                $buildStatus = $tableModifier->build($exec);

                                if(
                                    is_array($buildStatus) ||
                                    is_string($buildStatus)
                                ){
                                    // query strings for change available
                                    $dbColumnQueries = array_merge($dbColumnQueries, (array)$buildStatus);
                                }
                            }

                            // set (new) column information -------------------------------------------------------
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['changedType'] = $changedType;
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['changedNullable'] = $changedNullable;
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['changedUnique'] = $changedUnique;
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['changedIndex'] = $changedIndex;

                        }elseif(
                            !isset($fieldConf['has-manny']) &&
                            isset($fieldConf['type'])
                        ){
                            // column not exists but it is required!
                            // columns that do not match this criteria ("mas-manny") are "virtual" fields
                            // and can be ignored
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['currentType'] = '';
                            $columnStatusCheck = false;
                            $tableStatusCheckCount++;
                        }
                        $requiredTables[$requiredTableName]['fieldConf'][$columnName]['statusCheck'] = $columnStatusCheck;
                    }

                    $dbStatusCheckCount += $tableStatusCheckCount;
                    $requiredTables[$requiredTableName]['rows'] = $tableRows;
                    $requiredTables[$requiredTableName]['exists'] = $tableExists;
                    $requiredTables[$requiredTableName]['statusCheckCount'] = $tableStatusCheckCount;
                }

            }else{
                // DB connection failed
                $dbStatusCheckCount++;

                foreach($this->dbLib->getErrors($dbAlias, 10) as $dbException){
                    $dbErrors[] = $dbException->getMessage();
                }

                // try to connect without! DB (-> offer option to create them)
                // do not log errors (silent)
                $this->dbLib->setSilent(true);
                $dbServer = $this->dbLib->connectToServer($dbAlias);
                $this->dbLib->setSilent(false);
                if(!is_null($dbServer)){
                    // connection succeeded
                    $dbCreate = true;
                    $dbDriver = $dbServer->driver();
                }
            }

            if($dbStatusCheckCount !== 0){
                $this->databaseHasError = true;
            }

            // sort tables for better readability
            ksort($requiredTables);

            $this->databases[$dbKey]['info'] = [
           //     'db' => $db,
                'label'             => $dbLabel,
                'host'              => Config::getDatabaseDNSValue((string)$dbConfigValues['DNS'], 'host'),
                'port'              => Config::getDatabaseDNSValue((string)$dbConfigValues['DNS'], 'port'),
                'driver'            => $dbDriver,
                'name'              => $dbName,
                'user'              => $dbUser,
                'pass'              => Util::obscureString((string)$dbConfigValues['PASS'], 8),
                'dbConfig'          => $dbConfig,
                'dbCreate'          => $dbCreate,
                'setupEnable'       => $dbSetupEnable,
                'connected'         => $dbConnected,
                'statusCheckCount'  => $dbStatusCheckCount,
                'columnQueries'     => $dbColumnQueries,
                'tableData'         => $requiredTables,
                'errors'            => $dbErrors
            ];
        }

        if($exec){
            $f3->reroute('@setup');
        }

        return $this->databases;
    }

    /** check MySQL params
     * @param \Base $f3
     * @param $db
     * @return array
     */
    protected function checkDBConfig(\Base $f3, $db){

        // some db like "Maria DB" have some strange version strings....
        $dbVersionString = $db->version();
        $dbVersionParts = explode('-', $dbVersionString);
        $dbVersion = 'unknown';
        foreach($dbVersionParts as $dbVersionPart){
            // check if this is a valid version number
            // hint: MariaDB´s version is NOT always the last valid version number
            if( version_compare( $dbVersionPart, '1', '>' ) > 0 ){
                $dbVersion = $dbVersionPart;
            }
        }

        $dbConfig = [
            'version' => [
                'label' => 'DB version',
                'required' => $f3->get('REQUIREMENTS.MYSQL.VERSION'),
                'version' => $dbVersion,
                'check' => version_compare($dbVersion, $f3->get('REQUIREMENTS.MYSQL.VERSION'), '>=' )
            ]
        ];

        // get specific MySQL config Value
        $getDBConfigValue = function($db, $param){
            $result = $db->exec([
                //"USE " . $db->name(),
                "SHOW VARIABLES LIKE '" . strtolower($param) . "'"
            ]);
            $tmpResult = reset($result);
            return !empty($result)? end($tmpResult) : 'unknown';
        };

        $mySQLConfigParams = $f3->get('REQUIREMENTS.MYSQL.VARS');
        foreach($mySQLConfigParams as $param => $requiredValue){
            $value = $getDBConfigValue($db, $param);
            $dbConfig[] = [
                'label' => strtolower($param),
                'required' => $requiredValue,
                'version' => $value,
                'check' => !empty($requiredValue) ? ($requiredValue == $value) : true
            ];
        }

        return $dbConfig;
    }

    /**
     * try to create a fresh database
     * @param string $dbKey
     */
    protected function createDB(string $dbKey){
        // check for valid key
        if(!empty($this->databases[$dbKey])){
            // disable logging (we expect the DB connect to fail -> no db created)
            $this->dbLib->setSilent(true);
            // try to connect
            $db = $this->dbLib->getDB($dbKey);
            // enable logging
            $this->dbLib->setSilent(false, true);
            if(is_null($db)){
                // try create new db
                $db = $this->dbLib->createDB($dbKey);
                if(is_null($db)){
                    foreach($this->dbLib->getErrors($dbKey, 5) as $error){
                        // ... no further error handling here -> check log files
                        //$error->getMessage()
                    }
                }
            }
        }
    }

    /**
     * init the complete database
     * - create tables
     * - create indexes
     * - set default static values
     * @param string $dbKey
     * @return array
     */
    protected function bootstrapDB(string $dbKey){
        $db = $this->dbLib->getDB($dbKey);
        $checkTables = [];
        if($db){
            // set some default config for this database
            DB\Database::prepareDatabase($db);

            // setup tables
            foreach($this->databases[$dbKey]['models'] as $modelClass){
                $checkTables[] = call_user_func($modelClass . '::setup', $db);
            }
        }
        return $checkTables;
    }

    /**
     * get Socket information (TCP (internal)), (WebSocket (clients))
     * @return array
     * @throws \ZMQSocketException
     */
    protected function getSocketInformation(){
        // $ttl for health check
        $ttl = 600;

        $healthCheckToken = microtime(true);

        // ping TCP Socket with checkToken
        self::checkTcpSocket($ttl,  $healthCheckToken);

        $socketInformation = [
            'tcpSocket' => [
                'label' => 'Socket (intern) [TCP]',
                'online' => true,
                'data' => [
                    [
                        'label' => 'HOST',
                        'value' => Config::getEnvironmentData('SOCKET_HOST'),
                        'check' => !empty( Config::getEnvironmentData('SOCKET_HOST') )
                    ],[
                        'label' => 'PORT',
                        'value' => Config::getEnvironmentData('SOCKET_PORT'),
                        'check' => !empty( Config::getEnvironmentData('SOCKET_PORT') )
                    ],[
                        'label' => 'URI',
                        'value' => Config::getSocketUri(),
                        'check' => !empty( Config::getSocketUri() )
                    ],[
                        'label' => 'timeout (ms)',
                        'value' => $ttl,
                        'check' => !empty( $ttl )
                    ]
                ],
                'token' => $healthCheckToken
            ],
            'webSocket' => [
                'label' => 'WebSocket (clients) [HTTP]',
                'online' => false,
                'data' => [
                    [
                        'label' => 'URI',
                        'value' => '',
                        'check' => false
                    ]
                ]
            ]
        ];

        return $socketInformation;
    }

    /**
     * get indexed (cache) data information
     * @param \Base $f3
     * @return array
     * @throws \Exception
     */
    protected function getIndexData(\Base $f3){
        // active DB and tables are required for obtain index data
        if(!$this->databaseHasError){
            $categoryUniverseModel = Model\Universe\BasicUniverseModel::getNew('CategoryModel');
            //$systemUniverseModel =  Model\Universe\BasicUniverseModel::getNew('SystemModel');
            $systemNeighbourModel = Model\BasicModel::getNew('SystemNeighbourModel');
            $wormholeModel = Model\BasicModel::getNew('WormholeModel');
            $systemWormholeModel = Model\BasicModel::getNew('SystemWormholeModel');
            $constellationWormholeModel = Model\BasicModel::getNew('ConstellationWormholeModel');

            $indexInfo = [
                /*
                'Systems' => [
                    'task' => [
                        [
                            'action' => 'clearIndex',
                            'label' => 'Clear',
                            'icon' => 'fa-times',
                            'btn' => 'btn-danger'
                        ],[
                            'action' => 'buildIndex',
                            'label' => 'Build',
                            'icon' => 'fa-sync',
                            'btn' => 'btn-primary'
                        ]
                    ],
                    'label' => 'build systems index',
                    'countBuild' => count((new Universe())->getSystemsIndex()),
                    'countAll' => $this->dbLib->getRowCount($systemUniverseModel->getTable(), 'UNIVERSE'),
                    'tooltip' => 'build up a static search index over all systems found on DB. Do not refresh page until import is complete (check progress)! Runtime: ~5min'
                ], */
                'Structures' => [
                    'task' => [
                        [
                            'action' => 'buildIndex',
                            'label' => 'Import',
                            'icon' => 'fa-sync',
                            'btn' => 'btn-primary'
                        ]
                    ],
                    'label' => 'import structures data',
                    'countBuild' => $categoryUniverseModel->getById(65, 0)->getTypesCount(false),
                    'countAll' => (int)$f3->get('REQUIREMENTS.DATA.STRUCTURES'),
                    'tooltip' => 'import all structure types (e.g. Citadels) from ESI. Runtime: ~15s'
                ], /*
                'Ships' => [
                    'task' => [
                        [
                            'action' => 'buildIndex',
                            'label' => 'Import',
                            'icon' => 'fa-sync',
                            'btn' => 'btn-primary'
                        ]
                    ],
                    'label' => 'import ships data',
                    'countBuild' => $categoryUniverseModel->getById(6, 0)->getTypesCount(false),
                    'countAll' => (int)$f3->get('REQUIREMENTS.DATA.SHIPS'),
                    'tooltip' => 'import all ships types from ESI. Runtime: ~2min'
                ], */
                // All following rows become deprecated
                'SystemNeighbourModel' => [
                    'task' => [
                        [
                            'action' => 'buildIndex',
                            'label' => 'Build',
                            'icon' => 'fa-sync',
                            'btn' => 'btn-primary'
                        ]
                    ],
                    'label' => 'system_neighbour',
                    'countBuild' => $this->dbLib->getRowCount($systemNeighbourModel->getTable()),
                    'countAll' => 5214
                ],
                'WormholeModel' => [
                    'task' => [
                        [
                            'action' => 'exportTable',
                            'label' => 'Export',
                            'icon' => 'fa-download',
                            'btn' => 'btn-default'
                        ],[
                            'action' => 'importTable',
                            'label' => 'Import',
                            'icon' => 'fa-upload',
                            'btn' => 'btn-primary'
                        ]
                    ],
                    'label' => 'wormhole',
                    'countBuild' => $this->dbLib->getRowCount($wormholeModel->getTable()),
                    'countAll' => 89
                ],
                'SystemWormholeModel' => [
                    'task' => [
                        [
                            'action' => 'exportTable',
                            'label' => 'Export',
                            'icon' => 'fa-download',
                            'btn' => 'btn-default'
                        ],[
                            'action' => 'importTable',
                            'label' => 'Import',
                            'icon' => 'fa-upload',
                            'btn' => 'btn-primary'
                        ]
                    ],
                    'label' => 'system_wormhole',
                    'countBuild' => $this->dbLib->getRowCount($systemWormholeModel->getTable()),
                    'countAll' => 234
                ],
                'ConstellationWormholeModel' => [
                    'task' => [
                        [
                            'action' => 'exportTable',
                            'label' => 'Export',
                            'icon' => 'fa-download',
                            'btn' => 'btn-default'
                        ],[
                            'action' => 'importTable',
                            'label' => 'Import',
                            'icon' => 'fa-upload',
                            'btn' => 'btn-primary'
                        ]
                    ],
                    'label' => 'constellation_wormhole',
                    'countBuild' => $this->dbLib->getRowCount( $constellationWormholeModel->getTable() ),
                    'countAll' => 461
                ]
            ];
        }else{
            $indexInfo = [
                'SystemNeighbourModel' => [
                    'task' => [],
                    'label' => 'Fix database errors first!'
                ]
            ];
        }
//var_dump($indexInfo); die();
        return $indexInfo;
    }

    /**
     * import table data from existing dump file (e.g *.csv)
     * @param string $modelClass
     * @return bool
     * @throws \Exception
     */
    protected function importTable($modelClass){
        $this->getDB('PF');
        return Model\BasicModel::getNew($modelClass)->importData();
    }

    /**
     * export table data
     * @param string $modelClass
     * @throws \Exception
     */
    protected function exportTable($modelClass){
        $this->getDB('PF');
        Model\BasicModel::getNew($modelClass)->exportData();
    }

    /**
     * get cache folder size as string
     * @param \Base $f3
     * @return array
     */
    protected function getCacheData(\Base $f3){

        // get all cache -----------------------------------------------------------------------------------------
        $cacheFilesAll = Search::getFilesByMTime( $f3->get('TEMP') );
        $bytesAll = 0;
        foreach($cacheFilesAll as $filename => $file) {
            $bytesAll += $file->getSize();
        }

        // get data cache -----------------------------------------------------------------------------------------
        $cacheFilesData = Search::getFilesByMTime( $f3->get('TEMP') . 'cache/' );
        $bytesData = 0;
        foreach($cacheFilesData as $filename => $file) {
            $bytesData += $file->getSize();
        }

        return [
            'all' => $this->convertBytes($bytesAll),
            'data' => $this->convertBytes($bytesData),
            'template' => $this->convertBytes($bytesAll - $bytesData)
        ];
    }

    /**
     * clear all cached files
     * @param \Base $f3
     */
    protected function clearCache(\Base $f3){
        $f3->clear('CACHE');
    }

    /**
     * clear all character authentication (Cookie) data
     * @param \Base $f3
     * @throws \Exception
     */
    protected function invalidateCookies(\Base $f3){
        $this->getDB('PF');
        $authentidationModel = Model\BasicModel::getNew('CharacterAuthenticationModel');
        $results = $authentidationModel->find();
        if($results){
            foreach($results as $result){
                $result->erase();
            }
        }
    }

    /**
     * convert Bytes to string + suffix
     * @param int $bytes
     * @param int $precision
     * @return string
     */
    protected function convertBytes($bytes, $precision = 2){
        $result = '0';
        if($bytes){
            $base = log($bytes, 1024);
            $suffixes = array('', 'KB', 'MB', 'GB', 'TB');
            $result = round(pow(1024, $base - floor($base)), $precision) .' '. $suffixes[floor($base)];
        }
        return $result;
    }
}