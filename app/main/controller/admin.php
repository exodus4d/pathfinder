<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 12.05.2017
 * Time: 20:30
 */

namespace Controller;


use Controller\Ccp\Sso;
use lib\Config;
use Model\Pathfinder\CharacterModel;
use Model\Pathfinder\CorporationModel;
use Model\Pathfinder\MapModel;
use Model\Pathfinder\RoleModel;

class Admin extends Controller{

    const ERROR_SSO_CHARACTER_EXISTS                = 'No character found. Please login first.';
    const ERROR_SSO_CHARACTER_SCOPES                = 'Additional ESI scopes are required for "%s". Use the SSO button below.';
    const ERROR_SSO_CHARACTER_ROLES                 = 'Insufficient in-game roles. "%s" requires at least one of these corp roles: %s.';

    const LOG_TEXT_KICK_BAN                         = '%s "%s" from corporation "%s", by "%s"';

    const KICK_OPTIONS = [
        5 => '5m',
        60 => '1h',
        1440 => '24h'
    ];

    /**
     * event handler for all "views"
     * some global template variables are set in here
     * @param \Base $f3
     * @param $params
     * @return bool
     * @throws \Exception
     */
    function beforeroute(\Base $f3, $params): bool {
        $return = parent::beforeroute($f3, $params);

        $f3->set('tplPage', 'login');

        if($character = $this->getAdminCharacter($f3)){
            $f3->set('tplLogged', true);
            $f3->set('character', $character);
            $this->dispatch($f3, $params, $character);
        }

        $f3->set('tplAuthType', $f3->get('BASE') . $f3->alias( 'sso', ['action' => 'requestAdminAuthorization']));

        // page title
        $f3->set('tplPageTitle', 'Admin | ' . Config::getPathfinderData('name'));

        // main page content
        $f3->set('tplPageContent', Config::getPathfinderData('view.admin'));

        // body element class
        $f3->set('tplBodyClass', 'pf-landing');

        return $return;
    }

    /**
     * event handler after routing
     * @param \Base $f3
     */
    public function afterroute(\Base $f3) {
        // js view (file)
        $f3->set('tplJsView', 'admin');

        // render view
        echo \Template::instance()->render( Config::getPathfinderData('view.index') );

        // clear all SSO related temp data
        if( $f3->exists(Sso::SESSION_KEY_SSO) ){
            $f3->clear('SESSION.SSO.ERROR');
        }
    }

    /**
     * returns valid admin $characterModel for current user
     * @param \Base $f3
     * @return CharacterModel|null
     * @throws \Exception
     */
    protected function getAdminCharacter(\Base $f3){
        $adminCharacter = null;
        if( !$f3->exists(Sso::SESSION_KEY_SSO_ERROR) ){
            if( $character = $this->getCharacter() ){
                if(in_array($character->roleId->name, ['SUPER', 'CORPORATION'], true)){
                    // current character is admin
                    $adminCharacter = $character;
                }elseif( !$character->hasAdminScopes() ){
                    $f3->set(Sso::SESSION_KEY_SSO_ERROR,
                        sprintf(
                            self::ERROR_SSO_CHARACTER_SCOPES,
                            $character->name
                        ));
                }else{
                    $f3->set(Sso::SESSION_KEY_SSO_ERROR,
                        sprintf(
                            self::ERROR_SSO_CHARACTER_ROLES,
                            $character->name,
                            implode(', ', CorporationModel::ADMIN_ROLES)
                        ));
                }
            }else{
                $f3->set(Sso::SESSION_KEY_SSO_ERROR, self::ERROR_SSO_CHARACTER_EXISTS);
            }
        }

        return $adminCharacter;
    }

