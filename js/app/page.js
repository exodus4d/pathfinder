/**
 * page structure
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/ccp',
    'app/logging',
    'mustache',
    'text!img/logo.svg!strip',
    'text!templates/modules/header.html',
    'text!templates/modules/footer.html',
    'dialog/notification',
    'dialog/trust',
    'dialog/map_info',
    'dialog/settings',
    'dialog/manual',
    'dialog/map_settings',
    'dialog/system_effects',
    'dialog/jump_info',
    'dialog/credit',
    'slidebars',
    'app/module_map'
], function($, Init, Util, CCP, Logging, Mustache, TplLogo, TplHead, TplFooter) {

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
        headUserCharacterClass: 'pf-head-user-character',                       // class for "user settings" link
        userCharacterImageClass: 'pf-head-user-character-image',                // class for "current user image"

        headUserShipClass: 'pf-head-user-ship',                                 // class for "user settings" link
        userShipImageClass: 'pf-head-user-ship-image',                          // class for "current user ship image"
        headActiveUserClass: 'pf-head-active-user',                             // class for "active user" link
        headCurrentLocationClass: 'pf-head-current-location',                   // class for "show current location" link
        headProgramStatusClass: 'pf-head-program-status',                       // class for "program status" notification

        // footer
        pageFooterId: 'pf-footer',                                              // id for page footer
        footerLicenceLinkClass: 'pf-footer-licence',                            // class for "licence" link

        // menu
        menuHeadMenuLogoClass: 'pf-head-menu-logo',                             // class for main menu logo
        menuButtonFullScreenId: 'pf-menu-button-fullscreen',                    // id for menu button "full screen"

        // helper element
        dynamicElementWrapperId: 'pf-dialog-wrapper'
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
                                class: 'fa fa-crosshairs fa-fw'
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
                        ).on('click', function(){
                            $(document).triggerMenuEvent('Logout');
                        })
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
                    }).html('&nbsp;&nbsp;Settings').prepend(
                            $('<i>',{
                                class: 'fa fa-gears fa-fw'
                            })
                        ).on('click', function(){
                            $(document).triggerMenuEvent('ShowMapSettings', {tab: 'settings'});
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
                ).append(
                    $('<a>', {
                        class: 'list-group-item',
                        href: '#'
                    }).html('&nbsp;&nbsp;Delete').prepend(
                            $('<i>',{
                                class: 'fa fa-eraser fa-fw'
                            })
                        ).on('click', function(){
                            $(document).triggerMenuEvent('DeleteMap');
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

        var moduleData = {
            id: config.pageHeaderId,
            logo: function(){
                // render svg logo
                return Mustache.render(TplLogo, {});
            },
            brandLogo: config.menuHeadMenuLogoClass,
            userCharacterClass: config.headUserCharacterClass,
            userCharacterImageClass: config.userCharacterImageClass,
            userShipClass: config.headUserShipClass,
            userShipImageClass: config.userShipImageClass
        };

        var headRendered = Mustache.render(TplHead, moduleData);

        pageElement.prepend(headRendered);

        // init heaser =====================================================================

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

        // settings
        $('.' + config.headUserCharacterClass).find('a').on('click', function(){
            $(document).triggerMenuEvent('ShowSettingsDialog');
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
        tooltipElements.tooltip({
            placement: 'bottom',
            delay: {
                show: 500,
                hide: 0
            }
        });

    };

    /**
     * load page footer
     */
    $.fn.loadFooter = function(){

        var pageElement = $(this);

        var moduleData = {
            id: config.pageFooterId,
            footerLicenceLinkClass: config.footerLicenceLinkClass
        };

        var headRendered = Mustache.render(TplFooter, moduleData);

        pageElement.prepend(headRendered);

        // init footer ==================================================

        pageElement.find('.' + config.footerLicenceLinkClass).on('click', function(){
            //show credits info dialog
            $.fn.showCreditsDialog();
        });
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
            $.fn.showSystemEffectInfoDialog();
            return false;
        });

        $(document).on('pf:menuShowJumpInfo', function(e){
            // show system effects info box
            $.fn.showJumpInfoDialog();
            return false;
        });

        $(document).on('pf:menuNotificationTest', function(e){
            // show system effects info box
            notificationTest();
            return false;
        });

        $(document).on('pf:menuManual', function(e){
            // show map manual
            $.fn.showMapManual();
            return false;
        });

        $(document).on('pf:menuShowSettingsDialog', function(e){
            // show character select dialog
            $.fn.showSettingsDialog(false);
            return false;
        });

        $(document).on('pf:menuShowMapInfo', function(e){
            // show map information dialog
            $.fn.showMapInfoDialog();
            return false;
        });

        $(document).on('pf:menuShowMapSettings', function(e, data){
            // show map edit dialog or edit map
            var mapData = false;

            var activeMap = Util.getMapModule().getActiveMap();

            if(activeMap){
                mapData = Util.getCurrentMapData( activeMap.data('id') );
            }

            $.fn.showMapSettingsDialog(mapData, data);
            return false;
        });

        $(document).on('pf:menuDeleteMap', function(e){
            // delete current active map
            var mapData = false;

            var activeMap = Util.getMapModule().getActiveMap();

            if(activeMap){
                mapData = activeMap.getMapDataFromClient({forceData: true});
            }

            $.fn.showDeleteMapDialog(mapData);
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

        $(document).on('pf:menuLogout', function(e, data){
            // logout
            logout();
            return false;
        });

        // END menu events =============================================================================


        // update header links with current map data
        $(document).on('pf:updateHeaderMapData', function(e, data){
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

        // show the "trust" IGB dialog
        $(document).on('pf:showTrustDialog', function(e){
            // show trust dialog
            $.fn.showTrustDialog();
            return false;
        });

        // shutdown the program -> show dialog
        $(document).on('pf:shutdown', function(e, data){
            // show shutdown dialog
            var options = {
                buttons: {
                    logout: {
                        label: '<i class="fa fa-fw fa-refresh"></i> restart',
                        className: ['btn-primary'].join(' '),
                        callback: function() {

                            $(document).trigger('pf:menuLogout');
                        }
                    }
                },
                content: {
                    icon: 'fa-bolt',
                    class: 'txt-color-danger',
                    title: 'Shutdown',
                    headline: 'Emergency shutdown',
                    text: [
                        'Sorry! Under normal circumstances that should not happen',
                        data.reason
                    ]
                }
            };

            $.fn.showNotificationDialog(options);

            $(document).setProgramStatus('offline');

            Util.showNotify({title: 'Emergency shutdown', text: data.reason, type: 'error'}, false);

            // remove map
            Util.getMapModule().velocity('fadeOut', {
                duration: 300,
                complete: function(){
                    $(this).remove();
                }
            });

            return false;
        });

    };

    /**
     * updates the header with current user data
     */
    $.fn.updateHeaderUserData = function(){

        var userData = Util.getCurrentUserData();

        var userInfoElement = $('.' + config.headUserCharacterClass);
        var currentCharacterId = userInfoElement.data('characterId');
        var newCharacterId = 0;
        var newCharacterName = '';

        var userShipElement = $('.' + config.headUserShipClass);
        var currentShipId = userShipElement.data('shipId');
        var newShipId = 0;
        var newShipName = '';

        // function for header element toggle animation
        var animateHeaderElement = function(element, callback, triggerShow){

            element.show().velocity('stop').velocity({
                opacity: 0
            },{
                visibility : 'hidden',
                duration: 500,
                complete: function(){

                    // callback
                    callback();

                    // show element
                    if(triggerShow === true){
                        element.velocity({
                            opacity: 1
                        }, {
                            visibility : 'visible',
                            duration: 500
                        });
                    }else{
                        // hide element
                        element.hide();
                    }

                }
            });

        };

        // check for changes
        if(
            userData &&
            userData.character
        ){
            newCharacterId = userData.character.id;
            newCharacterName = userData.character.name;

            if(userData.character.log){
                newShipId = userData.character.log.ship.id;
                newShipName = userData.character.log.ship.typeName;
            }
        }

        // update user character data ---------------------------------------------------
        if(currentCharacterId !== newCharacterId){

            var showCharacterElement = true;
            if(newCharacterId === 0){
                showCharacterElement = false;
            }

            // toggle element
            animateHeaderElement(userInfoElement, function(){
                userInfoElement.find('span').text( newCharacterName );
                userInfoElement.find('img').attr('src', Init.url.ccpImageServer + 'Character/' + newCharacterId + '_32.jpg' );
            }, showCharacterElement);

            // set new id for next check
            userInfoElement.data('characterId', newCharacterId);
        }

        // update user ship data --------------------------------------------------------
        if(currentShipId !== newShipId){

            var showShipElement = true;
            if(newShipId === 0){
                showShipElement = false;
            }

            // toggle element
            animateHeaderElement(userShipElement, function(){
                userShipElement.find('span').text( newShipName );
                userShipElement.find('img').attr('src', Init.url.ccpImageServer + 'Render/' + newShipId + '_32.png' );
            }, showShipElement);

            // set new id for next check
            userShipElement.data('shipId', newShipId);
        }
    };

    /**
     * send logout request
     */
    var logout = function(){

        $.ajax({
            type: 'POST',
            url: Init.path.logOut,
            data: {},
            dataType: 'json'
        }).done(function(data){

            if(data.reroute !== undefined){
                window.location = Util.buildUrl(data.reroute) + '?logout';
            }

        }).fail(function( jqXHR, status, error) {

            var reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': logout', text: reason, type: 'error'});
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

            badge.toggleClass('txt-color-greenLight', (userCount > 0) );
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

        if( linkElement.data('systemName') !== locationData.currentSystemName ){
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
     *  set event listener if the program tab is active or not
     *  this is used to lower the update ping cycle to reduce server load
     */
    var initTabChangeObserver = function(){

        // increase the timer if a user is inactive
        var increaseTimer = 10000;

        // timer keys
        var mapUpdateKey = 'MAP_UPDATE';
        var mapUserUpdateKey = 'USER_UPDATE'

        // Set the name of the hidden property and the change event for visibility
        var hidden, visibilityChange;
        if (typeof document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support
            hidden = 'hidden';
            visibilityChange = 'visibilitychange';
        } else if (typeof document.mozHidden !== 'undefined') {
            hidden = 'mozHidden';
            visibilityChange = 'mozvisibilitychange';
        } else if (typeof document.msHidden !== 'undefined') {
            hidden = 'msHidden';
            visibilityChange = 'msvisibilitychange';
        } else if (typeof document.webkitHidden !== 'undefined') {
            hidden = 'webkitHidden';
            visibilityChange = 'webkitvisibilitychange';
        }

        // function is called if the tab becomes active/inactive
        function handleVisibilityChange() {
            if (document[hidden]) {
                // tab is invisible
                Util.getCurrentTriggerDelay( mapUpdateKey, increaseTimer );
                Util.getCurrentTriggerDelay( mapUserUpdateKey, increaseTimer );
            } else {
                // tab is visible
                Util.getCurrentTriggerDelay( mapUpdateKey, -increaseTimer );
                Util.getCurrentTriggerDelay( mapUserUpdateKey, -increaseTimer );
            }
        }

        if (
            typeof document.addEventListener === 'undefined' ||
            typeof document[hidden] === 'undefined'
        ){
            // the current browser does not support this feature
        }else{
            // Handle page visibility change

            // check once initial -> in case the tab is hidden on page load
            handleVisibilityChange();

            document.addEventListener(visibilityChange, handleVisibilityChange, false);
        }

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

            // "problem" and "offline" always have priority -> ignore/clear interval
            if(
                status === 'problem' ||
                status === 'offline'
            ){
                clearInterval(programStatusInterval);
                programStatusInterval = false;
            }

            if(! statusElement.hasClass(textClass) ){

                if(! programStatusInterval){

                    var timer = function(){

                        // change status on first timer iteration
                        if(programStatusCounter === Init.timer['PROGRAM_STATUS_VISIBLE']){

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

                        // decrement counter
                        programStatusCounter -= 1000;

                        if(programStatusCounter <= 0){
                            clearInterval(programStatusInterval);
                            programStatusInterval = false;
                        }
                    };

                    if(! programStatusInterval){
                        programStatusCounter = Init.timer['PROGRAM_STATUS_VISIBLE'];
                        programStatusInterval = setInterval(timer, 1000);
                    }
                }
            }
        }
    };


    return {
        initTabChangeObserver: initTabChangeObserver
    };


});