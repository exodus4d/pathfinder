/**
 *  map overlay functions
 */

define([
    'jquery',
    'app/init',
    'app/util'
], function($, Init, Util) {

    'use strict';

    var config = {
        logTimerCount: 3,                                               // map log timer in seconds

        // map
        mapWrapperClass: 'pf-map-wrapper',                              // wrapper div (scrollable)

        // map overlays
        mapOverlayClass: 'pf-map-overlay',                              // class for all map overlays
        mapOverlayTimerClass: 'pf-map-overlay-timer',                   // class for map overlay timer e.g. map timer
        mapOverlayInfoClass: 'pf-map-overlay-info',                     // class for map overlay info e.g. map info

        // map overlay icons
        mapOverlayFilterClass: 'pf-map-overlay-filter',                 // class for "filter" icon within a overlay
        mapOverlayGridClass: 'pf-map-overlay-grid'                      // class for "grid" icon within a overlay

    };

    /**
     * get map overlay element by type e.g. timer/counter, info - overlay
     * @param overlayType
     * @returns {*}
     */
    $.fn.getMapOverlay = function(overlayType){

        var mapWrapperElement = $(this).parents('.' + config.mapWrapperClass);

        var mapOverlay = null;
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
     * @returns {*}
     */
    $.fn.setMapUpdateCounter = function(percent, value){

        var mapOverlayTimer = $(this);

        // check if counter already exists
        var counterChart = mapOverlayTimer.getMapCounter();

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

        var mapOverlayTimer = $(this);

        return mapOverlayTimer.find('.' + Init.classes.pieChart.pieChartMapCounterClass);
    };

    /**
     * start the map update counter or reset
     */
    $.fn.startMapUpdateCounter = function(){

        var mapOverlayTimer = $(this);
        var counterChart = mapOverlayTimer.getMapCounter();

        var maxSeconds = config.logTimerCount;

        var counterChartLabel = counterChart.find('span');

        var percentPerCount = 100 / maxSeconds;

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
            // decrease timer
            var currentSeconds = counterChart.data('currentSeconds');
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
        var currentSeconds = counterChart.data('currentSeconds');

        // start values for timer and chart
        counterChart.data('currentSeconds', maxSeconds);
        updateChart(maxSeconds);

        if(
            currentSeconds === undefined ||
            currentSeconds < 0
        ){
            // start timer
            var mapUpdateCounter = setInterval(timer, 1000);

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
     * @param iconName
     * @param viewType
     */
    $.fn.updateOverlayIcon = function(iconName, viewType){
        var mapOverlayInfo = $(this);

        var showOverlay = false;

        // look for the overlay icon that should be updated
        var iconElement = null;
        switch(iconName){
            case 'filter':
                iconElement = mapOverlayInfo.find('.' + config.mapOverlayFilterClass);
                break;
            case 'grid':
                iconElement = mapOverlayInfo.find('.' + config.mapOverlayGridClass);
                break;
        }

        if(iconElement){
            if(viewType === 'show'){
                showOverlay = true;
                iconElement.velocity('fadeIn');
            }else if(viewType === 'hide'){
                iconElement.hide();

                // check if ther is any visible icon remaining
                var visibleIcons = mapOverlayInfo.find('i:visible');
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
     * @returns {any|JQuery|*}
     */
    $.fn.initMapOverlays = function(){
        return this.each(function(){
            var parentElemtn = $(this);

            var mapOverlayTimer = $('<div>', {
                class: [config.mapOverlayClass, config.mapOverlayTimerClass].join(' ')
            });
            parentElemtn.append(mapOverlayTimer);

            // ---------------------------------------------------------------------------
            // add map overlay info. after scrollbar is initialized
            var mapOverlayInfo = $('<div>', {
                class: [config.mapOverlayClass, config.mapOverlayInfoClass].join(' ')
            }).append(
                $('<i>', {
                    class: ['fa', 'fa-fw', 'fa-filter', 'pull-right', config.mapOverlayFilterClass].join(' ')
                }).attr('title', 'active filter').tooltip({
                    placement: 'left',
                    container: 'body'
                })
            ).append(
                $('<i>', {
                    class: ['glyphicon', 'glyphicon-th', 'pull-right', config.mapOverlayGridClass].join(' ')
                }).attr('title', 'active grid').tooltip({
                    placement: 'left',
                    container: 'body'
                })
            );
            parentElemtn.append(mapOverlayInfo);

            // reset map update timer
            mapOverlayTimer.setMapUpdateCounter(100, config.logTimerCount);
        });
    };

});