    /**
     * dispatch page events by URL $params
     * @param \Base $f3
     * @param $params
     * @param null $character
     * @throws \Exception
     */
    public function dispatch(\Base $f3, $params, $character = null){
        if($character instanceof CharacterModel){
            // user logged in
            $parts = array_values(array_filter(array_map('strtolower', explode('/', $params['*']))));
            $f3->set('tplPage', $parts[0]);

            switch($parts[0]){
                case 'settings':
                    switch($parts[1]){
                        case 'save':
                            $objectId = (int)$parts[2];
                            $values  = (array)$f3->get('GET');
                            $this->saveSettings($character, $objectId, $values);

                            $f3->reroute('@admin(@*=/' . $parts[0] . ')');
                            break;
                    }
                    $f3->set('tplDefaultRole', RoleModel::getDefaultRole());
                    $f3->set('tplRoles', RoleModel::getAll());
                    $this->initSettings($f3, $character);
                    break;
                case 'members':
                    switch($parts[1]){
                        case 'kick':
                            $objectId = (int)$parts[2];
                            $value  = (int)$parts[3];
                            $this->kickCharacter($character, $objectId, $value);

                            $f3->reroute('@admin(@*=/' . $parts[0] . ')');
                            break;
                        case 'ban':
                            $objectId = (int)$parts[2];
                            $value  = (int)$parts[3];
                            $this->banCharacter($character, $objectId, $value);
                            break;
                    }
                    $f3->set('tplKickOptions', self::KICK_OPTIONS);
                    $this->initMembers($f3, $character);
                    break;
                case 'maps':
                    switch($parts[1]){
                        case 'active':
                            $objectId = (int)$parts[2];
                            $value  = (int)$parts[3];
                            $this->activateMap($character, $objectId, $value);

                            $f3->reroute('@admin(@*=/' . $parts[0] . ')');
                            break;
                        case 'delete':
                            $objectId = (int)$parts[2];
                            $this->deleteMap($character, $objectId);
                            $f3->reroute('@admin(@*=/' . $parts[0] . ')');
                            break;
                    }
                    $this->initMaps($f3, $character);
                    break;
                case 'login':
                default:
                    $f3->set('tplPage', 'login');
                    break;
            }
        }
    }

    /**
     * save or delete settings (e.g. corporation rights)
     * @param CharacterModel $character
     * @param int $corporationId
     * @param array $settings
     * @throws \Exception
     */
    protected function saveSettings(CharacterModel $character, int $corporationId, array $settings){
        $defaultRole = RoleModel::getDefaultRole();

        if($corporationId && $defaultRole){
            $corporations = $this->getAccessibleCorporations($character);
            foreach($corporations as $corporation){
                if($corporation->_id === $corporationId){
                    // character has access to that corporation -> create/update/delete rights...
                    if($corporationRightsData = (array)$settings['rights']){
                        // get existing corp rights
                        foreach($corporation->getRights(['addInactive' => true]) as $corporationRight){
                            $corporationRightData = $corporationRightsData[$corporationRight->rightId->_id];
                            if(
                                $corporationRightData &&
                                $corporationRightData['roleId'] != $defaultRole->_id // default roles should not be saved
                            ){
                                $corporationRight->setData($corporationRightData);
                                $corporationRight->setActive(true);
                                $corporationRight->save();
                            }else{
                                // right not send by user -> delete existing right
                                $corporationRight->erase();
                            }
                        }
                    }
                    break;
                }
            }
        }
    }

    /**
     * kick or revoke a character
     * @param CharacterModel $character
     * @param int $kickCharacterId
     * @param int $minutes
     */
    protected function kickCharacter(CharacterModel $character, $kickCharacterId, $minutes){
        $kickOptions = self::KICK_OPTIONS;
        $minKickTime = key($kickOptions) ;
        end($kickOptions);
        $maxKickTime = key($kickOptions);
        $minutes = in_array($minutes, range($minKickTime, $maxKickTime)) ? $minutes : 0;

        $kickCharacters = $this->filterValidCharacters($character, $kickCharacterId);
        foreach($kickCharacters as $kickCharacter){
            $kickCharacter->kick($minutes);
            $kickCharacter->save();

            self::getLogger()->write(
                sprintf(
                    self::LOG_TEXT_KICK_BAN,
                    $minutes ? 'KICK' : 'KICK REVOKE',
                    $kickCharacter->name,
                    $kickCharacter->getCorporation()->name,
                    $character->name
                )
            );
        }
    }

    /**
     * @param CharacterModel $character
     * @param int $banCharacterId
     * @param int $value
     */
    protected function banCharacter(CharacterModel $character, $banCharacterId, $value){
        $banCharacters = $this->filterValidCharacters($character, $banCharacterId);
        foreach($banCharacters as $banCharacter){
            $banCharacter->ban($value);
            $banCharacter->save();

            self::getLogger()->write(
                sprintf(
                    self::LOG_TEXT_KICK_BAN,
                    $value ? 'BAN' : 'BAN REVOKE',
                    $banCharacter->name,
                    $banCharacter->getCorporation()->name,
                    $character->name
                )
            );
        }
    }

