<?php
/**
 * Created by PhpStorm.
 * User: Exodus
 * Date: 22.11.2015
 * Time: 10:59
 */

namespace Controller;

use DB;
use DB\SQL;
use DB\SQL\MySQL as MySQL;

use Model;

class Setup extends Controller {

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
                'Model\RegistrationKeyModel',

                'Model\CharacterStatusModel',
                'Model\ConnectionScopeModel',

                'Model\UserMapModel',
                'Model\AllianceMapModel',
                'Model\CorporationMapModel',

                'Model\UserApiModel',
                'Model\UserCharacterModel',
                'Model\CharacterModel',
                'Model\CharacterLogModel',

                'Model\SystemModel',
                'Model\SystemWormholeModel',

                'Model\ConnectionModel',
                'Model\SystemSignatureModel',

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
     * event handler for all "views"
     * some global template variables are set in here
     * @param $f3
     */
    function beforeroute($f3) {
        // load "requirements" info in "setup" route only
        $f3->config('app/requirements.ini');

        // body element class
        $f3->set('bodyClass', 'pf-body pf-landing');

        // main page content
        $f3->set('pageContent', $f3->get('PATHFINDER.VIEW.SETUP'));

        // js path (build/minified or raw uncompressed files)
        $f3->set('pathJs', 'public/js/' . $f3->get('PATHFINDER.VERSION') );
    }

    public function afterroute($f3) {
        // js view (file)
        $f3->set('jsView', 'setup');

        // render view
        echo \Template::instance()->render( $f3->get('PATHFINDER.VIEW.INDEX') );
    }

    /**
     * main setup route handler
     * works as dispatcher for setup functions
     * @param $f3
     */
    public function init($f3){
        $params = $f3->get('GET');

        // enables automatic column fix
        $fixColumns = false;

        // bootstrap database from model class definition
        if(
            isset($params['db']) &&
            !empty($params['db'])
        ){
            $this->bootstrapDB($params['db']);

            // reload page
            // -> remove GET param
            $f3->reroute('@setup');
            return;
        }elseif(
            isset($params['fixCols']) &&
            !empty($params['fixCols'])
        ){
            $fixColumns = true;
        }

        // set server information for page render
        $f3->set('serverInformation', $this->getServerInformation($f3));

        // set requirement check information for page render
        $f3->set('checkRequirements', $this->checkRequirements($f3));

        // set database connection information for page render
        $f3->set('checkDatabase', $this->checkDatabase($f3, $fixColumns));
    }

    /**
     * get server information
     * @param $f3
     * @return array
     */
    protected function getServerInformation($f3){
        $serverInfo = [
            'time' => [
                'label' => 'Time',
                'value' => date('Y/m/d H:i:s') . ' - (' . date_default_timezone_get() . ')'
            ],
            'os' => [
                'label' => 'OS',
                'value' => php_uname('s')
            ],
            'name' => [
                'label' => 'Host name',
                'value' => php_uname('n')
            ],
            'release' => [
                'label' => 'Release name',
                'value' => php_uname('r')
            ],
            'version' => [
                'label' => 'Version info',
                'value' => php_uname('v')
            ],
            'machine' => [
                'label' => 'Machine type',
                'value' => php_uname('m')
            ]
        ];

        return $serverInfo;
    }

