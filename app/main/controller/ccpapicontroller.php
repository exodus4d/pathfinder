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
            'user_agent' => $this->getUserAgent(),
            'follow_location' => false // otherwise CURLOPT_FOLLOWLOCATION will fail
        ];

        return $requestOptions;
    }

    /**
     * request character information from CCP API
     * @param $keyID
     * @param $vCode
     * @return bool|\SimpleXMLElement
     */
    public function requestCharacters($keyID, $vCode){

        $apiPath = $this->f3->get('PATHFINDER.API.CCP_XML') . '/account/APIKeyInfo.xml.aspx';

        $xml = false;

        // build request URL
        $options = $this->getRequestOptions();
        $options['content'] = http_build_query( [
            'keyID' => $keyID,
            'vCode' => $vCode
        ]);

        $apiResponse = \Web::instance()->request($apiPath, $options );

        if($apiResponse['body']){
            $xml = simplexml_load_string($apiResponse['body']);
        }

        return $xml;
    }

    /**
     * update all character information for a given apiModel
     * @param $userApiModel
     * @return int
     * @throws \Exception
     */
    public function updateCharacters($userApiModel){

        $xml = $this->requestCharacters($userApiModel->keyId, $userApiModel->vCode);

        $characterCount = 0;

        // important -> user API model must be up2date
        // if not -> matched userCharacter cant be found
        $userApiModel->getById($userApiModel->id, 0);

        if($xml){
            // request successful
            $rowApiData = $xml->result->key->rowset;

            if(
                is_object($rowApiData) &&
                $rowApiData->children()
            ){
                $characterModel = Model\BasicModel::getNew('CharacterModel');
                $corporationModel = Model\BasicModel::getNew('CorporationModel');
                $allianceModel = Model\BasicModel::getNew('AllianceModel');

                foreach($rowApiData->children() as $characterApiData){
                    // map attributes to array
                    $attributeData = current( $characterApiData->attributes() );

                    $newCharacter = true;

                    $characterId = (int)$attributeData['characterID'];
                    $characterModel->getById($characterId, 0);

                    $corporationModelTemp = null;
                    $allianceModelTemp = null;

                    // check if corporation already exists
                    if($attributeData['corporationID'] > 0){
                        $corporationModel->getById($attributeData['corporationID'], 0);
                        if( $corporationModel->dry() ){
                            $corporationModel->id = $attributeData['corporationID'];
                            $corporationModel->name = $attributeData['corporationName'];
                            $corporationModel->save();
                        }
                        $corporationModelTemp = $corporationModel;
                    }

                    // check if alliance already exists
                    if($attributeData['allianceID'] > 0){
                        $allianceModel->getById($attributeData['allianceID'], 0);
                        if( $allianceModel->dry() ){
                            $allianceModel->id = $attributeData['allianceID'];
                            $allianceModel->name = $attributeData['allianceName'];
                            $allianceModel->save();
                        }
                        $allianceModelTemp = $allianceModel;
                    }

                    if($userApiModel->userCharacters){
                        $userApiModel->userCharacters->rewind();
                        while($userApiModel->userCharacters->valid()){
                            $tempCharacterModel = $userApiModel->userCharacters->current()->getCharacter();

                            // character already exists -> update
                            if($tempCharacterModel->id == $characterId){
                                $characterModel = $tempCharacterModel;

                                // unset userCharacter -> all leftover models are no longer part of this API
                                // --> delete leftover models at the end
                                $userApiModel->userCharacters->offsetUnset($userApiModel->userCharacters->key());

                                $newCharacter = false;
                                break;
                            }else{
                                $userApiModel->userCharacters->next();
                            }
                        }
                        $userApiModel->userCharacters->rewind();
                    }

                    $characterModel->id = $characterId;
                    $characterModel->name = $attributeData['characterName'];
                    $characterModel->corporationId = $corporationModelTemp;
                    $characterModel->allianceId = $allianceModelTemp;
                    $characterModel->factionId = $attributeData['factionID'];
                    $characterModel->factionName = $attributeData['factionName'];
                    $characterModel->save();

                    if($newCharacter){
                        // new character for this API
                        $userCharactersModel = Model\BasicModel::getNew('UserCharacterModel', 0);
                        $userCharactersModel->userId = $userApiModel->userId;
                        $userCharactersModel->apiId = $userApiModel;
                        $userCharactersModel->characterId = $characterModel;
                        $userCharactersModel->save();
                    }

                    $corporationModel->reset();
                    $allianceModel->reset();
                    $characterModel->reset();

                    $characterCount++;
                }
            }

            // delete leftover userCharacters from this API
            if(count($userApiModel->userCharacters) > 0){
                while($userApiModel->userCharacters->valid()){
                    $userApiModel->userCharacters->current()->erase();
                    $userApiModel->userCharacters->next();
                }
            }

        }

        return $characterCount;
    }

} 