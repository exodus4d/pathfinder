/**
 * Demo SVG map
 */

define([
    'jquery',
    'lazylinepainter'
], ($) => {

    'use strict';

    let config = {
        headerSystemsContainerId: 'pf-header-systems',                              // id for systems layer
        headerSystemConnectorsId: 'pf-header-connectors',                           // id for connectors layer
        headerConnectionsContainerId: 'pf-header-connections',                      // id for connections layer
        headerBackgroundContainerId: 'pf-header-background',                        // id for background layer

        headerSystemClass: 'pf-header-system',                                      // class for all header background systems

        // map dimensions
        mapWidth: 600,                                                              // map width (px)
        mapHeight: 380                                                              // map height (px)
    };

    /**
     * draw systems layer
     * @param callback
     */
    let drawSystems = function(callback){

        let pathObj = {
            systems: {
                strokepath: [
                    // systems =======================================================================
                    // 1
                    {
                        path: 'm 155 30 90 0 c 2.8 0 5 2.2 5 5 l 0 10 c 0 2.8 -2.2 5 -5 5 l -90 0 c -2.8 0 -5 -2.2 -5 -5 l 0 -10 c 0 -2.8 2.2 -5 5 -5 z',
                        duration: 500,
                        strokeColor: '#568A89' //teal
                    },
                    // 2
                    {
                        path: 'm 374 91 110 0 c 2.8 0 5 2.2 5 5 l 0 10 c 0 2.8 -2.2 5 -5 5 l -110 0 c -2.8 0 -5 -2.2 -5 -5 l 0 -10 c 0 -2.8 2.2 -5 5 -5 z',
                        duration: 500,
                        strokeColor: '#63676A' //gray
                    },
                    // 3
                    {
                        path: 'm 15 149 90 0 c 2.8 0 5 2.2 5 5 l 0 30 c 0 2.8 -2.2 5 -5 5 l -90 0 c -2.8 0 -5 -2.2 -5 -5 l 0 -30 c 0 -2.8 2.2 -5 5 -5 z',
                        duration: 500,
                        strokeColor: '#D9534F ' //red
                    },
                    // 4
                    {
                        path: 'm 235 230 90 0 c 2.8 0 5 2.2 5 5 l 0 10 c 0 2.8 -2.2 5 -5 5 l -90 0 c -2.8 0 -5 -2.2 -5 -5 l 0 -10 c 0 -2.8 2.2 -5 5 -5 z',
                        duration: 500,
                        strokeColor: '#63676A' //gray
                    },
                    // 5
                    {
                        path: 'm 175 330 90 0 c 2.8 0 5 2.2 5 5 l 0 30 c 0 2.8 -2.2 5 -5 5 l -90 0 c -2.8 0 -5 -2.2 -5 -5 l 0 -30 c 0 -2.8 2.2 -5 5 -5 z',
                        duration: 500,
                        strokeColor: '#E28A0D ' //orange
                    },
                    // 6
                    {
                        path: 'm 436 312 90 0 c 2.8 0 5 2.2 5 5 l 0 10 c 0 2.8 -2.2 5 -5 5 l -90 0 c -2.8 0 -5 -2.2 -5 -5 l 0 -10 c 0 -2.8 2.2 -5 5 -5 z',
                        duration: 500,
                        strokeColor: '#5CB85C ' //green
                    }
                ],
                dimensions: {
                    width: config.mapWidth,
                    height: config.mapHeight
                }
            }
        };


        // draw systems into header
        $('#' + config.headerSystemsContainerId).lazylinepainter(
            {
                svgData: pathObj,
                strokeWidth: 2,
                strokeOpacity: 1,
                overrideKey: 'systems',
                strokeJoin: 'miter',
                strokeCap: 'butt',
                delay: 1000,
                onComplete: function(){
                    drawConnectors(callback);
                }

            }).lazylinepainter('paint');
    };

    /**
     * draw connectors layer
     * @param callback
     */
    let drawConnectors = function(callback){

        let connectorDuration = 150;

        let pathObj = {
            connectors: {
                strokepath: [
                    // connectors ====================================================================
                    // 1
                    {
                        path: 'm 250.4 34.8 c 1.7 0 3.1 1.3 3.9 2.9 0.8 1.7 0.8 3.7 0 5.3 -0.8 1.7 -2.4 2.7 -4 2.7',
                        duration: connectorDuration
                    },
                    {
                        path: 'm 150 34.7 c -1.7 0 -3.1 1.3 -3.9 2.9 -0.8 1.7 -0.8 3.7 0 5.3 0.8 1.7 2.4 2.7 4 2.7',
                        duration: connectorDuration
                    },
                    // 2
                    {
                        path: 'm 369 96 c -1.7 0 -3.1 1.3 -3.9 2.9 -0.8 1.7 -0.8 3.7 0 5.3 0.8 1.7 2.4 2.7 4 2.7',
                        duration: connectorDuration
                    },
                    // 3
                    {
                        path: 'm 110.4 165 c 1.7 0 3.1 1.3 3.9 2.9 0.8 1.7 0.8 3.7 0 5.3 -0.8 1.7 -2.4 2.7 -4 2.7',
                        duration: connectorDuration
                    },
                    {
                        path: 'm 56 148 c 0 -1.7 1.3 -3.1 2.9 -3.9 1.7 -0.8 3.7 -0.8 5.3 0 1.7 0.8 2.7 2.4 2.7 4',
                        duration: connectorDuration
                    },
                    // 4
                    {
                        path: 'm 229 236 c -1.7 0 -3.1 1.3 -3.9 2.9 -0.8 1.7 -0.8 3.7 0 5.3 0.8 1.7 2.4 2.7 4 2.7',
                        duration: connectorDuration
                    },
                    {
                        path: 'm 331 234.7 c 1.7 0 3.1 1.3 3.9 2.9 0.8 1.7 0.8 3.7 0 5.3 -0.8 1.7 -2.4 2.7 -4 2.7',
                        duration: connectorDuration
                    },
                    {
                        path: 'm 285 251 c 0 1.7 -1.3 3.1 -2.9 3.9 -1.7 0.8 -3.7 0.8 -5.3 0 -1.7 -0.8 -2.7 -2.4 -2.7 -4',
                        duration: connectorDuration
                    },
                    // 5
                    {
                        path: 'm 213 329.5 c 0 -1.7 1.3 -3.1 2.9 -3.9 1.7 -0.8 3.7 -0.8 5.3 0 1.7 0.8 2.7 2.4 2.7 4',
                        duration: connectorDuration
                    },
                    // 6
                    {
                        path: 'm 430 316 c -1.7 0 -3.1 1.3 -3.9 2.9 -0.8 1.7 -0.8 3.7 0 5.3 0.8 1.7 2.4 2.7 4 2.7',
                        duration: connectorDuration
                    }
                ],
                dimensions: {
                    width: config.mapWidth,
                    height: config.mapHeight
                }
            }
        };


        // draw systems into header
        $('#' + config.headerConnectionsContainerId).lazylinepainter(
            {
                svgData: pathObj,
                strokeWidth: 2,
                duration: 600,
                drawSequential: false,
                strokeOpacity: 1,
                overrideKey: 'connectors',
                strokeJoin: 'miter',
                strokeCap: 'butt',
                strokeColor: '#63676A', //gray
                onComplete: function(){
                    drawConnections(callback);
                }

            }).lazylinepainter('paint');
    };

    /**
     * draw connections layer
     * @param callback
     */
    let drawConnections = function(callback){

        let connectionDuration = 250;
        let connectionWidth = 8;
        let connectionInnerWidth = 4;
        let connectionBorderColor = '#63676A'; //gray

        let pathObj = {
            connections: {
                strokepath: [
                    // connections ====================================================================
                    // 1 - 2
                    {
                        path: 'm 255,40 c 44.5,0 64.2,61.1 109.0,61.15',
                        duration: connectionDuration,
                        strokeWidth: connectionWidth
                    },
                    {
                        path: 'm 255,40 c 44.5,0 64.2,61.1 109.0,61.15',
                        duration: connectionDuration,
                        strokeWidth: connectionInnerWidth,
                        strokeColor: '#3C3F41' // gray
                    },
                    // 2 - 3
                    {
                        path: 'm 146,40.0 c -51.7,0 -83.8,58.8 -83.8,104.5',
                        duration: connectionDuration,
                        strokeWidth: connectionWidth
                    },
                    {
                        path: 'm 146,40.0 c -51.7,0 -83.8,58.8 -83.8,104.5',
                        duration: connectionDuration,
                        strokeWidth: connectionInnerWidth,
                        strokeColor: '#E28A0D' // orange
                    },
                    // 3 - 4
                    {
                        path: 'm 115,171 c 45.7,0 64.1,71.2 109.6,70.8',
                        duration: connectionDuration,
                        strokeWidth: connectionWidth
                    },
                    {
                        path: 'm 115,171 c 45.7,0 64.1,71.2 109.6,70.8',
                        duration: connectionDuration,
                        strokeWidth: connectionInnerWidth,
                        strokeColor: '#A52521' // red
                    },
                    // 4 - 5
                    {
                        path: 'm 279,256 c 0.5,35.9 -60.1,35.1 -60.1,70.0',
                        duration: connectionDuration,
                        strokeWidth: connectionWidth
                    },
                    {
                        path: 'm 279,256 c 0.5,35.9 -60.1,35.1 -60.1,70.0',
                        duration: connectionDuration,
                        strokeWidth: connectionInnerWidth,
                        strokeColor: '#3C3F41' // gray
                    },
                    // 4 - 6
                    {
                        path: 'm 335,240 c 44.2,0 43.7,81.6 89.9,81.6',
                        duration: connectionDuration,
                        strokeWidth: connectionWidth
                    },
                    {
                        path: 'm 335,240 c 44.2,0 43.7,81.6 89.9,81.6',
                        duration: connectionDuration,
                        strokeWidth: connectionInnerWidth,
                        strokeColor: '#3C3F41' // gray
                    }
                ],
                dimensions: {
                    width: config.mapWidth,
                    height: config.mapHeight
                }
            }
        };


        // draw systems into header
        $('#' + config.headerSystemConnectorsId).lazylinepainter(
            {
                svgData: pathObj,
                strokeWidth: 2,
                duration: 600,
                // drawSequential: false,
                strokeOpacity: 1,
                overrideKey: 'connections',
                strokeJoin: 'miter',
                strokeCap: 'butt',
                strokeColor: connectionBorderColor,
                onComplete: function(){
                    drawBackground(callback);
                }

            }).lazylinepainter('paint');

    };

    /**
     * draw background layer
     * @param callback
     */
    let drawBackground = function(callback){
        $('#' + config.headerBackgroundContainerId + ' .' + config.headerSystemClass).velocity('transition.bounceUpIn', {
            stagger: 150,
            complete: function(){
                if(typeof callback === 'function'){
                    callback();
                }
            }
        });
    };

    /**
     * draws the demo map
     * @param callback
     */
    $.fn.drawDemoMap = function(callback){
        let canvasElement = $(this);


        // draw systems
        drawSystems(callback);
    };

});