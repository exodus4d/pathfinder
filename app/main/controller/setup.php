<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 22.11.2015
 * Time: 10:59
 */

namespace Controller;

use data\filesystem\Search;
use DB;
use DB\SQL;
use DB\SQL\MySQL as MySQL;
use lib\Config;
use Model;

class Setup extends Controller {

    /**
     * required environment variables
     * @var array
     */
    protected $environmentVars = [
        'TYPE',
        'BASE',
        'URL',
        'DEBUG',
        'DB_DNS',
        'DB_NAME',
        'DB_USER',
        'DB_PASS',
        'DB_CCP_DNS',
        'DB_CCP_NAME',
        'DB_CCP_USER',
        'DB_CCP_PASS',
        'CCP_CREST_URL',
        'SSO_CCP_URL',
        'SSO_CCP_CLIENT_ID',
        'SSO_CCP_SECRET_KEY',
        'CCP_XML',
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

                'Model\CharacterStatusModel',
                'Model\ConnectionScopeModel',

                'Model\CharacterMapModel',
                'Model\AllianceMapModel',
                'Model\CorporationMapModel',

                'Model\UserCharacterModel',
                'Model\CharacterModel',
                'Model\CharacterAuthenticationModel',
                'Model\CharacterLogModel',

                'Model\SystemModel',
                'Model\SystemWormholeModel',
                'Model\ConstellationWormholeModel',

                'Model\ConnectionModel',
                'Model\SystemSignatureModel',

                'Model\ActivityLogModel',

                'Model\SystemShipKillModel',
                'Model\SystemPodKillModel',
                'Model\SystemFactionKillModel',
                'Model\SystemJumpModel'
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
     * database error
     * @var bool
     */
    protected $databaseCheck = true;

    /**
     * event handler for all "views"
     * some global template variables are set in here
     * @param \Base $f3
     */
    function beforeroute(\Base $f3) {
        // page title
        $f3->set('pageTitle', 'Setup');

        // main page content
        $f3->set('pageContent', $f3->get('PATHFINDER.VIEW.SETUP'));

        // body element class
        $f3->set('bodyClass', 'pf-body pf-landing');

        // js path (build/minified or raw uncompressed files)
        $f3->set('pathJs', 'public/js/' . $f3->get('PATHFINDER.VERSION') );
    }

    public function afterroute(\Base $f3) {
        // js view (file)
        $f3->set('jsView', 'setup');

        // render view
        echo \Template::instance()->render( $f3->get('PATHFINDER.VIEW.INDEX') );
    }

    /**
     * main setup route handler
     * works as dispatcher for setup functions
     * -> for security reasons all /setup "routes" are dispatched by GET params
     * @param \Base $f3
     */
    public function init(\Base $f3){
        $params = $f3->get('GET');

        // enables automatic column fix
        $fixColumns = false;

        // bootstrap database from model class definition
        if( !empty($params['db']) ){
            $this->bootstrapDB($params['db']);

            // reload page
            // -> remove GET param
            $f3->reroute('@setup');
            return;
        }elseif( !empty($params['fixCols']) ){
            $fixColumns = true;
        }elseif( !empty($params['buildIndex']) ){
            $this->setupSystemJumpTable();
        }elseif( !empty($params['importTable']) ){
            $this->importTable($params['importTable']);
        }elseif( !empty($params['exportTable']) ){
            $this->exportTable($params['exportTable']);
        }elseif( !empty($params['clearCache']) ){
            $this->clearCache($f3);
        }

        // set template data ----------------------------------------------------------------
        // set environment information
        $f3->set('environmentInformation', $this->getEnvironmentInformation($f3));

        // set server information
        $f3->set('serverInformation', $this->getServerInformation($f3));

        // set requirement check information
        $f3->set('checkRequirements', $this->checkRequirements($f3));

        // set database connection information
        $f3->set('checkDatabase', $this->checkDatabase($f3, $fixColumns));

        // set index information
        $f3->set('indexInformation', $this->getIndexData());

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
        $excludeVars = ['DB_DNS', 'DB_NAME', 'DB_USER',
            'DB_PASS', 'DB_CCP_DNS', 'DB_CCP_NAME',
            'DB_CCP_USER', 'DB_CCP_PASS'
        ];

        // obscure some values
        $obscureVars = ['SSO_CCP_CLIENT_ID', 'SSO_CCP_SECRET_KEY', 'SMTP_PASS'];

        foreach($this->environmentVars as $var){
            if( !in_array($var, $excludeVars) ){
                $value = Config::getEnvironmentData($var);
                $check = true;

                if(is_null($value)){
                    // variable missing
                    $check = false;
                    $value = '[missing]';
                }elseif( in_array($var, $obscureVars)){
                    $length = strlen($value);
                    $hideChars = ($length < 10) ? $length : 10;
                    $value = substr_replace($value, str_repeat('.', 3), -$hideChars);
                    $value .= ' [' . $length . ']';
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
                'value' => function_exists('php_uname') ? php_uname('s') : 'unknown'
            ],
            'name' => [
                'label' => 'Host name',
                'value' => function_exists('php_uname') ? php_uname('n') : 'unknown'
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
                'value' => function_exists('php_uname') ? php_uname('m') : 'unknown'
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
                'required' => $f3->get('REQUIREMENTS.PHP.VERSION'),
                'version' => phpversion(),
                'check' => version_compare( phpversion(), $f3->get('REQUIREMENTS.PHP.VERSION'), '>=')
            ],
            'pcre' => [
                'label' => 'PCRE',
                'required' => $f3->get('REQUIREMENTS.PHP.PCRE_VERSION'),
                'version' => strstr(PCRE_VERSION, ' ', true),
                'check' => version_compare( strstr(PCRE_VERSION, ' ', true), $f3->get('REQUIREMENTS.PHP.PCRE_VERSION'), '>=')
            ],
            'pdo' => [
                'label' => 'PDO',
                'required' => 'installed',
                'version' => extension_loaded('pdo') ? 'installed' : 'not installed',
                'check' => extension_loaded('pdo')
            ],
            'pdoMysql' => [
                'label' => 'PDO_MYSQL',
                'required' => 'installed',
                'version' => extension_loaded('pdo_mysql') ? 'installed' : 'not installed',
                'check' => extension_loaded('pdo_mysql')
            ],
            'openssl' => [
                'label' => 'OpenSSL',
                'required' => 'installed',
                'version' => extension_loaded('openssl') ? 'installed' : 'not installed',
                'check' => extension_loaded('openssl')
            ],
            'mcrypt' => [
                'label' => 'Mcrypt',
                'required' => 'installed',
                'version' => (extension_loaded('mcrypt')) ? 'installed' : 'not installed',
                'check' => (extension_loaded('mcrypt'))
            ],
            'xml' => [
                'label' => 'XML',
                'required' => 'installed',
                'version' => (extension_loaded('xml')) ? 'installed' : 'not installed',
                'check' => (extension_loaded('xml'))
            ],
            'gd' => [
                'label' => 'GD Library (for Image plugin)',
                'required' => 'installed',
                'version' => (extension_loaded('gd') && function_exists('gd_info')) ? 'installed' : 'not installed',
                'check' => (extension_loaded('gd') && function_exists('gd_info'))
            ],
            'curl' => [
                'label' => 'cURL (for Web plugin)',
                'required' => 'installed',
                'version' => (extension_loaded('curl') && function_exists('curl_version')) ? 'installed' : 'not installed',
                'check' => (extension_loaded('curl') && function_exists('curl_version'))
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
     * get database connection information
     * @param \Base $f3
     * @param bool|false $exec
     * @return array
     */
    protected function checkDatabase(\Base $f3, $exec = false){

        foreach($this->databases as $dbKey => $dbData){

            $dbLabel = '';
            $dbName = '';
            $dbUser = '';
            $dbConfig = [];

            // DB connection status
            $dbConnected = false;
            // DB type (e.g. MySql,..)
            $dbDriver = 'unknown';
            // enable database ::setup() function in UI
            $dbSetupEnable = false;
            // check  of everything is OK (connection, tables, columns, indexes,..)
            $dbStatusCheckCount = 0;
            // db queries for column fixes (types, indexes, unique)
            $dbColumnQueries = [];
            // tables that should exist in this DB
            $requiredTables = [];
            // check DB for valid connection
            $db = DB\Database::instance()->getDB($dbKey);

            switch($dbKey){
                case 'PF':
                    $dbLabel = 'Pathfinder';
                    $dbName = Controller::getEnvironmentData('DB_NAME');
                    $dbUser = Controller::getEnvironmentData('DB_USER');

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
                    $dbLabel = 'EVE-Online [SDE]';
                    $dbName = Controller::getEnvironmentData('DB_CCP_NAME');
                    $dbUser = Controller::getEnvironmentData('DB_CCP_USER');

                    // get table model from static table array
                    foreach($dbData['tables'] as $tableName){
                        $requiredTables[$tableName] = [
                            'exists' => false,
                            'empty' => true
                        ];
                    }
                    break;
            }

            if($db){
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
                    $tableEmpty = true;
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
                        $countRes = $db->exec("SELECT COUNT(*) `num` FROM " . $db->quotekey($requiredTableName) );
                        $tableEmpty = $countRes[0]['num'] > 0 ? false : true;
                    }else{
                        // table missing
                        $dbStatusCheckCount++;
                        $tableStatusCheckCount++;
                    }

                    foreach((array)$data['fieldConf'] as $columnName => $fieldConf){

                        $columnStatusCheck = true;
                        $foreignKeyStatusCheck = true;
                        $requiredTables[$requiredTableName]['fieldConf'][$columnName]['requiredType'] = $fieldConf['type'];
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
                            $currentColIndexData = call_user_func($data['model'] . '::indexExists', [$columnName]);
                            $currentColIndex = is_array($currentColIndexData);
                            $hasIndex = ($currentColIndex) ? '1' : '0';
                            $hasUnique = ($currentColIndexData['unique']) ? '1' : '0';
                            $changedType = false;
                            $changedUnique = false;
                            $changedIndex = false;
                            $addConstraints = [];

                            // set (new) column information -------------------------------------------------------
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['exists'] = true;
                            $requiredTables[$requiredTableName]['fieldConf'][$columnName]['currentType'] = $currentColType;
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

                            // check if column index changed ------------------------------------------------------
                            $indexUpdate = false;
                            $indexKey = (bool)$hasIndex;
                            $indexUnique = (bool)$hasUnique;

                            if($currentColIndex != $fieldConf['index']){
                                $changedIndex = true;
                                $columnStatusCheck = false;
                                $tableStatusCheckCount++;

                                $indexUpdate = true;
                                $indexKey = (bool) $fieldConf['index'];
                            }

                            // check if column unique changed -----------------------------------------------------
                            if($currentColIndexData['unique'] != $fieldConf['unique']){
                                $changedUnique = true;
                                $columnStatusCheck = false;
                                $tableStatusCheckCount++;

                                $indexUpdate = true;
                                $indexUnique =(bool)$fieldConf['unique'];
                            }

                            // build table with changed columns ---------------------------------------------------
                            if(!$columnStatusCheck || !$foreignKeyStatusCheck){

                                if(!$columnStatusCheck ){
                                    // IMPORTANT: setType is always required! Even if type has not changed
                                    $col->type($fieldConf['type']);

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
                    $requiredTables[$requiredTableName]['empty'] = $tableEmpty;
                    $requiredTables[$requiredTableName]['exists'] = $tableExists;
                    $requiredTables[$requiredTableName]['statusCheckCount'] = $tableStatusCheckCount;
                }

            }else{
                // DB connection failed
                $dbStatusCheckCount++;
            }

            if($exec){
                $f3->reroute('@setup');
            }

            if($dbStatusCheckCount !== 0){
                $this->databaseCheck = false;
            }

            // sort tables for better readability
            ksort($requiredTables);

            $this->databases[$dbKey]['info'] = [
                'db' => $db,
                'label' => $dbLabel,
                'driver' => $dbDriver,
                'name' => $dbName,
                'user' => $dbUser,
                'dbConfig' => $dbConfig,
                'setupEnable' => $dbSetupEnable,
                'connected' => $dbConnected,
                'statusCheckCount' => $dbStatusCheckCount,
                'columnQueries' => $dbColumnQueries,
                'tableData' => $requiredTables
            ];
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
            // hint: MariaDB´s version is always the last valid version number...
            if( version_compare( $dbVersionPart, '0.0.1', '>=' ) > 0 ){
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
     * init the complete database
     * - create tables
     * - create indexes
     * - set default static values
     * @param $dbKey
     * @return array
     */
    protected function bootstrapDB($dbKey){
        $db = DB\Database::instance()->getDB($dbKey);

        $checkTables = [];
        if($db){
            // set/change default "character set" and "collation"
            $db->exec('ALTER DATABASE ' . $db->name()
                . ' CHARACTER SET ' . self::getRequiredMySqlVariables('CHARACTER_SET_DATABASE')
                . ' COLLATE ' . self::getRequiredMySqlVariables('COLLATION_DATABASE')
            );

            // setup tables
            foreach($this->databases[$dbKey]['models'] as $modelClass){
                $checkTables[] = call_user_func($modelClass . '::setup');
            }
        }
        return $checkTables;
    }

    /** get indexed (cache) data information
     * @return array
     */
    protected function getIndexData(){

        // active DB and tables are required for obtain index data
        if( $this->databaseCheck ){
            $indexInfo = [
                'SystemNeighbourModel' => [
                    'action' => [
                        [
                            'task' => 'buildIndex',
                            'label' => 'build',
                            'icon' => 'fa-refresh',
                            'btn' => 'btn-primary'
                        ]
                    ],
                    'table' => Model\BasicModel::getNew('SystemNeighbourModel')->getTable(),
                    'count' => DB\Database::instance()->getRowCount( Model\BasicModel::getNew('SystemNeighbourModel')->getTable() )
                ],
                'WormholeModel' => [
                    'action' => [
                        [
                            'task' => 'exportTable',
                            'label' => 'export',
                            'icon' => 'fa-download',
                            'btn' => 'btn-default'
                        ],[
                            'task' => 'importTable',
                            'label' => 'import',
                            'icon' => 'fa-upload',
                            'btn' => 'btn-primary'
                        ]
                    ],
                    'table' => Model\BasicModel::getNew('WormholeModel')->getTable(),
                    'count' => DB\Database::instance()->getRowCount( Model\BasicModel::getNew('WormholeModel')->getTable() )
                ],
                'SystemWormholeModel' => [
                    'action' => [
                        [
                            'task' => 'exportTable',
                            'label' => 'export',
                            'icon' => 'fa-download',
                            'btn' => 'btn-default'
                        ],[
                            'task' => 'importTable',
                            'label' => 'import',
                            'icon' => 'fa-upload',
                            'btn' => 'btn-primary'
                        ]
                    ],
                    'table' => Model\BasicModel::getNew('SystemWormholeModel')->getTable(),
                    'count' => DB\Database::instance()->getRowCount( Model\BasicModel::getNew('SystemWormholeModel')->getTable() )
                ],
                'ConstellationWormholeModel' => [
                    'action' => [
                        [
                            'task' => 'exportTable',
                            'label' => 'export',
                            'icon' => 'fa-download',
                            'btn' => 'btn-default'
                        ],[
                            'task' => 'importTable',
                            'label' => 'import',
                            'icon' => 'fa-upload',
                            'btn' => 'btn-primary'
                        ]
                    ],
                    'table' => Model\BasicModel::getNew('ConstellationWormholeModel')->getTable(),
                    'count' => DB\Database::instance()->getRowCount( Model\BasicModel::getNew('ConstellationWormholeModel')->getTable() )
                ]
            ];
        }else{
            $indexInfo = [
                'SystemNeighbourModel' => [
                    'action' => [],
                    'table' => 'Fix database errors first!'
                ]
            ];
        }

        return $indexInfo;
    }

    /**
     * This function is just for setting up the cache table 'system_neighbour' which is used
     * for system jump calculation. Call this function manually when CCP adds Systems/Stargates
     */
    protected function setupSystemJumpTable(){
        $pfDB = $this->getDB('PF');
        $ccpDB = $this->getDB('CCP');

        $query = "SELECT
                map_sys.solarSystemID system_id,
                map_sys.regionID region_id,
                map_sys.constellationID constellation_id,
                map_sys.solarSystemName system_name,
                ROUND( map_sys.security, 4) system_security,
                (
                    SELECT
                        GROUP_CONCAT( NULLIF(map_sys_inner.solarSystemName, NULL) SEPARATOR ':')
                    FROM
                        mapSolarSystemJumps map_jump INNER JOIN
                        mapSolarSystems map_sys_inner ON
                            map_sys_inner.solarSystemID = map_jump.toSolarSystemID
                    WHERE
                        map_jump.fromSolarSystemID = map_sys.solarSystemID
                ) system_neighbours
            FROM
                mapSolarSystems map_sys
            HAVING
              -- skip systems without neighbors (e.g. WHs)
	          system_neighbours IS NOT NULL
            ";

        $rows = $ccpDB->exec($query);

        if(count($rows) > 0){
            // switch DB back to pathfinder DB

            // clear cache table
            $pfDB->exec("TRUNCATE system_neighbour");

            foreach($rows as $row){
                $pfDB->exec("
              INSERT INTO
                system_neighbour(
                  regionId,
                  constellationId,
                  systemName,
                  systemId,
                  jumpNodes,
                  trueSec
                  )
              VALUES(
                :regionId,
                :constellationId,
                :systemName,
                :systemId,
                :jumpNodes,
                :trueSec
            )",
                [
                    ':regionId' => $row['region_id'],
                    ':constellationId' => $row['constellation_id'],
                    ':systemName' => $row['system_name'],
                    ':systemId' => $row['system_id'],
                    ':jumpNodes' => $row['system_neighbours'],
                    ':trueSec' => $row['system_security']
                ]);
            }
        }
    }

    /**
     * import table data from existing dump file (e.g *.csv)
     * @param $modelClass
     * @return bool
     * @throws \Exception
     */
    protected function importTable($modelClass){
        $this->getDB('PF');
        return Model\BasicModel::getNew($modelClass)->importData();
    }

    /**
     * export table data
     * @param $modelClass
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