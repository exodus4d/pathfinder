/**
 *  credits dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox',
    'layout/logo'
], ($, Init, Util, bootbox) => {
    'use strict';

    let config = {
        // jump info dialog
        creditsDialogClass: 'pf-credits-dialog',                                // class for credits dialog
        creditsDialogLogoContainerId: 'pf-logo-container'                       // id for logo element
    };

    /**
     * show jump info dialog
     */
    $.fn.showCreditsDialog = function(callback, enableHover){

        requirejs(['text!templates/dialog/credit.html', 'mustache'], (template, Mustache) => {

            let data = {
                logoContainerId: config.creditsDialogLogoContainerId,
                version: Util.getVersion()
            };

            let content = Mustache.render(template, data);

            let creditDialog = bootbox.dialog({
                className: config.creditsDialogClass,
                title: 'Licence',
                message: content
            });

            // after modal is shown =======================================================================
            creditDialog.on('shown.bs.modal', function(e){

                // load Logo svg
                creditDialog.find('#' + config.creditsDialogLogoContainerId).drawLogo(callback, enableHover);
            });

        });

    };
});