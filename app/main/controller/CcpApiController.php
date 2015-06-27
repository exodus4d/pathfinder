<?php
/**
 * Created by PhpStorm.
 * User: exodus4d
 * Date: 28.03.15
 * Time: 17:01
 */

namespace Controller;
use Model;

/**
 * CCP API controller
 * Class CcpApiController
 * @package Controller
 */
class CcpApiController extends Controller{

    /**
     * get a custom userAgent string for API calls
     * (recommended by CCP)
     * @return string
     */
    protected function getUserAgent(){
        $userAgent = '';

        $userAgent .= $this->f3->get('PATHFINDER.NAME');
        $userAgent .=  ' - ' . $this->f3->get('PATHFINDER.VERSION');
        $userAgent .=  ' | ' . $this->f3->get('PATHFINDER.CONTACT');
        $userAgent .=  ' (' . $_SERVER['SERVER_NAME'] . ')';

        return $userAgent;
    }

    /**
     * get HTTP request options for API (curl) request
     * @return array
     */
    protected function getRequestOptions(){
        $requestOptions = [
            'timeout' => 8,
            'method' => 'POST',
            'user_agent' => $this->getUserAgent()
        ];

        return $requestOptions;
    }

    /**
     * request Character data for given api models
     * @param $apiModels
     * @return array
     */
    public function getCharacters($apiModels){

        $apiPath = $this->f3->get('api_path.CCP_XML') . '/account/APIKeyInfo.xml.aspx';

        $characters = [];
        foreach($apiModels as $apiModel){
            // build request URL
            $options = $this->getRequestOptions();
            $options['content'] = http_build_query( [
                'keyID' => $apiModel->keyId,
                'vCode' => $apiModel->vCode
            ]);

            $apiResponse = \Web::instance()->request($apiPath, $options );

            if($apiResponse['body']){
                $xml = simplexml_load_string($apiResponse['body']);
                $rowApiData = $xml->result->key->rowset;
                // request successful --------------------------------------------

                if($rowApiData->children()){
                    $characterModel = Model\BasicModel::getNew('CharacterModel');
                    $corporationModel = Model\BasicModel::getNew('CorporationModel');
                    $allianceModel = Model\BasicModel::getNew('AllianceModel');

                    foreach($rowApiData->children() as $characterApiData){

                        // map attributes to array
                        $attributeData = current( $characterApiData->attributes() );

                        $corporationModelTemp = null;
                        $allianceModelTemp = null;

                        // check if corporation already exists
                        if($attributeData['corporationID'] > 0){
                            $corporationModel->getById($attributeData['corporationID']);
                            if( $corporationModel->dry() ){
                                $corporationModel->id = $attributeData['corporationID'];
                                $corporationModel->name = $attributeData['corporationName'];
                                $corporationModel->save();
                            }
                            $corporationModelTemp = $corporationModel;
                        }

                        // check if alliance already exists
                        if($attributeData['allianceID'] > 0){
                            $allianceModel->getById($attributeData['allianceID']);
                            if( $allianceModel->dry() ){
                                $allianceModel->id = $attributeData['allianceID'];
                                $allianceModel->name = $attributeData['allianceName'];
                                $allianceModel->save();
                            }
                            $allianceModelTemp = $allianceModel;
                        }

                        // search for existing user character model
                        $userCharacterModel = $apiModel->getUserCharacterById($attributeData['characterID']);
                        if(is_null($userCharacterModel)){
                            $userCharacterModel = Model\BasicModel::getNew('UserCharacterModel');
                        }

                        $characterModel->getById($attributeData['characterID']);

                        $characterModel->id = $attributeData['characterID'];
                        $characterModel->name = $attributeData['characterName'];
                        $characterModel->corporationId = $corporationModelTemp;
                        $characterModel->allianceId = $allianceModelTemp;
                        $characterModel->factionId = $attributeData['factionID'];
                        $characterModel->factionName = $attributeData['factionName'];

                        // save/update character
                        $characterModel->save();

                        // store "temp" character obj until obj is saved for the first time
                        $userCharacterModel->characterId = $characterModel;

                        $characters[] = $userCharacterModel;

                        $corporationModel->reset();
                        $allianceModel->reset();
                        $characterModel->reset();
                    }
                }
            }
        }

        return $characters;
    }


} 