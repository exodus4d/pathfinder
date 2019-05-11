<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 22.09.2017
 * Time: 20:08
 */

namespace lib\logging\handler;

use lib\Config;
use Monolog\Handler;
use Monolog\Logger;

abstract class AbstractWebhookHandler extends Handler\AbstractProcessingHandler {

    /**
     * @var string
     */
    private $webhookUrl;

    /**
     * Slack channel (encoded ID or name)
     * @var string|null
     */
    private $channel;

    /**
     * Name of a bot
     * @var string|null
     */
    private $username;

    /**
     * User icon e.g. 'ghost', 'http://example.com/user.png'
     * @var string
     */
    private $userIcon;

    /**
     * Whether the message should be added to Slack as attachment (plain text otherwise)
     * @var bool
     */
    protected $useAttachment;

    /**
     * Whether the attachment should include context
     * @var bool
     */
    protected $includeContext;

    /**
     * Whether the attachment should include extra
     * @var bool
     */
    protected $includeExtra;

    /**
     * Dot separated list of fields to exclude from slack message. E.g. ['context.field1', 'extra.field2']
     * @var array
     */
    private $excludeFields;

    /**
     * Max attachment count per message (20 is max)
     * @var int
     */
    private $maxAttachments = 15;

    /**
     * @param  string      $webhookUrl             Slack Webhook URL
     * @param  string|null $channel                Slack channel (encoded ID or name)
     * @param  string|null $username               Name of a bot
     * @param  bool        $useAttachment          Whether the message should be added to Slack as attachment (plain text otherwise)
     * @param  string|null $iconEmoji              The emoji name to use (or null)
     * @param  bool        $includeContext         Whether the context data added to Slack as attachments are in a short style
     * @param  bool        $includeExtra           Whether the extra data added to Slack as attachments are in a short style
     * @param  int         $level                  The minimum logging level at which this handler will be triggered
     * @param  bool        $bubble                 Whether the messages that are handled can bubble up the stack or not
     * @param  array       $excludeFields          Dot separated list of fields to exclude from slack message. E.g. ['context.field1', 'extra.field2']
     */
    public function __construct($webhookUrl, $channel = null, $username = null, $useAttachment = true, $iconEmoji = null, $includeContext = true, $includeExtra = false, $level = Logger::CRITICAL, $bubble = true, array $excludeFields = []){
        $this->webhookUrl = $webhookUrl;
        $this->channel = $channel;
        $this->username = $username;
        $this->userIcon = trim($iconEmoji, ':');
        $this->useAttachment = $useAttachment;
        $this->includeContext = $includeContext;
        $this->includeExtra = $includeExtra;
        $this->excludeFields = $excludeFields;

        parent::__construct($level, $bubble);

    }

    /**
     * format
     * @param array $record
     * @return array
     */
    protected function getSlackData(array $record): array {
        $postData = [];

        if ($this->username) {
            $postData['username'] = $this->username;
        }

        if ($this->channel) {
            $postData['channel'] = $this->channel;
        }

        $postData['text'] = (string)$record['message'];

        if ($this->userIcon) {
            if (filter_var($this->userIcon, FILTER_VALIDATE_URL)) {
                $postData['icon_url'] = $this->userIcon;
            } else {
                $postData['icon_emoji'] = ":{$this->userIcon}:";
            }
        }

        return $postData;
    }

    /**
     * {@inheritdoc}
     *
     * @param array $record
     */
    protected function write(array $record){
        $record = $this->excludeFields($record);

        $postData = $this->getSlackData($record);

        $postData = $this->cleanAttachments($postData);

        $postString = json_encode($postData);

        $ch = curl_init();
        $options = [
            CURLOPT_URL => $this->webhookUrl,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => $postString
        ];
        if (defined('CURLOPT_SAFE_UPLOAD')) {
            $options[CURLOPT_SAFE_UPLOAD] = true;
        }

        curl_setopt_array($ch, $options);

        Handler\Curl\Util::execute($ch);
    }

    /**
     * @param array $postData
     * @return array
     */
    protected function cleanAttachments(array $postData): array{
        $attachmentCount = count($postData['attachments']);
        if( $attachmentCount > $this->maxAttachments){
            $text = 'To many attachments! ' . ($attachmentCount - $this->maxAttachments) . ' of ' . $attachmentCount . ' attachments not visible';
            $postData['attachments'] = array_slice($postData['attachments'], 0, $this->maxAttachments);

            $attachment = [
                'title'          => $text,
                'fallback'      => $text,
                'color'         => $this->getAttachmentColor('information')
            ];

            $postData['attachments'][] = $attachment;
        }

        return $postData;
    }

    /**
     * @param array $attachment
     * @param array $characterData
     * @return array
     */
    protected function setAuthor(array $attachment, array $characterData): array {
        if( !empty($characterData['id']) &&  !empty($characterData['name'])){
            $attachment['author_name'] = $characterData['name'] . ' #' . $characterData['id'];
            $attachment['author_link'] = Config::getPathfinderData('api.z_killboard') . '/character/' . $characterData['id'] . '/';
            $attachment['author_icon'] = Config::getPathfinderData('api.ccp_image_server') . '/Character/' . $characterData['id'] . '_32.jpg';
        }

        return $attachment;
    }

    /**
     * @param array $attachment
     * @param array $thumbData
     * @return array
     */
    protected function setThumb(array $attachment, array $thumbData): array {
        if( !empty($thumbData['url'])) {
            $attachment['thumb_url'] = $thumbData['url'];
        }

        return $attachment;
    }

    /**
     * @param $title
     * @param $value
     * @param bool $format
     * @param bool $short
     * @return array
     */
    protected function generateAttachmentField($title, $value, $format = false, $short = true){
        return [
            'title' => $title,
            'value' => !empty($value) ? ( $format ? sprintf('`%s`', $value) : $value ) : '',
            'short' => $short
        ];
    }

    /**
     * @param string $tag
     * @return string
     */
    protected function getAttachmentColor(string $tag): string {
        switch($tag){
            case 'information': $color = '#428bca'; break;
            case 'success':     $color = '#4f9e4f'; break;
            case 'warning':     $color = '#e28a0d'; break;
            case 'danger':      $color = '#a52521'; break;
            default: $color = '#313335'; break;
        }
        return $color;
    }

    /**
     * Get a copy of record with fields excluded according to $this->excludeFields
     * @param array $record
     * @return array
     */
    private function excludeFields(array $record){
        foreach($this->excludeFields as $field){
            $keys = explode('.', $field);
            $node = &$record;
            $lastKey = end($keys);
            foreach($keys as $key){
                if(!isset($node[$key])){
                    break;
                }
                if($lastKey === $key){
                    unset($node[$key]);
                    break;
                }
                $node = &$node[$key];
            }
        }

        return $record;
    }
}