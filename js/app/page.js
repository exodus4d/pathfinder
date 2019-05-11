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
    'app/map/contextmenu',
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
], ($, Init, Util, Logging, Mustache, MapUtil, MapContextMenu, TplLogo, TplHead, TplFooter) => {

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
        footerLicenceLinkClass: 'pf-footer-licence',                            // class for "licence" link

        // menu
        menuHeadMenuLogoClass: 'pf-head-menu-logo',                             // class for main menu logo
        menuClockClass: 'pf-menu-clock',                                        // class for EVE-Time clock

        // helper element
        dynamicElementWrapperId: 'pf-dialog-wrapper',                           // class for container element that holds hidden "context menus"

        // system signature module
        systemSignatureModuleClass: 'pf-system-signature-module',               // module wrapper (signatures)
        systemIntelModuleClass: 'pf-system-intel-module',                       // module wrapper (intel)
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
                    Util.getMapModule(),
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

            // set page observer for global events
            setPageObserver();
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

            body.watchKey('newSignature', (body) => {
                let activeMap = Util.getMapModule().getActiveMap();
                if(activeMap){
                    let mapContentElement = MapUtil.getTabContentElementByMapElement(activeMap);
                    let signatureModuleElement = mapContentElement.find('.' + config.systemSignatureModuleClass);
                    signatureModuleElement.trigger('pf:showSystemSignatureModuleAddNew');
                }
            });

            body.watchKey('clipboardPaste', (e) => {
                // just send event to the current active map
                let activeMap = Util.getMapModule().getActiveMap();
                if(activeMap){
                    // look for active signature module (active system)
                    let mapContentElement = MapUtil.getTabContentElementByMapElement(activeMap);
                    let signatureModuleElement = mapContentElement.find('.' + config.systemSignatureModuleClass);
                    let intelModuleElement = mapContentElement.find('.' + config.systemIntelModuleClass);
                    if(
                        signatureModuleElement.length ||
                        intelModuleElement.length
                    ){
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
                            intelModuleElement.trigger('pf:updateIntelModuleByClipboard', [clipboard]);
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
    let getMenuHeadline = (title) => {
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
                        class: 'fas fa-home fa-fw'
                    })
                )
            ).append(
                getMenuHeadline('Information')
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-info'
                }).html('&nbsp;&nbsp;Statistics').prepend(
                    $('<i>',{
                        class: 'fas fa-chart-line fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('ShowStatsDialog');
                })
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-info'
                }).html('&nbsp;&nbsp;Effect info').prepend(
                    $('<i>',{
                        class: 'fas fa-crosshairs fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('ShowSystemEffectInfo');
                })
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-info'
                }).html('&nbsp;&nbsp;Jump info').prepend(
                    $('<i>',{
                        class: 'fas fa-space-shuttle fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('ShowJumpInfo');
                })
            ).append(
                getMenuHeadline('Settings')
            ).append(
                $('<a>', {
                    class: 'list-group-item'
                }).html('&nbsp;&nbsp;Account').prepend(
                    $('<i>',{
                        class: 'fas fa-user fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('ShowSettingsDialog');
                })
            ).append(
                $('<a>', {
                    class: 'list-group-item hide',                      // trigger by js
                    id: Util.config.menuButtonFullScreenId
                }).html('&nbsp;&nbsp;Full screen').prepend(
                    $('<i>',{
                        class: 'fas fa-expand-arrows-alt fa-fw'
                    })
                ).on('click', function(){
                    let fullScreenElement = $('body');
                    requirejs(['jquery', 'fullScreen'], function($){

                        if($.fullscreen.isFullScreen()){
                            $.fullscreen.exit();
                        }else{
                            fullScreenElement.fullscreen({overflow: 'scroll', toggleClass: config.fullScreenClass});
                        }
                    });
                })
            ).append(
                $('<a>', {
                    class: 'list-group-item'
                }).html('&nbsp;&nbsp;Notification test').prepend(
                    $('<i>',{
                        class: 'fas fa-volume-up fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('NotificationTest');
                })
            ).append(
                getMenuHeadline('Danger zone')
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-danger'
                }).html('&nbsp;&nbsp;Delete account').prepend(
                    $('<i>',{
                        class: 'fas fa-user-times fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('DeleteAccount');
                })
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-warning'
                }).html('&nbsp;&nbsp;Logout').prepend(
                    $('<i>',{
                        class: 'fas fa-sign-in-alt fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('Logout', {clearCookies: 1});
                })
            ).append(
                $('<div>', {
                    class: config.menuClockClass
                })
            )
        );

        requirejs(['fullScreen'], function(){
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
                    class: 'list-group-item'
                }).html('&nbsp;&nbsp;Information').prepend(
                    $('<i>',{
                        class: 'fas fa-street-view fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('ShowMapInfo', {tab: 'information'});
                })
            ).append(
                getMenuHeadline('Configuration')
            ).append(
                $('<a>', {
                    class: 'list-group-item'
                }).html('&nbsp;&nbsp;Settings').prepend(
                    $('<i>',{
                        class: 'fas fa-cogs fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('ShowMapSettings', {tab: 'settings'});
                })
            ).append(
                $('<a>', {
                    class: 'list-group-item',
                    id: Util.config.menuButtonGridId
                }).html('&nbsp;&nbsp;Grid snapping').prepend(
                    $('<i>',{
                        class: 'fas fa-th fa-fw'
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
                    id: Util.config.menuButtonMagnetizerId
                }).html('&nbsp;&nbsp;Magnetizing').prepend(
                    $('<i>',{
                        class: 'fas fa-magnet fa-fw'
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
                    id: Util.config.menuButtonEndpointId
                }).html('&nbsp;&nbsp;Signatures').prepend(
                    $('<i>',{
                        class: 'fas fa-link fa-fw'
                    })
                ).on('click', function(){
                    Util.getMapModule().getActiveMap().triggerMenuEvent('MapOption', {
                        option: 'mapEndpoint',
                        toggle: true
                    });
                })
            ).append(
                $('<a>', {
                    class: 'list-group-item',
                    id: Util.config.menuButtonCompactId
                }).html('&nbsp;&nbsp;Compact').prepend(
                    $('<i>',{
                        class: 'fas fa-compress fa-fw'
                    })
                ).append(
                    $('<span>',{
                        class: 'badge bg-color bg-color-gray txt-color txt-color-warning',
                        text: 'beta'
                    })
                ).on('click', function(){
                    Util.getMapModule().getActiveMap().triggerMenuEvent('MapOption', {
                        option: 'mapCompact',
                        toggle: true
                    });
                })
            ).append(
                getMenuHeadline('Help')
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-info'
                }).html('&nbsp;&nbsp;Manual').prepend(
                    $('<i>',{
                        class: 'fas fa-book-reader fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('Manual');
                })
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-info'
                }).html('&nbsp;&nbsp;Shortcuts').prepend(
                    $('<i>',{
                        class: 'fas fa-keyboard fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('Shortcuts');
                })
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-info'
                }).html('&nbsp;&nbsp;Task-Manager').prepend(
                    $('<i>',{
                        class: 'fas fa-tasks fa-fw'
                    })
                ).on('click', function(){
                    $(document).triggerMenuEvent('ShowTaskManager');
                })
            ).append(
                getMenuHeadline('Danger zone')
            ).append(
                $('<a>', {
                    class: 'list-group-item list-group-item-danger',
                    id: Util.config.menuButtonMapDeleteId
                }).html('&nbsp;&nbsp;Delete map').prepend(
                    $('<i>',{
                        class: 'fas fa-trash fa-fw'
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
    $.fn.triggerMenuEvent = function(event, data = {}){
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

        // init header ================================================================================================

        // init slide menus
        let slideMenu = new $.slidebars({
            scrollLock: false
        });

        // main menus
        $('.' + config.headMenuClass).on('click', function(e){
            e.preventDefault();
            slideMenu.slidebars.toggle('left');
        });

        $('.' + config.headMapClass).on('click', function(e){
            e.preventDefault();
            slideMenu.slidebars.toggle('right');
        });

        // active pilots
        $('.' + config.headActiveUserClass).on('click', function(){
            $(document).triggerMenuEvent('ShowMapInfo', {tab: 'activity'});
        });

        // current location
        $('#' + Util.config.headCurrentLocationId).find('a').on('click', function(){
            Util.getMapModule().getActiveMap().triggerMenuEvent('SelectSystem', {systemId: $(this).data('systemId')});
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

        mapTrackingCheckbox.on('change', function(e){
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
            id: Util.config.footerId,
            footerLicenceLinkClass: config.footerLicenceLinkClass,
            currentYear: new Date().getFullYear()
        };

        let footerElement = Mustache.render(TplFooter, moduleData);

        pageElement.prepend(footerElement);

        // init footer ================================================================================================
        pageElement.find('.' + config.footerLicenceLinkClass).on('click', function(){
            //show credits info dialog
            $.fn.showCreditsDialog();
        });

        return this;
    };

    /**
     * catch all global document events
     */
    let setPageObserver = function(){
        let documentElement = $(document);
        let bodyElement = $(document.body);

        // on "full-screen" change event
        documentElement.on('fscreenchange', function(e, state, elem){
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

        documentElement.on('pf:menuShowStatsDialog', function(e){
            // show user activity stats dialog
            $.fn.showStatsDialog();
            return false;
        });

        documentElement.on('pf:menuShowSystemEffectInfo', function(e){
            // show system effects dialog
            $.fn.showSystemEffectInfoDialog();
            return false;
        });

        documentElement.on('pf:menuShowJumpInfo', function(e){
            // show system effects info box
            $.fn.showJumpInfoDialog();
            return false;
        });

        documentElement.on('pf:menuNotificationTest', function(e){
            // show system effects info box
            notificationTest();
            return false;
        });

        documentElement.on('pf:menuDeleteAccount', function(e){
            // show "delete account" dialog
            $.fn.showDeleteAccountDialog();
            return false;
        });

        documentElement.on('pf:menuManual', function(e){
            // show map manual
            $.fn.showMapManual();
            return false;
        });

        documentElement.on('pf:menuShowTaskManager', function(e, data){
            // show log dialog
            Logging.showDialog();
            return false;
        });

        documentElement.on('pf:menuShortcuts', function(e, data){
            // show shortcuts dialog
            $.fn.showShortcutsDialog();
            return false;
        });

        documentElement.on('pf:menuShowSettingsDialog', function(e){
            // show character select dialog
            $.fn.showSettingsDialog();
            return false;
        });

        documentElement.on('pf:menuShowMapInfo', function(e, data){
            // show map information dialog
            $.fn.showMapInfoDialog(data);
            return false;
        });

        documentElement.on('pf:menuShowMapSettings', function(e, data){
            // show map edit dialog or edit map
            let mapData = false;

            let activeMap = Util.getMapModule().getActiveMap();

            if(activeMap){
                mapData = Util.getCurrentMapData( activeMap.data('id') );
            }

            $.fn.showMapSettingsDialog(mapData, data);
            return false;
        });

        documentElement.on('pf:menuDeleteMap', function(e){
            // delete current active map
            let mapData = false;

            let activeMap = Util.getMapModule().getActiveMap();

            if(activeMap){
                mapData = activeMap.getMapDataFromClient(['hasId']);
            }

            $.fn.showDeleteMapDialog(mapData);
            return false;
        });

        documentElement.on('pf:menuLogout', function(e, data){

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

        // END menu events ============================================================================================

        // global "popover" callback (for all popovers)
        $('.' + Util.config.popoverTriggerClass).on('hide.bs.popover', function(e){
            let popoverElement = $(this).data('bs.popover').tip();

            // destroy all active tooltips inside this popover
            popoverElement.destroyTooltip(true);
        });

        // global "modal" callback (for all modals)
        bodyElement.on('hide.bs.modal', '> .modal', function(e){
            let modalElement = $(this);
            modalElement.destroyTimestampCounter(true);

            // destroy all Select2
            modalElement.find('.' + Util.config.select2Class)
                .filter((i, element) => $(element).data('select2'))
                .select2('destroy');
        });

        // global "close" trigger for context menus
        bodyElement.on('click.contextMenuClose', function(e){
            MapContextMenu.closeMenus();
        });

        // disable menu links based on current map config
        documentElement.on('pf:updateMenuOptions', function(e, data){
            let hasRightMapDelete = MapUtil.checkRight('map_delete', data.mapConfig);
            $('#' + Util.config.menuButtonMapDeleteId).toggleClass('disabled', !hasRightMapDelete);
        });

        // update header links with current map data
        documentElement.on('pf:updateHeaderMapData', function(e, data){
            let activeMap = Util.getMapModule().getActiveMap();

            let userCountInside = 0;
            let userCountOutside = 0;
            let userCountInactive = 0;
            let currentLocationData = {};

            // show active user just for the current active map
            if(
                activeMap &&
                activeMap.data('id') === data.mapId
            ){
                userCountInside = data.userCountInside;
                userCountOutside = data.userCountOutside;
                userCountInactive = data.userCountInactive;
                currentLocationData = data.currentLocation;
            }
            updateHeaderActiveUserCount(userCountInside, userCountOutside, userCountInactive);
            updateHeaderCurrentLocation(currentLocationData);
        });

        // shutdown the program -> show dialog
        documentElement.on('pf:shutdown', function(e, data){
            // show shutdown dialog
            let options = {
                buttons: {
                    logout: {
                        label: '<i class="fas fa-fw fa-sync"></i> restart',
                        className: ['btn-primary'].join(' '),
                        callback: function(){
                            if(data.redirect) {
                                //  ... redirect user to e.g. login form page ...
                                Util.redirect(data.redirect, ['logout']);
                            }else if(data.reload){
                                // ... or reload current page ...
                                location.reload();
                            }else{
                                // ... fallback try to logout user
                                documentElement.trigger('pf:menuLogout');
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
            if(data.error && data.error.length){
                for(let error of data.error){
                    options.content.textSmaller.push(error.message);
                }
            }

            $.fn.showNotificationDialog(options);

            documentElement.setProgramStatus('offline');

            Util.showNotify({title: 'Logged out', text: data.reason, type: 'error'}, false);

            // remove map ---------------------------------------------------------------------------------------------
            Util.getMapModule().velocity('fadeOut', {
                duration: 300,
                complete: function(){
                    $(this).remove();
                }
            });

            return false;
        });

        initEveClock();
    };

    /**
     * init clock element with current EVE time
     */
    let initEveClock = () => {
        let clockElement = $('.' + config.menuClockClass);

        let checkTime = (i) => {
            return  (i < 10) ? '0' + i : i;
        };

        let startTime = () => {
            let date = Util.getServerTime();
            let h = date.getHours();
            let m = checkTime(date.getMinutes());
            clockElement.text(h + ':' + m);

            let t = setTimeout(startTime, 500);
        };

        startTime();
    };

    /**
     * updates the header with current user data
     */
    $.fn.updateHeaderUserData = function(){
        let userData = Util.getCurrentUserData();

        let userInfoElement             = $('.' + config.headUserCharacterClass);
        let currentCharacterId          = userInfoElement.data('characterId');
        let currentCharactersOptionIds  = userInfoElement.data('characterOptionIds') ? userInfoElement.data('characterOptionIds') : [];
        let newCharacterId              = 0;
        let newCharacterName            = '';

        let userShipElement             = $('.' + config.headUserShipClass);
        let currentShipData             = userShipElement.data('shipData');
        let currentShipId               = Util.getObjVal(currentShipData, 'typeId') || 0;
        let newShipData                 = {
            typeId: 0,
            typeName: ''
        };

        // function for header element toggle animation
        let animateHeaderElement = (element, callback, triggerShow) => {
            let currentOpacity = parseInt(element.css('opacity'));

            let showHeaderElement = (element) => {
                element.show().velocity({
                    opacity: [ 1, 0 ]
                },{
                   // display: 'block',
                    visibility : 'visible',
                    duration: 1000
                });
            };

            let hideHeaderElement = (element, callback) => {
                element.velocity('stop').velocity({
                    opacity: [ 0, 1 ]
                },{
                   // display: 'none',
                    visibility : 'hidden',
                    duration: 1000,
                    complete: function(){
                        element.hide();
                        // callback
                        callback($(this));
                    }
                });
            };

            // run show/hide toggle in the correct order
            if(currentOpacity > 0 && triggerShow){
                // hide then show animation
                hideHeaderElement(element, (element) => {
                    callback(element);
                    showHeaderElement(element);
                });
            }else if(currentOpacity > 0 && !triggerShow){
                // hide animation
                hideHeaderElement(element, (element) => {
                    element.hide();
                    callback(element);
                });
            }else if(currentOpacity === 0 && triggerShow){
                // show animation
                callback(element);
                showHeaderElement(element);
            }else{
                // no animation
                callback(element);
            }
        };

        // check for character/ship changes ---------------------------------------------------------------------------
        if(
            userData &&
            userData.character
        ){
            newCharacterId = userData.character.id;
            newCharacterName = userData.character.name;

            if(userData.character.log){
                newShipData = userData.character.log.ship;
            }

            // en/disable "map tracking" toggle
            updateMapTrackingToggle(userData.character.logLocation);
        }

        let newCharactersOptionIds = userData.characters.map(function(data){
            return data.id;
        });

        // update user character data ---------------------------------------------------------------------------------
        if(currentCharactersOptionIds.toString() !== newCharactersOptionIds.toString()){

            let  currentCharacterChanged = false;
            if(currentCharacterId !== newCharacterId){
                currentCharacterChanged = true;
            }

            // toggle element
            animateHeaderElement(userInfoElement, (userInfoElement) => {
                if(currentCharacterChanged){
                    userInfoElement.find('span').text( newCharacterName );
                    userInfoElement.find('img').attr('src', Init.url.ccpImageServer + '/Character/' + newCharacterId + '_32.jpg');
                }
                // init "character switch" popover
                userInfoElement.initCharacterSwitchPopover(userData);
            }, true);

            // store new id(s) for next check
            userInfoElement.data('characterId', newCharacterId);
            userInfoElement.data('characterOptionIds', newCharactersOptionIds);
        }

        // update user ship data --------------------------------------------------------------------------------------
        if(currentShipId !== newShipData.typeId){
            // set new data for next check
            userShipElement.data('shipData', newShipData);

            let showShipElement = newShipData.typeId > 0;

            // toggle element
            animateHeaderElement(userShipElement, (userShipElement) => {
                userShipElement.find('span').text( newShipData.typeName );
                userShipElement.find('img').attr('src', Init.url.ccpImageServer + '/Render/' + newShipData.typeId + '_32.png');
                // trigger ship change event
                $(document).trigger('pf:activeShip', {
                    shipData: newShipData
                });
            }, showShipElement);
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
     * @param userCountInside
     * @param userCountOutside
     * @param userCountInactive
     */
    let updateHeaderActiveUserCount = (userCountInside, userCountOutside, userCountInactive) => {
        let activeUserElement = $('.' + config.headActiveUserClass);

        let updateCount = (badge, count) => {
            let changed = false;
            if(badge.data('userCount') !== count){
                changed = true;
                badge.data('userCount', count);
                badge.text(count);

                badge.toggleClass(badge.attr('data-on'), (count > 0) );
                badge.toggleClass(badge.attr('data-off'), (count === 0) );
            }
            return changed;
        };

        let changedInside = updateCount(activeUserElement.find('.badge[data-type="inside"]'), userCountInside);
        let changedOutside = updateCount(activeUserElement.find('.badge[data-type="outside"]'), userCountOutside);
        let changedInactive = updateCount(activeUserElement.find('.badge[data-type="inactive"]'), userCountInactive);

        if(
            (changedInactive || changedOutside || changedInactive) &&
            !activeUserElement.is(':visible')
        ){
            activeUserElement.velocity('fadeIn', {duration: Init.animationSpeed.headerLink});
        }
    };

    /**
     * update the "current location" link element in head
     * @param locationData
     */
    let updateHeaderCurrentLocation = locationData => {
        let systemId = locationData.id || 0;
        let systemName = locationData.name || false;

        let currentLocationData = Util.getCurrentLocationData();

        if(
            currentLocationData.name !== systemName ||
            currentLocationData.id !== systemId
        ){
            Util.setCurrentLocationData(systemId, systemName);

            let currentLocationElement = $('#' + Util.config.headCurrentLocationId);
            let linkElement = currentLocationElement.find('a');
            linkElement.toggleClass('disabled', !systemId);

            if(systemName !== false){
                linkElement.find('span').text(locationData.name);
                currentLocationElement.velocity('fadeIn', {duration: Init.animationSpeed.headerLink});
            }else{
                if(currentLocationElement.is(':visible')){
                    currentLocationElement.velocity('fadeOut', {duration: Init.animationSpeed.headerLink});
                }
            }

            // auto select current system -----------------------------------------------------------------------------
            let userData = Util.getCurrentUserData();

            if(
                Boolean(Util.getObjVal(Init, 'character.autoLocationSelect')) &&
                Util.getObjVal(userData, 'character.selectLocation')
            ){
                Util.getMapModule().getActiveMap().triggerMenuEvent('SelectSystem', {systemId: systemId, forceSelect: false});
            }
        }
    };

    /**
     * shows a test notification for desktop messages
     */
    let notificationTest = () => {
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
    let initTabChangeObserver = () => {

        // increase the timer if a user is inactive
        let increaseTimer = 5000;

        // timer keys
        let mapUpdateKey = 'UPDATE_SERVER_MAP';
        let mapUserUpdateKey = 'UPDATE_SERVER_USER_DATA';

        // Set the name of the hidden property and the change event for visibility
        let hidden, visibilityChange;
        if(typeof document.hidden !== 'undefined'){ // Opera 12.10 and Firefox 18 and later support
            hidden = 'hidden';
            visibilityChange = 'visibilitychange';
        }else if(typeof document.mozHidden !== 'undefined'){
            hidden = 'mozHidden';
            visibilityChange = 'mozvisibilitychange';
        }else if(typeof document.msHidden !== 'undefined'){
            hidden = 'msHidden';
            visibilityChange = 'msvisibilitychange';
        }else if(typeof document.webkitHidden !== 'undefined'){
            hidden = 'webkitHidden';
            visibilityChange = 'webkitvisibilitychange';
        }

        // function is called if the tab becomes active/inactive
        let handleVisibilityChange = () => {
            if(document[hidden]){
                // tab is invisible
                // globally store current visibility status
                window.isVisible = false;

                Util.getCurrentTriggerDelay( mapUpdateKey, increaseTimer );
                Util.getCurrentTriggerDelay( mapUserUpdateKey, increaseTimer );
            }else{
                // tab is visible
                // globally store current visibility status
                window.isVisible = true;

                Util.getCurrentTriggerDelay( mapUpdateKey, -increaseTimer );
                Util.getCurrentTriggerDelay( mapUserUpdateKey, -increaseTimer );

                // stop blinking tab from previous notifications
                Util.stopTabBlink();
            }
        };

        if(
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
     * add "hidden" context menu elements to page
     */
    let renderMapContextMenus = () => {
        Promise.all([
            MapContextMenu.renderMapContextMenu(),
            MapContextMenu.renderConnectionContextMenu(),
            MapContextMenu.renderEndpointContextMenu(),
            MapContextMenu.renderSystemContextMenu(Init.systemStatus)
        ]).then(payloads => {
            $('#' + config.dynamicElementWrapperId).append(payloads.join(''));
        });
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
                iconClass = 'fa-exclamation-triangle';
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
                // check if timer exists if not -> set default (in case of the "init" ajax call failed
                let programStatusVisible = Init.timer ? Init.timer.PROGRAM_STATUS_VISIBLE : 5000;

                let timer = function(){
                    // change status on first timer iteration
                    if(programStatusCounter === programStatusVisible){

                        statusElement.velocity('stop').velocity('fadeOut', {
                            duration: Init.animationSpeed.headerLink,
                            complete: function(){
                                // store current status
                                statusElement.data('status', status);
                                statusElement.removeClass('txt-color-green txt-color-orange txt-color-red');
                                icon.removeClass('fa-wifi fa-exclamation-triangle fa-bolt');
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

                if(!programStatusInterval){
                    programStatusCounter = programStatusVisible;
                    programStatusInterval = setInterval(timer, 1000);
                }
            }
        }
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
                function(){
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
        initTabChangeObserver: initTabChangeObserver,
        renderMapContextMenus: renderMapContextMenus
    };

});