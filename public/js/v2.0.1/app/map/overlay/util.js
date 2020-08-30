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
        let areaMap = $(element).closest('.' + Util.getMapTabContentAreaClass('map'));

        let mapOverlay = null;
        switch(overlayType){
            case 'timer':
                mapOverlay = areaMap.find('.' + config.mapOverlayTimerClass);
                break;
            case 'info':
                mapOverlay = areaMap.find('.' + config.mapOverlayInfoClass);
                break;
            case 'zoom':
                mapOverlay = areaMap.find('.' + config.mapOverlayZoomClass);
                break;
            case 'local':
                mapOverlay = areaMap.find('.' + config.overlayLocalClass);
                break;
        }

        return mapOverlay;
    };

    /**
     * get mapElement from overlay or any child of that
     * @param mapOverlay
     * @returns {jQuery}
     */
    let getMapElementFromOverlay = mapOverlay => {
        return $(mapOverlay).closest('.' + Util.getMapTabContentAreaClass('map')).find('.' + Util.config.mapClass);
    };

    /**
     * get the map counter chart from overlay
     * @param element
     * @returns {Element}
     */
    let getMapCounter = element => element.querySelector(`.${Init.classes.pieChart.pieChartMapCounterClass}`);

    /**
     * if there is an "active" (connected) counter task
     * -> lock overlay
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    let isMapCounterOverlayActive = element => {
        let mapOverlay = getMapOverlay(element, 'timer');
        if(mapOverlay){
            let mapCounter = getMapCounter(mapOverlay[0]);
            if(mapCounter && mapCounter.getData('counterTask')){
                return mapCounter.getData('counterTask').isConnected();
            }
        }
        return false;
    };

    return {
        config: config,
        getMapOverlay: getMapOverlay,
        getMapElementFromOverlay: getMapElementFromOverlay,
        getMapCounter: getMapCounter,
        isMapCounterOverlayActive: isMapCounterOverlayActive
    };
});