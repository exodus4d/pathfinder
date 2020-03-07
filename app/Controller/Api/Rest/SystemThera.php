<?php


namespace Exodus4D\Pathfinder\Controller\Api\Rest;

use Exodus4D\Pathfinder\Lib\Config;

class SystemThera extends AbstractRestController {

    /**
     * cache key for HTTP response
     */
    const CACHE_KEY_THERA_CONNECTIONS               = 'CACHED_THERA_CONNECTIONS';

    /**
     * get Thera connections data from Eve-Scout
     * @param \Base $f3
     */
    public function get(\Base $f3){
        $ttl = 60 * 3;
        if(!$exists = $f3->exists(self::CACHE_KEY_THERA_CONNECTIONS, $connectionsData)){
            $connectionsData = $this->getEveScoutTheraConnections();
            $f3->set(self::CACHE_KEY_THERA_CONNECTIONS, $connectionsData, $ttl);
        }

        $f3->expire(Config::ttlLeft($exists, $ttl));

        $this->out($connectionsData);
    }

    /**
     * get Thera connections data from EveScout API
     * -> map response to Pathfinder format
     * @return array
     */
    protected function getEveScoutTheraConnections() : array {
        $connectionsData = [];

        /**
         * map system data from eveScout response to Pathfinder´s 'system' format
         * @param string $key
         * @param array  $eveScoutConnection
         * @param array  $connectionData
         */
        $enrichWithSystemData = function(string $key, array $eveScoutConnection, array &$connectionData) : void {
            $eveScoutSystem = (array)$eveScoutConnection[$key];
            $systemData = [
                'id' => (int)$eveScoutSystem['id'],
                'name' => (string)$eveScoutSystem['name'],
                'trueSec' => round((float)$eveScoutSystem['security'], 4)
            ];
            if(!empty($eveScoutSystem['constellationID'])){
                $systemData['constellation'] = ['id' => (int)$eveScoutSystem['constellationID']];
            }
            if(!empty($region = (array)$eveScoutSystem['region']) && !empty($region['id'])){
                $systemData['region'] = ['id' => (int)$region['id'], 'name' => (string)$region['name']];
            }
            $connectionData[$key] = $systemData;
        };

        /**
         * @param string $key
         * @param array  $eveScoutConnection
         * @param array  $connectionData
         */
        $enrichWithSignatureData = function(string $key, array $eveScoutConnection, array &$connectionData) : void {
            $eveScoutSignature = (array)$eveScoutConnection[$key];
            $signatureData = [
                'name' => $eveScoutSignature['name'] ? : null
            ];
            if(!empty($sigType = (array)$eveScoutSignature['type']) && !empty($sigType['name'])){
                $signatureData['type'] = ['name' => strtoupper((string)$sigType['name'])];
            }
            $connectionData[$key] = $signatureData;
        };

        /**
         * map wormhole data from eveScout to Pathfinder´s connection format
         * @param array $wormholeData
         * @param array $connectionsData
         */
        $enrichWithWormholeData = function(array $wormholeData, array &$connectionsData) : void {
            $type = [];
            if($wormholeData['mass'] === 'reduced'){
                $type[] = 'wh_reduced';
            }else if($wormholeData['mass'] === 'critical'){
                $type[] = 'wh_critical';
            }else{
                $type[] = 'wh_fresh';
            }

            if($wormholeData['eol'] === 'critical'){
                $type[] = 'wh_eol';
            }
            $connectionsData['type'] = $type;
            $connectionsData['estimatedEol'] = $wormholeData['estimatedEol'];
        };

        $eveScoutResponse = $this->getF3()->eveScoutClient()->send('getTheraConnections');
        if(!empty($eveScoutResponse) && !isset($eveScoutResponse['error'])){
            foreach((array)$eveScoutResponse['connections'] as $eveScoutConnection){
                if(
                    $eveScoutConnection['type'] === 'wormhole' &&
                    isset($eveScoutConnection['source']) && isset($eveScoutConnection['target'])
                ){
                    try{
                        $data = [
                            'id' => (int)$eveScoutConnection['id'],
                            'scope' => 'wh',
                            'created' => [
                                'created' => (new \DateTime($eveScoutConnection['created']))->getTimestamp(),
                                'character' => (array)$eveScoutConnection['character']
                            ],
                            'updated' => (new \DateTime($eveScoutConnection['updated']))->getTimestamp()
                        ];
                        $enrichWithWormholeData((array)$eveScoutConnection['wormhole'], $data);
                        $enrichWithSystemData('source', $eveScoutConnection, $data);
                        $enrichWithSystemData('target', $eveScoutConnection, $data);
                        $enrichWithSignatureData('sourceSignature', $eveScoutConnection, $data);
                        $enrichWithSignatureData('targetSignature', $eveScoutConnection, $data);
                        $connectionsData[] = $data;
                    }catch(\Exception $e){
                        // new \DateTime Exception -> skip this data
                    }
                }
            }
        }

        return $connectionsData;
    }
}