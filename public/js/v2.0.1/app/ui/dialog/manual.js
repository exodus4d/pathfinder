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
                pieChartClass : Init.classes.pieChart.class,
                mapCounterClass : Init.classes.pieChart.pieChartMapCounterClass,
                imgSrcBubble: `${Util.imgRoot()}svg/bubble.svg`,
            };

            let content = Mustache.render(template, data);

            // show dialog
            let manualDialog = bootbox.dialog({
                title: 'Manual',
                message: content,
                size: 'large',
                buttons: {
                    close: {
                        label: 'close',
                        className: 'btn-default'
                    }
                },
                show: false
            });

            let dialogEl = manualDialog[0];

            // scroll breakpoints
            let scrollBreakpointElements = dialogEl.getElementsByClassName('pf-manual-scroll-break');

            // scroll navigation links
            let scrollNavLiElements = dialogEl.getElementsByClassName(config.dialogNavigationListItemClass);

            let scrollspyElement = dialogEl.querySelector(`#${config.mapManualScrollspyId}`);

            // set navigation button observer
            let mainNavigationLinks = dialogEl.querySelectorAll(`.${config.dialogNavigationClass} a`);
            // text anchor links
            let subNavigationLinks = scrollspyElement.querySelectorAll('a[data-target]');
            let navigationLinks = [...mainNavigationLinks, ...subNavigationLinks];

            manualDialog.on('shown.bs.modal', e => {
                // disable on scroll event
                let disableOnScrollEvent = false;

                let whileScrolling = () => {
                    if(disableOnScrollEvent === false){
                        let scrollOffset = scrollspyElement.mcs.top;
                        for(let [i, scrollBreakpointEl] of Object.entries(scrollBreakpointElements)){
                            let offset = scrollBreakpointEl.offsetTop;
                            if((offset + scrollOffset) > 0){
                                if(!scrollNavLiElements[i].classList.contains('active')){
                                    // remove all active classes
                                    // -> remove focus on links
                                    [...scrollNavLiElements].forEach(el => {
                                        el.classList.remove('active');
                                        el.getElementsByTagName('a')[0].blur();
                                    });

                                    scrollNavLiElements[i].classList.add('active');
                                }
                                break;
                            }
                        }
                    }
                };

                // init scrollbar
                $(scrollspyElement).mCustomScrollbar({
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
                            let counterEl = scrollspyElement.querySelector(`.${data.mapCounterClass}`);
                            $(counterEl).initMapUpdateCounter();

                            $(navigationLinks).on('click', function(e){
                                e.preventDefault();
                                disableOnScrollEvent = true;

                                // scroll to anchor
                                $(scrollspyElement).mCustomScrollbar('scrollTo', $(this).attr('data-target'));

                                let mainNavigationLiElement = this.closest(`.${config.dialogNavigationListItemClass}`);

                                whileScrolling();

                                // if link is a main navigation link (not an anchor link)
                                if(mainNavigationLiElement){
                                    // remove all active classes
                                    [...scrollNavLiElements].forEach(el => el.classList.remove('active'));

                                    // set new active class
                                    this.parentNode.classList.add('active');
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

            manualDialog.on('hide.bs.modal', e => {
                let dialogEl = e.target;

                $(navigationLinks).off('click');

                $(dialogEl.querySelector(`#${config.mapManualScrollspyId}`))
                    .mCustomScrollbar('destroy');
            });

            // show dialog
            manualDialog.modal('show');
        });

    };

});