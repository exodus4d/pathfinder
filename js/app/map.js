define(["jquery", "app/render", "jsPlumb", "app/contextmenu"], function($, Render) {

    "use strict";

    var config = {
        // TODO: remove temp ID counter
        tempId: 100,
        zIndexCounter: 110,
        newSystemOffset: {
          x: 150,
          y: 0
        },

        containerMapWrapperId: 'pf-map-wrapper',                             // wrapper for maps
        mapClass: 'pf-map',                                             // class for a map
        systemIdPrefix: 'pf-system-',                                   // id prefix for a system
        systemClass: 'pf-system',
        systemActiveClass: 'pf-system-active',
        systemHeadClass: 'pf-system-head',
        systemBody: 'pf-system-body',
        dynamicElementWrapperId: 'pf-dialog-wrapper',                     // wrapper div for dynamic content (dialoges, context-menus,...)

        // context menus
        connectionContextMenuId: 'pf-map-connection-contextmenu',
        systemContextMenuId: 'pf-map-system-contextmenu',

        // dialogs
        confirmDialogId: 'pf-delete-dialog',
        systemDialogId: 'pf-system-dialog',
        errorConnectDialogId: 'pf-error-dialog-loopback',

        // system effect classes
        systemEffect: 'pf-system-effect',
        systemEffectMagnetar: 'pf-system-effect-magnetar',
        systemEffectRedGiant: 'pf-system-effect-redgiant',
        systenEffectPular: 'pf-system-effect-pulsar',
        systemEffectWolfRyet: 'pf-system-effect-wolfryet',
        systemEffectCataclysmic: 'pf-system-effect-cataclysmic',
        systemEffectBlackHole: 'pf-system-effect-blackhole',

        // system security classes
        systemSec: 'pf-system-sec',
        systemSecHigh: 'pf-system-sec-highSec',
        systemSecLow: 'pf-system-sec-lowSec',
        systemSecNull: 'pf-system-sec-nullSec',
        systemSecWHHeigh: 'pf-system-sec-high',
        systemSecWHMid: 'pf-system-sec-mid',
        systemSecWHLow: 'pf-system-sec-low',

        // system status
        systemStatus: {
            friendly: {
                class: 'pf-system-status-friendly',
                label: 'friendly'
            },
            occupied: {
                class: 'pf-system-status-occupied',
                label: 'occupied'
            },
            hostile: {
                class: 'pf-system-status-hostile',
                label: 'hostile'
            },
            empty: {
                class: 'pf-system-status-empty',
                label: 'empty'
            },
            unscanned: {
                class: 'pf-system-status-unscanned',
                label: 'unscanned'
            }
        }
    };

    // jsPlumb config
    var globalMapConfig =  {
        source: {
            filter: '.' + config.systemHeadClass,
            anchor: "Continuous",
            connector: [ "Bezier", { curviness: 40, cssClass: 'pf-map-connection-wh' } ],
            maxConnections: 5,
            allowLoopback:false,
            onMaxConnections:function(info, e) {
                alert("Maximum connections (" + info.maxConnections + ") reached");
            }
        },
        target: {
            filter: '.' + config.systemHeadClass,
            anchor: "Continuous",
            dropOptions:{ hoverClass: config.systemActiveClass },
            allowLoopback:false,
            beforeDrop: function(info){
                // check function for new connection

                // prevent loop back
                if(info.sourceId === info.targetId){
                    return false;
                }

                // prevent multiple connections between same systems
                var connections = checkForConnection(this.instance, info.source, info.target);
                if(connections.length > 0){

                    // confirm dialog
                    var moduleConfig = {
                        name: 'modules/dialog',
                        position: $('#' + config.dynamicElementWrapperId),
                        link: 'after',
                        functions: {
                            after: function(){
                                $( "#" + config.errorConnectDialogId).dialog({
                                    modal: true,
                                    resizable: false,
                                    buttons: {
                                        'OK': function(){
                                            $(this).dialog('close');
                                        }
                                    }
                                });
                            }
                        }
                    };

                    var modulData = {
                        id: config.errorConnectDialogId,
                        titel: 'error: Loopback',
                        content: 'Connection already exists.'
                    };

                    Render.showModule(moduleConfig, modulData);


                    return false;
                }

                return true;
            }
        },
        connectionTypes: {
            wh: {
                cssClass: 'pf-map-connection-wh'
            },
            wh_eol: {
                cssClass: 'pf-map-connection-wh-eol'
            },
            wh_reduced: {
                cssClass: 'pf-map-connection-wh-reduced'
            },
            wh_critical: {
                cssClass: 'pf-map-connection-wh-critical'
            },
            frig: {
                cssClass: 'pf-map-connection-frig'
            }
        }
    }





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

        if(config.systemStatus[status]){
            statusClass = config.systemStatus[status].class;
        }

        return statusClass;
    };

    /**
     * get a new system by data object
     * @param data
     * @returns {*|HTMLElement}
     */
    var getSystem = function(data){

        var system;

        // get system info classes
        var effectClass = getEffectClassForSystem(data.effect);
        var secClass = getSecurityClassForSystem(data.security);
        var statusClass = getStatusClassForSystem(data.status);

        system = $('<div>', {
            // system
            id: config.systemIdPrefix + data.id,
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

        system.attr('data-id', data.id);

        return $(system);
    };

    /**
     * draw a new map with all systems and connections
     * @param mapConfig
     */
    var drawMap = function(mapConfig){

        // create map body
        var mapWrapper = $('<div>', {
            class: 'pf-map-wrapper'
        });

        var mapContainer = $('<div>', {
            id: mapConfig.config.id,
            class: config.mapClass
        });

        mapWrapper.append(mapContainer);

        $('#' + config.containerMapWrapperId).append(mapWrapper);

        $.each(mapConfig.data.systems, function(i, data){
            // draw a system to a map
            drawSystem(mapConfig.map, data);
        });
    };

    /**
     * mark a system as source
     * @param map
     * @param systems
     */
    var makeSource = function(map, systems){

        // get scope from map defaults
        var sourceConfig = globalMapConfig.source;
        sourceConfig.scope = map.Defaults.Scope;

        map.makeSource(systems, sourceConfig);
    };

    /**
     * mark a system as target
     * @param map
     * @param systems
     */
    var makeTarget = function(map, systems){

        // get scope from map defaults
        var targetConfig = globalMapConfig.target;
        targetConfig.scope = map.Defaults.Scope;

        map.makeTarget(systems, targetConfig);

    };

    /**
     * draw a system with its data to a map
     * @param map object
     * @param systemData
     * @param {String[]} optional Systems for connection
     */
    var drawSystem = function(map, systemData, connectedSystems){

        var mapContainer = map.Defaults.Container;

        // TODO request missing system data
        if(!systemData.hasOwnProperty('id')){
            systemData.id = config.tempId++;
        }
        if(!systemData.hasOwnProperty('effect')){
            systemData.effect = '';
        }
        if(!systemData.hasOwnProperty('security')){
            systemData.security = 'H';
        }

        // get System Element by data
        var newSystem = getSystem(systemData);

        var mapElement = $('#' + mapContainer);

        mapElement.append(newSystem);

        // make new System dragable
        makeDraggable(map, newSystem);

        // make target
        makeTarget(map, newSystem);

        // make source
        makeSource(map, newSystem);

        // Context menu on for Systems
        setSystemObserver(map, newSystem);

        // connect new system (if connection data is given)
        if(connectedSystems){

            $.each(connectedSystems, function(i, connectSystem){

                var connectionData = {
                    source: $(connectSystem).attr('data-id'),
                    target: $(newSystem).attr('data-id'),
                    type: 'wh'
                };
                drawConnection(map, connectionData);
            })
        };

    };

    /**
     * make one or multiple systems draggable
     * @param map
     * @param String[] systems
     */
    var makeDraggable = function(map, systems){

        map.draggable(systems, {
            containment: 'parent',
            zIndex: 2000,
            start: function(){
                // drag start
            },
            stop: function(e, ui){
                // drag stop

                // update z-index for dragged system + connections
                updateZIndex(map, e.target);
            },
            drag: function(){
                // while drag
            }
        });
    };

    /**
     * update z-index for a system (dragged sytems should be always on top)
     * @param map
     * @param system
     */
    var updateZIndex = function(map, system){
        /* do not update connections for now
        // get all connections
        var connections = getConnections(map, [system]);

        // increase global z-Index counter
        var newZIndexConnections = config.zIndexCounter++;

        $.each(connections, function(i, connection){
           // $(connection.canvas).css('z-index', newZIndexConnections);
        })
        */
        var newZIndexSystem = config.zIndexCounter++;
        $(system).css('z-index', newZIndexSystem);
    };

    /**
     *  get all connections of multiple systems
     * @param map
     * @param systems Array of Systems objectts
     * @returns {Array} of all connections
     */
    var getConnections = function(map, systems){

        var connections = [];

        $.each(systems, function(i, system){
            // get connections where system is source
            connections = connections.concat( map.getConnections({source: system}) );
            // getconnections where system is target
            connections = connections.concat( map.getConnections({target: system}) );
        });

        return connections;
    }

    /**
     * get all direct connections between two given systems
     * @param map
     * @param systemA
     * @param systemB
     * @returns {Array}
     */
    var checkForConnection = function(map, systemA, systemB){

        var connections = [];

        connections = connections.concat( map.getConnections({source: systemA, target: systemB}) );
        // getconnections where system is target
        connections = connections.concat( map.getConnections({source: systemB, target: systemA}) );

        return connections;
    };

    /**
     * connect two systems
     * @param mapConfig
     * @param connectionData
     * @returns new connection
     */
    var drawConnection = function(map, connectionData){

        var connection = map.connect({
            source: config.systemIdPrefix + connectionData.source,
            target: config.systemIdPrefix + connectionData.target,
            type: connectionData.type
        });

        // set Observer for new Connection
        setConnectionObserver(map, connection);

        return connection;
    }

    /**
     * load contextmenu template for connections
     */
    var initConnectionContextMenu = function(){

        var moduleConfig = {
            name: 'modules/contextmenu',
            position: $('#' + config.dynamicElementWrapperId)
        };

        var moduleData = {
            id: config.connectionContextMenuId,
            items: [
                {icon: 'fa-eraser', action: 'delete', text: 'delete'},
                {icon: 'fa-info-circle', action: 'info', text: 'info'},
                {divider: true},
               // {icon: 'fa-bomb', action: 'eol', text: 'toggle EOL'},
                {text: 'change status', subitems: [
                    {subIcon: 'fa-clock-o', subAction: 'eol', subText: 'toggle EOL'},
                    {subDivider: true},
                    {subIcon: 'fa-circle', subAction: 'status_fresh', subText: 'stage 0 (fresh)'},
                    {subIcon: 'fa-adjust', subAction: 'status_reduced', subText: 'stage 1 (reduced)'},
                    {subIcon: 'fa-circle-o', subAction: 'status_critical', subText: 'stage 2 (critical)'}

                ]}
            ]
        };

        Render.showModule(moduleConfig, moduleData);

    };

    /**
     * load contextmenu template for systems
     */
    var initSystemContextMenu = function(){

        var moduleConfig = {
            name: 'modules/contextmenu',
            position: $('#' + config.dynamicElementWrapperId)
        };

        var moduleData = {
            id: config.systemContextMenuId,
            items: [
                {icon: 'fa-plus', action: 'add_system', text: 'add system'},
                {icon: 'fa-info-circle', action: 'info', text: 'info'}
            ]
        };

        Render.showModule(moduleConfig, moduleData);

    };

    /**
     * set up contextmenu for all Systems within a given map
     * @param endpoints
     */
    var setSystemObserver = function(map, systems){

        var mapContainer = map.Defaults.Container;

        // trigger context menu
        $('#' + mapContainer).find(systems).on('contextmenu', function(e){
            $(e.target).trigger('pf:openContextMenu', [e, this]);
            e.preventDefault();
            return false;
        });

        // init contextmenu
        $(systems).contextMenu({
            menuSelector: "#" + config.systemContextMenuId,
            menuSelected: function (params) {

                // click action
                var action = params.selectedMenu.attr('data-action');

                // current system
                var currentSystem = $(params.component);

                switch(action){
                    case 'add_system':
                        // add a new system

                        // confirm dialog
                        var moduleConfig = {
                            name: 'modules/system_dialog',
                            position: $('#' + config.dynamicElementWrapperId),
                            link: 'after',
                            functions: {
                                after: function(){
                                    $( "#" + config.systemDialogId).dialog({
                                        modal: true,
                                        resizable: false,
                                        buttons: {
                                            'Cancel': function(){
                                                $(this).dialog('close');
                                            },
                                            'Add System': function(){

                                                // get form Values
                                                var form = $('#' + config.systemDialogId).find('form');

                                                var  newSystemData = {};

                                                $.each(form.serializeArray(), function(i, field) {
                                                    newSystemData[field.name] = field.value;
                                                });

                                                // add new position
                                                var currentX = currentSystem.css('left');
                                                var currentY = currentSystem.css('top');

                                                newSystemData.position = {
                                                    x: parseInt( currentX.substring(0, currentX.length - 2) ) + config.newSystemOffset.x,
                                                    y: parseInt( currentY.substring(0, currentY.length - 2) ) + config.newSystemOffset.y
                                                }


                                                // draw new system to map
                                                drawSystem(map, newSystemData, currentSystem);

                                                $(this).dialog('close');
                                            }
                                        }
                                    });
                                }
                            }
                        };

                        // format system status for form select
                        var systemStatus = [];
                        $.each(config.systemStatus, function(status, statusData){
                            statusData.status = status;
                            systemStatus.push(statusData);
                        })

                        var modulData = {
                            id: config.systemDialogId,
                            titel: 'Add new system',
                            status: systemStatus,
                            content: 'system dialog :)'
                        };

                        Render.showModule(moduleConfig, modulData);
                        break;
                    case 'info': console.log('info')
                        break;
                }

            }
        });


    };

    /**
     * set Observer for a given connection
     * @param map
     * @param connection
     */
    var setConnectionObserver = function(map, connection){


        connection.bind('contextmenu', function(component, e) {
            // trigger menu "open
            $(e.target).trigger('pf:openContextMenu', [e, component]);
            e.preventDefault();
            return false;
        });

        /**
         *  init context menu for all connections
         *  must be triggered manually on demand
         */

        $('path').contextMenu({
            menuSelector: "#" + config.connectionContextMenuId,
            menuSelected: function (params){

                var action = params.selectedMenu.attr('data-action');

                switch(action){
                    case 'delete':
                        // delete a single connection

                        // confirm dialog
                        var moduleConfig = {
                            name: 'modules/dialog',
                            position: $('#' + config.dynamicElementWrapperId),
                            link: 'after',
                            functions: {
                                after: function(){
                                    $( "#" + config.confirmDialogId).dialog({
                                        modal: true,
                                        resizable: false,
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
                            content: 'Is this connection really gone?'
                        };

                        Render.showModule(moduleConfig, modulData);


                        break;
                    case 'eol':
                        // toggle eol-status of a connection
                        connection.toggleType('wh_eol');

                        // for some reason  a new observer is needed ?!
                        setConnectionObserver(map, connection);
                        break;
                    case 'status_fresh':
                        connection.removeType('wh_reduced');
                        connection.removeType('wh_critical');
                        setConnectionObserver(map, connection);
                        break;
                    case 'status_reduced':
                        connection.removeType('wh_critical');
                        connection.addType('wh_reduced');
                        setConnectionObserver(map, connection);
                        break;
                    case 'status_critical':
                        connection.removeType('wh_reduced');
                        connection.addType('wh_critical');
                        setConnectionObserver(map, connection);
                        break;
                    case 'info':
                        console.log('info');
                        break;
                }

                // wh type:
                console.log('is eol: ', connection.hasType('wh_eol'));
                console.log('is reduced: ', connection.hasType('wh_reduced'));
                console.log('is crit: ', connection.hasType('wh_critical'));

            }
        });


    }

    var render = function(mapConfig){

        // add context menues to dom
        initConnectionContextMenu();
        initSystemContextMenu();


        // init jsPlumb
        jsPlumb.ready(function() {

            // get new map instance add to mapConfig
            mapConfig.map = jsPlumb.getInstance({
                Container:  mapConfig.config.id,
                PaintStyle:{
                    lineWidth: 5, //  width of a Connector's line. An integer.
                    //fillStyle: "blue", //  color for an Endpoint, eg. "blue",
                    strokeStyle: 'red', // color for a Connector
                    outlineColor: 'red', // color of the outline for an Endpoint or Connector. see fillStyle examples.
                    outlineWidth: 2 // width of the outline for an Endpoint or Connector. An integer.
                    //joinstyle:"round",
                    //dashstyle:"2 2",
                },
                Connector:[ "Bezier", { curviness: 40, cssClass: 'pf-map-connection-wh' } ],
                Anchor: "Continuous",
                Endpoint: 'Blank',
                Scope: mapConfig.config.scope
            });

            //  draw initial map
            drawMap(mapConfig);

            //var systemElements = mapConfig.map.getSelector('.' + config.systemClass);

            var systemElements = $('#' + mapConfig.config.id).find('.' + config.systemClass);

            var dropOptions = {
                tolerance:"touch",
                hoverClass:"dropHover",
                activeClass:"dragActive"
            };


            // endpoint (system) config
            var endpointConfig = {
                endpoint: 'Blank',
                //paintStyle:{ fillStyle: "blue", opacity: 0.5 },
                //Connector:[ "Bezier", { curviness: 40, cssClass: 'pf-map-connection-default' } ],
                isSource: true,
                scope: mapConfig.config.scope,
                isTarget: true,
                dropOptions : dropOptions
            };

           // mapConfig.map.doWhileSuspended(function() {

                // register all available connection types =============================
                mapConfig.map.registerConnectionTypes(globalMapConfig.connectionTypes);


                // ========================================================


                var endpoints =  mapConfig.map.addEndpoint(systemElements, {
                }, endpointConfig);


                // set up default connections
                $.each(mapConfig.data.connections, function(i, connectionData){
                    drawConnection(mapConfig.map, connectionData);
                });

               // mapConfig.map.fire("pf-map-loaded", mapConfig.map);

           // });

            // global  map observer for manual connections (drag & drop)
            mapConfig.map.bind('connection', function(info, e) {

                console.log('test')

                setConnectionObserver(mapConfig.map, info.connection);
            });

           // mapConfig.map.bind("beforeDrop", function(info) {
               // manually connect
           // });




        });



    };

    return {
        render: render
    };
});