<?php


namespace Exodus4D\Pathfinder\Model\Universe;

use DB\SQL\Schema;

class AllianceModel extends AbstractUniverseModel {

    /**
     * @var string
     */
    protected $table = 'alliance';

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
        'corporations' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\CorporationModel', 'allianceId']
        ],
        'sovereigntySystems' => [
            'has-many' => ['Exodus4D\Pathfinder\Model\Universe\SovereigntyMapModel', 'allianceId']
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
        $data->ticker   = $this->ticker;

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
     * load alliance by Id either from DB or load data from API
     * @param int $id
     * @param string $accessToken
     * @param array $additionalOptions
     */
    protected function loadData(int $id, string $accessToken = '', array $additionalOptions = []){
        $data = self::getF3()->ccpClient()->send('getAlliance', $id);
        if(!empty($data) && !isset($data['error'])){
            if($data['factionId']){
                /**
                 * @var $faction FactionModel
                 */
                $faction = $this->rel('factionId');
                $faction->loadById($data['factionId'], $accessToken, $additionalOptions);
                $data['factionId'] = $faction;
            }

            $this->copyfrom($data, ['id', 'name', 'ticker', 'dateFounded', 'factionId']);
            $this->save();
        }
    }
}