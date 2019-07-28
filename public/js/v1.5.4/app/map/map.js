/**
 * Main map functionality
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/key',
    'bootbox',
    'app/map/util',
    'app/map/contextmenu',
    'app/map/overlay/overlay',
    'app/map/overlay/util',
    'app/map/system',
    'app/map/layout',
    'app/map/magnetizing',
    'app/map/scrollbar',
    'dragToSelect',
    'app/map/local'
], ($, Init, Util, Key, bootbox, MapUtil, MapContextMenu, MapOverlay, MapOverlayUtil, System, Layout, Magnetizer, Scrollbar) => {

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
        systemHeadCounterClass: 'pf-system-head-counter',               // class for system user counter
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

        // system security classes
        systemSec: 'pf-system-sec'
    };

    // active connections per map (cache object)
    let connectionCache = {};

    // mapIds that receive updates while they are "locked" (active timer)
    // -> those maps queue their updates until "pf:unlocked" event
    let mapUpdateQueue = [];


    // map menu options
    let mapOptions = {
        mapMagnetizer: {
            buttonId: Util.config.menuButtonMagnetizerId,
            description: 'Magnetizer',
            onEnable: Magnetizer.initMagnetizer,
            onDisable: Magnetizer.destroyMagnetizer
        },
        mapSnapToGrid : {
            buttonId: Util.config.menuButtonGridId,
            description: 'Grid snapping',
            class: 'mapGridClass'
        },
        mapSignatureOverlays : {
            buttonId: Util.config.menuButtonEndpointId,
            description: 'Endpoint overlay',
            onEnable: MapOverlay.showInfoSignatureOverlays,
            onDisable: MapOverlay.hideInfoSignatureOverlays,
        },
        mapCompact : {
            buttonId: Util.config.menuButtonCompactId,
            description: 'Compact system layout',
            class: 'mapCompactClass'
        }
    };

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
    let globalMapConfig = {
        source: {
            filter:  filterSystemHeadEvent,
            //isSource:true,
            isTarget: true,                         // add target Endpoint to each system (e.g. for drag&drop)
            allowLoopback: false,                   // loopBack connections are not allowed
            cssClass: config.endpointSourceClass,
            uniqueEndpoint: false,                  // each connection has its own endpoint visible
            dragOptions:{
            },
            connectionsDetachable: true,            // dragOptions are set -> allow detaching them
            maxConnections: 10,                     // due to isTarget is true, this is the max count of !out!-going connections
            // isSource:true
        },
        target: {
            filter:  filterSystemHeadEvent,
            isSource: true,
            //isTarget:true,
            //allowLoopBack: false,                 // loopBack connections are not allowed
            cssClass: config.endpointTargetClass,
            dropOptions: {
                hoverClass: config.systemActiveClass,
                activeClass: 'dragActive'
            },
            // uniqueEndpoint: false
        },
        endpointTypes: Init.endpointTypes,
        connectionTypes: Init.connectionTypes
    };

    /**
     * revalidate (repaint) all connections of el
     * -> in addition this re-calculates the Location of potential Endpoint Overlays
     * @param map
     * @param element (can also be an array)
     */
    let revalidate = (map, element) => {
        map.revalidate(element);

        // get attached connections
        let elements = (typeof element === 'object' && element.length) ? element : [element];
        for(let element of elements){
            let connectionsInfo = map.anchorManager.getConnectionsFor(element.id);
            for(let connectionInfo of connectionsInfo){
                // index 0 -> Connection, 1 -> Endpoint
                // -> we need BOTH endpoints of a connection -> index 0
                for(let endpoint of connectionInfo[0].endpoints){
                    // check if there is a Label overlay
                    let overlay = endpoint.getOverlay(MapOverlayUtil.config.endpointOverlayId);
                    if(overlay instanceof jsPlumb.Overlays.Label){
                        let labels =  overlay.getParameter('signatureLabels');
                        overlay.setLocation(MapUtil.getEndpointOverlaySignatureLocation(endpoint, labels));
                    }
                }
            }
        }
    };

    /**
     * updates a system with current information
     * @param map
     * @param system
     * @param data
     * @param currentUserIsHere boolean - if the current user is in this system
     * @param options
     */
    let updateSystemUserData = (map, system, data, currentUserIsHere = false, options = {}) => {
        let systemIdAttr = system.attr('id');
        let compactView = Util.getObjVal(options, 'compactView');

        // find countElement -> minimizedUI
        let systemCount = system.find('.' + config.systemHeadCounterClass);

        // find system body
        let systemBody = system.find('.' + config.systemBodyClass);

        // find expand arrow
        let systemHeadExpand = system.find('.' + config.systemHeadExpandClass);

        let oldCacheKey = system.data('userCacheKey');
        let oldUserCount = system.data('userCount') || 0;
        let userWasHere = Boolean(system.data('currentUser'));
        let userCounter = 0;

        system.data('currentUser', currentUserIsHere);

        // auto select system if current user is in THIS system
        if(
            currentUserIsHere &&
            !userWasHere &&
            Boolean(Util.getObjVal(Init, 'character.autoLocationSelect')) &&
            Boolean(Util.getObjVal(Util.getCurrentUserData(), 'character.selectLocation'))
        ){
            Util.triggerMenuAction(map.getContainer(), 'SelectSystem', {systemId: system.data('id'), forceSelect: false});
        }

        // add user information
        if(
            data &&
            data.user
        ){
            userCounter = data.user.length;

            // loop all active pilots and build cache-key
            let cacheArray = [];
            for(let tempUserData of data.user){
                cacheArray.push(tempUserData.id + '_' + tempUserData.log.ship.typeId);
            }

            // make sure cacheArray values are sorted for key comparison
            let collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
            cacheArray.sort(collator.compare);

            // we need to add "view mode" option to key
            // -> if view mode change detected -> key no longer valid
            let cacheKey = compactView ? 'compact' : 'default';
            cacheKey += '_' + cacheArray.join('_').hashCode();

            // check for if cacheKey has changed
            if(cacheKey !== oldCacheKey){
                // set new CacheKey
                system.data('userCacheKey', cacheKey);
                system.data('userCount', userCounter);

                // remove all content
                systemBody.empty();

                if(compactView){
                    // compact system layout-> pilot count shown in systemHead
                    systemCount.text(userCounter);

                    system.toggleSystemTooltip('destroy', {});
                    systemHeadExpand.hide();
                    system.toggleBody(false, map, {});

                    map.revalidate(systemIdAttr);
                }else{
                    systemCount.empty();

                    // show active pilots in body + pilots count tooltip
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

                    // user count changed -> change tooltip content
                    let highlight = '';
                    if(userCounter >= oldUserCount){
                        highlight = 'good';
                    }else if(userCounter < oldUserCount){
                        highlight = 'bad';
                    }

                    let tooltipOptions = {
                        systemId: systemIdAttr,
                        highlight: highlight,
                        userCount: userCounter
                    };

                    // show system head
                    systemHeadExpand.css('display', 'inline-block');

                    // show system body
                    system.toggleBody(true, map, {
                        complete: function(system){
                            // show active user tooltip
                            system.toggleSystemTooltip('show', tooltipOptions);
                            map.revalidate(systemIdAttr);
                        }
                    });
                }
            }
        }else{
            // no user data found for this system
            system.data('userCacheKey', false);
            system.data('userCount', 0);
            systemBody.empty();

            if(
                oldCacheKey &&
                oldCacheKey.length > 0
            ){
                // reset all elements
                systemCount.empty();
                system.toggleSystemTooltip('destroy', {});
                systemHeadExpand.hide();
                system.toggleBody(false, map, {});

                map.revalidate(systemIdAttr);
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
                    //re-validate element size and repaint
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
                    // re-validate element size and repaint
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

        for(let property in Init.systemStatus){
            if(Init.systemStatus.hasOwnProperty(property)){
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
                    // System users count
                    $('<span>', {
                        class: [config.systemHeadCounterClass, Util.config.popoverTriggerClass].join(' ')
                    }),
                    // System locked status
                    $('<i>', {
                        class: ['fas', 'fa-lock', 'fa-fw'].join(' ')
                    }).attr('title', 'locked'),
                    // System effect color
                    $('<i>', {
                        class: ['fas', 'fa-square', 'fa-fw', effectBasicClass, effectClass, Util.config.popoverTriggerClass].join(' ')
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
                        progress: function(system){
                            revalidate(map, system);
                        },
                        complete: function(system){
                            // show tooltip
                            $(system).toggleSystemTooltip('show', {show: true});

                            revalidate(map, system);
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
        system.data('faction', data.faction);
        system.data('planets', data.planets);
        system.data('shattered', data.shattered);
        system.data('statics', data.statics);
        system.data('updated', parseInt(data.updated.updated));
        system.data('changed', false);
        system.attr('data-mapid', parseInt(mapContainer.data('id')));

        // locked system
        if( Boolean(system.data('locked')) !== data.locked ){
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
     * system actions (e.g. for contextmenu)
     * @param action
     * @param system
     */
    let systemActions = (action, system) => {
        let mapContainer = system.closest('.' + config.mapClass);
        let map = MapUtil.getMapInstance(system.attr('data-mapid'));
        let systemData = {};

        switch(action){
            case 'add_system':
                // add a new system
                System.showNewSystemDialog(map, {sourceSystem: system}, saveSystemCallback);
                break;
            case 'lock_system':
                // lock system
                system.toggleLockSystem(true, {map: map});

                // repaint connections, -> system changed its size!
                map.repaint(system);

                MapUtil.markAsChanged(system);
                break;
            case 'set_rally':
                // toggle rally point
                if(!system.data('rallyUpdated')){
                    $.fn.showRallyPointDialog(system);
                }else{
                    // remove rally point
                    system.setSystemRally(0);
                    MapUtil.markAsChanged(system);
                }
                break;
            case 'find_route':
                // show find route dialog
                systemData = system.getSystemData();
                MapUtil.showFindRouteDialog(mapContainer, {
                    systemId: systemData.systemId,
                    name: systemData.name
                });
                break;
            case 'select_connections':
                let connections = MapUtil.searchConnectionsBySystems(map, [system], '*');
                MapUtil.showConnectionInfo(map, connections);
                break;
            case 'change_status_unknown':
            case 'change_status_friendly':
            case 'change_status_occupied':
            case 'change_status_hostile':
            case 'change_status_empty':
            case 'change_status_unscanned':
                // change system status
                MapOverlayUtil.getMapOverlay(system, 'timer').startMapUpdateCounter();

                let statusString = action.split('_');

                system.setSystemStatus(statusString[2]);

                MapUtil.markAsChanged(system);
                break;
            case 'delete_system':
                // delete this system AND delete selected systems as well
                let selectedSystems = mapContainer.getSelectedSystems();
                $.merge(selectedSystems, system);
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
    };

    /**
     * map actions (e.g. for contextmenu)
     * @param action
     * @param map
     * @param e
     */
    let mapActions = (action, map, e) => {
        let mapElement = $(map.getContainer());
        let mapId = parseInt(mapElement.data('id'));

        switch(action){
            case 'add_system':
                // add new system dialog
                let position = Layout.getEventCoordinates(e);

                let grid = [MapUtil.config.mapSnapToGridDimension, MapUtil.config.mapSnapToGridDimension];
                let positionFinder = new Layout.Position({
                    container: mapElement[0],
                    center: [position.x, position.y],
                    loops: 5,
                    defaultGapX: 10,
                    defaultGapY: 10,
                    grid: mapElement.hasClass(MapUtil.config.mapGridClass) ? grid : false,
                    debug: false
                });

                let dimensions = positionFinder.findNonOverlappingDimensions(1, 8);

                if(dimensions.length){
                    position.x = dimensions[0].left;
                    position.y = dimensions[0].top;
                }

                System.showNewSystemDialog(map, {position: position}, saveSystemCallback);
                break;
            case 'select_all':
                mapElement.selectAllSystems();
                break;
            case 'filter_wh':
            case 'filter_stargate':
            case 'filter_jumpbridge':
            case 'filter_abyssal':
                // filter (show/hide)
                let filterScope = action.split('_')[1];
                let filterScopeLabel = MapUtil.getScopeInfoForConnection( filterScope, 'label');

                let promiseStore = MapUtil.getLocaleData('map', mapId);
                promiseStore.then(data => {
                    let filterScopes = [];
                    if(data && data.filterScopes){
                        filterScopes = data.filterScopes;
                    }
                    // add or remove this scope from filter
                    let index = filterScopes.indexOf(filterScope);
                    if(index >= 0){
                        filterScopes.splice(index, 1);
                    }else{
                        filterScopes.push(filterScope);
                        // "all filters active" == "no filter"
                        if(filterScopes.length === Object.keys(Init.connectionScopes).length){
                            filterScopes = [];
                        }
                    }

                    // store filterScopes in IndexDB
                    MapUtil.storeLocalData('map', mapId, 'filterScopes', filterScopes);
                    MapUtil.filterMapByScopes(map, filterScopes);

                    Util.showNotify({title: 'Scope filter changed', text: filterScopeLabel, type: 'success'});
                });
                break;
            case 'delete_systems':
                // delete all selected systems with its connections
                let selectedSystems = mapElement.getSelectedSystems();
                $.fn.showDeleteSystemDialog(map, selectedSystems);
                break;
            case 'map_edit':
                // open map edit dialog tab
                Util.triggerMenuAction(document, 'ShowMapSettings', {tab: 'edit'});
                break;
            case 'map_info':
                // open map info dialog tab
                Util.triggerMenuAction(document, 'ShowMapInfo', {tab: 'information'});
                break;
        }
    };

    /**
     * connection actions (e.g. for contextmenu)
     * @param action
     * @param connection
     */
    let connectionActions = (action, connection) => {
        if(!connection._jsPlumb){
            Util.showNotify({title: 'Connection not found', type: 'error'});
            return;
        }

        let map = connection._jsPlumb.instance;
        let mapElement = $(map.getContainer());

        let scope = connection.scope;
        let scopeName = MapUtil.getScopeInfoForConnection(scope, 'label');

        switch(action){
            case 'delete_connection':
                // delete a single connection
                bootbox.confirm('Is this connection really gone?', result => {
                    if(result){
                        MapUtil.deleteConnections([connection]);
                    }
                });
                break;
            case 'preserve_mass':   // set "preserve mass
            case 'wh_eol':          // set "end of life"
                MapOverlayUtil.getMapOverlay(mapElement, 'timer').startMapUpdateCounter();
                MapUtil.toggleConnectionType(connection, action);
                MapUtil.markAsChanged(connection);
                break;
            case 'status_fresh':
            case 'status_reduced':
            case 'status_critical':
                let newStatus = action.split('_')[1];
                MapOverlayUtil.getMapOverlay(mapElement, 'timer').startMapUpdateCounter();
                MapUtil.setConnectionMassStatusType(connection, 'wh_' + newStatus);
                MapUtil.markAsChanged(connection);
                break;
            case 'wh_jump_mass_s':
            case 'wh_jump_mass_m':
            case 'wh_jump_mass_l':
            case 'wh_jump_mass_xl':
                MapOverlayUtil.getMapOverlay(mapElement, 'timer').startMapUpdateCounter();
                MapUtil.setConnectionJumpMassType(connection, action);
                MapUtil.markAsChanged(connection);
                break;
            case 'scope_wh':
            case 'scope_stargate':
            case 'scope_jumpbridge':
                let newScope = action.split('_')[1];
                let newScopeName =  MapUtil.getScopeInfoForConnection( newScope, 'label');

                bootbox.confirm('Change scope from ' + scopeName + ' to ' + newScopeName + '?', result => {
                    if(result){
                        setConnectionScope(connection, newScope);

                        MapOverlayUtil.getMapOverlay(mapElement, 'timer').startMapUpdateCounter();

                        Util.showNotify({title: 'Connection scope changed', text: 'New scope: ' + newScopeName, type: 'success'});

                        MapUtil.markAsChanged(connection);
                    }
                });
                break;
        }
    };

    /**
     * endpoint actions (e.g. for contextmenu)
     * @param action
     * @param endpoint
     */
    let endpointActions = (action, endpoint) => {
        let map = endpoint._jsPlumb.instance;
        let mapElement = $(map.getContainer());

        switch(action){
            case 'bubble':
                MapOverlayUtil.getMapOverlay(mapElement, 'timer').startMapUpdateCounter();
                endpoint.toggleType(action);

                for(let connection of endpoint.connections){
                    MapUtil.markAsChanged(connection);
                }
                break;
        }
    };

    /**
     * click event handler for a Connection
     * @param connection
     * @param e
     */
    let connectionClickHandler = (connection, e) => {
        if(e.which === 1){
            let map = connection._jsPlumb.instance;
            if(e.ctrlKey === true){
                // an "state_active" connection is required before adding more "selected" connections
                let activeConnections = MapUtil.getConnectionsByType(map, 'state_active');
                if(activeConnections.length >= config.maxActiveConnections && !connection.hasType('state_active')){
                    Util.showNotify({title: 'Connection select limit', text: 'You can´t select more connections', type: 'warning'});
                }else{
                    if(activeConnections.length > 0){
                        MapUtil.toggleConnectionActive(map, [connection]);
                    }else{
                        MapUtil.showConnectionInfo(map, [connection]);
                    }
                }
            }else{
                MapUtil.showConnectionInfo(map, [connection]);
            }
        }
    };

    /**
     * set/change connection scope
     * @param connection
     * @param scope
     */
    let setConnectionScope = (connection, scope) => {
        let currentConnector = connection.getConnector();
        let newConnector = MapUtil.getScopeInfoForConnection(scope, 'connectorDefinition');

        if(currentConnector.type !== newConnector[0]){
            // connector has changed
            connection.setConnector(newConnector);

            let map = connection._jsPlumb.instance;
            let oldScope = connection.scope;
            let oldTypes = MapUtil.filterDefaultTypes(connection.getType());
            let newTypes = [MapUtil.getDefaultConnectionTypeByScope(scope)];
            let removeTypes = oldTypes.intersect(MapUtil.filterDefaultTypes(Object.keys(map._connectionTypes)).diff(newTypes));

            // remove all connection types that except some persistent types e.g. "state_process"
            MapUtil.removeConnectionTypes(connection, removeTypes);

            // set new new connection type for newScope
            MapUtil.addConnectionTypes(connection, newTypes);

            // change scope
            connection.scope = scope;

            console.info(
                'connection "scope" changed for %O. Scope %o → %o, Types %o → %o',
                connection, oldScope, scope, oldTypes, newTypes
            );
        }
    };

    /**
     * connect two systems
     * @param map
     * @param connectionData
     * @returns new connection
     */
    let drawConnection = (map, connectionData) => {
        let mapContainer = $(map.getContainer());
        let mapId = mapContainer.data('id');
        let connectionId = connectionData.id || 0;
        let connection;
        let sourceSystem = $('#' + MapUtil.getSystemId(mapId, connectionData.source));
        let targetSystem = $('#' + MapUtil.getSystemId(mapId, connectionData.target));

        // check if both systems exists
        // (If not -> something went wrong e.g. DB-Foreign keys for "ON DELETE",...)
        if(
            sourceSystem.length &&
            targetSystem.length
        ){
            connection = map.connect({
                source: sourceSystem[0],
                target: targetSystem[0],
                scope: connectionData.scope || map.Defaults.Scope,
                //type:  (connectionData.type || MapUtil.getDefaultConnectionTypeByScope(map.Defaults.Scope)).join(' ')
                /* experimental set "static" connection parameters in initial load
                parameters: {
                    connectionId:   connectionId,
                    updated:        connectionData.updated,
                    created:        connectionData.created,
                    eolUpdated:     connectionData.eolUpdated
                }*/
                /* experimental (straight connections)
                 anchors: [
                 [ "Perimeter", { shape: 'Rectangle' }],
                 [ "Perimeter", { shape: 'Rectangle' }]
                 ]
                 */
            });

            // check if connection is valid (e.g. source/target exist
            if(connection instanceof jsPlumb.Connection){
                connection.addType((connectionData.type || MapUtil.getDefaultConnectionTypeByScope(map.Defaults.Scope)).join(' '));

                // set connection parameters
                // they should persist even through connection type change (e.g. wh -> stargate,..)
                // therefore they should be part of the connection not of the "Endpoint" or "connectionType"
                connection.setParameters({
                    connectionId:   connectionId,
                    updated:        connectionData.updated,
                    created:        connectionData.created,
                    eolUpdated:     connectionData.eolUpdated
                });

                if(connection.scope !== map.Defaults.Scope){
                    let newConnector = MapUtil.getScopeInfoForConnection(connection.scope, 'connectorDefinition');
                    connection.setConnector(newConnector);

                    // we need to "reapply" the types after "Connector" was changed
                    connection.reapplyTypes();
                }

                // add endpoint types ---------------------------------------------------------------------------------
                if(connectionData.endpoints){
                    for(let endpoint of connection.endpoints){
                        let label = MapUtil.getEndpointLabel(connection, endpoint);
                        if(
                            label && connectionData.endpoints[label] &&
                            Array.isArray(connectionData.endpoints[label].types)
                        ){
                            for(let type of connectionData.endpoints[label].types){
                                endpoint.addType(type);
                            }
                        }
                    }
                }
            }
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
     * @param newConnectionData
     * @returns {*}
     */
    let updateConnection = (connection, newConnectionData) => {
        // check connection is currently dragged -> skip update
        if(connection.suspendedElement){
            console.info(
                'connection update skipped for %O. SuspendedElement: %o',
                connection,
                connection.suspendedElement
            );
            return connection;
        }

        let currentConnectionData = MapUtil.getDataByConnection(connection);
        let map = connection._jsPlumb.instance;
        let mapContainer = $(map.getContainer());
        let mapId = mapContainer.data('id');

        // type "process" is not included in currentConnectionData ----------------------------------------------------
        // -> if "process" type exists, remove it
        if(connection.hasType('state_process')){
            MapUtil.removeConnectionTypes(connection, ['state_process']);
        }

        // check id, IDs should never change but must be set after initial save ---------------------------------------
        if(connection.getParameter('connectionId') !== newConnectionData.id){
            connection.setParameter('connectionId', newConnectionData.id);
        }

        // update scope -----------------------------------------------------------------------------------------------
        if(currentConnectionData.scope !== newConnectionData.scope){
            setConnectionScope(connection, newConnectionData.scope);
            // connection type has changed as well -> get new connectionData for further process
            currentConnectionData = MapUtil.getDataByConnection(connection);
        }

        // update source/target (after drag&drop) ---------------------------------------------------------------------
        if(currentConnectionData.source !== newConnectionData.source){
            map.setSource(connection, MapUtil.getSystemId(mapId, newConnectionData.source));
        }
        if(currentConnectionData.target !== newConnectionData.target){
            map.setTarget(connection, MapUtil.getSystemId(mapId, newConnectionData.target));
        }

        // update connection types ====================================================================================

        // update connection 'size' type ------------------------------------------------------------------------------
        let allMassTypes        = MapUtil.allConnectionJumpMassTypes();
        let newMassTypes        = allMassTypes.intersect(newConnectionData.type);
        let currentMassTypes    = allMassTypes.intersect(currentConnectionData.type);

        if(!newMassTypes.equalValues(currentMassTypes)){
            // connection 'size' type changed/removed
            // -> only ONE 'size' type is allowed -> take the first one
            MapUtil.setConnectionJumpMassType(connection, newMassTypes.length ? newMassTypes[0] : undefined);
            // connection type has changed as well -> get new connectionData for further process
            currentConnectionData = MapUtil.getDataByConnection(connection);
        }

        // update connection 'status' type ----------------------------------------------------------------------------
        let allStatusTypes      = MapUtil.allConnectionMassStatusTypes();
        let newStatusTypes      = allStatusTypes.intersect(newConnectionData.type);
        let currentStatusTypes  = allStatusTypes.intersect(currentConnectionData.type);

        if(!newStatusTypes.equalValues(currentStatusTypes)){
            // connection 'status' type changed/removed
            // -> only ONE 'status' type is allowed -> take the first one
            MapUtil.setConnectionMassStatusType(connection, newStatusTypes.length ? newStatusTypes[0] : undefined);
            // connection type has changed as well -> get new connectionData for further process
            currentConnectionData = MapUtil.getDataByConnection(connection);
        }

        // check for unhandled connection type changes ----------------------------------------------------------------
        let allToggleTypes = ['wh_eol', 'preserve_mass'];
        let newTypes = allToggleTypes.intersect(newConnectionData.type.diff(currentConnectionData.type));
        let oldTypes = allToggleTypes.intersect(currentConnectionData.type.diff(newConnectionData.type));

        MapUtil.addConnectionTypes(connection, newTypes);
        MapUtil.removeConnectionTypes(connection, oldTypes);

        // update endpoints ===========================================================================================
        // important: In case source or target changed (drag&drop) (see above lines..)
        // -> NEW endpoints are created (default Endpoint properties from makeSource()/makeTarget() call are used
        // -> connectionData.endpoints might no longer be valid -> get fresh endpointData
        let endpointData = MapUtil.getEndpointsDataByConnection(connection);

        for(let endpoint of connection.endpoints){
            let label = MapUtil.getEndpointLabel(connection, endpoint);
            let endpointTypes = Util.getObjVal(endpointData, [label, 'types'].join('.')) || [];
            let newEndpointTypes = Util.getObjVal(newConnectionData, ['endpoints', label, 'types'].join('.')) || [];

            let addEndpointTypes = newEndpointTypes.diff(endpointTypes);
            let removeEndpointTypes = endpointTypes.diff(newEndpointTypes);

            for(let type of addEndpointTypes){
                endpoint.addType(type);
            }

            for(let type of removeEndpointTypes){
                endpoint.removeType(type);
            }
        }

        // set update date (important for update check) ===============================================================
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
            }else if(entry.constructor.name === 'ResizeObserverEntry'){
                width = entry.target.style.width;
                height = entry.target.style.height;
            }

            width = parseInt(width.substring(0, width.length - 2)) || 0;
            height = parseInt(height.substring(0, height.length - 2)) || 0;

            let promiseStore = MapUtil.getLocaleData('map', mapConfig.config.id );
            promiseStore.then((data) => {
                let storeData = true;

                if(
                    data && data.style &&
                    data.style.width === width &&
                    data.style.height === height
                ){
                    // no style changes
                    storeData = false;
                }

                if(storeData){
                    MapUtil.storeLocalData('map', mapConfig.config.id, 'style', {
                        width: width,
                        height: height
                    });
                }
            });
        };

        // map resize observer ----------------------------------------------------------------------------------------
        if(window.ResizeObserver){
            // ResizeObserver() supported
            let resizeTimer;
            let wrapperResize = new ResizeObserver(entries => { // jshint ignore:line
                let checkMapSize = (entry) => {
                    return setTimeout(saveMapSize, 100, entry);
                };
                for(let entry of entries){
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
                mapConfig.map.setContainer(mapContainer);

                // init custom scrollbars and add overlay
                parentElement.initMapScrollbar();

                // set map observer
                setMapObserver(mapConfig.map);

                // set shortcuts
                mapWrapper.setMapShortcuts();

                // show static overlay actions
                let mapOverlay = MapOverlayUtil.getMapOverlay(mapContainer, 'info');
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
    let updateMap = mapConfig => {

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
                let mapData = getMapDataForSync(mapContainer, [], true);


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
                                if(currentSystemData[k].updated.updated < systemData.updated.updated){
                                    // system changed -> update
                                    mapContainer.getSystem(mapConfig.map, systemData);
                                }

                                addNewSystem = false;
                                break;
                            }
                        }

                        if(addNewSystem === true){
                            drawSystem(mapConfig.map, systemData);
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
                            let deleteSystem = $('#' + MapUtil.getSystemId(mapContainer.data('id'), currentSystemData[a].id));

                            // system not found -> delete system
                            System.removeSystems(mapConfig.map, deleteSystem);
                        }
                    }

                    // update connections =============================================================================

                    // jsPlumb batch() is used, otherwise there are some "strange" visual bugs
                    // when switching maps (Endpoints are not displayed correctly)
                    mapConfig.map.batch(function(){

                        for(let j = 0; j < mapConfig.data.connections.length; j++){
                            let connectionData = mapConfig.data.connections[j];

                            // add connection
                            let addNewConnection= true;

                            for(let c = 0; c < currentConnectionData.length; c++){
                                if(currentConnectionData[c].id === connectionData.id){
                                    // connection already exists -> check for updates
                                    if(currentConnectionData[c].updated < connectionData.updated){
                                        // connection changed -> update
                                        updateConnection(currentConnectionData[c].connection, connectionData);
                                    }

                                    addNewConnection = false;
                                    break;
                                }else if(
                                    currentConnectionData[c].id === 0 &&
                                    currentConnectionData[c].source === connectionData.source &&
                                    currentConnectionData[c].target === connectionData.target
                                ){
                                    // if ids don´t match -> check for unsaved connection
                                    updateConnection(currentConnectionData[c].connection, connectionData);

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
                            // skip connections with id = 0 -> they might get updated before
                            if(currentConnectionData[d].id === 0){
                                continue;
                            }

                            let deleteThisConnection = true;

                            for(let e = 0; e < mapConfig.data.connections.length;e++){
                                let deleteConnectionData = mapConfig.data.connections[e];

                                if(deleteConnectionData.id === currentConnectionData[d].id){
                                    deleteThisConnection = false;
                                    break;
                                }
                            }

                            if(deleteThisConnection === true){
                                // connection not found -> delete connection
                                let deleteConnection = currentConnectionData[d].connection;

                                if(deleteConnection){
                                    // check if "source" and "target" still exist before remove
                                    // this is NOT the case if the system was removed previous
                                    if(
                                        deleteConnection.source &&
                                        deleteConnection.target
                                    ){
                                        mapConfig.map.deleteConnection(deleteConnection, {fireEvent: false});
                                    }
                                }
                            }
                        }
                    });

                    // update local connection cache
                    updateConnectionsCache(mapConfig.map);
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

        /**
         * apply current active scope filter
         * @param payload
         * @returns {Promise<any>}
         */
        let filterMapByScopes = payload => {
            let filterMapByScopesExecutor = resolve => {
                let promiseStore = MapUtil.getLocaleData('map', payload.data.mapConfig.config.id);
                promiseStore.then(dataStore => {
                    let scopes = [];
                    if(dataStore && dataStore.filterScopes){
                        scopes = dataStore.filterScopes;
                    }

                    MapUtil.filterMapByScopes(payload.data.mapConfig.map, scopes);
                    resolve(payload);
                });
            };

            return new Promise(filterMapByScopesExecutor);
        };

        /**
         * show signature overlays
         * @param payload
         * @returns {Promise<any>}
         */
        let showInfoSignatureOverlays = payload => {
            let showInfoSignatureOverlaysExecutor = resolve => {
                let promiseStore = MapUtil.getLocaleData('map', payload.data.mapConfig.config.id);
                promiseStore.then(dataStore => {
                    if(dataStore && dataStore.mapSignatureOverlays){
                        MapOverlay.showInfoSignatureOverlays($(payload.data.mapConfig.map.getContainer()));
                    }

                    resolve(payload);
                });
            };

            return new Promise(showInfoSignatureOverlaysExecutor);
        };

        return new Promise(updateMapExecutor)
            .then(showInfoSignatureOverlays)
            .then(filterMapByScopes);
    };

    /**
     * update local connections cache (cache all connections from a map)
     * @param map
     */
    let updateConnectionsCache = map => {
        let connections = map.getAllConnections();
        let mapContainer = $(map.getContainer());
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
    let updateConnectionCache = (mapId, connection) => {
        if(
            mapId > 0 &&
            connection
        ){
            let connectionId = parseInt(connection.getParameter('connectionId'));
            if(connectionId > 0){
                connectionCache[mapId][connectionId] = connection;
            }
        }else{
            console.warn('updateConnectionCache', 'missing data');
        }
    };

    /**
     * get a connection object from "cache"
     * -> this requires the "connectionCache" cache is up2date!
     * @param mapId
     * @param connectionId
     * @returns {*|null}
     */
    $.fn.getConnectionById = function(mapId, connectionId){
        return Util.getObjVal(connectionCache, [mapId, connectionId].join('.')) || null;
    };

    /**
     * mark a system as source
     * @param map
     * @param system
     */
    let makeSource = (map, system) => {
        if(!map.isSource(system)){
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
    let makeTarget = (map, system) => {
        if(!map.isTarget(system)){
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
    let isValidSystem = systemData => {
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

            // register system to "magnetizer"
            Magnetizer.addElement(systemData.mapId, newSystem[0]);

            // connect new system (if connection data is given)
            if(connectedSystem){

                // hint: "scope + type" might be changed automatically when it gets saved
                // -> based on jump distance,..
                let connectionData = {
                    source: $(connectedSystem).data('id'),
                    target: newSystem.data('id'),
                    scope: map.Defaults.Scope,
                    type: [MapUtil.getDefaultConnectionTypeByScope(map.Defaults.Scope)]
                };
                let connection = drawConnection(map, connectionData);

                // store connection
                saveConnection(connection);
            }
        }
    };

    /**
     * make a system name/alias editable by x-editable
     * @param system
     */
    let makeEditable = system => {
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

        headElement.on('save', function(e, params){
            // system alias changed -> mark system as updated
            MapUtil.markAsChanged(system);
        });

        headElement.on('shown', function(e, editable){
            // hide tooltip when xEditable is visible
            system.toggleSystemTooltip('hide', {});

            let inputElement =  editable.input.$input.select();

            // "fake" timeout until dom rendered
            setTimeout(function(input){
                // pre-select value
                input.select();
            }, 0, inputElement);
        });

        headElement.on('hidden', function(e, editable){
            // show tooltip "again" on xEditable hidden
            system.toggleSystemTooltip('show', {show: true});

            // if system with changed (e.g. long alias) -> revalidate system
            let map  = MapUtil.getMapInstance(system.attr('data-mapid'));
            revalidate(map, system);
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
    let saveConnection = connection => {
        if(connection instanceof jsPlumb.Connection){
            connection.addType('state_process');

            let map = connection._jsPlumb.instance;
            let mapContainer = $(map.getContainer());
            let mapId = mapContainer.data('id');

            let connectionData = MapUtil.getDataByConnection(connection);
            connectionData.mapId = mapId;

            Util.request('PUT', 'connection', [], connectionData, {
                connection: connection,
                map: map,
                mapId: mapId,
                oldConnectionData: connectionData
            }).then(
                payload => {
                    let newConnectionData = payload.data;

                    if(!$.isEmptyObject(newConnectionData)){
                        // update connection data e.g. "scope" has auto detected
                        connection = updateConnection(payload.context.connection, newConnectionData);

                        // new/updated connection should be cached immediately!
                        updateConnectionCache(payload.context.mapId, connection);

                        // connection scope
                        let scope = MapUtil.getScopeInfoForConnection(newConnectionData.scope, 'label');

                        let title = 'New connection established';
                        if(payload.context.oldConnectionData.id > 0){
                            title = 'Connection switched';
                        }

                        Util.showNotify({title: title, text: 'Scope: ' + scope, type: 'success'});
                    }else{
                        // some save errors
                        payload.context.map.deleteConnection(payload.context.connection, {fireEvent: false});
                    }
                },
                payload => {
                    // remove this connection from map
                    payload.context.map.deleteConnection(payload.context.connection, {fireEvent: false});
                    Util.handleAjaxErrorResponse(payload);
                }
            );
        }
    };

    /**
     * get context menu config for a map component (e.g. system, connection,..)
     * @param component
     * @returns {Promise<any>}
     */
    let getContextMenuConfig = component => {
        if(component instanceof $ && component.hasClass(config.systemClass)){
            return getSystemContextMenuConfig(component);
        }else if(component instanceof window.jsPlumbInstance){
            return getMapContextMenuConfig(component);
        }else if(component instanceof jsPlumb.Connection){
            return getConnectionContextMenuConfig(component);
        }else if(component instanceof jsPlumb.Endpoint){
            return getEndpointContextMenuConfig(component);
        }
    };

    /**
     * get context menu config for system
     * @param system
     * @returns {Promise<any>}
     */
    let getSystemContextMenuConfig = system => {
        let executor = resolve => {
            let options = MapContextMenu.defaultMenuOptionConfig();
            options.id = MapContextMenu.config.systemContextMenuId;
            options.selectCallback = systemActions;

            let mapContainer = system.closest('.' + config.mapClass);

            // hidden menu actions
            if(system.data('locked') === true){
                options.hidden.push('delete_system');
            }

            if( !mapContainer.find('.' + config.systemActiveClass).length){
                options.hidden.push('find_route');
            }

            // active menu actions
            if(system.data('locked') === true){
                options.active.push('lock_system');
            }
            if(system.data('rallyUpdated') > 0){
                options.active.push('set_rally');
            }

            // disabled menu actions
            if(system.hasClass(config.systemActiveClass)){
                options.disabled.push('find_route');
            }

            resolve(options);
        };

        return new Promise(executor);
    };

    /**
     * get context menu config for map
     * @param map
     * @returns {Promise<any>}
     */
    let getMapContextMenuConfig = map => {
        let executor = resolve => {
            let options = MapContextMenu.defaultMenuOptionConfig();
            options.id = MapContextMenu.config.mapContextMenuId;
            options.selectCallback = mapActions;

            let mapContainer = $(map.getContainer());

            // active menu actions
            let promiseStore = MapUtil.getLocaleData('map', mapContainer.data('id'));
            promiseStore.then(dataStore => {
                if(dataStore && dataStore.filterScopes){
                    options.active = dataStore.filterScopes.map(scope => 'filter_' + scope);
                }
                resolve(options);
            });
        };

        return new Promise(executor);
    };

    /**
     * get context menu config for connection
     * @param connection
     * @returns {Promise<any>}
     */
    let getConnectionContextMenuConfig = connection => {
        let executor = resolve => {
            let options = MapContextMenu.defaultMenuOptionConfig();
            options.id = MapContextMenu.config.connectionContextMenuId;
            options.selectCallback = connectionActions;

            let scope = connection.scope;

            // hidden menu actions
            if(scope === 'abyssal'){
                options.hidden.push('wh_eol');
                options.hidden.push('preserve_mass');
                options.hidden.push('change_status');
                options.hidden.push('wh_jump_mass_change');

                options.hidden.push('change_scope');
                options.hidden.push('separator');
            }else if(scope === 'stargate'){
                options.hidden.push('wh_eol');
                options.hidden.push('preserve_mass');
                options.hidden.push('change_status');
                options.hidden.push('wh_jump_mass_change');

                options.hidden.push('scope_stargate');
            }else if(scope === 'jumpbridge'){
                options.hidden.push('wh_eol');
                options.hidden.push('preserve_mass');
                options.hidden.push('change_status');
                options.hidden.push('wh_jump_mass_change');

                options.hidden.push('scope_jumpbridge');
            }else if(scope === 'wh'){
                options.hidden.push('scope_wh');
            }

            // active menu actions
            if(connection.hasType('wh_eol') === true){
                options.active.push('wh_eol');
            }
            if(connection.hasType('preserve_mass') === true){
                options.active.push('preserve_mass');
            }
            for(let sizeName of Object.keys(Init.wormholeSizes)){
                if(connection.hasType(sizeName)){
                    options.active.push(sizeName);
                }
            }
            if(connection.hasType('wh_reduced') === true){
                options.active.push('status_reduced');
            }else if(connection.hasType('wh_critical') === true){
                options.active.push('status_critical');
            }else{
                // not reduced is default
                options.active.push('status_fresh');
            }

            // disabled menu actions
            if(connection.getParameter('sizeLocked')){
                options.disabled.push('wh_jump_mass_change');
            }

            resolve(options);
        };

        return new Promise(executor);
    };

    /**
     * get context menu config for endpoint
     * @param endpoint
     * @returns {Promise<any>}
     */
    let getEndpointContextMenuConfig = endpoint => {
        let executor = resolve => {
            let options = MapContextMenu.defaultMenuOptionConfig();
            options.id = MapContextMenu.config.endpointContextMenuId;
            options.selectCallback = endpointActions;

            // active menu actions
            if(endpoint.hasType('bubble') === true){
                options.active.push('bubble');
            }

            resolve(options);
        };

        return new Promise(executor);
    };

    /**
     * set up all actions that can be preformed on a system
     * @param map
     * @param system
     */
    let setSystemObserver = (map, system) => {
        system = $(system);

        // get map container
        let mapContainer = $(map.getContainer());
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

                mapOverlayTimer = MapOverlayUtil.getMapOverlay(dragSystem, 'timer');

                // start map update timer
                mapOverlayTimer.startMapUpdateCounter();

                // check if grid-snap is enable -> this enables napping for !CURRENT! Element
                if(mapContainer.hasClass(MapUtil.config.mapGridClass)){
                    params.drag.params.grid = grid;
                }else{
                    delete( params.drag.params.grid );
                }

                // stop "system click event" right after drop event is finished
                dragSystem.addClass('no-click');

                // drag system is not always selected
                let selectedSystems = mapContainer.getSelectedSystems().get();
                selectedSystems = selectedSystems.concat(dragSystem.get());
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
                Magnetizer.executeAtEvent(map, p.e);
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
                MapUtil.markAsChanged(dragSystem);

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
                selectedSystems = selectedSystems.concat(dragSystem.get());
                selectedSystems = $.unique( selectedSystems );

                // repaint connections (and overlays) -> just in case something fails...
                revalidate(map, selectedSystems);
            }
        });

        if(system.data('locked') === true){
            map.setDraggable(system, false);
        }

        // init system tooltips =======================================================================================
        let systemTooltipOptions = {
            toggle: 'tooltip',
            placement: 'right',
            container: 'body',
            viewport: system.id
        };
        system.find('.fas').tooltip(systemTooltipOptions);

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
            if( $(e.target).closest('.popover').length ){
                popoverClick = true;
            }

            // continue if click was *not* on a popover dialog of a system
            if(!popoverClick){
                let system = $(this);

                // check if system is locked for "click" events
                if(!system.hasClass('no-click')){
                    // left mouse button
                    if(e.which === 1){
                        if(e.ctrlKey === true){
                            // select system
                            MapUtil.toggleSystemsSelect(map, [system]);
                        }else{
                            MapUtil.showSystemInfo(map, system);
                        }
                    }
                }
            }

        };

        Util.singleDoubleClick(system, single, double);
    };

    /**
     * callback after system save
     * @param map
     * @param newSystemData
     * @param sourceSystem
     */
    let saveSystemCallback = (map, newSystemData, sourceSystem) => {
        drawSystem(map, newSystemData, sourceSystem);
    };

    /**
     * select all (selectable) systems on a mapElement
     */
    $.fn.selectAllSystems = function(){
        return this.each(function(){
            let mapElement = $(this);
            let map = getMapInstance(mapElement.data('id'));

            let allSystems =  mapElement.find('.' + config.systemClass +
                ':not(.' + config.systemSelectedClass + ')' +
                ':not(.' + MapUtil.config.systemHiddenClass + ')'
            );

            // filter non-locked systems
            allSystems = allSystems.filter(function(i, el){
                return ( $(el).data('locked') !== true );
            });

            MapUtil.toggleSystemsSelect(map, allSystems);

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

        if( system.data('locked') === true ){
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
        revalidate(map, system);

        if(!hideCounter){
            MapOverlayUtil.getMapOverlay(system, 'timer').startMapUpdateCounter();
        }
    };

    /**
     * get a new jsPlumb map instance or or get a cached one for update
     * @param mapId
     * @returns {*}
     */
    let getMapInstance = function(mapId){

        if(!MapUtil.existsMapInstance(mapId)){
            // create new instance
            jsPlumb.Defaults.LogEnabled = true;

            let newJsPlumbInstance =  jsPlumb.getInstance({
                Anchor: ['Continuous', {faces: ['top', 'right', 'bottom', 'left']}],    // single anchor (used during drag action)
                Anchors: [
                    ['Continuous', {faces: ['top', 'right', 'bottom', 'left']}],
                    ['Continuous', {faces: ['top', 'right', 'bottom', 'left']}],
                ],
                Container: null,                                                        // will be set as soon as container is connected to DOM
                PaintStyle: {
                    strokeWidth: 4,                                                     // connection width (inner)
                    stroke: '#3c3f41',                                                  // connection color (inner)
                    outlineWidth: 2,                                                    // connection width (outer)
                    outlineStroke: '#63676a',                                           // connection color (outer)
                    dashstyle: '0',                                                     // connection dashstyle (default) -> is used after connectionType got removed that has dashstyle specified
                    'stroke-linecap': 'round'                                           // connection shape
                },
                Endpoint: ['Dot', {radius: 5}],                                         // single endpoint (used during drag action)
                Endpoints: [
                    ['Dot', {radius: 5, cssClass: config.endpointSourceClass}],
                    ['Dot', {radius: 5, cssClass: config.endpointTargetClass}]
                ],
                EndpointStyle: {fill: '#3c3f41', stroke: '#63676a', strokeWidth: 2},    // single endpoint style (used during drag action)
                EndpointStyles: [
                    {fill: '#3c3f41', stroke: '#63676a', strokeWidth: 2},
                    {fill: '#3c3f41', stroke: '#63676a', strokeWidth: 2}
                ],
                Connector: ['Bezier', {curviness: 40}],                                 // default connector style (this is not used!) all connections have their own style (by scope)
                ReattachConnections: false,                                             // re-attach connection if dragged with mouse to "nowhere"
                Scope: Init.defaultMapScope,                                            // default map scope for connections
                LogEnabled: true
            });

            // register all available endpoint types
            newJsPlumbInstance.registerEndpointTypes(globalMapConfig.endpointTypes);

            // register all available connection types
            newJsPlumbInstance.registerConnectionTypes(globalMapConfig.connectionTypes);

            // ========================================================================================================
            // Event Interceptors https://community.jsplumbtoolkit.com/doc/interceptors.html
            //=========================================================================================================

            // This is called when a new or existing connection has been dropped
            // If you return false (or nothing) from this callback, the new Connection is aborted and removed from the UI.
            newJsPlumbInstance.bind('beforeDrop', function(info){
                let connection = info.connection;
                let dropEndpoint = info.dropEndpoint;
                let sourceId = info.sourceId;
                let targetId = info.targetId;

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

                // lock the target system for "click" events
                // to prevent loading system information
                let sourceSystem = $('#' + sourceId);
                let targetSystem = $('#' + targetId);
                sourceSystem.addClass('no-click');
                targetSystem.addClass('no-click');

                setTimeout(() => {
                    sourceSystem.removeClass('no-click');
                    targetSystem.removeClass('no-click');
                }, Init.timer.DBL_CLICK + 50);

                // switch connection type to "abyss" in case source OR target system belongs to "a-space"
                if(sourceSystem.data('typeId') === 3 || targetSystem.data('typeId') === 3){
                    setConnectionScope(connection, 'abyssal');
                }

                // set "default" connection status only for NEW connections
                if(!connection.suspendedElement){
                    MapUtil.addConnectionTypes(connection, [MapUtil.getDefaultConnectionTypeByScope(connection.scope)]);
                }

                // prevent multiple connections between same systems
                let connections = MapUtil.checkForConnection(newJsPlumbInstance, sourceId, targetId);
                if(connections.length > 1){
                    bootbox.confirm('Connection already exists. Do you really want to add an additional one?', result => {
                        if(!result && connection._jsPlumb){
                            // connection._jsPlumb might be "undefined" in case connection was removed in the meantime
                            connection._jsPlumb.instance.detach(connection);
                        }
                    });
                }

                // always save the new connection
                saveConnection(connection);

                return true;
            });

            // This is called when the user starts to drag an existing Connection.
            // Returning false from beforeStartDetach prevents the Connection from being dragged.
            newJsPlumbInstance.bind('beforeStartDetach', function(info){
                return true;
            });

            // This is called when the user has detached a Connection, which can happen for a number of reasons:
            // by default, jsPlumb allows users to drag Connections off of target Endpoints, but this can also result from a programmatic 'detach' call.
            newJsPlumbInstance.bind('beforeDetach', function(connection){
                return true;
            });

            // ========================================================================================================
            // Events https://community.jsplumbtoolkit.com/doc/events.html
            //=========================================================================================================

            // Notification a Connection was established.
            // Note: jsPlumb.connect causes this event to be fired, but there is of course no original event when a connection is established programmatically.
            newJsPlumbInstance.bind('connection', function(info, e){

            });

            // Notification a Connection or Endpoints was clicked.
            newJsPlumbInstance.bind('click', function(component, e){
                if(component instanceof jsPlumb.Connection){
                    connectionClickHandler(component,e);
                }
            });

            // Notification that an existing connection's source or target endpoint was dragged to some new location.
            newJsPlumbInstance.bind('connectionMoved', function(info, e){

            });

            // Notification an existing Connection is being dragged.
            // Note that when this event fires for a brand new Connection, the target of the Connection is a transient element
            // that jsPlumb is using for dragging, and will be removed from the DOM when the Connection is subsequently either established or aborted.
            newJsPlumbInstance.bind('connectionDrag', function(info, e){

            });

            // Notification a Connection was detached.
            // In the event that the Connection was new and had never been established between two Endpoints, it has a pending flag set on it.
            newJsPlumbInstance.bind('connectionDetached', function(info, e){
                // a connection is manually (drag&drop) detached! otherwise this event should not be send!
                let connection = info.connection;
                MapUtil.deleteConnections([connection]);
            });

            // Right-click on some given component. jsPlumb will report right clicks on both Connections and Endpoints.
            newJsPlumbInstance.bind('contextmenu', function(component, e){
                getContextMenuConfig(component).then(payload => {
                    let context = {
                        component: component
                    };
                    MapContextMenu.openMenu(payload, e, context);
                });

            });

            // Notification the current zoom was changed
            newJsPlumbInstance.bind('zoom', function(zoom){
                MapOverlay.updateZoomOverlay(this);

                // store new zoom level in IndexDB
                if(zoom === 1){
                    MapUtil.deleteLocalData('map', mapId, 'mapZoom');
                }else{
                    MapUtil.storeLocalData('map', mapId, 'mapZoom', zoom);
                }
            });

            // ========================================================================================================
            // Events for interactive CSS classes https://community.jsplumbtoolkit.com/doc/styling-via-css.html
            //=========================================================================================================

            // This event is responsible for dynamic CSS classes "_jsPlumb_target_hover", "_jsPlumb_drag_select"
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
     * check if there is an  focus() element found as parent of tabContentElement
     * -> or if there is any other active UI element found (e.g. dialog, xEditable, Summernote)
     * @param tabContentElement
     * @returns {*}
     */
    let systemFormsActive = (tabContentElement) => {
        let activeNode = null;
        if(tabContentElement.length){
            // tabContentElement exists ...
            tabContentElement = tabContentElement[0];

            // ... check for current active/focus() element and is not the default <body> element ...
            if(
                Util.isDomElement(document.activeElement) &&
                document.activeElement !== document.body
            ){
                let activeElementTagName = document.activeElement.tagName.toLocaleLowerCase();

                // ... check for active form elements ...
                let isFormElement = ['input', 'select', 'textarea'].includes(activeElementTagName);
                let isChildElement = tabContentElement.contains(document.activeElement);

                if(isFormElement && isChildElement){
                    activeNode = activeElementTagName;
                }else{
                    // ... check for open dialogs/xEditable elements ...
                    if(Util.isDomElement(document.querySelector('.bootbox'))){
                        activeNode = 'dialogOpen';
                    }else if(Util.isDomElement(document.querySelector('.editable-open'))){
                        activeNode = 'xEditableOpen';
                    }else{
                        // ... check for open Summernote editor
                        let summernoteElement = tabContentElement.querySelector('.' + Util.config.summernoteClass);
                        if(
                            Util.isDomElement(summernoteElement) &&
                            typeof $(summernoteElement).data().summernote === 'object'
                        ){
                            activeNode = 'SummernoteOpen';
                        }
                    }
                }
            }
        }

        return activeNode;
    };

    /**
     * set observer for a map container
     * @param map
     */
    let setMapObserver = map => {
        // get map container
        let mapContainer = $(map.getContainer());

        MapOverlay.initMapDebugOverlays(map);

        // context menu for mapContainer
        mapContainer.on('contextmenu', function(e){
            e.preventDefault();
            e.stopPropagation();

            // make sure map is clicked and NOT a connection
            if($(e.target).hasClass(config.mapClass)){
                getContextMenuConfig(map).then(payload => {
                    let context = {
                        component: map
                    };
                    MapContextMenu.openMenu(payload, e, context);
                });
            }
        });

        // context menu for systems
        mapContainer.on('contextmenu', '.' + config.systemClass, function(e){
            e.preventDefault();
            e.stopPropagation();

            let systemElement = $(e.currentTarget);
            getContextMenuConfig(systemElement).then(payload => {
                let context = {
                    component: systemElement
                };
                MapContextMenu.openMenu(payload, e, context);
            });
        });

        // init drag-frame selection
        mapContainer.dragToSelect({
            selectOnMove: true,
            selectables: '.' + config.systemClass,
            onHide: function(selectBox, deselectedSystems){
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
                Util.triggerMenuAction(document, 'Close');
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
                        easing: 'easeOut',
                        duration: 60,
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

        // system "active users" popover ------------------------------------------------------------------------------
        mapContainer.hoverIntent({
            over: function(e){
                let counterElement = $(this);
                let systemElement = counterElement.closest('.' + config.systemClass);
                let mapId = systemElement.data('mapid');
                let systemId = systemElement.data('systemId');
                let userData = Util.getCurrentMapUserData(mapId);
                let systemUserData = Util.getCharacterDataBySystemId(userData.data.systems, systemId);

                counterElement.addSystemPilotTooltip(systemUserData, {
                    trigger: 'manual',
                    placement: 'right'
                }).setPopoverSmall().popover('show');
            },
            out: function(e){
                $(this).destroyPopover();
            },
            selector: '.' + config.systemHeadCounterClass
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
        MapUtil.initWormholeInfoTooltip(
            mapContainer,
            '.' + config.systemHeadInfoClass + ' span[class^="pf-system-sec-"]',
            {placement: 'right', smaller: true}
        );

        // toggle "fullSize" Endpoint overlays for system (signature information) -------------------------------------
        mapContainer.hoverIntent({
            over: function(e){
                for(let overlayInfo of map.selectEndpoints({element: this}).getOverlay(MapOverlayUtil.config.endpointOverlayId)){
                    if(overlayInfo[0] instanceof jsPlumb.Overlays.Label){
                        overlayInfo[0].fire('toggleSize', true);
                    }
                }
            },
            out: function(e){
                for(let overlayInfo of map.selectEndpoints({element: this}).getOverlay(MapOverlayUtil.config.endpointOverlayId)){
                    if(overlayInfo[0] instanceof jsPlumb.Overlays.Label){
                        overlayInfo[0].fire('toggleSize', false);
                    }
                }
            },
            selector: '.' + config.systemClass
        });

        // catch events ===============================================================================================

        /**
         * update/toggle global map option (e.g. "grid snap", "magnetization")
         * @param mapContainer
         * @param data
         */
        let updateMapOption = (mapContainer, data) => {
            // get map menu config options
            let mapOption = mapOptions[data.option];

            let promiseStore = MapUtil.getLocaleData('map', mapContainer.data('id'));
            promiseStore.then(function(dataStore){
                let notificationText = 'disabled';
                let button = $('#' + this.mapOption.buttonId);
                let dataExists = false;

                if(
                    dataStore &&
                    dataStore[this.data.option]
                ){
                    dataExists = true;
                }

                if(dataExists === this.data.toggle){

                    // toggle button class
                    button.removeClass('active');

                    // toggle map class (e.g. for grid)
                    if(this.mapOption.class){
                        this.mapContainer.removeClass(MapUtil.config[this.mapOption.class]);
                    }

                    // call optional jQuery extension on mapContainer
                    if(this.mapOption.onDisable && !this.data.skipOnDisable){
                        this.mapOption.onDisable(this.mapContainer);
                    }

                    // show map overlay info icon
                    MapOverlayUtil.getMapOverlay(this.mapContainer, 'info').updateOverlayIcon(this.data.option, 'hide');

                    // delete map option
                    MapUtil.deleteLocalData('map', this.mapContainer.data('id'), this.data.option);
                }else{
                    // toggle button class
                    button.addClass('active');

                    // toggle map class (e.g. for grid)
                    if(this.mapOption.class){
                        this.mapContainer.addClass(MapUtil.config[this.mapOption.class]);
                    }

                    // call optional jQuery extension on mapContainer
                    if(this.mapOption.onEnable && !this.data.skipOnEnable){
                        this.mapOption.onEnable(this.mapContainer);
                    }

                    // hide map overlay info icon
                    MapOverlayUtil.getMapOverlay(this.mapContainer, 'info').updateOverlayIcon(this.data.option, 'show');

                    // store map option
                    MapUtil.storeLocalData('map', this.mapContainer.data('id'), this.data.option, 1);

                    notificationText = 'enabled';
                }

                if(this.data.toggle){
                    Util.showNotify({title: this.mapOption.description, text: notificationText, type: 'info'});
                }
            }.bind({
                data: data,
                mapOption: mapOption,
                mapContainer: mapContainer
            }));
        };

        /**
         * select system event
         * @param mapContainer
         * @param data
         */
        let selectSystem = (mapContainer, data) => {
            let systemId = MapUtil.getSystemId(mapContainer.data('id'), data.systemId);
            let system = mapContainer.find('#' + systemId);

            if(system.length === 1){
                // system found on map ...
                let select = Util.getObjVal(data, 'forceSelect') !== false;

                if(!select){
                    // ... select is NOT "forced" -> auto select system on jump
                    let activeElement = systemFormsActive(MapUtil.getTabContentElementByMapElement(system));
                    if(activeElement !== null){
                        console.info('Skip auto select systemId %i. Reason: %o', data.systemId, activeElement);
                    }else{
                        select = true;
                    }
                }

                if(select){
                    let mapWrapper = mapContainer.closest('.' + config.mapWrapperClass);
                    Scrollbar.scrollToSystem(mapWrapper, MapUtil.getSystemPosition(system));
                    // select system
                    MapUtil.showSystemInfo(map, system);
                }
            }
        };

        mapContainer.on('pf:menuAction', (e, action, data) => {
            // menuAction events can also be triggered on child nodes
            // -> if event is not handled there it bubbles up
            //    make sure event can be handled by this element
            if(e.target === e.currentTarget){
                e.stopPropagation();

                switch(action){
                    case 'MapOption':
                        // toggle global map option (e.g. "grid snap", "magnetization")
                        updateMapOption(mapContainer, data);
                        break;
                    case 'SelectSystem':
                        // select system on map (e.g. from modal links)
                        selectSystem(mapContainer, data);
                        break;
                    case 'AddSystem':
                        System.showNewSystemDialog(map, data, saveSystemCallback);
                        break;
                    default:
                        console.warn('Unknown menuAction %o event name', action);
                }
            }else{
                console.warn('Unhandled menuAction %o event name. Handled menu events should not bobble up', action);
            }
        });

        // delete system event
        // triggered from "map info" dialog scope
        mapContainer.on('pf:deleteSystems', function(e, data){
            System.deleteSystems(map, data.systems, data.callback);
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
            let mapId = Util.getObjVal(userData, 'config.id') || 0;

            if(mapId){
                let mapElement = $(this);
                let mapOverlay = MapOverlayUtil.getMapOverlay(mapElement, 'local');
                let currentMapData = Util.getCurrentMapData(mapId);
                let currentCharacterLog = Util.getCurrentCharacterLog();
                let clearLocal = true;

                if(
                    currentMapData &&
                    currentCharacterLog &&
                    currentCharacterLog.system
                ){
                    let currentSystemData = currentMapData.data.systems.filter(system => {
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
                    if(systemHeadNameElement.hasClass('editable')){
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
     * @param mapElement
     * @param userData
     * @returns {Promise<any>}
     */
    let updateUserData = (mapElement, userData) => {

        let updateUserDataExecutor = (resolve, reject) => {
            let payload = {
                action: 'updateUserData'
            };

            // get new map instance or load existing
            let map = getMapInstance(userData.config.id);
            let mapElement = map.getContainer();

            // container must exist! otherwise systems can not be updated
            if(mapElement !== undefined){
                mapElement = $(mapElement);

                // no user update for 'frozen' maps...
                if(mapElement.data('frozen') === true){
                    return resolve(payload);
                }

                // compact/small system layout or not
                let compactView = mapElement.hasClass(MapUtil.config.mapCompactClass);

                // get current character log data
                let characterLogSystemId = Util.getObjVal(Util.getCurrentCharacterLog(), 'system.id') || 0;

                // data for header update
                let headerUpdateData = {
                    mapId: userData.config.id,
                    userCountInside: 0,                 // active user on a map
                    userCountOutside: 0,                // active user NOT on map
                    userCountInactive: 0
                };

                // check if current user was found on the map
                let currentUserOnMap = false;

                // get all systems
                for(let system of mapElement.find('.' + config.systemClass)){
                    system = $(system);
                    let systemId = system.data('systemId');
                    let tempUserData = null;

                    // check if user is currently in "this" system
                    let currentUserIsHere = false;

                    let j = userData.data.systems.length;

                    // search backwards to avoid decrement the counter after splice()
                    while(j--){
                        let systemData = userData.data.systems[j];

                        // check if any user is in this system
                        if(systemId === systemData.id){
                            tempUserData = systemData;

                            // add  "user count" to "total map user count"
                            headerUpdateData.userCountInside += tempUserData.user.length;

                            // remove system from "search" array -> speed up loop
                            userData.data.systems.splice(j, 1);
                        }
                    }

                    // the current user can only be in a single system ------------------------------------------------
                    if(
                        !currentUserOnMap &&
                        characterLogSystemId &&
                        characterLogSystemId === systemId
                    ){
                        currentUserIsHere = true;
                        currentUserOnMap = true;
                    }

                    updateSystemUserData(map, system, tempUserData, currentUserIsHere, {compactView: compactView});
                }

                // users who are not in any map system ----------------------------------------------------------------
                for(let systemData of userData.data.systems){
                    // users without location are grouped in systemId: 0
                    if(systemData.id){
                        headerUpdateData.userCountOutside += systemData.user.length;
                    }else{
                        headerUpdateData.userCountInactive += systemData.user.length;
                    }
                }

                // trigger document event -> update header
                $(document).trigger('pf:updateHeaderMapData', headerUpdateData);
            }

            resolve(payload);
        };

        return new Promise(updateUserDataExecutor);
    };

    /**
     * collect all map data from client for server or client sync
     * @param mapContainer
     * @param filter
     * @param minimal
     * @returns {boolean}
     */
    let getMapDataForSync = (mapContainer, filter = [], minimal = false) => {
        let mapData = false;
        // check if there is an active map counter that prevents collecting map data (locked map)
        if(!MapOverlayUtil.getMapOverlayInterval(mapContainer)){
            mapData = mapContainer.getMapDataFromClient(filter, minimal);
        }
        return mapData;
    };

    /**
     * collect all map data for export/save for a map
     * this function returns the "client" data NOT the "server" data for a map
     * @param filter
     * @param minimal
     */
    $.fn.getMapDataFromClient = function(filter = [], minimal = false){
        let mapContainer = $(this);
        let map = getMapInstance(mapContainer.data('id'));

        let filterHasId = filter.includes('hasId');
        let filterHasChanged = filter.includes('hasChanged');

        let mapData = {};

        // map config -------------------------------------------------------------------------------------------------
        mapData.config = {
            id: parseInt(mapContainer.data('id')),
            name: mapContainer.data('name'),
            scope: {
                id: parseInt(mapContainer.data('scopeId'))
            },
            icon: mapContainer.data('icon'),
            type: {
                id: parseInt(mapContainer.data('typeId'))
            },
            created: parseInt(mapContainer.data('created')),
            updated: parseInt(mapContainer.data('updated'))
        };

        let data = {};

        // systems data -----------------------------------------------------------------------------------------------
        let systemsData = [];
        let systems = mapContainer.getSystems();

        for(let i = 0; i < systems.length; i++){
            let system = $(systems[i]);

            if(filterHasChanged && !MapUtil.hasChanged(system)){
                continue;
            }

            systemsData.push(system.getSystemData(minimal));
        }

        data.systems = systemsData;

        // connections ------------------------------------------------------------------------------------------------
        let connectionsData = [];
        let connections = map.getAllConnections();

        for(let j = 0; j < connections.length; j++) {
            let connection = connections[j];

            // add to cache
            updateConnectionCache(mapData.config.id, connection);

            if(filterHasChanged && !MapUtil.hasChanged(connection)){
                continue;
            }

            if(filterHasId && !connection.getParameter('connectionId')){
                continue;
            }

            connectionsData.push(MapUtil.getDataByConnection(connection, minimal));
        }

        data.connections = connectionsData;

        mapData.data = data;

        return mapData;
    };

    /**
     * get all relevant data for a system object
     * @param minimal
     * @returns {{id: number, updated: {updated: number}}}
     */
    $.fn.getSystemData = function(minimal = false){
        let system = $(this);

        let systemData = {
            id: parseInt(system.data('id')),
            updated: {
                updated: parseInt(system.data('updated'))
            }
        };

        if(!minimal){
            systemData = Object.assign(systemData, {
                systemId: parseInt(system.data('systemId')),
                name: system.data('name'),
                alias: system.getSystemInfo(['alias']),
                effect: system.data('effect'),
                type: {
                    id: system.data('typeId')
                },
                security: system.data('security'),
                trueSec: system.data('trueSec'),
                region: {
                    id: system.data('regionId'),
                    name: system.data('region')
                },
                constellation: {
                    id: system.data('constellationId'),
                    name: system.data('constellation')
                },
                status: {
                    id: system.data('statusId')
                },
                locked: system.data('locked') ? 1 : 0,
                rallyUpdated: system.data('rallyUpdated') || 0,
                rallyPoke: system.data('rallyPoke') ? 1 : 0,
                currentUser: system.data('currentUser'),        // if user is currently in this system
                faction: system.data('faction'),
                planets: system.data('planets'),
                shattered: system.data('shattered') ? 1 : 0,
                statics: system.data('statics'),
                userCount: (system.data('userCount') ? parseInt(system.data('userCount')) : 0),
                position: MapUtil.getSystemPosition(system)
            });
        }

        return systemData;
    };

    /**
     * init map options
     * @param mapConfig
     * @param options
     * @returns {Promise<any>}
     */
    let initMapOptions = (mapConfig, options) => {

        let initMapOptionsExecutor = (resolve, reject) => {
            let payload = {
                action: 'initMapOptions',
                data: {
                    mapConfig: mapConfig
                }
            };

            if(options.showAnimation){
                let mapElement = $(mapConfig.map.getContainer());
                MapUtil.setMapDefaultOptions(mapElement, mapConfig.config)
                    .then(payload => MapUtil.visualizeMap(mapElement, 'show'))
                    .then(payload => MapUtil.zoomToDefaultScale(mapConfig.map))
                    .then(payload => MapUtil.scrollToDefaultPosition(mapConfig.map))
                    .then(payload => {
                        Util.showNotify({title: 'Map initialized', text: mapConfig.config.name  + ' - loaded', type: 'success'});
                    })
                    .then(() => resolve(payload));
            }else{
                // nothing to do here...
                resolve(payload);
            }
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
            // init jsPlumb
            jsPlumb.ready(() => {
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
                onInit: function(){
                    // init 'space' key + 'mouse' down for map scroll -------------------------------------------------
                    let scrollStart = [0, 0];
                    let mouseStart = [0, 0];
                    let mouseOffset = [0, 0];

                    let animationFrameId = 0;

                    let toggleDragScroll = active => {
                        mapElement.toggleClass('disabled', active).toggleClass(' pf-map-move', active);
                    };

                    let stopDragScroll = () => {
                        cancelAnimationFrame(animationFrameId);
                        animationFrameId = 0;
                        scrollStart = [0, 0];
                        mouseStart = [0, 0];
                        mouseOffset = [0, 0];
                    };

                    let dragScroll = () => {
                        if(Key.isActive(' ')){
                            let scrollOffset = [
                                Math.max(0, scrollStart[0] - mouseOffset[0]),
                                Math.max(0, scrollStart[1] - mouseOffset[1])
                            ];

                            if(
                                scrollOffset[0] !== Math.abs(this.mcs.left) ||
                                scrollOffset[1] !== Math.abs(this.mcs.top)
                            ){
                                Scrollbar.scrollToPosition(this, [scrollOffset[1], scrollOffset[0]], {
                                    scrollInertia: 0,
                                    scrollEasing: 'linear',
                                    timeout: 5
                                });
                            }

                            // recursive re-call on next render
                            animationFrameId = requestAnimationFrame(dragScroll);
                        }
                    };

                    let keyDownHandler = function(e){
                        if(e.keyCode === 32){
                            e.preventDefault();
                            toggleDragScroll(true);
                        }
                    };
                    let keyUpHandler = function(e){
                        if(e.keyCode === 32){
                            e.preventDefault();
                            toggleDragScroll(false);
                        }
                    };
                    let mouseMoveHandler = function(e){
                        if(animationFrameId){
                            mouseOffset[0] = e.clientX - mouseStart[0];
                            mouseOffset[1] = e.clientY - mouseStart[1];
                        }

                        // space activated on mouse move
                        toggleDragScroll(Key.isActive(' '));
                    };

                    let mouseDownHandler = function(e){
                        if(!animationFrameId && e.which === 1 && Key.isActive(' ')){
                            scrollStart[0] = Math.abs(this.mcs.left);
                            scrollStart[1] = Math.abs(this.mcs.top);
                            mouseStart[0] = e.clientX;
                            mouseStart[1] = e.clientY;

                            toggleDragScroll(true);

                            animationFrameId = requestAnimationFrame(dragScroll);
                        }
                    };

                    let mouseUpHandler = function(e){
                        if(e.which === 1){
                            stopDragScroll();
                        }
                    };

                    this.addEventListener('keydown', keyDownHandler, { capture: false });
                    this.addEventListener('keyup', keyUpHandler, { capture: false });
                    this.addEventListener('mousemove', mouseMoveHandler, { capture: false });
                    this.addEventListener('mousedown', mouseDownHandler, { capture: false });
                    this.addEventListener('mouseup', mouseUpHandler, { capture: false });
                },
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
                    $(this).find('.editable.editable-open').editable('hide');

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
        updateUserData: updateUserData,
        getMapDataForSync: getMapDataForSync,
        saveSystemCallback: saveSystemCallback
    };

});