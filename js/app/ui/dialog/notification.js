/**
 *  notification dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/ccp',
    'app/render',
    'bootbox'
], function($, Init, Util, CCP, Render, bootbox) {

    'use strict';

    var config = {

        // shutdown dialog
        notificationDialogId: 'pf-notification-dialog',                                 // id for "notification" dialog
        notificationDialogClass: 'pf-notification-dialog'                               // class for "notification" dialog
    };

    /**
     * show/animate dialog page content
     * @param pageElement
     */
    var showPageContent = function(dialog){

        var headlineElement = dialog.find('h1');

        // don´t show animation in IGB
        if( !CCP.isInGameBrowser() ){
            headlineElement.delay(300).velocity('transition.shrinkIn', {
                duration: 500
            }).delay(800)

            headlineElement.velocity({
                scale: 1.05
            }, {
                duration: 600,
                loop: 5
            });
        }else{
            headlineElement.css({opacity: 1});
        }

    };

    /**
     * show "notification" dialog
     * @param dialogData
     */
    $.fn.showNotificationDialog = function(dialogData){

        // check if there is already a notification dialog open
        var notificationDialogClassDialoges = $('.' + config.notificationDialogClass);

        if(notificationDialogClassDialoges.length === 0){

            // close all modals
            $('.modal').modal('hide');

            requirejs(['text!templates/dialog/notification.html', 'mustache'], function(template, Mustache) {

                var data = {
                    id: config.notificationDialogId,
                    content: dialogData.content
                };

                var content = Mustache.render(template, data);

                // show dialog
                var shutdownDialog = bootbox.dialog({
                    title: dialogData.content.title,
                    message: content,
                    className: config.notificationDialogClass,
                    buttons: dialogData.buttons
                });


                shutdownDialog.on('shown.bs.modal', function(e) {
                    // remove close button
                    var dialog = $(this);

                    dialog.find('.bootbox-close-button').remove();
                    dialog.find('button').blur();

                    // show error message
                    showPageContent(dialog);
                });
            });
        }
    };


});