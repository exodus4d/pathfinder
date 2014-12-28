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

        // map manual dialog
        mapManualScrollspyId: 'pf-manual-scrollspy',                            // id for map manual scrollspy
        mapManualScrollspyNavClass: 'pf-manual-scrollspy-nav',                  // class for map manual scrollspy navigation
        mapManualNavigationListItemClass: 'pf-manual-navigation-list-item',     // class for map manual li main navigation elements

        // map info dialog
        mapInfoSystemsId: 'pf-map-info-systems',                                // id for map info systems box
        mapInfoConnectionsId: 'pf-map-info-connections',                        // id for map info connections box
        mapInfoTableClass: 'pf-map-info-table',                                 // class for data

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
                    }).html('&nbsp;&nbsp;Manual').prepend(
                            $('<i>',{
                                class: 'fa fa-info fa-fw'
                            })
                        ).on('click', function(){
                            $(document).triggerMenuEvent('Manual', {button: this});
                        })
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
                    }).html('&nbsp;&nbsp;Info').prepend(
                            $('<i>',{
                                class: 'fa fa-info fa-fw'
                            })
                        ).on('click', function(){
                            $(document).triggerMenuEvent('ShowMapInfo');
                        })
                ).append(
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

                    $(document).on('pf:closeMenu', function(e){
                        // close all menus
                        slideMenu.slidebars.close();
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

        $(document).on('pf:menuManual', function(e){
            // show map manual
            showMapManual();
        });

        $(document).on('pf:menuShowMapInfo', function(e){
            // show map information dialog
            showMapInfoDialog();
        });

    };

    /**
     * shows the map information modal dialog
     * @param mapData
     */
    var showMapInfoDialog = function(){

        var mapData = $('#' + config.mapModuleId).getActiveMap().getMapData();

        requirejs(['text!templates/modules/map_info_dialog.html', 'lib/mustache'], function(template, Mustache) {

            console.log(mapData)
            var data = {
                mapInfoSystemsId: config.mapInfoSystemsId,
                mapInfoConnectionsId: config.mapInfoConnectionsId,
                mapDataConfig: mapData.config,
                mapName: mapData.config.name,
                mapTypeClass: Util.getInfoForMap( mapData.config.type, 'class'),
                mapTypeLabel: Util.getInfoForMap( mapData.config.type, 'label')
            };

            var content = Mustache.render(template, data);

            var mapInfoDialog = bootbox.dialog({
                title: 'Map information',
                message: content,
                buttons: {
                    success: {
                        label: 'close',
                        className: 'btn-primary',
                        callback: function() {
                            $(mapInfoDialog).modal('hide');
                        }
                    }
                }
            });

            mapInfoDialog.on('shown.bs.modal', function(e) {
                // modal on open

                var systemsElement = $('#' + config.mapInfoSystemsId);
                var connectionsElement = $('#' + config.mapInfoConnectionsId);

                var loadingOptions = {
                    icon: {
                        size: 'fa-2x'
                    }
                };


                var systemTable = $('<table>', {
                    class: ['compact', 'stripe', 'order-column', 'row-border', config.mapInfoTableClass].join(' ')
                });
                systemsElement.append(systemTable);

                systemsElement.showLoadingAnimation(loadingOptions);

                var connectionTable = $('<table>', {
                    class: ['compact', 'stripe', 'order-column', 'row-border', config.mapInfoTableClass].join(' ')
                });
                connectionsElement.append(connectionTable);

                connectionsElement.showLoadingAnimation(loadingOptions);

                // systems table ==================================================

                // prepare data for dataTables
                var systemsData = [];
                for(var i = 0; i < mapData.data.systems.length; i++){
                    var tempSystemData = mapData.data.systems[i];

                    var tempData = [];

                    // current position
                    if(tempSystemData.currentUser === true){
                        tempData.push( '<i class="fa fa fa-map-marker fa-lg fa-fw"></i>' );
                    }else{
                        tempData.push( '' );
                    }

                    tempData.push( tempSystemData.name );

                    if( tempSystemData.name !== tempSystemData.alias){
                        tempData.push( tempSystemData.alias );
                    }else{
                        tempData.push( '' );
                    }

                    // status
                    var systemStatusClass = Util.getStatusInfoForSystem(tempSystemData.status, 'class');
                    if(systemStatusClass !== ''){
                        tempData.push( '<i class="fa fa fa-square-o fa-lg fa-fw ' + systemStatusClass + '"></i>' );
                    }else{
                        tempData.push( '' );
                    }

                    // effect
                    var systemEffectClass = Util.getEffectInfoForSystem(tempSystemData.effect, 'class');
                    if(systemEffectClass !== ''){
                        tempData.push( '<i class="fa fa fa-square fa-lg fa-fw ' + systemEffectClass + '"></i>' );
                    }else{
                        tempData.push( '' );
                    }

                    // trueSec
                    var systemTrueSecClass = Util.getTrueSecClassForSystem(tempSystemData.trueSec);
                    if(systemTrueSecClass !== ''){
                        tempData.push( '<span class="' + systemTrueSecClass + '">' + tempSystemData.trueSec.toFixed(1) + '</span>' );
                    }else{
                        tempData.push( '' );
                    }

                    // locked
                    if(tempSystemData.locked === true){
                        tempData.push( '<i class="fa fa-lock fa-lg fa-fw"></i>' );
                    }else{
                        tempData.push( '' );
                    }

                    // rally point
                    if(tempSystemData.rally === true){
                        tempData.push( '<i class="fa fa-users fa-lg fa-fw"></i>' );
                    }else{
                        tempData.push( '' );
                    }

                    systemsData.push(tempData);
                }

                var systemsDataTable = systemTable.dataTable( {
                    paging: false,
                    ordering: true,
                    order: [ 0, 'desc' ],
                    autoWidth: false,
                    hover: false,
                    data: systemsData,
                    columnDefs: [],
                    language: {
                        emptyTable:  'Map is empty',
                        zeroRecords: 'No systems found',
                        lengthMenu:  'Show _MENU_ systems',
                        info:        'Showing _START_ to _END_ of _TOTAL_ systems'
                    },
                    columns: [
                        {
                            title: '<i class="fa fa fa-map-marker fa-lg"></i>',
                            width: '15px',
                            searchable: false
                        },{
                            title: 'system',
                            width: '50px'
                        },{
                            title: 'alias'
                        },{
                            title: 'status',
                            width: '30px',
                            class: 'text-center',
                            orderable: false,
                            searchable: false
                        },{
                            title: 'effect',
                            width: '30px',
                            class: 'text-center',
                            orderable: false,
                            searchable: false
                        },{
                            title: 'sec.',
                            width: '20px',
                            class: 'text-center',
                            orderable: false,
                            searchable: false
                        },{
                            title: '<i class="fa fa-lock fa-lg fa-fw"></i>',
                            width: '30px',
                            class: 'text-center',
                            searchable: false
                        },{
                            title: '<i class="fa fa-users fa-lg fa-fw"></i>',
                            width: '30px',
                            className: 'text-center',
                            searchable: false
                        }
                    ]
                });

                systemsElement.hideLoadingAnimation();

                // connections table ==================================================

                // prepare data for dataTables
                var connectionData = [];
                for(var j = 0; j < mapData.data.connections.length; j++){
                    var tempConnectionData = mapData.data.connections[j];

                    var tempConData = [];

                    tempConData.push( Util.getScopeInfoForMap( tempConnectionData.scope, 'label') );

                    // source system name
                    tempConData.push( tempConnectionData.sourceName );

                    // connection
                    var connectionClasses = [];
                    for(var k = 0; k < tempConnectionData.type.length; k++){
                        connectionClasses.push( Util.getConnectionInfo( tempConnectionData.type[k], 'cssClass') );

                    }

                    connectionClasses = connectionClasses.join(' ');

                    tempConData.push( '<div class="pf-fake-connection ' + connectionClasses + '"></div>' );


                    tempConData.push( tempConnectionData.targetName );

                    connectionData.push(tempConData);
                }

                var connectionDataTable = connectionTable.dataTable( {
                    paging: false,
                    ordering: true,
                    order: [ 0, 'desc' ],
                    autoWidth: false,
                    hover: false,
                    data: connectionData,
                    columnDefs: [],
                    language: {
                        emptyTable:  'No connections',
                        zeroRecords: 'No connections found',
                        lengthMenu:  'Show _MENU_ connections',
                        info:        'Showing _START_ to _END_ of _TOTAL_ connections'
                    },
                    columns: [
                        {
                            title: 'scope',
                            width: '50px',
                            orderable: false
                        },{
                            title: 'source system'
                        },{
                            title: 'connection',
                            width: '80px',
                            class: 'text-center',
                            orderable: false,
                            searchable: false
                        },{
                            title: 'target system'
                        }
                    ]
                });


                connectionsElement.hideLoadingAnimation();


            });

        });

    };

    /**
     * shows the map manual modal dialog
     */
    var showMapManual = function(){

        requirejs(['text!templates/modules/map_manual_dialog.html', 'lib/mustache'], function(template, Mustache) {

            var data = {
                scrollspyId: config.mapManualScrollspyId,
                scrollspyNavClass: config.mapManualScrollspyNavClass,
                scrollspyNavLiClass: config.mapManualNavigationListItemClass,
                pieChartClass : Init.classes.pieChart.pieChartMapCounterClass,
                mapCounterClass : Init.classes.pieChart.pieChartMapCounterClass,

                mapTypeGlobalClass: Util.getInfoForMap( 'global', 'class'),
                mapTypeGlobalLabel: Util.getInfoForMap( 'global', 'label'),
                mapTypeAllianceClass: Util.getInfoForMap( 'alliance', 'class'),
                mapTypeAllianceLabel: Util.getInfoForMap( 'alliance', 'label'),
                mapTypePrivateClass: Util.getInfoForMap( 'private', 'class'),
                mapTypePrivateLabel: Util.getInfoForMap( 'private', 'label')
            };


            var content = Mustache.render(template, data);
            // show dialog
            var mapManualDialog = bootbox.dialog({
                title: 'Pathfinder manual',
                message: content,
                className: 'medium',
                buttons: {
                    success: {
                        label: 'close',
                        className: "btn-primary",
                        callback: function() {
                            $(mapManualDialog).modal('hide');
                        }
                    }
                },
                show: false
            });

            mapManualDialog.modal('show');

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
                scrollNavLiElements = $('.' + config.mapManualNavigationListItemClass);
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
                        var mainNavigationLinks = $('.' + config.mapManualScrollspyNavClass).find('a');
                        // text anchor links
                        var subNavigationLinks = scrollspyElement.find('a[data-target]');

                        var navigationLinks = mainNavigationLinks.add(subNavigationLinks);

                        navigationLinks.on('click', function(e){
                            e.preventDefault();

                            disableOnScrollEvent = true;

                            // scroll to anchor
                            scrollspyElement.mCustomScrollbar("scrollTo", $(this).attr('data-target'));

                            var mainNavigationLiElement = $(this).parent('.' + config.mapManualNavigationListItemClass);


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

    /**
     * shows a test notification for desktop messages
     */
    var notificationTest = function(){
        Util.showNotify({
            title: 'Test Notification',
            text: 'Accept browser security question'},
            {
                desktop: true,
                stack: 'barBottom'
            }
        );
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