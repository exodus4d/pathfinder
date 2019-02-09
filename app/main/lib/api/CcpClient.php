<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 26.12.2018
 * Time: 17:43
 */

namespace lib\api;

use lib\Config;
use Exodus4D\ESI\Client\ESI as Client;
use Exodus4D\ESI\Client\ApiInterface;
use Exodus4D\ESI\Client\EsiInterface;


/**
 * Class CcpClient
 * @package lib\api
 *
 * @method EsiInterface getServerStatus()
 * @method EsiInterface getStatusForRoutes(string $version)
 */
class CcpClient extends AbstractClient {

    /**
     * @var string
     */
    const CLIENT_NAME = 'ccpClient';

    /**
     * @param \Base $f3
     * @return ApiInterface|null
     */
    protected function getClient(\Base $f3) : ?ApiInterface {
        $client = null;
        if(class_exists(Client::class)){
            $client = new Client(Config::getEnvironmentData('CCP_ESI_URL'));
            $client->setDataSource(Config::getEnvironmentData('CCP_ESI_DATASOURCE'));
        }else{
            $this->getLogger()->write($this->getMissingClassError(Client::class));
        }

        return $client;
    }
}