define(["jquery", "app/render", "jsPlumb", "app/map/contextmenu"], function($, Render) {

    "use strict";

    var config = {
        // TODO: remove temp ID counter
        tempId: 100,
        zIndexCounter: 110,
        newSystemOffset: {
          x: 150,
          y: 0
        },

        mapWrapperClass: 'pf-map-wrapper',                              // wrapper div (scrollable)
        mapClass: 'pf-map',                                             // class for all maps
        mapIdPrefix: 'pf-map-',
        systemIdPrefix: 'pf-system-',                                   // id prefix for a system
        systemClass: 'pf-system',
        systemActiveClass: 'pf-system-active',
        systemHeadClass: 'pf-system-head',
        systemBodyClass: 'pf-system-body',
        systemBodyItemClass: 'pf-system-body-item',
        systemBodyItemStatusClass: 'pf-user-status',
        systemBodyRightClass: 'pf-system-body-right',
        dynamicElementWrapperId: 'pf-dialog-wrapper',                     // wrapper div for dynamic content (dialoges, context-menus,...)

        // endpoint classes
        endpointSourceClass: 'pf-map-endpoint-source',
        endpointTargetClass: 'pf-map-endpoint-target',

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
        },

        // user status
        userStatus: {
            'corp': {
                class: 'pf-user-status-corp'
            },
            'ally': {
                class: 'pf-user-status-ally'
            }
        }


    };

    // active jsPlumb instances currently running
    var activeInstances = {};

    // jsPlumb config
    var globalMapConfig =  {
        source: {
            filter: '.' + config.systemHeadClass,
            anchor: 'Continuous',
            connector: [ "Bezier", { curviness: 40, cssClass: 'pf-map-connection-wh' } ],
            maxConnections: 5,
            allowLoopback:false,
            cssClass: config.endpointSourceClass,
            onMaxConnections:function(info, e) {
                alert("Maximum connections (" + info.maxConnections + ") reached");
            }/*,

            overlays:[
                [ "Label", {
                    location:[0.5, 1.5],
                    label:"Drag",
                    cssClass:"endpointSourceLabel"
                } ]
            ] */
        },
        target: {
            filter: '.' + config.systemHeadClass,
            anchor: 'Continuous',
            allowLoopback:false,
            cssClass: config.endpointTargetClass,
            dropOptions: {
                tolerance: 'touch',
                hoverClass: config.systemActiveClass,
                activeClass: 'dragActive'
            },
            /*overlays:[
                [ "Label", {
                    location:[0.5, 1.5],
                    label:"Drag",
                    cssClass:"endpointSourceLabel"
                } ]
            ],*/

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

                    var moduleData = {
                        id: config.errorConnectDialogId,
                        titel: 'error: Loopback',
                        content: 'Connection already exists.'
                    };

                    Render.showModule(moduleConfig, moduleData);


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

    /**
     * get status class for a system
     * @param status
     * @returns {string}
     */
    var getStatusClassForSystem = function(status){

        var statusClass = '';

        if(config.systemStatus[status]){
            statusClass = config.systemStatus[status].class;
        }

        return statusClass;
    };

    /**
     * get status class for a user
     * @param status
     * @returns {string}
     */
    var getStatusClassForUser = function(status){

        var statusClass = '';

        if(config.userStatus[status]){
            statusClass = config.userStatus[status].class;
        }

        return statusClass;
    };

    /**
     * updates a system with current information
     * @param system
     * @param data
     */
    var updateSystem = function(system, data){

        // find system body
        var systemBody = $( $(system).find('.' + config.systemBodyClass) );

        // remove tooltip
        $(system).removeAttr('title');

        // remove all content
        systemBody.empty();

        // add user information
        if(data.user){

            var userCounter = 0;

            $.each(data.user, function(i, userData){

                userCounter++;

                var statusClass = getStatusClassForUser(userData.status);
                var userName = userData.name;
                if(userName.length > 7){
                   // userName = userName.substr(0,7) + '...';
                }


                var item = $('<div>', {
                    class: config.systemBodyItemClass
                }).append(
                    $('<li>', {
                        class: ['fa', 'fa-circle', config.systemBodyItemStatusClass, statusClass].join(' ')
                    })
                ).append(
                    $('<span>', {
                        text: ' ' + userName
                    })
                ).append(
                        $('<span>', {
                            text: userData.ship,
                            class: config.systemBodyRightClass
                        })
                    );

                systemBody.append(item);
            });

            // show active user tooltip
            $(system).attr('title', userCounter);
            $(system).attr('data-placement', 'top');
            $(system).attr('data-toggle', 'tooltip');
            $(system).tooltip('show');
        }


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
                    class: config.systemBodyClass
                }).append(
                    $('<div>', {
                        class: config.systemBodyInnerClass
                    })

                )
        ).css({ "left": data.position.x + "px", 'top': data.position.y + 'px' });

        system.attr('data-id', data.id);

        return $(system);
    };

    /**
     * draw a new map with all systems and connections
     * @param mapConfig
     */
    var drawMap = function(parentElement, mapConfig){

        // create map body
        var mapWrapper = $('<div>', {
            class: config.mapWrapperClass
        });

        var mapContainer = $('<div>', {
            id: config.mapIdPrefix + mapConfig.config.id,
            class: config.mapClass
        }).attr('data-mapid', mapConfig.config.id);

        mapWrapper.append(mapContainer);

        // append mapWrapper to parent element
        $(parentElement).append(mapWrapper);

        // set main Container for current map -> the container exists now in DOM
        mapConfig.map.setContainer($('#' + config.mapIdPrefix + mapConfig.config.id));

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

        var mapContainer = $(map.getContainer());

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


        mapContainer.append(newSystem);

        // make new System dragable
        makeDraggable(map, newSystem);

        // make target
        makeTarget(map, newSystem);

        // make source
        makeSource(map, newSystem);

        // set system observer
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
            });
        }

    };

    /**
     * make one or multiple systems draggable
     * @param map
     * @param String[] systems
     */
    var makeDraggable = function(map, systems){

        var mapContainer = $(map.getContainer());

        map.draggable(systems, {
            containment: mapContainer,// 'parent',
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
            // get connections where system is target
            connections = connections.concat( map.getConnections({target: system}) );
        });

        return connections;
    };

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
    };

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
    var setSystemObserver = function(map, system){

        var systemBody = $( $(system).find('.' + config.systemBodyClass) );

        // init system body expand
        $(system).hover(function(e){
            // hover in
            var hoverSystem = this;

            systemBody.animate(
                {
                    height: '100px'
                },
                {
                    queue:false,
                    duration: 100,
                    step: function(){
                        // repaint connections of current system
                        map.repaint( hoverSystem );
                    }
                }
            );
        }, function(e){
            // hover out
            var hoverSystem = this;
            systemBody.animate(
                { height: '16px' },
                {
                    queue:false,
                    duration: 100,
                    step: function(){
                        // repaint connections of current system
                        map.repaint( hoverSystem );
                    }
                }
            );
        });


        // init system body item expand
        systemBody.hover(function(){
            $(this).animate(
                {
                    width: '150px'
                },
                {
                    queue:false,
                    duration: 100,
                    step: function(){
                        // repaint connections of current system
                        map.repaint( system );
                    },
                    complete: function(){
                        $(this).find('.' + config.systemBodyRightClass).show();
                    }
                }
            );

        }, function(){
            $(this).animate(
                {
                    width: '80px'
                },
                {
                    queue:false,
                    duration: 100,
                    step: function(){ console.log(system)
                        // repaint connections of current system
                        map.repaint( system );
                    },
                    start: function(){
                        $(this).find('.' + config.systemBodyRightClass).hide();
                    }
                }
            );
        });

        // trigger context menu
        $(system).on('contextmenu', function(e){
            $(e.target).trigger('pf:openContextMenu', [e, this]);
            e.preventDefault();
            return false;
        });

        // init contextmenu
        $(system).contextMenu({
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
                                            'Add system': function(){

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
                        });

                        var moduleData = {
                            id: config.systemDialogId,
                            titel: 'Add new system',
                            status: systemStatus
                        };

                        Render.showModule(moduleConfig, moduleData);
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
                var activeConnection = params.component;

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

                        var moduleData = {
                            id: config.confirmDialogId,
                            titel: 'Delete Connection',
                            content: 'Is this connection really gone?'
                        };

                        Render.showModule(moduleConfig, moduleData);


                        break;
                    case 'eol':
                        // toggle eol-status of a connection
                        activeConnection.toggleType('wh_eol');

                        // for some reason  a new observer is needed ?!
                        setConnectionObserver(map, activeConnection);
                        break;
                    case 'status_fresh':
                        activeConnection.removeType('wh_reduced');
                        activeConnection.removeType('wh_critical');
                        setConnectionObserver(map, activeConnection);
                        break;
                    case 'status_reduced':
                        activeConnection.removeType('wh_critical');
                        activeConnection.addType('wh_reduced');
                        setConnectionObserver(map, activeConnection);
                        break;
                    case 'status_critical':
                        activeConnection.removeType('wh_reduced');
                        activeConnection.addType('wh_critical');
                        setConnectionObserver(map, activeConnection);
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


    };

    var getMapInstance = function(mapId){

        if(typeof activeInstances[mapId] !== 'object'){
            // create new instance
            activeInstances[mapId] =  jsPlumb.getInstance({
                Container: null, // will be set as soon as container is connected to DOM
                PaintStyle:{
                    lineWidth: 4, //  width of a Connector's line. An integer.
                    strokeStyle: 'red', // color for a Connector
                    outlineColor: 'red', // color of the outline for an Endpoint or Connector. see fillStyle examples.
                    outlineWidth: 2 // width of the outline for an Endpoint or Connector. An integer.
                },
                Connector:[ 'Bezier', { curviness: 40, cssClass: 'pf-map-connection-wh' } ],
                Endpoint : ['Dot', {radius: 6}]
                // Endpoint: 'Blank', // does not work... :(
                // Scope: mapConfig.config.scope
            });

            console.log('new jsPlumbInstance: ' + mapId);
        }



        return activeInstances[mapId];
    };

    /**
     * updates all systems on map with current user Data
     * @param userData
     */
    $.fn.updateUserData = function(userData){

        // get all systems
        var systems = $(this).find('.' + config.systemClass);

        $.each(systems, function(i, system){
            // get user Data for System
            var systemId = parseInt( $(system).attr('data-id') );

            var data = {};
            $.each(userData.data.systems, function(j, systemData){
                if(systemId === systemData.id){
                    data = systemData;
                }
            });

            updateSystem(system, data);

        });

    };

    /**
     * load  system map into element
     * @param mapConfig
     */
    $.fn.loadMap = function(mapConfig){

        // parent element where the map will be loaded
        var parentElement = $(this);

        // add context menus to dom
        initConnectionContextMenu();
        initSystemContextMenu();

        // init jsPlumb
        jsPlumb.ready(function() {


            // get new map instance or load existing
            mapConfig.map = getMapInstance(mapConfig.config.id);

            // check for map Container (
            if(mapConfig.map.getContainer() === undefined){
                // new map instance

                //  draw initial map and set container
                drawMap(parentElement, mapConfig);

               // mapConfig.map.doWhileSuspended(function() {

                    // register all available connection types =============================
                    mapConfig.map.registerConnectionTypes(globalMapConfig.connectionTypes);

                    // set up default connections
                    $.each(mapConfig.data.connections, function(i, connectionData){
                        drawConnection(mapConfig.map, connectionData);
                    });

                    mapConfig.map.fire("pf-map-loaded", mapConfig.map);

               // });

                // global  map observer for manual connections (drag & drop)
                mapConfig.map.bind('connection', function(info, e) {
                    setConnectionObserver(mapConfig.map, info.connection);
                });

                // mapConfig.map.bind("beforeDrop", function(info) {
                // manually connect
                // });
            }


        });



    };
});