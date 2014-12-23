/**
 * page structure
 */
define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'slidebars',
    'app/module_map'
], function($, Init, Util, Render, bootbox) {

    'use strict';

    var config = {

        // page structure slidebars-menu classes
        pageId: 'sb-site',
        pageSlidebarClass: 'sb-slidebar',
        pageSlidebarLeftClass: 'sb-left',                                       // class for left menu
        pageSlidebarRightClass: 'sb-right',                                     // class for right menu
        pageSlideLeftWidth: '150px',                                            // slide distance left menu
        pageSlideRightWidth: '150px',                                           // slide distance right menu

        // page structure
        pageClass: 'pf-site',

        // header
        pageHeaderId: 'pf-head',                                                // id for page head
        headClass: 'pf-head',                                                   // class for page head
        headMenuClass: 'pf-head-menu',                                          // class for page head menu button (left)
        headMapClass: 'pf-head-map',                                            // class for page head map button (right)

        // footer
        pageFooterId: 'pf-footer',                                              // id for page footer

        // map module
        mapModuleId: 'pf-map-module',                                           // main map module

        // system effect dialog
        systemEffectDialogWrapperClass: 'pf-system-effect-dialog-wrapper',      // class for system effect dialog

        // jump info dialog
        jumpInfoDialogClass: 'pf-jump-info-dialog',                             // class for jump info dialog

        // map legend dialog
        mapLegendScrollspyId: 'pf-legend-scrollspy',                            // id for map legend scrollspy
        mapLegendScrollspyNavClass: 'pf-legend-scrollspy-nav',                  // class for map legend scrollspy navigation
        mapLegendNavigationListItemClass: 'pf-legend-navigation-list-item',     // class for map legend li main navigation elements

        // helper element
        dynamicElementWrapperId: 'pf-dialog-wrapper'
    };

    var cache = {
        systemEffectDialog: false                                               // system effect info dialog
    };


    /**
     * load main page structure elements and navigation container into body
     */
    $.fn.loadPageStructure = function(){

        // menu left
        $(this).prepend(
            $('<div>', {
                class: [config.pageSlidebarClass, config.pageSlidebarLeftClass, 'sb-style-push', 'sb-width-custom'].join(' ')
            }).attr('data-sb-width', config.pageSlideLeftWidth)
        );

        // menu right
        $(this).prepend(
            $('<div>', {
                class: [config.pageSlidebarClass, config.pageSlidebarRightClass, 'sb-style-push', 'sb-width-custom'].join(' ')
            }).attr('data-sb-width', config.pageSlideRightWidth)
        );

        // main page
        $(this).prepend(
            $('<div>', {
                id: config.pageId,
                class: config.pageClass
            }).append(
                    $('<div>', {
                        id: config.mapModuleId
                    })
                ).append(
                    $('<div>', {
                        id: config.dynamicElementWrapperId
                    })
                )
        );

        // load header
        $('.' + config.pageClass).loadHeader();

        // load footer
        $('.' + config.pageClass).loadFooter();

        // load left menu
        $('.' + config.pageSlidebarLeftClass).loadLeftMenu();

        // load right menu
        $('.' + config.pageSlidebarRightClass).loadRightMenu();

        // set document observer for global events
        setDocumentObserver();
    };

    /**
     * load left menu content options
     */
    $.fn.loadLeftMenu = function(){

        $(this).append(
            $('<div>', {
                class: 'list-group'
            }).append(
                    $('<a>', {
                        class: 'list-group-item',
                        href: '#'
                    }).html('&nbsp;&nbsp;Home').prepend(
                            $('<i>',{
                                class: 'fa fa-home fa-fw'
                            })
                        )
                ).append(
                    $('<a>', {
                        class: 'list-group-item',
                        href: '#'
                    }).html('&nbsp;&nbsp;Effect info').prepend(
                            $('<i>',{
                                class: 'fa fa-cogs fa-fw'
                            })
                        ).on('click', function(){
                            $(document).triggerMenuEvent('ShowSystemEffectInfo');
                        })
                ).append(
                    $('<a>', {
                        class: 'list-group-item',
                        href: '#'
                    }).html('&nbsp;&nbsp;Jump info').prepend(
                            $('<i>',{
                                class: 'fa fa-space-shuttle fa-fw'
                            })
                        ).on('click', function(){
                            $(document).triggerMenuEvent('ShowJumpInfo');
                        })
                ).append(
                    $('<a>', {
                        class: 'list-group-item',
                        href: '#'
                    }).html('&nbsp;&nbsp;Notification test').prepend(
                            $('<i>',{
                                class: 'fa fa-bullhorn fa-fw'
                            })
                        ).on('click', function(){
                            $(document).triggerMenuEvent('NotificationTest');
                        })
                ).append(
                    $('<a>', {
                        class: 'list-group-item',
                        href: '#'
                    }).html('&nbsp;&nbsp;Logout').prepend(
                            $('<i>',{
                                class: 'fa fa-power-off fa-fw'
                            })
                        )
                )
        );
    };

    /**
     * load right content options
     */
    $.fn.loadRightMenu = function(){
        $(this).append(
            $('<div>', {
                class: 'list-group'
            }).append(
                    $('<a>', {
                        class: 'list-group-item',
                        href: '#'
                    }).html('&nbsp;&nbsp;Grid snap').prepend(
                            $('<i>',{
                                class: 'fa fa-th fa-fw'
                            })
                        ).on('click', function(){
                            $('#' + config.mapModuleId).getActiveMap().triggerMenuEvent('Grid', {button: this});
                        })
                ).append(
                    $('<a>', {
                        class: 'list-group-item',
                        href: '#'
                    }).html('&nbsp;&nbsp;Legend').prepend(
                            $('<i>',{
                                class: 'fa fa-info fa-fw'
                            })
                        ).on('click', function(){
                            $(document).triggerMenuEvent('Legend', {button: this});
                        })
                )
        );
    };

    $.fn.triggerMenuEvent = function(event, data){

        if(data === undefined){
            data = {};
        }

        $(this).trigger('pf:menu' + event, [data]);
    };

    /**
     * load page header
     */
    $.fn.loadHeader = function(){

        var pageElement = $(this);

        var moduleConfig = {
            name: 'modules/header',
            position: pageElement,
            link: 'prepend',
            functions: {
                after: function(){

                    // init slide menus
                    var slideMenu = new $.slidebars({
                        scrollLock: false
                    });
                    $('.' + config.headMenuClass).on('click', function() {
                        slideMenu.slidebars.toggle('left');
                    });

                    $('.' + config.headMapClass).on('click', function() {
                        slideMenu.slidebars.toggle('right');
                    });
                }
            }
        };

        var moduleData = {
            id: config.pageHeaderId,
            userName: 'Exodus 4D'
        };

        Render.showModule(moduleConfig, moduleData);
    };

    /**
     * load page footer
     */
    $.fn.loadFooter = function(){

        var pageElement = $(this);

        var moduleConfig = {
            name: 'modules/footer',
            position: pageElement,
            link: 'append',
            functions: {
                after: function(){

                }
            }
        };

        var moduleData = {
            id: config.pageFooterId
        };

        Render.showModule(moduleConfig, moduleData);

    };

    /**
     * catch all global document events
     */
    var setDocumentObserver = function(){
        $(document).on('pf:menuShowSystemEffectInfo', function(e){
            // show system effects info box
            showSystemEffectInfoDialog();
        });

        $(document).on('pf:menuShowJumpInfo', function(e){
            // show system effects info box
            showJumpInfoDialog();
        });

        $(document).on('pf:menuNotificationTest', function(e){
            // show system effects info box
            notificationTest();
        });

        $(document).on('pf:menuLegend', function(e){
            // show map legend
            showMaplegend();
        });

        showMaplegend();
    };

    /**
     * shows the map legend modal dialog
     */
    var showMaplegend = function(){

        requirejs(['text!templates/modules/map_legend_dialog.html', 'lib/mustache'], function(template, Mustache) {

            var data = {
                scrollspyId: config.mapLegendScrollspyId,
                scrollspyNavClass: config.mapLegendScrollspyNavClass,
                scrollspyNavLiClass: config.mapLegendNavigationListItemClass,
                pieChartClass : Init.classes.pieChart.pieChartMapCounterClass,
                mapCounterClass : Init.classes.pieChart.pieChartMapCounterClass
            };

            var content = Mustache.render(template, data);

            // show dialog
            var mapLegendDialog = bootbox.dialog({
                title: 'Map legend',
                message: content,
                className: 'medium',
                buttons: {
                    success: {
                        label: 'close',
                        className: "btn-primary",
                        callback: function() {
                            $(mapLegendDialog).modal('hide');
                        }
                    }
                },
                show: false
            });

            mapLegendDialog.modal('show');

            mapLegendDialog.on('shown.bs.modal', function(e) {
                // modal os open
            });

            var scrollspyElement = $('#' + config.mapLegendScrollspyId);

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
                        var mainNavigationLinks = $('.' + config.mapLegendScrollspyNavClass).find('a');
                        // text anchor links
                        var subNavigationLinks = scrollspyElement.find('a[data-target]');

                        var navigationLinks = mainNavigationLinks.add(subNavigationLinks);

                        navigationLinks.on('click', function(e){
                            e.preventDefault();

                            // scroll to anchor
                            scrollspyElement.mCustomScrollbar("scrollTo", $(this).attr('data-target'));

                            var mainNavigationLiElement = $(this).parent('.' + config.mapLegendNavigationListItemClass);

                            // if link is a main navigation link (not an anchor link)
                            if(mainNavigationLiElement.length > 0){
                                // remove all active classes
                                $('.' + config.mapLegendScrollspyNavClass).find('li').removeClass('active');

                                // set new active class
                                $(this).parent().addClass('active');
                            }

                        });

                    }
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

    /**
     * shows a test notification for desktop messages
     */
    var notificationTest = function(){
        Util.showNotify({title: 'Test Notification', text: 'Accept browser security question'}, {desktop: true, stack: 'barBottom'});
    };

    /**
     * show jump info dialog
     */
    var showJumpInfoDialog = function(){

        requirejs(['text!templates/modules/jump_info_dialog.html', 'lib/mustache'], function(template, Mustache) {

            var data = {};

            var content = Mustache.render(template, data);

            var signatureReaderDialog = bootbox.dialog({
                className: config.jumpInfoDialogClass,
                title: 'Wormhole jump information',
                message: content
            });

        });

    };

    /**
     * show system effect dialog
     */
    var showSystemEffectInfoDialog = function(){

        // cache table structure
        if(!cache.systemEffectDialog){

            var dialogWrapperElement = $('<div>', {
                class: config.systemEffectDialogWrapperClass
            });

            $.each( Init.systemEffects.wh, function( effectName, effectData ) {

                var table = $('<table>', {
                    class: ['table', 'table-condensed'].join(' ')
                });

                var tbody = $('<tbody>');
                var thead = $('<thead>');

                var rows = [];

                // get formatted system effect name
                var systemEffectName = Util.getEffectInfoForSystem(effectName, 'name');
                var systemEffectClass = Util.getEffectInfoForSystem(effectName, 'class');

                $.each( effectData, function( areaId, areaData ) {

                    if(areaId === '1'){
                        rows.push( $('<tr>') );
                        thead.append( rows[0] );

                        rows[0].append(
                            $('<td>').html( '&nbsp;&nbsp;' + systemEffectName).prepend(
                                $('<i>', {
                                    class: ['fa', 'fa-square', 'fa-fw', systemEffectClass].join(' ')
                                })
                            )
                        );
                    }

                    rows[0].append( $('<td>', {
                        class: ['text-right', 'col-xs-1'].join(' ')
                    }).text( 'C' + areaId ));

                    $.each( areaData, function( i, data ) {

                        if(areaId === '1'){
                            rows.push( $('<tr>') );
                            tbody.append(rows[i + 1]);

                            // add label
                            rows[i + 1].append( $('<td>').text( data.effect ));
                        }


                        rows[i + 1].append( $('<td>', {
                            class: 'text-right'
                        }).text( data.value ));
                    });


                });

                dialogWrapperElement.append( table.append( thead ).append( tbody ) );

                cache.systemEffectDialog = dialogWrapperElement;
            });
        }

        bootbox.dialog({
            title: 'System effect information',
            message: cache.systemEffectDialog
        });

    };


});