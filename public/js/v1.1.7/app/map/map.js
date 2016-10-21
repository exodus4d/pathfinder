/**
 * Main map functionality
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'app/map/util',
    'app/map/system',
    'app/map/magnetizing',
    'app/map/scrollbar',
    'dragToSelect',
    'select2',
    'app/map/contextmenu',
    'app/map/overlay'
], function($, Init, Util, Render, bootbox, MapUtil, System, MagnetizerWrapper) {

    'use strict';

    var config = {
        zIndexCounter: 110,
        newSystemOffset: {
          x: 130,
          y: 0
        },

        mapSnapToGrid: false,                                           // "Snap to Grid" feature for drag&drop systems on map (optional)
        mapWrapperClass: 'pf-map-wrapper',                              // wrapper div (scrollable)

        mapClass: 'pf-map',                                             // class for all maps
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
        systemBodyItemHeight: 16,                                       // px of a system body entry
        systemBodyItemClass: 'pf-system-body-item',                     // class for a system body entry
        systemBodyItemStatusClass: 'pf-user-status',                    // class for player status in system body
        systemBodyItemNameClass: 'pf-system-body-item-name',            // class for player name in system body
        systemBodyRightClass: 'pf-system-body-right',                   // class for player ship name in system body
        systemTooltipInnerClass: 'pf-system-tooltip-inner',             // class for system tooltip content
        systemTooltipInnerIdPrefix: 'pf-system-tooltip-inner-',         // id prefix for system tooltip content
        dynamicElementWrapperId: 'pf-dialog-wrapper',                   // wrapper div for dynamic content (dialogs, context-menus,...)

        // endpoint classes
        endpointSourceClass: 'pf-map-endpoint-source',
        endpointTargetClass: 'pf-map-endpoint-target',

        // context menus
        mapContextMenuId: 'pf-map-contextmenu',
        connectionContextMenuId: 'pf-map-connection-contextmenu',
        systemContextMenuId: 'pf-map-system-contextmenu',

        // dialogs
        systemDialogId: 'pf-system-dialog',                             // id for system dialog
        systemDialogSelectClass: 'pf-system-dialog-select',             // class for system select Element

        // system security classes
        systemSec: 'pf-system-sec',
        systemSecHigh: 'pf-system-sec-highSec',
        systemSecLow: 'pf-system-sec-lowSec',
        systemSecNull: 'pf-system-sec-nullSec',
        systemSecWHHeigh: 'pf-system-sec-high',
        systemSecWHMid: 'pf-system-sec-mid',
        systemSecWHLow: 'pf-system-sec-low'
    };

    // active jsPlumb instances currently running
    var activeInstances = {};

    // active connections per map (cache object)
    var connectionCache = {};

    // jsPlumb config
    var globalMapConfig =  {
        source: {
            filter: '.' + config.systemHeadNameClass,
            //isSource:true,
            isTarget:true,                          // add target Endpoint to each system (e.g. for drag&drop)
            allowLoopback: false,                   // loopBack connections are not allowed
            cssClass: config.endpointSourceClass,
            uniqueEndpoint: false,                  // each connection has its own endpoint visible
            dragOptions:{
            },
            connectionsDetachable: true,            // dragOptions are set -> allow detaching them
            maxConnections: 10,                      // due to isTarget is true, this is the max count of !out!-going connections
           // isSource:true,
            anchor: 'Continuous'
        },
        target: {
            filter: '.' + config.systemHeadNameClass,
            isSource:true,
            //isTarget:true,
            //allowLoopback: false,                   // loopback connections are not allowed
            cssClass: config.endpointTargetClass,
            dropOptions: {
                hoverClass: config.systemActiveClass,
                activeClass: 'dragActive'
            },
           // isTarget:true,
           // uniqueEndpoint: false,
            anchor: 'Continuous'
        },
        connectionTypes: Init.connectionTypes
    };

    /**
     * updates a system with current information
     * @param map
     * @param data
     * @param currentUserIsHere boolean - if the current user is in this system
     */
    $.fn.updateSystemUserData = function(map, data, currentUserIsHere){

        var system = $(this);
        var systemId = system.attr('id');

        // find system body
        var systemBody = $( system.find('.' + config.systemBodyClass) );

        // find expand arrow
        var systemHeadExpand = $( system.find('.' + config.systemHeadExpandClass) );

        var oldCacheKey = system.data('userCache');
        var oldUserCount = system.data('userCount');
        oldUserCount = (oldUserCount !== undefined ? oldUserCount : 0);
        var userCounter = 0;

        system.data('currentUser', false);

        // if current user is in THIS system trigger event
        if(currentUserIsHere){
            system.data('currentUser', true);
        }

        // add user information
        if(
            data &&
            data.user
        ){
            var cacheArray = [];
            // loop all active pilots and build cache-key
            for(var i = 0; i < data.user.length; i++){
                userCounter++;
                var tempUserData = data.user[i];
                cacheArray.push(tempUserData.id + '_' + tempUserData.log.ship.id);
            }
            var cacheKey = cacheArray.join('_');

            // check for if cacheKey has changed
            if(cacheKey !== oldCacheKey){
                // set new CacheKey
                system.data('userCache', cacheKey);
                system.data('userCount', userCounter);

                // remove all content
                systemBody.empty();

                // loop "again" and build DOM object with user information
                for(let j = 0; j < data.user.length; j++){
                    var userData = data.user[j];

                    var statusClass = Util.getStatusInfoForCharacter(userData, 'class');
                    var userName = userData.name;

                    var item = $('<div>', {
                        class: config.systemBodyItemClass
                    }).append(
                            $('<span>', {
                                text: userData.log.ship.typeName,
                                class: config.systemBodyRightClass
                            })
                        ).append(
                            $('<i>', {
                                class: ['fa', 'fa-circle', config.systemBodyItemStatusClass, statusClass].join(' ')
                            })
                        ).append(
                            $('<span>', {
                                class: config.systemBodyItemNameClass,
                                text: userName
                            })
                        );

                    systemBody.append(item);
                }


                // =================================================================

                // user count changed -> change tooltip content
                var tooltipOptions = {placement: 'top', trigger: 'manual'};

                // set tooltip color
                var highlight = false;
                var tooltipIconClass = '';
                if(userCounter > oldUserCount){
                    highlight = 'good';
                    tooltipIconClass = 'fa-caret-up';
                }else if(userCounter < oldUserCount){
                    highlight = 'bad';
                    tooltipIconClass = 'fa-caret-down';
                }

                tooltipOptions.id = systemId;
                tooltipOptions.highlight = highlight;
                tooltipOptions.title = '<i class="fa ' + tooltipIconClass + '"></i>';
                tooltipOptions.title += '&nbsp;' + userCounter;

                // show system head
                systemHeadExpand.velocity('stop', true).velocity({
                    width: '10px'
                },{
                    duration: 50,
                    display: 'inline-block',
                    progress: function(){
                        //revalidate element size and repaint
                        map.revalidate( systemId );
                    },
                    complete: function(){
                        // show system body
                        system.toggleBody(true, map, {complete: function(system){
                            // complete callback function
                            // show active user tooltip
                            system.toggleSystemTooltip('show', tooltipOptions);
                        }});
                    }
                });
            }
        }else{
            // no user data found for this system
            system.data('userCache', false);
            system.data('userCount', 0);
            systemBody.empty();

            if(
                oldCacheKey &&
                oldCacheKey.length > 0
            ){
                // remove tooltip
                system.toggleSystemTooltip('destroy', {});

                // no user -> clear SystemBody
                systemHeadExpand.velocity('stop').velocity('reverse',{
                    display: 'none',
                    complete: function(){
                        system.toggleBody(false, map, {});
                    }
                });
            }
        }
    };

    /**
     * show/hide system body element
     * @param type
     * @param map
     * @param callback
     */
    $.fn.toggleBody = function(type, map, callback){
        var system = $(this);
        var systemBody = system.find('.' + config.systemBodyClass);

        var systemDomId = system.attr('id');

        if(type === true){
            // show minimal body
            systemBody.velocity({
                height: config.systemBodyItemHeight + 'px'
            },{
                duration: 50,
                display: 'auto',
                progress: function(){
                    //revalidate element size and repaint
                    map.revalidate( systemDomId );
                },
                complete: function(){
                    map.revalidate( systemDomId );

                    if(callback.complete){
                        callback.complete(system);
                    }
                }
            });
        }else if(type === false){
            // hide body
            // remove all inline styles -> possible relict from previous hover-extend
            systemBody.velocity({
                height: 0 + 'px',
                width: '100%',
                'min-width': 'none'
            },{
                duration: 50,
                display: 'none',
                begin: function(){
                },
                progress: function(){
                    // revalidate element size and repaint
                    map.revalidate( systemDomId );
                },
                complete: function(){
                    map.revalidate( systemDomId );
                }
            });
        }
    };

    /**
     * show/hide systems tooltip
     * @param show
     * @param options
     */
    $.fn.toggleSystemTooltip = function(show, options){

        // tooltip colors
        var colorClasses = {
            good: 'txt-color-green',
            bad: 'txt-color-red'
        };

        return this.each(function(){
            var system = $(this);
            var tooltipId = 0;
            var tooltipClassHighlight = false;

            // do not update tooltips while a system is dragged
            if(system.hasClass('jsPlumb_dragged')){
                // skip system
                return true;
            }

            if(show === 'destroy'){
                system.tooltip( show );
                system.removeAttr('data-original-title');
            }else if(show === 'hide'){
                system.tooltip( show );
            } else if(show === 'toggle'){
                system.tooltip( show );
            }else if(show === 'show'){

                // check if tooltip is currently visible
                var tooltipActive = (system.attr('aria-describedby') !== undefined);

                if(options === undefined){
                    options = {};
                }

                // optional color highlight
                if(colorClasses.hasOwnProperty( options.highlight )){
                    tooltipClassHighlight = colorClasses[ options.highlight ];
                }

                if(
                    tooltipActive === false &&
                    options.id
                ){

                    // init new tooltip
                    tooltipId = config.systemTooltipInnerIdPrefix + options.id;

                    var template = '<div class="tooltip" role="tooltip">' +
                        '<div class="tooltip-arrow"></div>' +
                        '<div id="' + tooltipId + '" class="tooltip-inner txt-color ' + config.systemTooltipInnerClass + '"></div>' +
                        '</div>';

                    options.html = true;
                    options.animation = true;
                    options.template = template;
                    options.viewport = system.parent('.' + config.mapClass);

                    system.attr('title', options.title);

                    system.tooltip(options);

                    system.tooltip(show);

                    if(tooltipClassHighlight !== false){
                        // set tooltip observer and set new class after open -> due to transition effect

                        system.on('shown.bs.tooltip', function() {
                            $('#' + tooltipId).addClass( tooltipClassHighlight );
                            // remove observer -> color should not be changed every time a tooltip toggles e.g. dragging system
                            $(this).off('shown.bs.tooltip');
                        });
                    }
                }else{
                    // update/change/toggle tooltip text or color without tooltip reload

                    var tooltipInner = false;
                    if(
                        options.title ||
                        tooltipClassHighlight !== false
                    ){
                        tooltipInner = system.tooltip('fixTitle')
                            .data('bs.tooltip')
                            .$tip.find('.tooltip-inner');

                        if(options.title){
                            tooltipInner.html( options.title );
                        }

                        if(tooltipClassHighlight !== false){
                            tooltipInner.removeClass( colorClasses.good + ' ' + colorClasses.bad).addClass(tooltipClassHighlight);
                        }
                    }

                    // show() can be forced
                    if(options.show === true){
                        system.tooltip('show');
                    }

                }
            }


        });
    };

    /**
     * set or change the status of a system
     * @param status
     */
    $.fn.setSystemStatus = function(status){
        var system = $(this);

        var statusId = Util.getStatusInfoForSystem(status, 'id');
        var statusClass = Util.getStatusInfoForSystem(status, 'class');

        for(var property in Init.systemStatus) {
            if (Init.systemStatus.hasOwnProperty(property)) {
                system.removeClass( Init.systemStatus[property].class );
            }
        }

        // add new class
        system.data('statusId', statusId);
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

        var newPosX =  data.position.x + 'px';
        var newPosY = data.position.y + 'px';

        if(!system){

            // set system name or alias
            var systemName = data.name;

            if(
                data.alias &&
                data.alias !== ''
            ){
                systemName = data.alias;
            }

            // get system info classes
            var effectBasicClass = MapUtil.getEffectInfoForSystem('effect', 'class');
            var effectName = MapUtil.getEffectInfoForSystem(data.effect, 'name');
            var effectClass = MapUtil.getEffectInfoForSystem(data.effect, 'class');
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
                        }).attr('data-value', systemName)
                    ).append(
                        // System locked status
                        $('<i>', {
                            class: ['fa', 'fa-lock', 'fa-fw'].join(' ')
                        }).attr('title', 'locked')
                    ).append(
                        // System effect color
                        $('<i>', {
                            class: ['fa', 'fa-square ', 'fa-fw', effectBasicClass, effectClass].join(' ')
                        }).attr('title', effectName)
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
            );

            // set initial system position
            system.css({
                    'left': newPosX,
                    'top': newPosY
            });

        }else{
            system = $(system);

            // set system position
            var currentPosX = system.css('left');
            var currentPosY = system.css('top');

            if(
                newPosX !== currentPosX ||
                newPosY !== currentPosY
            ){
                // change position with animation
                system.velocity(
                    {
                        left: newPosX,
                        top: newPosY
                    },{
                        easing: 'linear',
                        duration: Init.animationSpeed.mapMoveSystem,
                        begin: function(system){
                            // hide system tooltip
                            $(system).toggleSystemTooltip('hide', {});

                            // move them to the "top"
                            $(system).updateSystemZIndex();
                        },
                        progress: function(){
                            map.revalidate( systemId );
                        },
                        complete: function(system){
                            // show tooltip
                            $(system).toggleSystemTooltip('show', {show: true});

                            map.revalidate( systemId );
                        }
                    }
                );
            }

            // set system alias
            var alias = system.getSystemInfo(['alias']);

            if(alias !== data.alias){
                // alias changed
                system.find('.' + config.systemHeadNameClass).editable('setValue', data.alias);
            }
        }

        // set system status
        system.setSystemStatus(data.status.name);
        system.data('id', parseInt(data.id));
        system.data('systemId', parseInt(data.systemId));
        system.data('name', data.name);
        system.data('typeId', parseInt(data.type.id));
        system.data('effect', data.effect);
        system.data('security', data.security);
        system.data('trueSec', parseFloat(data.trueSec));
        system.data('regionId', parseInt(data.region.id));
        system.data('region', data.region.name);
        system.data('constellationId', parseInt(data.constellation.id));
        system.data('constellation', data.constellation.name);
        system.data('statics', data.statics);
        system.data('updated', parseInt(data.updated.updated));
        system.attr('data-mapid', parseInt(mapContainer.data('id')));

        // locked system
        if( Boolean( system.data( 'locked') ) !== data.locked ){
            system.toggleLockSystem(false, {hideNotification: true, hideCounter: true, map: map});
        }

        // rally system
        system.setSystemRally(data.rallyUpdated,  {
            poke: data.rallyPoke || false,
            hideNotification: true,
            hideCounter: true,
        });

        return system;
    };

    /**
     * draw a new map or update an existing map with all its systems and connections
     * @param parentElement
     * @param mapConfig
     * @returns {*}
     */
    var updateMap = function(parentElement, mapConfig){

        var mapContainer = mapConfig.map.getContainer();

        var newSystems = 0;

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

            mapWrapper.append(mapContainer);

            // append mapWrapper to parent element (at the top)
            $(parentElement).prepend(mapWrapper);

            // set main Container for current map -> the container exists now in DOM !! very important
            mapConfig.map.setContainer( config.mapIdPrefix + mapConfig.config.id );

            // set map observer
            setMapObserver(mapConfig.map);
        }

        mapContainer = $(mapContainer);

        // add additional information for this map
        if(mapContainer.data('updated') !== mapConfig.config.updated){
            mapContainer.data('name', mapConfig.config.name);
            mapContainer.data('scopeId', mapConfig.config.scope.id);
            mapContainer.data('typeId', mapConfig.config.type.id);
            mapContainer.data('icon', mapConfig.config.icon);
            mapContainer.data('created', mapConfig.config.created);
            mapContainer.data('updated', mapConfig.config.updated);
        }


        // get map data
        var mapData = mapContainer.getMapDataFromClient({forceData: false});

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
                        if( currentSystemData[k].updated.updated < systemData.updated.updated ){
                            // system changed -> update
                            mapContainer.getSystem(mapConfig.map, systemData);
                        }

                        addNewSystem = false;
                        break;
                    }
                }

                if( addNewSystem === true){
                    drawSystem(mapConfig.map, systemData);
                    newSystems++;
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
                    var deleteSystem = $('#' + config.systemIdPrefix + mapContainer.data('id') + '-' + currentSystemData[a].id);

                    // system not found -> delete system
                    System.removeSystems(mapConfig.map, deleteSystem);
                }
            }

            // update connections =========================================================

            // jsPlumb batch() is used, otherwise there are some "strange" visual bugs
            // when switching maps (Endpoints are not displayed correctly)
            mapConfig.map.batch(function() {

                for(var j = 0; j < mapConfig.data.connections.length; j++){
                    var connectionData = mapConfig.data.connections[j];

                    // add connection
                    var addNewConnection= true;

                    for(var c = 0; c < currentConnectionData.length; c++){
                        if(
                            currentConnectionData[c].id === connectionData.id
                        ){
                            // connection already exists -> check for updates
                            if(
                                currentConnectionData[c].updated < connectionData.updated
                            ){
                                // connection changed -> update
                                var tempConnection = $().getConnectionById(mapData.config.id, connectionData.id);
                                updateConnection(tempConnection, currentConnectionData[c], connectionData);
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

                    if(deleteThisConnection === true){
                        // get connection from cache -> delete connection
                        var deleteConnection = $().getConnectionById(mapData.config.id, currentConnectionData[d].id);

                        if(deleteConnection){
                            // check if "source" and "target" still exist before remove
                            // this is NOT the case if the system was removed previous
                            if(
                                deleteConnection.source &&
                                deleteConnection.target
                            ){
                                mapConfig.map.detach(deleteConnection, {fireEvent: false});
                            }
                        }
                    }
                }

            });

            // update map "magnetization" when new systems where added
            if(newSystems > 0){
                MagnetizerWrapper.setElements(mapConfig.map);
            }
        }

        return mapContainer;
    };

    /**
     * update local connection cache
     * @param mapId
     * @param connection
     */
    var updateConnectionCache = function(mapId, connection){

        if(
            mapId > 0 &&
            connection
        ){
            var connectionId = parseInt( connection.getParameter('connectionId') );

            if(connectionId > 0){
                connectionCache[mapId][connectionId] = connection;
            }else{
                console.warn('updateConnectionCache', 'connectionId missing');
            }
        }else{
            console.warn('updateConnectionCache', 'missing data');
        }
    };

    /**
     * get a connection object from "cache" (this requires the "connectionCache" cache to be actual!
     * @param mapId
     * @param connectionId
     * @returns {*}
     */
    $.fn.getConnectionById = function(mapId, connectionId){

        var connection = null;

        if(
            connectionCache[mapId] &&
            connectionCache[mapId][connectionId]
        ){
            connection = connectionCache[mapId][connectionId];
        }

        return connection;
    };

    /**
     * make all systems appear visual on the map with its connections
     * @param show
     * @param callback
     */
    $.fn.visualizeMap = function(show, callback){
        var mapElement = $(this);

        // start map update counter -> prevent map updates during animations
        mapElement.getMapOverlay('timer').startMapUpdateCounter();

        var systemElements = mapElement.find('.' + config.systemClass);
        var endpointElements =  mapElement.find('.jsplumb-endpoint');
        var connectorElements = mapElement.find('.jsplumb-connector');
        var overlayElements = mapElement.find('.jsplumb-overlay, .tooltip');

        // if map empty (no systems), execute callback and return
        // no visual effects on larger maps
        if(
            systemElements.length === 0 ||
            systemElements.length > 20 ||
            endpointElements.length === 0
        ){
            callback();
            return;
        }

        // show nice animation
        if(show === 'show'){
            // hide elements
            systemElements.css('opacity', 0);
            endpointElements.css('opacity', 0);
            connectorElements.css('opacity', 0);
            overlayElements.css('opacity', 0);

            systemElements.velocity('transition.whirlIn', {
                stagger: 30,
                drag: true,
                duration: 100,
                //display: 'auto',
                complete: function(){
                    // show connections
                    endpointElements.velocity('transition.fadeIn', {
                        duration: 0
                    });

                    connectorElements.velocity('transition.fadeIn', {
                        stagger: 30,
                        duration: 120,
                        complete: function(){
                            callback();
                        }
                    });

                    // show overlay elements (if some exist)
                    if(overlayElements.length > 0){
                        overlayElements.delay(500).velocity('transition.fadeIn', {
                            stagger: 50,
                            duration: 180,
                            display: 'auto'
                        });
                    }
                }
            });
        }else if(show === 'hide'){

            $('.mCSB_container').velocity('callout.shake', {
                stagger: 0,
                drag: false,
                duration: 180,
                display: 'auto'
            });

            overlayElements.velocity('transition.fadeOut', {
                stagger: 50,
                drag: true,
                duration: 180,
                display: 'auto'
            });

            endpointElements.velocity('transition.fadeOut', {
                duration: 0,
                display: 'block',
                complete: function(){
                    // show connections
                    connectorElements.velocity('transition.fadeOut', {
                        stagger: 0,
                        drag: true,
                        duration: 20,
                        display: 'block'
                    });

                    systemElements.delay(100).velocity('transition.slideUpOut', {
                        stagger: 30,
                        drag: true,
                        duration: 180,
                        display: 'block',
                        complete: function(){
                            callback();
                        }
                    });
                }
            });
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

        // default connector for initial dragging a new connection
        sourceConfig.connector = MapUtil.getScopeInfoForConnection('wh', 'connectorDefinition');

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
     * @param map
     * @param systemData
     * @param connectedSystem
     */
    var drawSystem = function(map, systemData, connectedSystem){

        // check if systemData is valid
        if(isValidSystem(systemData)){
            var mapContainer = $(map.getContainer());

            // get System Element by data
            var newSystem = mapContainer.getSystem(map, systemData);

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
            if(connectedSystem){

                // hint: "type" will be auto detected by jump distance
                var connectionData = {
                    source: $(connectedSystem).data('id'),
                    target: newSystem.data('id'),
                    type: ['wh_fresh'] // default type.
                };
                var connection = drawConnection(map, connectionData);

                // store connection
                saveConnection(connection);
            }
        }
    };

    /**
     * make a system name/alias editable by x-editable
     * @param system
     */
    var makeEditable = function(system){
        system = $(system);
        var headElement = $(system).find('.' + config.systemHeadNameClass);

        headElement.editable({
            mode: 'popup',
            type: 'text',
            name: 'alias',
            emptytext: system.data('name'),
            title: 'System alias',
            placement: 'top',
            onblur: 'submit',
            container: 'body',
            toggle: 'manual',       // is triggered manually on dblClick
            showbuttons: false
        });

        headElement.on('save', function(e, params) {
            // system alias changed -> mark system as updated
            system.markAsChanged();
        });
    };

    /**
     * update z-index for a system (dragged systems should be always on top)
     */
    $.fn.updateSystemZIndex = function(){
        return this.each(function(){
            // increase global counter
            var newZIndexSystem = config.zIndexCounter++;
            $(this).css('z-index', newZIndexSystem);
        });
    };

    /**
     * connect two systems
     * @param map
     * @param connectionData
     * @returns new connection
     */
    var drawConnection = function(map, connectionData){
        var mapContainer = $( map.getContainer() );
        var mapId = mapContainer.data('id');
        var connectionId = connectionData.id || 0;
        var connection;
        var sourceSystem = $('#' + config.systemIdPrefix + mapId + '-' + connectionData.source);
        var targetSystem = $('#' + config.systemIdPrefix + mapId + '-' + connectionData.target);

        // check if both systems exists
        // (If not -> something went wrong e.g. DB-Foreign keys for "ON DELETE",...)
        if(
            sourceSystem.length &&
            targetSystem.length
        ){
            connection = map.connect({
                source: sourceSystem[0],
                target: targetSystem[0],
                /*
                 parameters: {
                 connectionId: connectionId,
                 updated: connectionData.updated
                 },
                 */
                type: null
                /* experimental (straight connections)
                 anchors: [
                 [ "Perimeter", { shape: 'Rectangle' }],
                 [ "Perimeter", { shape: 'Rectangle' }]
                 ]
                 */
            });

            // check if connection is valid (e.g. source/target exist
            if( connection instanceof jsPlumb.Connection ){

                // set connection parameters
                // they should persist even through connection type change (e.g. wh -> stargate,..)
                // therefore they should be part of the connection not of the connector
                connection.setParameters({
                    connectionId: connectionId,
                    updated: connectionData.updated,
                    eolUpdated: connectionData.eolUpdated
                });

                // add connection types -------------------------------------------------------------------------
                if(connectionData.type){
                    for(var i = 0; i < connectionData.type.length; i++){
                        connection.addType(connectionData.type[i]);
                    }
                }

                // add connection scope -------------------------------------------------------------------------
                // connection have the default map Scope scope
                var scope = map.Defaults.Scope;
                if(connectionData.scope){
                    scope = connectionData.scope;
                }
                setConnectionScope(connection, scope);
            }

            // set Observer for new Connection -> is automatically set
        }else{
            if( !sourceSystem.length ){
                console.warn('drawConnection(): source system (id: ' + connectionData.source + ') not found');
            }
            if( !targetSystem.length ){
                console.warn('drawConnection(): target system (id: ' + connectionData.target + ') not found');
            }
        }

        return connection;
    };

    /**
     * stores a connection in database
     * @param connection
     */
    var saveConnection = function(connection){

        if( connection instanceof jsPlumb.Connection ){

            var map = connection._jsPlumb.instance;
            var mapContainer = $( map.getContainer() );
            mapContainer.getMapOverlay('timer').startMapUpdateCounter();

            var mapId = mapContainer.data('id');
            var connectionData = getDataByConnection(connection);

            var requestData = {
                mapData: {
                    id: mapId
                },
                connectionData: connectionData
            };

            $.ajax({
                type: 'POST',
                url: Init.path.saveConnection,
                data: requestData,
                dataType: 'json',
                //context: connection
                context: {
                    connection: connection,
                    map: map,
                    mapId: mapId
                }
            }).done(function(newConnectionData){

                if( !$.isEmptyObject(newConnectionData) ){
                    // update connection data e.g. "scope" has auto detected
                    connection = updateConnection(this.connection, connectionData, newConnectionData);

                    // new connection should be cached immediately!
                    updateConnectionCache(this.mapId, connection);

                    // connection scope
                    var scope = MapUtil.getScopeInfoForConnection(newConnectionData.scope, 'label');

                    var title = 'New connection established';
                    if(connectionData.id > 0){
                        title = 'Connection switched';
                    }

                    Util.showNotify({title: title, text: 'Scope: ' + scope, type: 'success'});
                }else{
                    // some save errors
                    this.map.detach(this.connection, {fireEvent: false});
                }

            }).fail(function( jqXHR, status, error) {
                // remove this connection from map
                this.map.detach(this.connection, {fireEvent: false});

                var reason = status + ' ' + error;
                Util.showNotify({title: jqXHR.status + ': saveConnection', text: reason, type: 'warning'});
                $(document).setProgramStatus('problem');
            });
        }
    };

    /**
     * delete a connection and all related data
     * @param connections
     * @param callback
     */
    $.fn.deleteConnections = function(connections, callback){
        if(connections.length > 0){

            // remove connections from map
            var removeConnections = function(tempConnections){
                for(var i = 0; i < tempConnections.length; i++){
                    // if a connection is manually (drag&drop) detached, the jsPlumb instance does not exist any more
                    // connection is already deleted!
                    if(tempConnections[i]._jsPlumb){
                        tempConnections[i]._jsPlumb.instance.detach(tempConnections[i], {fireEvent: false});
                    }
                }
            };

            // prepare delete request
            var map = connections[0]._jsPlumb.instance;
            var mapContainer = $( map.getContainer() );
            mapContainer.getMapOverlay('timer').startMapUpdateCounter();

            var connectionIds = [];
            // connectionIds for delete request
            for(var i = 0; i < connections.length; i++){
                var connectionId = connections[i].getParameter('connectionId');
                // drag&drop a new connection does not have an id yet, if connection is not established correct
                if(connectionId !== undefined){
                    connectionIds[i] = connections[i].getParameter('connectionId');
                }
            }

            if(connectionIds.length > 0){
                var requestData = {
                    connectionIds: connectionIds
                };

                $.ajax({
                    type: 'POST',
                    url: Init.path.deleteConnection,
                    data: requestData,
                    dataType: 'json',
                    context: connections
                }).done(function(data){

                    // remove connections from map
                    removeConnections(this);

                    // optional callback
                    if(callback){
                        callback();
                    }

                }).fail(function( jqXHR, status, error) {
                    var reason = status + ' ' + error;
                    Util.showNotify({title: jqXHR.status + ': deleteSystem', text: reason, type: 'warning'});
                    $(document).setProgramStatus('problem');
                });
            }
        }
    };

    /**
     * compares the current data and new data of a connection and updates status
     * @param connection
     * @param connectionData
     * @param newConnectionData
     * @returns {*}
     */
    var updateConnection = function(connection, connectionData, newConnectionData){

        var map = connection._jsPlumb.instance;
        var mapContainer = $( map.getContainer() );
        var mapId = mapContainer.data('id');

        // check id, IDs should never change but must be set after initial save
        if(connection.getParameter('connectionId') !== newConnectionData.id){
            connection.setParameter('connectionId', newConnectionData.id);
        }

        // check scope
        if(connectionData.scope !== newConnectionData.scope){
            setConnectionScope(connection, newConnectionData.scope);
            // for some reason the observers are gone after scope change...
            setConnectionObserver(map, connection);
        }

        var addType = newConnectionData.type.diff( connectionData.type );
        var removeType = connectionData.type.diff( newConnectionData.type );

        // check if source or target has changed
        if(connectionData.source !== newConnectionData.source ){
            map.setSource(connection, config.systemIdPrefix + mapId + '-' + newConnectionData.source);
        }
        if(connectionData.target !== newConnectionData.target ){
            map.setTarget(connection, config.systemIdPrefix + mapId + '-' + newConnectionData.target);
        }

        // connection.targetId
        // add types
        for(var i = 0; i < addType.length; i++){
            if(
                addType[i].indexOf('fresh') !== -1 ||
                addType[i].indexOf('reduced') !== -1 ||
                addType[i].indexOf('critical') !== -1
            ){
                MapUtil.setConnectionWHStatus(connection, addType[i]);
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

        // set update date (important for update check)
        // important: set parameters ONE-by-ONE!
        // -> (setParameters() will overwrite all previous params)
        connection.setParameter('updated', newConnectionData.updated);
        connection.setParameter('eolUpdated', newConnectionData.eolUpdated);

        return connection;
    };

    /**
     * set/change connection scope
     * @param connection
     * @param scope
     */
    var setConnectionScope = function(connection, scope){
        var map = connection._jsPlumb.instance;
        var currentConnector = connection.getConnector();
        var newConnector = MapUtil.getScopeInfoForConnection(scope, 'connectorDefinition');

        if(currentConnector.type !== newConnector[0]){
            // connector has changed

            connection.setConnector( newConnector );

            // remove all connection types
            connection.clearTypes();

            // set new new connection type
            // if scope changed -> connection type == scope
            connection.setType( MapUtil.getDefaultConnectionTypeByScope(scope) );

            // change scope
            connection.scope = scope;

            // new observer is required after scope change
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
                {icon: 'fa-object-ungroup', action: 'select_all', text: 'select all'},
                {icon: 'fa-filter', action: 'filter_scope', text: 'filter scope', subitems: [
                    {subIcon: '', subAction: 'filter_wh', subText: 'wormhole'},
                    {subIcon: '', subAction: 'filter_stargate', subText: 'stargate'},
                    {subIcon: '', subAction: 'filter_jumpbridge', subText: 'jumpbridge'}
                ]},
                {divider: true, action: 'delete_systems'},
                {icon: 'fa-trash', action: 'delete_systems', text: 'delete systems'}
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
                {icon: 'fa-plane', action: 'frigate', text: 'frigate hole'},
                {icon: 'fa-warning', action: 'preserve_mass', text: 'preserve mass'},
                {icon: 'fa-crosshairs', action: 'change_scope', text: 'change scope', subitems: [
                    {subIcon: 'fa-minus-circle', subIconClass: '', subAction: 'scope_wh', subText: 'wormhole'},
                    {subIcon: 'fa-minus-circle', subIconClass: 'txt-color  txt-color-indigoDarkest', subAction: 'scope_stargate', subText: 'stargate'},
                    {subIcon: 'fa-minus-circle', subIconClass: 'txt-color  txt-color-tealLighter', subAction: 'scope_jumpbridge', subText: 'jumpbridge'}

                ]},
                {icon: 'fa-reply fa-rotate-180', action: 'change_status', text: 'change status', subitems: [
                    {subIcon: 'fa-clock-o', subAction: 'wh_eol', subText: 'toggle EOL'},
                    {subDivider: true},
                    {subIcon: 'fa-circle', subAction: 'status_fresh', subText: 'stage 1 (fresh)'},
                    {subIcon: 'fa-adjust', subAction: 'status_reduced', subText: 'stage 2 (reduced)'},
                    {subIcon: 'fa-circle-o', subAction: 'status_critical', subText: 'stage 3 (critical)'}

                ]},
                {divider: true, action: 'delete_connection'},
                {icon: 'fa-trash', action: 'delete_connection', text: 'delete'}
            ]
        };

        Render.showModule(moduleConfig, moduleData);

    };

    /**
     * load contextmenu template for systems
     */
    var initSystemContextMenu = function(){

        var systemStatus = [];
        $.each(Init.systemStatus, function(status, statusData){
            var tempStatus = {
                subIcon: 'fa-tag',
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
                {icon: 'fa-tags', text: 'set status', subitems: systemStatus},
                {icon: 'fa-reply fa-rotate-180', text: 'waypoints', subitems: [
                    {subIcon: 'fa-flag-checkered', subAction: 'set_destination', subText: 'set destination'},
                    {subDivider: true, action: ''},
                    {subIcon: 'fa-step-backward', subAction: 'add_first_waypoint', subText: 'add new [start]'},
                    {subIcon: 'fa-step-forward', subAction: 'add_last_waypoint', subText: 'add new [end]'}
                ]},
                {divider: true, action: 'delete_system'},
                {icon: 'fa-trash', action: 'delete_system', text: 'delete system(s)'}
            ]
        };

        Render.showModule(moduleConfig, moduleData);

    };

    /**
     * set up all actions that can be preformed on a system
     * @param map
     * @param system
     */
    var setSystemObserver = function(map, system){
        system = $(system);

        // get map container
        var mapContainer = $( map.getContainer() );
        var systemHeadExpand = $( system.find('.' + config.systemHeadExpandClass) );
        var systemBody = $( system.find('.' + config.systemBodyClass) );

        // map overlay will be set on "drag" start
        var mapOverlayTimer = null;

        // make system draggable
        map.draggable(system, {
            containment: 'parent',
            constrain: true,
            //scroll: true,                                             // not working because of customized scrollbar
            filter: '.' + config.systemHeadNameClass,                   // disable drag on "system name"
            snapThreshold: MapUtil.config.mapSnapToGridDimension,       // distance for grid snapping "magnet" effect (optional)
            start: function(params){
                var dragSystem = $(params.el);

                mapOverlayTimer = dragSystem.getMapOverlay('timer');

                // start map update timer
                mapOverlayTimer.startMapUpdateCounter();

                // check if grid-snap is enable -> this enables napping for !CURRENT! Element
                if( mapContainer.hasClass(MapUtil.config.mapGridClass) ){
                    params.drag.params.grid = [MapUtil.config.mapSnapToGridDimension, MapUtil.config.mapSnapToGridDimension];
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
                $(selectedSystems).toggleSystemTooltip('hide', {});

                // move them to the "top"
                $(selectedSystems).updateSystemZIndex();
            },
            drag: function(p){
                // start map update timer
                mapOverlayTimer.startMapUpdateCounter();

                // update system positions for "all" systems that are effected by drag&drop
                // this requires "magnet" feature to be active! (optional)
                MagnetizerWrapper.executeAtEvent(map, p.e);
            },
            stop: function(params){
                var dragSystem = $(params.el);

                // start map update timer
                mapOverlayTimer.startMapUpdateCounter();

                setTimeout(function(){
                    dragSystem.removeClass('no-click');
                }, Init.timer.DBL_CLICK + 50);

                // show tooltip
                dragSystem.toggleSystemTooltip('show', {show: true});

                // mark as "changed"
                dragSystem.markAsChanged();

                // set new position for popover edit field (system name)
                var newPosition = dragSystem.position();

                var placement = 'top';
                if(newPosition.top < 100){
                    placement = 'bottom';
                }
                if(newPosition.left < 100){
                    placement = 'right';
                }
                dragSystem.find('.' + config.systemHeadNameClass).editable('option', 'placement', placement);

                // drag system is not always selected
                var selectedSystems = mapContainer.getSelectedSystems().get();
                selectedSystems = selectedSystems.concat( dragSystem.get() );
                selectedSystems = $.unique( selectedSystems );

                for(var i = 0; i < selectedSystems.length; i++){
                    var tempSystem = $(selectedSystems[i]);
                    // repaint connections -> just in case something fails...
                    map.revalidate( tempSystem.attr('id') );
                }
            }
        });

        if(system.data('locked') === true){
            map.setDraggable(system, false);
        }

        // init system tooltips =============================================================================
        var systemTooltipOptions = {
            toggle: 'tooltip',
            placement: 'right',
            container: 'body',
            viewport: system.id
        };

        system.find('.fa').tooltip(systemTooltipOptions);

        // init system body expand ==========================================================================
        systemHeadExpand.hoverIntent(function(e){
            // hover in
            var hoverSystem = $(this).parents('.' + config.systemClass);
            var hoverSystemId = hoverSystem.attr('id');

            // bring system in front (increase zIndex)
            hoverSystem.updateSystemZIndex();

            // get ship counter and calculate expand height
            var userCount = parseInt( hoverSystem.data('userCount') );

            var expandHeight = userCount * config.systemBodyItemHeight;

            systemBody.velocity('stop').velocity(
                {
                    height: expandHeight + 'px',
                    width: 150,
                    'min-width': '150px'
                },{
                    easing: 'easeInOutQuart',
                    duration: 150,
                    progress: function(){
                        // repaint connections of current system
                        map.revalidate( hoverSystemId );
                    },
                    complete: function(){
                        map.revalidate( hoverSystemId );

                        // extend player name element
                        $(this).find('.' + config.systemBodyItemNameClass).css({width: '80px'});

                        $(this).find('.' + config.systemBodyRightClass).velocity('stop').velocity({
                            opacity: 1
                        },{
                            duration: 150,
                            display: 'auto'
                        });
                    }
                }
            );

        }, function(e){
            // hover out
            var hoverSystem = $(this).parents('.' + config.systemClass);
            var hoverSystemId = hoverSystem.attr('id');

            // stop animation (prevent visual bug if user spams hover-icon [in - out])
            systemBody.velocity('stop');

            // reduce player name element back to "normal" size (css class width is used)
            systemBody.find('.' + config.systemBodyItemNameClass).css({width: ''});

            systemBody.find('.' + config.systemBodyRightClass).velocity('stop').velocity( {
                opacity: 0,
                'min-width': '0px'
            },{
                easing: 'easeInOutQuart',
                duration: 150,
                display: 'none',
                complete: function(){
                    systemBody.velocity('stop').velocity('reverse', {
                        complete: function(){
                            // overwrite "complete" function from first "hover"-open
                            map.revalidate( hoverSystemId );
                        }
                    });
                }
            });

        });

        // context menu =====================================================================================

        // trigger context menu
        system.off('contextmenu').on('contextmenu', function(e){
            e.preventDefault();
            e.stopPropagation();

            var systemElement = $(this);

            // hide all map contextmenu options
            var hideOptions = getHiddenContextMenuOptions(systemElement);

            var activeOptions = getActiveContextMenuOptions(systemElement);

            $(e.target).trigger('pf:openContextMenu', [e, this, hideOptions, activeOptions]);
            return false;
        });

        // init context menu
        system.contextMenu({
            menuSelector: '#' + config.systemContextMenuId,
            menuSelected: function (params) {

                // click action
                var action = params.selectedMenu.attr('data-action');

                // current system
                var currentSystem = $(params.component);

                // system name
                var currentSystemName = currentSystem.getSystemInfo( ['alias'] );

                var systemData = {};

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

                        currentSystem.markAsChanged();
                        break;
                    case 'set_rally':
                        // toggle rally point
                        if( !currentSystem.data( 'rallyUpdated' ) ){
                            $.fn.showRallyPointDialog(currentSystem);
                        }else{
                            // remove rally point
                            currentSystem.setSystemRally(0);
                            currentSystem.markAsChanged();
                        }
                        break;
                    case 'change_status_unknown':
                    case 'change_status_friendly':
                    case 'change_status_occupied':
                    case 'change_status_hostile':
                    case 'change_status_empty':
                    case 'change_status_unscanned':
                        // change system status
                        currentSystem.getMapOverlay('timer').startMapUpdateCounter();

                        var statusString = action.split('_');

                        currentSystem.setSystemStatus(statusString[2]);

                        currentSystem.markAsChanged();
                        break;
                    case 'delete_system':
                        // delete this system AND delete selected systems as well
                        var selectedSystems = mapContainer.getSelectedSystems();
                        $.merge(selectedSystems, currentSystem);
                        $.uniqueSort(selectedSystems);
                        $.fn.showDeleteSystemDialog(map, selectedSystems);
                        break;
                    case 'set_destination':
                    case 'add_first_waypoint':
                    case 'add_last_waypoint':
                        systemData = system.getSystemData();
                        Util.setDestination(systemData, action);
                        break;
                }
            }
        });

        // system click events ==============================================================================
        var double = function(e){
            var system = $(this);
            var headElement = $(system).find('.' + config.systemHeadNameClass);

            // update z-index for system, editable field should be on top
            // move them to the "top"
            $(system).updateSystemZIndex();

            // show "set alias" input (x-editable)
            headElement.editable('show');
        };

        var single = function(e){

            // check if click was performed on "popover" (x-editable)
            var popoverClick = false;
            if( $(e.target).parents('.popover').length ){
                popoverClick = true;
            }

            // continue if click was *not* on a popover dialog of a system
            if( !popoverClick ){
                var system = $(this);

                // check if system is locked for "click" events
                if( !system.hasClass('no-click') ){
                    // left mouse button
                    if(e.which === 1){
                        if(! system.hasClass('no-click')){
                            if(e.ctrlKey === true){
                                // select system
                                system.toggleSelectSystem(map);
                            }else{
                                system.showSystemInfo(map);
                            }
                        }
                    }
                }
            }

        };

        system.singleDoubleClick(single, double);
    };

    /**
     * mark a dom element (map, system, connection) as changed
     */
    $.fn.markAsChanged = function(){
        return this.each(function(){
            var element = $(this);

            if( element.hasClass(config.systemClass) ){
                // system element
                element.data('updated', 0);
            }else{
                // connection element
                this.setParameter('updated', 0);
            }
        });
    };

    /**
     * check if an dom element (system, connection) has changed
     * @returns {boolean}
     */
    $.fn.hasChanged = function(){
        var element = $(this);
        var changed = false;

        if( element.hasClass(config.systemClass) ){
            // system element
            changed = (element.data('updated') === 0);
        }else{
            // connection element
            changed = (this[0].getParameter('updated') === 0);
        }

        return changed;
    };

    /**
     * triggers the "showSystemInfo" event, that is responsible for initializing the "map info" panel
     * @param map
     */
    $.fn.showSystemInfo = function(map){
        var system = $(this);

        // activate system
        markSystemActive(map, system);

        // get parent Tab Content and fire update event
        var tabContentElement = MapUtil.getTabContentElementByMapElement( system );

        // collect all required data from map module to update the info element
        // store them global and assessable for each module
        var currentSystemData = {
            systemData: system.getSystemData(),
            mapId: parseInt( system.attr('data-mapid') )
        };

        Util.setCurrentSystemData(currentSystemData);

        $(tabContentElement).trigger('pf:drawSystemModules');
    };

    /**
     * toggle selectable status of a system
     */
    $.fn.toggleSelectSystem = function(map){

        return this.each(function(){
            var system = $(this);

            if( system.data('locked') !== true ){

                if( system.hasClass( config.systemSelectedClass ) ){
                    system.removeClass( config.systemSelectedClass );

                    map.removeFromDragSelection(system);
                }else{
                    system.addClass( config.systemSelectedClass );
                    map.addToDragSelection(system);
                }
            }
        });
    };

    /**
     * get all selected (NOT active) systems in a map
     * @returns {*}
     */
    $.fn.getSelectedSystems = function(){
        var mapElement = $(this);
        return mapElement.find('.' + config.systemSelectedClass);
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
                Util.showNotify({title: 'System unlocked', text: systemName, type: 'unlock'});
            }
        }else{
            system.data('locked', true);
            system.addClass( config.systemLockedClass );

            // enable draggable
            map.setDraggable(system, false);

            if(! hideNotification){
                Util.showNotify({title: 'System locked', text: systemName,  type: 'lock'});
            }
        }

        // repaint connections
        map.revalidate( system.attr('id') );


        if(! hideCounter){
            $(system).getMapOverlay('timer').startMapUpdateCounter();
        }

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
            menuSelector: '#' + config.mapContextMenuId,
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
                    case 'select_all':

                        var allSystems =  currentMapElement.find('.' + config.systemClass + ':not(.' + config.systemSelectedClass + ')');

                        // filter non-locked systems
                        allSystems = allSystems.filter(function(i, el){
                            return ( $(el).data('locked') !== true );
                        });

                        allSystems.toggleSelectSystem(currentMap);

                        Util.showNotify({title: allSystems.length + ' systems selected', type: 'success'});
                        break;
                    case 'filter_wh':
                    case 'filter_stargate':
                    case 'filter_jumpbridge':
                        // filter (show/hide)
                        var filterScope = action.split('_')[1];

                        // scope label
                        var filterScopeLabel = MapUtil.getScopeInfoForMap(filterScope, 'label');

                        var showScope = true;
                        if(
                            currentMapElement.data('filter_scope') &&
                            currentMapElement.data('filter_scope') === filterScope
                        ){
                            // remove scope filter
                            currentMapElement.data('filter_scope', false);
                            showScope = false;

                            // hide map overlay filter info
                            currentMapElement.getMapOverlay('info').updateOverlayIcon('filter', 'hide');
                        }else{
                            // set scope filter
                            currentMapElement.data('filter_scope', filterScope);

                            // show map overlay filter info
                            currentMapElement.getMapOverlay('info').updateOverlayIcon('filter', 'show');
                        }

                        var filteredConnections = currentMap.getAllConnections(filterScope);

                        for(var i = 0; i < filteredConnections.length; i++){
                            var tempConnection = filteredConnections[i];

                            var tempEndpoints = tempConnection.endpoints;
                            var setVisible = true;

                            if(
                                showScope &&
                                tempConnection.scope !== filterScope
                            ){
                                setVisible = false;
                            }


                            for(var j = 0; j < tempEndpoints.length; j++){
                                tempEndpoints[j].setVisible( setVisible );
                            }
                        }

                        Util.showNotify({title: 'Scope filter changed', text: filterScopeLabel, type: 'success'});

                        break;
                    case 'delete_systems':
                        // delete all selected systems with its connections
                        var selectedSystems = currentMapElement.getSelectedSystems();
                        $.fn.showDeleteSystemDialog(currentMap, selectedSystems);
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
            selectOnMove: true,
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

        // catch events =========================================================

        // toggle global map option (e.g. "grid snap", "magnetization")
        $(mapContainer).on('pf:menuMapOption', function(e, mapOption){
            var mapElement = $(this);

            // get map menu config options
            var data = MapUtil.mapOptions[mapOption.option];

            var promiseStore = MapUtil.getLocaleData('map', mapElement.data('id') );
            promiseStore.then(function(dataStore) {
                var notificationText = 'disabled';
                var button = $('#' + this.data.buttonId);
                var dataExists = false;

                if(
                    dataStore &&
                    dataStore[this.mapOption.option]
                ){
                    dataExists = true;
                }

                if(dataExists === mapOption.toggle){

                    // toggle button class
                    button.removeClass('active');

                    // toggle map class (e.g. for grid)
                    if(this.data.class){
                        this.mapElement.removeClass( MapUtil.config[this.data.class] );
                    }

                    // call optional jQuery extension on mapElement
                    if(this.data.onDisable){
                        $.fn[ this.data.onDisable ].apply( this.mapElement );
                    }

                    // show map overlay info icon
                    this.mapElement.getMapOverlay('info').updateOverlayIcon(this.mapOption.option, 'hide');

                    // delete map option
                    MapUtil.deleteLocalData('map', this.mapElement.data('id'), this.mapOption.option );
                }else{

                    // toggle button class
                    button.addClass('active');

                    // toggle map class (e.g. for grid)
                    if(this.data.class){
                        this.mapElement.addClass( MapUtil.config[this.data.class] );
                    }

                    // call optional jQuery extension on mapElement
                    if(this.data.onEnable){
                        $.fn[ this.data.onEnable ].apply( this.mapElement );
                    }

                    // hide map overlay info icon
                    this.mapElement.getMapOverlay('info').updateOverlayIcon(this.mapOption.option, 'show');

                    // store map option
                    MapUtil.storeLocalData('map', this.mapElement.data('id'), this.mapOption.option, 1 );

                    notificationText = 'enabled';
                }

                if(mapOption.toggle){
                    Util.showNotify({title: this.data.description, text: notificationText, type: 'info'});
                }
            }.bind({
                mapOption: mapOption,
                data: data,
                mapElement: mapElement
            }));
        });

        // delete system event
        // triggered from "map info" dialog scope
        $(mapContainer).on('pf:deleteSystems', function(e, data){
            System.deleteSystems(map, data.systems, data.callback);
        });

        $(mapContainer).on('pf:menuSelectSystem', function(e, data){
            var tempMapContainer = $(this);
            var systemId = config.systemIdPrefix + tempMapContainer.data('id') + '-' + data.systemId;
            var system = $(this).find('#' + systemId);

            if(system.length === 1){
                // scroll to system
                var tempMapWrapper = tempMapContainer.parents('.' + config.mapWrapperClass);
                tempMapWrapper.mCustomScrollbar('scrollTo', system);

                // select system
                system.showSystemInfo(map);
            }
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
                hiddenOptions.push('preserve_mass');
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
            if(component.data('rallyUpdated') > 0){
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

        // if the connection already exists -> do not set it twice
        connection.unbind('contextmenu').bind('contextmenu', function(component, e) {
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
            menuSelector: '#' + config.connectionContextMenuId,
            menuSelected: function (params){

                var action = params.selectedMenu.attr('data-action');
                var activeConnection = params.component;
                var activeScope = activeConnection.scope;
                var activeScopeName = MapUtil.getScopeInfoForConnection( activeScope, 'label');

                switch(action){
                    case 'delete_connection':
                        // delete a single connection

                        // confirm dialog
                        bootbox.confirm('Is this connection really gone?', function(result) {
                            if(result){
                                $().deleteConnections([activeConnection]);
                            }
                        });
                        break;
                    case 'frigate':         // set as frigate hole
                    case 'preserve_mass':   // set "preserve mass
                    case 'wh_eol':          // set "end of life"
                        mapElement.getMapOverlay('timer').startMapUpdateCounter();

                        activeConnection.toggleType( action );

                        $(activeConnection).markAsChanged();
                        break;
                    case 'status_fresh':
                    case 'status_reduced':
                    case 'status_critical':
                        var newStatus = action.split('_')[1];
                        mapElement.getMapOverlay('timer').startMapUpdateCounter();

                        MapUtil.setConnectionWHStatus(activeConnection, 'wh_' + newStatus);
                        $(activeConnection).markAsChanged();
                        break;
                    case 'scope_wh':
                    case 'scope_stargate':
                    case 'scope_jumpbridge':
                        var newScope = action.split('_')[1];
                        var newScopeName =  MapUtil.getScopeInfoForConnection( newScope, 'label');

                        bootbox.confirm('Change scope from ' + activeScopeName + ' to ' + newScopeName + '?', function(result) {
                            if(result){

                                mapElement.getMapOverlay('timer').startMapUpdateCounter();

                                setConnectionScope(activeConnection, newScope);

                                Util.showNotify({title: 'Connection scope changed', text: 'New scope: ' + newScopeName, type: 'success'});

                                $(activeConnection).markAsChanged();
                            }
                        });
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
                    var systemHeadNameElement = $(this).find('.' + config.systemHeadNameClass);
                    var alias = '';
                    if( systemHeadNameElement.hasClass('editable') ){
                        // xEditable is initiated
                        alias = systemHeadNameElement.editable('getValue', true);
                    }

                    systemInfo.push(alias );
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

        // format system status for form select -------------------------------------------------------------
        var systemStatus = {};
        // "default" selection (id = 0) prevents status from being overwritten
        // -> e.g. keep status information if system was just inactive (active = 0)
        systemStatus[0] = 'default';

        $.each(Init.systemStatus, function(status, statusData){
            systemStatus[statusData.id] = statusData.label;
        });

        // default system status -> first status entry
        var defaultSystemStatus = 0;

        // get current map data -> disable systems that are already on it -----------------------------------
        var mapData = mapContainer.getMapDataFromClient({forceData: true});
        var mapSystems = mapData.data.systems;
        var mapSystemIds = [];
        for(let i = 0; i < mapSystems.length; i++ ){
            mapSystemIds.push( mapSystems[i].systemId );
        }

        // dialog data --------------------------------------------------------------------------------------
        var data = {
            id: config.systemDialogId,
            selectClass: config.systemDialogSelectClass
        };

        // set current position as "default" system to add --------------------------------------------------
        var currentCharacterLog = Util.getCurrentCharacterLog();

        if(
            currentCharacterLog !== false &&
            mapSystemIds.indexOf( currentCharacterLog.system.id ) === -1
        ){
            // current system is NOT already on this map
            // set current position as "default" system to add
            data.currentSystem = currentCharacterLog.system;
        }

        requirejs(['text!templates/dialog/system.html', 'mustache'], function(template, Mustache) {

            var content = Mustache.render(template, data);

            var systemDialog = bootbox.dialog({
                title: 'Add new system',
                message: content,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fa fa-fw fa-check"></i> save',
                        className: 'btn-success',
                        callback: function (e) {
                            // get form Values
                            var form = $('#' + config.systemDialogId).find('form');

                            var systemDialogData = $(form).getFormValues();

                            // validate form
                            form.validator('validate');

                            // check whether the form is valid
                            var formValid = form.isValidForm();

                            if(formValid === false){
                                // don't close dialog
                                return false;
                            }

                            mapContainer.getMapOverlay('timer').startMapUpdateCounter();

                            // calculate new system position ------------------------------------------------
                            var newPosition = {
                                x: 0,
                                y: 0
                            };

                            var sourceSystem = null;

                            // add new position
                            if(options.sourceSystem !== undefined){

                                sourceSystem = options.sourceSystem;

                                // get new position
                                newPosition = calculateNewSystemPosition(sourceSystem);
                            }else{
                                // check mouse cursor position (add system to map)
                                newPosition = {
                                    x: options.position.x,
                                    y: options.position.y
                                };
                            }

                            systemDialogData.position = newPosition;

                            // ------------------------------------------------------------------------------

                            var requestData = {
                                systemData: systemDialogData,
                                mapData: {
                                    id: mapContainer.data('id')
                                }
                            };

                            saveSystem(map, requestData, sourceSystem, function(){
                                bootbox.hideAll();
                            });
                            return false;
                        }
                    }
                }
            });

            // init dialog
            systemDialog.on('shown.bs.modal', function(e) {

                var modalContent = $('#' + config.systemDialogId);

                // init system select live search  - some delay until modal transition has finished
                var selectElement = modalContent.find('.' + config.systemDialogSelectClass);
                selectElement.delay(240).initSystemSelect({
                    key: 'systemId',
                    disabledOptions: mapSystemIds
                });
            });

            // init system status select
            var modalFields = $('.bootbox .modal-dialog').find('.pf-editable-system-status');

            modalFields.editable({
                mode: 'inline',
                emptytext: 'unknown',
                onblur: 'submit',
                showbuttons: false,
                source: systemStatus,
                value: defaultSystemStatus,
                inputclass: config.systemDialogSelectClass
            });
        });
    };

    /**
     * save a new system and add it to the map
     * @param map
     * @param requestData
     * @param sourceSystem
     * @param callback
     */
    var saveSystem = function(map, requestData, sourceSystem, callback){
        $.ajax({
            type: 'POST',
            url: Init.path.saveSystem,
            data: requestData,
            dataType: 'json',
            context: {
                map: map,
                sourceSystem: sourceSystem
            }
        }).done(function(newSystemData){

            // draw new system to map
            drawSystem(this.map, newSystemData, this.sourceSystem);

            Util.showNotify({title: 'New system', text: newSystemData.name, type: 'success'});

            // re/arrange systems (prevent overlapping)
            MagnetizerWrapper.setElements(this.map);

            if(callback){
                callback();
            }
        }).fail(function( jqXHR, status, error) {
            var reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': saveSystem', text: reason, type: 'warning'});
            $(document).setProgramStatus('problem');
        });
    };

    /**
     * calculate the x/y coordinates for a new system - relativ to a source system
     * @param sourceSystem
     * @returns {{x: *, y: *}}
     */
    var calculateNewSystemPosition = function(sourceSystem){

        // related system is available
        var currentX = sourceSystem.css('left');
        var currentY = sourceSystem.css('top');

        // remove "px"
        currentX = parseInt( currentX.substring(0, currentX.length - 2) );
        currentY = parseInt( currentY.substring(0, currentY.length - 2) );

        var newPosition = {
            x: currentX + config.newSystemOffset.x,
            y: currentY + config.newSystemOffset.y
        };

        return newPosition;
    };

    /**
     * updates all systems on map with current user Data (all users on this map)
     * update the Data of the user that is currently viewing the map (if available)
     * @param userData
     * @returns {boolean}
     */
    $.fn.updateUserData = function(userData){

        var returnStatus = true;

        // get new map instance or load existing
        var map = getMapInstance(userData.config.id);

        var mapElement = map.getContainer();

        // container must exist! otherwise systems can not be updated
        if(mapElement !== undefined){

            mapElement = $(mapElement);

            // get current character log data
            var currentCharacterLog = Util.getCurrentCharacterLog();

            // check if map is frozen
            if(mapElement.data('frozen') === true){
                return returnStatus;
            }

            // data for header update
            var headerUpdateData = {
                mapId: userData.config.id,
                userCount: 0                        // active user in a map
            };

            // check if current user was found on the map
            var currentUserOnMap = false;

            // get all systems
            var systems = mapElement.find('.' + config.systemClass);

            for(var i = 0; i < systems.length; i++){
                // get user Data for System

                var system = $( systems[i] );

                var systemId = $(system).data('systemId');

                var tempUserData = null;

                // check if user is currently in "this" system
                var currentUserIsHere = false;

                var j = userData.data.systems.length;

                // search backwards to avoid decrement the counter after splice()
                while (j--) {
                    var systemData = userData.data.systems[j];

                    // check if any user is in this system
                    if (systemId === systemData.id) {
                        tempUserData = systemData;

                        // add  "user count" to "total map user count"
                        headerUpdateData.userCount += tempUserData.user.length;

                        // remove system from "search" array -> speed up loop
                        userData.data.systems.splice(j, 1);
                    }
                }

                // the current user can only be in a single system ------------------------------------------
                if( !currentUserOnMap){

                    if(
                        currentCharacterLog &&
                        currentCharacterLog.system &&
                        currentCharacterLog.system.id === systemId
                    ){
                        currentUserIsHere = true;
                        currentUserOnMap = true;

                        // set current location data for header update
                        headerUpdateData.currentSystemId =  $(system).data('id');
                        headerUpdateData.currentSystemName = currentCharacterLog.system.name;
                    }
                }

                system.updateSystemUserData(map, tempUserData, currentUserIsHere);
            }

            // trigger document event -> update header
            $(document).trigger('pf:updateHeaderMapData', headerUpdateData);
        }

        return returnStatus;
    };

    /**
     * collect all map data for export/save for a map
     * this function returns the "client" data NOT the "server" data for a map
     * @param options
     * @returns {*}
     */
    $.fn.getMapDataFromClient = function(options){
        var mapElement = $(this);

        var map = getMapInstance( mapElement.data('id') );

        var mapData = {};

        // check if there is an active map counter that prevents collecting map data
        var overlay = mapElement.getMapOverlay('timer');
        var counterChart = overlay.getMapCounter();

        var interval = counterChart.data('interval');

        if(
            ! interval ||
            options.forceData === true
        ){

            // map config -----------------------------------------------------------------------------------
            mapData.config = {
                id: parseInt( mapElement.data('id') ),
                name: mapElement.data('name'),
                scope: {
                    id: parseInt( mapElement.data('scopeId') )
                },
                icon: mapElement.data('icon'),
                type: {
                    id: parseInt( mapElement.data('typeId') )
                },
                created: parseInt( mapElement.data('created') ),
                updated: parseInt( mapElement.data('updated') ),
            };

            // map data -------------------------------------------------------------------------------------
            var data = {};

            // systems data ---------------------------------------------------------------------------------
            var systemsData = [];
            var systems = mapElement.getSystems();

            for(var i = 0; i < systems.length; i++){
                var tempSystem = $(systems[i]);

                // check if system data should be added
                var addSystemData = true;
                if(
                    options.getAll !== true &&
                    options.checkForChange === true &&
                    !tempSystem.hasChanged()
                ){
                    addSystemData = false;
                }

                if(addSystemData){
                    systemsData.push( tempSystem.getSystemData() );
                }
            }

            data.systems = systemsData;

            // connections ----------------------------------------------------------------------------------
            var connections = map.getAllConnections();
            var connectionsFormatted = [];

            // new connections cache
            var updatedConnectionCache = {};

            // format connections
            for(var j = 0; j < connections.length; j++){
                var tempConnection = connections[j];

                // check if connection data should be added
                var addConnectionData = true;
                if(
                    options.getAll !== true &&
                    options.checkForChange === true &&
                    !$(tempConnection).hasChanged()
                ){
                    addConnectionData = false;
                }

                var connectionData = getDataByConnection(tempConnection);

                if(addConnectionData){
                    connectionsFormatted.push( connectionData );
                }

                // add to cache
                updatedConnectionCache[connectionData.id] = tempConnection;
            }

            // overwrite connection cache
            connectionCache[mapData.config.id] = updatedConnectionCache;

            data.connections = connectionsFormatted;

            mapData.data = data;
        }else{
            return false;
        }

        return mapData;
    };

    /**
     * get all relevant data for a system object
     * @returns {{}}
     */
    $.fn.getSystemData = function(){
        var system = $(this);

        var systemData = {};
        systemData.id = parseInt( system.data('id') );
        systemData.systemId = parseInt( system.data('systemId') );
        systemData.name = system.data('name');
        systemData.alias = system.getSystemInfo(['alias']);
        systemData.effect = system.data('effect');
        systemData.type = {
            id: system.data('typeId')
        };
        systemData.security = system.data('security');
        systemData.trueSec = system.data('trueSec');
        systemData.region = {
            id: system.data('regionId'),
            name: system.data('region')
        };
        systemData.constellation = {
            id: system.data('constellationId'),
            name: system.data('constellation')
        };
        systemData.status = {
            id: system.data('statusId')
        };
        systemData.locked = system.data('locked') ? 1 : 0;
        systemData.rallyUpdated = system.data('rallyUpdated') || 0;
        systemData.rallyPoke = system.data('rallyPoke') ? 1 : 0;
        systemData.currentUser = system.data('currentUser'); // if user is currently in this system
        systemData.statics = system.data('statics');
        systemData.updated = {
            updated: parseInt( system.data('updated') )
        };
        systemData.userCount = (system.data('userCount') ? parseInt( system.data('userCount') ) : 0);

        // position -----------------------------------------------------------------------------------------
        var positionData = {};
        var currentX = system.css('left');
        var currentY = system.css('top');

        // remove 'px'
        positionData.x = parseInt( currentX.substring(0, currentX.length - 2) );
        positionData.y = parseInt( currentY.substring(0, currentY.length - 2) );

        systemData.position = positionData;

        return systemData;
    };

    /**
     * get all relevant data for a connection object
     * @param connection
     * @returns {{id: Number, source: Number, sourceName: (*|T|JQuery|{}), target: Number, targetName: (*|T|JQuery), scope: *, type: *, updated: Number}}
     */
    var getDataByConnection = function(connection){

        var source = $(connection.source);
        var target = $(connection.target);

        var id = connection.getParameter('connectionId');
        var updated = connection.getParameter('updated');

        var connectionTypes = connection.getType();

        // normalize connection array
        connectionTypes = $.grep(connectionTypes, function(n){
            // 'default' is added by jsPlumb by default -_-
            return ( n.length > 0 && n !== 'default');
        });

        var data = {
            id: id ? id : 0,
            source: parseInt( source.data('id') ),
            sourceName: source.data('name'),
            target: parseInt( target.data('id') ),
            targetName: target.data('name'),
            scope: connection.scope,
            type: connectionTypes,
            updated: updated ? updated : 0
        };

        return data;
    };

    /**
     * removes a map instance from local cache
     * @param mapId
     */
    var clearMapInstance = function(mapId){
        if(typeof activeInstances[mapId] === 'object'){
            delete activeInstances[mapId];
        }
    };

    /**
     * get a new jsPlumb map instance or or get a cached one for update
     * @param mapId
     * @returns {*}
     */
    var getMapInstance = function(mapId){

        if(typeof activeInstances[mapId] !== 'object'){
            // create new instance
            jsPlumb.Defaults.LogEnabled = true;

            var newJsPlumbInstance =  jsPlumb.getInstance({
                Anchor: 'Continuous',                                               // anchors on each site
                Container: null,                                                    // will be set as soon as container is connected to DOM
                PaintStyle: {
                    lineWidth: 4,                                                   // width of a Connector's line. An integer.
                    strokeStyle: 'red',                                             // color for a Connector
                    outlineColor: 'red',                                            // color of the outline for an Endpoint or Connector. see fillStyle examples.
                    outlineWidth: 2                                                 // width of the outline for an Endpoint or Connector. An integer.
                },
                Connector: [ 'Bezier', { curviness: 40 } ],                         // default connector style (this is not used!) all connections have their own style (by scope)
                Endpoint: [ 'Dot', { radius: 5 } ],
                ReattachConnections: false,                                         // re-attach connection if dragged with mouse to "nowhere"
                Scope: Init.defaultMapScope,                                        // default map scope for connections
                LogEnabled: true
            });

            // register all available connection types ------------------------------------------------------
            newJsPlumbInstance.registerConnectionTypes(globalMapConfig.connectionTypes);

            // event after a new connection is established --------------------------
            newJsPlumbInstance.bind('connection', function(info, e) {
                // set connection observer
                setConnectionObserver(newJsPlumbInstance, info.connection);
            });

            // event after connection moved -----------------------------------------------------------------
            newJsPlumbInstance.bind('connectionMoved', function(info, e) {

            });

            // event after DragStop a connection or new connection ------------------------------------------
            newJsPlumbInstance.bind('beforeDrop', function(info) {
                var connection = info.connection;

                // lock the target system for "click" events
                // to prevent loading system information
                var sourceSystem = $('#' + info.sourceId);
                var targetSystem = $('#' + info.targetId);
                sourceSystem.addClass('no-click');
                targetSystem.addClass('no-click');
                setTimeout(function(){
                    sourceSystem.removeClass('no-click');
                    targetSystem.removeClass('no-click');
                }, Init.timer.DBL_CLICK + 50);

                // set "default" connection status only for NEW connections
                if(!connection.suspendedElement){
                    MapUtil.setConnectionWHStatus(connection, MapUtil.getDefaultConnectionTypeByScope(connection.scope) );
                }

                // prevent multiple connections between same systems
                var connections = MapUtil.checkForConnection(newJsPlumbInstance, info.sourceId, info.targetId );

                if(connections.length > 1){
                    bootbox.confirm('Connection already exists. Do you really want to add an additional one?', function(result) {
                        if(!result){
                            connection._jsPlumb.instance.detach(connection);
                        }
                    });
                }

                // always save the new connection
                saveConnection(connection);

                return true;
            });

            // event before Detach connection ---------------------------------------------------------------
            newJsPlumbInstance.bind('beforeDetach', function(info) {
                return true;
            });

            newJsPlumbInstance.bind('connectionDetached', function(info, e){
                // a connection is manually (drag&drop) detached! otherwise this event should not be send!
                var connection = info.connection;
                $().deleteConnections([connection]);
            });

            newJsPlumbInstance.bind('checkDropAllowed', function(params){
                // connections can not be attached to foreign endpoints
                // the only endpoint available is endpoint from where the connection was dragged away (re-attach)

                return true;
            });

            activeInstances[mapId] = newJsPlumbInstance;
        }

        return activeInstances[mapId];
    };

    /**
     * load OR updates system map
     * @param mapConfig
     * @param options
     */
    $.fn.loadMap = function(mapConfig, options){

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
            var mapContainer = updateMap(parentElement, mapConfig);

            if(newMap){
                // init custom scrollbars and add overlay
                parentElement.initMapScrollbar();

                // show static overlay actions
                var mapElement = mapConfig.map.getContainer();
                var mapOverlay = $(mapElement).getMapOverlay('info');
                mapOverlay.updateOverlayIcon('systemRegion', 'show');

                mapOverlay.updateOverlayIcon('systemConnectionTimer', 'show');
            }

            // callback function after tab switch
            function switchTabCallback( mapName, mapContainer ){
                Util.showNotify({title: 'Map initialized', text: mapName  + ' - loaded', type: 'success'});

                var mapWrapper = mapContainer.parents('.' + config.mapWrapperClass);

                // auto scroll map to previous position -----------------------------------------------------
                var promiseStore = MapUtil.getLocaleData('map', mapContainer.data('id') );
                promiseStore.then(function(data) {
                    // This code runs once the value has been loaded
                    // from the offline store.
                    if(
                        data &&
                        data.offsetX
                    ){
                        mapWrapper.scrollToX(data.offsetX);
                    }
                });

                // init magnetizer --------------------------------------------------------------------------
                mapContainer.triggerMenuEvent('MapOption', {
                    option: 'mapMagnetizer',
                    toggle: false
                });

                // init grid snap ---------------------------------------------------------------------------
                mapContainer.triggerMenuEvent('MapOption', {
                    option: 'mapSnapToGrid',
                    toggle: false
                });

                return false;
            }

            if(options.showAnimation){
                // show nice visualization effect
                mapContainer.visualizeMap('show', function(){
                    switchTabCallback( mapConfig.config.name, mapContainer );
                });
            }
        });
    };

    /**
     * init scrollbar for Map element
     */
    $.fn.initMapScrollbar = function(){
        // get Map Scrollbar
        var scrollableElement = $(this).find('.' + config.mapWrapperClass);

        scrollableElement.initCustomScrollbar({
            callbacks: {
                onScroll: function(){
                    // scroll complete
                    var mapElement = $(this).find('.' + config.mapClass);
                    // store new map scrollOffset -> localDB
                    MapUtil.storeLocalData('map', mapElement.data('id'), 'offsetX', Math.abs(this.mcs.left) );
                },
                onScrollStart: function(){
                    // hide all open xEditable fields
                    $(this).find('.editable').editable('hide');

                    // hide all system head tooltips
                    $(this).find('.' + config.systemHeadClass + ' .fa').tooltip('hide');
                },
                whileScrolling:function(){
                    // update scroll position for drag-frame-selection
                    var mapElement = $(scrollableElement).find('.' + config.mapClass);
                    $(mapElement).data('scrollLeft', this.mcs.left);
                    $(mapElement).data('scrollTop', this.mcs.top);
                }
            }
        });

        // --------------------------------------------------------------------------------------------------
        // add map overlays after scrollbar is initialized
        // because of its absolute position
        scrollableElement.initMapOverlays();
    };

    return {
        getMapInstance: getMapInstance,
        clearMapInstance: clearMapInstance,

        getDataByConnection: getDataByConnection
    };

});