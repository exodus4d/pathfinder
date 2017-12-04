<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 12.05.2017
 * Time: 20:30
 */

namespace Controller;


use Controller\Ccp\Sso;
use Model\CharacterModel;
use Model\CorporationModel;
use lib\Config;

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
     * @throws \Exception\PathfinderException
     */
    function beforeroute(\Base $f3, $params): bool {
        $return = parent::beforeroute($f3, $params);

        $f3->set('tplPage', 'login');

        if($character = $this->getAdminCharacter($f3)){
            $f3->set('tplLogged', true);
            $f3->set('character', $character);
            $this->dispatch($f3, $params, $character);
        }

        $f3->set('tplAuthType', $f3->alias( 'sso', ['action' => 'requestAdminAuthorization']));

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
     * @throws \Exception\PathfinderException
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
                $this->setCharacterRole($character);

                if($character->role != 'MEMBER'){
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
     * set temp "virtual" field with current admin role name for a $characterModel
     * @param CharacterModel $character
     */
    protected function setCharacterRole(CharacterModel $character){
        $character->virtual('role', function ($character){
            // default role based on roleId (auto-detected)
            if(($role = array_search($character->roleId, CharacterModel::ROLES)) === false){
                $role = 'MEMBER';
            }

            /**
             * check config files for hardcoded character roles
             * -> overwrites default role (e.g. auto detected by corp in-game roles)
             */
            if($this->getF3()->exists('PATHFINDER.ADMIN.CHARACTER', $globalAdminData)){
                foreach((array)$globalAdminData as $adminData){
                    if($adminData[ 'ID' ] === $character->_id){
                        if(CharacterModel::ROLES[ $adminData[ 'ROLE' ] ]){
                            $role = $adminData[ 'ROLE' ];
                        }
                        break;
                    }
                }
            }

            return $role;
        });
    }

    /**
     * dispatch page events by URL $params
     * @param \Base $f3
     * @param array $params
     * @param null $character
     * @throws \Exception\PathfinderException
     */
    public function dispatch(\Base $f3, $params, $character = null){
        if($character instanceof CharacterModel){
            // user logged in
            $parts = array_values(array_filter(array_map('strtolower', explode('/', $params['*']))));
            $f3->set('tplPage', $parts[0]);

            switch($parts[0]){
                case 'settings':
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
                    $f3->set('tplPage', 'members');
                    $f3->set('tplKickOptions', self::KICK_OPTIONS);

                    $this->initMembers($f3, $character);
                    break;
                case 'login':
                default:
                    $f3->set('tplPage', 'login');
                    break;
            }
        }
    }

    /**
     * kick or revoke a character
     * @param CharacterModel $character
     * @param int $kickCharacterId
     * @param int $minutes
     * @throws \Exception\PathfinderException
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
     * @throws \Exception\PathfinderException
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
     * checks whether a $character has admin access rights for $charcterId
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
            if($character->role === 'SUPERADMIN'){
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
     * get log file for "admin" logs
     * @param string $type
     * @return \Log
     * @throws \Exception\PathfinderException
     */
    static function getLogger($type = 'ADMIN'){
        return parent::getLogger('ADMIN');
    }

    /**
     * init /member page data
     * @param \Base $f3
     * @param CharacterModel $character
     */
    protected function initMembers(\Base $f3, CharacterModel $character){
        $data = (object) [];

        if($characterCorporation = $character->getCorporation()){
            $corporations = [];

            switch($character->role){
                case 'SUPERADMIN':
                    if($accessCorporations =  CorporationModel::getAll(['addNPC' => true])){
                        $corporations = $accessCorporations;
                    }
                    break;
                case 'CORPORATION':
                    $corporations[] = $characterCorporation;
                    break;
            }

            foreach($corporations as $corporation){
                if($characters = $corporation->getCharacters()){
                    $data->corpMembers[$corporation->name] = $corporation->getCharacters();
                }
            }

            // sort corporation from current user first
            if( !empty($data->corpMembers[$characterCorporation->name]) ){
                $data->corpMembers = array($characterCorporation->name => $data->corpMembers[$characterCorporation->name]) + $data->corpMembers;
            }
        }

        $f3->set('tplMembers', $data);
    }

}