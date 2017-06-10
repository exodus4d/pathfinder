/**
 * page structure
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/logging',
    'mustache',
    'app/map/util',
    'text!img/logo.svg!strip',
    'text!templates/modules/header.html',
    'text!templates/modules/footer.html',
    'dialog/notification',
    'dialog/stats',
    'dialog/map_info',
    'dialog/account_settings',
    'dialog/manual',
    'dialog/shortcuts',
    'dialog/map_settings',
    'dialog/system_effects',
    'dialog/jump_info',
    'dialog/delete_account',
    'dialog/credit',
    'xEditable',
    'slidebars',
    'app/module_map'
], function($, Init, Util, Logging, Mustache, MapUtil, TplLogo, TplHead, TplFooter) {

    'use strict';

    let config = {
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
        headProgramStatusClass: 'pf-head-program-status',                       // class for "program status" notification

        // footer
        pageFooterId: 'pf-footer',                                              // id for page footer
        footerLicenceLinkClass: 'pf-footer-licence',                            // class for "licence" link
        globalInfoPanelId: 'pf-global-info',                                    // id for "global info panel"

        // menu
        menuHeadMenuLogoClass: 'pf-head-menu-logo',                             // class for main menu logo

        // helper element
        dynamicElementWrapperId: 'pf-dialog-wrapper',

        // system signature module
        systemSigModuleClass: 'pf-sig-table-module',                            // module wrapper (signatures)
    };

    let programStatusCounter = 0;                                               // current count down in s until next status change is possible
    let programStatusInterval = false;                                          // interval timer until next status change is possible


    /**
     * load main page structure elements and navigation container into body
     * @returns {*|jQuery|HTMLElement}
     */
    $.fn.loadPageStructure = function(){
        return this.each((i, body) => {
            body = $(body);

            // menu left
            body.prepend(
                $('<div>', {
                    class: [config.pageSlidebarClass, config.pageSlidebarLeftClass, 'sb-style-push', 'sb-width-custom'].join(' ')
                }).attr('data-sb-width', config.pageSlideLeftWidth)
            );

            // menu right
            body.prepend(
                $('<div>', {
                    class: [config.pageSlidebarClass, config.pageSlidebarRightClass, 'sb-style-push', 'sb-width-custom'].join(' ')
                }).attr('data-sb-width', config.pageSlideRightWidth)
            );

            // main page
            body.prepend(
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

            // load footer
            $('.' + config.pageClass).loadHeader().loadFooter();

            // load left menu
            $('.' + config.pageSlidebarLeftClass).loadLeftMenu();

            // load right menu
            $('.' + config.pageSlidebarRightClass).loadRightMenu();

            // set document observer for global events
            setDocumentObserver();
        });
    };

    /**
     * set global shortcuts to <body> element
     */
    $.fn.setGlobalShortcuts = function(){
        return this.each((i, body) => {
            body = $(body);

            body.watchKey('tabReload', (body) => {
                location.reload();
            });

            body.watchKey('signaturePaste', (e) => {
                // just send event to the current active map
                let activeMap = Util.getMapModule().getActiveMap();
                if(activeMap){
                    // look for active signature module (active system)
                    let signatureModuleElement = MapUtil.getTabContentElementByMapElement(activeMap).find('.' + config.systemSigModuleClass);
                    if(signatureModuleElement.length){
                        e = e.originalEvent;
                        let targetElement = $(e.target);
                        // do not read clipboard if pasting into form elements
                        if(
                            targetElement.prop('tagName').toLowerCase() !== 'input' &&
                            targetElement.prop('tagName').toLowerCase() !== 'textarea' || (
                                targetElement.is('input[type="search"]')                   // Datatables "search" field bubbles `paste.DT` event :(
                            )
                        ){
                            let clipboard = (e.originalEvent || e).clipboardData.getData('text/plain');
                            signatureModuleElement.trigger('pf:updateSystemSignatureModuleByClipboard', [clipboard]);
                        }
                    }
                }
            });
        });
    };

    /**
     * get main menu title element
     * @param title
     * @returns {JQuery|*|jQuery}
     */
    let getMenuHeadline = function(title){
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
                        class: 'fa fa-user fa-fw'
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
                    let fullScreenElement = $('body');
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
                }).html('&nbsp;&nbsp;Information').prepend(
                    $('<i>',{
                        class: 'fa fa-street-view fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('ShowMapInfo', {tab: 'information'});
                })
            ).append(
                getMenuHeadline('Settings')
            ).append(
                $('<a>', {
                    class: 'list-group-item',
                    href: '#'
                }).html('&nbsp;&nbsp;Configuration').prepend(
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
                $('<a>', {
                    class: 'list-group-item',
                    id: Util.config.menuButtonEndpointId,
                    href: '#'
                }).html('&nbsp;&nbsp;&nbsp;Signatures').prepend(
                    $('<i>',{
                        class: 'fa fa-link fa-fw'
                    })
                ).on('click', function(){
                    Util.getMapModule().getActiveMap().triggerMenuEvent('MapOption', {
                        option: 'mapEndpoint',
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
                }).html('&nbsp;&nbsp;Shortcuts').prepend(
                    $('<i>',{
                        class: 'fa fa-keyboard-o fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('Shortcuts');
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
        let pageElement = $(this);

        let moduleData = {
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
            mapTrackingId: Util.config.headMapTrackingId
        };

        let headRendered = Mustache.render(TplHead, moduleData);

        pageElement.prepend(headRendered);

        // init header =====================================================================

        // init slide menus
        let slideMenu = new $.slidebars({
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
            $(document).triggerMenuEvent('ShowMapInfo', {tab: 'activity'});
        });

        // current location
        $('#' + Util.config.headCurrentLocationId).find('a').on('click', function(){
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
        let mapTrackingCheckbox = $('#' + Util.config.headMapTrackingId);
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
            let value = $(this).is(':checked');
            let tracking = 'off';
            let trackingText = 'Your current location will not actually be added';
            let trackingType = 'info';
            if(value){
                tracking = 'on';
                trackingText = 'New connections will actually be added';
                trackingType = 'success';
            }

            Util.showNotify({title: 'Map tracking: ' + tracking, text: trackingText, type: trackingType}, false);
        });


        // init all tooltips
        let tooltipElements = $('#' + config.pageHeaderId).find('[title]');
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
        let pageElement = $(this);

        let moduleData = {
            id: config.pageFooterId,
            footerLicenceLinkClass: config.footerLicenceLinkClass,
            currentYear: new Date().getFullYear()
        };

        let footerElement = Mustache.render(TplFooter, moduleData);

        pageElement.prepend(footerElement);

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
    let setDocumentObserver = function(){

        // on "full-screen" change event
        $(document).on('fscreenchange', function(e, state, elem){

            let menuButton = $('#' + Util.config.menuButtonFullScreenId);

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

        $(document).on('pf:menuShowTaskManager', function(e, data){
            // show log dialog
            Logging.showDialog();
            return false;
        });

        $(document).on('pf:menuShortcuts', function(e, data){
            // show shortcuts dialog
            $.fn.showShortcutsDialog();
            return false;
        });

        $(document).on('pf:menuShowSettingsDialog', function(e){
            // show character select dialog
            $.fn.showSettingsDialog();
            return false;
        });

        $(document).on('pf:menuShowMapInfo', function(e, data){
            // show map information dialog
            $.fn.showMapInfoDialog(data);
            return false;
        });

        $(document).on('pf:menuShowMapSettings', function(e, data){
            // show map edit dialog or edit map
            let mapData = false;

            let activeMap = Util.getMapModule().getActiveMap();

            if(activeMap){
                mapData = Util.getCurrentMapData( activeMap.data('id') );
            }

            $.fn.showMapSettingsDialog(mapData, data);
            return false;
        });

        $(document).on('pf:menuDeleteMap', function(e){
            // delete current active map
            let mapData = false;

            let activeMap = Util.getMapModule().getActiveMap();

            if(activeMap){
                mapData = activeMap.getMapDataFromClient({forceData: true});
            }

            $.fn.showDeleteMapDialog(mapData);
            return false;
        });

        $(document).on('pf:menuLogout', function(e, data){

            let clearCookies = false;
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
            let activeMap = Util.getMapModule().getActiveMap();

            let userCount = 0;
            let currentLocationData = {};

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
            let options = {
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
        let userData = Util.getCurrentUserData();

        let userInfoElement = $('.' + config.headUserCharacterClass);
        let currentCharacterId = userInfoElement.data('characterId');
        let currentCharactersOptionIds = userInfoElement.data('characterOptionIds') ? userInfoElement.data('characterOptionIds') : [];
        let newCharacterId = 0;
        let newCharacterName = '';

        let userShipElement = $('.' + config.headUserShipClass);
        let currentShipId = userShipElement.data('shipId');
        let newShipId = 0;
        let newShipName = '';

        // function for header element toggle animation
        let animateHeaderElement = function(element, callback, triggerShow){

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

        // check for character/ship changes ---------------------------------------------
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

            // en/disable "map tracking" toggle
            updateMapTrackingToggle(userData.character.logLocation);
        }

        let newCharactersOptionIds = userData.characters.map(function(data){
            return data.id;
        });

        // update user character data ---------------------------------------------------
        if(currentCharactersOptionIds.toString() !== newCharactersOptionIds.toString()){

            let  currentCharacterChanged = false;
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

            let showShipElement = true;
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
     * update "map tracking" toggle in header
     * @param status
     */
    let updateMapTrackingToggle = function(status){
        let mapTrackingCheckbox = $('#' + Util.config.headMapTrackingId);
        if(status === true){
            mapTrackingCheckbox.bootstrapToggle('enable');
        }else{
            mapTrackingCheckbox.bootstrapToggle('off').bootstrapToggle('disable');
        }
    };

    /**
     * delete active character log for the current user
     */
    let deleteLog = function(){

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
    let updateHeaderActiveUserCount = function(userCount){
        let activeUserElement = $('.' + config.headActiveUserClass);
        let badge = activeUserElement.find('.badge');

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
    let updateHeaderCurrentLocation = function(locationData){
        let currentLocationElement = $('#' + Util.config.headCurrentLocationId);
        let linkElement = currentLocationElement.find('a');
        let textElement = linkElement.find('span');

        let tempSystemName = (locationData.currentSystemName) ? locationData.currentSystemName : false;
        let tempSystemId = (locationData.currentSystemId) ? locationData.currentSystemId : 0;

        if(
            linkElement.data('systemName') !== tempSystemName ||
            linkElement.data('systemId') !== tempSystemId
        ){
            linkElement.data('systemName', tempSystemName);
            linkElement.data('systemId', tempSystemId);
            linkElement.toggleClass('disabled', !tempSystemId);

            if(tempSystemName !== false){
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
    let notificationTest = function(){
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
    let initTabChangeObserver = function(){

        // increase the timer if a user is inactive
        let increaseTimer = 10000;

        // timer keys
        let mapUpdateKey = 'UPDATE_SERVER_MAP';
        let mapUserUpdateKey = 'UPDATE_SERVER_USER_DATA';

        // Set the name of the hidden property and the change event for visibility
        let hidden, visibilityChange;
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
        let statusElement = $('.' + config.headProgramStatusClass);
        let icon = statusElement.find('i');
        let textElement = statusElement.find('span');

        let iconClass = false;
        let textClass = false;

        switch(status){
            case 'online':
                iconClass = 'fa-wifi';
                textClass = 'txt-color-green';
                break;
            case 'slow connection':
            case 'problem':
                iconClass = 'fa-warning';
                textClass = 'txt-color-orange';
                break;
            case 'offline':
                iconClass = 'fa-bolt';
                textClass = 'txt-color-red';
                break;
        }

        // "warnings" and "errors" always have priority -> ignore/clear interval
        if(
            textClass === 'txt-color-orange' ||
            textClass === 'txt-color-red'
        ){
            clearInterval(programStatusInterval);
            programStatusInterval = false;
        }

        if( statusElement.data('status') !== status ){
            // status has changed
            if(! programStatusInterval){

                let timer = function(){
                    // change status on first timer iteration
                    if(programStatusCounter === Init.timer.PROGRAM_STATUS_VISIBLE){

                        statusElement.velocity('stop').velocity('fadeOut', {
                            duration: Init.animationSpeed.headerLink,
                            complete: function(){
                                // store current status
                                statusElement.data('status', status);
                                statusElement.removeClass('txt-color-green txt-color-orange txt-color-red');
                                icon.removeClass('fa-wifi fa-warning fa-bolt');
                                statusElement.addClass(textClass);
                                icon.addClass(iconClass);
                                textElement.text(status);
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
    };

    /**
     * show information panel to active users (on bottom)
     * @returns {*|jQuery|HTMLElement}
     */
    $.fn.showGlobalInfoPanel = function (){
        let body = $(this);
        let infoTemplate = 'text!templates/ui/info_panel.html';

        requirejs([infoTemplate, 'mustache'], function(template, Mustache) {
            let data = {
                id: config.globalInfoPanelId
            };
            let content = $( Mustache.render(template, data) );
            content.insertBefore( '#' + config.pageFooterId );
        });

        return body;
    };

    /**
     * get all form Values as object
     * this includes all xEditable fields
     * @returns {{}}
     */
    $.fn.getFormValues = function(){
        let form = $(this);
        let formData = {};
        let values = form.serializeArray();

        // add "unchecked" checkboxes as well
        values = values.concat(
            form.find('input[type=checkbox]:not(:checked)').map(
                function() {
                    return {name: this.name, value: 0};
                }).get()
        );

        for(let field of values){
            // check for numeric values -> convert to Int
            let value = ( /^\d+$/.test(field.value) ) ? parseInt(field.value) : field.value;

            if(field.name.indexOf('[]') !== -1){
                // array field
                let key = field.name.replace('[]', '');
                if( !$.isArray(formData[key]) ){
                    formData[key] = [];
                }

                formData[key].push( value);
            }else{
                formData[field.name] = value;
            }
        }

        // get xEditable values
        let editableValues = form.find('.' + Util.config.formEditableFieldClass).editable('getValue');

        // merge values
        formData = $.extend(formData, editableValues);

        return formData;
    };

    return {
        initTabChangeObserver: initTabChangeObserver
    };


});