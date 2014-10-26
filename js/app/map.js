define(["jquery", "app/render", "jsPlumb", "app/contextmenu"], function($, Render) {

    "use strict";

    var config = {
        containerMapClass: 'pf-container-map',
        mapId: 'pf-map',
        systemClass: 'pf-system',
        systemActiveClass: 'pf-system-active',
        systemHeadClass: 'pf-system-head',
        systemBody: 'pf-system-body',
        contextMenuId: 'pf-map-contextmenu',
        confirmDialogId: 'pf-delete-dialog',

        systemEffect: 'pf-system-effect',
        systemEffectMagnetar: 'pf-system-effect-magnetar',
        systemEffectRedGiant: 'pf-system-effect-redgiant',
        systenEffectPular: 'pf-system-effect-pulsar',
        systemEffectWolfRyet: 'pf-system-effect-wolfryet',
        systemEffectCataclysmic: 'pf-system-effect-cataclysmic',
        systemEffectBlackHole: 'pf-system-effect-blackhole',

        systemSec: 'pf-system-sec',
        systemSecHigh: 'pf-system-sec-high',
        systemSecLow: 'pf-system-sec-low',
        systemSecNull: 'pf-system-sec-null',
        systemSecWHHeigh: 'pf-system-sec-high',
        systemSecWHMid: 'pf-system-sec-mid',
        systemSecWHLow: 'pf-system-sec-low',

        systemStatusFriendly: 'pf-system-status-friendly',
        systemStatusOccupied: 'pf-system-status-occupied',
        systemStatusHostile: 'pf-system-status-hostile',
        systemStatusEmpty: 'pf-system-status-empty',
        systemStatusUnscanned: 'pf-system-status-unscanned'
    };

    var getEffectClassForSystem = function(effect){

        var effectClass = '';

        switch(effect){
            case 'magnetar':
                effectClass = config.systemEffectMagnetar;
                break;
            case 'redGiant':
                effectClass = config.systemEffectRedGiant;
                break;
            case 'pulsar':
                effectClass = config.systenEffectPular;
                break;
            case 'wolfRyet':
                effectClass = config.systemEffectWolfRyet;
                break;
            case 'cataclysmic':
                effectClass = config.systemEffectCataclysmic;
                break;
            case 'blackHole':
                effectClass = config.systemEffectBlackHole;
                break;
        }

        return effectClass;
    };

    var getSecurityClassForSystem = function(sec){

        var secClass = '';

        switch(sec){
            case 'H':
                secClass = config.systemSecHigh;
                break;
            case 'L':
                secClass = config.systemSecLow;
                break;
            case '0.0':
                secClass = config.systemSecNull;
                break;
            case 'C6':
            case 'C5':
                secClass = config.systemSecWHHeigh;
                break;
            case 'C4':
            case 'C3':
                secClass = config.systemSecWHMid;
                break;
            case 'C2':
            case 'C1':
                secClass = config.systemSecWHLow;
                break;
        }

        return secClass;
    };

    var getStatusClassForSystem = function(status){

        var statusClass = '';

        switch(status){
            case 'friendly':
                statusClass = config.systemStatusFriendly;
                break;
            case 'occupied':
                statusClass = config.systemStatusOccupied;
                break;
            case 'hostile':
                statusClass = config.systemStatusHostile;
                break;
            case 'empty':
                statusClass = config.systemStatusEmpty;
                break;
            case 'unscanned':
                statusClass = config.systemStatusUnscanned;
                break;
        }

        return statusClass;
    };


    var getSystem = function(data){

        var wh;

        // get system info classes
        var effectClass = getEffectClassForSystem(data.effect);
        var secClass = getSecurityClassForSystem(data.security);
        var statusClass = getStatusClassForSystem(data.status);

        wh = $('<div>', {
            // system
            id: 'pf-system-' + data.id,
            class: [config.systemClass, statusClass].join(' ')
        }).append(
            // system head
            $('<div>', {
                class: config.systemHeadClass,
                text: data.name
            }).append(
                    // System effect color
                    $('<i>', {
                        class: ['fa fa-square ', config.systemEffect, effectClass].join(' ')
                    })
                ).prepend(
                    $('<span>', {
                        class: [config.systemSec, secClass].join(' '),
                        text: data.security
                    })
                )

            ).append(
                // system body
                $('<div>', {
                    class: config.systemBody
                })
            ).css({ "left": data.position.x + "px", 'top': data.position.y + 'px' });

        return wh;
    };

    var drawMap = function(){

        var whData = [{
            id: 2,
            name: 'J150020',
            effect: 'magnetar',
            security: 'C6',
            status: 'friendly',
            position: {
                x: 0,
                y: 0
            }
        },{
            id: 3,
            name: 'J115844',
            effect: 'wolfRyet',
            security: 'C6',
            status: 'empty',
            position: {
                x: 60,
                y: 60
            }
        },{
            id: 4,
            name: 'J155207',
            effect: 'wolfRyet',
            security: 'C6',
            status: '',
            position: {
                x: 200,
                y: 60
            }
        },{
            id: 5,
            name: 'J145510',
            effect: 'pulsar',
            security: 'C3',
            status: 'hostile',
            position: {
                x: 110,
                y: 110
            }
        }];

        // map
        var map = $('#' + config.mapId);

        $.each(whData, function(i, data){
            var wh = getSystem(data);

            map.append(wh);
        });
    };

    /**
     * load contextmenu template
     */
    var initContextMenu = function(){

        var moduleConfig = {
            name: 'modules/contextmenu',
            position: $('body'),
            functions: {
                after: function(){

                }
            }
        };

        var moduleData = {
            id: config.contextMenuId,
            items: [
                {icon: 'fa-eraser', action: 'delete', text: 'detach'},
                {icon: 'fa-info-circle', action: 'info', text: 'info'}
            ]
        };

        Render.showModule(moduleConfig, moduleData);

    };

    var render = function(){

        // create map body
        var mapContainer = $('<div>', {
            id: config.mapId
        });

        $('.pf-container-map').append(mapContainer);

        // draw map
        drawMap();

        // add context menu to dom
        initContextMenu();

        // init jsPlumb
        jsPlumb.ready(function() {

            var scope = 'wormhole';

            var map = jsPlumb.getInstance({
                Container: config.mapId,
                PaintStyle:{
                    lineWidth: 5, //  width of a Connector's line. An integer.
                    //fillStyle: "blue", //  color for an Endpoint, eg. "blue",
                    strokeStyle: 'red', // color for a Connector
                    outlineColor: 'red', // color of the outline for an Endpoint or Connector. see fillStyle examples.
                    outlineWidth: 2 // width of the outline for an Endpoint or Connector. An integer.
                    //joinstyle:"round",
                    //dashstyle:"2 2",
                },
                Connector:[ "Bezier", { curviness: 40, cssClass: 'pf-map-connection-default' } ],
                Anchor: "Continuous",
                Endpoint: 'Blank',
                DragOptions : { cursor: "pointer", zIndex: 2000 }
            });

            var systemElements = jsPlumb.getSelector('.' + config.systemClass);

            var dropOptions = {
                tolerance:"touch",
                hoverClass:"dropHover",
                activeClass:"dragActive"
            };

            var endpoint = {
                endpoint: 'Blank',
               // paintStyle:{ fillStyle: "blue", opacity: 0.5 },

                //Connector:[ "Bezier", { curviness: 40, cssClass: 'pf-map-connection-default' } ],
                isSource:true,
                scope: scope,
                isTarget:true,
                dropOptions : dropOptions
            };

            map.doWhileSuspended(function() {

                map.registerConnectionType('normal', {
                    paintStyle:{ lineWidth:5, outlineWidth:2 },
                    cssClass: 'pf-map-connection-default'
                });

                map.registerConnectionType('frig', {
                    paintStyle:{ lineWidth:5, outlineWidth:2 },
                    cssClass: 'pf-map-connection-frig'
                });

                map.draggable(systemElements, {
                    containment:"parent"
                });

                var isFilterSupported = map.isDragFilterSupported();

                if (isFilterSupported) {
                    map.makeSource(systemElements, {
                        filter: "." + config.systemHeadClass,
                        anchor: "Continuous",
                        connector: [ "Bezier", { curviness: 40, cssClass: 'pf-map-connection-default' } ],
                        scope: scope,
                        //parent: 'parent',
                        maxConnections: 5,
                        onMaxConnections:function(info, e) {
                            alert("Maximum connections (" + info.maxConnections + ") reached");
                        }
                    });
                }

                map.makeTarget(systemElements, {
                    filter: "." + config.systemHeadClass,
                    anchor: "Continuous",
                    dropOptions:{ hoverClass: config.systemActiveClass },
                    allowLoopback: false,
                    scope: scope
                });

                map.addEndpoint(systemElements, {
                }, endpoint);


                map.connect({
                    source: $('#pf-system-3'),
                    target: $('#pf-system-4'),
                    //anchor: 'Continuous'
                    type: 'normal',
                    endpoint: 'Blank'
                });

                // set observer ========================================================

                // Context Menu on connections
                map.bind("contextmenu", function(component, e) {
                    // trigger menu "open"
                    $(e.target).trigger('pf:openContextMenu', [e, component]);
                    e.preventDefault();
                    return false;
                });

                jsPlumb.fire("pf-map-loaded", map);
            });

            /**
             *  init context menu for all connections
             *  must be triggered manually on demand
             */
            $('path').contextMenu({
                menuSelector: "#" + config.contextMenuId,
                menuSelected: function (params) {

                    var action = params.selectedMenu.attr('data-action');

                    switch(action){
                        case 'delete':
                            // delete a single connection

                            // confirm dialog
                            var moduleConfig = {
                                name: 'modules/dialog',
                                position: $('body'),
                                link: 'after',
                                functions: {
                                    after: function(){
                                        $( "#" + config.confirmDialogId).dialog({
                                            modal: true,
                                            buttons: {
                                                'Cancel': function(){
                                                    $(this).dialog('close');
                                                },
                                                'Yes': function(){
                                                    map.detach(params.component);
                                                    $(this).dialog('close');
                                                }
                                            }
                                        });
                                    }
                                }
                            };

                            var modulData = {
                                id: config.confirmDialogId,
                                titel: 'Delete Connection',
                                content: 123
                            };

                            Render.showModule(moduleConfig, modulData);


                            break;
                        case 'info': console.log('info')
                            break;
                    }




                }
            });

        });



    };

    return {
        render: render
    };
});