    /**
     * check all required backend requirements
     * (Fat Free Framework)
     * @param $f3
     * @return array
     */
    protected function checkRequirements($f3){


        // server type ------------------------------------------------------------------
        $serverData = self::getServerData();

        $checkRequirements = [
            'servertype' => [
                'label' => 'Server type',
                'version' => $serverData->type,
                'check' => true
            ],
            'serverversion' => [
                'label' => 'Server version',
                'required' => $serverData->requiredVersion,
                'version' => $serverData->version,
                'check' => version_compare( $serverData->version, $serverData->requiredVersion, '>=')
            ],
            'php' => [
                'label' => 'PHP',
                'required' => $f3->get('REQUIREMENTS.PHP.VERSION'),
                'version' => phpversion(),
                'prefix' => 'v.',
                'check' => version_compare( phpversion(), $f3->get('REQUIREMENTS.PHP.VERSION'), '>=')
            ],
            'pcre' => [
                'label' => 'PCRE',
                'required' => $f3->get('REQUIREMENTS.PHP.PCRE_VERSION'),
                'version' => strstr(PCRE_VERSION, ' ', true),
                'prefix' => 'v.',
                'check' => version_compare( strstr(PCRE_VERSION, ' ', true), $f3->get('REQUIREMENTS.PHP.PCRE_VERSION'), '>=')
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
            ]
        ];

        if($serverData->type != 'nginx'){
            // mod_rewrite check ------------------------------------------------------------
            $modRewriteCheck = false;
            $modRewriteVersion = 'disabled';
            if(function_exists('apache_get_modules')){
                if(in_array('mod_rewrite',apache_get_modules())){
                    $modRewriteCheck = true;
                    $modRewriteVersion = 'enabled';
                }
            }else{
                // e.g. Nginx server
                $modRewriteVersion = '???';
            }

            $checkRequirements['mod_rewrite'] = [
                'label' => 'mod_rewrite',
                'required' => 'enabled',
                'version' => $modRewriteVersion,
                'check' => $modRewriteCheck
            ];

            // mod_headers check ------------------------------------------------------------
            $modHeadersCheck = false;
            $modHeadersVersion = 'disabled';
            if(function_exists('apache_get_modules')){
                if(in_array('mod_headers',apache_get_modules())){
                    $modHeadersCheck = true;
                    $modHeadersVersion = 'enabled';
                }
            }else{
                // e.g. Nginx server
                $modHeadersVersion = '???';
            }

            $checkRequirements['mod_headers'] = [
                'label' => 'mod_headers',
                'required' => 'enabled',
                'version' => $modHeadersVersion,
                'check' => $modHeadersCheck
            ];
        }

        return $checkRequirements;
    }

    /**
     * get database connection information
     * @param $f3
     * @param bool|false $exec
     * @return array
     */
    protected function checkDatabase($f3, $exec = false){

        foreach($this->databases as $dbKey => $dbData){

            $dbLabel = '';
            $dbName = '';
            $dbUser = '';
            $dbConfig = [];

            // DB connection status
            $dbConnected = false;
            // DB type (e.g. MySql,..)
            $dbDriver = '???';
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
                                    $requiredTables[$requiredTableName]['foreignKeys'][] = [
                                        'exists' => $foreignKeyExists,
                                        'keyName' => $constraint->getConstraintName()
                                    ];

                                    $col->addConstraint($constraint);

                                    if(!$foreignKeyExists){
                                        $tableStatusCheckCount++;
                                        $foreignKeyStatusCheck = false;
                                    }
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

                            // check if column unique changed -----------------------------------------------------
                            $indexUpdate = false;
                            $indexKey = (bool)$hasIndex;
                            $indexUnique = (bool)$hasUnique;

                            if($currentColIndexData['unique'] != $fieldConf['unique']){
                                $changedUnique = true;
                                $columnStatusCheck = false;
                                $tableStatusCheckCount++;

                                $indexUpdate = true;
                                $indexUnique =(bool)$fieldConf['unique'];
                            }

                            // check if column index changed ------------------------------------------------------
                            if($currentColIndex != $fieldConf['index']){
                                $changedIndex = true;
                                $columnStatusCheck = false;
                                $tableStatusCheckCount++;

                                $indexUpdate = true;
                                $indexKey = (bool) $fieldConf['index'];
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
     * @param $f3
     * @param $db
     * @return array
     */
    protected function checkDBConfig($f3, $db){

        // some db like "Maria DB" have some strange version strings....
        $dbVersionString = $db->version();
        $dbVersionParts = explode('-', $dbVersionString);
        $dbVersion = '???';
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
                'required' => 'v.' . $f3->get('REQUIREMENTS.MYSQL.VERSION'),
                'version' => 'v.' . $dbVersion,
                'check' => version_compare($dbVersion, $f3->get('REQUIREMENTS.MYSQL.VERSION'), '>=' )
            ]
        ];

        // get specific MySQL config Value
        $getDBConfigValue = function($db, $param){
            $result = $db->exec('SELECT @@' . $param);
            return !empty($result)? reset(reset($result)) : '???';
        };

        $mySQLConfigParams = $f3->get('REQUIREMENTS.MYSQL.OPTIONS');
        foreach($mySQLConfigParams as $param => $requiredValue){
            $value = $getDBConfigValue($db, $param);
            $dbConfig[] = [
                'label' => $param,
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
            foreach($this->databases[$dbKey]['models'] as $modelClass){
                $checkTables[] = call_user_func($modelClass . '::setup');
            }
        }
        return $checkTables;
    }
}