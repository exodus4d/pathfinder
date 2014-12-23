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

    // jsPlumb config
    var globalMapConfig =  {
        source: {
            filter: '.' + config.systemHeadNameClass,
            anchor: 'Continuous',
            connector: [ 'Bezier', { curviness: 40, cssClass: 'pf-map-connection-wh' } ],
            maxConnections: 20,
            allowLoopback:false,
            cssClass: config.endpointSourceClass,
            onMaxConnections:function(info, e) {
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
            filter: '.' + config.systemHeadNameClass,
            anchor: 'Continuous',
            allowLoopback: false,
            cssClass: config.endpointTargetClass,
            dropOptions: {
                tolerance: 'touch',
                hoverClass: config.systemActiveClass,
                activeClass: 'dragActive'
            },
            beforeDrop: function(info){
                // check function for new connection

                // prevent loop back
                if(info.sourceId === info.targetId){
                    return false;
                }

                // prevent multiple connections between same systems
                var connections = checkForConnection(this.instance, info.source, info.target);
                if(connections.length > 0){
                    bootbox.alert('Connection already exists.');
                    return false;
                }

                return true;
            }
        },
        connectionTypes: {
            wh: {
                cssClass: 'pf-map-connection-wh'
            },
            eol: {
                cssClass: 'pf-map-connection-wh-eol'
            },
            wh_reduced: {
                cssClass: 'pf-map-connection-wh-reduced'
            },
            wh_critical: {
                cssClass: 'pf-map-connection-wh-critical'
            },
            frigate: {
                cssClass: 'pf-map-connection-frig',
                paintStyle: {
                    dashstyle: '0.9'
                },
                overlays:[
                    [ 'Label',
                        {
                            label: 'frig',
                            cssClass: ['pf-map-connection-overlay', 'frig'].join(' ')
                        } ]
                ]
            },
            preserve_mass: {
                overlays:[
                    [ 'Label',
                        {
                            label: '<i class="fa fa-warning"></i>&nbsp;save mass',
                            cssClass: ['pf-map-connection-overlay', 'mass'].join(' ')
                        } ]
                ]
            }
        }
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
     * @param system
     * @param data
     * @param currentUserData // data of the user that is currently viewing this map
     */
    var updateSystem = function(map, system, data, currentUserData){

        // find system body
        var systemBody = $( $(system).find('.' + config.systemBodyClass) );

        // find expand arrow
        var systemHeadExpand = $( $(system).find('.' + config.systemHeadExpandClass) );


        // remove tooltip
        $(system).removeAttr('title');

        // remove all content
        systemBody.empty();

        var userCounter = 0;

        // if current user is in THIS system trigger event
        if(currentUserData){
            var tabContentElement = getTabContentElementByMapElement(system);

            $(tabContentElement).trigger('pf:highlightTab', [{system: system}]);
        }

        // add user information
        if(
            data &&
            data.user
        ){

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

        $(system).removeAttr('title');

        if(userCounter === 0){
            // hide expand arrow
            systemBody.hide();
            systemHeadExpand.hide();
        }else{
            systemBody.show();
            systemHeadExpand.show();

            $(system).attr('title', userCounter);

            // show active user tooltip
            toggleSystemTooltip([system], 'show', {placement: 'top', trigger: 'manual'});
        }

        // repaint connection because of system-size change
        map.repaint( system );

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
     * get a new system by data object
     * @param data
     * @returns {*|HTMLElement}
     */
    var getSystem = function(map, data){

        var system;

        // get map container for mapId information
        var mapContainer = $(map.getContainer());

        // get system info classes
        var effectClass = Util.getEffectInfoForSystem(data.effect, 'class');
        var secClass = Util.getSecurityClassForSystem(data.security);
        var statusClass = Util.getStatusInfoForSystem(data.status, 'class');
        var statusLabel = Util.getStatusInfoForSystem(data.status, 'label');

        var systemId = config.systemIdPrefix + data.id;

        system = $('<div>', {
            // system
            id: systemId,
            class: [config.systemClass, statusClass].join(' ')
        }).append(
            // system head
            $('<div>', {
                class: config.systemHeadClass
            }).append(
                // System name is editable
                $('<a>', {
                    href: '#',
                    class: config.systemHeadNameClass
                }).attr('data-value', data.name)
            ).append(
                // System locked status
                $('<i>', {
                    class: ['fa', 'fa-lock', 'fa-fw'].join(' ')
                }).attr('title', 'locked')
            ).append(
                // System effect color
                $('<i>', {
                    class: ['fa', 'fa-square ', 'fa-fw', Util.getEffectInfoForSystem('effect', 'class'), effectClass].join(' ')
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
            ).data('name', data.name).css({ "left": data.position.x + "px", 'top': data.position.y + 'px' });

        system.data('id', data.id);
        system.data('status', statusLabel);
        system.attr('data-mapid', mapContainer.data('id'));

        // locked system
        if(
            system.data( 'locked') !== true &&
            data.locked === '1'
        ){
            system.toggleLockSystem(false, {hideNotification: true, hideCounter: true, map: map});
        }

        // rally system
        if(
            system.data( 'rally') !== true &&
            data.rally === '1'
        ){
            system.toggleRallyPoint(false, {hideNotification: true, hideCounter: true});
        }



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
            class: [config.mapClass].join(' ')
        });

        // add additional information
        mapContainer.data('id', mapConfig.config.id);
        mapContainer.data('name', mapConfig.config.name);

        mapWrapper.append(mapContainer);

        // append mapWrapper to parent element (at the top)
        $(parentElement).prepend(mapWrapper);


        // set main Container for current map -> the container exists now in DOM !! very important
        mapConfig.map.setContainer($('#' + config.mapIdPrefix + mapConfig.config.id));

        // set map observer
        setMapObserver(mapConfig.map);


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
            var newSystem = getSystem(map, systemData);

            // add new system to map
            mapContainer.append(newSystem);

            // make new system editable
            makeEditable(newSystem);

            // make new system draggable
            if(! newSystem.data('locked')){
                $(newSystem).multiDraggable({map: map, group: newSystem});
            }

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
                        type: 'wh'
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

            /* experimental (straight connections)
            anchors: [
                [ "Perimeter", { shape: 'Rectangle' }],
                [ "Perimeter", { shape: 'Rectangle' }]
            ]
            */

        });

        // set Observer for new Connection
        setConnectionObserver(map, connection);

        return connection;
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
                {icon: 'fa-plus', action: 'add_system', text: 'add system'},
                {icon: 'fa-info', action: 'info', text: 'info'},
                {divider: true},
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
                {icon: 'fa-reply fa-rotate-180', text: 'change status', subitems: [
                    {subIcon: 'fa-clock-o', subAction: 'eol', subText: 'toggle EOL'},
                    {subDivider: true},
                    {subIcon: 'fa-circle', subAction: 'status_fresh', subText: 'stage 0 (fresh)'},
                    {subIcon: 'fa-adjust', subAction: 'status_reduced', subText: 'stage 1 (reduced)'},
                    {subIcon: 'fa-circle-o', subAction: 'status_critical', subText: 'stage 2 (critical)'}

                ]},
                {divider: true},
                {icon: 'fa-eraser', action: 'delete', text: 'delete'}
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
                {divider: true},
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

        var systemHeadExpand = $( system.find('.' + config.systemHeadExpandClass) );
        var systemBody = $( system.find('.' + config.systemBodyClass) );

        var bodyItemheight = 16;

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

            // get ship counter and calculate expand height
            var shipCounter = parseInt( system.attr('data-original-title') );

            var expandheight = shipCounter * bodyItemheight;

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
                        map.repaint( hoverSystem );
                    },
                    complete: function(){
                        map.repaint( hoverSystem );
                        $(this).find('.' + config.systemBodyRightClass).show();
                    }
                }
            );
        }, function(e){
            // hover out
            var hoverSystem = $(this).parents('.' + config.systemClass);
            systemBody.animate(
                {
                    height: '16px',
                    width: '100%',
                    'min-width': '80px'
                },
                {
                  //  queue:false,
                    duration: 100,
                    step: function(){
                        // repaint connections of current system
                        map.repaint( hoverSystem );
                        $(this).find('.' + config.systemBodyRightClass).hide();
                    },
                    start: function(){
                        $(this).find('.' + config.systemBodyRightClass).hide();
                    },
                    complete: function(){
                        map.repaint( hoverSystem );
                    }
                }
            );
        });

        // context menu ==================================================================

        // trigger context menu
        system.on('contextmenu', function(e){

            // hide all map tooltips

            $(e.target).trigger('pf:openContextMenu', [e, this]);
            e.preventDefault();
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
                var currentSystemName = currentSystem.getSystemInfo( ['name'] );

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

                        $(currentSystem).getMapOverlay().startMapUpdateCounter();


                        // remove all status classes from system
                        $.each(Init.classes.systemStatus, function(status, statusData){
                            currentSystem.removeClass( statusData.class );
                        });

                        // add new class
                        var statusString = action.split('_');
                        var statusClass = Util.getStatusInfoForSystem(statusString[2], 'class');
                        var statusLabel = Util.getStatusInfoForSystem(statusString[2], 'label');

                        currentSystem.data('status', statusLabel);
                        currentSystem.addClass( statusClass );
                        break;
                    case 'delete_system':
                        // confirm dialog
                        bootbox.confirm('Delete system and all its connections?', function(result) {
                            if(result){
                                $(currentSystem).getMapOverlay().startMapUpdateCounter();


                                var systemName = currentSystem.getSystemInfo(['name']);
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

            if(e.which === 1){
                // left mouse button

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
        });


    };

    /**
     * toggle select status of a system
     */
    $.fn.toggleSelectSystem = function(map){
        var system = $(this);

        var mapElement = system.parent();

        if( system.data('locked') !== true ){

            if( system.hasClass( config.systemSelectedClass ) ){
                system.removeClass( config.systemSelectedClass );

                // set single draggable for this system
                system.multiDraggable({map: map, group: system});
            }else{
                system.addClass( config.systemSelectedClass );
            }

            // there can still be multiple selected systems :)
            var selectedSystems = $(mapElement).getSelectedSystems();

            if(selectedSystems.length > 0){
                $(selectedSystems).multiDraggable({map: map, group: selectedSystems});
            }

        }else{
            var systemName = system.getSystemInfo( ['name'] );

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

        var systemName = system.getSystemInfo( ['name'] );

        if( system.data( 'locked' ) === true ){
            system.data('locked', false);
            system.removeClass( config.systemLockedClass );

            // set draggable capability
            system.multiDraggable({map: map, group: system});

            if(! hideNotification){
                Util.showNotify({title: 'System lock removed', text: 'System: ' + systemName, type: 'success'});
            }
        }else{
            system.data('locked', true);
            system.addClass( config.systemLockedClass );

            // remove draggable capability
            system.destroySystemDraggable();

            if(! hideNotification){
                Util.showNotify({title: 'System is locked', text: 'System: ' + systemName,  type: 'success'});
            }
        }

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
                var systemName = system.getSystemInfo( ['name'] );

                var notificationOptions = {
                    title: 'New rally Point',
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
        var container = map.getContainer();

        $(container).on('contextmenu', function(e){
            $(e.target).trigger('pf:openContextMenu', [e, this]);
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        $(container).contextMenu({
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
                    case 'delete_systems':
                        // delete all selected systems with its connections
                        var selectedSystems = $(currentMapElement).getSelectedSystems();

                        if(selectedSystems.length > 0){
                            bootbox.confirm('Delete ' + selectedSystems.length + ' selected systems and its connections?', function(result) {
                                if(result){

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

                }

            }

        });

        // init drag-frame selection
        $(container).dragToSelect({
            selectables: '.' + config.systemClass,
            onHide: function (selectBox, deselectedSystems) {
                var selectedSystems = $(container).getSelectedSystems();

                if(selectedSystems.length > 0){
                    // make all selected systems draggable
                    Util.showNotify({title: selectedSystems.length + ' systems selected', type: 'success'});

                    $(selectedSystems).multiDraggable({map: map, group: selectedSystems});
                }

                // convert former group draggable systems so single draggable
                for(var i = 0; i < deselectedSystems.length; i++){
                    $(deselectedSystems[i]).multiDraggable({map: map, group: deselectedSystems[i]});
                }


            },
            onShow: function(){
            },
            onRefresh: function(){
            }
        });




        // catch menu events ====================================================

        // toggle "snap to grid" option
        $(container).on('pf:menuGrid', function(e, data){
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
     * set observer for a given connection
     * @param map
     * @param connection
     */
    var setConnectionObserver = function(map, connection){

        connection.bind('contextmenu', function(component, e) {
            // trigger menu "open
            $(e.target).trigger('pf:openContextMenu', [e, component]);
            e.preventDefault();
            e.stopPropagation();
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
                        bootbox.confirm('Is this connection really gone?', function(result) {
                            if(result){
                                map.detach(params.component);
                            }
                        });
                        break;
                    case 'frigate':         // set as frigate hole
                    case 'preserve_mass':   // set "preserve mass
                    case 'eol':             // set "end of life"
                        activeConnection.toggleType( action );
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
                case 'name':
                    // get current system name/alias
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

                                $(options.sourceSystem).getMapOverlay().startMapUpdateCounter();

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
            $.each(systems, function(i, system){
                // get user Data for System
                var systemId = parseInt( $(system).data('id') );

                var tempUserData = null;
                $.each(userData.data.systems, function(j, systemData){
                    // check if any user is in this system
                    if(systemId === systemData.id){
                        tempUserData = systemData;
                    }
                });

                // check if user is currently in this system
                var tempCurrentUserData = null;
                if(
                    currentUserData &&
                    currentUserData.system.id === systemId
                ){
                    tempCurrentUserData = currentUserData;
                }

                updateSystem(map, system, tempUserData, tempCurrentUserData);

            });
        }
    };

    /**
     * collect all data for export/save for a map
     * @returns {{}}
     */
    $.fn.getMapData = function(){

        var mapElement = $(this);

        var mapData = {};

        // check if there is an active map counter that prevents collecting map data
        var overlay = mapElement.getMapOverlay();
        var counterChart = overlay.getMapCounter();

        var interval = counterChart.data('interval');

        if(! interval){
            // map config ---------------------------------
            var mapConfig = {};
            mapConfig.id = mapElement.data('id');
            mapConfig.name = mapElement.data('name');
            mapData.config = mapConfig;

            // map data -----------------------------------
            var data = {};

            // systems ------------------------------------
            var systemsData = [];

            var systems = mapElement.find('.' + config.systemClass);

            for(var i = 0; i < systems.length; i++){

                var tempSystem = $(systems[i]);
                var systemData = {};
                systemData.id = tempSystem.data('id');
                systemData.alias = tempSystem.find('.' + config.systemHeadNameClass).editable('getValue', true);
                systemData.status = tempSystem.data('status');
                systemData.locked = tempSystem.data('locked');
                systemData.rally = tempSystem.data('rally');

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
            var connections = [];

            data.connections = connections;

            mapData.data = data;
        }else{
            return false;
        }


        return mapData;
    };

    /**
     * load  system map into element
     * @param mapConfig
     */
    $.fn.loadMap = function(mapConfig){

        // parent element where the map will be loaded
        var parentElement = $(this);

        // add context menus to dom
        initMapContextMenu();
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

    /**
     * removes all draggable capability for a system
     */
    $.fn.destroySystemDraggable = function(){

        var system = $(this);

        if( system.data('ui-draggable') ){
            system.draggable( 'destroy' );
        }

    };

    /**
     * drag function for single or multiple system dragging
     * @param options
     * @returns {*}
     */
    $.fn.multiDraggable = function (options) {

        // offset for each system in relation to dragSystem
        var initLeftOffset = [];
        var initTopOffset = [];

        // max drag distance for each direction. All systems should stay within map
        var maxDragDistance = {
            up: 0,
            right: 0,
            down: 0,
            left: 0
        };

        var mapOffset = {};


        /**
         * function is called during dragging. Check for valid position for each dragable system
         * @param event
         * @param ui
         */
        var whileDragging = function(event, ui){
            var dragSystem = $(event.target);
            var dragSystemPosition = dragSystem.position();

            var uiPosition = ui.position;

            var offset = ui.offset;
            var items = $(options.group);

            // start map update timer
            dragSystem.getMapOverlay().startMapUpdateCounter();

            // get position movement from original position --------------------------------------------
            var leftMove = ui.originalPosition.left - uiPosition.left;
            var topMove = ui.originalPosition.top - uiPosition.top;

            var dragDistance = {
                up: 0,
                right: 0,
                down: 0,
                left: 0
            };

            if(leftMove < 0){
                dragDistance.right = leftMove * -1;
            }else{
                dragDistance.left = leftMove;
            }

            if(topMove < 0){
                dragDistance.down = topMove * -1;
            }else{
                dragDistance.up = topMove;
            }

            // grid snapping ----------------------------------------------------------------------------
            var leftPositionRemainder = 0;
            var topPositionRemainder = 0;

            // if active make system snapping to a fixed grid
            if(config.mapSnapToGrid){
                var snapTolerance = $(this).draggable('option', 'snapTolerance');
                leftPositionRemainder = uiPosition.left % snapTolerance;
                topPositionRemainder = uiPosition.top % snapTolerance;

                // manipulate dragDistance
                if (leftPositionRemainder <= snapTolerance) {
                   // ui.position.left = ui.position.left - leftRemainder;
                    dragDistance.left += leftPositionRemainder;
                }

                if (topPositionRemainder <= snapTolerance) {
                   // ui.position.top = ui.position.top - topRemainder;
                    dragDistance.up += topPositionRemainder;
                }
            }

            // check that all systems are still inside the map -----------------------------------------
            if(
                dragDistance.left > maxDragDistance.left ||
                dragDistance.right > maxDragDistance.right
            ){
                // stop move current system
                ui.position.left = dragSystemPosition.left;
                // stop move other systems
                offset.left = dragSystemPosition.left + mapOffset.left;
            }else{
                offset.left -= leftPositionRemainder;
                ui.position.left -= leftPositionRemainder;
            }

            if(
                dragDistance.up > maxDragDistance.up ||
                dragDistance.down > maxDragDistance.down
            ){
                // stop move current system
                ui.position.top = dragSystemPosition.top;
                // stop move other systems
                offset.top = dragSystemPosition.top + mapOffset.top;
            }else{
                offset.top -= topPositionRemainder;
                ui.position.top -= topPositionRemainder;
            }



            $.each(items || {}, function (key, tempSystem) {
                tempSystem = $(tempSystem);

                var left    = offset.left + initLeftOffset[key];
                var top     = offset.top + initTopOffset[key];
                var leftOffsetRemainder = 0;
                var topOffsetRemainder = 0;

                if(config.mapSnapToGrid){
                    leftOffsetRemainder = (initLeftOffset[key] % snapTolerance);
                    topOffsetRemainder = initTopOffset[key] % snapTolerance;
                }

                tempSystem.offset({
                    left:   left  - leftOffsetRemainder,
                    top:    top - topOffsetRemainder
                });

            });

            options.map.repaint(items);
        };


        return this.each(function () {

            // remove previous dragging capability
            $(this).destroySystemDraggable();


            $(this).draggable(options, {
                start: function (e, ui) {
                    // drag start

                    var dragSystem = $(e.target);
                    var position = dragSystem.position();
                    var items = $(options.group);

                    // start map update timer
                    $(e.target).getMapOverlay().startMapUpdateCounter();

                    // get map size
                    var mapElement = dragSystem.parent();

                    mapOffset = mapElement.offset();

                    var mapWidth = mapElement.width();
                    var mapHeight = mapElement.height();


                    // calculate offset for each system to dragSystem
                    $.each(items || {}, function (key, tempSystem) {
                        tempSystem = $(tempSystem);

                        // hide tooltip
                        toggleSystemTooltip( tempSystem, 'hide' );

                        var elemPos = tempSystem.position();
                        initLeftOffset[key] = elemPos.left - position.left;
                        initTopOffset[key] = elemPos.top - position.top;

                        var distanceRight = mapWidth - elemPos.left - tempSystem.outerWidth();
                        var distanceBottom = mapHeight - elemPos.top - tempSystem.outerHeight();

                        // calculate max drag distance
                        if(key === 0){
                            maxDragDistance.left = elemPos.left;
                            maxDragDistance.up = elemPos.top;
                            maxDragDistance.right = distanceRight;
                            maxDragDistance.down = distanceBottom;
                        }

                        if(elemPos.left < maxDragDistance.left){
                            maxDragDistance.left = elemPos.left;
                        }

                        if(elemPos.top < maxDragDistance.up){
                            maxDragDistance.up = elemPos.top;
                        }

                        if(distanceRight < maxDragDistance.right){
                            maxDragDistance.right = distanceRight;
                        }

                        if(distanceBottom < maxDragDistance.down){
                            maxDragDistance.down = distanceBottom;
                        }


                    });

                },
                drag: whileDragging,
                stop: function(e, ui){
                    // stop dragging
                    whileDragging(e, ui);

                    var dragSystem = $(e.target);
                    var items = $(options.group);


                    var distanceTop = ui.position.top;
                    var distanceLeft = ui.position.left;

                    // start map update timer
                    dragSystem.getMapOverlay().startMapUpdateCounter();



                    $.each(items || {}, function (key, tempSystem) {
                        tempSystem = $(tempSystem);

                        // update z-index for dragged system + connections
                        updateZIndex(tempSystem);

                        // render tooltip
                        toggleSystemTooltip([tempSystem], 'show');

                        // set new position for popover edit field (system name)
                        var placement = 'top';
                        if(distanceTop < 100){
                            placement = 'bottom';
                        }
                        if(distanceLeft < 100){
                            placement = 'right';
                        }

                        tempSystem.find('.' + config.systemHeadNameClass).editable('option', 'placement', placement);

                    });

                }
            });
        });


    };



});