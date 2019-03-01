<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 26.12.2018
 * Time: 17:39
 */

namespace lib\api;

use lib\Config;
use Exodus4D\ESI\Client\SSO as Client;
use Exodus4D\ESI\Client\ApiInterface;

class SsoClient extends AbstractClient {

    /**
     * @var string
     */
    const CLIENT_NAME = 'ssoClient';

    /**
     * @param \Base $f3
     * @return ApiInterface|null
     */
    protected function getClient(\Base $f3) : ?ApiInterface {
        $client = null;
        if(class_exists(Client::class)){
            $client = new Client(Config::getEnvironmentData('CCP_SSO_URL'));
        }else{
            $this->getLogger()->write($this->getMissingClassError(Client::class));
        }

        return $client;
    }
}