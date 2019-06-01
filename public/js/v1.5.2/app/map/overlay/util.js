/**
 *  map overlay util functions
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/util'
], ($, Init, Util) => {
    'use strict';

    let config = {
        logTimerCount: 3,                                                                   // map log timer in seconds

        mapWrapperClass: 'pf-map-wrapper',                                                  // wrapper div (scrollable)

        // map overlays sections
        mapOverlayClass: 'pf-map-overlay',                                                  // class for all map overlays
        mapOverlayTimerClass: 'pf-map-overlay-timer',                                       // class for map overlay timer e.g. map timer
        mapOverlayZoomClass: 'pf-map-overlay-zoom',                                         // class for map overlay zoom
        mapOverlayInfoClass: 'pf-map-overlay-info',                                         // class for map overlay info e.g. map info
        overlayLocalClass: 'pf-map-overlay-local',                                          // class for map overlay "local" table

        // system
        systemHeadClass: 'pf-system-head',                                                  // class for system head

        // connection overlay ids (they are not unique like CSS ids!)
        connectionOverlayArrowId: 'pf-map-connection-arrow-overlay',                        // connection Arrows overlay ID (jsPlumb)
        connectionOverlayWhId: 'pf-map-connection-wh-overlay',                              // connection WH overlay ID (jsPlumb)
        connectionOverlayEolId: 'pf-map-connection-eol-overlay',                            // connection EOL overlay ID (jsPlumb)

        debugOverlayId: 'pf-map-debug-overlay',                                             // connection/endpoint overlay ID (jsPlumb)

        endpointOverlayId: 'pf-map-endpoint-overlay',                                       // endpoint overlay ID (jsPlumb)

        // connection overlay classes classes
        componentOverlayClass: 'pf-map-component-overlay',                                  // class for "normal size" overlay

        connectionArrowOverlaySuccessClass: 'pf-map-connection-arrow-overlay-success',      // class for "success" arrow overlays
        connectionArrowOverlayDangerClass: 'pf-map-connection-arrow-overlay-danger',        // class for "danger" arrow overlays

        // zoom overlay
        zoomOverlayUpClass: 'pf-zoom-overlay-up',
        zoomOverlayDownClass: 'pf-zoom-overlay-down',
        zoomOverlayValueClass: 'pf-zoom-overlay-value'
    };

    /**
     * get map overlay element by type e.g. timer/counter, info - overlay
     * @param element
     * @param overlayType
     * @returns {null}
     */
    let getMapOverlay = (element, overlayType) => {
        let mapWrapperElement = $(element).parents('.' + config.mapWrapperClass);

        let mapOverlay = null;
        switch(overlayType){
            case 'timer':
                mapOverlay = mapWrapperElement.find('.' + config.mapOverlayTimerClass);
                break;
            case 'info':
                mapOverlay = mapWrapperElement.find('.' + config.mapOverlayInfoClass);
                break;
            case 'zoom':
                mapOverlay = mapWrapperElement.find('.' + config.mapOverlayZoomClass);
                break;
            case 'local':
                mapOverlay = mapWrapperElement.find('.' + config.overlayLocalClass);
                break;
        }

        return mapOverlay;
    };

    /**
     * get the map counter chart from overlay
     * @param element
     * @returns {jQuery}
     */
    let getMapCounter = element => $(element).find('.' + Init.classes.pieChart.pieChartMapCounterClass);

    /**
     * get interval value from map timer overlay
     * @param element
     * @returns {*}
     */
    let getMapOverlayInterval = element => getMapCounter(getMapOverlay(element, 'timer')).data('interval');

    return {
        config: config,
        getMapOverlay: getMapOverlay,
        getMapCounter: getMapCounter,
        getMapOverlayInterval: getMapOverlayInterval
    };
});