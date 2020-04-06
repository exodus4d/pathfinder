<?php


namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;

class CorporationModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'corporation';

    /**
     * @var array
     */
    protected $fieldConf = [
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
        'dateFounded' => [
            'type' => Schema::DT_DATETIME,
            'default' => null
        ],
        'memberCount' => [
            'type' => Schema::DT_INT,
            'nullable' => false,
            'default' => 0
        ],
        'isNPC' => [
            'type' => Schema::DT_BOOL,
            'nullable' => false,
            'default' => 0
        ],
        'factionId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\FactionModel',
            'constraint' => [
                [
                    'table' => 'faction',
                    'on-delete' => 'SET NULL'
                ]
            ]
        ],
        'allianceId' => [
            'type' => Schema::DT_INT,
            'index' => true,
            'belongs-to-one' => 'Exodus4D\Pathfinder\Model\Universe\AllianceModel',
            'constraint' => [
                [
                    'table' => 'alliance',
                    'on-delete' => 'SET NULL'
                ]
            ]
        ],
        'sovereigntySystems' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\SovereigntyMapModel', 'corporationId']
        ],
        'stations' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\StationModel', 'corporationId']
        ]
    ];

    /**
     * get data
     * @return \stdClass
     */
    public function getData(){
        $data           = (object) [];
        $data->id       = $this->_id;
        $data->name     = $this->name;

        return $data;
    }

    /**
     * @param $date
     * @return string|null
     */
    public function set_dateFounded($date){
        if(is_string($date) && !empty($date)){
            try{
                $dateTime  = new \DateTime($date);
                $date = $dateTime->format('Y-m-d H:i:s');
            }catch(\Exception $e){
                $date = null;
            }
        }
        return $date;
    }

    /**
     * load corporation by Id either from DB or load data from API
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->send('getCorporation', $id);
        if(!empty($data) && !isset($data['error'])){
            // check for NPC corporation
            $data['isNPC'] = in_array($id, self::getF3()->ccpClient()->send('getNpcCorporations'));

            if($data['factionId']){
                /**
                 * @var $faction FactionModel
                 */
                $faction = $this->rel('factionId');
                $faction->loadById($data['factionId'], $accessToken, $additionalOptions);
                $data['factionId'] = $faction;
            }

            if($data['allianceId']){
                /**
                 * @var $alliance AllianceModel
                 */
                $alliance = $this->rel('allianceId');
                $alliance->loadById($data['allianceId'], $accessToken, $additionalOptions);
                $data['allianceId'] = $alliance;
            }

            $this->copyfrom($data, ['id', 'name', 'ticker', 'dateFounded', 'memberCount', 'isNPC', 'factionId', 'allianceId']);
            $this->save();
        }
    }
}