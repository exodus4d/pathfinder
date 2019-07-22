<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 22.11.2015
 * Time: 10:59
 */

namespace Controller;

use Controller\Ccp\Universe as UniverseController;
use data\filesystem\Search;
use DB\SQL\Schema;
use DB\SQL\MySQL as MySQL;
use lib\Config;
use lib\Util;
use Model\Pathfinder;
use Model\Universe;

class Setup extends Controller {

    /**
     * required environment variables
     * @var array
     */
    protected $environmentVars = [
        'ENVIRONMENT_CONFIG' => [],
        'BASE' => ['missingOk' => true],
        'URL' => [],
        'DEBUG' => [],
        'DB_PF_DNS' => [],
        'DB_PF_NAME' => [],
        'DB_PF_USER' => [],
        'DB_PF_PASS' => [],
        'DB_UNIVERSE_DNS' => [],
        'DB_UNIVERSE_NAME' => [],
        'DB_UNIVERSE_USER' => [],
        'DB_UNIVERSE_PASS' => [],
        'CCP_SSO_URL' => [],
        'CCP_SSO_CLIENT_ID' => [],
        'CCP_SSO_SECRET_KEY' => [],
        'CCP_SSO_DOWNTIME' => [],
        'CCP_ESI_URL' => [],
        'CCP_ESI_DATASOURCE' => [],
        'SMTP_HOST' => [],
        'SMTP_PORT' => [],
        'SMTP_SCHEME' => [],
        'SMTP_USER' => [],
        'SMTP_PASS' => [],
        'SMTP_FROM' => [],
        'SMTP_ERROR' => []
    ];

    /**
     * required database setup
     * @var array
     */
    protected $databases = [
        'PF' => [
            'info' => [],
            'models' => [
                'Model\Pathfinder\UserModel',
                'Model\Pathfinder\AllianceModel',
                'Model\Pathfinder\CorporationModel',
                'Model\Pathfinder\MapModel',
                'Model\Pathfinder\MapScopeModel',
                'Model\Pathfinder\MapTypeModel',
                'Model\Pathfinder\SystemTypeModel',
                'Model\Pathfinder\SystemStatusModel',
                'Model\Pathfinder\SystemNeighbourModel',
                'Model\Pathfinder\RightModel',
                'Model\Pathfinder\RoleModel',
                'Model\Pathfinder\StructureModel',

                'Model\Pathfinder\CharacterStatusModel',
                'Model\Pathfinder\ConnectionScopeModel',
                'Model\Pathfinder\StructureStatusModel',

                'Model\Pathfinder\CharacterMapModel',
                'Model\Pathfinder\AllianceMapModel',
                'Model\Pathfinder\CorporationMapModel',

                'Model\Pathfinder\CorporationRightModel',
                'Model\Pathfinder\CorporationStructureModel',

                'Model\Pathfinder\UserCharacterModel',
                'Model\Pathfinder\CharacterModel',
                'Model\Pathfinder\CharacterAuthenticationModel',
                'Model\Pathfinder\CharacterLogModel',

                'Model\Pathfinder\SystemModel',

                'Model\Pathfinder\ConnectionModel',
                'Model\Pathfinder\ConnectionLogModel',
                'Model\Pathfinder\SystemSignatureModel',

                'Model\Pathfinder\ActivityLogModel',

                'Model\Pathfinder\SystemShipKillModel',
                'Model\Pathfinder\SystemPodKillModel',
                'Model\Pathfinder\SystemFactionKillModel',
                'Model\Pathfinder\SystemJumpModel'
            ]
        ],
        'UNIVERSE' => [
            'info' => [],
            'models' => [
                'Model\Universe\TypeModel',
                'Model\Universe\GroupModel',
                'Model\Universe\CategoryModel',
                'Model\Universe\FactionModel',
                'Model\Universe\StructureModel',
                'Model\Universe\WormholeModel',
                'Model\Universe\StargateModel',
                'Model\Universe\StarModel',
                'Model\Universe\PlanetModel',
                'Model\Universe\SystemModel',
                'Model\Universe\ConstellationModel',
                'Model\Universe\RegionModel',
                'Model\Universe\SystemStaticModel'
            ]
        ]
    ];

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
     */
    function beforeroute(\Base $f3, $params): bool {
        $this->initResource($f3);

        // page title
        $f3->set('tplPageTitle', 'Setup | ' . Config::getPathfinderData('name'));

        // main page content
        $f3->set('tplPageContent', Config::getPathfinderData('view.setup'));

        // body element class
        $f3->set('tplBodyClass', 'pf-landing');

        // top navigation configuration
        $f3->set('tplNavigation', $this->getNavigationConfig());

        return true;
    }

