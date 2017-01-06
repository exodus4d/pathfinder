/**
 *  map overlay functions
 */

define([
    'jquery',
    'app/init',
    'app/util'
], function($, Init, Util) {

    'use strict';

    let config = {
        logTimerCount: 3,                                               // map log timer in seconds

        // map
        mapClass: 'pf-map',                                             // class for all maps
        mapWrapperClass: 'pf-map-wrapper',                              // wrapper div (scrollable)

        // map overlays
        mapOverlayClass: 'pf-map-overlay',                              // class for all map overlays
        mapOverlayTimerClass: 'pf-map-overlay-timer',                   // class for map overlay timer e.g. map timer
        mapOverlayInfoClass: 'pf-map-overlay-info',                     // class for map overlay info e.g. map info

        // system
        systemHeadClass: 'pf-system-head',                              // class for system head

        // connection
        connectionOverlayEolId: 'overlayEol'                            // connection overlay ID (jsPlumb)
    };


    /**
     * get mapElement from overlay or any child of that
     * @param mapOverlay
     * @returns {JQuery}
     */
    let getMapFromOverlay = function(mapOverlay){
        return $(mapOverlay).parents('.' + config.mapWrapperClass).find('.' + config.mapClass);
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
            iconClass: ['fa', 'fa-fw', 'fa-filter']
        },
        mapSnapToGrid: {
            title: 'active grid',
            trigger: 'active',
            class: 'pf-map-overlay-grid',
            iconClass: ['glyphicon', 'glyphicon-th']
        },
        mapMagnetizer: {
            title: 'active magnetizer',
            trigger: 'active',
            class: 'pf-map-overlay-magnetizer',
            iconClass: ['fa', 'fa-fw', 'fa-magnet']
        },
        systemRegion: {
            title: 'show regions',
            trigger: 'hover',
            class: 'pf-map-overlay-region',
            iconClass: ['fa', 'fa-fw', 'fa-tags'],
            hoverIntent: {
                over: function(e){
                    let mapElement = getMapFromOverlay(this);
                    mapElement.find('.' + config.systemHeadClass).each(function(){
                        let system = $(this);
                        // init tooltip if not already exists
                        if ( !system.data('bs.tooltip') ){
                            system.tooltip({
                                container: mapElement,
                                placement: 'right',
                                title: function(){
                                    return $(this).parent().data('region');
                                },
                                trigger: 'manual'
                            });
                        }
                        system.tooltip('show');
                    });
                },
                out: function(e){
                    let mapElement = getMapFromOverlay(this);
                    mapElement.find('.' + config.systemHeadClass).tooltip('hide');
                }
            }
        },
        systemConnectionTimer: {
            title: 'show EOL timer',
            trigger: 'hover',
            class: 'pf-map-overlay-connection-timer',
            iconClass: ['fa', 'fa-fw', 'fa-clock-o'],
            hoverIntent: {
                over: function(e){
                    let mapElement = getMapFromOverlay(this);
                    let MapUtil = require('app/map/util');
                    let Map = require('app/map/map');
                    let map = Map.getMapInstance( mapElement.data('id') );
                    let connections = MapUtil.searchConnectionsByScopeAndType(map, 'wh', ['wh_eol']);
                    let serverDate = Util.getServerTime();

                    for (let connection of connections) {
                        let eolTimestamp = connection.getParameter('eolUpdated');
                        let eolDate = Util.convertTimestampToServerTime(eolTimestamp);
                        let diff = Util.getTimeDiffParts(eolDate, serverDate);

                        // format overlay label
                        let label = '';
                        if(diff.days){
                            label += diff.days + 'd ';
                        }
                        label += ('00' + diff.hours).slice(-2);
                        label += ':' + ('00' + diff.min).slice(-2);

                        connection.addOverlay([
                            'Label',
                            {
                                label: '<i class="fa fa-fw fa-clock-o"></i>&nbsp;' + label,
                                id: config.connectionOverlayEolId,
                                cssClass: ['pf-map-connection-overlay', 'eol'].join(' '),
                                location: 0.25
                            }
                        ]);
                    }
                },
                out: function(e){
                    let mapElement = getMapFromOverlay(this);
                    let MapUtil = require('app/map/util');
                    let Map = require('app/map/map');
                    let map = Map.getMapInstance( mapElement.data('id') );
                    let connections = MapUtil.searchConnectionsByScopeAndType(map, 'wh', ['wh_eol']);

                    for (let connection of connections) {
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
     * get the map counter chart by an overlay
     * @returns {*}
     */
    $.fn.getMapCounter = function(){

        let mapOverlayTimer = $(this);

        return mapOverlayTimer.find('.' + Init.classes.pieChart.pieChartMapCounterClass);
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
                if(options[option].trigger === 'active'){
                    iconElement.addClass('active');
                }

                // check if icon is not already visible
                // -> prevents unnecessary "show" animation
                if( !iconElement.data('visible') ){
                    // display animation for icon
                    iconElement.velocity({
                        opacity: [0.8, 0],
                        scale: [1, 0],
                        width: ['26px', 0],
                        marginLeft: ['3px', 0]
                    },{
                        duration: 240,
                        easing: 'easeInOutQuad'
                    });

                    iconElement.data('visible', true);
                }
            }else if(viewType === 'hide'){
                iconElement.removeClass('active').velocity('reverse');
                iconElement.data('visible', false);

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

            // ---------------------------------------------------------------------------
            // add map overlay info. after scrollbar is initialized
            let mapOverlayInfo = $('<div>', {
                class: [config.mapOverlayClass, config.mapOverlayInfoClass].join(' ')
            });

            // add all overlay elements
            for (let prop in options) {
                if(options.hasOwnProperty(prop)){
                    let icon = $('<i>', {
                        class: options[prop].iconClass.concat( ['pull-right', options[prop].class] ).join(' ')
                    }).attr('title', options[prop].title).tooltip({
                        placement: 'bottom',
                        container: 'body',
                        delay: 150
                    });

                    // add "hover" action for some icons
                    if(options[prop].trigger === 'hover'){
                        icon.hoverIntent(options[prop].hoverIntent);
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