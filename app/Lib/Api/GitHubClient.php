<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 29.01.2019
 * Time: 22:23
 */

namespace Exodus4D\Pathfinder\Lib\Api;

use Exodus4D\Pathfinder\Lib\Config;
use Exodus4D\ESI\Client\ApiInterface;
use Exodus4D\ESI\Client\GitHub\GitHub as Client;

/**
 * Class GitHubClient
 * @package lib\api
 *
 * @method ApiInterface send(string $requestHandler, ...$handlerParams)
 * @method ApiInterface sendBatch(array $configs)
 */
class GitHubClient extends AbstractClient {

    /**
     * @var string
     */
    const CLIENT_NAME = 'gitHubClient';

    /**
     * @param \Base $f3
     * @return ApiInterface|null
     */
    protected function getClient(\Base $f3) : ?ApiInterface {
        $client = null;
        if(class_exists(Client::class)){
            $client = new Client(Config::getPathfinderData('api.git_hub'));
        }else{
            $this->getLogger()->write($this->getMissingClassError(Client::class));
        }

        return $client;
    }
}