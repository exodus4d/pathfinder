/**
 *  map overlay functions
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/overlay/util',
    'app/map/util'
], ($, Init, Util, MapOverlayUtil, MapUtil) => {
    'use strict';

    /**
     *  get MapObject (jsPlumb) from mapElement
     * @param mapElement
     * @returns {*}
     */
    let getMapObjectFromMapElement = mapElement => {
        let Map = require('app/map/map');
        return Map.getMapInstance(mapElement.data('id'));
    };

    /**
     * get map object (jsPlumb) from iconElement
     * @param overlayIcon
     * @returns {*}
     */
    let getMapObjectFromOverlayIcon = overlayIcon => {
        let mapElement = Util.getMapElementFromOverlay(overlayIcon);
        return getMapObjectFromMapElement(mapElement);
    };

    /**
     * add overlay to endpoint with signature data
     * @param endpoint
     * @param labelData
     */
    let addEndpointOverlaySignatureLabel = (endpoint, labelData) => {
        let label = labelData.labels.join(', ');
        let name = labelData.names.join(', ');
        let overlay = endpoint.getOverlay(MapOverlayUtil.config.endpointOverlayId);

        if(overlay instanceof jsPlumb.Overlays.Label){
            // update existing overlay
            if(
                label !== overlay.getParameter('label') ||
                name !== overlay.getParameter('signatureName')
            ){
                // update label only on label changes
                overlay.setLabel(MapUtil.formatEndpointOverlaySignatureLabel(label));
                overlay.setParameter('fullSize', false);
                overlay.setParameter('label', label);
                overlay.setParameter('signatureName', name);
                overlay.updateClasses(label.length ? 'small' : 'icon', label.length ? 'icon' : 'small');
                overlay.setLocation(MapUtil.getEndpointOverlaySignatureLocation(endpoint, label));
            }
        }else{
            // add new overlay
            endpoint.addOverlay([
                'Label',
                {
                    label: MapUtil.formatEndpointOverlaySignatureLabel(label),
                    id: MapOverlayUtil.config.endpointOverlayId,
                    cssClass: [MapOverlayUtil.config.componentOverlayClass, label.length ? 'small' : 'icon'].join(' '),
                    location: MapUtil.getEndpointOverlaySignatureLocation(endpoint, label),
                    events: {
                        toggleSize: function(fullSize){
                            let signatureName = this.getParameter('signatureName');
                            if(fullSize && !this.getParameter('fullSize') && signatureName){
                                this.setLabel(this.getLabel() + '<br>' + '<span class="initialism">' + signatureName + '</span>');
                                this.setParameter('fullSize', true);
                            }else if(this.getParameter('fullSize')){
                                this.setLabel(MapUtil.formatEndpointOverlaySignatureLabel(this.getParameter('label')));
                                this.setParameter('fullSize', false);
                            }
                        }
                    },
                    parameters: {
                        fullSize: false,
                        label: label,
                        signatureName: name
                    }
                }
            ]);
        }
    };

    /**
     * add overlays to connections (signature based data)
     * @param map
     * @param connectionsData
     */
    let updateInfoSignatureOverlays = (map, connectionsData) => {
        let type = 'info_signature';
        let SystemSignatures = require('app/ui/module/system_signature');

        connectionsData = Util.arrayToObject(connectionsData);

        map.batch(function(){
            map.getAllConnections().forEach(function(connection){
                let connectionId    = connection.getParameter('connectionId');
                let sourceEndpoint  = connection.endpoints[0];
                let targetEndpoint  = connection.endpoints[1];

                let signatureTypeData = {
                    source: {
                        names: [],
                        labels: []
                    },
                    target: {
                        names: [],
                        labels: []
                    }
                };

                if(connection.scope === 'wh'){
                    if(!connection.hasType(type)){
                        connection.addType(type);
                    }

                    let overlayArrow = connection.getOverlay(MapOverlayUtil.config.connectionOverlayArrowId);

                    // Arrow overlay needs to be cleared() (removed) if 'info_signature' gets removed!
                    // jsPlumb does not handle overlay updates for Arrow overlays... so we need to re-apply the the overlay manually
                    if(overlayArrow.path && !overlayArrow.path.isConnected){
                        connection.canvas.appendChild(overlayArrow.path);
                    }

                    let overlayType = 'Diamond'; // not specified
                    let arrowDirection = 1;
                    let arrowFoldback = 2;

                    if(connectionsData.hasOwnProperty(connectionId)){
                        // signature data found for current connection
                        signatureTypeData = MapUtil.getConnectionDataFromSignatures(connection, connectionsData[connectionId]);

                        let sourceLabel =  signatureTypeData.source.labels;
                        let targetLabel =  signatureTypeData.target.labels;

                        // add arrow (connection) overlay that points from "XXX" => "K162" ------------------------------------
                        if(
                            (sourceLabel.indexOf('K162') !== -1 && targetLabel.indexOf('K162') !== -1) ||
                            (sourceLabel.length === 0 && targetLabel.length === 0) ||
                            (
                                sourceLabel.length > 0 && targetLabel.length > 0 &&
                                sourceLabel.indexOf('K162') === -1 && targetLabel.indexOf('K162') === -1
                            )
                        ){
                            // unknown direction
                            overlayType = 'Diamond'; // not specified
                            arrowDirection = 1;
                            arrowFoldback = 2;
                        }else if(
                            (sourceLabel.indexOf('K162') !== -1) ||
                            (sourceLabel.length === 0 && targetLabel.indexOf('K162') === -1)
                        ){
                            // convert default arrow direction
                            overlayType = 'Arrow';
                            arrowDirection = -1;
                            arrowFoldback = 0.8;
                        }else{
                            // default arrow direction is fine
                            overlayType = 'Arrow';
                            arrowDirection = 1;
                            arrowFoldback = 0.8;
                        }
                    }

                    // class changes must be done on "connection" itself not on "overlayArrow"
                    // -> because Arrow might not be rendered to map at this point (if it does not exist already)
                    if(overlayType === 'Arrow'){
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

                    overlayArrow.updateFrom({
                        direction: arrowDirection,
                        foldback: arrowFoldback
                    });

                    // add endpoint overlays --------------------------------------------------------------------------
                    addEndpointOverlaySignatureLabel(sourceEndpoint, signatureTypeData.source);
                    addEndpointOverlaySignatureLabel(targetEndpoint, signatureTypeData.target);
                }else{
                    // connection is not 'wh' scope
                    if(connection.hasType(type)){
                        connection.removeType(type);
                    }
                }
            });
        });
    };

    /**
     * format json object with "time parts" into string
     * @param parts
     * @returns {string}
     */
    let formatTimeParts = parts => {
        let label = '';
        if(parts.days){
            label += parts.days + 'd ';
        }
        label += ('00' + parts.hours).slice(-2);
        label += ':' + ('00' + parts.min).slice(-2);
        return label;
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
     * git signature data that is linked to a connection for a mapId
     * @param mapElement
     * @param callback
     */
    let getConnectionSignatureData = (mapElement, callback) => {
        let mapOverlay = MapOverlayUtil.getMapOverlay(mapElement, 'info');
        let overlayConnectionIcon = mapOverlay.find('.pf-map-overlay-endpoint');

        showLoading(overlayConnectionIcon);

        let requestData = {
            mapId: mapElement.data('id'),
            addData : ['signatures'],
            filterData : ['signatures']
        };

        $.ajax({
            type: 'POST',
            url: Init.path.getMapConnectionData,
            data: requestData,
            dataType: 'json',
            context: {
                mapElement: mapElement,
                overlayConnectionIcon: overlayConnectionIcon
            }
        }).done(function(connectionsData){
            let map = getMapObjectFromMapElement(this.mapElement);
            callback(map, connectionsData);
        }).always(function(){
            hideLoading(this.overlayConnectionIcon);
        });
    };

    /**
     * showInfoSignatureOverlays
     * -> used by "refresh" overlays (hover) AND/OR initial menu trigger
     */
    $.fn.showInfoSignatureOverlays = function(){
        let mapElement = $(this);
        getConnectionSignatureData(mapElement, updateInfoSignatureOverlays);
    };

    /**
     * hideInfoSignatureOverlays
     * -> see showInfoSignatureOverlays()
     */
    $.fn.hideInfoSignatureOverlays = function(){
        let map = getMapObjectFromMapElement($(this));
        let type = 'info_signature';

        map.batch(function(){
            map.getAllConnections().forEach(function(connection){
                let overlayArrow = connection.getOverlay(MapOverlayUtil.config.connectionOverlayArrowId);

                if(overlayArrow){
                    overlayArrow.cleanup();
                }

                if(connection.hasType(type)){
                    connection.removeType(type, {}, true);
                }
            });

            map.selectEndpoints().removeOverlay(MapOverlayUtil.config.endpointOverlayId);
        });
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
                let mapElement = Util.getMapElementFromOverlay(this);
                let map = getMapObjectFromOverlayIcon(this);

                MapUtil.storeLocalData('map', mapElement.data('id'), 'filterScopes', []);
                MapUtil.filterMapByScopes(map, []);
            }
        },
        mapSnapToGrid: {
            title: 'active grid',
            trigger: 'active',
            class: 'pf-map-overlay-grid',
            iconClass: ['fas', 'fa-fw', 'fa-th']
        },
        mapMagnetizer: {
            title: 'active magnetizer',
            trigger: 'active',
            class: 'pf-map-overlay-magnetizer',
            iconClass: ['fas', 'fa-fw', 'fa-magnet']
        },
        systemRegion: {
            title: 'show regions',
            trigger: 'hover',
            class: 'pf-map-overlay-region',
            iconClass: ['fas', 'fa-fw', 'fa-tags'],
            hoverIntent: {
                over: function(e){
                    let mapElement = Util.getMapElementFromOverlay(this);
                    mapElement.find('.' + MapOverlayUtil.config.systemHeadClass).each(function(){
                        let systemHead = $(this);
                        // init popover if not already exists
                        if(!systemHead.data('bs.popover')){
                            let system = systemHead.parent();
                            systemHead.popover({
                                placement: 'right',
                                html: true,
                                trigger: 'manual',
                                container: mapElement,
                                title: false,
                                content: Util.getSystemRegionTable(
                                    system.data('region'),
                                    system.data('faction') || null
                                )
                            });
                        }
                        systemHead.setPopoverSmall();
                        systemHead.popover('show');
                    });
                },
                out: function(e){
                    let mapElement = Util.getMapElementFromOverlay(this);
                    mapElement.find('.' + MapOverlayUtil.config.systemHeadClass).popover('hide');
                }
            }
        },
        mapEndpoint: {
            title: 'refresh signature overlays',
            trigger: 'refresh',
            class: 'pf-map-overlay-endpoint',
            iconClass: ['fas', 'fa-fw', 'fa-link'],
            hoverIntent: {
                over: function(e){
                    let mapElement = Util.getMapElementFromOverlay(this);
                    mapElement.showInfoSignatureOverlays();
                },
                out: function(e){
                    // just "refresh" on hover
                }
            }
        },
        mapCompact: {
            title: 'compact layout',
            trigger: 'active',
            class: 'pf-map-overlay-compact',
            iconClass: ['fas', 'fa-fw', 'fa-compress']
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
                            '<i class="fas fa-fw fa-plus-square"></i>&nbsp;' + formatTimeParts(createdDiff),
                            '<i class="fas fa-fw fa-pen-square"></i>&nbsp;' + formatTimeParts(updatedDiff)
                        ];

                        // add label overlay --------------------------------------------------------------------------
                        connection.addOverlay([
                            'Label',
                            {
                                label: labels.join('<br>'),
                                id: MapOverlayUtil.config.connectionOverlayWhId,
                                cssClass: [MapOverlayUtil.config.componentOverlayClass, 'small'].join(' '),
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
            title: 'EOL timer',
            trigger: 'hover',
            class: 'pf-map-overlay-connection-eol',
            iconClass: ['far', 'fa-fw', 'fa-clock'],
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
                                label: '<i class="far fa-fw fa-clock"></i>&nbsp;' + formatTimeParts(diff),
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
     * @returns {*}
     */
    let setMapUpdateCounter = (mapOverlayTimer, percent, value) => {
        // check if counter already exists
        let counterChart = MapOverlayUtil.getMapCounter(mapOverlayTimer);

        if(counterChart.length === 0){
            // create new counter

            counterChart = $('<div>', {
                class: [Init.classes.pieChart.class, Init.classes.pieChart.pieChartMapCounterClass].join(' ')
            }).attr('data-percent', percent).append(
                $('<span>', {
                    text: value
                })
            );

            mapOverlayTimer.append(counterChart);

            // init counter
            counterChart.initMapUpdateCounter();

            // set tooltip
            mapOverlayTimer.attr('data-placement', 'left');
            mapOverlayTimer.attr('title', 'update counter');
            mapOverlayTimer.tooltip();
        }

        return counterChart;
    };

    /**
     * start the map update counter or reset
     */
    $.fn.startMapUpdateCounter = function(){
        let mapOverlayTimer = $(this);
        let counterChart = MapOverlayUtil.getMapCounter(mapOverlayTimer);

        let maxSeconds = MapOverlayUtil.config.logTimerCount;

        let counterChartLabel = counterChart.find('span');

        let percentPerCount = 100 / maxSeconds;

        // update counter
        let updateChart = function(tempSeconds){
            let pieChart = counterChart.data('easyPieChart');

            if(pieChart !== undefined){
                counterChart.data('easyPieChart').update( percentPerCount * tempSeconds);
            }
            counterChartLabel.text(tempSeconds);
        };

        // main timer function is called on any counter update
        let timer = function(mapUpdateCounter){
            // decrease timer
            let currentSeconds = counterChart.data('currentSeconds');
            currentSeconds--;
            counterChart.data('currentSeconds', currentSeconds);

            if(currentSeconds >= 0){
                // update counter
                updateChart(currentSeconds);
            }else{
                // hide counter and reset
                clearInterval(mapUpdateCounter);

                mapOverlayTimer.velocity('transition.whirlOut', {
                    duration: Init.animationSpeed.mapOverlay,
                    complete: function(){
                        counterChart.data('interval', false);
                        Util.getMapElementFromOverlay(mapOverlayTimer).trigger('pf:unlocked');
                    }
                });
            }
        };

        // get current seconds (in case the timer is already running)
        let currentSeconds = counterChart.data('currentSeconds');

        // start values for timer and chart
        counterChart.data('currentSeconds', maxSeconds);
        updateChart(maxSeconds);

        if(
            currentSeconds === undefined ||
            currentSeconds < 0
        ){
            // start timer
            let mapUpdateCounter = setInterval(() => {
                timer(mapUpdateCounter);
            }, 1000);

            // store counter interval
            counterChart.data('interval', mapUpdateCounter);

            // show overlay
            if(mapOverlayTimer.is(':hidden')){
                mapOverlayTimer.velocity('stop').velocity('transition.whirlIn', { duration: Init.animationSpeed.mapOverlay });
            }
        }
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
            for(let prop in options){
                if(options.hasOwnProperty(prop)){
                    let icon = $('<i>', {
                        class: options[prop].iconClass.concat( ['pull-right', options[prop].class] ).join(' ')
                    }).attr('title', options[prop].title).tooltip({
                        placement: 'bottom',
                        container: 'body',
                        delay: 150
                    });

                    // add "hover" action for some icons
                    if(
                        options[prop].trigger === 'hover' ||
                        options[prop].trigger === 'refresh'
                    ){
                        icon.hoverIntent(options[prop].hoverIntent);
                    }

                    // add "click" handler for some icons
                    if(options[prop].hasOwnProperty('onClick')){
                        icon.on('click', options[prop].onClick);
                    }

                    mapOverlayInfo.append(icon);
                }
            }
            parentElement.append(mapOverlayInfo);

            // reset map update timer
            setMapUpdateCounter(mapOverlayTimer, 100, MapOverlayUtil.config.logTimerCount);
        });
    };

    return {
        updateZoomOverlay: updateZoomOverlay,
        initMapDebugOverlays: initMapDebugOverlays
    };
});