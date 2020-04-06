<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 17.11.2018
 * Time: 10:13
 */

namespace Exodus4D\Pathfinder\Lib\Logging\Handler;


class DiscordRallyWebhookHandler extends AbstractRallyWebhookHandler {

    /**
     * @param $html
     * @return string
     */
    protected function htmlToMarkdown($html){
        $markdown = parent::htmlToMarkdown($html);
        // Discord supports syntax highlighting for MarkDown
        $markdown = 'Markdown' . "\n" . $markdown;
        return $markdown;
    }
}