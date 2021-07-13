/**
 *  map overlay functions
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/overlay/util',
    'app/map/util',
    'app/lib/cron'
], ($, Init, Util, MapOverlayUtil, MapUtil, Cron) => {
    'use strict';

    /**
     * get map object (jsPlumb) from iconElement
     * @param overlayIcon
     * @returns {*}
     */
    let getMapObjectFromOverlayIcon = overlayIcon => {
        return MapUtil.getMapInstance(MapOverlayUtil.getMapElementFromOverlay(overlayIcon).data('id'));
    };

    /**
     * add/update endpoints with overlays from signature mapping
     * @param endpoint
     * @param labelData
     */
    let updateEndpointOverlaySignatureLabel = (endpoint, labelData) => {
        let labels = labelData.labels;
        let names = labelData.names;
        let overlay = endpoint.getOverlay(MapOverlayUtil.config.endpointOverlayId);

        if(overlay instanceof jsPlumb.Overlays.Label){
            // update existing overlay
            if(
                !labels.equalValues(overlay.getParameter('signatureLabels')) ||
                !names.equalValues(overlay.getParameter('signatureNames'))
            ){
                // update label only on label changes
                overlay.setLabel(MapUtil.formatEndpointOverlaySignatureLabel(labels));
                overlay.setParameter('fullSize', false);
                overlay.setParameter('signatureLabels', labels);
                overlay.setParameter('signatureNames', names);
                overlay.updateClasses(labels.length ? 'small' : 'icon', labels.length ? 'icon' : 'small');
                overlay.setLocation(MapUtil.getEndpointOverlaySignatureLocation(endpoint, labels));
            }
        }else{
            // add new overlay
            endpoint.addOverlay([
                'Label',
                {
                    label: MapUtil.formatEndpointOverlaySignatureLabel(labels),
                    id: MapOverlayUtil.config.endpointOverlayId,
                    cssClass: [MapOverlayUtil.config.componentOverlayClass, labels.length ? 'small' : 'icon'].join(' '),
                    location: MapUtil.getEndpointOverlaySignatureLocation(endpoint, labels),
                    events: {
                        toggleSize: function(fullSize){
                            let signatureNames = this.getParameter('signatureNames');
                            if(fullSize && !this.getParameter('fullSize') && signatureNames.length){
                                this.setLabel(this.getLabel() + '<br>' + '<span class="initialism">' + signatureNames.join(', ') + '</span>');
                                this.setParameter('fullSize', true);
                            }else if(this.getParameter('fullSize')){
                                this.setLabel(MapUtil.formatEndpointOverlaySignatureLabel(this.getParameter('signatureLabels')));
                                this.setParameter('fullSize', false);
                            }
                        }
                    },
                    parameters: {
                        fullSize: false,
                        signatureLabels: labels,
                        signatureNames: names
                    }
                }
            ]);
        }
    };

    /**
     * get overlay parameters for connection overlay (type 'diamond' or 'arrow')
     * @param overlayType
     * @param direction
     * @param prefix        for obj keys -> for parameterized Overlays
     * @returns {{length: number, foldback: number, direction: number}}
     */
    let getConnectionArrowOverlayParams = (overlayType, direction = 1, prefix = 'arrow') => {
        switch(overlayType){
            case 'arrow':
                return {
                    [`${prefix}length`]: 15,
                    [`${prefix}direction`]: direction,
                    [`${prefix}foldback`]: 0.8
                };
            default:    // diamond
                return {
                    [`${prefix}length`]: 10,
                    [`${prefix}direction`]: 1,
                    [`${prefix}foldback`]: 2
                };
        }
    };

    /**
     * add overlays to connections (signature based data)
     * @param map
     * @param connectionsData
     */
    let updateInfoSignatureOverlays = (map, connectionsData) => {
        let type = 'info_signature';
        connectionsData = Util.arrayToObject(connectionsData);

        map.setSuspendDrawing(true);
        // ... redraw should be suspended (no repaint until function ends)
        let doNotRepaint = map.isSuspendDrawing();

        map.getAllConnections().forEach(connection => {
            let connectionId    = connection.getParameter('connectionId');
            let sourceEndpoint  = connection.endpoints[0];
            let targetEndpoint  = connection.endpoints[1];

            let connectionData = Util.getObjVal(connectionsData, `${connectionId}`);
            let signatureTypeData = MapUtil.getConnectionDataFromSignatures(connection, connectionData);

            let sizeLockedBySignature = false;

            if(connection.scope === 'wh'){
                /* TODO check if we still need this, commented out after jsPlumb `v2.9.3` → `v2.13.1` upgrade
                if(!connection.hasType(type)){
                    connection.addType(type);
                }

                let overlayArrow = connection.getOverlay(MapOverlayUtil.config.connectionOverlayArrowId);

                // Arrow overlay needs to be cleared() (removed) if 'info_signature' gets removed!
                // jsPlumb does not handle overlay updates for Arrow overlays... so we need to re-apply the overlay manually
                if(overlayArrow.path && !overlayArrow.path.isConnected){
                    connection.canvas.appendChild(overlayArrow.path);
                }
                */

                // since there "could" be multiple sig labels on each endpoint,
                // there can only one "primary label picked up for wormhole jump mass detection!
                let primeLabel;

                let overlayType = 'diamond'; // not specified
                let arrowDirection = 1;

                if(connectionData && connectionData.signatures){
                    // signature data found for current connection
                    let sourceLabel =  signatureTypeData.source.labels;
                    let targetLabel =  signatureTypeData.target.labels;

                    // add arrow (connection) overlay that points from "XXX" => "K162" ----------------------------
                    if(
                        (sourceLabel.includes('K162') && targetLabel.includes('K162')) ||
                        (sourceLabel.length === 0 && targetLabel.length === 0) ||
                        (
                            sourceLabel.length > 0 && targetLabel.length > 0 &&
                            !sourceLabel.includes('K162') && !targetLabel.includes('K162')
                        )
                    ){
                        // unknown direction -> show default 'diamond' overlay
                        overlayType = 'diamond';
                    }else if(
                        (sourceLabel.includes('K162')) ||
                        (sourceLabel.length === 0 && !targetLabel.includes('K162'))
                    ){
                        // convert default arrow direction
                        overlayType = 'arrow';
                        arrowDirection = -1;

                        primeLabel = targetLabel.find(label => label !== 'K162');
                    }else{
                        // default arrow direction is fine
                        overlayType = 'arrow';

                        primeLabel = sourceLabel.find(label => label !== 'K162');
                    }
                }

                // class changes must be done on "connection" itself not on "overlayArrow"
                // -> because Arrow might not be rendered to map at this point (if it does not exist already)
                if(overlayType === 'arrow'){
                    connection.updateClasses(
                        MapOverlayUtil.config.connectionArrowOverlaySuccessClass,
                        MapOverlayUtil.config.connectionArrowOverlayDangerClass
                    );
                }else{
                    connection.updateClasses(
                        MapOverlayUtil.config.connectionArrowOverlayDangerClass,
                        MapOverlayUtil.config.connectionArrowOverlaySuccessClass
                    );
                }

                let arrowParams = getConnectionArrowOverlayParams(overlayType, arrowDirection);

                if(!connection.hasType(type)){
                    connection.addType(type, arrowParams, doNotRepaint);
                }else{
                    connection.reapplyTypes(arrowParams, doNotRepaint);
                }

                // update/add endpoint overlays -------------------------------------------------------------------
                updateEndpointOverlaySignatureLabel(sourceEndpoint, signatureTypeData.source);
                updateEndpointOverlaySignatureLabel(targetEndpoint, signatureTypeData.target);

                // fix/overwrite existing jump mass connection type -----------------------------------------------
                // if a connection type for "jump mass" (e.g. S, M, L, XL) is set for this connection
                // we should check/compare it with the current primary signature label from signature mapping
                // and change it if necessary
                if(Init.wormholes.hasOwnProperty(primeLabel)){
                    // connection size from mapped signature
                    sizeLockedBySignature = true;

                    // get 'connection mass type' from wormholeData
                    let massType = Util.getObjVal(Object.assign({}, Init.wormholes[primeLabel]), 'size.type');

                    if(massType && !connection.hasType(massType)){
                        MapOverlayUtil.getMapOverlay(connection.canvas, 'timer').startMapUpdateCounter();
                        MapUtil.setConnectionJumpMassType(connection, massType);
                        MapUtil.markAsChanged(connection);
                    }
                }
            }else{
                // connection is not 'wh' scope
                if(connection.hasType(type)){
                    connection.removeType(type, undefined, doNotRepaint);
                }
            }

            // lock/unlock connection for manual size changes (from contextmenu)
            connection.setParameter('sizeLocked', sizeLockedBySignature);
        });

        map.setSuspendDrawing(false, true);
    };

    /**
     * hide default icon and replace it with "loading" icon
     * @param iconElement
     */
    let showLoading = iconElement => {
        iconElement = $(iconElement);
        let dataName = 'default-icon';
        let defaultIconClass = iconElement.data(dataName);

        // get default icon class
        if( !defaultIconClass ){
            // index 0 == 'fa-fw', index 1 == IconName
            defaultIconClass = $(iconElement).attr('class').match(/\bfa-\S*/g)[1];
            iconElement.data(dataName, defaultIconClass);
        }

        iconElement.toggleClass( defaultIconClass + ' fa-sync fa-spin');
    };

    /**
     * hide "loading" icon and replace with default icon
     * @param iconElement
     */
    let hideLoading = iconElement => {
        iconElement = $(iconElement);
        let dataName = 'default-icon';
        let defaultIconClass = iconElement.data(dataName);

        iconElement.toggleClass( defaultIconClass + ' fa-sync fa-spin');
    };

    /**
     * get overlay icon from e.g. mapElement
     * @param element
     * @param iconClass
     * @param overlayType
     * @returns {*}
     */
    let getOverlayIcon = (element, iconClass, overlayType = 'info') => {
        return MapOverlayUtil.getMapOverlay(element, overlayType).find('.' + iconClass);
    };

    /**
     * showInfoSignatureOverlays
     * -> used by "refresh" overlays (hover) AND/OR initial menu trigger
     */
    let showInfoSignatureOverlays = mapElement => {
        let mapId = mapElement.data('id');
        let map = MapUtil.getMapInstance(mapId);
        let mapData = Util.getCurrentMapData(mapId);
        let connectionsData = Util.getObjVal(mapData, 'data.connections');

        if(connectionsData){
            let overlayIcon = getOverlayIcon(mapElement, options.connectionSignatureOverlays.class);
            showLoading(overlayIcon);
            updateInfoSignatureOverlays(map, connectionsData);
            hideLoading(overlayIcon);
        }
    };

    /**
     * hideInfoSignatureOverlays
     * -> see showInfoSignatureOverlays()
     */
    let hideInfoSignatureOverlays = mapElement => {
        let mapId = mapElement.data('id');
        let map = MapUtil.getMapInstance(mapId);
        let type = 'info_signature';

        map.setSuspendDrawing(true);

        map.getAllConnections().forEach(connection => {
            let overlayArrow = connection.getOverlay(MapOverlayUtil.config.connectionOverlayArrowId);

            if(overlayArrow){
                overlayArrow.cleanup();
            }

            if(connection.hasType(type)){
                connection.removeType(type, {}, true);
            }
        });

        map.selectEndpoints().removeOverlay(MapOverlayUtil.config.endpointOverlayId);

        map.setSuspendDrawing(false, true);
    };

    /**
     * callback after applying map option "systemRegion"
     * -> system dimension changed -> redraw connections
     * @param mapElement
     */
    let toggleInfoSystemRegion = mapElement => {
        let mapId = mapElement.data('id');
        let map = MapUtil.getMapInstance(mapId);
        map.repaintEverything();
    };

    /**
     * Overlay options (all available map options shown in overlay)
     * "active":    (active || hover) indicated whether an icon/option
     *              is marked as "active".
     *              "active": Makes icon active when visible
     *              "hover": Make icon active on hover
     */
    let options = {
        filter: {
            title: 'active filter',
            trigger: 'active',
            class: 'pf-map-overlay-filter',
            iconClass: ['fas', 'fa-fw', 'fa-filter'],
            onClick: function(e){
                // clear all filter
                let mapElement = MapOverlayUtil.getMapElementFromOverlay(this);
                let map = getMapObjectFromOverlayIcon(this);

                Util.getLocalStore('map').setItem(`${mapElement.data('id')}.filterScopes`, []);
                MapUtil.filterMapByScopes(map, []);
            }
        },
        mapSnapToGrid: {
            title: 'grid',
            trigger: 'active',
            class: 'pf-map-overlay-grid',
            iconClass: ['fas', 'fa-fw', 'fa-th']
        },
        mapMagnetizer: {
            title: 'magnetizer',
            trigger: 'active',
            class: 'pf-map-overlay-magnetizer',
            iconClass: ['fas', 'fa-fw', 'fa-magnet']
        },
        systemRegion: {
            title: 'regions',
            trigger: 'active',
            class: 'pf-map-overlay-region',
            iconClass: ['fas', 'fa-fw', 'fa-map-marked-alt']
        },
        systemCompact: {
            title: 'compact layout',
            trigger: 'active',
            class: 'pf-map-overlay-compact',
            iconClass: ['fas', 'fa-fw', 'fa-compress']
        },
        connectionSignatureOverlays: {
            title: 'signature overlays',
            trigger: 'active',
            class: 'pf-map-overlay-endpoint',
            iconClass: ['fas', 'fa-fw', 'fa-link']
        },
        systemPopover: {
            title: 'sovereignty',
            trigger: 'hover',
            class: 'pf-map-overlay-popover',
            iconClass: ['fas', 'fa-fw', 'fa-landmark'],
            hoverIntent: {
                over: function(e){
                    let mapElement = MapOverlayUtil.getMapElementFromOverlay(this);
                    mapElement.find('.' + MapOverlayUtil.config.systemHeadClass).each(function(){
                        let systemHead = $(this);
                        // init popover if not already exists
                        if(!systemHead.data('bs.popover')){
                            let system = systemHead.parent();
                            let systemData = system.data();
                            let sovereignty = Util.getObjVal(systemData, 'sovereignty');
                            if(sovereignty){
                                systemHead.popover({
                                    placement: 'bottom',
                                    html: true,
                                    trigger: 'manual',
                                    container: mapElement,
                                    title: false,
                                    content: Util.getSystemSovereigntyTable(sovereignty)
                                });
                            }
                        }
                        systemHead.setPopoverSmall();
                        systemHead.popover('show');
                    });
                },
                out: function(e){
                    let mapElement = MapOverlayUtil.getMapElementFromOverlay(this);
                    mapElement.find('.' + MapOverlayUtil.config.systemHeadClass).popover('hide');
                }
            }
        },
        connection: {
            title: 'WH data',
            trigger: 'hover',
            class: 'pf-map-overlay-connection-wh',
            iconClass: ['fas', 'fa-fw', 'fa-fighter-jet'],
            hoverIntent: {
                over: function(e){
                    let map = getMapObjectFromOverlayIcon(this);
                    let connections = MapUtil.searchConnectionsByScopeAndType(map, 'wh');
                    let serverDate = Util.getServerTime();

                    // show connection overlays -----------------------------------------------------------------------
                    for(let connection of connections){
                        let createdTimestamp = connection.getParameter('created');
                        let updatedTimestamp = connection.getParameter('updated');

                        let createdDate = Util.convertTimestampToServerTime(createdTimestamp);
                        let updatedDate = Util.convertTimestampToServerTime(updatedTimestamp);

                        let createdDiff = Util.getTimeDiffParts(createdDate, serverDate);
                        let updatedDiff = Util.getTimeDiffParts(updatedDate, serverDate);

                        // format overlay label
                        let labels = [
                            Util.formatTimeParts(createdDiff) + '&nbsp;<i class="fas fa-fw fa-plus-square"></i>',
                            Util.formatTimeParts(updatedDiff) + '&nbsp;<i class="fas fa-fw fa-pen-square"></i>'
                        ];

                        // add label overlay --------------------------------------------------------------------------
                        connection.addOverlay([
                            'Label',
                            {
                                label: labels.join('<br>'),
                                id: MapOverlayUtil.config.connectionOverlayWhId,
                                cssClass: [MapOverlayUtil.config.componentOverlayClass, 'small', 'text-right'].join(' '),
                                location: 0.35
                            }
                        ]);
                    }
                },
                out: function(e){
                    let map = getMapObjectFromOverlayIcon(this);
                    let connections = MapUtil.searchConnectionsByScopeAndType(map, 'wh');

                    for(let connection of connections){
                        connection.removeOverlay(MapOverlayUtil.config.connectionOverlayWhId);
                    }
                }
            }
        },
        connectionEol: {
            title: 'EOL',
            trigger: 'hover',
            class: 'pf-map-overlay-connection-eol',
            iconClass: ['fas', 'fa-fw', 'fa-hourglass-end'],
            hoverIntent: {
                over: function(e){
                    let map = getMapObjectFromOverlayIcon(this);
                    let connections = MapUtil.searchConnectionsByScopeAndType(map, 'wh', ['wh_eol']);
                    let serverDate = Util.getServerTime();

                    for(let connection of connections){
                        let eolTimestamp = connection.getParameter('eolUpdated');
                        let eolDate = Util.convertTimestampToServerTime(eolTimestamp);
                        let diff = Util.getTimeDiffParts(eolDate, serverDate);

                        connection.addOverlay([
                            'Label',
                            {
                                label: '<i class="fas fa-fw fa-hourglass-end"></i>&nbsp;' + Util.formatTimeParts(diff),
                                id: MapOverlayUtil.config.connectionOverlayEolId,
                                cssClass: [MapOverlayUtil.config.componentOverlayClass, 'eol'].join(' '),
                                location: 0.25
                            }
                        ]);
                    }
                },
                out: function(e){
                    let map = getMapObjectFromOverlayIcon(this);
                    let connections = MapUtil.searchConnectionsByScopeAndType(map, 'wh', ['wh_eol']);

                    for(let connection of connections){
                        connection.removeOverlay(MapOverlayUtil.config.connectionOverlayEolId);
                    }
                }
            }
        }
    };

    /**
     * draws the map update counter to the map overlay timer
     * @param mapOverlayTimer
     * @param percent
     * @param value
     */
    let setMapUpdateCounter = (mapOverlayTimer, percent, value = '') => {
        // check if counter already exists
        if(!MapOverlayUtil.getMapCounter(mapOverlayTimer)){
            // create new counter
            let chartEl = Object.assign(document.createElement('div'), {
                className: `${Init.classes.pieChart.class} ${Init.classes.pieChart.pieChartMapCounterClass}`
            });

            let chartInnerEl = Object.assign(document.createElement('span'), {
                textContent: value
            });
            let iconEl = Object.assign(document.createElement('i'), {
                className: ['fas', 'fa-fw', 'fa-lock'].join(' ')
            });

            chartInnerEl.append(iconEl);
            chartEl.append(chartInnerEl);
            mapOverlayTimer.append(chartEl);

            // init counter
            $(chartEl).initMapUpdateCounter();

            // set tooltip
            mapOverlayTimer.dataset.placement = 'left';
            mapOverlayTimer.setAttribute('title', 'update counter');
            $(mapOverlayTimer).tooltip();
        }
    };

    /**
     * start the map update counter or reset
     */
    $.fn.startMapUpdateCounter = function(){
        if(!this.length){
            console.warn('startMapUpdateCounter() failed. Missing DOM node');
            return;
        }
        let mapOverlayTimer = this[0];
        let counterChart = MapOverlayUtil.getMapCounter(mapOverlayTimer);
        let pieChart = $(counterChart).data('easyPieChart');

        if(!pieChart){
            console.warn('startMapUpdateCounter() failed. easyPieChart not initialized');
            return;
        }

        let updateChart = (percent = 0) => {
            if(pieChart){
                pieChart.update(percent);
            }
        };

        let task = counterChart.getData('counterTask');
        if(!task){
            let tabContentEl = mapOverlayTimer.closest(`.${Util.config.mapTabContentClass}`);
            let mapId = parseInt(tabContentEl.dataset.mapId) || 0;
            task = Cron.new(`mapUpdateCounter_${mapId}`, {
                precision: 'secondTenths',
                isParallel: true,
                targetRunCount: 10 * MapOverlayUtil.config.logTimerCount
            });

            task.task = (timer, task) => {
                // debounce 80% (reduce repaint)
                if(task.runCount % 5 === 0){
                    let progress = Math.round(task.targetProgress);
                    updateChart(100 - progress);
                }

                if(task.targetAchieved){
                    $(mapOverlayTimer).velocity('transition.whirlOut', {
                        duration: Init.animationSpeed.mapOverlay,
                        complete: function(){
                            MapOverlayUtil.getMapElementFromOverlay(mapOverlayTimer).trigger('pf:unlocked');
                        }
                    });
                }
            };

            counterChart.setData('counterTask', task);
        }

        // task is not connected if: 'targetAchieved'  or not started
        if(!task.isConnected()){
            $(mapOverlayTimer).velocity('stop').velocity('transition.whirlIn', { duration: Init.animationSpeed.mapOverlay });
        }
        updateChart(100);
        task.reset();
        task.start();
    };

    /**
     * update (show/hide) a overlay icon in the "info"-overlay
     * show/hide the overlay itself is no icons are visible
     * @param option
     * @param viewType
     */
    $.fn.updateOverlayIcon = function(option, viewType){
        let mapOverlayInfo = $(this);

        let showOverlay = false;

        let mapOverlayIconClass = options[option].class;

        // look for the overlay icon that should be updated
        let iconElement = mapOverlayInfo.find('.' + mapOverlayIconClass);

        if(iconElement){
            if(viewType === 'show'){
                showOverlay = true;

                // check "trigger" and mark as "active"
                if(
                    options[option].trigger === 'active' ||
                    options[option].trigger === 'refresh'
                ){
                    iconElement.addClass('active');
                }

                // check if icon is not already visible
                // -> prevents unnecessary "show" animation
                if( !iconElement.data('visible') ){
                    // display animation for icon
                    iconElement.velocity({
                        opacity: [0.8, 0],
                        scale: [1, 0],
                        width: ['20px', 0],
                        height: ['20px', 0],
                        marginRight: ['10px', 0]
                    },{
                        duration: 240,
                        easing: 'easeInOutQuad'
                    });

                    iconElement.data('visible', true);
                }
            }else if(viewType === 'hide'){
                // check if icon is not already visible
                // -> prevents unnecessary "hide" animation
                if(iconElement.data('visible')){
                    iconElement.removeClass('active').velocity('reverse');
                    iconElement.data('visible', false);
                }

                // check if there is any visible icon remaining
                let visibleIcons = mapOverlayInfo.find('i:visible');
                if(visibleIcons.length > 0){
                    showOverlay = true;
                }
            }
        }

        // show the entire overlay if there is at least one active icon
        if(
            showOverlay === true &&
            mapOverlayInfo.is(':hidden')
        ){
            // show overlay
            mapOverlayInfo.velocity('stop').velocity('transition.whirlIn', { duration: Init.animationSpeed.mapOverlay });
        }else if(
            showOverlay === false &&
            mapOverlayInfo.is(':visible')
        ){
            // hide overlay
            mapOverlayInfo.velocity('stop').velocity('transition.whirlOut', { duration: Init.animationSpeed.mapOverlay });
        }
    };

    /**
     * update map zoom overlay information
     * @param map
     */
    let updateZoomOverlay = map => {
        let zoom = map.getZoom();
        let zoomPercent = Math.round(zoom * 1000) / 10;
        let zoomOverlay = MapOverlayUtil.getMapOverlay(map.getContainer(), 'zoom');
        let zoomValue = zoomOverlay.find('.' + MapOverlayUtil.config.zoomOverlayValueClass);
        let zoomUp = zoomOverlay.find('.' + MapOverlayUtil.config.zoomOverlayUpClass);
        let zoomDown = zoomOverlay.find('.' + MapOverlayUtil.config.zoomOverlayDownClass);
        zoomValue.toggleClass('active', zoom !== 1).text(zoomPercent);
        zoomUp.toggleClass('disabled', zoom >= MapUtil.config.zoomMax);
        zoomDown.toggleClass('disabled', zoom <= MapUtil.config.zoomMin);
    };

    /**
     * map debug overlays for connections/endpoints
     * -> requires manual added "debug" GET param to URL
     * @param map
     */
    let initMapDebugOverlays = map => {
        let url = new URL(window.location.href);
        if(url.searchParams.has('debug')){
            let mapContainer = $(map.getContainer());

            // debug map overlays for connection/endpoints
            mapContainer.on('mouseover', '.jtk-connector', function(e){
                e.stopPropagation();

                if(e.target.classList.contains('jtk-connector-outline')){
                    let connection = e.currentTarget._jsPlumb;
                    // show debug overlay only if there is no active debug
                    if(!connection.getOverlay(MapOverlayUtil.config.debugOverlayId)){
                        // find nearby connections
                        let connections = [];
                        let endpoints = [];
                        let hasComponentId = id => {
                            return component => component.id === id;
                        };

                        for(let endpoint of connection.endpoints){
                            let connectionsInfo = map.anchorManager.getConnectionsFor(endpoint.elementId);
                            for(let connectionInfo of connectionsInfo){
                                if(!connections.some(hasComponentId(connectionInfo[0].id))){
                                    connections.push(connectionInfo[0]);
                                    for(let endpointTemp of connectionInfo[0].endpoints){
                                        if(!endpoints.some(hasComponentId(endpointTemp.id))){
                                            endpoints.push(endpointTemp);
                                        }
                                    }
                                }
                            }
                        }

                        let createConnectionOverlay  = connection => {
                            let data = MapUtil.getDataByConnection(connection);

                            let html = '<div><table>';
                            html += '<tr><td>' + connection.id + '</td><td class="text-right">' + data.id + '</td></tr>';
                            html += '<tr><td>Scope:</td><td class="text-right">' + data.scope + '</td></tr>';
                            html += '<tr><td>Type:</td><td class="text-right">' + data.type.toString() + '</td></tr>';
                            html += '</table></div>';

                            return $(html).on('click', function(){
                                console.info(connection);
                            });
                        };

                        for(let connection of connections){
                            connection.addOverlay([
                                'Custom',
                                {
                                    id: MapOverlayUtil.config.debugOverlayId,
                                    cssClass: [MapOverlayUtil.config.componentOverlayClass, 'debug'].join(' '),
                                    create: createConnectionOverlay
                                }
                            ]);
                        }

                        let createEndpointOverlay = endpoint => {
                            let types = MapUtil.filterDefaultTypes(endpoint.getType());

                            let html = '<div><table>';
                            html += '<tr><td>' + endpoint.id + '</td><td class="text-right"></td></tr>';
                            html += '<tr><td>Scope:</td><td class="text-right">' + endpoint.scope + '</td></tr>';
                            html += '<tr><td>Type:</td><td class="text-right">' + types.toString() + '</td></tr>';
                            html += '</table></div>';

                            return $(html).on('click', function(){
                                console.info(endpoint);
                            });
                        };

                        for(let endpoint of endpoints){
                            endpoint.addOverlay([
                                'Custom',
                                {
                                    id: MapOverlayUtil.config.debugOverlayId,
                                    cssClass: [MapOverlayUtil.config.componentOverlayClass, 'debug'].join(' '),
                                    create: createEndpointOverlay
                                }
                            ]);
                        }
                    }
                }
            });

            mapContainer.on('mouseover', function(e){
                e.stopPropagation();
                if(e.target === e.currentTarget){
                    map.select().removeOverlay(MapOverlayUtil.config.debugOverlayId);
                    map.selectEndpoints().removeOverlay(MapOverlayUtil.config.debugOverlayId);
                }
            });
        }
    };

    /**
     * init map zoom overlay
     * @returns {jQuery}
     */
    let initZoomOverlay = () => {
        let clickHandler = e => {
            let zoomIcon = $(e.target);
            if(!zoomIcon.hasClass('disabled')){
                let zoomAction = zoomIcon.attr('data-zoom');
                let map = getMapObjectFromOverlayIcon(zoomIcon);
                MapUtil.changeZoom(map, zoomAction);
            }
        };

        return $('<div>', {
            class: [MapOverlayUtil.config.mapOverlayClass, MapOverlayUtil.config.mapOverlayZoomClass].join(' ')
        }).append(
            $('<i>', {
                class: ['fas', 'fa-caret-up', MapOverlayUtil.config.zoomOverlayUpClass].join(' ')
            }).attr('data-zoom', 'up').on('click', clickHandler),
            $('<span>', {
                class: MapOverlayUtil.config.zoomOverlayValueClass,
                text: '100'
            }),
            $('<i>', {
                class: ['fas', 'fa-caret-down', MapOverlayUtil.config.zoomOverlayDownClass].join(' ')
            }).attr('data-zoom', 'down').on('click', clickHandler)
        );
    };

    /**
     * init all map overlays on a "parent" element
     * @returns {*}
     */
    $.fn.initMapOverlays = function(){
        return this.each(function(){
            let parentElement = $(this);

            let mapOverlayTimer = $('<div>', {
                class: [MapOverlayUtil.config.mapOverlayClass, MapOverlayUtil.config.mapOverlayTimerClass].join(' ')
            });
            parentElement.append(mapOverlayTimer);


            parentElement.append(initZoomOverlay());

            // --------------------------------------------------------------------------------------------------------
            // add map overlay info. after scrollbar is initialized
            let mapOverlayInfo = $('<div>', {
                class: [MapOverlayUtil.config.mapOverlayClass, MapOverlayUtil.config.mapOverlayInfoClass].join(' ')
            });

            // add all overlay elements
            Object.entries(options).forEach(([key, option]) => {
                let icon = $('<i>', {
                    class: option.iconClass.concat(['pull-right', option.class]).join(' ')
                }).attr('title', option.title).tooltip({
                    placement: 'bottom',
                    container: 'body',
                    delay: 150
                });

                // add "hover" action for some icons
                if(
                    option.trigger === 'hover' ||
                    option.trigger === 'refresh'
                ){
                    icon.hoverIntent(option.hoverIntent);
                }

                // add "click" handler for some icons
                if(option.hasOwnProperty('onClick')){
                    icon.on('click', option.onClick);
                }

                mapOverlayInfo.append(icon);
            });

            parentElement.append(mapOverlayInfo);

            // reset map update timer
            setMapUpdateCounter(mapOverlayTimer[0], 100);
        });
    };

    return {
        showInfoSignatureOverlays,
        hideInfoSignatureOverlays,
        toggleInfoSystemRegion,
        updateZoomOverlay,
        initMapDebugOverlays
    };
});