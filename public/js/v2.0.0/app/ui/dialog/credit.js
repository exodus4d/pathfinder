/**
 *  credits dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox'
], ($, Init, Util, bootbox) => {
    'use strict';

    let config = {
        creditsDialogClass: 'pf-credits-dialog'
    };

    /**
     * show jump info dialog
     */
    $.fn.showCreditsDialog = function(){
        requirejs(['text!templates/dialog/credit.html', 'mustache'], (template, Mustache) => {
            let data = {
                version: Util.getVersion(),
                imgSrcBackground: `${Util.imgRoot()}header/pf-header-780.webp`,
                imgSrcPatreon: `${Util.imgRoot()}misc/donate_patreon.png`,
                imgSrcPaypal: `${Util.imgRoot()}misc/donate_paypal.png`,
            };

            let content = Mustache.render(template, data);

            bootbox.dialog({
                className: config.creditsDialogClass,
                title: 'Licence',
                message: content
            });
        });
    };
});