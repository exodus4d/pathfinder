define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'jsPlumb',
    'customScrollbar',
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
        mapClass: 'pf-map',                                             // class for all maps
        mapGridClass: 'pf-grid-small',                                  // class for map grid snapping
        mapIdPrefix: 'pf-map-',                                         // id prefix for all maps
        systemIdPrefix: 'pf-system-',                                   // id prefix for a system
        systemClass: 'pf-system',                                       // class for all systems
        systemActiveClass: 'pf-system-active',                          // class for an active system in a map
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
            filter: '.' + config.systemHeadNameClass,
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

        $.each(systems, function(i, system){
            if(options){
                $(system).tooltip(options);
            }

            $(system).tooltip(show);
        });
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

        system = $('<div>', {
            // system
            id: config.systemIdPrefix + data.id,
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
                // System effect color
                $('<i>', {
                    class: ['fa fa-square ', Util.getEffectInfoForSystem('effect', 'class'), effectClass].join(' ')
                })
            ).append(
                // expand option
                $('<i>', {
                    class: ['fa fa-angle-down ', config.systemHeadExpandClass].join(' ')
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

        system.attr('data-id', data.id);
        system.attr('data-mapid', mapContainer.attr('data-mapid'));

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
        }).attr('data-mapid', mapConfig.config.id);

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
        }
    };

    /**
     * delete a system with all its connections
     * @param map
     * @param system
     */
    var deleteSystem = function(map, system){

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
     * make a syste name editable by x-editable
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
            showbuttons: false
        });


        // update z-index for system, editable field should be on top
        $(headElement).on('shown', function(e, editable) {
            updateZIndex(system);
        });
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
            start: function(e){
                // drag start

                // hide tooltip
                toggleSystemTooltip([e.target], 'hide');
            },
            stop: function(e, ui){

                var system = $(e.target);

                // drag stop
                var mapContainer = $( system.parent() );

                // update z-index for dragged system + connections
                updateZIndex(e.target);

                // rerender tooltip
                toggleSystemTooltip([e.target], 'show');

                // set new position for popover edit field (system name)
                var distanceTop = ui.position.top;
                var distanceLeft = ui.position.left;

                var placement = 'top';
                if(distanceTop < 100){
                    placement = 'bottom';
                }
                if(distanceLeft < 100){
                    placement = 'right';
                }

                $(e.target).find('.' + config.systemHeadNameClass).editable('option', 'placement', placement);

            },
            drag: function(e, ui){

                // if active make system snapping to a fixed grid
                if(config.mapSnapToGrid){
                    var snapTolerance = $(this).draggable('option', 'snapTolerance');
                    var topRemainder = ui.position.top % 20;
                    var leftRemainder = ui.position.left % 20;

                    if (topRemainder <= snapTolerance) {
                        ui.position.top = ui.position.top - topRemainder;
                    }

                    if (leftRemainder <= snapTolerance) {
                        ui.position.left = ui.position.left - leftRemainder;
                    }

                    map.repaint( e.target );

                }

            }
        });
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
        });

        // set Observer for new Connection
        setConnectionObserver(map, connection);

        return connection;
    };

    /**
     * load contextmenu template for map
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
                {icon: 'fa-info-circle', action: 'info', text: 'info'}
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
                {icon: 'fa-info-circle', action: 'info', text: 'info'},
                {icon: 'fa-plane', action: 'frigate', text: 'frigate hole'},
                {icon: 'fa-warning', action: 'preserve_mass', text: 'preserve mass'},
                {text: 'change status', subitems: [
                    {subIcon: 'fa-clock-o', subAction: 'eol', subText: 'toggle EOL'},
                    {subDivider: true},
                    {subIcon: 'fa-circle', subAction: 'status_fresh', subText: 'stage 0 (fresh)'},
                    {subIcon: 'fa-adjust', subAction: 'status_reduced', subText: 'stage 1 (reduced)'},
                    {subIcon: 'fa-circle-o', subAction: 'status_critical', subText: 'stage 2 (critical)'}

                ]},
                {divider: true},
                {icon: 'fa-eraser', action: 'delete', text: 'delete'},
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
                {icon: 'fa-eraser', action: 'delete_system', text: 'delete system'},
                {icon: 'fa-info-circle', action: 'info', text: 'info'},
                {divider: true},
                {text: 'change status', subitems: systemStatus}
            ]
        };

        Render.showModule(moduleConfig, moduleData);

    };

    /**
     * set up contextmenu for all Systems within a given map
     * @param endpoints
     */
    var setSystemObserver = function(map, system){

        var systemHeadExpand = $( $(system).find('.' + config.systemHeadExpandClass) );
        var systemBody = $( $(system).find('.' + config.systemBodyClass) );

        var bodyItemheight = 16;

        // init system body expand
        systemHeadExpand.hover(function(e){
            // hover in
            var hoverSystem = $(this).parents('.' + config.systemClass);

            // get ship counter and calculate expand height
            var shipCounter = parseInt( $(system).attr('data-original-title') );

            var expandheight = shipCounter * bodyItemheight;

            systemBody.animate(
                {
                    height: expandheight + 'px',
                    width: '100%',
                    'min-width': '150px'
                },
                {
                    queue:false,
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
                    queue:false,
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
                        showNewSystemDialog(map, {sourceSystem: currentSystem} );

                        break;
                    case 'delete_system':
                        // confirm dialog
                        bootbox.confirm('Delete system with all its connections?', function(result) {
                            if(result){
                                var systemName = currentSystem.getSystemInfo(['name']);
                                deleteSystem(map, currentSystem);

                                Util.showNotify({title: 'System deleted', text: systemName, type: 'success'});
                            }
                        });

                        break;
                    case 'change_status_unknown':
                    case 'change_status_friendly':
                    case 'change_status_occupied':
                    case 'change_status_hostile':
                    case 'change_status_empty':
                    case 'change_status_unscanned':
                        // remove all status classes from system
                        $.each(Init.classes.systemStatus, function(status, statusData){
                            currentSystem.removeClass( statusData.class );
                        });

                        // add new class
                        var statusString = action.split('_');
                        var statusClass = Util.getStatusInfoForSystem(statusString[2], 'class');

                        currentSystem.addClass( statusClass );
                        break;
                    case 'info': console.log('info')
                        break;
                }

            }
        });

        // load system data =================================================================================
        // trigger event for this system
        $(system).on('click', function(e){

            // get current map
            var currentSystem = $(e.target).parents('.' + config.systemClass);

            markSystemActive(map, currentSystem);

            // get parent Tab Content and fire update event
            var tabContentElement = getTabContentElementByMapElement(currentSystem);

            var data = {
                system: currentSystem
            };

            $(tabContentElement).trigger('pf:updateSystemData', [data]);
        });
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

                var currentMapId = parseInt( currentMapElement.attr('data-mapid') );

                // get map instance
               var currentMap = getMapInstance(currentMapId);

                // click position
                var position = params.position;

                switch(action){
                    case 'add_system':
                        // add new system dialog
                        showNewSystemDialog(currentMap, {position: position});
                        break;

                }

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
                    systemInfo.push( $(this).find('.' + config.systemHeadNameClass).text() );
                    break;
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

            // make editable
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
                var systemId = parseInt( $(system).attr('data-id') );

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
                alwaysTriggerOffsets:true
            },

            advanced: {
                updateOnBrowserResize: true,
                updateOnContentResize: true,
                autoExpandHorizontalScroll: true
            },
            mouseWheel:{
                enable:true,
                scrollAmount:"auto",
                axis:"x"
            },
            scrollbarPosition: "inside",
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
            // todo re-comment
            //$(this).mCustomScrollbar('scrollTo', position);
        });
    };



});