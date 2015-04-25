/**
 *  set IGB trust dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'app/ccp'
], function($, Init, Util, Render, bootbox, CCP) {
    'use strict';

    var config = {

        // trust dialog
        trustDialogId: 'pf-trust-dialog',                                       // id for "trust" dialog
        trustDialogFirstPageId: 'pf-trust-first-page',                          // id for first page
        trustDialogSecondPageId: 'pf-trust-second-page'                         // id for second page

    };

    /**
     * show/animate dialog page content
     * @param pageElement
     */
    var showPageContent = function(pageElement){

        pageElement.find('h1').delay(300).velocity('transition.shrinkIn', {
            duration: 500
        }).delay(800)

        pageElement.find('h1').velocity({
            scale: 1.05
        }, {
            duration: 600,
            loop: 5
        });
    };

    /**
     * show "trust" dialog
     */
    $.fn.showTrustDialog = function(){

        requirejs(['text!templates/dialog/trust.html', 'mustache'], function(template, Mustache) {

            var data = {
                id: config.trustDialogId,
                firstPageId: config.trustDialogFirstPageId,
                secondPageId: config.trustDialogSecondPageId
            };


            var content = Mustache.render(template, data);



            // show dialog
            var trustDialog = bootbox.dialog({
                title: 'Trust Page',
                message: content,
                buttons: {
                    logout: {
                        label: '<i class="fa fa-fw fa-power-off"></i> logout',
                        className: ['btn-default', 'pull-left'].join(' '),
                        callback: function() {

                            $(document).trigger('pf:menuLogout');
                        }
                    },
                    trust: {
                        label: '<i class="fa fa-fw fa-lock"></i> trust',
                        className: 'btn-primary',
                        callback: function(){
                            var dialog = $(this);

                            // request trust
                            CCP.requestTrust();

                            var firstPageElement = dialog.find('#' + config.trustDialogFirstPageId);
                            var secondPageElement = dialog.find('#' + config.trustDialogSecondPageId);

                            // toggle buttons
                            dialog.find('.btn-primary').hide();
                            dialog.find('.btn-success').removeClass('hide');


                            // toggle pages
                            firstPageElement.velocity('slideUp', {
                                duration: Init.animationSpeed.dialogEvents,
                                complete: function(){
                                    secondPageElement.velocity('slideDown', {
                                        duration: Init.animationSpeed.dialogEvents,
                                        display: 'block'
                                    });
                                }
                            });

                            // show reload button
                            showPageContent(secondPageElement);


                            return false;
                        }
                    },
                    reload: {
                        label: '<i class="fa fa-fw fa-repeat"></i> reload',
                        className: ['btn-success', 'hide'].join(' '),
                        callback: function(){
                            // reload page
                            location.reload();
                            return false;
                        }
                    }
                }
            });


            trustDialog.on('shown.bs.modal', function(e) {
            // remove close button
                var dialog = $(this);

                dialog.find('.bootbox-close-button').remove();
                dialog.find('button').blur();

                // show trust message
                var firstPageElement = dialog.find('#' + config.trustDialogFirstPageId);
                showPageContent(firstPageElement);
            });


        });
    };


});