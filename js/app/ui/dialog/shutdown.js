/**
 *  error/shutdown dialog
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

        // shutdown dialog
        shutdownDialogId: 'pf-shutdown-dialog'                                              // id for "trust" dialog

    };

    /**
     * show/animate dialog page content
     * @param pageElement
     */
    var showPageContent = function(dialog){

        dialog.find('h1').delay(300).velocity('transition.shrinkIn', {
            duration: 500
        }).delay(800)

        dialog.find('h1').velocity({
            scale: 1.05
        }, {
            duration: 600,
            loop: 5
        });
    };

    /**
     * show "shutdown" dialog
     */
    $.fn.showShutdownDialog = function(dialogData){

        requirejs(['text!templates/dialog/shutdown.html', 'mustache'], function(template, Mustache) {

            var data = {
                id: config.shutdownDialogId,
                reason: dialogData.reason
            };

            var content = Mustache.render(template, data);

            // show dialog
            var shutdownDialog = bootbox.dialog({
                title: 'Shutdown',
                message: content,
                buttons: {
                    logout: {
                        label: '<i class="fa fa-fw fa-power-off"></i> logout',
                        className: ['btn-default', 'pull-left'].join(' '),
                        callback: function() {

                            $(document).trigger('pf:menuLogout');
                        }
                    },
                    refresh: {
                        label: '<i class="fa fa-fw fa-repeat"></i> reload',
                        className: ['btn-danger'].join(' '),
                        callback: function(){
                            // refresh page
                            location.reload();
                            return false;
                        }
                    }
                }
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
    };


});