<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 17.05.15
 * Time: 20:43
 */

namespace Model\Pathfinder;

use DB\SQL\Schema;
use lib\Config;

class AllianceModel extends AbstractPathfinderModel {

    protected $table = 'alliance';

    protected $fieldConf = [
        'active' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 1,
            'index' => true
        ],
        'name' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'ticker' => [
            'type' => Schema::DT_VARCHAR128,
            'nullable' => false,
            'default' => ''
        ],
        'shared' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'allianceCharacters' => [
            'has-many' => ['Model\Pathfinder\CharacterModel', 'allianceId']
        ],
        'mapAlliances' => [
            'has-many' => ['Model\Pathfinder\AllianceMapModel', 'allianceId']
        ]
    ];

    /**
     * get all alliance data
     * @return \stdClass
     */
    public function getData(){
        $allianceData = (object) [];

        $allianceData->id = $this->id;
        $allianceData->name = $this->name;
        $allianceData->shared = $this->shared;

        return $allianceData;
    }/** @noinspection PhpHierarchyChecksInspection */

    /**
     * Event "Hook" function
     * return false will stop any further action
     * @param self $self
     * @param $pkeys
     * @return bool
     */
    public function beforeUpdateEvent($self, $pkeys) : bool {
        // if model changed, 'update' col needs to be updated as well
        // -> data no longer "outdated"
        $this->touch('updated');

        return parent::beforeUpdateEvent($self, $pkeys);
    }

    /**
     * get all maps for this alliance
     * @return array|mixed
     */
    public function getMaps(){
        $maps = [];
        $this->filterRel();

        if($this->mapAlliances){
            $mapCount = 0;
            foreach($this->mapAlliances as $mapAlliance){
                if(
                    $mapAlliance->mapId->isActive() &&
                    $mapCount < Config::getMapsDefaultConfig('alliance')['max_count']
                ){
                    $maps[] = $mapAlliance->mapId;
                    $mapCount++;
                }
            }
        }

        return $maps;
    }

    /**
     * get all characters in this alliance
     * @param array $characterIds
     * @param array $options
     * @return CharacterModel[]
     */
    public function getCharacters($characterIds = [], $options = []) : array {
        $characters = [];
        $filter = ['active = ?', 1];

        if( !empty($characterIds) ){
            $filter[0] .= ' AND id IN (?)';
            $filter[] =  $characterIds;
        }

        $this->filter('allianceCharacters', $filter);

        if($options['hasLog']){
            // just characters with active log data
            $this->has('allianceCharacters.characterLog', ['active = ?', 1]);
        }


        if($this->allianceCharacters){
            foreach($this->allianceCharacters as $character){
                $characters[] = $character;
            }
        }

        return $characters;
    }

    /**
     * load alliance by Id either from DB or load data from API
     * @param int $id
     * @param int $ttl
     * @param bool $isActive
     * @return bool
     */
    public function getById(int $id, int $ttl = self::DEFAULT_SQL_TTL, bool $isActive = true) : bool {
        /**
         * @var AllianceModel $alliance
         */
        $loaded = parent::getById($id, $ttl, $isActive);
        if($this->isOutdated()){
            // request alliance data
            $allianceData = self::getF3()->ccpClient()->getAllianceData($id);
            if( !empty($allianceData) ){
                $this->copyfrom($allianceData, ['id', 'name', 'ticker']);
                $this->save();
            }
        }

        return $loaded;
    }

    /**
     * @see parent
     */
    public function filterRel() : void {
        $this->filter('mapAlliances', self::getFilter('active', true), ['order' => 'created']);
    }
}