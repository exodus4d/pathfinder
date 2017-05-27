<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 12.05.2017
 * Time: 20:30
 */

namespace Controller;


use Controller\Ccp\Sso;
use Model\BasicModel;
use Model\CharacterModel;
use Model\CorporationModel;

class Admin extends Controller{

    const ERROR_SSO_CHARACTER_EXISTS                = 'No character found. Please login first.';
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
     */
    function beforeroute(\Base $f3, $params) {
        parent::beforeroute($f3, $params);

        $f3->set('tplPage', 'login');

        if($character = $this->getAdminCharacter($f3)){
            $f3->set('tplLogged', true);
            $f3->set('character', $character);
            $this->dispatch($f3, $params, $character);
        }

        $f3->set('tplAuthType', $f3->alias( 'sso', ['action' => 'requestAdminAuthorization']));

        // page title
        $f3->set('pageTitle', 'Admin');

        // main page content
        $f3->set('pageContent', $f3->get('PATHFINDER.VIEW.ADMIN'));

        // body element class
        $f3->set('bodyClass', 'pf-body pf-landing');

        // js path (build/minified or raw uncompressed files)
        $f3->set('pathJs', 'public/js/' . $f3->get('PATHFINDER.VERSION') );
    }

    /**
     * event handler after routing
     * @param \Base $f3
     */
    public function afterroute(\Base $f3) {
        // js view (file)
        $f3->set('jsView', 'login');

        // render view
        echo \Template::instance()->render( $f3->get('PATHFINDER.VIEW.INDEX') );

        // clear all SSO related temp data
        if( $f3->exists(Sso::SESSION_KEY_SSO) ){
            $f3->clear('SESSION.SSO.ERROR');
        }
    }

    /**
     * returns valid admin $characterModel for current user
     * @param \Base $f3
     * @return CharacterModel|null
     */
    protected function getAdminCharacter(\Base $f3){
        $adminCharacter = null;
        if( !$f3->exists(Sso::SESSION_KEY_SSO_ERROR) ){
            if( $character = $this->getCharacter() ){
                if($character->roleId == 1){
                    // current character is admin
                    $adminCharacter = $character;
                }else{
                    $f3->set(Sso::SESSION_KEY_SSO_ERROR,
                        sprintf(
                            self::ERROR_SSO_CHARACTER_ROLES,
                            $character->name,
                            implode(', ', CorporationModel::ADMIN_ROLES
                            )));
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
     * @param array $params
     * @param null $character
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
     * checks whether a $character has admin access rights for $charcterId
     * -> must be in same corporation
     * @param CharacterModel $character
     * @param int $characterId
     * @return array|CharacterModel[]
     */
    protected function filterValidCharacters(CharacterModel $character, $characterId){
        $characters = [];
        // check if kickCharacters belong to same Corp as admin character
        // -> remove admin char from kickCharacters...
        if( !empty($characterIds = array_diff( [$characterId], [$character->_id])) ){
            $characters = $character->getCorporation()->getCharacters($characterIds);
        }
        return $characters;
    }

    /**
     * get log file for "admin" logs
     * @param string $type
     * @return \Log
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
        $data = (object) [];;

        $test = BasicModel::getNew('CharacterModel');
        $test->getById( $character->_id, 0);

        $data->members = $test->getCorporation()->getCharacters();

        $f3->set('tplMembers', $data);
    }

}