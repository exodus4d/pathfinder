<?php
/**
 * Created by PhpStorm.
 * User: Exodus 4D
 * Date: 17.11.2018
 * Time: 10:13
 */

namespace lib\logging\handler;


class DiscordRallyWebhookHandler extends AbstractRallyWebhookHandler {

    protected function htmlToMarkdown($html){
        $markdown = parent::htmlToMarkdown($html);
        // Discord supports syntax highlighting for MarkDown
        $markdown = 'Markdown' . "\n" . $markdown;
        return $markdown;
    }
}