    /**
     * checks whether a $character has admin access rights for $characterId
     * -> must be in same corporation
     * @param CharacterModel $character
     * @param int $characterId
     * @return array|\DB\CortexCollection
     */
    protected function filterValidCharacters(CharacterModel $character, $characterId){
        $characters = [];
        // check if kickCharacters belong to same Corp as admin character
        // -> remove admin char from valid characters...
        if( !empty($characterIds = array_diff( [$characterId], [$character->_id])) ){
            if($character->roleId->name === 'SUPER'){
                if($filterCharacters = CharacterModel::getAll($characterIds)){
                    $characters = $filterCharacters;
                }
            }else{
                $characters = $character->getCorporation()->getCharacters($characterIds);
            }
        }
        return $characters;
    }

    /**
     * @param CharacterModel $character
     * @param int $mapId
     * @param int $value
     */
    protected function activateMap(CharacterModel $character, int $mapId, int $value){
        $maps = $this->filterValidMaps($character, $mapId);
        foreach($maps as $map){
            $map->setActive((bool)$value);
            $map->save($character);
        }
    }

    /**
     * @param CharacterModel $character
     * @param int $mapId
     */
    protected function deleteMap(CharacterModel $character, int $mapId){
        $maps = $this->filterValidMaps($character, $mapId);
        foreach($maps as $map){
            $map->erase();
        }
    }

    /**
     * checks whether a $character has admin access rights for $mapId
     * @param CharacterModel $character
     * @param int $mapId
     * @return \DB\CortexCollection[]|MapModel[]
     */
    protected function filterValidMaps(CharacterModel $character, int $mapId) {
        $maps = [];
        if($character->roleId->name === 'SUPER'){
            if($filterMaps = MapModel::getAll([$mapId], ['addInactive' => true])){
                $maps = $filterMaps;
            }
        }else{
            $maps = $character->getCorporation()->getMaps([$mapId], ['addInactive' => true, 'ignoreMapCount' => true]);
        }

        return $maps;
    }

    /**
     * get log file for "admin" logs
     * @param string $type
     * @return \Log
     */
    static function getLogger($type = 'ADMIN') : \Log {
        return parent::getLogger('ADMIN');
    }

    /**
     * init /settings page data
     * @param \Base $f3
     * @param CharacterModel $character
     */
    protected function initSettings(\Base $f3, CharacterModel $character){
        $data = (object) [];
        $corporations = $this->getAccessibleCorporations($character);

        foreach($corporations as $corporation){
            $data->corporations[$corporation->name] = $corporation;
        }

        $f3->set('tplSettings', $data);
    }

    /**
     * init /member page data
     * @param \Base $f3
     * @param CharacterModel $character
     */
    protected function initMembers(\Base $f3, CharacterModel $character){
        $data = (object) [];
        if($characterCorporation = $character->getCorporation()){
            $corporations = $this->getAccessibleCorporations($character);

            foreach($corporations as $corporation){
                if($characters = $corporation->getCharacters()){
                    $data->corpMembers[$corporation->name] = $characters;
                }
            }

            // sort corporation from current user first
            if( !empty($data->corpMembers[$characterCorporation->name]) ){
                $data->corpMembers = array($characterCorporation->name => $data->corpMembers[$characterCorporation->name]) + $data->corpMembers;
            }
        }

        $f3->set('tplMembers', $data);
    }

    /**
     * init /maps page data
     * @param \Base $f3
     * @param CharacterModel $character
     */
    protected function initMaps(\Base $f3, CharacterModel $character){
        $data = (object) [];
        if($characterCorporation = $character->getCorporation()){
            $corporations = $this->getAccessibleCorporations($character);

            foreach($corporations as $corporation){
                if($maps = $corporation->getMaps([], ['addInactive' => true, 'ignoreMapCount' => true])){
                    $data->corpMaps[$corporation->name] = $maps;
                }
            }
        }

        $f3->set('tplMaps', $data);

        if( !isset($data->corpMaps) ){
            $f3->set('tplNotification', $this->getNotificationObject('No maps found',
                'Only corporation maps could get loaded' ,
                'info'
            ));
        }
    }

    /**
     * get all corporations a characters has admin access for
     * @param CharacterModel $character
     * @return CorporationModel[]
     */
    protected function getAccessibleCorporations(CharacterModel $character) {
        $corporations = [];
        if($characterCorporation = $character->getCorporation()){
            switch($character->roleId->name){
                case 'SUPER':
                    if($accessCorporations =  CorporationModel::getAll(['addNPC' => true])){
                        $corporations = $accessCorporations;
                    }
                    break;
                case 'CORPORATION':
                    $corporations[] = $characterCorporation;
                    break;
            }
        }

        return $corporations;
    }

}