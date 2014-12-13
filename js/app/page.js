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
        pageSlidebarLeftClass: 'sb-left',
        pageSlidebarRightClass: 'sb-right',
        pageSlideLeftWidth: '150px',
        pageSlideRightWidth: '150px',

        // page structure
        pageClass: 'pf-site',

        // header
        pageHeaderId: 'pf-head',                                                // id for page head
        headClass: 'pf-head',                                                   // class for page head
        headMenuClass: 'pf-head-menu',                                          // class for page head menu button (left)
        headMapClass: 'pf-head-map',                                            // class for page head map button (right)

        // map module
        mapModuleId: 'pf-map-module',                                           // main map module

        // system effect dialog
        systemEffectDialogWrapper: 'pf-system-effect-dialog-wrapper',           // class for system effect dialog

        // helper element
        dynamicElementWrapperId: 'pf-dialog-wrapper'
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
     * catch all global document events
     */
    var setDocumentObserver = function(){
        $(document).on('pf:menuShowSystemEffectInfo', function(e){
            // show system effects info box

            var dialogWrapperElement = $('<div>', {
                class: config.systemEffectDialogWrapper
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

            });

            bootbox.dialog({
                title: 'System effect information',
                message: dialogWrapperElement
            });

        });
    }


});