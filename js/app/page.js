/**
 * page structure
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/logging',
    'mustache',
    'text!img/logo.svg!strip',
    'text!templates/modules/header.html',
    'text!templates/modules/footer.html',
    'dialog/notification',
    'dialog/stats',
    'dialog/map_info',
    'dialog/account_settings',
    'dialog/manual',
    'dialog/map_settings',
    'dialog/system_effects',
    'dialog/jump_info',
    'dialog/delete_account',
    'dialog/credit',
    'slidebars',
    'app/module_map'
], function($, Init, Util, Logging, Mustache, TplLogo, TplHead, TplFooter) {

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
        headMapTrackingId: 'pf-head-map-tracking',                              // id for "map tracking" toggle (checkbox)

        // footer
        pageFooterId: 'pf-footer',                                              // id for page footer
        footerLicenceLinkClass: 'pf-footer-licence',                            // class for "licence" link

        // menu
        menuHeadMenuLogoClass: 'pf-head-menu-logo',                             // class for main menu logo

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

        // load header / footer
        $('.' + config.pageClass).loadHeader().loadFooter();

        // load left menu
        $('.' + config.pageSlidebarLeftClass).loadLeftMenu();

        // load right menu
        $('.' + config.pageSlidebarRightClass).loadRightMenu();

        // set document observer for global events
        setDocumentObserver();
    };

    /**
     * get main menu title element
     * @param title
     * @returns {JQuery|*|jQuery}
     */
    var getMenuHeadline = function(title){
        return $('<div>', {
            class: 'panel-heading'
        }).prepend(
            $('<h2>',{
                class: 'panel-title',
                text: title
            })
        );
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
                    href: '/'
                }).html('&nbsp;&nbsp;Home').prepend(
                        $('<i>',{
                            class: 'fa fa-home fa-fw'
                        })
                    )
            ).append(
                getMenuHeadline('Information')
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-info',
                    href: '#'
                }).html('&nbsp;&nbsp;Statistics').prepend(
                    $('<i>',{
                        class: 'fa fa-line-chart fa-fw'
                    })
                ).append(
                    $('<span>',{
                        class: 'badge bg-color bg-color-gray txt-color txt-color-warning',
                        text: 'beta'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('ShowStatsDialog');
                })
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-info',
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
                    class: 'list-group-item list-group-item-info',
                    href: '#'
                }).html('&nbsp;&nbsp;Jump info').prepend(
                        $('<i>',{
                            class: 'fa fa-space-shuttle fa-fw'
                        })
                    ).on('click', function(){
                        $(document).triggerMenuEvent('ShowJumpInfo');
                    })
            ).append(
                getMenuHeadline('Settings')
            ).append(
                $('<a>', {
                    class: 'list-group-item',
                    href: '#'
                }).html('&nbsp;&nbsp;Account').prepend(
                    $('<i>',{
                        class: 'fa fa-sliders fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('ShowSettingsDialog');
                })
            ).append(
                $('<a>', {
                    class: 'list-group-item hide',                      // trigger by js
                    id: Util.config.menuButtonFullScreenId,
                    href: '#'
                }).html('&nbsp;&nbsp;Full screen').prepend(
                        $('<i>',{
                            class: 'glyphicon glyphicon-fullscreen',
                            css: {width: '1.23em'}
                        })
                    ).on('click', function(){
                        var fullScreenElement = $('body');
                        requirejs(['jquery', 'fullScreen'], function($) {

                            if($.fullscreen.isFullScreen()){
                                $.fullscreen.exit();
                            }else{
                                fullScreenElement.fullscreen({overflow: 'scroll', toggleClass: config.fullScreenClass});
                            }
                        });
                    })
            ).append(
                $('<a>', {
                    class: 'list-group-item',
                    href: '#'
                }).html('&nbsp;&nbsp;Notification test').prepend(
                        $('<i>',{
                            class: 'fa fa-volume-up fa-fw'
                        })
                    ).on('click', function(){
                        $(document).triggerMenuEvent('NotificationTest');
                    })
            ).append(
                getMenuHeadline('Danger zone')
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-danger',
                    href: '#'
                }).html('&nbsp;&nbsp;Delete account').prepend(
                    $('<i>',{
                        class: 'fa fa-user-times fa-fw'
                    })
                ).on('click', function(){
                        $(document).triggerMenuEvent('DeleteAccount');
                    })
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-warning',
                    href: '#'
                }).html('&nbsp;&nbsp;Logout').prepend(
                        $('<i>',{
                            class: 'fa fa-sign-in fa-fw'
                        })
                    ).on('click', function(){
                        $(document).triggerMenuEvent('Logout', {clearCookies: 1});
                    })
            )
        );

        requirejs(['fullScreen'], function() {
            if($.fullscreen.isNativelySupported() === true){
                $('#' + Util.config.menuButtonFullScreenId).removeClass('hide');
            }
        });
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
                }).html('&nbsp;&nbsp;Status').prepend(
                    $('<i>',{
                        class: 'fa fa-info fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('ShowMapInfo');
                })
            ).append(
                getMenuHeadline('Settings')
            ).append(
                $('<a>', {
                    class: 'list-group-item',
                    href: '#'
                }).html('&nbsp;&nbsp;Map config').prepend(
                    $('<i>',{
                        class: 'fa fa-gears fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('ShowMapSettings', {tab: 'settings'});
                })
            ).append(
                $('<a>', {
                    class: 'list-group-item',
                    id: Util.config.menuButtonGridId,
                    href: '#'
                }).html('&nbsp;&nbsp;&nbsp;Grid snapping').prepend(
                    $('<i>',{
                        class: 'glyphicon glyphicon-th'
                    })
                ).on('click', function(){
                    Util.getMapModule().getActiveMap().triggerMenuEvent('MapOption', {
                        option: 'mapSnapToGrid',
                        toggle: true
                    });
                })
            ).append(
                $('<a>', {
                    class: 'list-group-item',
                    id: Util.config.menuButtonMagnetizerId,
                    href: '#'
                }).html('&nbsp;&nbsp;&nbsp;Magnetizing').prepend(
                    $('<i>',{
                        class: 'fa fa-magnet fa-fw'
                    })
                ).on('click', function(){
                    Util.getMapModule().getActiveMap().triggerMenuEvent('MapOption', {
                        option: 'mapMagnetizer',
                        toggle: true
                    });
                })
            ).append(
                getMenuHeadline('Help')
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-info',
                    href: '#'
                }).html('&nbsp;&nbsp;Manual').prepend(
                    $('<i>',{
                        class: 'fa fa-book fa-fw'
                    })
                ).on('click', function(){
                        $(document).triggerMenuEvent('Manual');
                    })
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-info',
                    href: '#'
                }).html('&nbsp;&nbsp;Task-Manager').prepend(
                    $('<i>',{
                        class: 'fa fa-tasks fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('ShowTaskManager');
                })
            ).append(
                getMenuHeadline('Danger zone')
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-danger',
                    href: '#'
                }).html('&nbsp;&nbsp;Delete map').prepend(
                    $('<i>',{
                        class: 'fa fa-trash fa-fw'
                    })
                ).on('click', function(){
                        $(document).triggerMenuEvent('DeleteMap');
                    })
            )
        );
    };

    /**
     * trigger menu event
     * @param event
     * @param data
     */
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
            popoverTriggerClass: Util.config.popoverTriggerClass,
            userCharacterClass: config.headUserCharacterClass,
            userCharacterImageClass: config.userCharacterImageClass,
            userShipClass: config.headUserShipClass,
            userShipImageClass: config.userShipImageClass,
            mapTrackingId: config.headMapTrackingId
        };

        var headRendered = Mustache.render(TplHead, moduleData);

        pageElement.prepend(headRendered);

        // init header =====================================================================

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

        // close menu
        $(document).on('pf:closeMenu', function(e){
            // close all menus
            slideMenu.slidebars.close();
        });

        // tracking toggle
        var mapTrackingCheckbox = $('#' + config.headMapTrackingId);
        mapTrackingCheckbox.bootstrapToggle({
            size: 'mini',
            on: 'on',
            off: 'off',
            onstyle: 'success',
            offstyle: 'default',
            width: 38,
            height: 19
        });

        // set default values for map tracking checkbox
        // -> always "enable"
        mapTrackingCheckbox.bootstrapToggle('on');

        mapTrackingCheckbox.on('change', function(e) {
            var value = $(this).is(':checked');
            var tracking = 'off';
            var trackingText = 'Your current location will not actually be added';
            var trackingType = 'info';
            if(value){
                tracking = 'on';
                trackingText = 'New connections will actually be added';
                trackingType = 'success';
            }

            Util.showNotify({title: 'Map tracking: ' + tracking, text: trackingText, type: trackingType}, false);
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

        return this;
    };

    /**
     * load page footer
     */
    $.fn.loadFooter = function(){

        var pageElement = $(this);

        var moduleData = {
            id: config.pageFooterId,
            footerLicenceLinkClass: config.footerLicenceLinkClass,
            currentYear: new Date().getFullYear()
        };

        var headRendered = Mustache.render(TplFooter, moduleData);

        pageElement.prepend(headRendered);

        // init footer ==================================================

        pageElement.find('.' + config.footerLicenceLinkClass).on('click', function(){
            //show credits info dialog
            $.fn.showCreditsDialog();
        });

        return this;
    };

    /**
     * catch all global document events
     */
    var setDocumentObserver = function(){

        // on "full-screen" change event
        $(document).on('fscreenchange', function(e, state, elem){

            var menuButton = $('#' + Util.config.menuButtonFullScreenId);

            if(state === true){
                // full screen active

                // close all menus
                $(this).trigger('pf:closeMenu', [{}]);

                menuButton.addClass('active');
            }else{
                menuButton.removeClass('active');
            }
        });

        $(document).on('pf:menuShowStatsDialog', function(e){
            // show user activity stats dialog
            $.fn.showStatsDialog();
            return false;
        });

        $(document).on('pf:menuShowSystemEffectInfo', function(e){
            // show system effects dialog
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

        $(document).on('pf:menuDeleteAccount', function(e){
            // show "delete account" dialog
            $.fn.showDeleteAccountDialog();
            return false;
        });

        $(document).on('pf:menuManual', function(e){
            // show map manual
            $.fn.showMapManual();
            return false;
        });

        $(document).on('pf:menuShowSettingsDialog', function(e){
            // show character select dialog
            $.fn.showSettingsDialog();
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

        $(document).on('pf:menuLogout', function(e, data){

            var clearCookies = false;
            if(
                typeof data === 'object' &&
                data.hasOwnProperty('clearCookies')
            ){
                clearCookies = data.clearCookies;
            }

            // logout
            Util.logout({
                ajaxData: {
                    clearCookies: clearCookies
                }
            });
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

        // shutdown the program -> show dialog
        $(document).on('pf:shutdown', function(e, data){
            // show shutdown dialog
            var options = {
                buttons: {
                    logout: {
                        label: '<i class="fa fa-fw fa-refresh"></i> restart',
                        className: ['btn-primary'].join(' '),
                        callback: function(){
                            // check if error was 5xx -> reload page
                            // -> else try to logout -> ajax request
                            if(data.status >= 500 && data.status < 600){
                                // redirect to login
                                window.location = '../';
                            }else{
                                $(document).trigger('pf:menuLogout');
                            }
                        }
                    }
                },
                content: {
                    icon: 'fa-bolt',
                    class: 'txt-color-danger',
                    title: 'Application error',
                    headline: 'Logged out',
                    text: [
                        data.reason
                    ],
                    textSmaller: []
                }
            };

            // add error information (if available)
            if(
                data.error &&
                data.error.length
            ){
                for(let i = 0; i < data.error.length; i++){
                    options.content.textSmaller.push(data.error[i].message);
                }
            }

            $.fn.showNotificationDialog(options);

            $(document).setProgramStatus('offline');

            Util.showNotify({title: 'Logged out', text: data.reason, type: 'error'}, false);

            // remove map -------------------------------------------------------
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
        var currentCharactersOptionIds = userInfoElement.data('characterOptionIds') ? userInfoElement.data('characterOptionIds') : [];
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
                newShipId = userData.character.log.ship.typeId;
                newShipName = userData.character.log.ship.typeName;
            }
        }

        var newCharactersOptionIds = userData.characters.map(function(data){
            return data.id;
        });

        // update user character data ---------------------------------------------------
        if(currentCharactersOptionIds.toString() !== newCharactersOptionIds.toString()){

            var  currentCharacterChanged = false;
            if(currentCharacterId !== newCharacterId){
                currentCharacterChanged = true;
            }

            // toggle element
            animateHeaderElement(userInfoElement, function(){
                if(currentCharacterChanged){
                    userInfoElement.find('span').text( newCharacterName );
                    userInfoElement.find('img').attr('src', Init.url.ccpImageServer + 'Character/' + newCharacterId + '_32.jpg' );
                }
                // init "character switch" popover
                userInfoElement.initCharacterSwitchPopover(userData);
            }, true);

            // store new id(s) for next check
            userInfoElement.data('characterId', newCharacterId);
            userInfoElement.data('characterOptionIds', newCharactersOptionIds);
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
     * delete active character log for the current user
     */
    var deleteLog = function(){

        $.ajax({
            type: 'POST',
            url: Init.path.deleteLog,
            data: {},
            dataType: 'json'
        }).done(function(data){

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
        var mapUpdateKey = 'UPDATE_SERVER_MAP';
        var mapUserUpdateKey = 'UPDATE_SERVER_USER_DATA';

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
                // globally store current visibility status
                window.isVisible = false;

                Util.getCurrentTriggerDelay( mapUpdateKey, increaseTimer );
                Util.getCurrentTriggerDelay( mapUserUpdateKey, increaseTimer );
            } else {
                // tab is visible
                // globally store current visibility status
                window.isVisible = true;

                Util.getCurrentTriggerDelay( mapUpdateKey, -increaseTimer );
                Util.getCurrentTriggerDelay( mapUserUpdateKey, -increaseTimer );

                // stop blinking tab from previous notifications
                Util.stopTabBlink();
            }
        }

        if (
            typeof document.addEventListener !== 'undefined' &&
            typeof document[hidden] !== 'undefined'
        ){
            // the current browser supports this feature
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
                        if(programStatusCounter === Init.timer.PROGRAM_STATUS_VISIBLE){

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
                        programStatusCounter = Init.timer.PROGRAM_STATUS_VISIBLE;
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