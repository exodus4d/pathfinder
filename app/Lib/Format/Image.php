<?php


namespace Exodus4D\Pathfinder\Lib\Format;


use Exodus4D\Pathfinder\Lib\Config;

class Image extends \Prefab {

    /**
     * default image parameter for CCPs image server
     * @see https://developers.eveonline.com/blog/article/from-image-server-to-a-whole-new-image-service-1
     */
    const DEFAULT_EVE_SRC_CONFIG = [
        'alliances' => [
            'variant' => 'logo',
            'size' => 64                // 64 is less 'blurry' with CSS downscale to 32 than native 32
        ],
        'corporations' => [
            'variant' => 'logo',
            'size' => 64                // 64 is less 'blurry' with CSS downscale to 32 than native 32
        ],
        'characters' => [
            'variant' => 'portrait',
            'size' => 32                // 32 is fine here, no visual difference to 64
        ],
        'types' => [
            'variant' => 'icon',        // 'render' also works, 64px size is max for 'icon'
            'size' => 64                // 64 is less 'blurry' with CSS downscale to 32 than native 32
        ]
    ];

    /**
     * build image server src URL
     * @param string $resourceType
     * @param int $resourceId
     * @param int|null $size
     * @param string|null $resourceVariant
     * @return string|null
     */
    public function eveSrcUrl(string $resourceType, int $resourceId, ?int $size = null, ?string $resourceVariant = null) : ?string {
        $url = null;
        if(
            $resourceId &&
            ($serviceUrl = rtrim(Config::getPathfinderData('api.ccp_image_server'), '/')) &&
            ($defaults = static::DEFAULT_EVE_SRC_CONFIG[$resourceType])
        ){
            $parts = [$serviceUrl, $resourceType, $resourceId, $resourceVariant ? : $defaults['variant']];
            $url = implode('/', $parts);

            $params = ['size' => $size ? : $defaults['size']];
            $url .= '?' . http_build_query($params);
        }

        return $url;
    }
}