/**
 *  map manual dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox',
], ($, Init, Util, bootbox) => {

    'use strict';

    let config = {
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

        requirejs(['text!templates/dialog/map_manual.html', 'mustache'], (template, Mustache) => {

            let data = {
                dialogNavigationClass: config.dialogNavigationClass,
                dialogNavLiClass: config.dialogNavigationListItemClass,
                scrollspyId: config.mapManualScrollspyId,
                pieChartClass : Init.classes.pieChart.pieChartMapCounterClass,
                mapCounterClass : Init.classes.pieChart.pieChartMapCounterClass
            };

            let content = Mustache.render(template, data);

            // show dialog
            let mapManualDialog = bootbox.dialog({
                title: 'Manual',
                message: content,
                size: 'large',
                buttons: {
                    success: {
                        label: 'close',
                        className: 'btn-default',
                        callback: function(){
                            $(mapManualDialog).modal('hide');
                        }
                    }
                },
                show: true
            });

            // modal offset top
            let modalOffsetTop = 200;

            // disable on scroll event
            let disableOnScrollEvent = false;

            // scroll breakpoints
            let scrollBreakpointElements = $('.pf-manual-scroll-break');
            // scroll navigation links
            let scrollNavLiElements = $('.' + config.dialogNavigationListItemClass);

            let scrollspyElement = $('#' + config.mapManualScrollspyId);

            let whileScrolling = function(){

                if(disableOnScrollEvent === false){
                    for(let i = 0; i < scrollBreakpointElements.length; i++){
                        let offset = $(scrollBreakpointElements[i]).offset().top;

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
                theme: 'light-3',
                scrollInertia: 200,
                autoExpandScrollbar: false,
                scrollButtons:{
                    enable: true,
                    scrollAmount: 30
                },
                advanced: {
                    updateOnContentResize: true
                },
                callbacks:{
                    onInit: function(){
                        // init fake-map update counter
                        scrollspyElement.find('.' + data.mapCounterClass).initMapUpdateCounter();

                        // set navigation button observer
                        let mainNavigationLinks = $('.' + config.dialogNavigationClass).find('a');
                        // text anchor links
                        let subNavigationLinks = scrollspyElement.find('a[data-target]');

                        let navigationLinks = mainNavigationLinks.add(subNavigationLinks);

                        navigationLinks.on('click', function(e){
                            e.preventDefault();

                            disableOnScrollEvent = true;

                            // scroll to anchor
                            scrollspyElement.mCustomScrollbar('scrollTo', $(this).attr('data-target'));

                            let mainNavigationLiElement = $(this).parent('.' + config.dialogNavigationListItemClass);


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