    /**
     * @param \Base $f3
     */
    public function afterroute(\Base $f3) {
        // js view (file)
        $f3->set('tplJsView', 'setup');

        // simple counter (called within template)
        $counter = [];
        $f3->set('tplCounter', function(string $action = 'increment', string $type = 'default', $val = 0) use (&$counter){
            $return = null;
            switch($action){
                case 'increment': $counter[$type]++; break;
                case 'add': $counter[$type] += (int)$val; break;
                case 'get': $return = $counter[$type]? : null; break;
                case 'reset': unset($counter[$type]); break;
            }
            return $return;
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
                $this->createDB($f3, $params['db']);
                break;
            case 'bootstrapDB':
                $this->bootstrapDB($f3, $params['db']);
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
            case 'clearFiles':
                $this->clearFiles((string)$params['path']);
                break;
            case 'flushRedisDb':
                $this->flushRedisDb((string)$params['host'], (int)$params['port'], (int)$params['db']);
                break;
            case 'invalidateCookies':
                $this->invalidateCookies($f3);
                break;
        }

        // ============================================================================================================
        // Template data
        // ============================================================================================================

        // Server -----------------------------------------------------------------------------------------------------
        // Server information
        $f3->set('serverInformation', $this->getServerInformation($f3));

        // Pathfinder directory config
        $f3->set('directoryConfig', $this->getDirectoryConfig($f3));

        // Server environment variables
        $f3->set('checkSystemConfig', $this->checkSystemConfig($f3));

        // Environment ------------------------------------------------------------------------------------------------
        // Server requirement
        $f3->set('checkRequirements', $this->checkRequirements($f3));

        // PHP config
        $f3->set('checkPHPConfig', $this->checkPHPConfig($f3));

        // Settings ---------------------------------------------------------------------------------------------------
        // Pathfinder environment config
        $f3->set('environmentInformation', $this->getEnvironmentInformation($f3));

        // Pathfinder map default config
        $f3->set('mapsDefaultConfig', $this->getMapsDefaultConfig($f3));

        // Database ---------------------------------------------------------------------------------------------------
        // Database config
        $f3->set('checkDatabase', $this->checkDatabase($f3, $fixColumns));

        // Redis ------------------------------------------------------------------------------------------------------
        // Redis information
        $f3->set('checkRedisInformation', $this->checkRedisInformation($f3));

        // Socket -----------------------------------------------------------------------------------------------------
        // WebSocket information
        $f3->set('socketInformation', $this->getSocketInformation($f3));

        // Administration ---------------------------------------------------------------------------------------------
        // Index information
        $f3->set('indexInformation', $this->getIndexData($f3));

        // Filesystem (cache) size
        $f3->set('checkDirSize', $this->checkDirSize($f3));
    }

    /**
     * get top navigation configuration
     * @return array
     */
    protected function getNavigationConfig() : array {
        $config = [
            'server' => [
                'icon' => 'fa-home'
            ],
            'environment' => [
                'icon' => 'fa-server'
            ],
            'settings' => [
                'icon' => 'fa-sliders-h'
            ],
            'database' => [
                'icon' => 'fa-database'
            ],
            'cache' => [
                'icon' => 'fa-hdd'
            ],
            'socket' => [
                'icon' => 'fa-exchange-alt'
            ],
            'administration' => [
                'icon' => 'fa-wrench'
            ],
        ];

        return $config;
    }

    /**
     * set environment information
     * @param \Base $f3
     * @return array
     */
    protected function getEnvironmentInformation(\Base $f3) : array {
        $environmentData = [];
        // exclude some sensitive data (e.g. database, passwords)
        $excludeVars = [
            'DB_PF_DNS',        'DB_PF_NAME',       'DB_PF_USER',       'DB_PF_PASS',
            'DB_UNIVERSE_DNS',  'DB_UNIVERSE_NAME', 'DB_UNIVERSE_USER', 'DB_UNIVERSE_PASS'
        ];

        // obscure some values
        $obscureVars = ['CCP_SSO_CLIENT_ID', 'CCP_SSO_SECRET_KEY', 'SMTP_PASS'];

        foreach($this->environmentVars as $var => $options){
            if( !in_array($var, $excludeVars) ){
                $value = Config::getEnvironmentData($var);
                $check = true;

                if(is_null($value) && !array_key_exists('missingOk', $options)){
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
    protected function getServerInformation(\Base $f3) : array {
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
                'label' => 'Protocol - scheme',
                'value' => $f3->get('SERVER.SERVER_PROTOCOL') . ' - ' . $f3->get('SCHEME')
            ]
        ];

        return $serverInfo;
    }

    /**
     * get information for used directories
     * @param \Base $f3
     * @return array
     */
    protected function getDirectoryConfig(\Base $f3) : array {
        $directoryData = [
            'TEMP' => [
                'label' => 'TEMP',
                'value' => $f3->get('TEMP'),
                'check' => true,
                'tooltip' => 'Temporary folder for pre compiled templates.',
                'chmod' => Util::filesystemInfo($f3->get('TEMP'))['chmod']
            ],
            'CACHE' => [
                'label' => 'CACHE',
                'value' => $f3->get('CACHE'),
                'check' => true,
                'tooltip' => 'Cache backend. Support for Redis, Memcache, APC, WinCache, XCache and a filesystem-based (default) cache.',
                'chmod' =>  ((Config::parseDSN($f3->get('CACHE'), $confCache)) && $confCache['type'] == 'folder') ?
                    Util::filesystemInfo((string)$confCache['folder'])['chmod'] : ''
            ],
            'API_CACHE' => [
                'label' => 'API_CACHE',
                'value' => $f3->get('API_CACHE'),
                'check' => true,
                'tooltip' => 'Cache backend for API related cache data. Support for Redis and a filesystem-based (default) cache.',
                'chmod' => ((Config::parseDSN($f3->get('API_CACHE'), $confCacheApi)) && $confCacheApi['type'] == 'folder') ?
                    Util::filesystemInfo((string)$confCacheApi['folder'])['chmod'] : ''
            ],
            'LOGS' => [
                'label' => 'LOGS',
                'value' => $f3->get('LOGS'),
                'check' => true,
                'tooltip' => 'Folder for pathfinder logs (e.g. cronjob-, error-logs, ...).',
                'chmod' => Util::filesystemInfo($f3->get('LOGS'))['chmod']
            ],
            'UI' => [
                'label' => 'UI',
                'value' => $f3->get('UI'),
                'check' => true,
                'tooltip' => 'Folder for public accessible resources (templates, js, css, images,..).',
                'chmod' => Util::filesystemInfo($f3->get('UI'))['chmod']
            ],
            'AUTOLOAD' => [
                'label' => 'AUTOLOAD',
                'value' => $f3->get('AUTOLOAD'),
                'check' => true,
                'tooltip' => 'Autoload folder for PHP files.',
                'chmod' => Util::filesystemInfo($f3->get('AUTOLOAD'))['chmod']
            ],
            'FAVICON' => [
                'label' => 'FAVICON',
                'value' => $f3->get('FAVICON'),
                'check' => true,
                'tooltip' => 'Folder for Favicons.',
                'chmod' => Util::filesystemInfo($f3->get('FAVICON'))['chmod']
            ],
            'HISTORY' => [
                'label' => 'HISTORY [optional]',
                'value' => Config::getPathfinderData('history.log'),
                'check' => true,
                'tooltip' => 'Folder for log history files. (e.g. change logs for maps).',
                'chmod' => Util::filesystemInfo(Config::getPathfinderData('history.log'))['chmod']
            ],
            'CONFIG' => [
                'label' => 'CONFIG PATH [optional]',
                'value' => implode(' ', (array)$f3->get('CONF')),
                'check' => true,
                'tooltip' => 'Folder for custom *.ini files. (e.g. when overwriting of default values in app/*.ini)'
            ]
        ];

        return $directoryData;
    }

    /**
     * check all required backend requirements
     * (Fat Free Framework)
     * @param \Base $f3
     * @return array
     */
    protected function checkRequirements(\Base $f3) : array {

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
            'ext_redis' => [
                'label' => 'Redis [optional]',
                'required' => $f3->get('REQUIREMENTS.PHP.REDIS'),
                'version' => extension_loaded('redis') ? phpversion('redis') : 'missing',
                'check' => version_compare( phpversion('redis'), $f3->get('REQUIREMENTS.PHP.REDIS'), '>='),
                'tooltip' => 'Redis can replace the default file-caching mechanic. It is much faster!'
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

            // mod_rewrite check --------------------------------------------------------------------------------------
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

            // mod_headers check --------------------------------------------------------------------------------------
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
        $memoryLimit        = (int)ini_get('memory_limit');
        $maxInputVars       = (int)ini_get('max_input_vars');
        $maxExecutionTime   = (int)ini_get('max_execution_time'); // 0 == infinite
        $htmlErrors         = (int)ini_get('html_errors');

        $phpConfig = [
            'exec' => [
                'label' => 'exec()',
                'required' => $f3->get('REQUIREMENTS.PHP.EXEC'),
                'version' => function_exists('exec'),
                'check' => function_exists('exec') == $f3->get('REQUIREMENTS.PHP.EXEC'),
                'tooltip' => 'exec() funktion. Check "disable_functions" in php.ini'
            ],
            'memoryLimit' => [
                'label' => 'memory_limit',
                'required' => $f3->get('REQUIREMENTS.PHP.MEMORY_LIMIT'),
                'version' => $memoryLimit,
                'check' => $memoryLimit >= $f3->get('REQUIREMENTS.PHP.MEMORY_LIMIT'),
                'tooltip' => 'PHP default = 64MB.'
            ],
            'maxInputVars' => [
                'label' => 'max_input_vars',
                'required' => $f3->get('REQUIREMENTS.PHP.MAX_INPUT_VARS'),
                'version' => $maxInputVars,
                'check' => $maxInputVars >= $f3->get('REQUIREMENTS.PHP.MAX_INPUT_VARS'),
                'tooltip' => 'PHP default = 1000. Increase it in order to import larger maps.'
            ],
            'maxExecutionTime' => [
                'label' => 'max_execution_time',
                'required' => $f3->get('REQUIREMENTS.PHP.MAX_EXECUTION_TIME'),
                'version' => $maxExecutionTime,
                'check' => !$maxExecutionTime || $maxExecutionTime >= $f3->get('REQUIREMENTS.PHP.MAX_EXECUTION_TIME'),
                'tooltip' => 'PHP default = 30. Max execution time for PHP scripts.'
            ],
            'htmlErrors' => [
                'label' => 'html_errors',
                'required' => $f3->get('REQUIREMENTS.PHP.HTML_ERRORS'),
                'version' => $htmlErrors,
                'check' => (bool)$htmlErrors == (bool)$f3->get('REQUIREMENTS.PHP.HTML_ERRORS'),
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
     * check Redis (cache) config
     * -> only visible if Redis is used as Cache backend
     * @param \Base $f3
     * @return array
     */
    protected function checkRedisInformation(\Base $f3): array {
        $redisConfig = [];

        if(
            extension_loaded('redis') &&
            class_exists('\Redis')
        ){
            // collection of DSN specific $conf array (host, port, db,..)
            $dsnData = [];

            /**
             * get client information for a Redis client
             * @param \Redis $client
             * @param array $conf
             * @return array
             */
            $getClientInfo = function(\Redis $client, array $conf) : array {
                $redisInfo = [
                    'dsn' => [
                        'label' => 'DSN',
                        'value' => $conf['host'] . ':' . $conf['port']
                    ],
                    'connected' => [
                        'label' => 'status',
                        'value' => $client->isConnected()
                    ]
                ];

              return $redisInfo;
            };

            /**
             * get status information for a Redis client
             * @param \Redis $client
             * @return array
             */
            $getClientStats = function(\Redis $client) use ($f3) : array {
                $redisStats = [];

                if($client->isConnected()){
                    $redisServerInfo = (array)$client->info('SERVER');
                    $redisClientsInfo = (array)$client->info('CLIENTS');
                    $redisMemoryInfo = (array)$client->info('MEMORY');
                    $redisStatsInfo = (array)$client->info('STATS');

                    $redisStats = [
                        'redisVersion' => [
                            'label' => 'redis_version',
                            'required' => number_format((float)$f3->get('REQUIREMENTS.REDIS.VERSION'), 1, '.', ''),
                            'version' => $redisServerInfo['redis_version'],
                            'check' => version_compare( $redisServerInfo['redis_version'], $f3->get('REQUIREMENTS.REDIS.VERSION'), '>='),
                            'tooltip' => 'Redis server version'
                        ],
                        'maxMemory' => [
                            'label' => 'maxmemory',
                            'required' => $this->convertBytes($f3->get('REQUIREMENTS.REDIS.MAX_MEMORY')),
                            'version' => $this->convertBytes($redisMemoryInfo['maxmemory']),
                            'check' => $redisMemoryInfo['maxmemory'] >= $f3->get('REQUIREMENTS.REDIS.MAX_MEMORY'),
                            'tooltip' => 'Max memory limit for Redis'
                        ],
                        'usedMemory' => [
                            'label' => 'used_memory',
                            'version' => $this->convertBytes($redisMemoryInfo['used_memory']),
                            'check' => $redisMemoryInfo['used_memory'] < $redisMemoryInfo['maxmemory'],
                            'tooltip' => 'Current memory used by Redis'
                        ],
                        'usedMemoryPeak' => [
                            'label' => 'used_memory_peak',
                            'version' => $this->convertBytes($redisMemoryInfo['used_memory_peak']),
                            'check' => $redisMemoryInfo['used_memory_peak'] <= $redisMemoryInfo['maxmemory'],
                            'tooltip' => 'Peak memory used by Redis'
                        ],
                        'maxmemoryPolicy' => [
                            'label' => 'maxmemory_policy',
                            'required' => $f3->get('REQUIREMENTS.REDIS.MAXMEMORY_POLICY'),
                            'version' => $redisMemoryInfo['maxmemory_policy'],
                            'check' => $redisMemoryInfo['maxmemory_policy'] == $f3->get('REQUIREMENTS.REDIS.MAXMEMORY_POLICY'),
                            'tooltip' => 'How Redis behaves if \'maxmemory\' limit reached'
                        ],
                        'connectedClients' => [
                            'label' => 'connected_clients',
                            'version' => $redisClientsInfo['connected_clients'],
                            'check' => (bool)$redisClientsInfo['connected_clients'],
                            'tooltip' => 'Number of client connections (excluding connections from replicas)'
                        ],
                        'blockedClients' => [
                            'label' => 'blocked_clients',
                            'version' => $redisClientsInfo['blocked_clients'],
                            'check' => !(bool)$redisClientsInfo['blocked_clients'],
                            'tooltip' => 'Number of clients pending on a blocking call (BLPOP, BRPOP, BRPOPLPUSH)'
                        ],
                        'evictedKeys' => [
                            'label' => 'evicted_keys',
                            'version' => $redisStatsInfo['evicted_keys'],
                            'check' => !(bool)$redisStatsInfo['evicted_keys'],
                            'tooltip' => 'Number of evicted keys due to maxmemory limit'
                        ],
                        [
                            'label' => 'Databases'
                        ]
                    ];
                }

                return $redisStats;
            };

            /**
             * get database status for current selected db
             * @param \Redis $client
             * @param string $tag
             * @return array
             */
            $getDatabaseStatus = function(\Redis $client, string $tag) : array {
                $redisDatabases = [];
                if($client->isConnected()){
                    $dbNum = $client->getDbNum();
                    $dbSize = $client->dbSize();
                    $redisDatabases = [
                        'db_' . $dbNum => [
                            'label'     => '<i class="fas fa-fw fa-database"></i> db(' . $dbNum . ') : ' . $tag,
                            'version'   => $dbSize . ' keys',
                            'check'     => $dbSize > 0,
                            'tooltip'   => 'Keys in db(' . $dbNum . ')',
                            'task'      => [
                                [
                                    'action' => http_build_query([
                                        'action' => 'flushRedisDb',
                                        'host' => $client->getHost(),
                                        'port' => $client->getPort(),
                                        'db' => $dbNum
                                    ]) . '#pf-setup-cache',
                                    'label' => 'Flush',
                                    'icon' => 'fa-trash',
                                    'btn' => 'btn-danger' . (($dbSize > 0) ? '' : ' disabled')
                                ]
                            ]
                        ]
                    ];
                }

                return $redisDatabases;
            };

            /**
             * build (modify) $redisConfig with DNS $conf data
             * @param array $conf
             */
            $buildRedisConfig = function(array $conf) use (&$redisConfig, $getClientInfo, $getClientStats, $getDatabaseStatus){
                if($conf['type'] == 'redis'){
                    // is Redis -> group all DNS by host:port
                    $client = new \Redis();

                    try{
                        $client->pconnect($conf['host'], $conf['port'], 0.3);
                        if(isset($conf['db'])) {
                            $client->select($conf['db']);
                        }

                        $conf['db'] = $client->getDbNum();
                    }catch(\RedisException $e){
                        // connection failed
                    }

                    if(!array_key_exists($uid = $conf['host'] . ':' . $conf['port'], $redisConfig)){
                        $redisConfig[$uid] = $getClientInfo($client, $conf);
                        $redisConfig[$uid]['status'] = $getClientStats($client) + $getDatabaseStatus($client, $conf['tag']);
                    }elseif(!array_key_exists($uidDb = 'db_' . $conf['db'], $redisConfig[$uid]['status'])){
                        $redisConfig[$uid]['status'] += $getDatabaseStatus($client, $conf['tag']);
                    }else{
                        $redisConfig[$uid]['status'][$uidDb]['label'] .= '; ' . $conf['tag'];
                    }

                    $client->close();
                }
            };

            // potential Redis caches ---------------------------------------------------------------------------------
            $redisCaches = [
                'CACHE' => $f3->get('CACHE'),
                'API_CACHE' => $f3->get('API_CACHE')
            ];

            foreach($redisCaches as $tag => $dsn){
                if(Config::parseDSN($dsn, $conf)){
                    $conf['tag'] = $tag;
                    $dsnData[] = $conf;
                }
            }

            // if Session handler is also Redis -> add this as well ---------------------------------------------------
            // -> the DSN format is not the same, convert URL format into DSN
            if(
                strtolower(session_module_name()) == 'redis' &&
                ($parts = parse_url(strtolower(session_save_path())))
            ){
                // parse URL parameters
                parse_str((string)$parts['query'], $params);

                $conf = [
                    'type' => 'redis',
                    'host' => $parts['host'],
                    'port' => $parts['port'],
                    'db'   => !empty($params['database']) ? (int)$params['database'] : 0,
                    'tag'  => 'SESSION'
                ];
                $dsnData[] = $conf;
            }

            // sort all $dsnData by 'db' number -----------------------------------------------------------------------
            usort($dsnData, function($a, $b){
                return $a['db'] <=> $b['db'];
            });

            foreach($dsnData as $conf){
                $buildRedisConfig($conf);
            }
        }

        return $redisConfig;
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

        foreach($this->databases as $dbAlias => $dbData){

            $dbLabel = '';
            $dbConfig = [];

            // DB connection status
            $dbConnected = false;
            // DB initialized as persistent connection
            $dbPersistent = false;
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
            $dbConfigValues = Config::getDatabaseConfig($f3, $dbAlias);
            // collection for errors
            $dbErrors = [];
            /**
             * @var $db \lib\db\SQL
             */
            $db = $f3->DB->getDB($dbAlias);

            // check config that does NOT require a valid DB connection
            switch($dbAlias){
                case 'PF':          $dbLabel = 'Pathfinder';            break;
                case 'UNIVERSE':    $dbLabel = 'EVE-Online universe';   break;
            }

            $dbName     = $dbConfigValues['NAME'];
            $dbUser     = $dbConfigValues['USER'];
            $dbAlias    = $dbConfigValues['ALIAS'];

            if($db){
                switch($dbAlias){
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
                }

                // db connect was successful
                $dbConnected = true;
                $dbPersistent = $db->pdo()->getAttribute(\PDO::ATTR_PERSISTENT);
                $dbDriver = $db->driver();
                $dbConfig = $this->checkDBConfig($f3, $db);

                // get tables
                $schema = new Schema($db);
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
                        $tableRows = $db->getRowCount($requiredTableName);


                        // find deprecated columns that are no longer needed ------------------------------------------
                        $deprecatedColumnNames = array_diff(array_keys($currentColumns), array_keys($data['fieldConf']), ['id']);
                        foreach($deprecatedColumnNames as $deprecatedColumnName){
                            $requiredTables[$requiredTableName]['fieldConf'][$deprecatedColumnName]['deprecated'] = true;
                            $requiredTables[$requiredTableName]['fieldConf'][$deprecatedColumnName]['currentType'] = 'deprecated';
                            //$requiredTables[$requiredTableName]['fieldConf'][$deprecatedColumnName]['statusCheck'] = false;
                            //$tableStatusCheckCount++;

                            //$tableModifierTemp->dropColumn($deprecatedColumnName);
                        }

                        //$buildStatus = $tableModifierTemp->build(false);
                        //$dbColumnQueries = array_merge($dbColumnQueries, (array)$buildStatus);
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

                            // set (new) column information -----------------------------------------------------------
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['exists'] = true;
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['currentType'] = $currentColType;
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['currentNullable'] = $hasNullable;
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['currentIndex'] = $hasIndex;
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['currentUnique'] = $hasUnique;

                            // check constraint -----------------------------------------------------------------------
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

                            // check type changed ---------------------------------------------------------------------
                            if(
                                $fieldConf['type'] !== 'JSON' &&
                                !$schema->isCompatible($fieldConf['type'], $currentColType)
                            ){
                                // column type has changed
                                $changedType = true;
                                $columnStatusCheck = false;
                                $tableStatusCheckCount++;
                            }

                            // check if column nullable changed -------------------------------------------------------
                            if( $currentNullable != $fieldConf['nullable']){
                                $changedNullable = true;
                                $columnStatusCheck = false;
                                $tableStatusCheckCount++;
                            }

                            // check if column index changed ----------------------------------------------------------
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

                            // check if column unique changed ---------------------------------------------------------
                            if($currentColIndexData['unique'] != $fieldConf['unique']){
                                $changedUnique = true;
                                $columnStatusCheck = false;
                                $tableStatusCheckCount++;

                                $indexUpdate = true;
                                $indexUnique = (bool)$fieldConf['unique'];
                            }

                            // build table with changed columns -------------------------------------------------------
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

                            // set (new) column information -----------------------------------------------------------
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

                foreach($f3->DB->getErrors($dbAlias, 10) as $dbException){
                    $dbErrors[] = $dbException->getMessage();
                }

                // try to connect without! DB (-> offer option to create them)
                // do not log errors (silent)
                $f3->DB->setSilent(true);
                $dbServer = $f3->DB->connectToServer($dbAlias);
                $f3->DB->setSilent(false);
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

            $this->databases[$dbAlias]['info'] = [
                'label'             => $dbLabel,
                'host'              => $dbConfigValues['SOCKET'] ? : $dbConfigValues['HOST'],
                'port'              => $dbConfigValues['PORT'] && !$dbConfigValues['SOCKET'] ? $dbConfigValues['PORT'] : '',
                'driver'            => $dbDriver,
                'name'              => $dbName,
                'user'              => $dbUser,
                'pass'              => Util::obscureString((string)$dbConfigValues['PASS'], 8),
                'dbConfig'          => $dbConfig,
                'dbCreate'          => $dbCreate,
                'setupEnable'       => $dbSetupEnable,
                'connected'         => $dbConnected,
                'persistent'        => $dbPersistent,
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

    /**
     * check MySQL params
     * @param \Base $f3
     * @param \lib\db\SQL $db
     * @return array
     */
    protected function checkDBConfig(\Base $f3, \lib\db\SQL $db) : array {
        $checkAll = true;
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
            'data' => [
                'version' => [
                    'label' => 'DB version',
                    'required' => $f3->get('REQUIREMENTS.MYSQL.VERSION'),
                    'version' => $dbVersion,
                    'check' => version_compare($dbVersion, $f3->get('REQUIREMENTS.MYSQL.VERSION'), '>=' ) ? : $checkAll = false
                ]
            ]
        ];

        $mySQLConfig = array_change_key_case((array)$f3->get('REQUIREMENTS.MYSQL.VARS'));
        $mySQLConfigKeys = array_keys($mySQLConfig);

        $results = $db->exec("SHOW VARIABLES WHERE Variable_Name IN ('" . implode("','", $mySQLConfigKeys) . "')");

        $getValue = function(string $param) use ($results) : string {
            $match = array_filter($results, function($k) use ($param) : bool {
                return strtolower($k['Variable_name']) == $param;
            });
            return !empty($match) ? end(reset($match)) : 'unknown';
        };

        $checkValue = function($requiredValue, $value) : bool {
            $check = true;
            if(!empty($requiredValue)){
                if(is_int($requiredValue)){
                    $check = $requiredValue <= $value;
                }else{
                    $check = $requiredValue == $value;
                }
            }
            return $check;
        };

        foreach($mySQLConfig as $param => $requiredValue){
            $value = $getValue($param);
            $dbConfig['data'][] = [
                'label' => $param,
                'required' => $requiredValue,
                'version' => $value,
                'check' => $checkValue($requiredValue, $value) ? : $checkAll = false
            ];
        }

        $dbConfig['meta'] = [
            'check' => $checkAll
        ];

        return $dbConfig;
    }

    /**
     * try to create a fresh database
     * @param \Base $f3
     * @param string $dbAlias
     */
    protected function createDB(\Base $f3, string $dbAlias){
        // check for valid key
        if(!empty($this->databases[$dbAlias])){
            // disable logging (we expect the DB connect to fail -> no db created)
            $f3->DB->setSilent(true);
            // try to connect
            $db = $f3->DB->getDB($dbAlias);
            // enable logging
            $f3->DB->setSilent(false, true);
            if(is_null($db)){
                // try create new db
                $db = $f3->DB->createDB($dbAlias);
                if(is_null($db)){
                    foreach($f3->DB->getErrors($dbAlias, 5) as $error){
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
     * @param \Base $f3
     * @param string $dbAlias
     * @return array
     */
    protected function bootstrapDB(\Base $f3, string $dbAlias) : array {
        $checkTables = [];
        if($db = $f3->DB->getDB($dbAlias)){
            // set some default config for this database
            $requiredVars = Config::getRequiredDbVars($f3, $db->driver());
            $db->prepareDatabase($requiredVars['CHARACTER_SET_DATABASE'], $requiredVars['COLLATION_DATABASE']);

            // setup tables
            foreach($this->databases[$dbAlias]['models'] as $modelClass){
                $checkTables[] = call_user_func($modelClass . '::setup', $db);
            }
        }
        return $checkTables;
    }

    /**
     * get Socket information (TCP (internal)), (WebSocket (clients))
     * @param \Base $f3
     * @return array
     * @throws \Exception
     */
    protected function getSocketInformation(\Base $f3) : array {
        $ttl = 0.6;
        $task = 'healthCheck';
        $healthCheckToken = microtime(true);

        $statusTcp = [
            'type'  => 'danger',
            'label' => 'INIT CONNECTION…',
            'class' => 'txt-color-danger'
        ];

        $statusWeb = [
            'type'  => 'danger',
            'label' => 'INIT CONNECTION…',
            'class' => 'txt-color-danger'
        ];

        $statsTcp = false;
        $statsWeb = false;

        $setStats = function(array $stats) use (&$statsTcp, &$statsWeb) {
            if(!empty($stats['tcpSocket'])){
                $statsTcp = $stats['tcpSocket'];
            }
            if(!empty($stats['webSocket'])){
                $statsWeb = $stats['webSocket'];
            }
        };

        // ping TCP Socket with "healthCheck" task
        $f3->webSocket(['timeout' => $ttl])
            ->write($task, $healthCheckToken)
            ->then(
                function($payload) use ($task, $healthCheckToken, &$statusTcp, $setStats) {
                    if(
                        $payload['task'] == $task &&
                        $payload['load'] == $healthCheckToken
                    ){
                        $statusTcp['type'] = 'success';
                        $statusTcp['label'] = 'PING OK';
                        $statusTcp['class'] = 'txt-color-success';
                    }else{
                        $statusTcp['type'] = 'warning';
                        $statusTcp['label'] = is_string($payload['load']) ? $payload['load'] : 'INVALID RESPONSE';
                        $statusTcp['class'] = 'txt-color-warning';
                    }

                    // statistics (e.g. current connection count)
                    $setStats((array)$payload['stats']);
                },
                function($payload) use (&$statusTcp, $setStats) {
                    $statusTcp['label'] = $payload['load'];

                    // statistics (e.g. current connection count)
                    $setStats((array)$payload['stats']);
                });

        $socketInformation = [
            'tcpSocket' => [
                'label'  => 'TCP-Socket (intern)',
                'icon' => 'fa-exchange-alt',
                'status' => $statusTcp,
                'stats'  => $statsTcp,
                'data' => [
                    [
                        'label' => 'HOST',
                        'value' => Config::getEnvironmentData('SOCKET_HOST') ? : '[missing]',
                        'check' => !empty( Config::getEnvironmentData('SOCKET_HOST') )
                    ],[
                        'label' => 'PORT',
                        'value' => Config::getEnvironmentData('SOCKET_PORT') ? : '[missing]',
                        'check' => !empty( Config::getEnvironmentData('SOCKET_PORT') )
                    ],[
                        'label' => 'URI',
                        'value' => Config::getSocketUri() ? : '[missing]',
                        'check' => !empty( Config::getSocketUri() )
                    ],[
                        'label' => 'timeout (seconds)',
                        'value' => $ttl,
                        'check' => !empty( $ttl )
                    ],[
                        'label' => 'uptime',
                        'value' => Config::formatTimeInterval($statsTcp['startup'] ? : 0),
                        'check' => $statsTcp['startup'] > 0
                    ]
                ],
                'token' => $healthCheckToken
            ],
            'webSocket' => [
                'label' => 'Web-Socket',
                'icon' => 'fa-random',
                'status' => $statusWeb,
                'stats'  => $statsWeb,
                'data' => [
                    [
                        'label' => 'URI',
                        'value' => '',
                        'check' => null // undefined
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
            /**
             * @var $categoryUniverseModel Universe\CategoryModel
             */
            $categoryUniverseModel = Universe\AbstractUniverseModel::getNew('CategoryModel');
            $categoryUniverseModel->getById(65, 0);
            $structureCount = $categoryUniverseModel->getTypesCount(false);

            $categoryUniverseModel->getById(6, 0);
            $shipCount = $categoryUniverseModel->getTypesCount(false);

            /**
             * @var $systemNeighbourModel Pathfinder\SystemNeighbourModel
             */
            $systemNeighbourModel = Pathfinder\AbstractPathfinderModel::getNew('SystemNeighbourModel');

            $indexInfo = [
                'Systems' => [
                    'task' => [
                        [
                            'action' => 'clearIndex',
                            'label' => 'Clear',
                            'icon' => 'fa-trash',
                            'btn' => 'btn-danger'
                        ],[
                            'action' => 'buildIndex',
                            'label' => 'Build',
                            'icon' => 'fa-sync',
                            'btn' => 'btn-primary'
                        ]
                    ],
                    'label' => 'build systems index',
                    'countBuild' => count((new UniverseController())->getSystemsIndex()),
                    'countAll' => count((new UniverseController())->getSystemIds()),
                    'tooltip' => 'build up a static search index over all systems found on DB. Do not refresh page until import is complete (check progress)! Runtime: ~5min'
                ],
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
                    'countBuild' => $structureCount,
                    'countAll' => (int)$f3->get('REQUIREMENTS.DATA.STRUCTURES'),
                    'tooltip' => 'import all structure types (e.g. Citadels) from ESI. Runtime: ~15s'
                ],
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
                    'countBuild' => $shipCount,
                    'countAll' => (int)$f3->get('REQUIREMENTS.DATA.SHIPS'),
                    'tooltip' => 'import all ships types from ESI. Runtime: ~2min'
                ],
                'SystemNeighbour' => [
                    'task' => [
                        [
                            'action' => 'buildIndex',
                            'label' => 'Build',
                            'icon' => 'fa-sync',
                            'btn' => 'btn-primary'
                        ]
                    ],
                    'label' => 'build neighbour index',
                    'countBuild' => $f3->DB->getDB('PF')->getRowCount($systemNeighbourModel->getTable()),
                    'countAll' =>  (int)$f3->get('REQUIREMENTS.DATA.NEIGHBOURS'),
                    'tooltip' => 'build up a static search index for route search. This is used as fallback in case ESI is down. Runtime: ~30s'

                ],
                // All following rows become deprecated
                /*
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
                    'countBuild' => $f3->DB->getDB('PF')->getRowCount($wormholeModel->getTable()),
                    'countAll' => 89
                ]
                */
            ];
        }else{
            $indexInfo = [
                'SystemNeighbour' => [
                    'task' => [],
                    'label' => 'Fix database errors first!'
                ]
            ];
        }

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
        return Pathfinder\AbstractPathfinderModel::getNew($modelClass)->importData();
    }

    /**
     * export table data
     * @param string $modelClass
     * @throws \Exception
     */
    protected function exportTable($modelClass){
        $this->getDB('PF');
        Pathfinder\AbstractPathfinderModel::getNew($modelClass)->exportData();
    }

    /**
     * get cache folder size
     * @param \Base $f3
     * @return array
     */
    protected function checkDirSize(\Base $f3) : array {
        // limit shown cache size. Reduce page load on big cache. In Bytes
        $maxBytes   = 10 * 1024 * 1024; // 10MB
        $dirTemp    = (string)$f3->get('TEMP');
        $cacheDsn   = (string)$f3->get('CACHE');
        Config::parseDSN($cacheDsn, $conf);
        // if 'CACHE' is e.g. redis=... -> show default dir for cache
        $dirCache   = $conf['type'] == 'folder' ? $conf['folder'] : $dirTemp . 'cache/';

        $dirAll = [
          'TEMP' => [
              'label' => 'Temp dir',
              'path' => $dirTemp
          ],
          'CACHE' => [
              'label' => 'Cache dir',
              'path' => $dirCache
          ]
        ];

        $maxHitAll = false;
        $bytesAll = 0;

        foreach($dirAll as $key => $dirData){
            $maxHit = false;
            $bytes = 0;
            $files = Search::getFilesByMTime($dirData['path']);
            foreach($files as $filename => $file) {
                $bytes += $file->getSize();
                if($bytes > $maxBytes){
                    $maxHit = $maxHitAll = true;
                    break;
                }
            }
            $bytesAll += $bytes;

            $dirAll[$key]['size'] = ($maxHit ? '>' : '') . $this->convertBytes($bytes);
            $dirAll[$key]['task'] = [
                [
                    'action' => http_build_query([
                        'action' => 'clearFiles',
                        'path' => $dirData['path']
                    ]),
                    'label' => 'Delete files',
                    'icon' => 'fa-trash',
                    'btn' => 'btn-danger' . (($bytes > 0) ? '' : ' disabled')
                ]
            ];
        }

        return [
            'sizeAll' => ($maxHitAll ? '>' : '') . $this->convertBytes($bytesAll),
            'dirAll' => $dirAll
        ];
    }

    /**
     * clear directory
     * @param string $path
     */
    protected function clearFiles(string $path){
        $files = Search::getFilesByMTime($path);
        foreach($files as $filename => $file){
            /**
             * @var $file \SplFileInfo
             */
            if($file->isFile()){
                if($file->isWritable()){
                    unlink($file->getRealPath());
                }
            }
        }
    }

    /**
     * clear all key in a specific Redis database
     * @param string $host
     * @param int $port
     * @param int $db
     */
    protected function flushRedisDb(string $host, int $port, int $db = 0){
        $client = new \Redis();
        $client->pconnect($host, $port, 0.3);
        $client->select($db);
        $client->flushDB();
        $client->close();
    }

    /**
     * clear all character authentication (Cookie) data
     * @param \Base $f3
     * @throws \Exception
     */
    protected function invalidateCookies(\Base $f3){
        $this->getDB('PF');
        $authenticationModel = Pathfinder\AbstractPathfinderModel::getNew('CharacterAuthenticationModel');
        $results = $authenticationModel->find();
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
            $suffixes = array('', 'KB', 'M', 'GB', 'TB');
            $result = round(pow(1024, $base - floor($base)), $precision) .''. $suffixes[(int)floor($base)];
        }
        return $result;
    }
}