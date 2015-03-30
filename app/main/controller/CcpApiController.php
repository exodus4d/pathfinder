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
     * array with all user models
     * that will be taken into account by this controller
     * @var
     */
    protected $users = [];

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
     * get API models for this controller
     * @return array
     */
    protected function _getApiModels(){

        $apiModels = [];
        foreach($this->users as $user){
            $tempApiModels = $user->getAPIs();

            foreach($tempApiModels as $apiModel){
                array_push($apiModels, $apiModel);
            }
        }
        return $apiModels;
    }

    /**
     * add a user model for this controller
     * @param $user
     */
    public function addUser($user){
        if($user){
            array_push($this->users, $user);
        }
    }

    /**
     * update all character data for this controller
     */
    public function updateCharacterData(){

        $apiPath = $this->f3->get('api_path.CCP_XML') . '/account/APIKeyInfo.xml.aspx';

        $characterModel = Model\BasicModel::getNew('UserCharacterModel');

        $apiModels = $this->_getApiModels();
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

                // deactivate all chars in case one of them is removed from this API
                $currentCharacterModels = $apiModel->getCharacters();

                foreach($currentCharacterModels as $currentCharacterModel){
                    $currentCharacterModel->setActive(false);
                    $currentCharacterModel->save();
                };

                if($rowApiData->children()){
                    foreach($rowApiData->children() as $characterApiData){
                        // map attributes to array
                        $attributeData = current( $characterApiData->attributes() );

                        // check if record exist -> search
                        // load active = 0 records as well! (they have been de-activated before)
                        $characterModel->load(array(
                            'userId = :userId AND characterId = :characterId',
                            ':userId' => $apiModel->userId->id,
                            ':characterId' => $attributeData['characterID']
                        ));

                        $characterModel->setActive(true);
                        $characterModel->userId = $apiModel->userId;
                        $characterModel->apiId = $apiModel;
                        $characterModel->characterId = $attributeData['characterID'];
                        $characterModel->characterName = $attributeData['characterName'];
                        $characterModel->corporationId = $attributeData['corporationID'];
                        $characterModel->corporationName = $attributeData['corporationName'];
                        $characterModel->allianceId = $attributeData['allianceID'];
                        $characterModel->allianceName = $attributeData['allianceName'];
                        $characterModel->factionId = $attributeData['factionID'];
                        $characterModel->factionName = $attributeData['factionName'];
                        $characterModel->save();

                        $characterModel->reset();
                    }
                }

            }else{
                print_r( 'ERROR FUFU');

                var_dump($apiResponse);
            }
        }

    }
} 