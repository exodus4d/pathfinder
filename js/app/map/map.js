define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'jsPlumb',
    'customScrollbar',
    'dragToSelect',
    'hoverIntent',
    'app/map/contextmenu'
], function($, Init, Util, Render, bootbox) {

    "use strict";

    var config = {
        // TODO: remove temp ID counter
        tempId: 100,
        zIndexCounter: 110,
        newSystemOffset: {
          x: 150,
          y: 0
        },

        mapSnapToGrid: false,                                           // Snap systems to grid while dragging
        mapTabContentClass: 'pf-map-tab-content',                       // Tab-Content element (parent element)
        mapWrapperClass: 'pf-map-wrapper',                              // wrapper div (scrollable)
        mapOverlayClass: 'pf-map-overlay',                              // class for map Overlay e.g. update counter
        mapClass: 'pf-map',                                             // class for all maps
        mapGridClass: 'pf-grid-small',                                  // class for map grid snapping
        mapIdPrefix: 'pf-map-',                                         // id prefix for all maps
        systemIdPrefix: 'pf-system-',                                   // id prefix for a system
        systemClass: 'pf-system',                                       // class for all systems
        systemActiveClass: 'pf-system-active',                          // class for an active system in a map
        systemSelectedClass: 'pf-system-selected',                      // class for selected systems in a map
        systemLockedClass: 'pf-system-locked',                          // class for locked systems in a map
        systemHeadClass: 'pf-system-head',                              // class for system head
        systemHeadNameClass: 'pf-system-head-name',                     // class for system name
        systemHeadExpandClass: 'pf-system-head-expand',                 // class for system head expand arrow
        systemBodyClass: 'pf-system-body',                              // class for system body
        systemBodyItemClass: 'pf-system-body-item',
        systemBodyItemStatusClass: 'pf-user-status',
        systemBodyRightClass: 'pf-system-body-right',
        dynamicElementWrapperId: 'pf-dialog-wrapper',                     // wrapper div for dynamic content (dialogs, context-menus,...)

        // endpoint classes
        endpointSourceClass: 'pf-map-endpoint-source',
        endpointTargetClass: 'pf-map-endpoint-target',

        // context menus
        mapContextMenuId: 'pf-map-contextmenu',
        connectionContextMenuId: 'pf-map-connection-contextmenu',
        systemContextMenuId: 'pf-map-system-contextmenu',

        // dialogs
        systemDialogId: 'pf-system-dialog',

        // system security classes
        systemSec: 'pf-system-sec',
        systemSecHigh: 'pf-system-sec-highSec',
        systemSecLow: 'pf-system-sec-lowSec',
        systemSecNull: 'pf-system-sec-nullSec',
        systemSecWHHeigh: 'pf-system-sec-high',
        systemSecWHMid: 'pf-system-sec-mid',
        systemSecWHLow: 'pf-system-sec-low',

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

    // active connections per map (cache object)
    var ativeConnections = {};

    // jsPlumb config
    var globalMapConfig =  {
        source: {
            filter: '.' + config.systemHeadNameClass,
            anchor: 'Continuous',
            connector: [ 'Bezier', { curviness: 10 /*cssClass: 'pf-map-connection-wh-fresh'*/} ],
            maxConnections: 10,
            //isSource:true,
           // isTarget:true,
            cssClass: config.endpointSourceClass,
            dragOptions:{},
            connectionsDetachable: true,
            onMaxConnections:function(info, e) {
                console.log('max connections')
                console.log(info.maxConnections);
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
           // filter: '.' + config.systemHeadNameClass,
            anchor: 'Continuous',
            allowLoopback: false,
            cssClass: config.endpointTargetClass,
            isTarget:true,
            uniqueEndpoint: false,          // each connection has a unique endpoint
           // isSource:true,
            connectionsDetachable: true,
            dropOptions: {
                tolerance: 'touch',
                hoverClass: config.systemActiveClass,
                activeClass: 'dragActive'
            },
            onMaxConnections:function(info, e) {
                console.log('max connections')
                console.log(info.maxConnections);
            }
        },
        connectionTypes: Init.connectionTypes
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
     * @param map
     * @param data
     * @param currentUserData // data of the user that is currently viewing this map
     */
    $.fn.updateSystemUserData = function(map, data, currentUserData){

        var system = $(this);

        // find system body
        var systemBody = $( $(system).find('.' + config.systemBodyClass) );

        // find expand arrow
        var systemHeadExpand = $( $(system).find('.' + config.systemHeadExpandClass) );

        system = $(system);

        // remove tooltip
        system.removeAttr('title');

        // remove all content
        systemBody.empty();

        var userCounter = 0;

        system.data('currentUser', false);

        // if current user is in THIS system trigger event
        if(currentUserData){
            /* not used jet
            var tabContentElement = getTabContentElementByMapElement(system);

            $(tabContentElement).trigger('pf:highlightTab', [{system: system}]);
            */

            system.data('currentUser', true);
        }

        // add user information
        if(
            data &&
            data.user
        ){
            console.log(data.user)
            $.each(data.user, function(i, userData){

                userCounter++;

                var statusClass = getStatusClassForUser(userData.status);
                var userName = userData.name;

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

        }
/*
        var oldUserCount = system.attr('title');

        system.removeAttr('title');

        if(userCounter === 0){
            // hide expand arrow
            systemBody.hide(100);
            systemHeadExpand.hide(100, function(){
                if(oldUserCount !== userCounter){
                    // revalidate element size and repaint
                    map.revalidate( system.attr('id') );
                }
            });
        }else{
            systemBody.show(100);
            systemHeadExpand.show(100, function(){
                if(oldUserCount !== userCounter){
                    // revalidate element size and repaint
                    map.revalidate( system.attr('id') );
                }
            });

            system.attr('title', userCounter);

            // show active user tooltip
            toggleSystemTooltip([system], 'show', {placement: 'top', trigger: 'manual'});
        }
*/

    };

    /**
     * show/hide systems tooltip
     * @param systems
     * @param show
     * @param options
     */
    var toggleSystemTooltip = function(systems, show, options){

        for(var i = 0; i < systems.length; i++){
            if(options){
                $(systems[i]).tooltip(options);
            }
            $(systems[i]).tooltip(show);
        }
    };

    /**
     * set or change the status of a system
     * @param status
     */
    $.fn.setSystemStatus = function(status){
        var system = $(this);

        var statusClass = Util.getStatusInfoForSystem(status, 'class');
        var statusLabel = Util.getStatusInfoForSystem(status, 'label');

        for(var property in Init.classes.systemStatus) {
            if (Init.classes.systemStatus.hasOwnProperty(property)) {
                system.removeClass( Init.classes.systemStatus[property].class );
            }
        }

        // add new class
        system.data('status', statusLabel);
        system.addClass( statusClass );
    };

    /**
     * returns a new system or updates an existing system
     * @param map
     * @param data
     * @returns {HTMLElement}
     */
    $.fn.getSystem = function(map, data){

        // get map container for mapId information
        var mapContainer = $(this);

        var systemId = config.systemIdPrefix + mapContainer.data('id') + '-' + data.id;

        // check if system already exists
        var system = document.getElementById( systemId );

        if(!system){

            // get system info classes
            var effectBasicClass = Util.getEffectInfoForSystem('effect', 'class');
            var effectClass = Util.getEffectInfoForSystem(data.effect, 'class');
            var secClass = Util.getSecurityClassForSystem(data.security);

            system = $('<div>', {
                // system
                id: systemId,
                class: config.systemClass
            }).append(
                    // system head
                    $('<div>', {
                        class: config.systemHeadClass
                    }).append(
                            // System name is editable
                            $('<a>', {
                                href: '#',
                                class: config.systemHeadNameClass
                            })
                        ).append(
                            // System locked status
                            $('<i>', {
                                class: ['fa', 'fa-lock', 'fa-fw'].join(' ')
                            }).attr('title', 'locked')
                        ).append(
                            // System effect color
                            $('<i>', {
                                class: ['fa', 'fa-square ', 'fa-fw', effectBasicClass, effectClass].join(' ')
                            }).attr('title', 'effect')
                        ).append(
                            // expand option
                            $('<i>', {
                                class: ['fa', 'fa-angle-down ', config.systemHeadExpandClass].join(' ')
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
                    })
                ).data('name', data.name);


        }else{
            system = $(system);
        }

        // set system position
        system.css({
            'left': data.position.x + 'px',
            'top': data.position.y + 'px' }
        );

        // set system name or alias
        var systemName = data.name;

        if(data.alias !== ''){
            systemName = data.alias;
        }

        system.find('.' + config.systemHeadNameClass).attr('data-value', systemName);

        // set system status
        system.setSystemStatus(data.status);

        system.data('id', data.id);
        system.data('name', data.name);
        system.data('type', data.type);
        system.data('effect', data.effect);
        system.data('trueSec', data.trueSec);
        system.data('updated', data.updated);
        system.attr('data-mapid', mapContainer.data('id'));

        // locked system
        if( Boolean( system.data( 'locked') ) !== Boolean( parseInt( data.locked ) )){
            system.toggleLockSystem(false, {hideNotification: true, hideCounter: true, map: map});
        }

        // rally system
        if( Boolean( system.data( 'rally') ) !== Boolean( parseInt( data.rally ) )){
            system.toggleRallyPoint(false, {hideNotification: true, hideCounter: true});
        }

        return system;
    };

    /**
     * draw a new map with all systems and connections
     * @param mapConfig
     */
    var updateMap = function(parentElement, mapConfig){

        var mapContainer = mapConfig.map.getContainer();

        if(mapContainer === undefined){
            // add new map

            // create map wrapper
            var mapWrapper = $('<div>', {
                class: config.mapWrapperClass
            });

            // create new map container
            mapContainer = $('<div>', {
                id: config.mapIdPrefix + mapConfig.config.id,
                class: [config.mapClass].join(' ')
            });

            // add additional information
            mapContainer.data('id', mapConfig.config.id);
            mapContainer.data('name', mapConfig.config.name);
            mapContainer.data('type', mapConfig.config.type);

            mapWrapper.append(mapContainer);

            // append mapWrapper to parent element (at the top)
            $(parentElement).prepend(mapWrapper);


            // set main Container for current map -> the container exists now in DOM !! very important
            mapConfig.map.setContainer($('#' + config.mapIdPrefix + mapConfig.config.id));

            // set map observer
            setMapObserver(mapConfig.map);
        }

        mapContainer = $(mapContainer);

        // get map data
        var mapData = mapContainer.getMapData();

        if(mapData !== false){
            // map data available -> map not locked by update counter :)
            var currentSystemData = mapData.data.systems;
            var currentConnectionData = mapData.data.connections;

            // update systems ===========================================================

            for(var i = 0; i < mapConfig.data.systems.length; i++){
                var systemData = mapConfig.data.systems[i];

                // add system
                var addNewSystem = true;

                for(var k = 0; k < currentSystemData.length; k++){
                    if(currentSystemData[k].id === systemData.id){

                        if( currentSystemData[k].updated < systemData.updated ){
                            // system changed -> update
                            mapContainer.getSystem(mapConfig.map, systemData);
                        }

                        addNewSystem = false;
                        break;
                    }
                }

                if( addNewSystem === true){
                    console.log('omg')
                    drawSystem(mapConfig.map, systemData);
                }
            }

            // check for systems that are gone -> delete system
            for(var a = 0; a < currentSystemData.length; a++){

                var deleteThisSystem = true;

                for(var b = 0; b < mapConfig.data.systems.length; b++){
                    var deleteSystemData = mapConfig.data.systems[b];

                    if(deleteSystemData.id === currentSystemData[a].id){
                        deleteThisSystem = false;
                        break;
                    }
                }

                if(deleteThisSystem === true){
                    // system not found -> delete system
                    deleteSystem(mapConfig.map, $('#' + config.systemIdPrefix + currentSystemData[a].id));
                }
            }

            // update connections =========================================================

            // set up default connections
            for(var j = 0; j < mapConfig.data.connections.length; j++){
                var connectionData = mapConfig.data.connections[j];

                // add connection
                var addNewConnection= true;

                for(var c = 0; c < currentConnectionData.length; c++){
                    if(currentConnectionData[c].id === connectionData.id){
                        // connection already exists -> check for updates

                        if(
                            currentConnectionData[c].updated < connectionData.updated && // has changed
                            ativeConnections[mapData.config.id][connectionData.id] !== undefined
                        ){
                            // connection changed -> update
                            var tempConnection = ativeConnections[mapData.config.id][connectionData.id];
                            updateConnection(tempConnection, connectionData, currentConnectionData[c]);
                        }

                        addNewConnection = false;
                        break;
                    }
                }

                if(addNewConnection === true){
                    drawConnection(mapConfig.map, connectionData);
                }
            }

            // check for connections that are gone -> delete connection
            for(var d = 0; d < currentConnectionData.length; d++){

                var deleteThisConnection = true;

                for(var e = 0; e < mapConfig.data.connections.length;e++){
                    var deleteConnectionData = mapConfig.data.connections[e];

                    if(deleteConnectionData.id === currentConnectionData[d].id){
                        deleteThisConnection = false;
                        break;
                    }
                }
                deleteThisConnection = true;
                if(
                    deleteThisConnection === true &&
                    ativeConnections[mapData.config.id][currentConnectionData.id] !== undefined
                ){
                    // connection not found -> delete connection
                    var deleteConnection = ativeConnections[mapData.config.id][currentConnectionData.id];
                    mapConfig.map.detach(deleteConnection);
                }

            }

            // repaint all connections because of some strange visual bugs -_-
            mapConfig.map.repaintEverything();

        }

    };

    /**
     * mark a system as source
     * @param map
     * @param system
     */
    var makeSource = function(map, system){

        // get scope from map defaults
        var sourceConfig = globalMapConfig.source;
        sourceConfig.scope = map.Defaults.Scope;    // set all allowed connections for this scopes

        map.makeSource(system, sourceConfig);


    };

    /**
     * mark a system as target
     * @param map
     * @param system
     */
    var makeTarget = function(map, system){

        // get scope from map defaults
        var targetConfig = globalMapConfig.target;
        targetConfig.scope = map.Defaults.Scope;    // set all allowed connections for this scopes

        map.makeTarget(system, targetConfig);
    };

    /**
     * checks if json system data is valid
     * @param systemData
     * @returns {boolean}
     */
    var isValidSystem = function(systemData){

        var isValid = true;

        if(
            ! systemData.hasOwnProperty('name') ||
            systemData.name.length === 0
        ){
            return false;
        }

        return isValid;
    };

    /**
     * draw a system with its data to a map
     * @param map object
     * @param systemData
     * @param {String[]} optional Systems for connection
     */
    var drawSystem = function(map, systemData, connectedSystems){

        // check if systemData is valid
        if(isValidSystem(systemData)){
            var mapContainer = $(map.getContainer());

            // get System Element by data
            var newSystem = mapContainer.getSystem(map, systemData);
console.log('test')
            // add new system to map
            mapContainer.append(newSystem);

            // make new system editable
            makeEditable(newSystem);

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
                        source: $(connectSystem).data('id'),
                        target: $(newSystem).data('id'),
                        type: ['wh']
                    };
                    drawConnection(map, connectionData);
                });
            }
        }
    };

    /**
     * delete a system with all its connections
     * @param map
     * @param system
     */
    var deleteSystem = function(map, system){

        system = $(system);

        // detach all connections
        map.detachAllConnections(system);

        // delete all endpoints
        map.removeAllEndpoints(system);

        // hide tooltip
        toggleSystemTooltip(system, 'hide');

        // remove system
        system.fadeOut(300, function(){
            $(this).remove() ;
        });
    };

    /**
     * make a system name editable by x-editable
     * @param system
     */
    var makeEditable = function(system){

        var headElement = $(system).find('.' + config.systemHeadNameClass);

        $(headElement).editable({
            mode: 'popup',
            type: 'text',
            title: 'system name',
            placement: 'top',
            onblur: 'submit',
            toggle: 'dblclick',
            showbuttons: false
        });


        // update z-index for system, editable field should be on top
        $(headElement).on('shown', function(e, editable) {
            updateZIndex(system);
        });
    };

    /**
     * get map Overlay element by any element within a specific map
     * @returns {*}
     */
    $.fn.getMapOverlay = function(){

        return $(this).parents('.' + config.mapWrapperClass).find('.' + config.mapOverlayClass);
    };

    /**
     * get the map counter chart by an overlay
     * @returns {*}
     */
    $.fn.getMapCounter = function(){

        var mapOverlay = $(this);

        return mapOverlay.find('.' + Init.classes.pieChart.pieChartMapCounterClass);
    };

    /**
     * draws the map update counter to the map overlay
     * @param percent
     * @returns {*}
     */
    $.fn.setMapUpdateCounter = function(percent, value){

        var mapOverlay = $(this);

        // check if counter already exists
        var counterChart = mapOverlay.getMapCounter();

        if(counterChart.length === 0){
            // create new counter

            counterChart = $('<div>', {
                class: [Init.classes.pieChart.class, Init.classes.pieChart.pieChartMapCounterClass].join(' ')
            }).attr('data-percent', percent).append(
                $('<span>', {
                    text: value
                })
            );

            mapOverlay.append(counterChart);

            // init counter
            counterChart.initMapUpdateCounter();

            // set tooltip
            mapOverlay.attr('data-toggle', 'tooltip');
            mapOverlay.attr('data-placement', 'left');
            mapOverlay.attr('title', 'update counter');
            mapOverlay.tooltip();
        }

        return counterChart;
    };

    /**
     * start the map update counter or reset
     */
    $.fn.startMapUpdateCounter = function(){

        var mapOverlay = $(this);
        var counterChart = mapOverlay.getMapCounter();

        var seconds = 10;

        // get counter interval (in case there is an active one)
        var interval = counterChart.data('interval');

        if(interval){
            clearInterval(interval);
        }

        mapOverlay.fadeIn(200);

        var counterChartLabel = counterChart.find('span');

        var percentPerCount = 100 / seconds;

        var timer = function(){
            seconds--;

            counterChart.data('easyPieChart').update( percentPerCount * seconds);
            counterChartLabel.text(seconds);
            if(seconds <= 0){
                clearInterval(mapUpdateCounter);


                setTimeout(function(){
                    mapOverlay.fadeOut(200);
                    counterChart.data('interval', false);
                }, 800);

                return;
            }
        };

        // start timer
        var mapUpdateCounter = setInterval(timer, 1000);
        counterChart.data('easyPieChart').update( percentPerCount * seconds);
        counterChartLabel.text(seconds);

        // store counter
        counterChart.data('interval', mapUpdateCounter);

    };

    /**
     * update z-index for a system (dragged sytems should be always on top)
     * @param system
     */
    var updateZIndex = function(system){

        var newZIndexSystem = config.zIndexCounter++;
        $(system).css('z-index', newZIndexSystem);
    };

    /**
     * get all connections of multiple systems
     * @param map
     * @param systems
     * @returns {Array}
     */
    var getConnections = function(map, systems){

        var connections = [];

        var withBackConnection = false;

        $.each(systems, function(i, system){
            // get connections where system is source
            connections = connections.concat( map.getConnections({source: system}) );

            if(withBackConnection === true){
                // get connections where system is target
                connections = connections.concat( map.getConnections({target: system}) );
            }

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

        connections = connections.concat( map.getConnections({scope: '*', source: systemA, target: systemB}) );
        // get connections where system is target
        connections = connections.concat( map.getConnections({scope: '*', source: systemB, target: systemA}) );

        return connections;
    };

    /**
     * connect two systems
     * @param mapConfig
     * @param connectionData
     * @returns new connection
     */
    var drawConnection = function(map, connectionData){

        var mapContainer = $( map.getContainer() );
        var mapId = mapContainer.data('id');

        // connection id
        var connectionId = 0;
        if(connectionData.id){
            connectionId = connectionData.id;
        }

        // connection have the default map Scope scope
        var scope = map.Defaults.Scope;
        if(connectionData.scope){
            scope = connectionData.scope;
        }

        var connection = map.connect({
            source: config.systemIdPrefix + mapId + '-' + connectionData.source,
            target: config.systemIdPrefix + mapId + '-' + connectionData.target,
            scope: scope,
            parameters: {
                connectionId: connectionId
            }
            /* experimental (straight connections)
            anchors: [
                [ "Perimeter", { shape: 'Rectangle' }],
                [ "Perimeter", { shape: 'Rectangle' }]
            ]
            */
        });

        // add connection types
        if(connectionData.type){
            for(var i = 0; i < connectionData.type.length; i++){
                connection.addType(connectionData.type[i]);
            }
        }

        // set Observer for new Connection
        setConnectionObserver(map, connection);


        return connection;
    };

    /**
     * compares the current data and new data of a connection and updates status
     * @param connection
     * @param connectionData
     * @param newConnectionData
     */
    var updateConnection = function(connection, connectionData, newConnectionData){

        var map = connection._jsPlumb.instance;

        // check scope
        if(connectionData.scope !== newConnectionData.scope){
            setConnectionScope(connection, newConnectionData.scope);
        }

        var addType = $(newConnectionData.type).not(connectionData.type).get();
        var removeType = $(connectionData.type).not(newConnectionData.type).get();

        // add types
        for(var i = 0; i < addType.length; i++){
            if(
                addType[i].indexOf('fresh') !== -1 ||
                addType[i].indexOf('reduced') !== -1 ||
                addType[i].indexOf('critical') !== -1
            ){
                setConnectionWHStatus(connection, addType[i]);
            }else if( connection.hasType(addType[i]) !== true ){
                // additional types e.g. eol, frig, preserve mass
                connection.addType(addType[i]);
                setConnectionObserver(map, connection);
            }
        }

        // remove types
        for(var j = 0; j < removeType.length; j++){
            if(
                removeType[j] === 'wh_eol' ||
                removeType[j] === 'frigate' ||
                removeType[j] === 'preserve_mass'
            ){
                connection.removeType(removeType[j]);
                setConnectionObserver(map, connection);
            }
        }
    };

    /**
     * set/change connection scope
     * @param connection
     * @param scope
     */
    var setConnectionScope = function(connection, scope){

        var map = connection._jsPlumb.instance;

        // remove all connection types
        connection.clearTypes();

        // set new new connection type
        connection.addType(scope);

        // change scope
        connection.scope = scope;

        setConnectionObserver(map, connection);
    };

    /**
     * set/change connection status of a wormhole
     * @param connection
     * @param status
     */
    var setConnectionWHStatus = function(connection, status){

        var map = connection._jsPlumb.instance;

        if(
            status === 'wh_fresh' &&
            connection.hasType('wh_fresh') !== true
        ){
            connection.removeType('wh_reduced');
            connection.removeType('wh_critical');
            connection.addType('wh_fresh');
            setConnectionObserver(map, connection);
        }else if(
            status === 'wh_reduced' &&
            connection.hasType('wh_reduced') !== true
        ){
            connection.removeType('wh_fresh');
            connection.removeType('wh_critical');
            connection.addType('wh_reduced');
            setConnectionObserver(map, connection);
        }else if(
            status === 'wh_critical' &&
            connection.hasType('wh_critical') !== true
        ){
            connection.removeType('wh_fresh');
            connection.removeType('wh_reduced');
            connection.addType('wh_critical');
            setConnectionObserver(map, connection);
        }else if(
            status === 'wh_eol' &&
            connection.hasType('wh_eol') !== true
        ){
            connection.addType('wh_eol');
            setConnectionObserver(map, connection);
        }else if(
            status === 'wh_eol' &&
                connection.hasType('wh_eol') !== true
            ){
            connection.addType('wh_eol');
            setConnectionObserver(map, connection);
        }

    };

    /**
     * load context menu template for map
     */
    var initMapContextMenu = function(){

        var moduleConfig = {
            name: 'modules/contextmenu',
            position: $('#' + config.dynamicElementWrapperId)
        };

        var moduleData = {
            id: config.mapContextMenuId,
            items: [
                {icon: 'fa-info', action: 'info', text: 'info'},
                {icon: 'fa-plus', action: 'add_system', text: 'add system'},
                {icon: 'fa-filter', action: 'filter_scope', text: 'filter scope', subitems: [
                    {subIcon: '', subAction: 'filter_wh', subText: 'wormhole'},
                    {subIcon: '', subAction: 'filter_stargate', subText: 'stargate'},
                    {subIcon: '', subAction: 'filter_jumpbridge', subText: 'jumpbridge'}
                ]},
                {divider: true, action: 'delete_systems'},
                {icon: 'fa-eraser', action: 'delete_systems', text: 'delete systems'}
            ]
        };

        Render.showModule(moduleConfig, moduleData);
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
                {icon: 'fa-info', action: 'info', text: 'info'},
                {icon: 'fa-plane', action: 'frigate', text: 'frigate hole'},
                {icon: 'fa-warning', action: 'preserve_mass', text: 'preserve mass'},
                {icon: 'fa-crosshairs', action: 'change_scope', text: 'change scope', subitems: [
                    {subIcon: '', subAction: 'scope_wh', subText: 'wormhole'},
                    {subIcon: '', subAction: 'scope_stargate', subText: 'stargate'},
                    {subIcon: '', subAction: 'scope_jumpbridge', subText: 'jumpbridge'}

                ]},
                {icon: 'fa-reply fa-rotate-180', action: 'change_status', text: 'change status', subitems: [
                    {subIcon: 'fa-clock-o', subAction: 'wh_eol', subText: 'toggle EOL'},
                    {subDivider: true},
                    {subIcon: 'fa-circle', subAction: 'status_fresh', subText: 'stage 0 (fresh)'},
                    {subIcon: 'fa-adjust', subAction: 'status_reduced', subText: 'stage 1 (reduced)'},
                    {subIcon: 'fa-circle-o', subAction: 'status_critical', subText: 'stage 2 (critical)'}

                ]},
                {divider: true, action: 'delete_connection'},
                {icon: 'fa-eraser', action: 'delete_connection', text: 'delete'}
            ]
        };

        Render.showModule(moduleConfig, moduleData);

    };

    /**
     * load contextmenu template for systems
     */
    var initSystemContextMenu = function(){

        var systemStatus = [];
        $.each(Init.classes.systemStatus, function(status, statusData){
            var tempStatus = {
                subIcon: 'fa-circle',
                subIconClass: statusData.class,
                subAction: 'change_status_' + status,
                subText: statusData.label
            };
            systemStatus.push(tempStatus);
        });

        var moduleConfig = {
            name: 'modules/contextmenu',
            position: $('#' + config.dynamicElementWrapperId)
        };

        var moduleData = {
            id: config.systemContextMenuId,
            items: [
                {icon: 'fa-plus', action: 'add_system', text: 'add system'},
                {icon: 'fa-lock', action: 'lock_system', text: 'lock system'},
                {icon: 'fa-users', action: 'set_rally', text: 'set rally point'},
                {icon: 'fa-reply fa-rotate-180', text: 'change status', subitems: systemStatus},
                {divider: true, action: 'delete_system'},
                {icon: 'fa-eraser', action: 'delete_system', text: 'delete system'}
            ]
        };

        Render.showModule(moduleConfig, moduleData);

    };

    /**
     * set up context menu for all Systems within a given map
     * @param endpoints
     */
    var setSystemObserver = function(map, system){

        system = $(system);

        // get map container
        var mapContainer = $( map.getContainer() );

        var systemHeadExpand = $( system.find('.' + config.systemHeadExpandClass) );
        var systemBody = $( system.find('.' + config.systemBodyClass) );

        var bodyItemHeight = 16;

        // make system draggable
        map.draggable(system, {
            containment: 'parent',
            constrain: true,
            filter: '.' + config.systemHeadNameClass,               // disable drag on "system name"
            scope: 'wh',
            start: function(params){
                var dragSystem = $(params.el);

                // start map update timer
                dragSystem.getMapOverlay().startMapUpdateCounter();

                // check if grid-snap is enable
                if(config.mapSnapToGrid){
                    params.drag.params.grid = [20, 20];
                }else{
                    delete( params.drag.params.grid );
                }

                // stop "system click event" right after drop event is finished
                dragSystem.addClass('no-click');

                // drag system is not always selected
                var selectedSystems = mapContainer.getSelectedSystems().get();
                selectedSystems = selectedSystems.concat( dragSystem.get() );
                selectedSystems = $.unique( selectedSystems );

                // hide tooltip
                toggleSystemTooltip( selectedSystems, 'hide' );
            },
            drag: function(){

            },
            stop: function(params){
                var dragSystem = $(params.el);

                // start map update timer
                dragSystem.getMapOverlay().startMapUpdateCounter();

                setTimeout(function(){
                    dragSystem.removeClass('no-click');
                }, 200);

                // render tooltip
                toggleSystemTooltip([dragSystem], 'show');

                // drag system is not always selected
                var selectedSystems = mapContainer.getSelectedSystems().get();
                selectedSystems = selectedSystems.concat( dragSystem.get() );
                selectedSystems = $.unique( selectedSystems );

                // set new position for popover edit field (system name)
                for(var i = 0; i < selectedSystems.length; i++){
                    var tempSystem = $(selectedSystems[i]);
                    var tempPosition = tempSystem.position();

                    var placement = 'top';
                    if(tempPosition.top < 100){
                        placement = 'bottom';
                    }
                    if(tempPosition.left < 100){
                        placement = 'right';
                    }

                    tempSystem.find('.' + config.systemHeadNameClass).editable('option', 'placement', placement);
                }

            }
        });

        if(system.data('locked') === true){
            map.setDraggable(system, false);
        }

        // init system tooltips ================================================================
        var systemTooltipOptions = {
            toggle: 'tooltip',
            placement: 'right',
            viewport: system.id
        };

        system.find('.fa').tooltip(systemTooltipOptions);

        // init system body expand ============================================================
        systemHeadExpand.hoverIntent(function(e){
            // hover in
            var hoverSystem = $(this).parents('.' + config.systemClass);
            var hoverSystemId = hoverSystem.attr('id');

            // get ship counter and calculate expand height
            var shipCounter = parseInt( system.attr('data-original-title') );

            var expandheight = shipCounter * bodyItemHeight;

            systemBody.animate(
                {
                    height: expandheight + 'px',
                    width: '100%',
                    'min-width': '150px'
                },
                {
                   // queue:false,
                    duration: 100,
                    step: function(){
                        // repaint connections of current system
                        map.revalidate( hoverSystemId );
                    },
                    complete: function(){
                        map.revalidate( hoverSystemId );
                        $(this).find('.' + config.systemBodyRightClass).show();
                    }
                }
            );
        }, function(e){
            // hover out
            var hoverSystem = $(this).parents('.' + config.systemClass);
            var hoverSystemId = hoverSystem.attr('id');

            systemBody.animate(
                {
                    height: '16px',
                    width: '100%',
                    'min-width': '60px'
                },
                {
                  //  queue:false,
                    duration: 100,
                    step: function(){
                        // repaint connections of current system
                        map.revalidate( hoverSystemId );
                        $(this).find('.' + config.systemBodyRightClass).hide();
                    },
                    start: function(){
                        $(this).find('.' + config.systemBodyRightClass).hide();
                    },
                    complete: function(){
                        map.revalidate( hoverSystemId );
                    }
                }
            );
        });

        // context menu ==================================================================

        // trigger context menu
        system.on('contextmenu', function(e){
            e.preventDefault();
            e.stopPropagation();

            var systemElement = $(this);

            // hide all map tooltips
            var hideOptions = getHiddenContextMenuOptions(systemElement);

            var activeOptions = getActiveContextMenuOptions(systemElement);

            $(e.target).trigger('pf:openContextMenu', [e, this, hideOptions, activeOptions]);
            return false;
        });

        // init context menu
        system.contextMenu({
            menuSelector: "#" + config.systemContextMenuId,
            menuSelected: function (params) {

                // click action
                var action = params.selectedMenu.attr('data-action');

                // current system
                var currentSystem = $(params.component);

                // system name
                var currentSystemName = currentSystem.getSystemInfo( ['alias'] );

                switch(action){
                    case 'add_system':
                        // add a new system
                        showNewSystemDialog(map, {sourceSystem: currentSystem} );

                        break;
                    case 'lock_system':
                        // lock system

                        currentSystem.toggleLockSystem(true, {map: map});

                        // repaint connections, -> system changed its size!
                        map.repaint( currentSystem );
                        break;
                    case 'set_rally':
                        // set rally point

                        if( ! currentSystem.data( 'rally' ) ){

                            // show confirm dialog
                            var rallyDialog = bootbox.dialog({
                                message: 'Do you want to poke active pilots?',
                                title: 'Set rally point for system "' + currentSystemName + '"',
                                buttons: {
                                    close: {
                                        label: 'cancel',
                                        className: 'btn-default',
                                        callback: function(){
                                            $(rallyDialog).modal('hide');
                                        }
                                    },
                                    setRallyPoke: {
                                        label: '<i class="fa fa-fw fa-bullhorn"></i> Set rally and poke',
                                        className: 'btn-info',
                                        callback: function() {
                                            currentSystem.toggleRallyPoint(true, {});
                                        }
                                    },
                                    setRallay: {
                                        label: '<i class="fa fa-fw fa-users"></i> Set rally',
                                        className: 'btn-primary',
                                        callback: function() {
                                            currentSystem.toggleRallyPoint(false, {});
                                        }
                                    }
                                }
                            });
                        }else{
                            // remove rally point
                            currentSystem.toggleRallyPoint(false, {});
                        }
                        break;
                    case 'change_status_unknown':
                    case 'change_status_friendly':
                    case 'change_status_occupied':
                    case 'change_status_hostile':
                    case 'change_status_empty':
                    case 'change_status_unscanned':
                        // change system status
                        currentSystem.getMapOverlay().startMapUpdateCounter();

                        var statusString = action.split('_');

                        currentSystem.setSystemStatus(statusString[2]);
                        break;
                    case 'delete_system':
                        // confirm dialog
                        bootbox.confirm('Delete system and all its connections?', function(result) {
                            if(result){
                                $(currentSystem).getMapOverlay().startMapUpdateCounter();


                                var systemName = currentSystem.getSystemInfo(['alias']);
                                deleteSystem(map, currentSystem);

                                Util.showNotify({title: 'System deleted', text: systemName, type: 'success'});
                            }
                        });

                        break;
                }

            }
        });

        // load system data =================================================================================
        system.on('click', function(e){

            var system = $(this);

            // left mouse button
            if(e.which === 1){

                if(! system.hasClass('no-click')){
                    if(e.ctrlKey === true){
                        // select system
                        system.toggleSelectSystem(map);
                    }else{

                        // activate system
                        markSystemActive(map, system);

                        // get parent Tab Content and fire update event
                        var tabContentElement = getTabContentElementByMapElement( system );

                        var data = {
                            system: system
                        };

                        $(tabContentElement).trigger('pf:updateSystemData', [data]);
                    }
                }

            }
        });


    };

    /**
     * toggle select status of a system
     */
    $.fn.toggleSelectSystem = function(map){
        var system = $(this);

        if( system.data('locked') !== true ){

            if( system.hasClass( config.systemSelectedClass ) ){
                system.removeClass( config.systemSelectedClass );

                map.removeFromDragSelection(system);
            }else{
                system.addClass( config.systemSelectedClass );
                map.addToDragSelection(system);
            }

        }else{
            var systemName = system.getSystemInfo( ['alias'] );

            Util.showNotify({title: 'System is locked', text: systemName, type: 'error'});
        }

    };

    /**
     * get all selected (NOT active) systems in a map
     * @returns {*}
     */
    $.fn.getSelectedSystems = function(){

        var mapElement = $(this);

        var systems = mapElement.find('.' + config.systemSelectedClass);

        return systems;
    };

    /**
     * toggle log status of a system
     * @param poke
     * @param options
     */
    $.fn.toggleLockSystem = function(poke, options){

        var system = $(this);

        var map = options.map;

        var hideNotification = false;
        if(options.hideNotification === true){
            hideNotification = true;
        }

        var hideCounter = false;
        if(options.hideCounter === true){
            hideCounter = true;
        }

        var systemName = system.getSystemInfo( ['alias'] );

        if( system.data( 'locked' ) === true ){
            system.data('locked', false);
            system.removeClass( config.systemLockedClass );

            // enable draggable
            map.setDraggable(system, true);

            if(! hideNotification){
                Util.showNotify({title: 'System lock removed', text: 'System: ' + systemName, type: 'success'});
            }
        }else{
            system.data('locked', true);
            system.addClass( config.systemLockedClass );

            // enable draggable
            map.setDraggable(system, false);

            if(! hideNotification){
                Util.showNotify({title: 'System is locked', text: 'System: ' + systemName,  type: 'success'});
            }
        }

        // repaint connectioons
        map.revalidate( system.attr('id') );


        if(! hideCounter){
            $(system).getMapOverlay().startMapUpdateCounter();
        }

    };

    /**
     * toggle a system as rally point and display notifications
     * @param poke
     * @param options
     */
    $.fn.toggleRallyPoint = function(poke, options){

        var system = $(this);

        var rallyClass = Util.getInfoForSystem('rally', 'class');

        var hideNotification = false;
        if(options.hideNotification === true){
            hideNotification = true;
        }

        var hideCounter = false;
        if(options.hideCounter === true){
            hideCounter = true;
        }

        // check of system is already marked as rally
        if( system.data( 'rally' ) === true ){
            system.removeClass( rallyClass );
            system.data( 'rally', false );

            if(! hideNotification){
                Util.showNotify({title: 'Rally point removed', type: 'success'});
            }
        }else{
            system.addClass( rallyClass );
            system.data( 'rally', true );

            if(! hideNotification){
                var systemName = system.getSystemInfo( ['alias'] );

                var notificationOptions = {
                    title: 'Rally Point',
                    text: 'System: ' + systemName,
                    type: 'success'
                };

                if(poke === true){
                    // desktop poke
                    Util.showNotify(notificationOptions, {desktop: true, stack: 'barBottom'});
                }else{
                    Util.showNotify(notificationOptions, {stack: 'barBottom'});
                }
            }

        }

        if(! hideCounter){
            $(system).getMapOverlay().startMapUpdateCounter();
        }

    };

    /**
     * get all TabContentElements
     * @returns {*|HTMLElement}
     */
    var getTabContentElements = function(){
        return $('.' + config.mapTabContentClass);
    };

    /**
     * get TabContentElement by any element on a map e.g. system
     * @param element
     * @returns {*}
     */
    var getTabContentElementByMapElement = function(element){
        var tabContentElement = $(element).parents('.' + config.mapTabContentClass);
        return tabContentElement;
    };

    /**
     * set observer for a map container
     * @param map
     */
    var setMapObserver = function(map){

        // get map container
        var mapContainer = map.getContainer();

        $(mapContainer).bind('contextmenu', function(e){
            e.preventDefault();
            e.stopPropagation();

            // make sure map is clicked and NOT a connection
            if($(e.target).hasClass( config.mapClass )){
                var mapElement = $(this);

                var hideOptions = getHiddenContextMenuOptions(mapElement);

                var activeOptions = getActiveContextMenuOptions(mapElement);

                $(e.target).trigger('pf:openContextMenu', [e, mapElement, hideOptions, activeOptions]);
            }

            return false;
        });

        $(mapContainer).contextMenu({
            menuSelector: "#" + config.mapContextMenuId,
            menuSelected: function (params) {

                // click action
                var action = params.selectedMenu.attr('data-action');

                // current map
                var currentMapElement = $(params.component);

                var currentMapId = parseInt( currentMapElement.data('id') );

                // get map instance
               var currentMap = getMapInstance(currentMapId);

                // click position
                var position = params.position;

                switch(action){
                    case 'add_system':
                        // add new system dialog
                        showNewSystemDialog(currentMap, {position: position});
                        break;
                    case 'filter_wh':
                    case 'filter_stargate':
                    case 'filter_jumpbridge':
                        // filter (show/hide)
                        var filterScope = action.split('_')[1];

                        // scope label
                        var filterScopeLabel = Util.getScopeInfoForMap(filterScope, 'label');

                        var showScope = true;
                        if(
                            currentMapElement.data('filter_scope') &&
                            currentMapElement.data('filter_scope') === filterScope
                        ){
                            currentMapElement.data('filter_scope', false);
                            showScope = false;
                        }else{
                            currentMapElement.data('filter_scope', filterScope);
                        }

                        $.each(currentMap.getAllConnections(filterScope), function(idx, tempConnection) {
                            var tempEndpoints = tempConnection.endpoints;
                            var setVisible = true;

                            if(
                                showScope &&
                                tempConnection.scope !== filterScope
                            ){
                                setVisible = false;
                            }


                            for(var i = 0; i < tempEndpoints.length; i++){
                                tempEndpoints[i].setVisible( setVisible );
                            }
                        });

                        Util.showNotify({title: 'Scope filter changed', text: filterScopeLabel, type: 'success'});

                        break;
                    case 'delete_systems':
                        // delete all selected systems with its connections
                        var selectedSystems = $(currentMapElement).getSelectedSystems();

                        if(selectedSystems.length > 0){
                            bootbox.confirm('Delete ' + selectedSystems.length + ' selected systems and its connections?', function(result) {
                                if(result){
                                    currentMapElement.getMapOverlay().startMapUpdateCounter();

                                    for(var i = 0; i < selectedSystems.length; i++){
                                        deleteSystem(currentMap, selectedSystems[i]);
                                    }

                                    Util.showNotify({title: selectedSystems.length + ' systems deleted', type: 'success'});
                                }
                            });
                        }else{
                            Util.showNotify({title: 'No systems selected', type: 'error'});
                        }

                        break;
                    case 'info':
                        // open map info dialog
                        $(document).triggerMenuEvent('ShowMapInfo');
                        break;

                }

            }

        });

        // init drag-frame selection
        $(mapContainer).dragToSelect({
            selectables: '.' + config.systemClass,
            onHide: function (selectBox, deselectedSystems) {
                var selectedSystems = $(mapContainer).getSelectedSystems();

                if(selectedSystems.length > 0){
                    // make all selected systems draggable
                    Util.showNotify({title: selectedSystems.length + ' systems selected', type: 'success'});

                    // convert former group draggable systems so single draggable
                    for(var i = 0; i < selectedSystems.length; i++){
                        map.addToDragSelection( selectedSystems[i] );
                    }
                }

                // convert former group draggable systems so single draggable
                for(var j = 0; j < deselectedSystems.length; j++){
                    map.removeFromDragSelection( deselectedSystems[j] );
                }

            },
            onShow: function(){
                $(document).trigger('pf:closeMenu', [{}]);
            },
            onRefresh: function(){
            }
        });




        // catch menu events ====================================================

        // toggle "snap to grid" option
        $(mapContainer).on('pf:menuGrid', function(e, data){
            config.mapSnapToGrid = !config.mapSnapToGrid;

            // toggle grid class
            $(this).toggleClass(config.mapGridClass);

            // toggle button class
            $(data.button).toggleClass('active');

            var notificationText = 'disabled';
            if(config.mapSnapToGrid){
                notificationText = 'enabled';
            }

            Util.showNotify({title: 'Grid snapping', text: notificationText, type: 'info'});

        });

    };

    /**
     * get hidden menu entry options for a context menu
     * @param component
     * @returns {Array}
     */
    var getHiddenContextMenuOptions = function(component){

        var hiddenOptions = [];

        if(component instanceof jsPlumb.Connection){
            // disable connection menu entries

            var scope = component.scope;

            if(scope === 'stargate'){
                hiddenOptions.push('frigate');
                hiddenOptions.push('preserve_mass');
                hiddenOptions.push('change_status');

                hiddenOptions.push('scope_stargate');
            }else if(scope === 'jumpbridge'){
                hiddenOptions.push('frigate');
                hiddenOptions.push('change_status');
                hiddenOptions.push('scope_jumpbridge');
            }else if(scope === 'wh'){
                hiddenOptions.push('scope_wh');
            }

        }else if( component.hasClass(config.systemClass) ){
            // disable system menu entries
            if(component.data('locked') === true){
                hiddenOptions.push('delete_system');
            }
        }

        return hiddenOptions;
    };

    /**
     * get active menu entry options for a context menu
     * @param component
     * @returns {Array}
     */
    var getActiveContextMenuOptions = function(component){

        var activeOptions = [];

        if(component instanceof jsPlumb.Connection){
            var scope = component.scope;

            if(component.hasType('wh_eol') === true){
                activeOptions.push('wh_eol');
            }

            if(component.hasType('frigate') === true){
                activeOptions.push('frigate');
            }
            if(component.hasType('preserve_mass') === true){
                activeOptions.push('preserve_mass');
            }
            if(component.hasType('wh_reduced') === true){
                activeOptions.push('status_reduced');
            }else if(component.hasType('wh_critical') === true){
                activeOptions.push('status_critical');
            }else{
                // not reduced is default
                activeOptions.push('status_fresh');

            }

        }else if( component.hasClass(config.mapClass) ){

            // active map menu entries
            if(component.data('filter_scope') === 'wh'){
                activeOptions.push('filter_wh');
            }
            if(component.data('filter_scope') === 'stargate'){
                activeOptions.push('filter_stargate');
            }
            if(component.data('filter_scope') === 'jumpbridge'){
                activeOptions.push('filter_jumpbridge');
            }
        }else if( component.hasClass(config.systemClass) ){
            // active system menu entries
            if(component.data('locked') === true){
                activeOptions.push('lock_system');
            }
            if(component.data('rally') === true){
                activeOptions.push('set_rally');
            }
        }

        return activeOptions;
    };

    /**
     * set observer for a given connection
     * @param map
     * @param connection
     */
    var setConnectionObserver = function(map, connection){

        // get map container
        var mapElement = $( map.getContainer() );

        connection.bind('contextmenu', function(component, e) {
            e.preventDefault();
            e.stopPropagation();

            // trigger menu "open

            // get invisible menu entries
            var hideOptions = getHiddenContextMenuOptions(component);

            var activeOptions = getActiveContextMenuOptions(component);

            $(e.target).trigger('pf:openContextMenu', [e, component, hideOptions, activeOptions]);

            return false;
        });

        /**
         *  init context menu for all connections
         *  must be triggered manually on demand
         */

        $(connection.canvas).contextMenu({
            menuSelector: "#" + config.connectionContextMenuId,
            menuSelected: function (params){

                var action = params.selectedMenu.attr('data-action');
                var activeConnection = params.component;
                var activeScope = activeConnection.scope;
                var activeScopeName = Util.getScopeInfoForMap(activeScope, 'label');

                switch(action){
                    case 'delete_connection':
                        // delete a single connection

                        // confirm dialog
                        bootbox.confirm('Is this connection really gone?', function(result) {
                            if(result){
                                mapElement.getMapOverlay().startMapUpdateCounter();

                                map.detach(params.component);
                            }
                        });
                        break;
                    case 'frigate':         // set as frigate hole
                    case 'preserve_mass':   // set "preserve mass
                    case 'wh_eol':          // set "end of life"

                        mapElement.getMapOverlay().startMapUpdateCounter();

                        activeConnection.toggleType( action );
                        // for some reason  a new observer is needed ?!
                        setConnectionObserver(map, activeConnection);
                        break;
                    case 'status_fresh':
                    case 'status_reduced':
                    case 'status_critical':
                        var newStatus = action.split('_')[1];
                        mapElement.getMapOverlay().startMapUpdateCounter();

                        setConnectionWHStatus(activeConnection, 'wh_' + newStatus);
                        break;
                    case 'scope_wh':
                    case 'scope_stargate':
                    case 'scope_jumpbridge':

                        var newScope = action.split('_')[1];
                        var newScopeName =  Util.getScopeInfoForMap( newScope, 'label');

                        bootbox.confirm('Change scope from ' + activeScopeName + ' to ' + newScopeName + '?', function(result) {
                            if(result){

                                mapElement.getMapOverlay().startMapUpdateCounter();

                                setConnectionScope(activeConnection, newScope);

                                var scopeLabel = Util.getScopeInfoForMap(newScope, 'label');

                                Util.showNotify({title: 'Connection scope changed', text: 'New scope: ' + scopeLabel, type: 'success'});
                            }
                        });

                        break;
                    case 'info':
                        console.log('info');
                        break;
                }

            }
        });

    };

    /**
     * mark a system as active
     * @param map
     * @param system
     */
    var markSystemActive = function(map, system){

        // deactivate all systems in map
        var mapContainer = $( map.getContainer() );

        mapContainer.find('.' + config.systemClass).removeClass(config.systemActiveClass);

        // set current system active
        system.addClass(config.systemActiveClass);
    };

    /**
     * get system data out of its object
     * @param info
     * @returns {*}
     */
    $.fn.getSystemInfo = function(info){

        var systemInfo = [];

        for(var i = 0; i < info.length; i++){
            switch(info[i]){
                case 'alias':
                    // get current system alias
                    systemInfo.push( $(this).find('.' + config.systemHeadNameClass).text() );
                    break;
                default:
                    systemInfo.push('bad system query');
            }

        }

        if(systemInfo.length === 1){
            return systemInfo[0];
        }else{
            return systemInfo;
        }

    };

    /**
     * open "new system" dialog and add the system to map
     * optional the new system is connected to a "sourceSystem" (if available)
     *
     * @param map
     * @param options
     */
    var showNewSystemDialog = function(map, options){

        var mapContainer = $(map.getContainer());

        // format system status for form select
        var systemStatus = {};

        $.each(Init.classes.systemStatus, function(status, statusData){
            //statusData.status = status;
            //systemStatus.push(statusData);
            systemStatus[status] = statusData.label;
        });


        var data = {
            id: config.systemDialogId,
            system: 'lalala',
            status: systemStatus
        };

        requirejs(['text!templates/modules/system_dialog.html', 'lib/mustache'], function(template, Mustache) {

            var content = Mustache.render(template, data);

            var systemDialog = bootbox.dialog({
                    title: 'Add new system',
                    message: content,
                    buttons: {
                        close: {
                            label: 'cancel',
                            className: 'btn-default',
                            callback: function(){
                                $(systemDialog).modal('hide');
                            }
                        },
                        success: {
                            label: 'Add system',
                            className: 'btn-primary',
                            callback: function () {

                                mapContainer.getMapOverlay().startMapUpdateCounter();

                                // get form Values
                                var form = $('#' + config.systemDialogId).find('form');

                                var newSystemData = $(form).getFormValues();

                                var currentX = 0;
                                var currentY = 0;

                                var newPositon = {
                                    x: 0,
                                    y: 0
                                };

                                var sourceSystem = null;

                                // add new position
                                if(options.sourceSystem !== undefined){

                                    sourceSystem = options.sourceSystem;

                                    // related system is available
                                    currentX = sourceSystem.css('left');
                                    currentY = sourceSystem.css('top');

                                    // remove "px"
                                    currentX = parseInt( currentX.substring(0, currentX.length - 2) );
                                    currentY = parseInt( currentY.substring(0, currentY.length - 2) );

                                    newPositon = {
                                        x: currentX + config.newSystemOffset.x,
                                        y: currentY + config.newSystemOffset.y
                                    };
                                }else{
                                    // check mouse cursor position (add system to map)
                                    newPositon = {
                                        x: options.position.x,
                                        y: options.position.y
                                    };
                                }

                                newSystemData.position = newPositon;

                                // TODO request missing system data
                                if(!newSystemData.hasOwnProperty('id')){
                                    newSystemData.id = config.tempId++;
                                }
                                if(!newSystemData.hasOwnProperty('effect')){
                                    newSystemData.effect = '';
                                }
                                if(!newSystemData.hasOwnProperty('security')){
                                    newSystemData.security = 'H';
                                }

                                // draw new system to map
                                drawSystem(map, newSystemData, sourceSystem);
                            }
                        }

                    }
                }
            );

            // make dialog editable
            var modalFields = $('.bootbox .modal-dialog').find('.pf-editable-system-status');

            modalFields.editable({
                mode: 'inline',
                emptytext: 'unknown',
                onblur: 'submit',
                source: systemStatus
            });

        });


    };

    /**
     * updates all systems on map with current user Data (all users on this map)
     * update the Data of the user that is currently viewing the map (if available) -> In - game info
     * @param userData
     * @param currentUserData
     */
    $.fn.updateUserData = function(userData, currentUserData){

        // get all systems
        var systems = $(this).find('.' + config.systemClass);

        // get new map instance or load existing
        var map = getMapInstance(userData.config.id);

        // trigger reset event for all Tabs
        var tabContentElements = getTabContentElements();
        $(tabContentElements).trigger('pf:highlightTab', [{}]);

        // container must exist! otherwise systems cant be updated
        if(map.getContainer() !== undefined){

            for(var i = 0; i < systems.length; i++){
                // get user Data for System

                var system = $( systems[i] );

                var systemId = $(system).data('id');

                var tempUserData = null;
                for(var j = 0; j < userData.data.systems.length; j++){
                    var systemData = userData.data.systems[j];
                    // check if any user is in this system
                    if(systemId === systemData.id){
                        tempUserData = systemData;
                        break;
                    }
                }

                // check if user is currently in this system
                var tempCurrentUserData = null;
                if(
                    currentUserData &&
                    currentUserData.system.id === systemId
                ){
                    tempCurrentUserData = currentUserData;
                }

                system.updateSystemUserData(map, tempUserData, tempCurrentUserData);
            }
        }
    };

    /**
     * collect all data for export/save for a map
     * @returns {*}
     */
    $.fn.getMapData = function(forceData){

        var mapElement = $(this);

        var map = getMapInstance( mapElement.data('id') );

        var mapData = {};

        // check if there is an active map counter that prevents collecting map data
        var overlay = mapElement.getMapOverlay();
        var counterChart = overlay.getMapCounter();

        var interval = counterChart.data('interval');

        if(
            ! interval ||
            forceData === true
        ){
            // map config ---------------------------------
            var mapConfig = {};
            mapConfig.id = mapElement.data('id');
            mapConfig.name = mapElement.data('name');
            mapConfig.type = mapElement.data('type');
            mapData.config = mapConfig;

            // map data -----------------------------------
            var data = {};


            var systemsData = [];

            var systems = mapElement.find('.' + config.systemClass);

            for(var i = 0; i < systems.length; i++){

                // systems data ------------------------------------

                var tempSystem = $(systems[i]);
                var systemData = {};
                systemData.id = tempSystem.data('id');
                systemData.name = tempSystem.data('name');
                systemData.alias = tempSystem.getSystemInfo(['alias']);
                systemData.type = tempSystem.data('type');
                systemData.status = tempSystem.data('status');
                systemData.effect = tempSystem.data('effect');
                systemData.trueSec = tempSystem.data('trueSec');
                systemData.locked = tempSystem.data('locked');
                systemData.rally = tempSystem.data('rally');
                systemData.currentUser = tempSystem.data('currentUser');
                systemData.updated = tempSystem.data('updated');

                // position -------------------------------
                var positionData = {};
                var currentX = tempSystem.css('left');
                var currentY = tempSystem.css('top');

                // remove 'px'
                positionData.x = parseInt( currentX.substring(0, currentX.length - 2) );
                positionData.y = parseInt( currentY.substring(0, currentY.length - 2) );

                systemData.position = positionData;

                systemsData.push(systemData);
            }


            data.systems = systemsData;

            // connections --------------------------------
            var connections = map.getAllConnections();
            var connectionsFormatted = [];

            // clear connections cache
            ativeConnections[mapConfig.id] = {};

            // format connections
            for(var j = 0; j < connections.length; j++){
                var tempConnection = connections[j];

                var source = $(tempConnection.source);
                var target = $(tempConnection.target);

                var connectionId = tempConnection.getParameter('connectionId');

                var connection = {
                    id: connectionId,
                    source: source.data('id'),
                    sourceName: source.data('name'),
                    target: target.data('id'),
                    targetName: target.data('name'),
                    scope: tempConnection.scope,
                    type: tempConnection.getType()
                };

                // add to cache
                ativeConnections[mapConfig.id][connectionId] = tempConnection;

                connectionsFormatted.push(connection);
            }

            data.connections = connectionsFormatted;

            mapData.data = data;
        }else{
            return false;
        }


        return mapData;
    };


    var getMapInstance = function(mapId){

        if(typeof activeInstances[mapId] !== 'object'){
            // create new instance
            var newJsPlumbInstance =  jsPlumb.getInstance({
                Container: null,                                                                // will be set as soon as container is connected to DOM
                PaintStyle:{
                    lineWidth: 4,                                                               //  width of a Connector's line. An integer.
                    strokeStyle: 'red',                                                         // color for a Connector
                    outlineColor: 'red',                                                        // color of the outline for an Endpoint or Connector. see fillStyle examples.
                    outlineWidth: 2                                                             // width of the outline for an Endpoint or Connector. An integer.
                },
                Connector:[ 'Bezier', { curviness: 40 /*, cssClass: 'pf-map-connection-wh-fresh'*/  } ],
                Endpoint : ['Dot', {radius: 6}],
                // Endpoint: 'Blank', // does not work... :(
                ReattachConnections: false,                                                     // re-attach connection if dragged with mouse to "nowhere"
                Scope: Init.defaultMapScope                                                     // default map scope for connections
            });

            // register all available connection types
            newJsPlumbInstance.registerConnectionTypes(globalMapConfig.connectionTypes);

            // global  map observer for manual connections (drag & drop)
            newJsPlumbInstance.bind('connection', function(info, e) {
                setConnectionObserver(newJsPlumbInstance, info.connection);
            });

            // event after DragStop a connection or new connection
            newJsPlumbInstance.bind('beforeDrop', function(info) {
                var connection = info.connection;
                var sourceSystem = $('#' + info.sourceId);
                var returnValue = true;

                sourceSystem.getMapOverlay().startMapUpdateCounter();

                // set "default" connection status
                setConnectionWHStatus(connection, 'wh_fresh');

                // prevent multiple connections between same systems
                var connections = checkForConnection(newJsPlumbInstance, info.sourceId, info.targetId );

                if(connections.length > 1){
                    bootbox.confirm('Connection already exists. Do you really want to add an additional one?', function(result) {
                        if(!result){
                            newJsPlumbInstance.detach(connection);
                            sourceSystem.getMapOverlay().startMapUpdateCounter();
                        }
                    });
                }

                // notification
                if(returnValue === true){
                    Util.showNotify({title: 'New Connection established', text: 'fgdgdf', type: 'success'});
                }

                return returnValue;
            });


            activeInstances[mapId] = newJsPlumbInstance;

            console.log('new jsPlumbInstance: ' + mapId);
        }

        return activeInstances[mapId];
    };

    /**
     * load OR updates system map
     * @param mapConfig
     */
    $.fn.loadMap = function(mapConfig){

        // parent element where the map will be loaded
        var parentElement = $(this);

        // add context menus to dom (if not already
        initMapContextMenu();
        initConnectionContextMenu();
        initSystemContextMenu();

        // new map init
        var newMap = false;

        // init jsPlumb
        jsPlumb.ready(function() {


            // get new map instance or load existing
            mapConfig.map = getMapInstance(mapConfig.config.id);

            // check for map Container -> first time initialization
            if(mapConfig.map.getContainer() === undefined){
                // new map instance
                newMap = true;
            }

            //  draw/update map initial map and set container
            updateMap(parentElement, mapConfig);

            if(newMap){
                // init custom scrollbars
                parentElement.initMapScrollbar();

                Util.showNotify({title: 'Map initialized', text: mapConfig.config.name  + ' - loaded', type: 'success'});
            }

        });
    };

    /**
     * init scrollbar for Map element
     */
    $.fn.initMapScrollbar = function(){
        // get Map Scrollbar
        var scrollableElement = $(this).find('.' + config.mapWrapperClass);
        initCutomScrollbar( scrollableElement );

        // add map overlay container after scrollbar is initiated
        // because of its absolute positon
        var mapOverlay = $('<div>', {
            class: config.mapOverlayClass
        });
        scrollableElement.append(mapOverlay);


        // reset map update timer
        mapOverlay.setMapUpdateCounter(100, '5');
    };

    /**
     * init a custom scrollbar
     * @param scrollableElement
     */
    var initCutomScrollbar = function( scrollableElement ){

        // prevent multiple initialization
        $(scrollableElement).mCustomScrollbar('destroy');

        // init custom scrollbars
        $(scrollableElement).mCustomScrollbar({
            axis: 'x',
            theme: 'light-thick',
            scrollInertia: 300,
            autoExpandScrollbar: false,
            scrollButtons:{
                scrollAmount: 30,
                enable: true
            },
            callbacks:{
                onTotalScrollOffset: 0,
                onTotalScrollBackOffset: 0,
                alwaysTriggerOffsets:true,
                whileScrolling:function(){
                    // update scroll position for drag-frame-selection
                    var mapElement = $(scrollableElement).find('.' + config.mapClass);
                    $(mapElement).data('scrollLeft', this.mcs.left);
                    $(mapElement).data('scrollTop', this.mcs.top);
                }
            },

            advanced: {
                updateOnBrowserResize: true,
                updateOnContentResize: true,
                autoExpandHorizontalScroll: true
            },
            mouseWheel:{
                enable:true,
                scrollAmount: 'auto',
                axis: 'x',
                preventDefault: true
            },
            scrollbarPosition: 'inside',
            autoDraggerLength: true
            //autoHideScrollbar: false
        });
    };

    /**
     * scroll to a specific position in the map
     * @returns {*} // string or id
     */
    $.fn.scrollTo = function(position){
        return this.each(function(){
            // todo re-comment not used jet
            //$(this).mCustomScrollbar('scrollTo', position);
        });
    };

});