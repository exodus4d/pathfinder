<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 17.11.2018
 * Time: 10:09
 */

namespace Exodus4D\Pathfinder\Lib\Logging\Handler;

use League\HTMLToMarkdown\HtmlConverter;
use Exodus4D\Pathfinder\Lib\Util;

abstract class AbstractRallyWebhookHandler extends AbstractWebhookHandler {

    /**
     * @param array $record
     * @return array
     */
    protected function getSlackData(array $record) : array {
        $postData = parent::getSlackData($record);

        $tag        = (string)$record['context']['tag'];
        $timestamp  = (int)$record['datetime']->getTimestamp();
        $text       = '';

        if (
            $this->useAttachment &&
            !empty( $attachmentsData = $record['context']['data'])
        ){
            // convert non grouped data (associative array) to multi dimensional (sequential) array
            // -> see "group" records
            $attachmentsData = Util::is_assoc($attachmentsData) ? [$attachmentsData] : $attachmentsData;

            $thumbData = (array)$record['extra']['thumb'];

            $postData['attachments'] = [];

            foreach($attachmentsData as $attachmentData){
                $characterData      = (array)$attachmentData['character'];

                $text = 'No Title';
                if( !empty($attachmentData['formatted']) ){
                    $text = $attachmentData['formatted'];
                }

                $attachment = [
                    'title'         => !empty($attachmentData['main']['message']) ? 'Message' : '',
                    //'pretext'     => '',
                    'text'          => !empty($attachmentData['main']['message']) ? sprintf('```%s```', $attachmentData['main']['message']) : '',
                    'fallback'      => !empty($attachmentData['main']['message']) ? $attachmentData['main']['message'] : 'No Fallback',
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
                if ($this->includeContext) {
                    if(!empty($objectData = $attachmentData['object'])){
                        if(!empty($objectData['objAlias'])){
                            // System alias
                            $attachment['fields'][] = $this->generateAttachmentField('Alias', $objectData['objAlias']);
                        }

                        if(!empty($objectData['objName'])){
                            // System name
                            $attachment['fields'][] = $this->generateAttachmentField('System', $objectData['objName']);
                        }

                        if(!empty($objectData['objRegion'])){
                            // System region
                            $attachment['fields'][] = $this->generateAttachmentField('Region', $objectData['objRegion']);
                        }

                        if(isset($objectData['objIsWormhole'])){
                            // Is wormhole
                            $attachment['fields'][] = $this->generateAttachmentField('Wormhole', $objectData['objIsWormhole'] ? 'Yes' : 'No');
                        }

                        if(!empty($objectData['objSecurity'])){
                            // System security
                            $attachment['fields'][] = $this->generateAttachmentField('Security', $objectData['objSecurity']);
                        }

                        if(!empty($objectData['objEffect'])){
                            // System effect
                            $attachment['fields'][] = $this->generateAttachmentField('Effect', $objectData['objEffect']);
                        }

                        if(!empty($objectData['objTrueSec'])){
                            // System trueSec
                            $attachment['fields'][] = $this->generateAttachmentField('TrueSec', strval($objectData['objTrueSec']));
                        }

                        if(!empty($objectData['objCountPlanets'])){
                            // System planet count
                            $attachment['fields'][] = $this->generateAttachmentField('Planets', $objectData['objCountPlanets']);
                        }

                        if(!empty($objectData['objDescription'])){
                            // System description
                            $attachment['fields'][] = $this->generateAttachmentField('System description', '```' . $this->htmlToMarkdown($objectData['objDescription']) . '```', false, false);
                        }

                        if(!empty($objectData['objUrl'])){
                            // System deeeplink
                            $attachment['fields'][] = $this->generateAttachmentField('', $objectData['objUrl'] , false, false);
                        }
                    }
                }

                if($this->includeExtra){
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

    /**
     * convert $html into Markdown
     * @param $html
     * @return string
     */
    protected function htmlToMarkdown($html){
        $converter = new HtmlConverter();
        $converter->getConfig()->setOption('strip_tags', true);
        return $converter->convert($html);
    }
}