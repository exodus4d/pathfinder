/**
 * Logo
 */

define([
    'jquery',
    'lazylinepainter'
], function($) {
    'use strict';

    /**
     * draws the pathfinder logo to an element and add some animation features
     * @param callback
     */
    $.fn.drawLogo = function(callback){
        var canvasElement = $(this);

        var pathObj = {
            logo: {
                strokepath: [
                    {
                        path: "M195.9 9.6 226.9 297.1 354.2 365 196.2 9.8 ",
                        strokeColor: '#477372',
                        duration: 1600
                    },
                    {
                        path: "M1.7 361.3 73.9 284.9 178.6 286.7 2.2 361.4 ",
                        strokeColor: '#5cb85c',
                        duration: 1000
                    },
                    {
                        path: "M192.9 286.7 121.2 318.6 335.6 363.5 193.4 286.7 ",
                        strokeColor: '#375959',
                        duration: 900
                    },
                    {
                        path: "M202.8 141.9 0.2 352.6 189.1 0.8 202.7 141.3 ",
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

                    if(callback){
                        callback();
                    }
                }
            }).lazylinepainter('paint');


    };

});