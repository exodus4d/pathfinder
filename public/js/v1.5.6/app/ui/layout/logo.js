/**
 * Logo
 */

define([
    'jquery',
    'lazylinepainter'
], ($) => {

    'use strict';

    let config = {
        staticLogoId: 'pf-static-logo-svg',                                     // id for "static" logo

        logoPartTopRightClass: 'logo-ploygon-top-right',                        // class for logo part "top right"
        logoPartBottomLeftClass: 'logo-ploygon-bottom-left',                    // class for logo part "bottom left"
        logoPartBottomRightClass: 'logo-ploygon-bottom-right',                  // class for logo part "bottom right"
        logoPartTopLeftClass: 'logo-ploygon-top-left'
    };


    /**
     * draws the pathfinder logo to an element and add some animation features
     * @param callback
     * @param enableHover
     */
    $.fn.drawLogo = function(callback, enableHover){
        let canvasElement = $(this);

        let pathObj = {
            logo: {
                strokepath: [
                    {
                        path: 'M195.9 9.6 226.9 297.1 354.2 365 196.2 9.8 ',
                        strokeColor: '#477372',
                        duration: 1600
                    },
                    {
                        path: 'M1.7 361.3 73.9 284.9 178.6 286.7 2.2 361.4 ',
                        strokeColor: '#5cb85c',
                        duration: 1000
                    },
                    {
                        path: 'M192.9 286.7 121.2 318.6 335.6 363.5 193.4 286.7 ',
                        strokeColor: '#375959',
                        duration: 900
                    },
                    {
                        path: 'M202.8 141.9 0.2 352.6 189.1 0.8 202.7 141.3 ',
                        strokeColor: '#63676a',
                        duration: 1500
                    }
                ],
                dimensions: {
                    width: 355,
                    height: 366
                }
            }
        };

        // load Logo svg
        requirejs(['text!templates/layout/logo.html', 'mustache'], function(template, Mustache){
            let logoData = {
                staticLogoId: config.staticLogoId,
                logoPartTopRightClass: config.logoPartTopRightClass,
                logoPartBottomLeftClass: config.logoPartBottomLeftClass,
                logoPartBottomRightClass: config.logoPartBottomRightClass,
                logoPartTopLeftClass: config.logoPartTopLeftClass
            };

            let logoContent = Mustache.render(template, logoData);

            canvasElement.html(logoContent);

            // draw the logo
            canvasElement.lazylinepainter(
                {
                    svgData: pathObj,
                    strokeWidth: 2,
                    drawSequential: false,
                    delay: 300,
                    overrideKey: 'logo',
                    strokeJoin: 'bevel',
                    onComplete: function(){

                        // hide lines
                        canvasElement.find('svg:not(#' + config.staticLogoId + ')').velocity({
                            opacity: 0
                        },{
                            delay: 100
                        });

                        // show full logo
                        canvasElement.find('#' + config.staticLogoId + '').velocity({
                            opacity: 1
                        },{
                            delay: 100,
                            duration: 200,
                            complete: function(){

                                // execute callback
                                if(typeof callback === 'function'){
                                    callback();
                                }

                                // init logo animation
                                if(enableHover === true){
                                    let logoElements = $('#' + config.staticLogoId + ' path');

                                    let animate = [];
                                    logoElements.on('mouseover', function(e){
                                        let currentLogoElement = $(e.target);
                                        let currentLogoElementIndex = logoElements.index(currentLogoElement);

                                        let animationXValue = currentLogoElement.attr('data-animationX');
                                        let animationYValue = currentLogoElement.attr('data-animationY');

                                        let animationConfig = {};
                                        animationConfig.opacity = [1, 1];
                                        animationConfig.translateZ = [0, 0];
                                        animationConfig.translateX = [animationXValue, 0 ];
                                        animationConfig.translateY = [animationYValue, 0];

                                        if(animate[currentLogoElementIndex] !== false){
                                            $(this).velocity(animationConfig,{
                                                duration: 120,
                                                begin: function(){
                                                    animate[currentLogoElementIndex] = false;
                                                }
                                            }).velocity('reverse',{
                                                delay: 240,
                                                complete: function(){
                                                    animate[currentLogoElementIndex] = true;
                                                }
                                            });
                                        }

                                    });
                                }


                            }
                        });
                    }
                }).lazylinepainter('paint');
        });
    };

});