/**
 *  map manual dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
], function($, Init, Util, Render, bootbox) {

    'use strict';

    var config = {
        // global dialog
        dialogNavigationClass: 'pf-dialog-navigation-list',                     // class for dialog navigation bar
        dialogNavigationListItemClass: 'pf-dialog-navigation-list-item',        // class for map manual li main navigation elements

        // map manual dialog
        mapManualScrollspyId: 'pf-manual-scrollspy'                             // id for map manual scrollspy
    };

    /**
     * shows the map manual modal dialog
     */
    $.fn.showMapManual = function(){

        requirejs(['text!templates/dialog/map_manual.html', 'mustache'], function(template, Mustache) {

            var data = {
                dialogNavigationClass: config.dialogNavigationClass,
                dialogNavLiClass: config.dialogNavigationListItemClass,
                scrollspyId: config.mapManualScrollspyId,
                pieChartClass : Init.classes.pieChart.pieChartMapCounterClass,
                mapCounterClass : Init.classes.pieChart.pieChartMapCounterClass
            };

            var content = Mustache.render(template, data);

            // show dialog
            var mapManualDialog = bootbox.dialog({
                title: 'Manual',
                message: content,
                buttons: {
                    success: {
                        label: 'close',
                        className: 'btn-default',
                        callback: function() {
                            $(mapManualDialog).modal('hide');
                        }
                    }
                },
                show: true
            });

            // modal offset top
            var modalOffsetTop = 200;

            // disable on scroll event
            var disableOnScrollEvent = false;

            // scroll breakpoints
            var scrolLBreakpointElements = null;
            // scroll navigation links
            var scrollNavLiElements = null;

            mapManualDialog.on('shown.bs.modal', function(e) {
                // modal on open
                scrolLBreakpointElements = $('.pf-manual-scroll-break');
                scrollNavLiElements = $('.' + config.dialogNavigationListItemClass);
            });

            var scrollspyElement = $('#' + config.mapManualScrollspyId);

            var whileScrolling = function(){

                if(disableOnScrollEvent === false){
                    for(var i = 0; i < scrolLBreakpointElements.length; i++){
                        var offset = $(scrolLBreakpointElements[i]).offset().top;

                        if( (offset - modalOffsetTop) > 0){

                            if(! $( scrollNavLiElements[i]).hasClass('active')){
                                // remove all active classes
                                scrollNavLiElements.removeClass('active');
                                // remove focus on links
                                scrollNavLiElements.find('a').blur();

                                $( scrollNavLiElements[i]).addClass('active');
                            }
                            break;
                        }
                    }
                }
            };

            // init scrollbar
            scrollspyElement.mCustomScrollbar({
                axis: 'y',
                theme: 'light-thick',
                scrollInertia: 200,
                autoExpandScrollbar: false,
                scrollButtons:{
                    scrollAmount: 30,
                    enable: true
                },
                advanced: {
                    updateOnBrowserResize: true,
                    updateOnContentResize: true
                },
                callbacks:{
                    onInit: function(){
                        // init fake-map update counter
                        scrollspyElement.find('.' + data.mapCounterClass).initMapUpdateCounter();

                        // set navigation button observer
                        var mainNavigationLinks = $('.' + config.dialogNavigationClass).find('a');
                        // text anchor links
                        var subNavigationLinks = scrollspyElement.find('a[data-target]');

                        var navigationLinks = mainNavigationLinks.add(subNavigationLinks);

                        navigationLinks.on('click', function(e){
                            e.preventDefault();

                            disableOnScrollEvent = true;

                            // scroll to anchor
                            scrollspyElement.mCustomScrollbar("scrollTo", $(this).attr('data-target'));

                            var mainNavigationLiElement = $(this).parent('.' + config.dialogNavigationListItemClass);


                            whileScrolling();

                            // if link is a main navigation link (not an anchor link)

                            if(mainNavigationLiElement.length > 0){
                                // remove all active classes
                                scrollNavLiElements.removeClass('active');

                                // set new active class
                                $(this).parent().addClass('active');
                            }

                        });

                    },
                    onScroll: function(){
                        disableOnScrollEvent = false;

                        whileScrolling();
                    },
                    whileScrolling: whileScrolling
                },
                mouseWheel:{
                    enable: true,
                    scrollAmount: 200,
                    axis: 'y',
                    preventDefault: true // do not scroll parent at the end
                },
                scrollbarPosition: 'outsite',
                autoDraggerLength: true
            });

        });

    };

});