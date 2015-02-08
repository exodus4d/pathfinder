/**
 * page structure
 */
define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'app/ccp',
    'app/ui/map_info',
    'app/logging',
    'slidebars',
    'app/module_map'
], function($, Init, Util, Render, bootbox, CCP, MapInfo, Logging) {

    'use strict';

    var config = {

        // page structure slidebars-menu classes
        pageId: 'sb-site',
        pageSlidebarClass: 'sb-slidebar',
        pageSlidebarLeftClass: 'sb-left',                                       // class for left menu
        pageSlidebarRightClass: 'sb-right',                                     // class for right menu
        pageSlideLeftWidth: '150px',                                            // slide distance left menu
        pageSlideRightWidth: '150px',                                           // slide distance right menu
        fullScreenClass: 'pf-fullscreen',                                       // class for the "full screen" element

        // page structure
        pageClass: 'pf-site',

        // header
        pageHeaderId: 'pf-head',                                                // id for page head
        headClass: 'pf-head',                                                   // class for page head
        headMenuClass: 'pf-head-menu',                                          // class for page head menu button (left)
        headMapClass: 'pf-head-map',                                            // class for page head map button (right)
        headActiveUserClass: 'pf-head-active-user',                             // class for "active user" link
        headCurrentLocationClass: 'pf-head-current-location',                   // class for "show current location" link
        headProgramStatusClass: 'pf-head-program-status',                       // class for "program status" notification

        // footer
        pageFooterId: 'pf-footer',                                              // id for page footer

        // menu
        menuHeadMenuLogoClass: 'pf-head-menu-logo',                             // class for main menu logo
        menuButtonFullScreenId: 'pf-menu-button-fullscreen',                    // id for menu button "full screen"

        // global dialog
        dialogNavigationClass: 'pf-dialog-navigation-list',                     // class for dialog navigation bar
        dialogNavigationListItemClass: 'pf-dialog-navigation-list-item',        // class for map manual li main navigation elements

        // system effect dialog
        systemEffectDialogWrapperClass: 'pf-system-effect-dialog-wrapper',      // class for system effect dialog

        // jump info dialog
        jumpInfoDialogClass: 'pf-jump-info-dialog',                             // class for jump info dialog

        // map manual dialog
        mapManualScrollspyId: 'pf-manual-scrollspy',                            // id for map manual scrollspy

        // helper element
        dynamicElementWrapperId: 'pf-dialog-wrapper'
    };

    var cache = {
        systemEffectDialog: false                                               // system effect info dialog
    };

    var programStatusCounter = 0;                                               // current count down in s until next status change is possible
    var programStatusInterval = false;                                          // interval timer until next status change is possible


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
                    Util.getMapModule()
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
                        class: 'list-group-item hide',                      // trigger by js
                        id: config.menuButtonFullScreenId,
                        href: '#'
                    }).html('&nbsp;&nbsp;Full screen').prepend(
                            $('<i>',{
                                class: 'glyphicon glyphicon-fullscreen',
                                css: {width: '1.23em'}
                            })
                        ).on('click', function(){
                            $(document).triggerMenuEvent('FullScreen', {button: this});
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

        // init full screen -> IGB does not support full screen
        if(CCP.isInGameBrowser() === false){
            requirejs(['fullScreen'], function() {
                if($.fullscreen.isNativelySupported() === true){
                    $('#' + config.menuButtonFullScreenId).removeClass('hide');
                }
            });
        }
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
                    }).html('&nbsp;&nbsp;&nbsp;Grid snap').prepend(
                            $('<i>',{
                                class: 'glyphicon glyphicon-th'
                            })
                        ).on('click', function(){
                            Util.getMapModule().getActiveMap().triggerMenuEvent('Grid', {button: this});
                        })
                ).append(
                    $('<a>', {
                        class: 'list-group-item',
                        href: '#'
                    }).html('&nbsp;&nbsp;Edit').prepend(
                            $('<i>',{
                                class: 'fa fa-edit fa-fw'
                            })
                        ).on('click', function(){
                            $(document).triggerMenuEvent('EditMap', {newMap: false});
                        })
                ).append(
                    $('<a>', {
                        class: 'list-group-item',
                        href: '#'
                    }).html('&nbsp;&nbsp;Task-Manager').prepend(
                            $('<i>',{
                                class: 'fa fa-tasks fa-fw'
                            })
                        ).on('click', function(){
                            $(document).triggerMenuEvent('ShowTaskManager');
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

                    // main menus
                    $('.' + config.headMenuClass).on('click', function() {
                        slideMenu.slidebars.toggle('left');
                    });

                    $('.' + config.headMapClass).on('click', function() {
                        slideMenu.slidebars.toggle('right');
                    });

                    // active pilots
                    $('.' + config.headActiveUserClass).find('a').on('click', function(){
                        $(document).triggerMenuEvent('ShowMapInfo');
                    });

                    // current location
                    $('.' + config.headCurrentLocationClass).find('a').on('click', function(){
                        Util.getMapModule().getActiveMap().triggerMenuEvent('SelectSystem', {systemId: $(this).data('systemId') });
                    });

                    // program status
                    $('.' + config.headProgramStatusClass).on('click', function(){
                        $(document).triggerMenuEvent('ShowTaskManager');
                    });

                    $(document).on('pf:closeMenu', function(e){
                        // close all menus
                        slideMenu.slidebars.close();
                    });

                    // init all tooltips
                    var tooltipElements = $('#' + config.pageHeaderId).find('[title]');
                    tooltipElements.tooltip({placement: 'bottom'});

                    // trigger load main map module -> header is required for "System" drag&drop position
                    Util.getMapModule().trigger('pf:initModule');

                }
            }
        };

        var moduleData = {
            id: config.pageHeaderId,
            brandLogo: config.menuHeadMenuLogoClass,
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

        $(document).on('fscreenchange', function(e, state, elem){

            var menuButton = $('#' + config.menuButtonFullScreenId);

            if(state === true){
                // full screen active
                menuButton.addClass('active');
            }else{
                menuButton.removeClass('active');
            }
        });

        $(document).on('pf:menuShowSystemEffectInfo', function(e){
            // show system effects info box
            showSystemEffectInfoDialog();
            return false;
        });

        $(document).on('pf:menuShowJumpInfo', function(e){
            // show system effects info box
            showJumpInfoDialog();
            return false;
        });

        $(document).on('pf:menuNotificationTest', function(e){
            // show system effects info box
            notificationTest();
            return false;
        });

        $(document).on('pf:menuManual', function(e){
            // show map manual
            showMapManual();
            return false;
        });

        $(document).on('pf:menuShowMapInfo', function(e){
            // show map information dialog
            MapInfo.showDialog();
            return false;
        });

        $(document).on('pf:menuEditMap', function(e, data){
            // show map edit dialog or edit map
            var mapData = false;

            if(data.newMap === false){
                var activeMap = Util.getMapModule().getActiveMap();

                if(activeMap){
                    mapData = activeMap.getMapData(true);
                }
            }

            showNewMapDialog(mapData);
            return false;
        });

        $(document).on('pf:menuShowTaskManager', function(e, data){
            // show log dialog
            Logging.showDialog();
            return false;
        });

        $(document).on('pf:menuFullScreen', function(e, data){

            if(CCP.isInGameBrowser() === false){
                var fullScreenElement = $('body');

                // close all menus
                $(this).trigger('pf:closeMenu', [{}]);

                // wait until menu is closed before switch mode (looks better)
                setTimeout(
                    function() {
                        // fullscreen is not supported by IGB
                        requirejs(['jquery', 'fullScreen'], function($) {

                            if($.fullscreen.isFullScreen()){
                                $.fullscreen.exit();
                            }else{
                                fullScreenElement.fullscreen({overflow: 'overflow-y', toggleClass: config.fullScreenClass});
                            }
                        });
                    }, 400);
            }



            return false;
        });

        // update header links with current map data
        $(document).on('pf:updateHeaderData', function(e, data){
            var activeMap = Util.getMapModule().getActiveMap();

            var userCount = 0;
            var currentLocationData = {};

            // show active user just for the current active map
            if(
                activeMap &&
                activeMap.data('id') === data.mapId
            ){
                userCount = data.userCount;
                currentLocationData = data;
            }
            updateHeaderActiveUserCount(userCount);
            updateHeaderCurrentLocation(currentLocationData);
        });
    };

    /**
     * update the "active user" badge in header
     * @param userCount
     */
    var updateHeaderActiveUserCount = function(userCount){
        var activeUserElement = $('.' + config.headActiveUserClass);
        var badge = activeUserElement.find('.badge');

        if(badge.data('userCount') !== userCount){
            badge.data('userCount', userCount);

            badge.text(userCount);

            badge.toggleClass('txt-color-green', (userCount > 0) );
            badge.toggleClass('txt-color-red', (userCount === 0) );

            if(! activeUserElement.is(':visible')){
                activeUserElement.velocity('fadeIn', {duration: Init.animationSpeed.headerLink});
            }
        }
    };

    /**
     * update the "current location" element in head
     * @param locationData
     */
    var updateHeaderCurrentLocation = function(locationData){
        var currentLocationElement = $('.' + config.headCurrentLocationClass);
        var linkElement = currentLocationElement.find('a');
        var textElement = linkElement.find('span');

        if(
            linkElement.data('systemName') !== locationData.currentSystemName
        ){
            var tempSystemName = locationData.currentSystemName;
            var tempSystemId = locationData.currentSystemId;

            if(
                tempSystemName === undefined ||
                tempSystemId === undefined
            ){
                tempSystemName = false;
                tempSystemId = false;
            }

            linkElement.data('systemName', tempSystemName);
            linkElement.data('systemId', tempSystemId);

            if(
                tempSystemName !== false &&
                tempSystemId !== false
            ){
                textElement.text(locationData.currentSystemName);
                currentLocationElement.velocity('fadeIn', {duration: Init.animationSpeed.headerLink});
            }else{
                if(currentLocationElement.is(':visible')){
                    currentLocationElement.velocity('fadeOut', {duration: Init.animationSpeed.headerLink});
                }
            }
        }
    };

    /**
     * shows the add new map dialog
     */
    var showNewMapDialog = function(mapData){

        var formData = {};

        requirejs(['text!templates/modules/map_dialog.html', 'mustache'], function(template, Mustache) {

            var data = {
                id: config.newMapDialogId,
                scope: config.mapScopes,
                type: Util.getMapTypes(),
                icon: Util.getMapIcons(),
                formData: formData
            };

            var content = Mustache.render(template, data);

            var dialogTitle = 'New map';
            var dialogSaveButton = 'add map';
            if(mapData !== false){
                dialogTitle = 'Edit map';
                dialogSaveButton = 'save map';

                content = $(content);
                content.find('select[name="icon"]').val( mapData.config.icon );
                content.find('input[name="name"]').val( mapData.config.name );
                content.find('select[name="scope"]').val( mapData.config.scope );
                content.find('select[name="type"]').val( mapData.config.type );
            }


            var mapInfoDialog = bootbox.dialog({
                title: dialogTitle,
                message: content,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fa fa-code-fork fa-fw"></i>' + dialogSaveButton,
                        className: 'btn-primary',
                        callback: function() {

                            // get form Values
                            var form = $('#' + config.newMapDialogId).find('form');
                            var newMapData = form.getFormValues();

                            // TODO save map data
                        }
                    }
                }
            });

        });
    };



    /**
     * shows the map manual modal dialog
     */
    var showMapManual = function(){

        requirejs(['text!templates/modules/map_manual_dialog.html', 'mustache'], function(template, Mustache) {

            var data = {
                dialogNavigationClass: config.dialogNavigationClass,
                dialogNavLiClass: config.dialogNavigationListItemClass,
                scrollspyId: config.mapManualScrollspyId,
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

        requirejs(['text!templates/modules/jump_info_dialog.html', 'mustache'], function(template, Mustache) {

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



    /**
     * trigger "program status" in head
     * @param status
     */
    $.fn.setProgramStatus = function(status){
        var statusElement = $('.' + config.headProgramStatusClass);
        var icon = statusElement.find('i');
        var textElement = statusElement.find('span');

        var iconClass = false;
        var textClass = false;
        var text = '';

        switch(status){
            case 'online':
                if( ! statusElement.hasClass('txt-color-green')){
                    iconClass = 'fa-wifi';
                    textClass = 'txt-color-green';
                    text = 'online';
                }
                break;
            case 'problem':
                if( ! statusElement.hasClass('txt-color-orange')){
                    iconClass = 'fa-warning';
                    textClass = 'txt-color-orange';
                    text = 'problem';
                }
                break;
            case 'offline':
                if( ! statusElement.hasClass('txt-color-red')){
                    iconClass = 'fa-bolt';
                    textClass = 'txt-color-red';
                    text = 'offline';
                }
                break;
        }

        // change status, on status changed
        if(iconClass !== false){

            if(! statusElement.hasClass(textClass) ){

                if(! programStatusInterval){

                    var timer = function(){

                        // change status on first timer iteration
                        if(programStatusCounter === Init.timer.programStatusVisible){

                            statusElement.velocity('stop').velocity('fadeOut', {
                                duration: Init.animationSpeed.headerLink,
                                complete: function(){
                                    statusElement.removeClass('txt-color-green txt-color-orange txt-color-red');
                                    icon.removeClass('fa-wifi fa-warning fa-bolt');
                                    statusElement.addClass(textClass);
                                    icon.addClass(iconClass);
                                    textElement.text(text);
                                }
                            }).velocity('fadeIn', {
                                duration: Init.animationSpeed.headerLink
                            });

                        }


                        programStatusCounter--;

                        if(programStatusCounter <= 0){
                            clearInterval(programStatusInterval);
                            programStatusInterval = false;
                        }
                    };

                    if(! programStatusInterval){
                        programStatusCounter = Init.timer.programStatusVisible;
                        programStatusInterval = setInterval(timer, 1000);

                    }


                }



            }




        }

    };


});