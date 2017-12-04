<?php
/**
 * Created by PhpStorm.
 * User: exodu
 * Date: 10.09.2017
 * Time: 20:52
 */

namespace lib\logging\handler;

use lib\Util;

class SlackMapWebhookHandler extends AbstractSlackWebhookHandler {

    /**
     * @param array $record
     * @return array
     * @throws \Exception\PathfinderException
     */
    protected function getSlackData(array $record) : array{
        $postData = parent::getSlackData($record);

        $tag        = (string)$record['context']['tag'];
        $timestamp  = (int)$record['datetime']->getTimestamp();
        $text       = '';

        if (
            $this->useAttachment &&
            !empty( $attachmentsData = $record['context']['data'])
        ) {

            // convert non grouped data (associative array) to multi dimensional (sequential) array
            // -> see "group" records
            $attachmentsData = Util::is_assoc($attachmentsData) ? [$attachmentsData] : $attachmentsData;

            $thumbData = (array)$record['extra']['thumb'];

            $postData['attachments'] = [];

            foreach($attachmentsData as $attachmentData){
                $channelData        = (array)$attachmentData['channel'];
                $characterData      = (array)$attachmentData['character'];
                $formatted          = (string)$attachmentData['formatted'];

                // get "message" from $formatted
                $msgParts = explode('|', $formatted, 2);

                // build main text from first Attachment (they belong to same channel)
                if(!empty($channelData)){
                    $text = "*Map '" . $channelData['channelName'] . "'* _#" . $channelData['channelId']  . "_ *changed*";
                }

                $attachment = [
                    'title'         => !empty($msgParts[0]) ? $msgParts[0] : 'No Title',
                    //'pretext'     => '',
                    'text'          => !empty($msgParts[1]) ? sprintf('```%s```', $msgParts[1]) : '',
                    'fallback'      => !empty($msgParts[1]) ? $msgParts[1] : 'No Fallback',
                    'color'         => $this->getAttachmentColor($tag),
                    'fields'        => [],
                    'mrkdwn_in'     => ['fields', 'text'],
                    'footer'        => 'Pathfinder API',
                    //'footer_icon'=> '',
                    'ts'            => $timestamp
                ];

                $attachment = $this->setAuthor($attachment, $characterData);
                $attachment = $this->setThumb($attachment, $thumbData);


                // set 'field' array ----------------------------------------------------------------------------------
                if ($this->includeExtra) {
                    $attachment['fields'][] = $this->generateAttachmentField('', 'Meta data:', false, false);

                    if(!empty($record['extra']['path'])){
                        $attachment['fields'][] = $this->generateAttachmentField('Path', $record['extra']['path'], true);
                    }

                    if(!empty($tag)){
                        $attachment['fields'][] = $this->generateAttachmentField('Tag', $tag, true);
                    }

                    if(!empty($record['level_name'])){
                        $attachment['fields'][] = $this->generateAttachmentField('Level', $record['level_name'], true);
                    }

                    if(!empty($record['extra']['ip'])){
                        $attachment['fields'][] = $this->generateAttachmentField('IP', $record['extra']['ip'], true);
                    }
                }

                $postData['attachments'][] = $attachment;
            }
        }

        $postData['text'] = empty($text) ? $postData['text']  : $text;


        return $postData;
    }


}