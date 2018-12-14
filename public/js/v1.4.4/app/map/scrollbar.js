/**
 * Created by Exodus on 26.06.2016.
 */
define([
    'jquery',
    'app/init',
    'app/util',
    'mousewheel',
    'customScrollbar'
], ($, Init, Util) => {
    'use strict';

    /**
     * init map scrollbar
     * @param config
     */
    $.fn.initCustomScrollbar = function(config){

        // default config -------------------------------------------------------------------------
        let defaultConfig = {
            axis: 'yx',
            theme: 'light-3' ,
            scrollInertia: 300,
            autoExpandScrollbar: false,
            scrollButtons:{
                enable: true,
                scrollAmount: 30,
                scrollType: 'stepless'
            },
            callbacks: {
                onTotalScrollOffset: 0,
                onTotalScrollBackOffset: 0,
                alwaysTriggerOffsets: true
            },

            advanced: {
                updateOnContentResize: true,
                autoExpandHorizontalScroll: true,
                //autoExpandHorizontalScroll: 2,
                autoScrollOnFocus: 'div',
            },
            mouseWheel: {
                enable: false, // scroll wheel currently disabled
                scrollAmount: 'auto',
                axis: 'x',
                preventDefault: true
            },
            keyboard: {
                enable: false,  // not working with pathfinder "shortcuts"
                scrollType: 'stepless',
                scrollAmount: 'auto'
            },
            scrollbarPosition: 'inside',
            autoDraggerLength: true,
            autoHideScrollbar: false
        };

        // init -----------------------------------------------------------------------------------
        config = $.extend(true, {}, defaultConfig, config);

        return this.each(function(){
            let mapWrapperElement = $(this);

            // prevent multiple initialization
            mapWrapperElement.mCustomScrollbar('destroy');

            // init custom scrollbars
            mapWrapperElement.mCustomScrollbar(config);
        });
    };

    /**
     * scroll to a specific position on map
     * demo: http://manos.malihu.gr/repository/custom-scrollbar/demo/examples/scrollTo_demo.html
     * @param position
     */
    $.fn.scrollToPosition = function(position){
        return this.each(function(){
            $(this).mCustomScrollbar('scrollTo', position);
        });
    };

    /**
     * scroll to a specific system on map
     * -> subtract some offset for tooltips/connections
     * @param position
     * @returns {*}
     */
    $.fn.scrollToSystem = function(position){
        position = getOffsetPosition(position, {x: -15, y: -35});
        return this.each(function(){
            $(this).mCustomScrollbar('scrollTo', position);
        });
    };

    /**
     * add/subtract offset coordinates from position
     * -> no negative values returned
     * @param position
     * @param offset
     * @returns {{x: number, y: number}}
     */
    let getOffsetPosition = (position, offset) => {
        return {
            x: Math.max(0, position.x + offset.x),
            y: Math.max(0, position.y + offset.y)
        };
    };
});