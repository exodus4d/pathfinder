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
        creditsDialogLogoContainerId: 'pf-credits-logo-container',              // id for logo element
        creditsDialogLogoSVGId: 'pf-credits-logo-svg',                          // id for logo SVG

        // logo party
        logoPartTopRightClass: 'logo-ploygon-top-right',                        // class for logo part "top right"
        logoPartBottomLeftClass: 'logo-ploygon-bottom-left',                    // class for logo part "bottom left"
        logoPartBottomRightClass: 'logo-ploygon-bottom-right',                  // class for logo part "bottom right"
        logoPartTopLeftClass: 'logo-ploygon-top-left'                           // class for logo part "top left"
    };

    /**
     * show jump info dialog
     */
    $.fn.showCreditsDialog = function(){

        requirejs(['text!templates/dialog/credit.html', 'mustache'], function(template, Mustache) {

            var data = {
                logoContainerId: config.creditsDialogLogoContainerId,
                logoSVGId: config.creditsDialogLogoSVGId,

                logoPartTopRightClass: config.logoPartTopRightClass,
                logoPartBottomLeftClass: config.logoPartBottomLeftClass,
                logoPartBottomRightClass: config.logoPartBottomRightClass,
                logoPartTopLeftClass: config.logoPartTopLeftClass
            };

            var content = Mustache.render(template, data);

            var creditDialog = bootbox.dialog({
                className: config.creditsDialogClass,
                title: 'Licence',
                message: content
            });

            // after modal is shown =======================================================================
            creditDialog.on('shown.bs.modal', function(e) {
                var dialogElement = $(this);


                $('#' + config.creditsDialogLogoContainerId).drawLogo(function(){

                    // hide lines
                    dialogElement.find('svg:not(#' + config.creditsDialogLogoSVGId + ')').velocity({
                        opacity: 0
                    },{
                        delay: 100
                    });

                    // show full logo
                    $('#' + config.creditsDialogLogoSVGId).velocity({
                        opacity: 1
                    },{
                        delay: 100,
                        duration: 200,
                        complete: function(){

                            var logoElements = $('#' + config.creditsDialogLogoSVGId + ' path');

                            var animate = [];
                            logoElements.on('mouseover', function(e){
                                var currentLogoElement = $(e.target);
                                var currentLogoElementIndex = logoElements.index(currentLogoElement);

                                var animationXValue = currentLogoElement.attr('data-animationX');
                                var animationYValue = currentLogoElement.attr('data-animationY');

                                var animationConfig = {};
                                animationConfig.opacity = [1, 1];
                                animationConfig.translateZ = [0, 0];
                                animationConfig.translateX = [animationXValue, 0 ];
                                animationConfig.translateY = [animationYValue, 0];

                                if(animate[currentLogoElementIndex] !== false){
                                    $(this).velocity(animationConfig,{
                                        duration: 150,
                                        // easing: 'easeInOutCubic',
                                        begin: function(){
                                            animate[currentLogoElementIndex] = false;
                                        }
                                    }).velocity('reverse',{
                                        delay: 250,
                                        complete: function(){
                                            animate[currentLogoElementIndex] = true;
                                        }
                                    });
                                }

                            });
                        }
                    });

                });

            });



        });

    };
});