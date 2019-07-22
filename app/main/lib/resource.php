<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 08.09.2018
 * Time: 10:58
 */

namespace lib;


class Resource extends \Prefab {

    /**
     * default link "rel" attribute
     * @link https://w3c.github.io/preload/#x2.link-type-preload
     */
    const ATTR_REL = 'preload';

    /**
     * default link "as" attributes
     */
    const ATTR_AS = [
        'style'     => 'style',
        'script'    => 'script',
        'font'      => 'font',
        'document'  => 'document',
        'image'     => 'image'
    ];

    /**
     * default link "type" attributes
     */
    const ATTR_TYPE = [
        'font'      => 'font/woff2'
    ];

    /**
     * default additional attributes by $group
     */
    const ATTR_ADD = [
        'font'      => ['crossorigin' => 'anonymous']
    ];

    /**
     * absolute file path -> use setOption() for update
     * @var array
     */
    private $filePath = [
        'style'     => '',
        'script'    => '',
        'font'      => '',
        'document'  => '',
        'image'     => ''
    ];

    /**
     * default file extensions by $group
     * -> used if no fileExtension found in $file
     * @var array
     */
    private $fileExt = [
        'style'     => 'css',
        'script'    => 'js',
        'document'  => 'html',
        'font'      => 'woff2'
    ];

    /**
     * output type
     * -> 'inline'  -> render inline HTML <link> tags
     * -> 'header'  -> send "Link" HTTP Header with request
     * @see buildLinks()
     * @see buildHeader()
     * @var string
     */
    private $output = 'inline';

    /**
     * resource file cache
     * @var array
     */
    private $resources = [];

    /**
     * set option
     * @param string $option
     * @param $value
     */
    public function setOption(string $option, $value){
        $this->$option = $value;
    }

    /**
     * get option
     * @param string $option
     * @return mixed|null
     */
    public function getOption(string $option){
        return isset($this->$option) ? $this->$option : null;
    }

    /**
     * register new resource $file
     * @param string $group
     * @param string $file
     * @param string $rel
     */
    public function register(string $group, string $file, string $rel = self::ATTR_REL){
        $this->resources[$group][$file] = ['options' => ['rel' => $rel]];
    }

    /**
     * get resource path/file.ext
     * @param string $group
     * @param string $file
     * @return string
     */
    public function getLink(string $group, string $file) : string {
        $link = $this->getPath($group) . '/' . $file;
        // add extension if not already part of the file
        // -> allows switching between extensions (e.g. .jpg, .png) for the same image
        $link .= empty(pathinfo($file, PATHINFO_EXTENSION)) ? '.' . $this->getFileExtension($group) : '';
        return $link;
    }

    /**
     * get resource path
     * @param string $group
     * @return string
     */
    public function getPath(string $group) : string {
        return $this->filePath[$group];
    }

    /**
     * build inline HTML <link> tags for resources
     * @return string
     */
    public function buildLinks(){
        $this->build();
        $links = [];
        foreach($this->resources as $group => $resources){
            foreach($resources as $file => $conf){
                $resourceHeader = '<link';
                foreach($conf['options'] as $attr => $value){
                    $resourceHeader .= ' ' . $attr . '="' . $value . '"';
                    // insert href attr after rel attr -> better readability
                    if($attr == 'rel'){
                        $resourceHeader .= ' href="' . $conf['link'] . '"';
                    }
                }
                $links[] = $resourceHeader . '>';
            }
        }
        return "\n\t" . implode("\n\t", $links);
    }

    /**
     * build HTTP header for resource preload
     * -> all registered resources combined in a single header
     * @link https://www.nginx.com/blog/nginx-1-13-9-http2-server-push/#automatic-push
     * @return string
     */
    public function buildHeader() : string {
        $this->build();
        $headers = [];
        foreach($this->resources as $group => $resources){
            foreach($resources as $file => $conf){
                $resourceHeader = '<' . $conf['link'] . '>';
                foreach($conf['options'] as $attr => $value){
                    $resourceHeader .= '; ' . $attr . '="' . $value . '"';
                }
                $headers[] = $resourceHeader;
            }
        }
        return 'Link: ' . implode(', ', $headers);
    }

    /**
     * build resource data
     * -> add missing attributes to resources
     */
    protected function build(){
        foreach($this->resources as $group => &$resources){
            foreach($resources as $file => &$conf){
                if(empty($conf['link'])){
                    $conf['link'] = $this->getLink($group, $file);
                }

                if( empty($conf['options']['rel']) ){
                    $conf['options']['rel'] = self::ATTR_REL;
                }
                if( empty($conf['options']['as']) ){
                    $conf['options']['as'] = $group;
                }
                if( empty($conf['options']['type']) && !empty($attrType = $this->getLinkAttrType($group)) ){
                    $conf['options']['type'] = $attrType;
                }

                if( !empty($additionalAttr = $this->getAdditionalAttrs($group)) ){
                    $conf['options'] = $conf['options'] + $additionalAttr;
                }
            }
            unset($options); // unset ref
        }
        unset($resources);  // unset ref
    }

    /**
     * get 'as' attribute (potential destination) by resource $group
     * @link https://w3c.github.io/preload/#as-attribute
     * @param string $group
     * @return string
     */
    protected function getLinkAttrAs(string $group) : string {
        return isset(self::ATTR_AS[$group]) ? self::ATTR_AS[$group] : '';
    }

    /**
     * get 'type' attribute by resource $group
     * @link https://w3c.github.io/preload/#early-fetch-of-critical-resources
     * @param string $group
     * @return string
     */
    protected function getLinkAttrType(string $group) : string {
        return isset(self::ATTR_TYPE[$group]) ? self::ATTR_TYPE[$group] : '';
    }

    /**
     * get additional attributes by $group
     * -> e.g. or fonts
     * @param string $group
     * @return array
     */
    protected function getAdditionalAttrs(string $group) : array {
        return isset(self::ATTR_ADD[$group]) ? self::ATTR_ADD[$group] : [];
    }

    protected function getFileExtension(string $group) : string {
        return isset($this->fileExt[$group]) ? $this->fileExt[$group] : '';
    }
}