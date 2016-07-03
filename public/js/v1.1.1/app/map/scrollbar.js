/**
 * Created by Exodus on 26.06.2016.
 */
define([
    'jquery',
    'app/init',
    'app/util'
], function($, Init, Util) {
    'use strict';

    /**
     * init map scrollbar
     * @param config
     * @returns {*}
     */
    $.fn.initCustomScrollbar = function(config){

        // default config -------------------------------------------------------------------------
        var defaultConfig = {
            axis: 'x',
            theme: 'light-thick',
            scrollInertia: 300,
            autoExpandScrollbar: false,
            scrollButtons:{
                scrollAmount: 30,
                enable: true
            },
            callbacks:{
                onTotalScrollOffset: 0,
                onTotalScrollBackOffset: 0,
                alwaysTriggerOffsets: true
            },

            advanced: {
                updateOnBrowserResize: true,
                updateOnContentResize: true,
                autoExpandHorizontalScroll: true,
                autoScrollOnFocus: "div"
            },
            mouseWheel:{
                enable: false, // scroll weel currently disabled
                scrollAmount: 'auto',
                axis: 'x',
                preventDefault: true
            },
            scrollbarPosition: 'inside',
            autoDraggerLength: true
            //autoHideScrollbar: false
        };

        // init -----------------------------------------------------------------------------------
        config = $.extend(true, {}, defaultConfig, config);

        return this.each(function(){
            var scrollableElement = $(this);

            // prevent multiple initialization
            scrollableElement.mCustomScrollbar('destroy');

            // init custom scrollbars
            scrollableElement.mCustomScrollbar(config);
        });
    };

    /**
     * scroll to a specific position in the map
     * demo: http://manos.malihu.gr/repository/custom-scrollbar/demo/examples/scrollTo_demo.html
     * @returns {*} // string or id
     */
    $.fn.scrollToX = function(position){
        return this.each(function(){
            $(this).mCustomScrollbar('scrollTo', position);
        });
    };
});