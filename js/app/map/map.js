define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'app/ccp',
    'jsPlumb',
    'customScrollbar',
    'dragToSelect',
    'select2',
    'app/map/contextmenu'
], function($, Init, Util, Render, bootbox, CCP) {

    "use strict";

    var config = {
        // TODO: remove temp ID counter
        tempId: 100,
        zIndexCounter: 110,
        logTimerCount: 3,                                              // map log timer in seconds
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
        systemBodyItemHeight: 16,                                       // px of a system body entry
        systemBodyItemClass: 'pf-system-body-item',                     // class for a system body entry
        systemBodyItemStatusClass: 'pf-user-status',
        systemBodyRightClass: 'pf-system-body-right',
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
        systemSecWHLow: 'pf-system-sec-low',
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
            },
            beforeDetach:function(connection) {
                return true;
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
     * updates a system with current information
     * @param map
     * @param data
     * @param currentUserData // data of the user that is currently viewing this map
     */
    $.fn.updateSystemUserData = function(map, data, currentUserData){

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
        if(currentUserData){
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
                cacheArray.push(tempUserData.id + '_' + tempUserData.log.ship.typeName);
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
                for(var j = 0; j < data.user.length; j++){
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
                            $('<li>', {
                                class: ['fa', 'fa-circle', config.systemBodyItemStatusClass, statusClass].join(' ')
                            })
                        ).append(
                            $('<span>', {
                                text: ' ' + userName
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
                        system.toggleBody(true, map, {complete: function(){
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
                systemHeadExpand.velocity('stop', true).velocity('reverse',{
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
                        callback.complete();
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
     * @param systems
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
            }else if(show === 'hide'){
                system.tooltip( show );
            } else if(show === 'toggle'){
                system.tooltip( show );
            }else if(show === 'show'){

                // check if tooltip is currently visible
                var tooltipActive = (system.attr('aria-describedby') !== undefined ? true : false);

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
                        progress: function(){
                            map.revalidate( systemId );
                        },
                        complete: function(){
                            map.revalidate( systemId );
                        }
                    }
                );
            }
        }


        // set system name or alias
        var systemName = data.name;

        if(
            data.alias &&
            data.alias !== ''
        ){
            systemName = data.alias;
        }

        system.find('.' + config.systemHeadNameClass).attr('data-value', systemName);

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
        system.data('updated', parseInt(data.updated.updated));
        system.attr('data-mapid', parseInt(mapContainer.data('id')));

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
     * draw a new map or update an existing map with all its systems and connections
     * @param parentElement
     * @param mapConfig
     * @returns {*}
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

            mapWrapper.append(mapContainer);

            // append mapWrapper to parent element (at the top)
            $(parentElement).prepend(mapWrapper);

            // set main Container for current map -> the container exists now in DOM !! very important
            mapConfig.map.setContainer($('#' + config.mapIdPrefix + mapConfig.config.id));

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
            mapContainer.data('updated', mapConfig.config.updated);
        }


        // get map data
        var mapData = mapContainer.getMapDataFromClient();

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
                    removeSystem(mapConfig.map, deleteSystem);
                }
            }

            // update connections =========================================================

            // set up default connections
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
                            var tempConnection = ativeConnections[mapData.config.id][connectionData.id];
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

                if(
                    deleteThisConnection === true &&
                    ativeConnections[mapData.config.id][currentConnectionData[d].id] !== undefined
                ){
                    // connection not found -> delete connection
                    var deleteConnection = ativeConnections[mapData.config.id][currentConnectionData[d].id];

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

            // repaint all connections because of some strange visual bugs -_-
            mapConfig.map.repaintEverything();
        }


        return mapContainer;
    };

    /**
     * make all systems appear visual on the map with its connections
     * @param show
     * @param callback
     */
    $.fn.visualizeMap = function(show, callback){
        var mapElement = $(this);

        // start map update counter -> prevent map updates during animations
        mapElement.getMapOverlay().startMapUpdateCounter();

        var systemElements = mapElement.find('.' + config.systemClass);
        var endpointElements =  mapElement.find('._jsPlumb_endpoint');
        var connectorElements = mapElement.find('._jsPlumb_connector');
        var overlayElements = mapElement.find('._jsPlumb_overlay, .tooltip');

        // if map empty (no systems), execute callback and return
        // no visual effects in IGB (glitches)
        if(
            systemElements.length === 0 ||
            endpointElements.length === 0 ||
            CCP.isInGameBrowser() === true
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
                stagger: 50,
                drag: true,
                duration: 100,
                //display: 'auto',
                complete: function(){
                    // show connections
                    endpointElements.velocity('transition.fadeIn', {
                        stagger: 50,
                        duration: 50
                    });

                    connectorElements.velocity('transition.fadeIn', {
                        stagger: 50,
                        duration: 180
                    });

                    overlayElements.delay(500).velocity('transition.fadeIn', {
                        stagger: 50,
                        duration: 180,
                        display: 'auto',
                        complete: function(){
                            callback();
                        }
                    });

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
                stagger: 0,
                drag: true,
                duration: 50,
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
                        stagger: 50,
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

                var connectionData = {
                    source: $(connectedSystem).data('id'),
                    target: newSystem.data('id'),
                    type: ['wh']
                };
                var connection = drawConnection(map, connectionData);

                // store connection
                saveConnection(connection);
            }
        }
    };

    /**
     * delete a system with all its connections
     * (ajax call) remove system from DB
     * @param map
     * @param systems
     * @param callback function
     */
    var deleteSystems = function(map, systems, callback){

        var mapContainer = $( map.getContainer() );

        mapContainer.getMapOverlay().startMapUpdateCounter();

        var systemIds = [];
        // systemIds for delete request
        for(var i = 0; i < systems.length; i++){
            systemIds.push( $(systems[i]).data('id') );
        }

        var requestData = {
            systemIds: systemIds
        };

        $.ajax({
            type: 'POST',
            url: Init.path.deleteSystem,
            data: requestData,
            dataType: 'json'
        }).done(function(data){
            // deleted SystemIds
            var triggerData = {
                systemIds: []
            };

            // remove systems from map
            for(var i = 0; i < systems.length; i++){
                var system = $(systems[i]);
                triggerData.systemIds.push( system.data('id') );
                removeSystem(map, system );
            }

            // trigger "system deleted" on Tab Content Element
            var tabContentElement = getTabContentElementByMapElement( mapContainer );

            $(tabContentElement).trigger('pf:deleteSystemData', [triggerData]);

            callback();
        }).fail(function( jqXHR, status, error) {
            var reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': deleteSystem', text: reason, type: 'warning'});
            $(document).setProgramStatus('problem');
        });
    };

    /**
     * remove a system from map (no backend requests)
     * @param map
     * @param system
     */
    var removeSystem = function(map, system){
        system = $(system);

        // remove endpoints and their connections
        map.removeAllEndpoints (system);

        // hide tooltip
        system.toggleSystemTooltip('hide', {});

        // remove system
        system.velocity('transition.whirlOut', {
            duration: Init.animationSpeed.mapDeleteSystem,
            complete: function(){
                map.remove(this);
            }
        });

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
            title: 'System alias',
            placement: 'top',
            onblur: 'submit',
            toggle: 'manual',       // is triggered manually on dblclick
            showbuttons: false
        });

        headElement.on('save', function(e, params) {
            // system alias changed -> mark system as updated
            system.markAsChanged();
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

        var seconds = config.logTimerCount;
        var fadeEffectDuration = 200;

        var counterChartLabel = counterChart.find('span');

        var percentPerCount = 100 / seconds;

        // update counter
        var updateChart = function(tempSeconds){
            var pieChart = counterChart.data('easyPieChart');

            if(pieChart !== undefined){
                counterChart.data('easyPieChart').update( percentPerCount * tempSeconds);
            }
            counterChartLabel.text(tempSeconds);
        };

        // main timer function is called on any counter update
        var timer = function(){
            seconds--;

            if(seconds >= 0){
                // update counter
                updateChart(seconds);
            }else{
                // hide counter and reset
                clearInterval(mapUpdateCounter);

                mapOverlay.velocity('transition.whirlOut', {
                    duration: fadeEffectDuration,
                    complete: function(){
                        counterChart.data('interval', false);
                    }
                });
            }
        };

        // get counter interval (in case there is an active one) ---------------------------
        var interval = counterChart.data('interval');

        if(interval){
            clearInterval(interval);
        }

        // start timer ---------------------------------------------------------------------
        var mapUpdateCounter = setInterval(timer, 1000);
        updateChart(seconds);

        // store counter -------------------------------------------------------------------
        counterChart.data('interval', mapUpdateCounter);

         // show overlay -------------------------------------------------------------------
        if(mapOverlay.is(':hidden')){
            mapOverlay.velocity('stop').velocity('transition.whirlIn', { duration: fadeEffectDuration });

        }

    };

    /**
     * update z-index for a system (dragged systems should be always on top)
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
                connectionId: connectionId,
                updated: connectionData.updated
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
     * stores a connection in database
     * @param connection
     */
    var saveConnection = function(connection){

        var map = connection._jsPlumb.instance;
        var mapContainer = $( map.getContainer() );
        mapContainer.getMapOverlay().startMapUpdateCounter();

        var connectionData = getDataByConnection(connection);

        var requestData = {
            connectionData: connectionData
        };

        $.ajax({
            type: 'POST',
            url: Init.path.saveConnection,
            data: requestData,
            dataType: 'json'
        }).done(function(newConnectionData){

            // update connection data
            connection.setParameter('connectionId', newConnectionData.id);
            connection.setParameter('updated', newConnectionData.updated);

            var text = 'New connection established';
            if(connectionData.id > 0){
                text = 'Connection switched';
            }

            Util.showNotify({title: text, type: 'success'});
        }).fail(function( jqXHR, status, error) {

            // remove this connection from map
            connection._jsPlumb.instance.detach(connection);

            var reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': saveConnection', text: reason, type: 'warning'});
            $(document).setProgramStatus('problem');
        });
    };

    /**
     * Programmatically delete a connection and all related data
     * @param connections
     * @param deleteOnServer
     */
    var deleteConnections = function(connections, deleteOnServer){

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

            if(deleteOnServer === true){
                // prepare delete request

                var map = connections[0]._jsPlumb.instance;
                var mapContainer = $( map.getContainer() );
                mapContainer.getMapOverlay().startMapUpdateCounter();


                var connectionIds = [];
                // systemIds for delete request
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
                        dataType: 'json'
                    }).done(function(data){

                        // remove connections from map
                        removeConnections(connections);

                    }).fail(function( jqXHR, status, error) {
                        var reason = status + ' ' + error;
                        Util.showNotify({title: jqXHR.status + ': deleteSystem', text: reason, type: 'warning'});
                        $(document).setProgramStatus('problem');
                    });
                }
            }else{
                // remove connections from map (no request)
                removeConnections(connections);
            }
        }


    };

    /**
     * compares the current data and new data of a connection and updates status
     * @param connection
     * @param connectionData
     * @param newConnectionData
     */
    var updateConnection = function(connection, connectionData, newConnectionData){

        var map = connection._jsPlumb.instance;
        var mapContainer = $( map.getContainer() );
        var mapId = mapContainer.data('id');

        // check scope
        if(connectionData.scope !== newConnectionData.scope){
            setConnectionScope(connection, newConnectionData.scope);
        }

        var addType = $(newConnectionData.type).not(connectionData.type).get();
        var removeType = $(connectionData.type).not(newConnectionData.type).get();

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

        // set update date
        connection.setParameter('updated', newConnectionData.updated);


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
        $.each(Init.systemStatus, function(status, statusData){
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
                {divider: true, action: 'ingame'},
                {icon: 'fa-reply fa-rotate-180', action: 'ingame', text: 'ingame actions', subitems: [
                    {subIcon: 'fa-info', subAction: 'ingame_show_info', subText: 'show info'},
                    {subDivider: true, action: 'ingame'},
                    {subIcon: 'fa-flag', subAction: 'ingame_add_waypoint', subText: 'add waypoint'},
                    {subIcon: 'fa-flag-checkered', subAction: 'ingame_set_destination', subText: 'set destination'},
                ]},
                {divider: true, action: 'delete_system'},
                {icon: 'fa-eraser', action: 'delete_system', text: 'delete system'}
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
        var mapOverlay = null;


        // make system draggable
        map.draggable(system, {
            containment: 'parent',
            constrain: true,
            filter: '.' + config.systemHeadNameClass,               // disable drag on "system name"
            scope: 'wh',
            start: function(params){
                var dragSystem = $(params.el);

                mapOverlay = dragSystem.getMapOverlay();

                // start map update timer
                mapOverlay.startMapUpdateCounter();

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
                $(selectedSystems).toggleSystemTooltip('hide', {});
            },
            drag: function(){
                // start map update timer
                mapOverlay.startMapUpdateCounter();
            },
            stop: function(params){
                var dragSystem = $(params.el);

                // start map update timer
                mapOverlay.startMapUpdateCounter();

                setTimeout(function(){
                    dragSystem.removeClass('no-click');
                }, Init.timer.dblClickTimer + 50);

                // render tooltip
                dragSystem.toggleSystemTooltip('show', {show: true});

                // drag system is not always selected
                var selectedSystems = mapContainer.getSelectedSystems().get();
                selectedSystems = selectedSystems.concat( dragSystem.get() );
                selectedSystems = $.unique( selectedSystems );


                for(var i = 0; i < selectedSystems.length; i++){
                    var tempSystem = $(selectedSystems[i]);

                    // set all selected systems as "changes" for update
                    tempSystem.markAsChanged();


                    // set new position for popover edit field (system name)
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

        // init system tooltips =============================================================================
        var systemTooltipOptions = {
            toggle: 'tooltip',
            placement: 'right',
            viewport: system.id
        };

        system.find('.fa').tooltip(systemTooltipOptions);

        // init system body expand ==========================================================================
        systemHeadExpand.hoverIntent(function(e){
            // hover in
            var hoverSystem = $(this).parents('.' + config.systemClass);
            var hoverSystemId = hoverSystem.attr('id');

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

                        currentSystem.markAsChanged();
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
                                            currentSystem.markAsChanged();
                                        }
                                    },
                                    setRallay: {
                                        label: '<i class="fa fa-fw fa-users"></i> Set rally',
                                        className: 'btn-primary',
                                        callback: function() {
                                            currentSystem.toggleRallyPoint(false, {});
                                            currentSystem.markAsChanged();
                                        }
                                    }
                                }
                            });
                        }else{
                            // remove rally point
                            currentSystem.toggleRallyPoint(false, {});
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
                        currentSystem.getMapOverlay().startMapUpdateCounter();

                        var statusString = action.split('_');

                        currentSystem.setSystemStatus(statusString[2]);

                        currentSystem.markAsChanged();
                        break;
                    case 'delete_system':
                        // confirm dialog
                        var systemDeleteDialog = bootbox.confirm('Delete system and all its connections?', function(result) {
                            if(result){
                                var systemName = currentSystem.getSystemInfo(['alias']);
                                deleteSystems(map, [currentSystem], function(){
                                    // callback function after delete -> close dialog

                                    $(systemDeleteDialog).modal('hide');
                                    Util.showNotify({title: 'System deleted', text: systemName, type: 'success'});
                                });

                                return false;
                            }
                        });
                        break;
                    case 'ingame_show_info':
                        var systemData = system.getSystemData();

                        CCPEVE.showInfo(5, systemData.systemId );
                        break;
                    case 'ingame_set_destination':
                        var systemData = system.getSystemData();

                        CCPEVE.setDestination( systemData.systemId );
                        break;
                    case 'ingame_add_waypoint':
                        var systemData = system.getSystemData();

                        CCPEVE.addWaypoint( systemData.systemId );
                        break;
                }
            }
        });

        // system click events ==============================================================================
        var double = function(e){
            var system = $(this);
            var headElement = $(system).find('.' + config.systemHeadNameClass);

            // update z-index for system, editable field should be on top
            updateZIndex(system);

            // show "set alias" input (x-editable)
            headElement.editable('show');
        };

        var single = function(e){

            // check if click was performed on "popover" (x-editable
            var popoverClick = false;
            if( $(e.target).parents('.popover').length ){
                popoverClick = true;
            }

            // continue if click was *not* on a popover dialog of a system
            if( !popoverClick ){
                var system = $(this);

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

        };

        system.singleDoubleClick(single, double);

    };

    /**
     * mark a dom element (map, system, connection) as changed
     * DB will update this element on next update trigger
     */
    $.fn.markAsChanged = function(){
        return this.each(function(){
            var element = $(this);

            if(element.hasClass(config.systemClass)){
                // system element
                element.data('updated', 0);
            }else{
                // connection element
                this.setParameter('updated', 0);
            }

        });
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
        var tabContentElement = getTabContentElementByMapElement( system );

        var data = {
            system: system
        };

        $(tabContentElement).trigger('pf:drawSystemModules', [data]);
    };

    /**
     * toggle selectable status of a system
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
                            var systemDeleteDialog = bootbox.confirm('Delete ' + selectedSystems.length + ' selected systems and its connections?', function(result) {
                                if(result){
                                    currentMapElement.getMapOverlay().startMapUpdateCounter();

                                    deleteSystems(currentMap, selectedSystems, function(){
                                        // callback function after delete -> close dialog

                                        $(systemDeleteDialog).modal('hide');
                                        Util.showNotify({title: selectedSystems.length + ' systems deleted', type: 'success'});
                                    });
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

        $(mapContainer).on('pf:menuSelectSystem', function(e, data){
            var tempMapContainer = $(this);
            var systemId = config.systemIdPrefix + tempMapContainer.data('id') + '-' + data.systemId;
            var system = $(this).find('#' + systemId);

            if(system.length === 1){
                // scroll to system
                var tempMapWrapper = tempMapContainer.parents('.' + config.mapWrapperClass);
                tempMapWrapper.scrollTo(system);

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

            // disable ingame options if not IGB browser
            if(! CCP.isInGameBrowser() ){
                hiddenOptions.push('ingame');
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
                                deleteConnections([params.component], true);
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
                        $(activeConnection).markAsChanged();
                        break;
                    case 'status_fresh':
                    case 'status_reduced':
                    case 'status_critical':
                        var newStatus = action.split('_')[1];
                        mapElement.getMapOverlay().startMapUpdateCounter();

                        setConnectionWHStatus(activeConnection, 'wh_' + newStatus);
                        $(activeConnection).markAsChanged();
                        break;
                    case 'scope_wh':
                    case 'scope_stargate':
                    case 'scope_jumpbridge':

                        var newScope = action.split('_')[1];
                        var newScopeName =  Util.getScopeInfoForConnection( newScope, 'label');

                        bootbox.confirm('Change scope from ' + activeScopeName + ' to ' + newScopeName + '?', function(result) {
                            if(result){

                                mapElement.getMapOverlay().startMapUpdateCounter();

                                setConnectionScope(activeConnection, newScope);

                                var scopeLabel = Util.getScopeInfoForMap(newScope, 'label');

                                Util.showNotify({title: 'Connection scope changed', text: 'New scope: ' + scopeLabel, type: 'success'});

                                $(activeConnection).markAsChanged();
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
        $.each(Init.systemStatus, function(status, statusData){
            systemStatus[statusData.id] = statusData.label;
        });

        // default system status -> first status entry
        var defaultSystemStatus = Init.systemStatus[Object.keys(Init.systemStatus)[0]].id;


        var data = {
            id: config.systemDialogId,
            selectClass: config.systemDialogSelectClass
        };

        requirejs(['text!templates/dialog/system.html', 'mustache'], function(template, Mustache) {

            var content = Mustache.render(template, data);

            // disable modal focus event -> otherwise select2 is not working! -> quick fix
            $.fn.modal.Constructor.prototype.enforceFocus = function() {};

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
                        label: '<i class="fa fa-fw fa-sun-o"></i> add system',
                        className: 'btn-primary',
                        callback: function (e) {
                            // get form Values
                            var form = $('#' + config.systemDialogId).find('form');

                            var systemDialogData = $(form).getFormValues();

                            // validate form
                            form.validator('validate');

                            // check weather the form is valid
                            var formValid = form.isValidForm();

                            if(formValid === false){
                                // don't close dialog
                                return false;
                            }

                            mapContainer.getMapOverlay().startMapUpdateCounter();

                            // calculate new system position -----------------------------------------------
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

                            systemDialogData.position = newPositon;

                            // -----------------------------------------------------------------------------

                            var requestData = {
                                systemData: systemDialogData,
                                mapData: {
                                    id: mapContainer.data('id')
                                }
                            };

                            $.ajax({
                                type: 'POST',
                                url: Init.path.saveSystem,
                                data: requestData,
                                dataType: 'json'
                            }).done(function(newSystemData){

                                // draw new system to map
                                drawSystem(map, newSystemData, sourceSystem);

                                Util.showNotify({title: 'New system', text: newSystemData.name, type: 'success'});

                                $(systemDialog).modal('hide');
                            }).fail(function( jqXHR, status, error) {
                                var reason = status + ' ' + error;
                                Util.showNotify({title: jqXHR.status + ': saveSystem', text: reason, type: 'warning'});
                                $(document).setProgramStatus('problem');
                            });

                            return false;
                        }
                    }
                }
            });

            // init dialog
            systemDialog.on('shown.bs.modal', function(e) {

                var modalContent = $('#' + config.systemDialogId);

                // init system select live search
                var selectElement = modalContent.find('.' + config.systemDialogSelectClass);
                selectElement.initSystemSelect({key: 'systemId'});
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
     * updates all systems on map with current user Data (all users on this map)
     * update the Data of the user that is currently viewing the map (if available)
     * @param userData
     * @returns {boolean}
     */
    $.fn.updateUserData = function(userData){

        var returnStatus = true;

        // get all systems
        var systems = $(this).find('.' + config.systemClass);

        // get new map instance or load existing
        var map = getMapInstance(userData.config.id);

        var mapElement = map.getContainer();

        // get global user data
        var currentUserData = Init.currentUserData;

        var currentCharacterData = null;
        if(currentUserData.character){
            currentCharacterData = currentUserData.character;
        }

        // container must exist! otherwise systems cant be updated
        if(mapElement !== undefined){

            mapElement = $(mapElement);

            // check if map is frozen
            if(mapElement.data('frozen') === true){
                return returnStatus;
            }

            // data for header update
            var headerUpdateData = {
                mapId: userData.config.id,
                userCount: 0                        // active user in a map
            };

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
                    currentCharacterData &&
                    currentCharacterData.log &&
                    currentCharacterData.log.system &&
                    currentCharacterData.log.system.id === systemId
                ){
                    tempCurrentUserData = currentUserData;

                    // set current location data for header update
                    headerUpdateData.currentSystemId =  currentCharacterData.log.system.id;
                    headerUpdateData.currentSystemName = tempCurrentUserData.system.name;
                }

                if(tempUserData){
                    headerUpdateData.userCount += tempUserData.user.length;
                }

                system.updateSystemUserData(map, tempUserData, tempCurrentUserData);
            }

            // trigger document event -> update header
            $(document).trigger('pf:updateHeaderMapData', headerUpdateData);
        }

        return returnStatus;
    };

    /**
     * collect all map data for export/save for a map
     * this function returns the "client" data NOT the "server" data for a map
     * @returns {*}
     */
    $.fn.getMapDataFromClient = function(forceData){

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
            mapConfig.id = parseInt( mapElement.data('id') );
            mapConfig.name = mapElement.data('name');
            mapConfig.scope = {
                id: parseInt( mapElement.data('scopeId') )
            };
            mapConfig.icon = mapElement.data('icon');
            mapConfig.type = {
                id: parseInt( mapElement.data('typeId') )
            };
            mapConfig.updated = parseInt( mapElement.data('updated') );
            mapData.config = mapConfig;

            // map data -----------------------------------
            var data = {};

            // systems data ------------------------------------
            var systemsData = [];
            var systems = mapElement.find('.' + config.systemClass);

            for(var i = 0; i < systems.length; i++){
                var tempSystem = $(systems[i]);
                systemsData.push( tempSystem.getSystemData() );
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

                var connectionData = getDataByConnection(tempConnection);

                // add to cache
                ativeConnections[mapConfig.id][connectionData.id] = tempConnection;

                connectionsFormatted.push( connectionData );
            }

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
        systemData.rally = system.data('rally') ? 1 : 0;
        systemData.currentUser = system.data('currentUser'); // if user is currently in this system
        systemData.updated = {
            updated: parseInt( system.data('updated') )
        };
        systemData.userCount = (system.data('userCount') ? parseInt( system.data('userCount') ) : 0);

        // position -------------------------------
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

        var data = {
            id: id ? id : 0,
            source: parseInt( source.data('id') ),
            sourceName: source.data('name'),
            target: parseInt( target.data('id') ),
            targetName: target.data('name'),
            scope: connection.scope,
            type: connection.getType(),
            updated: updated ? updated : 0
        };

        return data;
    };


    var getMapInstance = function(mapId){

        if(typeof activeInstances[mapId] !== 'object'){
            // create new instance
            jsPlumb.Defaults.LogEnabled = true;

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
                Scope: Init.defaultMapScope,                                                     // default map scope for connections
                LogEnabled: true
            });

            // register all available connection types
            newJsPlumbInstance.registerConnectionTypes(globalMapConfig.connectionTypes);

            // global  map observer for manual connections (drag & drop)
            newJsPlumbInstance.bind('connection', function(info, e) {
                setConnectionObserver(newJsPlumbInstance, info.connection);
            });

            // event after connection moved
            newJsPlumbInstance.bind('connectionMoved', function(info, e) {

            });

            // event after DragStop a connection or new connection
            newJsPlumbInstance.bind('beforeDrop', function(info) {
                var connection = info.connection;

                // set "default" connection status only for NEW connections
                if(!connection.suspendedElement){
                    setConnectionWHStatus(connection, 'wh_fresh');
                }

                // prevent multiple connections between same systems ----------------------------
                var connections = checkForConnection(newJsPlumbInstance, info.sourceId, info.targetId );

                if(connections.length > 1){
                    bootbox.confirm('Connection already exists. Do you really want to add an additional one?', function(result) {
                        if(!result){
                            connection._jsPlumb.instance.detach(connection);
                        }
                    });
                }else{
                    // save new connection
                    saveConnection(connection);
                }
                // -----------------------------------------------------------------------------

                return true;
            });

            // event before Detach connection
            newJsPlumbInstance.bind('beforeDetach', function(info) {

                return true;
            });

            newJsPlumbInstance.bind('connectionDetached', function(info, e){
                // a connection is manually (drag&drop) detached! otherwise this event should not be send!
                var connection = info.connection;
                deleteConnections([connection], true);
            });

            activeInstances[mapId] = newJsPlumbInstance;

            //console.log('new jsPlumbInstance: ' + mapId);
        }

        return activeInstances[mapId];
    };

    /**
     * load OR updates system map
     * @param mapConfig
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
            }

            // callback function after tab switch
            function switchTabCallback( mapName ){
                Util.showNotify({title: 'Map initialized', text: mapName  + ' - loaded', type: 'success'});

                return false;
            }

            if(options.showAnimation){
                // show nice visualization effect
                mapContainer.visualizeMap('show', function(){
                    switchTabCallback( mapConfig.config.name );
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
        initCutomScrollbar( scrollableElement );

        // add map overlay container after scrollbar is initiated
        // because of its absolute positon
        var mapOverlay = $('<div>', {
            class: config.mapOverlayClass
        });
        scrollableElement.append(mapOverlay);


        // reset map update timer
        mapOverlay.setMapUpdateCounter(100, config.logTimerCount);
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
            $(this).mCustomScrollbar('scrollTo', position);
        });
    };

});