/**
 *  map overlay functions
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/util'
], ($, Init, Util, MapUtil) => {
    'use strict';

    let config = {
        logTimerCount: 3,                                                   // map log timer in seconds

        // map
        mapWrapperClass: 'pf-map-wrapper',                                  // wrapper div (scrollable)

        // map overlay positions
        mapOverlayClass: 'pf-map-overlay',                                  // class for all map overlays
        mapOverlayTimerClass: 'pf-map-overlay-timer',                       // class for map overlay timer e.g. map timer
        mapOverlayInfoClass: 'pf-map-overlay-info',                         // class for map overlay info e.g. map info
        overlayLocalClass: 'pf-map-overlay-local',                          // class for map overlay "local" table

        // system
        systemHeadClass: 'pf-system-head',                                  // class for system head

        // overlay IDs
        connectionOverlayWhId: 'pf-map-connection-wh-overlay',              // connection WH overlay ID (jsPlumb)
        connectionOverlayEolId: 'pf-map-connection-eol-overlay',            // connection EOL overlay ID (jsPlumb)
        connectionOverlayArrowId: 'pf-map-connection-arrow-overlay',        // connection Arrows overlay ID (jsPlumb)

        endpointOverlayId: 'pf-map-endpoint-overlay',                       // endpoint overlay ID (jsPlumb)

        // overlay classes
        componentOverlayClass: 'pf-map-component-overlay',                  // class for "normal size" overlay

        connectionArrowOverlayClass: 'pf-map-connection-arrow-overlay',     // class for "connection arrow" overlay
        connectionDiamondOverlayClass: 'pf-map-connection-diamond-overlay'  // class for "connection diamond" overlay
    };

    /**
     *  get MapObject (jsPlumb) from mapElement
     * @param mapElement
     * @returns {*}
     */
    let getMapObjectFromMapElement = mapElement => {
        let Map = require('app/map/map');
        return Map.getMapInstance( mapElement.data('id') );
    };

    /**
     * get map object (jsPlumb) from iconElement
     * @param overlayIcon
     * @returns {*}
     */
    let getMapObjectFromOverlayIcon = overlayIcon => {
        let mapElement = Util.getMapElementFromOverlay(overlayIcon);

        return getMapObjectFromMapElement( mapElement );
    };

    /**
     * add overlays to connections (signature based data)
     * @param connections
     * @param connectionsData
     */
    let addConnectionsOverlay = (connections, connectionsData) => {
        let SystemSignatures = require('app/ui/module/system_signature');

        /**
         *  add label to endpoint
         * @param endpoint
         * @param label
         */
        let addEndpointOverlay = (endpoint, label) => {
            label = label.join(', ');

            endpoint.addOverlay([
                'Label',
                {
                    label: MapUtil.getEndpointOverlayContent(label),
                    id: config.endpointOverlayId,
                    cssClass: [config.componentOverlayClass, label.length ? 'small' : 'icon'].join(' '),
                    location: MapUtil.getLabelEndpointOverlayLocation(endpoint, label),
                    parameters: {
                        label: label
                    }
                }
            ]);
        };

        // loop through all map connections (get from DOM)
        for(let connection of connections){
            let connectionId        = connection.getParameter('connectionId');
            let sourceEndpoint      = connection.endpoints[0];
            let targetEndpoint      = connection.endpoints[1];

            let signatureTypeNames = {
                sourceLabels: [],
                targetLabels: []
            };

            // ... find matching connectionData (from Ajax)
            for(let connectionData of connectionsData){
                if(connectionData.id === connectionId){
                    signatureTypeNames = MapUtil.getConnectionDataFromSignatures(connection, connectionData);
                    // ... connection matched -> continue with next one
                    break;
                }
            }

            let sourceLabel =  signatureTypeNames.sourceLabels;
            let targetLabel =  signatureTypeNames.targetLabels;

            // add endpoint overlays ------------------------------------------------------
            addEndpointOverlay(sourceEndpoint, sourceLabel);
            addEndpointOverlay(targetEndpoint, targetLabel);

            // add arrow (connection) overlay that points from "XXX" => "K162" ------------
            let overlayType = 'Diamond'; // not specified
            let arrowDirection = 1;

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
            }else if(
                (sourceLabel.indexOf('K162') !== -1) ||
                (sourceLabel.length === 0 && targetLabel.indexOf('K162') === -1)
            ){
                // convert default arrow direction
                overlayType = 'Arrow';
                arrowDirection = -1;
            }else{
                // default arrow direction is fine
                overlayType = 'Arrow';
                arrowDirection = 1;
            }

            connection.addOverlay([
                overlayType,
                {
                    width: 12,
                    length: 15,
                    location: 0.5,
                    foldback: 0.85,
                    direction: arrowDirection,
                    id: config.connectionOverlayArrowId,
                    cssClass: (overlayType === 'Arrow') ? config.connectionArrowOverlayClass :  config.connectionDiamondOverlayClass
                }
            ]);

        }
    };

    /**
     * remove overviews from a Tooltip
     * @param endpoint
     * @param i
     */
    let removeEndpointOverlay = (endpoint, i) => {
        endpoint.removeOverlays(config.endpointOverlayId);
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
     * @param connections
     * @param callback
     */
    let getConnectionSignatureData = (mapElement, connections, callback) => {
        let mapOverlay = $(mapElement).getMapOverlay('info');
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
                connections: connections,
                overlayConnectionIcon: overlayConnectionIcon
            }
        }).done(function(connectionsData){
            // hide all connection before add them (refresh)
            this.mapElement.hideEndpointOverlays();
            // ... add overlays
            callback(this.connections, connectionsData);
        }).always(function(){
            hideLoading(this.overlayConnectionIcon);
        });
    };

    /**
     * showEndpointOverlays
     * -> used by "refresh" overlays (hover) AND/OR initial menu trigger
     */
    $.fn.showEndpointOverlays = function(){
        let mapElement = $(this);
        let map = getMapObjectFromMapElement(mapElement);
        let MapUtil = require('app/map/util');
        let connections = MapUtil.searchConnectionsByScopeAndType(map, 'wh', undefined, true);

        // get connection signature information ---------------------------------------
        getConnectionSignatureData(mapElement, connections, addConnectionsOverlay);
    };

    /**
     * hideEndpointOverlays
     * -> see showEndpointOverlays()
     */
    $.fn.hideEndpointOverlays = function(){
        let map = getMapObjectFromMapElement($(this));
        let MapUtil = require('app/map/util');
        let connections = MapUtil.searchConnectionsByScopeAndType(map, 'wh');

        for(let connection of connections){
            connection.removeOverlays(config.connectionOverlayArrowId);
            connection.endpoints.forEach(removeEndpointOverlay);
        }
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
                    mapElement.find('.' + config.systemHeadClass).each(function(){
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
                    mapElement.find('.' + config.systemHeadClass).popover('hide');
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
                    mapElement.showEndpointOverlays();
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
                    let MapUtil = require('app/map/util');
                    let connections = MapUtil.searchConnectionsByScopeAndType(map, 'wh');
                    let serverDate = Util.getServerTime();

                    // show connection overlays ---------------------------------------------------
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

                        // add label overlay ------------------------------------------------------
                        connection.addOverlay([
                            'Label',
                            {
                                label: labels.join('<br>'),
                                id: config.connectionOverlayWhId,
                                cssClass: [config.componentOverlayClass, 'small'].join(' '),
                                location: 0.35
                            }
                        ]);
                    }
                },
                out: function(e){
                    let map = getMapObjectFromOverlayIcon(this);
                    let MapUtil = require('app/map/util');
                    let connections = MapUtil.searchConnectionsByScopeAndType(map, 'wh');

                    for(let connection of connections){
                        connection.removeOverlays(config.connectionOverlayWhId);
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
                    let MapUtil = require('app/map/util');
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
                                id: config.connectionOverlayEolId,
                                cssClass: [config.componentOverlayClass, 'eol'].join(' '),
                                location: 0.25
                            }
                        ]);
                    }
                },
                out: function(e){
                    let map = getMapObjectFromOverlayIcon(this);
                    let MapUtil = require('app/map/util');
                    let connections = MapUtil.searchConnectionsByScopeAndType(map, 'wh', ['wh_eol']);

                    for(let connection of connections){
                        connection.removeOverlay(config.connectionOverlayEolId);
                    }
                }
            }
        }
    };

    /**
     * get map overlay element by type e.g. timer/counter, info - overlay
     * @param overlayType
     * @returns {*}
     */
    $.fn.getMapOverlay = function(overlayType){
        let mapWrapperElement = $(this).parents('.' + config.mapWrapperClass);

        let mapOverlay = null;
        switch(overlayType){
            case 'timer':
                mapOverlay = mapWrapperElement.find('.' + config.mapOverlayTimerClass);
                break;
            case 'info':
                mapOverlay = mapWrapperElement.find('.' + config.mapOverlayInfoClass);
                break;
            case 'local':
                mapOverlay = mapWrapperElement.find('.' + config.overlayLocalClass);
                break;
        }

        return mapOverlay;
    };

    /**
     * draws the map update counter to the map overlay timer
     * @param percent
     * @param value
     * @returns {*}
     */
    $.fn.setMapUpdateCounter = function(percent, value){

        let mapOverlayTimer = $(this);

        // check if counter already exists
        let counterChart = mapOverlayTimer.getMapCounter();

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
     * get the map counter chart from overlay
     * @returns {JQuery|*|T|{}|jQuery}
     */
    $.fn.getMapCounter = function(){
        return $(this).find('.' + Init.classes.pieChart.pieChartMapCounterClass);
    };

    $.fn.getMapOverlayInterval = function(){
        return $(this).getMapOverlay('timer').getMapCounter().data('interval');
    };

    /**
     * start the map update counter or reset
     */
    $.fn.startMapUpdateCounter = function(){

        let mapOverlayTimer = $(this);
        let counterChart = mapOverlayTimer.getMapCounter();

        let maxSeconds = config.logTimerCount;

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
     * init all map overlays on a "parent" element
     * @returns {*}
     */
    $.fn.initMapOverlays = function(){
        return this.each(function(){
            let parentElement = $(this);

            let mapOverlayTimer = $('<div>', {
                class: [config.mapOverlayClass, config.mapOverlayTimerClass].join(' ')
            });
            parentElement.append(mapOverlayTimer);

            // ------------------------------------------------------------------------------------
            // add map overlay info. after scrollbar is initialized
            let mapOverlayInfo = $('<div>', {
                class: [config.mapOverlayClass, config.mapOverlayInfoClass].join(' ')
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
            mapOverlayTimer.setMapUpdateCounter(100, config.logTimerCount);
        });
    };

});