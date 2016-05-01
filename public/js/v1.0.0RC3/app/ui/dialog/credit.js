/**
 *  credits dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'app/ui/logo'
], function($, Init, Util, Render, bootbox) {
    'use strict';

    var config = {
        // jump info dialog
        creditsDialogClass: 'pf-credits-dialog',                                // class for credits dialog
        creditsDialogLogoContainerId: 'pf-logo-container'                       // id for logo element
    };

    /**
     * show jump info dialog
     */
    $.fn.showCreditsDialog = function(callback, enableHover){

        requirejs(['text!templates/dialog/credit.html', 'mustache'], function(template, Mustache) {

            var data = {
                logoContainerId: config.creditsDialogLogoContainerId,
                version: $('body').data('version')
            };

            var content = Mustache.render(template, data);

            var creditDialog = bootbox.dialog({
                className: config.creditsDialogClass,
                title: 'Licence',
                message: content
            });

            // after modal is shown =======================================================================
            creditDialog.on('shown.bs.modal', function(e) {

                // load Logo svg
                creditDialog.find('#' + config.creditsDialogLogoContainerId).drawLogo(callback, enableHover);
            });

        });

    };
});