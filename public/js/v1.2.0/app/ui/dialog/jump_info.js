/**
 *  jump info dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
], function($, Init, Util, Render, bootbox) {
    'use strict';

    var config = {
        // jump info dialog
        jumpInfoDialogClass: 'pf-jump-info-dialog'                              // class for jump info dialog
    };

    /**
     * show jump info dialog
     */
    $.fn.showJumpInfoDialog = function(){

        requirejs(['text!templates/dialog/jump_info.html', 'mustache'], function(template, Mustache) {

            var data = {};

            var content = Mustache.render(template, data);

            var signatureReaderDialog = bootbox.dialog({
                className: config.jumpInfoDialogClass,
                title: 'Wormhole jump information',
                message: content
            });

        });

    };
});