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
    'app/map/layout',
    'app/map/magnetizing',
    'app/map/scrollbar',
    'dragToSelect',
    'app/map/contextmenu',
    'app/map/overlay',
    'app/map/local'
], ($, Init, Util, Render, bootbox, MapUtil, System, Layout, MagnetizerWrapper) => {

    'use strict';

    let config = {
        zIndexCounter: 110,
        maxActiveConnections: 8,

        mapWrapperClass: 'pf-map-wrapper',                              // wrapper div (scrollable)

        mapClass: 'pf-map',                                             // class for all maps
        mapIdPrefix: 'pf-map-',                                         // id prefix for all maps
        systemClass: 'pf-system',                                       // class for all systems
        systemActiveClass: 'pf-system-active',                          // class for an active system on a map
        systemSelectedClass: 'pf-system-selected',                      // class for selected systems on a map
        systemLockedClass: 'pf-system-locked',                          // class for locked systems on a map
        systemHeadClass: 'pf-system-head',                              // class for system head
        systemHeadNameClass: 'pf-system-head-name',                     // class for system name
        systemHeadExpandClass: 'pf-system-head-expand',                 // class for system head expand arrow
        systemHeadInfoClass: 'pf-system-head-info',                     // class for system info
        systemBodyClass: 'pf-system-body',                              // class for system body
        systemBodyItemHeight: 16,                                       // px of a system body entry
        systemBodyItemClass: 'pf-system-body-item',                     // class for a system body entry
        systemBodyItemStatusClass: 'pf-user-status',                    // class for player status in system body
        systemBodyItemNameClass: 'pf-system-body-item-name',            // class for player name in system body
        systemBodyRightClass: 'pf-system-body-right',                   // class for player ship name in system body
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

        popoverTriggerClass: 'pf-popover-trigger',                      // class for "popover" trigger elements

        // system security classes
        systemSec: 'pf-system-sec'
    };

    // active connections per map (cache object)
    let connectionCache = {};

    // mapIds that receive updates while they are "locked" (active timer)
    // -> those maps queue their updates until "pf:unlocked" event
    let mapUpdateQueue = [];

    /**
     * checks mouse events on system head elements
     * -> prevents drag/drop system AND drag/drop connections on some child elements
     * @param e
     * @param system
     * @returns {boolean | *}
     */
    let filterSystemHeadEvent = (e, system) => {
        let target = $(e.target);
        let effectClass = MapUtil.getEffectInfoForSystem('effect', 'class');
        return (
            target.hasClass(config.systemHeadNameClass) ||
            target.hasClass(effectClass) ||
            target.hasClass(config.systemHeadExpandClass) ||
            target.hasClass(config.systemHeadInfoClass)
        );
    };

    // jsPlumb config
    let globalMapConfig =  {
        source: {
            filter:  filterSystemHeadEvent,
            //isSource:true,
            isTarget:true,                          // add target Endpoint to each system (e.g. for drag&drop)
            allowLoopback: false,                   // loopBack connections are not allowed
            cssClass: config.endpointSourceClass,
            uniqueEndpoint: false,                  // each connection has its own endpoint visible
            dragOptions:{
            },
            connectionsDetachable: true,            // dragOptions are set -> allow detaching them
            maxConnections: 10,                     // due to isTarget is true, this is the max count of !out!-going connections
            // isSource:true,
            anchor: 'Continuous'
        },
        target: {
            filter:  filterSystemHeadEvent,
            isSource:true,
            //isTarget:true,
            //allowLoopBack: false,                 // loopBack connections are not allowed
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
        let system = $(this);
        let systemId = system.attr('id');

        // find system body
        let systemBody = $( system.find('.' + config.systemBodyClass) );

        // find expand arrow
        let systemHeadExpand = $( system.find('.' + config.systemHeadExpandClass) );

        let oldCacheKey = system.data('userCache');
        let oldUserCount = system.data('userCount');
        oldUserCount = (oldUserCount !== undefined ? oldUserCount : 0);
        let userCounter = 0;

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
            let cacheArray = [];
            // loop all active pilots and build cache-key
            for(let i = 0; i < data.user.length; i++){
                userCounter++;
                let tempUserData = data.user[i];
                cacheArray.push(tempUserData.id + '_' + tempUserData.log.ship.id);
            }
            let cacheKey = cacheArray.join('_');

            // check for if cacheKey has changed
            if(cacheKey !== oldCacheKey){
                // set new CacheKey
                system.data('userCache', cacheKey);
                system.data('userCount', userCounter);

                // remove all content
                systemBody.empty();

                // loop "again" and build DOM object with user information
                for(let j = 0; j < data.user.length; j++){
                    let userData = data.user[j];

                    let statusClass = Util.getStatusInfoForCharacter(userData, 'class');
                    let userName = userData.name;

                    let item = $('<div>', {
                        class: config.systemBodyItemClass
                    }).append(
                        $('<span>', {
                            text: userData.log.ship.typeName,
                            class: config.systemBodyRightClass
                        })
                    ).append(
                        $('<i>', {
                            class: ['fas', 'fa-circle', config.systemBodyItemStatusClass, statusClass].join(' ')
                        })
                    ).append(
                        $('<span>', {
                            class: config.systemBodyItemNameClass,
                            text: userName
                        })
                    );

                    systemBody.append(item);
                }


                // ====================================================================================================

                // user count changed -> change tooltip content

                // set tooltip color
                let highlight = '';
                if(userCounter > oldUserCount){
                    highlight = 'good';
                }else if(userCounter < oldUserCount){
                    highlight = 'bad';
                }

                let tooltipOptions = {
                    systemId: systemId,
                    highlight: highlight,
                    userCount: userCounter
                };

                // show system head
                systemHeadExpand.velocity('stop', true).velocity({
                    width: '10px'
                },{
                    duration: 50,
                    display: 'inline-block',
                    progress: function(){
                        //re-validate element size and repaint
                        map.revalidate( systemId );
                    },
                    complete: function(){
                        // show system body
                        system.toggleBody(true, map, {complete: function(system){
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
        let system = $(this);
        let systemBody = system.find('.' + config.systemBodyClass);

        let systemDomId = system.attr('id');

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
     * set or change the status of a system
     * @param status
     */
    $.fn.setSystemStatus = function(status){
        let system = $(this);

        let statusId = Util.getStatusInfoForSystem(status, 'id');
        let statusClass = Util.getStatusInfoForSystem(status, 'class');

        for(let property in Init.systemStatus) {
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
        let mapContainer = $(this);
        let systemId = MapUtil.getSystemId(mapContainer.data('id'), data.id);

        // check if system already exists
        let system = document.getElementById( systemId );
        let newPosX =  data.position.x + 'px';
        let newPosY = data.position.y + 'px';

        if(!system){
            // set system name or alias
            let systemName = data.name;
            if(
                data.alias &&
                data.alias !== ''
            ){
                systemName = data.alias;
            }

            let systemHeadClasses = [config.systemHeadNameClass];
            // Abyssal system
            if(data.type.id === 3){
                systemHeadClasses.push(Util.config.fontTriglivianClass);
            }

            // get system info classes
            let effectBasicClass = MapUtil.getEffectInfoForSystem('effect', 'class');
            let effectName = MapUtil.getEffectInfoForSystem(data.effect, 'name');
            let effectClass = MapUtil.getEffectInfoForSystem(data.effect, 'class');
            let secClass = Util.getSecurityClassForSystem(data.security);

            system = $('<div>', {
                id: systemId,
                class: config.systemClass
            }).append(
                $('<div>', {
                    class: config.systemHeadClass
                }).append(
                    $('<span>', {
                        class: [config.systemSec, secClass].join(' '),
                        text: data.security
                    }),
                    // System name is editable
                    $('<span>', {
                        class: systemHeadClasses.join(' '),
                    }).attr('data-value', systemName),
                    // System locked status
                    $('<i>', {
                        class: ['fas', 'fa-lock', 'fa-fw'].join(' ')
                    }).attr('title', 'locked'),
                    // System effect color
                    $('<i>', {
                        class: ['fas', 'fa-square', 'fa-fw', effectBasicClass, effectClass, config.popoverTriggerClass].join(' ')
                    }),
                    // expand option
                    $('<i>', {
                        class: ['fas', 'fa-angle-down', config.systemHeadExpandClass].join(' ')
                    }),
                    // info element (new line) (optional)
                    System.getHeadInfoElement(data)
                ),
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
            let currentPosX = system.css('left');
            let currentPosY = system.css('top');

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

                            // destroy popovers
                            $(system).destroyPopover(true);

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
            let alias = system.getSystemInfo(['alias']);

            if(alias !== data.alias){
                // alias changed
                alias = data.alias ? data.alias : data.name;
                system.find('.' + config.systemHeadNameClass).editable('setValue', alias);
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
        system.data('changed', false);
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
     * set observer for a given connection
     * @param map
     * @param connection
     */
    let setConnectionObserver = function(map, connection){

        // get map container
        let mapElement = $( map.getContainer() );
        let connectionCanvas = $(connection.canvas);

        // if the connection already exists -> do not set it twice
        connection.unbind('contextmenu').bind('contextmenu', function(component, e) {
            e.preventDefault();
            e.stopPropagation();

            // trigger menu "open

            // get invisible menu entries
            let hideOptions = getHiddenContextMenuOptions(component);
            let activeOptions = getActiveContextMenuOptions(component);
            $(e.target).trigger('pf:openContextMenu', [e, component, hideOptions, activeOptions]);

            return false;
        });

        /**
         *  init context menu for all connections
         *  must be triggered manually on demand
         */
        connectionCanvas.contextMenu({
            menuSelector: '#' + config.connectionContextMenuId,
            menuSelected: function (params){

                let action = params.selectedMenu.attr('data-action');
                let activeConnection = params.component;
                let activeScope = activeConnection.scope;
                let activeScopeName = MapUtil.getScopeInfoForConnection( activeScope, 'label');

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
                        let newStatus = action.split('_')[1];
                        mapElement.getMapOverlay('timer').startMapUpdateCounter();

                        MapUtil.setConnectionWHStatus(activeConnection, 'wh_' + newStatus);
                        $(activeConnection).markAsChanged();
                        break;
                    case 'scope_wh':
                    case 'scope_stargate':
                    case 'scope_jumpbridge':
                        let newScope = action.split('_')[1];
                        let newScopeName =  MapUtil.getScopeInfoForConnection( newScope, 'label');

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

        // connection click events ====================================================================================

        let single = function(e){
            let connection = this;
            // left mouse button
            if(e.which === 1){
                if(e.ctrlKey === true){
                    // an "active" connection is required before adding more "selected" connections
                    let activeConnections = MapUtil.getConnectionsByType(map, 'active');
                    if(activeConnections.length >= config.maxActiveConnections && !connection.hasType('active')){
                        Util.showNotify({title: 'Connection select limit', text: 'You can´t select more connections', type: 'warning'});
                    }else {
                        if(activeConnections.length > 0) {
                            MapUtil.toggleConnectionActive(map, [connection]);
                        }else{
                            MapUtil.showConnectionInfo(map, [connection]);
                        }
                    }
                }else{
                    MapUtil.showConnectionInfo(map, [connection]);
                }
            }
        }.bind(connection);

        Util.singleDoubleClick(connectionCanvas, single, () => {});
    };

    /**
     * set/change connection scope
     * @param connection
     * @param scope
     */
    let setConnectionScope = function(connection, scope){
        let map = connection._jsPlumb.instance;
        let currentConnector = connection.getConnector();
        let newConnector = MapUtil.getScopeInfoForConnection(scope, 'connectorDefinition');

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
     * connect two systems
     * @param map
     * @param connectionData
     * @returns new connection
     */
    let drawConnection = function(map, connectionData){
        let mapContainer = $( map.getContainer() );
        let mapId = mapContainer.data('id');
        let connectionId = connectionData.id || 0;
        let connection;
        let sourceSystem = $('#' + MapUtil.getSystemId(mapId, connectionData.source) );
        let targetSystem = $('#' + MapUtil.getSystemId(mapId, connectionData.target) );

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
                    created: connectionData.created,
                    eolUpdated: connectionData.eolUpdated
                });

                // add connection types -------------------------------------------------------------------------------
                if(connectionData.type){
                    for(let i = 0; i < connectionData.type.length; i++){
                        connection.addType(connectionData.type[i]);
                    }
                }

                // add connection scope -------------------------------------------------------------------------------
                // connection have the default map Scope scope
                let scope = map.Defaults.Scope;
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
     * compares the current data and new data of a connection and updates status
     * @param connection
     * @param connectionData
     * @param newConnectionData
     * @returns {*}
     */
    let updateConnection = function(connection, connectionData, newConnectionData){

        let map = connection._jsPlumb.instance;
        let mapContainer = $( map.getContainer() );
        let mapId = mapContainer.data('id');

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

        let addType = newConnectionData.type.diff( connectionData.type );
        let removeType = connectionData.type.diff( newConnectionData.type );

        // check if source or target has changed
        if(connectionData.source !== newConnectionData.source ){
            map.setSource(connection, MapUtil.getSystemId(mapId, newConnectionData.source) );
        }
        if(connectionData.target !== newConnectionData.target ){
            map.setTarget(connection, MapUtil.getSystemId(mapId, newConnectionData.target) );
        }

        // connection.targetId
        // add types
        for(let i = 0; i < addType.length; i++){
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
        for(let j = 0; j < removeType.length; j++){
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
        connection.setParameter('created', newConnectionData.created);
        connection.setParameter('updated', newConnectionData.updated);
        connection.setParameter('eolUpdated', newConnectionData.eolUpdated);
        connection.setParameter('changed', false);

        return connection;
    };

    /**
     * set map wrapper observer
     * @param mapWrapper
     * @param mapConfig
     */
    let setMapWrapperObserver = (mapWrapper, mapConfig) => {

        /**
         * save current map dimension to local storage
         * @param entry
         */
        let saveMapSize = (entry) => {
            let width = '';
            let height = '';
            if(entry.constructor.name === 'HTMLDivElement'){
                width = entry.style.width;
                height = entry.style.height;
            }else if (entry.constructor.name === 'ResizeObserverEntry'){
                width = entry.target.style.width;
                height = entry.target.style.height;
            }

            width = parseInt(width.substring(0, width.length - 2)) || 0;
            height = parseInt(height.substring(0, height.length - 2)) || 0;

            let promiseStore = MapUtil.getLocaleData('map', mapConfig.config.id );
            promiseStore.then((data) => {
                let storeData = true;

                if (
                    data && data.style &&
                    data.style.width === width &&
                    data.style.height === height
                ) {
                    // no style changes
                    storeData = false;
                }

                if (storeData) {
                    MapUtil.storeLocalData('map', mapConfig.config.id, 'style', {
                        width: width,
                        height: height
                    });
                }
            });
        };

        // map resize observer ----------------------------------------------------------------------------------------
        if(window.ResizeObserver) {
            // ResizeObserver() supported
            let resizeTimer;
            let wrapperResize = new ResizeObserver(entries => { // jshint ignore:line
                let checkMapSize = (entry) => {
                    return setTimeout(saveMapSize, 100, entry);
                };
                for (let entry of entries){
                    // use timeout to "throttle" save actions
                    clearTimeout(resizeTimer);
                    resizeTimer = checkMapSize(entry);
                }
            });

            wrapperResize.observe(mapWrapper[0]);
        }else if(requestAnimationFrame){
            // ResizeObserver() not supported
            let checkMapSize = (entry) => {
                saveMapSize(entry);
                return setTimeout(checkMapSize, 500, entry);
            };

            checkMapSize(mapWrapper[0]);
        }
    };

    /**
     * get a mapMapElement
     * @param parentElement
     * @param mapConfig
     * @returns {Promise<any>}
     */
    let newMapElement = (parentElement, mapConfig) => {

        /**
         * new map element promise
         * @param resolve
         * @param reject
         */
        let newMapElementExecutor = (resolve, reject) => {
            // get map dimension from local storage
            let promiseStore = MapUtil.getLocaleData('map', mapConfig.config.id );
            promiseStore.then((data) => {
                let height = 0;
                if(data && data.style){
                     height = data.style.height;
                }

                // create map wrapper
                let mapWrapper = $('<div>', {
                    class: config.mapWrapperClass,
                    height: height
                });

                setMapWrapperObserver(mapWrapper, mapConfig);

                let mapId = mapConfig.config.id;

                // create new map container
                let mapContainer = $('<div>', {
                    id: config.mapIdPrefix + mapId,
                    class: config.mapClass
                }).data('id', mapId);

                mapWrapper.append(mapContainer);

                // append mapWrapper to parent element (at the top)
                parentElement.prepend(mapWrapper);

                // set main Container for current map -> the container exists now in DOM !! very important
               // mapConfig.map.setContainer( config.mapIdPrefix + mapId );
                mapConfig.map.setContainer( mapContainer );

                // init custom scrollbars and add overlay
                parentElement.initMapScrollbar();

                // set map observer
                setMapObserver(mapConfig.map);

                // set shortcuts
                mapWrapper.setMapShortcuts();

                // show static overlay actions
                let mapOverlay = mapContainer.getMapOverlay('info');
                mapOverlay.updateOverlayIcon('systemRegion', 'show');
                mapOverlay.updateOverlayIcon('connection', 'show');
                mapOverlay.updateOverlayIcon('connectionEol', 'show');

                resolve({
                    action: 'newMapElement',
                    data: {
                        mapConfig: mapConfig
                    }
                });
            });
        };

        return new Promise(newMapElementExecutor);
    };

    /**
     * draw a new map or update an existing map with all its systems and connections
     * @param mapConfig
     * @returns {Promise<any>}
     */
    let updateMap = (mapConfig) => {

        /**
         * update map promise
         * @param resolve
         * @param reject
         */
        let updateMapExecutor = (resolve, reject) => {
            // jsPlumb needs to be initialized. This is not the case when switching between map tabs right after refresh
            let mapContainer = mapConfig.map ? $(mapConfig.map.getContainer()) : null;
            if(mapContainer){
                let mapId = mapConfig.config.id;
                let newSystems = 0;

                // add additional information for this map
                if(mapContainer.data('updated') !== mapConfig.config.updated.updated){
                    mapContainer.data('name', mapConfig.config.name);
                    mapContainer.data('scopeId', mapConfig.config.scope.id);
                    mapContainer.data('typeId', mapConfig.config.type.id);
                    mapContainer.data('typeName', mapConfig.config.type.name);
                    mapContainer.data('icon', mapConfig.config.icon);
                    mapContainer.data('created', mapConfig.config.created.created);
                    mapContainer.data('updated', mapConfig.config.updated.updated);
                }

                // get map data
                let mapData = mapContainer.getMapDataFromClient({forceData: false});

                if(mapData !== false){
                    // map data available -> map not locked by update counter :)
                    let currentSystemData = mapData.data.systems;
                    let currentConnectionData = mapData.data.connections;

                    // update systems =================================================================================
                    for(let i = 0; i < mapConfig.data.systems.length; i++){
                        let systemData = mapConfig.data.systems[i];

                        // add system
                        let addNewSystem = true;

                        for(let k = 0; k < currentSystemData.length; k++){
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
                    for(let a = 0; a < currentSystemData.length; a++){

                        let deleteThisSystem = true;

                        for(let b = 0; b < mapConfig.data.systems.length; b++){
                            let deleteSystemData = mapConfig.data.systems[b];

                            if(deleteSystemData.id === currentSystemData[a].id){
                                deleteThisSystem = false;
                                break;
                            }
                        }

                        if(deleteThisSystem === true){
                            let deleteSystem = $('#' + MapUtil.getSystemId(mapContainer.data('id'), currentSystemData[a].id) );

                            // system not found -> delete system
                            System.removeSystems(mapConfig.map, deleteSystem);
                        }
                    }

                    // update connections =============================================================================

                    // jsPlumb batch() is used, otherwise there are some "strange" visual bugs
                    // when switching maps (Endpoints are not displayed correctly)
                    mapConfig.map.batch(function() {

                        for(let j = 0; j < mapConfig.data.connections.length; j++){
                            let connectionData = mapConfig.data.connections[j];

                            // add connection
                            let addNewConnection= true;

                            for(let c = 0; c < currentConnectionData.length; c++){
                                if(
                                    currentConnectionData[c].id === connectionData.id
                                ){
                                    // connection already exists -> check for updates
                                    if(
                                        currentConnectionData[c].updated < connectionData.updated
                                    ){
                                        // connection changed -> update
                                        let tempConnection = $().getConnectionById(mapData.config.id, connectionData.id);
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
                        for(let d = 0; d < currentConnectionData.length; d++){

                            let deleteThisConnection = true;

                            for(let e = 0; e < mapConfig.data.connections.length;e++){
                                let deleteConnectionData = mapConfig.data.connections[e];

                                if(deleteConnectionData.id === currentConnectionData[d].id){
                                    deleteThisConnection = false;
                                    break;
                                }
                            }

                            if(deleteThisConnection === true){
                                // get connection from cache -> delete connection
                                let deleteConnection = $().getConnectionById(mapData.config.id, currentConnectionData[d].id);

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

                    // update local connection cache
                    updateConnectionsCache(mapConfig.map);

                    // update map "magnetization" when new systems where added
                    if(newSystems > 0){
                        MagnetizerWrapper.setElements(mapConfig.map);
                    }
                }else{
                    // map is currently logged -> queue update for this map until unlock
                    if( mapUpdateQueue.indexOf(mapId) === -1 ){
                        mapUpdateQueue.push(mapId);
                    }
                }
            }

            resolve({
                action: 'updateMap',
                data: {
                    mapConfig: mapConfig
                }
            });
        };

        return new Promise(updateMapExecutor);
    };

    /**
     * update local connections cache (cache all connections from a map)
     * @param map
     */
    let updateConnectionsCache = (map) => {
        let connections = map.getAllConnections();
        let mapContainer = $( map.getContainer() );
        let mapId = mapContainer.data('id');

        if(mapId > 0){
            // clear cache
            connectionCache[mapId] = [];

            for(let i = 0; i < connections.length; i++){
                updateConnectionCache(mapId, connections[i]);
            }
        }else{
            console.warn('updateConnectionsCache', 'missing mapId');
        }
    };

    /**
     * update local connection cache (single connection)
     * @param mapId
     * @param connection
     */
    let updateConnectionCache = function(mapId, connection){

        if(
            mapId > 0 &&
            connection
        ){
            let connectionId = parseInt( connection.getParameter('connectionId') );

            if(connectionId > 0){
                connectionCache[mapId][connectionId] = connection;
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

        let connection = null;

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
        let mapElement = $(this);

        // start map update counter -> prevent map updates during animations
        mapElement.getMapOverlay('timer').startMapUpdateCounter();

        let systemElements = mapElement.find('.' + config.systemClass);
        let endpointElements =  mapElement.find('.jsplumb-endpoint');
        let connectorElements = mapElement.find('.jsplumb-connector');
        let overlayElements = mapElement.find('.jsplumb-overlay, .tooltip');

        let hideElements = (elements) => {
            if(elements.length > 0){
                // disable transition for next opacity change
                elements.addClass('pf-notransition');
                // hide elements
                elements.css('opacity', 0);
                // Trigger a reflow, flushing the CSS changes
                // -> http://stackoverflow.com/questions/11131875/what-is-the-cleanest-way-to-disable-css-transition-effects-temporarily
                elements[0].offsetHeight; // jshint ignore:line
                elements.removeClass('pf-notransition');
            }

            return elements;
        };

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
            systemElements = hideElements(systemElements);
            endpointElements = hideElements(endpointElements);
            connectorElements = hideElements(connectorElements);
            overlayElements = hideElements(overlayElements);

            systemElements.velocity({
                translateY: [ 0, -20],
                opacity: [ 1, 0 ]
            },{
                duration: 300,
                easing: 'easeOut',
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
                        overlayElements.delay(300).velocity('transition.fadeIn', {
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

                    systemElements.delay(100).velocity({
                        translateY: [ -20, 0 ],
                        opacity: [ 0, 1 ]
                    },{
                        duration: 180,
                        display: 'block',
                        easing: 'easeOut',
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
    let makeSource = function(map, system){
        if( !map.isSource(system) ){
            // get scope from map defaults
            let sourceConfig = globalMapConfig.source;
            sourceConfig.scope = map.Defaults.Scope;    // set all allowed connections for this scopes

            // default connector for initial dragging a new connection
            sourceConfig.connector = MapUtil.getScopeInfoForConnection('wh', 'connectorDefinition');

            map.makeSource(system, sourceConfig);
        }
    };

    /**
     * mark a system as target
     * @param map
     * @param system
     */
    let makeTarget = function(map, system){
        if( !map.isTarget(system) ){
            // get scope from map defaults
            let targetConfig = globalMapConfig.target;
            targetConfig.scope = map.Defaults.Scope;    // set all allowed connections for this scopes

            map.makeTarget(system, targetConfig);
        }
    };

    /**
     * checks if json system data is valid
     * @param systemData
     * @returns {boolean}
     */
    let isValidSystem = function(systemData){
        let isValid = true;

        if(
            !systemData.hasOwnProperty('name') ||
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
    let drawSystem = (map, systemData, connectedSystem) => {

        // check if systemData is valid
        if(isValidSystem(systemData)){
            let mapContainer = $(map.getContainer());

            // get System Element by data
            let newSystem = mapContainer.getSystem(map, systemData);

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
                let connectionData = {
                    source: $(connectedSystem).data('id'),
                    target: newSystem.data('id'),
                    type: ['wh_fresh'] // default type.
                };
                let connection = drawConnection(map, connectionData);

                // store connection
                saveConnection(connection);
            }
        }
    };

    /**
     * save a new system and add it to the map
     * @param requestData
     * @param context
     */
    let saveSystem = (requestData, context) => {
        $.ajax({
            type: 'POST',
            url: Init.path.saveSystem,
            data: requestData,
            dataType: 'json',
            context: context
        }).done(function(responseData){
            let newSystemData = responseData.systemData;

            if( !$.isEmptyObject(newSystemData) ){
                Util.showNotify({title: 'New system', text: newSystemData.name, type: 'success'});

                // draw new system to map
                drawSystem(this.map, newSystemData, this.sourceSystem);

                // re/arrange systems (prevent overlapping)
                MagnetizerWrapper.setElements(this.map);

                if(this.onSuccess){
                    this.onSuccess();
                }
            }

            // show errors
            if(
                responseData.error &&
                responseData.error.length > 0
            ){
                for(let i = 0; i < responseData.error.length; i++){
                    let error = responseData.error[i];
                    Util.showNotify({title: error.field + ' error', text: 'System: ' + error.message, type: error.type});
                }
            }
        }).fail(function( jqXHR, status, error) {
            let reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': saveSystem', text: reason, type: 'warning'});
            $(document).setProgramStatus('problem');
        }).always(function(){
            if(this.onAlways){
                this.onAlways(this);
            }
        });
    };

    /**
     * open "new system" dialog and add the system to map
     * optional the new system is connected to a "sourceSystem" (if available)
     *
     * @param map
     * @param options
     */
    let showNewSystemDialog = function(map, options){
        let mapContainer = $(map.getContainer());

        // format system status for form select -----------------------------------------------------------------------
        let systemStatus = {};
        // "default" selection (id = 0) prevents status from being overwritten
        // -> e.g. keep status information if system was just inactive (active = 0)
        systemStatus[0] = 'default';

        $.each(Init.systemStatus, function(status, statusData){
            systemStatus[statusData.id] = statusData.label;
        });

        // default system status -> first status entry
        let defaultSystemStatus = 0;

        // get current map data ---------------------------------------------------------------------------------------
        let mapData = mapContainer.getMapDataFromClient({forceData: true});
        let mapSystems = mapData.data.systems;
        let mapSystemCount = mapSystems.length;
        let mapTypeName = mapContainer.data('typeName');
        let maxAllowedSystems = Init.mapTypes[mapTypeName].defaultConfig.max_systems;

        // show error if system max count reached ---------------------------------------------------------------------
        if(mapSystemCount >= maxAllowedSystems){
            Util.showNotify({title: 'Max system count exceeded', text: 'Limit of ' + maxAllowedSystems + ' systems reached', type: 'warning'});
            return;
        }

        // disable systems that are already on it ---------------------------------------------------------------------
        let mapSystemIds = [];
        for(let i = 0; i < mapSystems.length; i++ ){
            mapSystemIds.push( mapSystems[i].systemId );
        }

        // dialog data ------------------------------------------------------------------------------------------------
        let data = {
            id: config.systemDialogId,
            selectClass: config.systemDialogSelectClass
        };

        // set current position as "default" system to add ------------------------------------------------------------
        let currentCharacterLog = Util.getCurrentCharacterLog();

        if(
            currentCharacterLog !== false &&
            mapSystemIds.indexOf( currentCharacterLog.system.id ) === -1
        ){
            // current system is NOT already on this map
            // set current position as "default" system to add
            data.currentSystem = currentCharacterLog.system;
        }

        requirejs(['text!templates/dialog/system.html', 'mustache'], function(template, Mustache) {

            let content = Mustache.render(template, data);

            let systemDialog = bootbox.dialog({
                title: 'Add new system',
                message: content,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fas fa-fw fa-check"></i> save',
                        className: 'btn-success',
                        callback: function (e) {
                            // get form Values
                            let form = $('#' + config.systemDialogId).find('form');

                            let systemDialogData = $(form).getFormValues();

                            // validate form
                            form.validator('validate');

                            // check whether the form is valid
                            let formValid = form.isValidForm();

                            if(formValid === false){
                                // don't close dialog
                                return false;
                            }

                            // calculate new system position ----------------------------------------------------------
                            let newPosition = {
                                x: 0,
                                y: 0
                            };

                            let sourceSystem = null;

                            // add new position
                            if(options.sourceSystem !== undefined){

                                sourceSystem = options.sourceSystem;

                                // get new position
                                newPosition = System.calculateNewSystemPosition(sourceSystem);

                            }else{
                                // check mouse cursor position (add system to map)
                                newPosition = {
                                    x: options.position.x,
                                    y: options.position.y
                                };
                            }

                            systemDialogData.position = newPosition;

                            // ----------------------------------------------------------------------------------------

                            let requestData = {
                                systemData: systemDialogData,
                                mapData: {
                                    id: mapContainer.data('id')
                                }
                            };

                            this.find('.modal-content').showLoadingAnimation();

                            saveSystem(requestData, {
                                map: map,
                                sourceSystem: sourceSystem,
                                systemDialog: this,
                                onSuccess: () => {
                                    bootbox.hideAll();
                                },
                                onAlways: (context) => {
                                    context.systemDialog.find('.modal-content').hideLoadingAnimation();
                                }
                            });
                            return false;
                        }
                    }
                }
            });

            // init dialog
            systemDialog.on('shown.bs.modal', function(e) {

                let modalContent = $('#' + config.systemDialogId);

                // init system select live search  - some delay until modal transition has finished
                let selectElement = modalContent.find('.' + config.systemDialogSelectClass);
                selectElement.delay(240).initSystemSelect({
                    key: 'systemId',
                    disabledOptions: mapSystemIds
                });
            });

            // init system status select
            let modalFields = $('.bootbox .modal-dialog').find('.pf-editable-system-status');

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
     * make a system name/alias editable by x-editable
     * @param system
     */
    let makeEditable = function(system){
        system = $(system);
        let headElement = $(system).find('.' + config.systemHeadNameClass);

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

        headElement.on('shown', function(e, editable) {
            let inputElement =  editable.input.$input.select();

            // "fake" timeout until dom rendered
            setTimeout(function(input){
                // pre-select value
                input.select();
            }, 0, inputElement);
        });
    };

    /**
     * update z-index for a system (dragged systems should be always on top)
     */
    $.fn.updateSystemZIndex = function(){
        return this.each(function(){
            // increase global counter
            let newZIndexSystem = config.zIndexCounter++;
            $(this).css('z-index', newZIndexSystem);
        });
    };

    /**
     * stores a connection in database
     * @param connection
     */
    let saveConnection = function(connection){
        if( connection instanceof jsPlumb.Connection ){

            let map = connection._jsPlumb.instance;
            let mapContainer = $( map.getContainer() );

            let mapId = mapContainer.data('id');
            let connectionData = MapUtil.getDataByConnection(connection);

            let requestData = {
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
                context: {
                    connection: connection,
                    map: map,
                    mapId: mapId,
                    oldConnectionData: connectionData
                }
            }).done(function(responseData){
                let newConnectionData = responseData.connectionData;

                if( !$.isEmptyObject(newConnectionData) ){
                    let updateCon = false;

                    if(this.oldConnectionData.id > 0){
                        // connection exists (e.g. drag&drop new target system... (ids should never changed)
                        let connection = $().getConnectionById(this.mapId, this.oldConnectionData.id);
                        updateCon = true;
                    }else{
                        // new connection, check if connectionId was already updated (webSocket push is faster than ajax callback)
                        let connection = $().getConnectionById(this.mapId, newConnectionData.id);

                        if(connection){
                            // connection already updated
                            this.map.detach(this.connection, {fireEvent: false});
                        }else{
                            // .. else update this connection
                            connection = this.connection;
                            updateCon = true;
                        }
                    }

                    if(updateCon){
                        // update connection data e.g. "scope" has auto detected
                        connection = updateConnection(connection, this.oldConnectionData, newConnectionData);

                        // new/updated connection should be cached immediately!
                        updateConnectionCache(this.mapId, connection);
                    }

                    // connection scope
                    let scope = MapUtil.getScopeInfoForConnection(newConnectionData.scope, 'label');

                    let title = 'New connection established';
                    if(this.oldConnectionData.id > 0){
                        title = 'Connection switched';
                    }

                    Util.showNotify({title: title, text: 'Scope: ' + scope, type: 'success'});
                }else{
                    // some save errors
                    this.map.detach(this.connection, {fireEvent: false});
                }

                // show errors
                if(
                    responseData.error &&
                    responseData.error.length > 0
                ){
                    for(let i = 0; i < responseData.error.length; i++){
                        let error = responseData.error[i];
                        Util.showNotify({title: error.field + ' error', text: 'System: ' + error.message, type: error.type});
                    }
                }
            }).fail(function( jqXHR, status, error) {
                // remove this connection from map
                this.map.detach(this.connection, {fireEvent: false});

                let reason = status + ' ' + error;
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
            let removeConnections = function(tempConnections){
                for(let i = 0; i < tempConnections.length; i++){
                    // if a connection is manually (drag&drop) detached, the jsPlumb instance does not exist any more
                    // connection is already deleted!
                    if(tempConnections[i]._jsPlumb){
                        tempConnections[i]._jsPlumb.instance.detach(tempConnections[i], {fireEvent: false});
                    }
                }
            };

            // prepare delete request
            let map = connections[0]._jsPlumb.instance;
            let mapContainer = $( map.getContainer() );

            let connectionIds = [];
            // connectionIds for delete request
            for(let i = 0; i < connections.length; i++){
                let connectionId = connections[i].getParameter('connectionId');
                // drag&drop a new connection does not have an id yet, if connection is not established correct
                if(connectionId !== undefined){
                    connectionIds[i] = connections[i].getParameter('connectionId');
                }
            }

            if(connectionIds.length > 0){
                let requestData = {
                    mapId: mapContainer.data('id'),
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
                    let reason = status + ' ' + error;
                    Util.showNotify({title: jqXHR.status + ': deleteSystem', text: reason, type: 'warning'});
                    $(document).setProgramStatus('problem');
                });
            }
        }
    };

    /**
     * load context menu template for map
     */
    let initMapContextMenu = function(){
        let moduleConfig = {
            name: 'modules/contextmenu',
            position: $('#' + config.dynamicElementWrapperId)
        };

        let moduleData = {
            id: config.mapContextMenuId,
            items: [
                {icon: 'fa-plus', action: 'add_system', text: 'add system'},
                {icon: 'fa-object-ungroup', action: 'select_all', text: 'select all'},
                {icon: 'fa-filter', action: 'filter_scope', text: 'filter scope', subitems: [
                    {subIcon: '', subAction: 'filter_wh', subText: 'wormhole'},
                    {subIcon: '', subAction: 'filter_stargate', subText: 'stargate'},
                    {subIcon: '', subAction: 'filter_jumpbridge', subText: 'jumpbridge'},
                    {subIcon: '', subAction: 'filter_abyssal', subText: 'abyssal'}
                ]},
                {icon: 'fa-sitemap', action: 'map', text: 'map', subitems: [
                    {subIcon: 'fa-edit', subAction: 'map_edit', subText: 'edit map'},
                    {subIcon: 'fa-street-view', subAction: 'map_info', subText: 'map info'},
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
    let initConnectionContextMenu = function(){
        let moduleConfig = {
            name: 'modules/contextmenu',
            position: $('#' + config.dynamicElementWrapperId)
        };

        let moduleData = {
            id: config.connectionContextMenuId,
            items: [
                {icon: 'fa-plane', action: 'frigate', text: 'frigate hole'},
                {icon: 'fa-exclamation-triangle', action: 'preserve_mass', text: 'preserve mass'},
                {icon: 'fa-crosshairs', action: 'change_scope', text: 'change scope', subitems: [
                    {subIcon: 'fa-minus-circle', subIconClass: '', subAction: 'scope_wh', subText: 'wormhole'},
                    {subIcon: 'fa-minus-circle', subIconClass: 'txt-color  txt-color-indigoDarkest', subAction: 'scope_stargate', subText: 'stargate'},
                    {subIcon: 'fa-minus-circle', subIconClass: 'txt-color  txt-color-tealLighter', subAction: 'scope_jumpbridge', subText: 'jumpbridge'}

                ]},
                {icon: 'fa-reply fa-rotate-180', action: 'change_status', text: 'change status', subitems: [
                    {subIcon: 'fa-clock', subAction: 'wh_eol', subText: 'toggle EOL'},
                    {subDivider: true},
                    {subIcon: 'fa-circle', subAction: 'status_fresh', subText: 'stage 1 (fresh)'},
                    {subIcon: 'fa-adjust', subAction: 'status_reduced', subText: 'stage 2 (reduced)'},
                    {subIcon: 'fa-circle', subAction: 'status_critical', subText: 'stage 3 (critical)'}

                ]},
                {divider: true, action: 'separator'} ,
                {icon: 'fa-unlink', action: 'delete_connection', text: 'detach'}
            ]
        };

        Render.showModule(moduleConfig, moduleData);

    };

    /**
     * load contextmenu template for systems
     */
    let initSystemContextMenu = function(){
        let systemStatus = [];

        $.each(Init.systemStatus, function(status, statusData){
            let tempStatus = {
                subIcon: 'fa-tag',
                subIconClass: statusData.class,
                subAction: 'change_status_' + status,
                subText: statusData.label
            };
            systemStatus.push(tempStatus);
        });

        let moduleConfig = {
            name: 'modules/contextmenu',
            position: $('#' + config.dynamicElementWrapperId)
        };

        let moduleData = {
            id: config.systemContextMenuId,
            items: [
                {icon: 'fa-plus', action: 'add_system', text: 'add system'},
                {icon: 'fa-lock', action: 'lock_system', text: 'lock system'},
                {icon: 'fa-volume-up', action: 'set_rally', text: 'set rally point'},
                {icon: 'fa-object-group', action: 'select_connections', text: 'select connections'},
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
     * get hidden menu entry options for a context menu
     * @param component
     * @returns {Array}
     */
    let getHiddenContextMenuOptions = function(component){
        let hiddenOptions = [];

        if(component instanceof jsPlumb.Connection){
            // disable connection menu entries

            let scope = component.scope;

            if(scope === 'abyssal'){
                hiddenOptions.push('frigate');
                hiddenOptions.push('preserve_mass');
                hiddenOptions.push('change_status');

                hiddenOptions.push('change_scope');
                hiddenOptions.push('separator');
            }else if(scope === 'stargate'){
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
    let getActiveContextMenuOptions = function(component){
        let activeOptions = [];

        if(component instanceof jsPlumb.Connection){
            let scope = component.scope;

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
            if(component.data('filter_scope') === 'abyssal'){
                activeOptions.push('filter_abyssal');
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
     * set up all actions that can be preformed on a system
     * @param map
     * @param system
     */
    let setSystemObserver = (map, system) => {
        system = $(system);

        // get map container
        let mapContainer = $( map.getContainer() );
        let systemHeadExpand = $( system.find('.' + config.systemHeadExpandClass) );
        let systemBody = $( system.find('.' + config.systemBodyClass) );
        let grid = [MapUtil.config.mapSnapToGridDimension, MapUtil.config.mapSnapToGridDimension];
        // map overlay will be set on "drag" start
        let mapOverlayTimer = null;

        // make system draggable
        map.draggable(system, {
            containment: 'parent',
            constrain: true,
            //scroll: true,                                             // not working because of customized scrollbar
            filter: filterSystemHeadEvent,
            snapThreshold: MapUtil.config.mapSnapToGridDimension,       // distance for grid snapping "magnet" effect (optional)
            start: function(params){
                let dragSystem = $(params.el);

                mapOverlayTimer = dragSystem.getMapOverlay('timer');

                // start map update timer
                mapOverlayTimer.startMapUpdateCounter();

                // check if grid-snap is enable -> this enables napping for !CURRENT! Element
                if( mapContainer.hasClass(MapUtil.config.mapGridClass) ){
                    params.drag.params.grid = grid;
                }else{
                    delete( params.drag.params.grid );
                }

                // stop "system click event" right after drop event is finished
                dragSystem.addClass('no-click');

                // drag system is not always selected
                let selectedSystems = mapContainer.getSelectedSystems().get();
                selectedSystems = selectedSystems.concat( dragSystem.get() );
                selectedSystems = $.unique( selectedSystems );

                // hide tooltip
                $(selectedSystems).toggleSystemTooltip('hide', {});

                // destroy popovers
                $(selectedSystems).destroyPopover(true);

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
                let dragSystem = $(params.el);

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
                let newPosition = dragSystem.position();

                let placement = 'top';
                if(newPosition.top < 100){
                    placement = 'bottom';
                }
                if(newPosition.left < 100){
                    placement = 'right';
                }
                dragSystem.find('.' + config.systemHeadNameClass).editable('option', 'placement', placement);

                // drag system is not always selected
                let selectedSystems = mapContainer.getSelectedSystems().get();
                selectedSystems = selectedSystems.concat( dragSystem.get() );
                selectedSystems = $.unique( selectedSystems );

                for(let i = 0; i < selectedSystems.length; i++){
                    let tempSystem = $(selectedSystems[i]);
                    // repaint connections -> just in case something fails...
                    map.revalidate( tempSystem.attr('id') );
                }
            }
        });

        if(system.data('locked') === true){
            map.setDraggable(system, false);
        }

        // init system tooltips =======================================================================================
        // TODO check this code:
        /*
        let systemTooltipOptions = {
            toggle: 'tooltip',
            placement: 'right',
            container: 'body',
            viewport: system.id
        };

        system.find('.fas').tooltip(systemTooltipOptions);
*/
        // context menu ===============================================================================================

        // trigger context menu
        system.off('contextmenu').on('contextmenu', function(e){
            e.preventDefault();
            e.stopPropagation();

            let systemElement = $(this);

            // hide all map contextmenu options
            let hideOptions = getHiddenContextMenuOptions(systemElement);

            let activeOptions = getActiveContextMenuOptions(systemElement);

            $(e.target).trigger('pf:openContextMenu', [e, this, hideOptions, activeOptions]);
            return false;
        });

        // init context menu
        system.contextMenu({
            menuSelector: '#' + config.systemContextMenuId,
            menuSelected: function (params) {

                // click action
                let action = params.selectedMenu.attr('data-action');

                // current system
                let currentSystem = $(params.component);

                // system name
                let currentSystemName = currentSystem.getSystemInfo( ['alias'] );

                let systemData = {};

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
                    case 'select_connections':
                        let connections = MapUtil.searchConnectionsBySystems(map, [currentSystem], '*');
                        MapUtil.showConnectionInfo(map, connections);
                        break;
                    case 'change_status_unknown':
                    case 'change_status_friendly':
                    case 'change_status_occupied':
                    case 'change_status_hostile':
                    case 'change_status_empty':
                    case 'change_status_unscanned':
                        // change system status
                        currentSystem.getMapOverlay('timer').startMapUpdateCounter();

                        let statusString = action.split('_');

                        currentSystem.setSystemStatus(statusString[2]);

                        currentSystem.markAsChanged();
                        break;
                    case 'delete_system':
                        // delete this system AND delete selected systems as well
                        let selectedSystems = mapContainer.getSelectedSystems();
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

        // system click events ========================================================================================
        let double = function(e){
            let system = $(this);
            let headElement = $(system).find('.' + config.systemHeadNameClass);

            // update z-index for system, editable field should be on top
            // move them to the "top"
            $(system).updateSystemZIndex();

            // show "set alias" input (x-editable)
            headElement.editable('show');
        };

        let single = function(e){
            // check if click was performed on "popover" (x-editable)
            let popoverClick = false;
            if( $(e.target).parents('.popover').length ){
                popoverClick = true;
            }

            // continue if click was *not* on a popover dialog of a system
            if( !popoverClick ){
                let system = $(this);

                // check if system is locked for "click" events
                if( !system.hasClass('no-click') ){
                    // left mouse button
                    if(e.which === 1){
                        if(! system.hasClass('no-click')){
                            if(e.ctrlKey === true){
                                // select system
                                MapUtil.toggleSelectSystem(map, [system]);
                            }else{
                                MapUtil.showSystemInfo(map, system);
                            }
                        }
                    }
                }
            }

        };

        Util.singleDoubleClick(system, single, double);
    };

    /**
     * mark a dom element (map, system, connection) as changed
     */
    $.fn.markAsChanged = function(){
        return this.each(function(){
            let element = $(this);

            if( element.hasClass(config.systemClass) ){
                // system element
                element.data('changed', true);
            }else{
                // connection element
                this.setParameter('changed', true);
            }
        });
    };

    /**
     * check if an dom element (system, connection) has changed
     * @returns {boolean}
     */
    $.fn.hasChanged = function(){
        let element = $(this);
        let changed = false;

        if( element.hasClass(config.systemClass) ){
            // system element
            changed = element.data('changed') || false;
        }else{
            // connection element
            changed = this[0].getParameter('changed') || false;
        }

        return changed;
    };

    /**
     * select all (selectable) systems on a mapElement
     */
    $.fn.selectAllSystems = function(){
        return this.each(function(){
            let mapElement = $(this);
            let map = getMapInstance(mapElement.data('id'));

            let allSystems =  mapElement.find('.' + config.systemClass + ':not(.' + config.systemSelectedClass + ')');

            // filter non-locked systems
            allSystems = allSystems.filter(function(i, el){
                return ( $(el).data('locked') !== true );
            });

            MapUtil.toggleSelectSystem(map, allSystems);

            Util.showNotify({title: allSystems.length + ' systems selected', type: 'success'});

        });
    };

    /**
     * toggle log status of a system
     * @param poke
     * @param options
     */
    $.fn.toggleLockSystem = function(poke, options){

        let system = $(this);

        let map = options.map;

        let hideNotification = false;
        if(options.hideNotification === true){
            hideNotification = true;
        }

        let hideCounter = false;
        if(options.hideCounter === true){
            hideCounter = true;
        }

        let systemName = system.getSystemInfo( ['alias'] );

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
     * get a new jsPlumb map instance or or get a cached one for update
     * @param mapId
     * @returns {*}
     */
    let getMapInstance = function(mapId){

        if( !MapUtil.existsMapInstance(mapId) ){
            // create new instance
            jsPlumb.Defaults.LogEnabled = true;

            let newJsPlumbInstance =  jsPlumb.getInstance({
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

            // register all available connection types ----------------------------------------------------------------
            newJsPlumbInstance.registerConnectionTypes(globalMapConfig.connectionTypes);

            // event after a new connection is established --------------------------
            newJsPlumbInstance.bind('connection', function(info, e) {
                // set connection observer
                setConnectionObserver(newJsPlumbInstance, info.connection);
            });

            // event after connection moved ---------------------------------------------------------------------------
            newJsPlumbInstance.bind('connectionMoved', function(info, e) {

            });

            // event after DragStop a connection or new connection ----------------------------------------------------
            newJsPlumbInstance.bind('beforeDrop', function(info) {
                let connection = info.connection;
                let dropEndpoint = info.dropEndpoint;
                let sourceId = info.sourceId;
                let targetId = info.targetId;

                // lock the target system for "click" events
                // to prevent loading system information
                let sourceSystem = $('#' + sourceId);
                let targetSystem = $('#' + targetId);
                sourceSystem.addClass('no-click');
                targetSystem.addClass('no-click');
                setTimeout(function(){
                    sourceSystem.removeClass('no-click');
                    targetSystem.removeClass('no-click');
                }, Init.timer.DBL_CLICK + 50);

                // loop connection not allowed
                if(sourceId === targetId){
                    console.warn('Source/Target systems are identical');
                    return false;
                }

                // connection can not be dropped on an endpoint that already has other connections on it
                if(dropEndpoint.connections.length > 0){
                    console.warn('Endpoint already occupied');
                    return false;
                }

                // switch connection type to "abyss" in case source OR target system belongs to "a-space"
                if(sourceSystem.data('typeId') === 3 || targetSystem.data('typeId') === 3){
                    setConnectionScope(connection, 'abyssal');
                }

                // set "default" connection status only for NEW connections
                if(!connection.suspendedElement){
                    MapUtil.setConnectionWHStatus(connection, MapUtil.getDefaultConnectionTypeByScope(connection.scope) );
                }

                // prevent multiple connections between same systems
                let connections = MapUtil.checkForConnection(newJsPlumbInstance, sourceId, targetId);
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

            // event before detach (existing connection) --------------------------------------------------------------
            newJsPlumbInstance.bind('beforeStartDetach', function(info) {
                return true;
            });

            // event before detach connection -------------------------------------------------------------------------
            newJsPlumbInstance.bind('beforeDetach', function(info) {
                return true;
            });

            newJsPlumbInstance.bind('connectionDetached', function(info, e){
                // a connection is manually (drag&drop) detached! otherwise this event should not be send!
                let connection = info.connection;
                $().deleteConnections([connection]);
            });

            newJsPlumbInstance.bind('checkDropAllowed', function(params){
                let sourceEndpoint = params.sourceEndpoint;
                let targetEndpoint = params.targetEndpoint;

                // connections can not be attached to foreign endpoints
                // the only endpoint available is the endpoint from where the connection was dragged away (re-attach)
                return (targetEndpoint.connections.length === 0);
            });

            MapUtil.setMapInstance(mapId, newJsPlumbInstance);
        }

        return MapUtil.getMapInstance(mapId);
    };

    /**
     * set observer for a map container
     * @param map
     */
    let setMapObserver = function(map){
        // get map container
        let mapContainer = $( map.getContainer() );

        mapContainer.bind('contextmenu', function(e){
            e.preventDefault();
            e.stopPropagation();

            // make sure map is clicked and NOT a connection
            if($(e.target).hasClass( config.mapClass )){
                let mapElement = $(this);

                let hideOptions = getHiddenContextMenuOptions(mapElement);

                let activeOptions = getActiveContextMenuOptions(mapElement);

                $(e.target).trigger('pf:openContextMenu', [e, mapElement, hideOptions, activeOptions]);
            }

            return false;
        });

        mapContainer.contextMenu({
            menuSelector: '#' + config.mapContextMenuId,
            menuSelected: function (params) {

                // click action
                let action = params.selectedMenu.attr('data-action');

                // current map
                let currentMapElement = $(params.component);

                let currentMapId = parseInt( currentMapElement.data('id') );

                // get map instance
                let currentMap = getMapInstance(currentMapId);

                // click position
                let position = params.position;

                switch(action){
                    case 'add_system':
                        // add new system dialog
                        let grid = [MapUtil.config.mapSnapToGridDimension, MapUtil.config.mapSnapToGridDimension];
                        let positionFinder = new Layout.Position({
                            container: currentMapElement[0],
                            center: [position.x, position.y],
                            loops: 5,
                            defaultGapX: 10,
                            defaultGapY: 10,
                            grid: currentMapElement.hasClass(MapUtil.config.mapGridClass) ? grid : false,
                            debug: false
                        });

                        let dimensions = positionFinder.findNonOverlappingDimensions(1, 8);

                        if(dimensions.length){
                            position.x = dimensions[0].left;
                            position.y = dimensions[0].top;
                        }

                        showNewSystemDialog(currentMap, {position: position});
                        break;
                    case 'select_all':
                        currentMapElement.selectAllSystems();
                        break;
                    case 'filter_wh':
                    case 'filter_stargate':
                    case 'filter_jumpbridge':
                    case 'filter_abyssal':
                        // filter (show/hide)
                        let filterScope = action.split('_')[1];

                        // scope label
                        let filterScopeLabel = MapUtil.getScopeInfoForMap(filterScope, 'label');

                        let showScope = true;
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

                        let filteredConnections = currentMap.getAllConnections(filterScope);

                        for(let i = 0; i < filteredConnections.length; i++){
                            let tempConnection = filteredConnections[i];

                            let tempEndpoints = tempConnection.endpoints;
                            let setVisible = true;

                            if(
                                showScope &&
                                tempConnection.scope !== filterScope
                            ){
                                setVisible = false;
                            }


                            for(let j = 0; j < tempEndpoints.length; j++){
                                tempEndpoints[j].setVisible( setVisible );
                            }
                        }

                        Util.showNotify({title: 'Scope filter changed', text: filterScopeLabel, type: 'success'});

                        break;
                    case 'delete_systems':
                        // delete all selected systems with its connections
                        let selectedSystems = currentMapElement.getSelectedSystems();
                        $.fn.showDeleteSystemDialog(currentMap, selectedSystems);
                        break;
                    case 'map_edit':
                        // open map edit dialog tab
                        $(document).triggerMenuEvent('ShowMapSettings', {tab: 'edit'});
                        break;
                    case 'map_info':
                        // open map info dialog tab
                        $(document).triggerMenuEvent('ShowMapInfo', {tab: 'information'});
                        break;

                }
            }
        });

        // init drag-frame selection
        mapContainer.dragToSelect({
            selectOnMove: true,
            selectables: '.' + config.systemClass,
            onHide: function (selectBox, deselectedSystems) {
                let selectedSystems = mapContainer.getSelectedSystems();

                if(selectedSystems.length > 0){
                    // make all selected systems draggable
                    Util.showNotify({title: selectedSystems.length + ' systems selected', type: 'success'});

                    // convert former group draggable systems so single draggable
                    for(let i = 0; i < selectedSystems.length; i++){
                        map.addToDragSelection( selectedSystems[i] );
                    }
                }

                // convert former group draggable systems so single draggable
                for(let j = 0; j < deselectedSystems.length; j++){
                    map.removeFromDragSelection( deselectedSystems[j] );
                }
            },
            onShow: function(){
                $(document).trigger('pf:closeMenu', [{}]);
            },
            onRefresh: function(){
            }
        });


        // system body expand -----------------------------------------------------------------------------------------
        mapContainer.hoverIntent({
            over: function(e){
                let system =  $(this).closest('.' + config.systemClass);
                let map  = MapUtil.getMapInstance(system.attr('data-mapid'));
                let systemId = system.attr('id');
                let systemBody = system.find('.' + config.systemBodyClass);

                // bring system in front (increase zIndex)
                system.updateSystemZIndex();

                // get ship counter and calculate expand height
                let userCount = parseInt(system.data('userCount'));
                let expandHeight = userCount * config.systemBodyItemHeight;

                // calculate width
                let width = system[0].clientWidth;
                let minWidth = 150;
                let newWidth = width > minWidth ? width : minWidth; // in case of big systems

                systemBody.velocity('stop').velocity(
                    {
                        height: expandHeight + 'px',
                        width: newWidth,
                        'min-width': minWidth + 'px'
                    },{
                        easing: 'easeInOutQuart',
                        duration: 120,
                        progress: function(){
                            // repaint connections of current system
                            map.revalidate(systemId);
                        },
                        complete: function(){
                            map.revalidate(systemId);

                            // extend player name element
                            let systemBody = $(this);
                            let systemBodyItemNameWidth = newWidth - 50 - 10 - 20; // - bodyRight - icon - somePadding
                            systemBody.find('.' + config.systemBodyItemNameClass).css({width: systemBodyItemNameWidth + 'px'});
                            systemBody.find('.' + config.systemBodyRightClass).show();
                        }
                    }
                );
            },
            out: function(e){
                let system =  $(this).closest('.' + config.systemClass);
                let map  = MapUtil.getMapInstance(system.attr('data-mapid'));
                let systemId = system.attr('id');
                let systemBody = system.find('.' + config.systemBodyClass);

                // stop animation (prevent visual bug if user spams hover-icon [in - out])
                systemBody.velocity('stop');

                // reduce player name element back to "normal" size (css class width is used)
                systemBody.find('.' + config.systemBodyRightClass).hide();
                systemBody.find('.' + config.systemBodyItemNameClass).css({width: ''});

                systemBody.velocity('reverse', {
                    complete: function(){
                        // overwrite "complete" function from first "hover"-open
                        // set animated "with" back to default "100%" important in case of system with change (e.g. longer name)
                        $(this).css({width: ''});

                        map.revalidate(systemId);
                    }
                });
            },
            selector: '.' + config.systemClass + ' .' + config.systemHeadExpandClass
        });

        // system "effect" popover ------------------------------------------------------------------------------------
        // -> event delegation to system elements, popup only if needed (hover)
        mapContainer.hoverIntent({
            over: function(e){
                let effectElement = $(this);
                let systemElement = effectElement.closest('.' + config.systemClass);
                let security = systemElement.data('security');
                let effect = systemElement.data('effect');

                effectElement.addSystemEffectTooltip(security, effect, {
                    trigger: 'manual',
                    placement: 'right'
                }).setPopoverSmall().popover('show');
            },
            out: function(e){
                $(this).destroyPopover();
            },
            selector: '.' + config.systemClass + ' .' + MapUtil.getEffectInfoForSystem('effect', 'class')
        });

        // system "statics" popover -----------------------------------------------------------------------------------
        // -> event delegation to system elements, popup only if needed (hover)
        mapContainer.hoverIntent({
            over: function(e){
                let staticWormholeElement = $(this);
                let wormholeName = staticWormholeElement.attr('data-name');
                let wormholeData =  Util.getObjVal(Init, 'wormholes.' + wormholeName);
                if(wormholeData){
                    staticWormholeElement.addWormholeInfoTooltip(wormholeData, {
                        trigger: 'manual',
                        placement: 'right',
                        smaller: true,
                        show: true
                    });
                }
            },
            out: function(e){
                $(this).destroyPopover();
            },
            selector: '.' + config.systemHeadInfoClass + ' span[class^="pf-system-sec-"]'
        });

        // catch events ===============================================================================================

        // toggle global map option (e.g. "grid snap", "magnetization")
        mapContainer.on('pf:menuMapOption', function(e, mapOption){
            let mapElement = $(this);

            // get map menu config options
            let data = MapUtil.mapOptions[mapOption.option];

            let promiseStore = MapUtil.getLocaleData('map', mapElement.data('id') );
            promiseStore.then(function(dataStore) {
                let notificationText = 'disabled';
                let button = $('#' + this.data.buttonId);
                let dataExists = false;

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
        mapContainer.on('pf:deleteSystems', function(e, data){
            System.deleteSystems(map, data.systems, data.callback);
        });

        // triggered from "header" link (if user is active in one of the systems)
        mapContainer.on('pf:menuSelectSystem', function(e, data){
            let tempMapContainer = $(this);
            let systemId = MapUtil.getSystemId(tempMapContainer.data('id'), data.systemId);
            let system = $(this).find('#' + systemId);

            if(system.length === 1){
                // scroll to system
                let tempMapWrapper = tempMapContainer.parents('.' + config.mapWrapperClass);
                tempMapWrapper.mCustomScrollbar('scrollTo', system);

                // select system
                MapUtil.showSystemInfo(map, system);
            }
        });

        // triggered when map lock timer (interval) was cleared
        mapContainer.on('pf:unlocked', function(){
            let mapElement = $(this);
            let mapId = mapElement.data('id');

            // check if there was a mapUpdate during map was locked
            let mapQueueIndex = mapUpdateQueue.indexOf(mapId);
            if(mapQueueIndex !== -1){
                // get current mapConfig
                let mapConfig = Util.getCurrentMapData(mapId);

                if(mapConfig){
                    // map data is available => update map
                    updateMap(mapConfig);
                }

                // update done -> clear mapId from mapUpdateQueue
                mapUpdateQueue.splice(mapQueueIndex, 1);
            }
        });

        // update "local" overlay for this map
        mapContainer.on('pf:updateLocal', function(e, userData){
            let mapElement = $(this);
            let mapOverlay = mapElement.getMapOverlay('local');

            if(userData && userData.config && userData.config.id){
                let currentMapData = Util.getCurrentMapData(userData.config.id);
                let currentCharacterLog = Util.getCurrentCharacterLog();
                let clearLocal = true;

                if(
                    currentMapData &&
                    currentCharacterLog &&
                    currentCharacterLog.system
                ){
                    let currentSystemData = currentMapData.data.systems.filter(function (system) {
                        return system.systemId === currentCharacterLog.system.id;
                    });

                    if(currentSystemData.length){
                        // current user system is on this map
                        currentSystemData = currentSystemData[0];

                        // check for active users "nearby" (x jumps radius)
                        let nearBySystemData = Util.getNearBySystemData(currentSystemData, currentMapData, MapUtil.config.defaultLocalJumpRadius);
                        let nearByCharacterData = Util.getNearByCharacterData(nearBySystemData, userData.data.systems);

                        // update "local" table in overlay
                        mapOverlay.updateLocalTable(currentSystemData, nearByCharacterData);
                        clearLocal = false;
                    }
                }

                if(clearLocal){
                    mapOverlay.clearLocalTable();
                }
            }
        });
    };

    /**
     * get system data out of its object
     * @param info
     * @returns {*}
     */
    $.fn.getSystemInfo = function(info){
        let systemInfo = [];

        for(let i = 0; i < info.length; i++){
            switch(info[i]){
                case 'alias':
                    // get current system alias
                    let systemHeadNameElement = $(this).find('.' + config.systemHeadNameClass);
                    let alias = '';
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
     * updates all systems on map with current user Data (all users on this map)
     * update the Data of the user that is currently viewing the map (if available)
     * @param userData
     * @returns {boolean}
     */
    $.fn.updateUserData = function(userData){
        let returnStatus = true;

        // get new map instance or load existing
        let map = getMapInstance(userData.config.id);

        let mapElement = map.getContainer();

        // container must exist! otherwise systems can not be updated
        if(mapElement !== undefined){

            mapElement = $(mapElement);

            // get current character log data
            let characterLogExists = false;
            let currentCharacterLog = Util.getCurrentCharacterLog();

            // check if map is frozen
            if(mapElement.data('frozen') === true){
                return returnStatus;
            }

            // data for header update
            let headerUpdateData = {
                mapId: userData.config.id,
                userCountInside: 0,                 // active user on a map
                userCountOutside: 0,                // active user NOT on map
                userCountInactive: 0                // inactive users (no location)
            };

            if(
                currentCharacterLog &&
                currentCharacterLog.system
            ){
                characterLogExists = true;
                headerUpdateData.currentSystemName = currentCharacterLog.system.name;
            }

            // check if current user was found on the map
            let currentUserOnMap = false;

            // get all systems
            let systems = mapElement.find('.' + config.systemClass);

            for(let i = 0; i < systems.length; i++){
                // get user Data for System

                let system = $( systems[i] );

                let systemId = $(system).data('systemId');

                let tempUserData = null;

                // check if user is currently in "this" system
                let currentUserIsHere = false;

                let j = userData.data.systems.length;

                // search backwards to avoid decrement the counter after splice()
                while (j--) {
                    let systemData = userData.data.systems[j];

                    // check if any user is in this system
                    if (systemId === systemData.id) {
                        tempUserData = systemData;

                        // add  "user count" to "total map user count"
                        headerUpdateData.userCountInside += tempUserData.user.length;

                        // remove system from "search" array -> speed up loop
                        userData.data.systems.splice(j, 1);
                    }
                }

                // the current user can only be in a single system ----------------------------------------------------
                if(
                    characterLogExists &&
                    currentCharacterLog.system.id === systemId
                ){
                    if( !currentUserOnMap ){
                        currentUserIsHere = true;
                        currentUserOnMap = true;

                        // set current location data for header update
                        headerUpdateData.currentSystemId =  $(system).data('id');
                        headerUpdateData.currentSystemName = currentCharacterLog.system.name;
                    }
                }

                system.updateSystemUserData(map, tempUserData, currentUserIsHere);
            }

            // users who are not in any map system --------------------------------------------------------------------
            for(let i = 0; i < userData.data.systems.length; i++){
                // users without location are grouped in systemId: 0
                if(userData.data.systems[i].id){
                    headerUpdateData.userCountOutside += userData.data.systems[i].user.length;
                }else{
                    headerUpdateData.userCountInactive += userData.data.systems[i].user.length;
                }
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
        let mapElement = $(this);
        let map = getMapInstance( mapElement.data('id') );
        let mapData = {};

        // check if there is an active map counter that prevents collecting map data (locked map)
        let interval = mapElement.getMapOverlayInterval();

        if(
            ! interval ||
            options.forceData === true
        ){

            // map config ---------------------------------------------------------------------------------------------
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

            // map data -----------------------------------------------------------------------------------------------
            let data = {};

            // systems data -------------------------------------------------------------------------------------------
            let systemsData = [];
            let systems = mapElement.getSystems();

            for(let i = 0; i < systems.length; i++){
                let tempSystem = $(systems[i]);

                // check if system data should be added
                let addSystemData = true;
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

            // connections --------------------------------------------------------------------------------------------
            let connections = map.getAllConnections();
            let connectionsFormatted = [];

            // format connections
            for(let j = 0; j < connections.length; j++){
                let tempConnection = connections[j];
                let connectionData = MapUtil.getDataByConnection(tempConnection);

                // only add valid connections (id is required, this is not the case if connection is new)
                if(connectionData.id > 0){
                    // check if connection data should be added
                    let addConnectionData = true;
                    if(
                        options.getAll !== true &&
                        options.checkForChange === true &&
                        !$(tempConnection).hasChanged()
                    ){
                        addConnectionData = false;
                    }


                    if(addConnectionData){
                        connectionsFormatted.push( connectionData );
                    }

                    // add to cache
                    updateConnectionCache(mapData.config.id, tempConnection);
                }
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
        let system = $(this);

        let systemData = {};
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

        // position ---------------------------------------------------------------------------------------------------
        let positionData = {};
        let currentX = system.css('left');
        let currentY = system.css('top');

        // remove 'px'
        positionData.x = parseInt( currentX.substring(0, currentX.length - 2) );
        positionData.y = parseInt( currentY.substring(0, currentY.length - 2) );

        systemData.position = positionData;

        return systemData;
    };

    /**
     * init map options
     * @param mapConfig
     * @param options
     * @returns {Promise<any>}
     */
    let initMapOptions = (mapConfig, options) => {

        /**
         * init map options promise
         * @param resolve
         * @param reject
         */
        let initMapOptionsExecutor = (resolve, reject) => {
            let payload = {
                action: 'initMapOptions',
                data: {
                    mapConfig: mapConfig
                }
            };

            if(options.showAnimation){
                /**
                 * callback after visualizeMap is done
                 * @param mapName
                 * @param mapContainer
                 */
                let switchTabCallback = (mapContainer, mapConfig) => {
                    Util.showNotify({title: 'Map initialized', text: mapConfig.name  + ' - loaded', type: 'success'});

                    let mapWrapper = mapContainer.parents('.' + config.mapWrapperClass);

                    // auto scroll map to previous position -----------------------------------------------------------
                    let promiseStore = MapUtil.getLocaleData('map', mapContainer.data('id') );
                    promiseStore.then(data => {
                        // This code runs once the value has been loaded from  offline storage
                        if(data && data.scrollOffset){
                            mapWrapper.scrollToPosition([data.scrollOffset.y, data.scrollOffset.x]);
                        }
                    });

                    // update main menu options based on the active map -----------------------------------------------
                    $(document).trigger('pf:updateMenuOptions', {
                        mapConfig: mapConfig
                    });

                    // init magnetizer --------------------------------------------------------------------------------
                    mapContainer.triggerMenuEvent('MapOption', {
                        option: 'mapMagnetizer',
                        toggle: false
                    });

                    // init grid snap ---------------------------------------------------------------------------------
                    mapContainer.triggerMenuEvent('MapOption', {
                        option: 'mapSnapToGrid',
                        toggle: false
                    });

                    // init endpoint overlay --------------------------------------------------------------------------
                    mapContainer.triggerMenuEvent('MapOption', {
                        option: 'mapEndpoint',
                        toggle: false
                    });
                };

                // show nice visualization effect ---------------------------------------------------------------------
                let mapContainer = $(mapConfig.map.getContainer());
                mapContainer.visualizeMap('show', function(){
                    switchTabCallback(mapContainer, mapConfig.config);
                });
            }

            resolve(payload);
        };

        return new Promise(initMapOptionsExecutor);
    };

    /**
     * load OR updates system map
     * @param tabContentElement  parent element where the map will be loaded
     * @param mapConfig
     * @param options
     * @returns {Promise<any>}
     */
    let loadMap = (tabContentElement, mapConfig, options) => {

        /**
         * load map promise
         * @param resolve
         * @param reject
         */
        let loadMapExecutor = (resolve, reject) => {
            // add context menus to dom (if not already
            initMapContextMenu();
            initConnectionContextMenu();
            initSystemContextMenu();

            // init jsPlumb
            jsPlumb.ready(function(){
                // get new map instance or load existing
                mapConfig.map = getMapInstance(mapConfig.config.id);

                if(mapConfig.map.getContainer() === undefined){
                    // map not loaded -> create & update
                    newMapElement(tabContentElement, mapConfig)
                        .then(payload => updateMap(payload.data.mapConfig))
                        .then(payload => resolve(payload));
                }else{
                    // map exists -> update
                    updateMap(mapConfig)
                        .then(payload => resolve(payload));
                }
            });
        };

        return new Promise(loadMapExecutor)
            .then(payload => initMapOptions(payload.data.mapConfig, options));
    };

    /**
     * init scrollbar for Map element
     */
    $.fn.initMapScrollbar = function(){
        // get Map Scrollbar
        let mapTabContentElement = $(this);
        let mapWrapperElement = mapTabContentElement.find('.' + config.mapWrapperClass);
        let mapElement = mapTabContentElement.find('.' + config.mapClass);
        let mapId = mapElement.data('id');

        mapWrapperElement.initCustomScrollbar({
            callbacks: {
                onScroll: function(){
                    // scroll complete
                    // update scroll position for drag-frame-selection
                    mapElement.attr('data-scroll-left', this.mcs.left);
                    mapElement.attr('data-scroll-top', this.mcs.top);

                    // store new map scrollOffset -> localDB
                    MapUtil.storeLocalData('map', mapId, 'scrollOffset', {
                        x: Math.abs(this.mcs.left),
                        y: Math.abs(this.mcs.top)
                    });
                },
                onScrollStart: function(){
                    // hide all open xEditable fields
                    $(this).find('.editable').editable('hide');

                    // hide all system head tooltips
                    $(this).find('.' + config.systemHeadClass + ' .fa').tooltip('hide');
                }
            }
        });

        // ------------------------------------------------------------------------------------------------------------
        // add map overlays after scrollbar is initialized
        // because of its absolute position
        mapWrapperElement.initMapOverlays();

        mapWrapperElement.initLocalOverlay(mapId);
    };

    return {
        getMapInstance: getMapInstance,
        loadMap: loadMap,
        showNewSystemDialog: showNewSystemDialog
    };

});