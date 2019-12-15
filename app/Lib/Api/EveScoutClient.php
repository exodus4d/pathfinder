<?php


namespace Exodus4D\Pathfinder\Lib\Api;

use Exodus4D\Pathfinder\Lib\Config;
use Exodus4D\ESI\Client\ApiInterface;
use Exodus4D\ESI\Client\EveScout\EveScout as Client;
use Exodus4D\ESI\Client\EveScout\EveScoutInterface as ClientInterface;

/**
 * Class EveScoutClient
 * @package lib\api
 *
 * @method ClientInterface getTheraConnections()
 */
class EveScoutClient extends AbstractClient {

    /**
     * @var string
     */
    const CLIENT_NAME = 'eveScoutClient';

    /**
     * @param \Base $f3
     * @return ApiInterface|null
     */
    protected function getClient(\Base $f3) : ?ApiInterface {
        $client = null;
        if(class_exists(Client::class)){
            $client = new Client(Config::getPathfinderData('api.eve_scout'));
        }else{
            $this->getLogger()->write($this->getMissingClassError(Client::class));
        }

        return $client;
    }
}