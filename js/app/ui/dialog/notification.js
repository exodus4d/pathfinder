/**
 *  notification dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox'
], ($, Init, Util, bootbox) => {

    'use strict';

    let config = {

        // shutdown dialog
        notificationDialogId: 'pf-notification-dialog',                                 // id for "notification" dialog
        notificationDialogClass: 'pf-notification-dialog'                               // class for "notification" dialog
    };

    /**
     * show/animate dialog page content
     * @param dialog
     */
    let showPageContent = function(dialog){
        let headlineElement = dialog.find('h1');

        headlineElement.delay(300).velocity('transition.shrinkIn', {
            duration: 500
        }).delay(800);

        headlineElement.velocity({
            scale: 1.05
        }, {
            duration: 600,
            loop: 5
        });
    };

    /**
     * show "notification" dialog
     * @param dialogData
     */
    $.fn.showNotificationDialog = function(dialogData){

        // check if there is already a notification dialog open
        let notificationDialogClassDialoges = $('.' + config.notificationDialogClass);

        if(notificationDialogClassDialoges.length === 0){

            // close all modals
            $('.modal').modal('hide');

            requirejs(['text!templates/dialog/notification.html', 'mustache'], function(template, Mustache){

                let data = {
                    id: config.notificationDialogId,
                    content: dialogData.content
                };

                let content = Mustache.render(template, data);

                // show dialog
                let shutdownDialog = bootbox.dialog({
                    title: dialogData.content.title,
                    message: content,
                    className: config.notificationDialogClass,
                    buttons: dialogData.buttons
                });


                shutdownDialog.on('shown.bs.modal', function(e){
                    // remove close button
                    let dialog = $(this);

                    dialog.find('.bootbox-close-button').remove();
                    dialog.find('button').blur();

                    // show error message
                    showPageContent(dialog);
                });
            });
        }
    };


});