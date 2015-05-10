/**
 * Demo SVG map
 */

define([
    'jquery',
    'lazylinepainter'
], function($) {
    'use strict';

    var config = {
        headerSystemsContainerId: 'pf-header-systems',                              // id for systems layer
        headerSystemConnectorsId: 'pf-header-connectors',                           // id for connectors layer
        headerConnectionsContainerId: 'pf-header-connections',                      // id for connections layer
        headerBackgroundContainerId: 'pf-header-background',                        // id for background layer

        headerSystemClass: 'pf-header-system'                                       // class for all header background systems
    };

    /**
     * draw systems layer
     */
    var drawSystems = function(){

        var pathObj = {
            systems: {
                strokepath: [
                    // systems =======================================================================
                    // 1
                    {
                        path: 'm 505 30 90 0 c 2.8 0 5 2.2 5 5 l 0 10 c 0 2.8 -2.2 5 -5 5 l -90 0 c -2.8 0 -5 -2.2 -5 -5 l 0 -10 c 0 -2.8 2.2 -5 5 -5 z',
                        duration: 500,
                        strokeColor: '#568A89' //teal
                    },
                    // 2
                    {
                        path: 'm 725 90 110 0 c 2.8 0 5 2.2 5 5 l 0 10 c 0 2.8 -2.2 5 -5 5 l -110 0 c -2.8 0 -5 -2.2 -5 -5 l 0 -10 c 0 -2.8 2.2 -5 5 -5 z',
                        duration: 500,
                        strokeColor: '#63676A' //gray
                    },
                    // 3
                    {
                        path: 'm 365 150 90 0 c 2.8 0 5 2.2 5 5 l 0 30 c 0 2.8 -2.2 5 -5 5 l -90 0 c -2.8 0 -5 -2.2 -5 -5 l 0 -30 c 0 -2.8 2.2 -5 5 -5 z',
                        duration: 500,
                        strokeColor: '#D9534F ' //red
                    },
                    // 4
                    {
                        path: 'm 585 230 90 0 c 2.8 0 5 2.2 5 5 l 0 10 c 0 2.8 -2.2 5 -5 5 l -90 0 c -2.8 0 -5 -2.2 -5 -5 l 0 -10 c 0 -2.8 2.2 -5 5 -5 z',
                        duration: 500,
                        strokeColor: '#63676A' //gray
                    },
                    // 5
                    {
                        path: 'm 525 330 90 0 c 2.8 0 5 2.2 5 5 l 0 30 c 0 2.8 -2.2 5 -5 5 l -90 0 c -2.8 0 -5 -2.2 -5 -5 l 0 -30 c 0 -2.8 2.2 -5 5 -5 z',
                        duration: 500,
                        strokeColor: '#E28A0D ' //orange
                    },
                    // 6
                    {
                        path: 'm 785 310 90 0 c 2.8 0 5 2.2 5 5 l 0 10 c 0 2.8 -2.2 5 -5 5 l -90 0 c -2.8 0 -5 -2.2 -5 -5 l 0 -10 c 0 -2.8 2.2 -5 5 -5 z',
                        duration: 500,
                        strokeColor: '#5CB85C ' //green
                    }
                ],
                dimensions: {
                    width: 901,
                    height: 431
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
                delay: 600,
                onComplete: function(){
                    drawConnectors();
                }

            }).lazylinepainter('paint');
    };

    /**
     * draw connectors layer
     */
    var drawConnectors = function(){

        var connectorDuration = 150;

        var pathObj = {
            connectors: {
                strokepath: [
                    // connectors ====================================================================
                    // 1
                    {
                        path: 'm 600.4 34.8 c 1.7 0 3.1 1.3 3.9 2.9 0.8 1.7 0.8 3.7 0 5.3 -0.8 1.7 -2.4 2.7 -4 2.7',
                        duration: connectorDuration
                    },
                    {
                        path: 'm 499.1 34.7 c -1.7 0 -3.1 1.3 -3.9 2.9 -0.8 1.7 -0.8 3.7 0 5.3 0.8 1.7 2.4 2.7 4 2.7',
                        duration: connectorDuration
                    },
                    // 2
                    {
                        path: 'm 719.2 95 c -1.7 0 -3.1 1.3 -3.9 2.9 -0.8 1.7 -0.8 3.7 0 5.3 0.8 1.7 2.4 2.7 4 2.7',
                        duration: connectorDuration
                    },
                    // 3
                    {
                        path: 'm 460.4 165 c 1.7 0 3.1 1.3 3.9 2.9 0.8 1.7 0.8 3.7 0 5.3 -0.8 1.7 -2.4 2.7 -4 2.7',
                        duration: connectorDuration
                    },
                    {
                        path: 'm 404.6 149.4 c 0 -1.7 1.3 -3.1 2.9 -3.9 1.7 -0.8 3.7 -0.8 5.3 0 1.7 0.8 2.7 2.4 2.7 4',
                        duration: connectorDuration
                    },
                    // 4
                    {
                        path: 'm 579.5 234.8 c -1.7 0 -3.1 1.3 -3.9 2.9 -0.8 1.7 -0.8 3.7 0 5.3 0.8 1.7 2.4 2.7 4 2.7',
                        duration: connectorDuration
                    },
                    {
                        path: 'm 680.7 234.7 c 1.7 0 3.1 1.3 3.9 2.9 0.8 1.7 0.8 3.7 0 5.3 -0.8 1.7 -2.4 2.7 -4 2.7',
                        duration: connectorDuration
                    },
                    {
                        path: 'm 634.6 250.7 c 0 1.7 -1.3 3.1 -2.9 3.9 -1.7 0.8 -3.7 0.8 -5.3 0 -1.7 -0.8 -2.7 -2.4 -2.7 -4',
                        duration: connectorDuration
                    },
                    // 5
                    {
                        path: 'm 563 329.5 c 0 -1.7 1.3 -3.1 2.9 -3.9 1.7 -0.8 3.7 -0.8 5.3 0 1.7 0.8 2.7 2.4 2.7 4',
                        duration: connectorDuration
                    },
                    // 6
                    {
                        path: 'm 779.8 315.3 c -1.7 0 -3.1 1.3 -3.9 2.9 -0.8 1.7 -0.8 3.7 0 5.3 0.8 1.7 2.4 2.7 4 2.7',
                        duration: connectorDuration
                    }
                ],
                dimensions: {
                    width: 901,
                    height: 431
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
                    drawConnections();
                }

            }).lazylinepainter('paint');
    };

    /**
     * draw connections layer
     */
    var drawConnections = function(){

        var connectionDuration = 250;
        var connectionWidth = 8;
        var connectionInnerWidth = 4;
        var connectionBorderColor = '#63676A'; //gray

        var pathObj = {
            connections: {
                strokepath: [
                    // connections ====================================================================
                    // 1 - 2
                    {
                        path: 'm 605.5,40.3 c 44.5,0 64.2,61.1 109.0,61.15',
                        duration: connectionDuration,
                        strokeWidth: connectionWidth
                    },
                    {
                        path: 'm 605.5,40.3 c 44.5,0 64.2,61.1 109.0,61.15',
                        duration: connectionDuration,
                        strokeWidth: connectionInnerWidth,
                        strokeColor: '#3C3F41' // gray
                    },
                    // 2 - 3
                    {
                        path: 'm 494.4,40.0 c -51.7,0 -83.8,58.8 -83.8,104.5',
                        duration: connectionDuration,
                        strokeWidth: connectionWidth
                    },
                    {
                        path: 'm 494.4,40.0 c -51.7,0 -83.8,58.8 -83.8,104.5',
                        duration: connectionDuration,
                        strokeWidth: connectionInnerWidth,
                        strokeColor: '#E28A0D' // orange
                    },
                    // 3 - 4
                    {
                        path: 'm 465.1,170.0 c 45.7,0 64.1,71.2 109.6,70.8',
                        duration: connectionDuration,
                        strokeWidth: connectionWidth
                    },
                    {
                        path: 'm 465.1,170.0 c 45.7,0 64.1,71.2 109.6,70.8',
                        duration: connectionDuration,
                        strokeWidth: connectionInnerWidth,
                        strokeColor: '#A52521' // red
                    },
                    // 4 - 5
                    {
                        path: 'm 628.5,255.0 c 0.5,35.9 -60.1,35.1 -60.1,70.0',
                        duration: connectionDuration,
                        strokeWidth: connectionWidth
                    },
                    {
                        path: 'm 628.5,255.0 c 0.5,35.9 -60.1,35.1 -60.1,70.0',
                        duration: connectionDuration,
                        strokeWidth: connectionInnerWidth,
                        strokeColor: '#3C3F41' // gray
                    },
                    // 4 - 6
                    {
                        path: 'm 685.1,239.8 c 44.2,0 43.7,81.6 89.9,81.6',
                        duration: connectionDuration,
                        strokeWidth: connectionWidth
                    },
                    {
                        path: 'm 685.1,239.8 c 44.2,0 43.7,81.6 89.9,81.6',
                        duration: connectionDuration,
                        strokeWidth: connectionInnerWidth,
                        strokeColor: '#3C3F41' // gray
                    }
                ],
                dimensions: {
                    width: 901,
                    height: 431
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
                    drawBackground();
                }

            }).lazylinepainter('paint');

    };

    /**
     * draw background layer
     */
    var drawBackground = function(){
        $('#' + config.headerBackgroundContainerId + ' .' + config.headerSystemClass).velocity('transition.bounceUpIn', {
            stagger: 150
        });
    };

    /**
     * draws the demo map
     * @param callback
     */
    $.fn.drawDemoMap = function(){
        var canvasElement = $(this);


        // draw systems
        drawSystems();
    };

});