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
    'slidebars',
    'text!img/logo.svg!strip',
    'text!templates/layout/header_map.html',
    'text!templates/layout/footer_map.html',
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
    'app/module_map'
], ($, Init, Util, Logging, Mustache, MapUtil, MapContextMenu, SlideBars, TplLogo, TplHead, TplFooter) => {

    'use strict';

    let config = {
        // page structure and slide menus
        pageMenuClass: 'pf-menu',
        pageMenuLeftClass: 'pf-menu-left',                                      // class for left menu
        pageMenuRightClass: 'pf-menu-right',                                    // class for right menu

        // page structure
        pageClass: 'pf-site',

        // header
        pageHeaderId: 'pf-head',                                                // id for page head
        headClass: 'pf-head',                                                   // class for page head
        headMenuClass: 'pf-head-menu',                                          // class for page head menu button (left)
        headMapClass: 'pf-head-map',                                            // class for page head map button (right)
        headUserCharacterClass: 'pf-head-user-character',                       // class for "user settings" link
        userCharacterImageClass: 'pf-head-user-character-image',                // class for "current user image"

        headActiveUsersClass: 'pf-head-active-users',                           // class for "active users" link
        headProgramStatusClass: 'pf-head-program-status',                       // class for "program status" notification

        headMaxLocationHistoryBreadcrumbs: 3,                                   // max breadcrumb count for character log history

        // footer
        footerLicenceLinkClass: 'pf-footer-licence',                            // class for "licence" link
        footerClockClass: 'pf-footer-clock',                                    // class for EVE-Time clock

        // menu
        menuHeadMenuLogoClass: 'pf-head-menu-logo',                             // class for main menu logo

        // helper element
        dynamicElementWrapperId: 'pf-dialog-wrapper',                           // class for container element that holds hidden "context menus"

        // system signature module
        systemSignatureModuleClass: 'pf-system-signature-module',               // module wrapper (signatures)
        systemIntelModuleClass: 'pf-system-intel-module',                       // module wrapper (intel)
    };

    let menuBtnTypes = {
        'info': {class: 'list-group-item-info'},
        'danger': {class: 'list-group-item-danger'},
        'warning': {class: 'list-group-item-warning'}
    };

    let programStatusCounter = 0;                                               // current count down in s until next status change is possible
    let programStatusInterval = false;                                          // interval timer until next status change is possible

    /**
     * set an DOM element to fullscreen mode
     * @ see https://developer.mozilla.org/docs/Web/API/Fullscreen_API
     * @param element
     */
    let toggleFullScreen = element => {
        if(
            document.fullscreenEnabled &&
            element.requestFullscreen
        ){
            let fullScreenButton = $('#' + Util.config.menuButtonFullScreenId);

            if(!document.fullscreenElement){
                element.requestFullscreen().then(() => {
                    fullScreenButton.toggleClass('active', true);
                    // close open menu
                    Util.triggerMenuAction(document, 'Close');
                });
            }else{
                if(document.exitFullscreen){
                    document.exitFullscreen().then(() => {
                        fullScreenButton.toggleClass('active', false);
                    });
                }
            }
        }
    };

    /**
     * init tooltips in header navbar
     * @param element
     */
    let initHeaderTooltips = element => {
        element.find('[title]').tooltip({
            placement: 'bottom',
            delay: {
                show: 500,
                hide: 0
            }
        });
    };

    /**
     * load main page structure elements and navigation container into body
     * @returns {*|w.fn.init|jQuery|HTMLElement}
     */
    let loadPageStructure = () => {

        let executor = resolve => {
            let body = $('body');

            let pageElement = $('<div>', {
                class: config.pageClass
            }).attr('canvas', 'container').append(
                Util.getMapModule(),
                $('<div>', {
                    id: config.dynamicElementWrapperId
                })
            );

            let pageMenuLeftElement = $('<div>', {
                class: [config.pageMenuClass, config.pageMenuLeftClass].join(' ')
            }).attr('off-canvas', [config.pageMenuLeftClass, 'left', 'push'].join(' '));

            let pageMenuRightElement = $('<div>', {
                class: [config.pageMenuClass, config.pageMenuRightClass].join(' ')
            }).attr('off-canvas', [config.pageMenuRightClass, 'right', 'push'].join(' '));

            body.prepend(pageElement, pageMenuLeftElement, pageMenuRightElement);

            Promise.all([
                loadHeader(pageElement),
                loadFooter(pageElement),
                loadLeftMenu(pageMenuLeftElement),
                loadRightMenu(pageMenuRightElement),
            ]).then(payload => Promise.all([
                setMenuObserver(payload[2].data),
                setMenuObserver(payload[3].data),
                setDocumentObserver(),
                setBodyObserver(),
                setGlobalShortcuts()
            ])).then(() => resolve({
                action: 'loadPageStructure',
                data: {}
            }));
        };

        return new Promise(executor);
    };

    /**
     * build main menu from mapConfig array
     * @param menuConfig
     * @returns {*|w.fn.init|jQuery|HTMLElement}
     */
    let getMenu = menuConfig => {
        let menu = $('<div>', {class: 'list-group'});

        for(let itemConfig of menuConfig){
            if(!itemConfig) continue;  // skip "null" items -> if item is not available
            let item;

            switch(itemConfig.type){
                case 'button':
                    let className = Util.getObjVal(menuBtnTypes, itemConfig.btnType + '.class') || '';
                    className += itemConfig.class || '';

                    item = $('<a>', {
                        id: itemConfig.id || undefined,
                        class: 'list-group-item ' + className,
                        href: itemConfig.href || undefined,
                        html: '&nbsp;&nbsp;' + itemConfig.label
                    });

                    if(itemConfig.action){
                        item.attr('data-action', itemConfig.action);
                        if(itemConfig.target){
                            item.attr('data-target', itemConfig.target);
                        }
                        if(itemConfig.data){
                            item.data('payload', itemConfig.data);
                        }
                    }

                    if(itemConfig.icon){
                        item.prepend(
                            $('<i>',{
                                class: 'fas fa-fw ' + itemConfig.icon
                            })
                        );
                    }
                    break;
                case 'heading':
                    item = $('<div>', {
                        class: 'panel-heading'
                    }).prepend(
                        $('<h2>',{
                            class: 'panel-title',
                            text: itemConfig.label
                        })
                    );
                    break;
            }

            menu.append(item);
        }

        return menu;
    };

    /**
     * load left menu content options
     * @param pageMenuLeftElement
     * @returns {Promise<any>}
     */
    let loadLeftMenu = pageMenuLeftElement => {

        let executor = resolve => {
            pageMenuLeftElement.append(getMenu([
                {
                    type: 'button',
                    label: 'Home',
                    icon: 'fa-home',
                    href: '/'
                },{
                    type: 'heading',
                    label: 'Information'
                },{
                    type: 'button',
                    label: 'Statistics',
                    icon: 'fa-chart-line',
                    btnType: 'info',
                    action: 'ShowStatsDialog'
                },{
                    type: 'button',
                    label: 'Wormhole data',
                    icon: 'fa-space-shuttle',
                    btnType: 'info',
                    action: 'ShowJumpInfo'
                },{
                    type: 'button',
                    label: 'Wormhole effects',
                    icon: 'fa-crosshairs',
                    btnType: 'info',
                    action: 'ShowSystemEffectInfo'
                },{
                    type: 'heading',
                    label: 'Settings'
                },{
                    type: 'button',
                    label: 'Account',
                    icon: 'fa-user',
                    action: 'ShowSettingsDialog'
                }, document.fullscreenEnabled ? {
                    type: 'button',
                    id: Util.config.menuButtonFullScreenId,
                    label: 'Full screen',
                    icon: 'fa-expand-arrows-alt',
                    action: 'Fullscreen'
                } : null,{
                    type: 'button',
                    label: 'Notification test',
                    icon: 'fa-volume-up',
                    action: 'NotificationTest'
                },{
                    type: 'heading',
                    label: 'Danger zone'
                },{
                    type: 'button',
                    label: 'Delete account',
                    icon: 'fa-user-times',
                    btnType: 'danger',
                    action: 'DeleteAccount'
                },{
                    type: 'button',
                    label: 'Logout',
                    icon: 'fa-sign-in-alt',
                    btnType: 'warning',
                    action: 'Logout',
                    data: {clearCookies: 1}
                }
            ]));

            resolve({
                action: 'loadLeftMenu',
                data: pageMenuLeftElement
            });
        };

        return new Promise(executor);
    };

    /**
     * load right menu content options
     * @param pageMenuRightElement
     * @returns {Promise<any>}
     */
    let loadRightMenu = pageMenuRightElement => {

        let executor = resolve => {
            pageMenuRightElement.append(getMenu([
                {
                    type: 'button',
                    label: 'Information',
                    icon: 'fa-street-view',
                    action: 'ShowMapInfo',
                    data: {tab: 'information'}
                },{
                    type: 'heading',
                    label: 'Configuration'
                },{
                    type: 'button',
                    class: 'loading',
                    label: 'Settings',
                    icon: 'fa-cogs',
                    action: 'ShowMapSettings',
                    data: {tab: 'settings'}
                },{
                    type: 'button',
                    id: Util.config.menuButtonGridId,
                    class: 'loading',
                    label: 'Grid snapping',
                    icon: 'fa-th',
                    action: 'MapOption',
                    target: 'map',
                    data: {option: 'mapSnapToGrid', toggle: true}
                },{
                    type: 'button',
                    id: Util.config.menuButtonMagnetizerId,
                    class: 'loading',
                    label: 'Magnetizing',
                    icon: 'fa-magnet',
                    action: 'MapOption',
                    target: 'map',
                    data: {option: 'mapMagnetizer', toggle: true}
                },{
                    type: 'button',
                    id: Util.config.menuButtonEndpointId,
                    class: 'loading',
                    label: 'Signatures',
                    icon: 'fa-link',
                    action: 'MapOption',
                    target: 'map',
                    data: {option: 'mapSignatureOverlays', toggle: true}
                },{
                    type: 'button',
                    id: Util.config.menuButtonCompactId,
                    class: 'loading',
                    label: 'Compact',
                    icon: 'fa-compress',
                    action: 'MapOption',
                    target: 'map',
                    data: {option: 'mapCompact', toggle: true}
                },{
                    type: 'heading',
                    label: 'Help'
                },{
                    type: 'button',
                    label: 'Manual',
                    icon: 'fa-book-reader',
                    btnType: 'info',
                    action: 'Manual'
                },{
                    type: 'button',
                    label: 'Shortcuts',
                    icon: 'fa-keyboard',
                    btnType: 'info',
                    action: 'Shortcuts'
                },{
                    type: 'button',
                    label: 'Task-Manager',
                    icon: 'fa-tasks',
                    btnType: 'info',
                    action: 'ShowTaskManager'
                },{
                    type: 'heading',
                    label: 'Danger zone'
                },{
                    type: 'button',
                    id: Util.config.menuButtonMapDeleteId,
                    label: 'Delete map',
                    icon: 'fa-trash',
                    btnType: 'danger',
                    action: 'DeleteMap'
                }
            ]));

            resolve({
                action: 'loadRightMenu',
                data: pageMenuRightElement
            });
        };

        return new Promise(executor);
    };

    /**
     * load page header
     * @param pageElement
     * @returns {Promise<any>}
     */
    let loadHeader = pageElement => {

        let executor = resolve => {
            let moduleData = {
                id:                         config.pageHeaderId,
                logo:                       () => Mustache.render(TplLogo, {}),
                brandLogo:                  config.menuHeadMenuLogoClass,
                popoverTriggerClass:        Util.config.popoverTriggerClass,
                userCharacterClass:         config.headUserCharacterClass,
                userCharacterImageClass:    config.userCharacterImageClass,
                usersActiveClass:           config.headActiveUsersClass,
                userLocationId:             Util.config.headUserLocationId,
                mapTrackingId:              Util.config.headMapTrackingId
            };

            pageElement.prepend(Mustache.render(TplHead, moduleData));

            // init header --------------------------------------------------------------------------------------------

            $('.' + config.headMenuClass).on('click.menuOpen', e => {
                e.preventDefault();
                e.stopPropagation();
                Util.triggerMenuAction(document, 'Toggle', {menuClass: config.pageMenuLeftClass});
            });

            $('.' + config.headMapClass).on('click.menuOpen', e => {
                e.preventDefault();
                e.stopPropagation();
                Util.triggerMenuAction(document, 'Toggle', {menuClass: config.pageMenuRightClass});
            });

            // active pilots
            $('.' + config.headActiveUsersClass).on('click', () => {
                Util.triggerMenuAction(document, 'ShowMapInfo', {tab: 'activity'});
            });

            // current location
            $('#' + Util.config.headUserLocationId).on('click', '>li', e => {
                // this is CCPs systemId
                let breadcrumbElement = $(e.currentTarget);
                let systemId = parseInt(breadcrumbElement.attr('data-systemId'));
                let systemName = breadcrumbElement.attr('data-systemName');

                // ... we need to the PF systemId for 'SelectSystem' trigger
                let activeMap = Util.getMapModule().getActiveMap();
                if(activeMap) {
                    let mapData = Util.getCurrentMapData(activeMap.data('id'));
                    let systemData = MapUtil.getSystemDataFromMapData(mapData, systemId, 'systemId');
                    if(systemData){
                        // system exists on map
                        Util.triggerMenuAction(activeMap, 'SelectSystem', {
                            systemId: systemData.id
                        });
                    }else{
                        // system not on map -> open 'add system' dialog
                        let options = {
                            systemData: {
                                id: systemId,
                                name: systemName
                            }
                        };

                        // -> check "previous" breadcrumb exists
                        //    if exists, take it as "sourceSystem"
                        let breadcrumbElementPrev = breadcrumbElement.prev();
                        if(breadcrumbElementPrev.length){
                            let systemIdPrev = parseInt(breadcrumbElementPrev.attr('data-systemId'));
                            let systemDataPrev = MapUtil.getSystemDataFromMapData(mapData, systemIdPrev, 'systemId');
                            if(systemDataPrev){
                                let sourceSystem = $('#' + MapUtil.getSystemId(systemDataPrev.mapId, systemDataPrev.id));
                                if(sourceSystem.length){
                                    options.sourceSystem = sourceSystem;
                                }
                            }
                        }

                        Util.triggerMenuAction(activeMap, 'AddSystem', options);
                    }
                }else{
                    console.warn('No active map found!');
                }
            });

            // program status
            $('.' + config.headProgramStatusClass).on('click', () => {
                Util.triggerMenuAction(document, 'ShowTaskManager');
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

            mapTrackingCheckbox.on('change', e => {
                let value = $(e.target).is(':checked');
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
            initHeaderTooltips($('#' + config.pageHeaderId));

            resolve({
                action: 'loadHeader',
                data: {
                    pageElement: pageElement
                }
            });
        };

        return new Promise(executor);
    };

    /**
     * load page footer
     * @param pageElement
     * @returns {Promise<any>}
     */
    let loadFooter = pageElement => {

        let executor = resolve => {
            let moduleData = {
                id:                     Util.config.footerId,
                footerClockClass:       config.footerClockClass,
                footerLicenceLinkClass: config.footerLicenceLinkClass,
                currentYear:            new Date().getFullYear()
            };

            pageElement.prepend(Mustache.render(TplFooter, moduleData));

            // init footer --------------------------------------------------------------------------------------------

            pageElement.find('.' + config.footerLicenceLinkClass).on('click', e => {
                e.stopPropagation();
                //show credits info dialog
                $.fn.showCreditsDialog();
            });

            initEveClock();

            resolve({
                action: 'loadFooter',
                data: {
                    pageElement: pageElement
                }
            });
        };

        return new Promise(executor);
    };

    /**
     * set page menu observer
     * @param menuElement
     * @returns {Promise<any>}
     */
    let setMenuObserver = menuElement => {

        let executor = resolve => {

            let getEventTarget = targetName => {
                switch(targetName){
                    case 'map':         return Util.getMapModule().getActiveMap();
                    case 'document':    return document;
                    default:            return document;
                }
            };

            menuElement.on('click', '.list-group-item[data-action]', e => {
                e.preventDefault();
                e.stopPropagation();

                let button = e.currentTarget;
                let action = button.getAttribute('data-action');
                let target = button.getAttribute('data-target');
                let data   = $(button).data('payload');

                Util.triggerMenuAction(getEventTarget(target), action, data);
            });

            resolve({
                action: 'setMenuObserver',
                data: {}
            });
        };

        return new Promise(executor);
    };

    /**
     * set global document observers
     * @returns {Promise<any>}
     */
    let setDocumentObserver = () => {

        let executor = resolve => {
            let documentElement = $(document);

            // init slide menus ---------------------------------------------------------------------------------------
            let slideBarsController = new SlideBars();
            slideBarsController.init();

            $('.' + config.pageClass).on('click.menuClose', () => {
                slideBarsController.close();
            });

            // menu event handling ------------------------------------------------------------------------------------
            documentElement.on('pf:menuAction', (e, action, data) => {
                // menuAction events can also be triggered on child nodes (e.g. map)
                // -> if event is not handled there it bubbles up
                //    make sure event can be handled by this element
                if(e.target === e.currentTarget){
                    e.stopPropagation();

                    switch(action){
                        case 'Close':
                            slideBarsController.close();
                            break;
                        case 'Toggle':
                            slideBarsController.toggle(data.menuClass);
                            break;
                        case 'ShowStatsDialog':
                            $.fn.showStatsDialog();
                            break;
                        case 'ShowJumpInfo':
                            $.fn.showJumpInfoDialog();
                            break;
                        case 'ShowSystemEffectInfo':
                            $.fn.showSystemEffectInfoDialog();
                            break;
                        case 'ShowSettingsDialog':
                            $.fn.showSettingsDialog();
                            break;
                        case 'Fullscreen':
                            toggleFullScreen(document.body);
                            break;
                        case 'NotificationTest':
                            Util.showNotify({
                                title: 'Test Notification',
                                text: 'Accept browser security question'
                            },{
                                desktop: true,
                                stack: 'barBottom'
                            });
                            break;
                        case 'DeleteAccount':
                            $.fn.showDeleteAccountDialog();
                            break;
                        case 'Logout':
                            Util.logout({
                                ajaxData: {
                                    clearCookies: Util.getObjVal(data, 'clearCookies') || false
                                }
                            });
                            break;
                        case'ShowMapInfo':
                            $.fn.showMapInfoDialog(data);
                            break;
                        case'ShowMapSettings': {
                            let mapData = false;
                            let activeMap = Util.getMapModule().getActiveMap();
                            if(activeMap){
                                mapData = Util.getCurrentMapData(activeMap.data('id'));
                            }
                            $.fn.showMapSettingsDialog(mapData, data);
                            break;
                        }
                        case'Manual':
                            $.fn.showMapManual();
                            break;
                        case'Shortcuts':
                            $.fn.showShortcutsDialog();
                            break;
                        case'ShowTaskManager':
                            Logging.showDialog();
                            break;
                        case'DeleteMap': {
                            let mapData = false;
                            let activeMap = Util.getMapModule().getActiveMap();
                            if(activeMap){
                                mapData = activeMap.getMapDataFromClient(['hasId']);
                            }
                            $.fn.showDeleteMapDialog(mapData);
                            break;
                        }
                        default:
                            console.warn('Unknown menuAction %o event name', action);
                    }
                }else{
                    console.warn('Unhandled menuAction %o event name. Handled menu events should not bobble up', action);
                }
            });

            // disable menu links based on current map config ---------------------------------------------------------
            documentElement.on('pf:updateMenuOptions', (e, data) => {
                let hasRightMapDelete = MapUtil.checkRight('map_delete', data.mapConfig);
                $('#' + Util.config.menuButtonMapDeleteId).toggleClass('disabled', !hasRightMapDelete);

                // "loading" menu options require an active map
                // -> active map now available -> remove loading class
                $('.' + config.pageMenuRightClass + ' .loading').removeClass('loading');
            });

            // update header links with current map data --------------------------------------------------------------
            documentElement.on('pf:updateHeaderMapData', (e, data) => {
                let activeMap = Util.getMapModule().getActiveMap();
                let userCountInside = 0;
                let userCountOutside = 0;
                let userCountInactive = 0;

                // show active user just for the current active map
                if(
                    activeMap &&
                    activeMap.data('id') === data.mapId
                ){
                    userCountInside = data.userCountInside;
                    userCountOutside = data.userCountOutside;
                    userCountInactive = data.userCountInactive;
                }
                updateHeaderActiveUserCount(userCountInside, userCountOutside, userCountInactive);
            });

            // changes in current userData ----------------------------------------------------------------------------
            documentElement.on('pf:changedUserData', (e, userData, changes) => {
                updateHeaderUserData(userData, changes).then();
            });

            // shutdown the program -> show dialog --------------------------------------------------------------------
            documentElement.on('pf:shutdown', (e, data) => {
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
                                    Util.triggerMenuAction(document, 'Logout');
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

                // remove map
                Util.getMapModule().velocity('fadeOut', {
                    duration: 300,
                    complete: function(){
                        $(this).remove();
                    }
                });

                return false;
            });

            resolve({
                action: 'setDocumentObserver',
                data: {}
            });
        };

        return new Promise(executor);
    };

    /**
     * set global body observers
     * @returns {Promise<any>}
     */
    let setBodyObserver = () => {

        let executor = resolve => {
            let bodyElement = $(document.body);

            // global "popover" callback (for all popovers)
            bodyElement.on('hide.bs.popover', '.' + Util.config.popoverTriggerClass, e => {
                let popoverElement = $(e.target).data('bs.popover').tip();

                // destroy all active tooltips inside this popover
                popoverElement.destroyTooltip(true);
            });

            // global "modal" callback --------------------------------------------------------------------------------
            bodyElement.on('hide.bs.modal', '> .modal', e => {
                let modalElement = $(e.target);
                modalElement.destroyTimestampCounter(true);

                // destroy all popovers
                modalElement.find('.' + Util.config.popoverTriggerClass).popover('destroy');

                // destroy all Select2
                modalElement.find('.' + Util.config.select2Class)
                    .filter((i, element) => $(element).data('select2'))
                    .select2('destroy');
            });

            // global "close" trigger for context menus ---------------------------------------------------------------
            bodyElement.on('click.contextMenuClose', () => {
                MapContextMenu.closeMenus();
            });

            resolve({
                action: 'setBodyObserver',
                data: {}
            });
        };

        return new Promise(executor);
    };

    /**
     * set global shortcuts to <body> element
     * @returns {Promise<any>|void|*}
     */
    let setGlobalShortcuts = () => {

        let executor = resolve => {
            let bodyElement = $(document.body);

            bodyElement.watchKey('tabReload', () => {
                location.reload();
            });

            bodyElement.watchKey('renameSystem', () => {
                let activeMap = Util.getMapModule().getActiveMap();
                if(activeMap){
                    let activeSystem = activeMap.find('.' + MapUtil.config.systemActiveClass + ':first');
                    if(activeSystem.length){
                        MapUtil.toggleSystemAliasEditable(activeSystem);
                    }
                }
            });

            bodyElement.watchKey('newSignature', () => {
                let activeMap = Util.getMapModule().getActiveMap();
                if(activeMap){
                    let mapContentElement = MapUtil.getTabContentElementByMapElement(activeMap);
                    let signatureModuleElement = mapContentElement.find('.' + config.systemSignatureModuleClass);
                    signatureModuleElement.trigger('pf:showSystemSignatureModuleAddNew');
                }
            });

            bodyElement.watchKey('clipboardPaste', e => {
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

            resolve({
                action: 'setGlobalShortcuts',
                data: {}
            });
        };

        return new Promise(executor);
    };

    /**
     * init clock element with current EVE time
     */
    let initEveClock = () => {
        let clockElement = $('.' + config.footerClockClass);
        let checkTime = i => (i < 10) ? '0' + i : i;

        let startTime = () => {
            let date = Util.getServerTime();
            let h = date.getHours();
            let m = checkTime(date.getMinutes());
            clockElement.text(h + ':' + m);

            setTimeout(startTime, 500);
        };

        startTime();
    };

    /**
     * update all header elements with current userData
     * @param userData
     * @param changes
     * @returns {Promise<[any, any, any, any, any, any, any, any, any, any]>}
     */
    let updateHeaderUserData = (userData, changes) => {
        let updateTasks = [];

        if(changes.characterLogLocation){
            updateTasks.push(updateMapTrackingToggle(Boolean(Util.getObjVal(userData, 'character.logLocation'))));
        }
        if(changes.charactersIds){
            updateTasks.push(updateHeaderCharacterSwitch(userData, changes.characterId));
        }
        if(changes.characterSystemId || changes.characterShipType || changes.characterLogHistory){
            updateTasks.push(updateHeaderCharacterLocation(userData, changes.characterShipType));
        }

        return Promise.all(updateTasks);
    };

    /**
     * update "map tracking" toggle in header
     * @param status
     */
    let updateMapTrackingToggle = status => {
        let executor = resolve => {
            let mapTrackingCheckbox = $('#' + Util.config.headMapTrackingId);
            if(status === true){
                mapTrackingCheckbox.bootstrapToggle('enable');
            }else{
                mapTrackingCheckbox.bootstrapToggle('off').bootstrapToggle('disable');
            }

            resolve({
                action: 'updateMapTrackingToggle',
                data: {}
            });
        };

        return new Promise(executor);
    };

    /**
     * @param userData
     * @param changedCharacter
     * @returns {Promise<any>}
     */
    let updateHeaderCharacterSwitch = (userData, changedCharacter) => {
        let executor = resolve => {
            let userInfoElement = $('.' + config.headUserCharacterClass);
            // toggle element
            animateHeaderElement(userInfoElement, userInfoElement => {
                if(changedCharacter){
                    // current character changed
                    userInfoElement.find('span').text(Util.getObjVal(userData, 'character.name'));
                    userInfoElement.find('img').attr('src', Init.url.ccpImageServer + '/Character/' + Util.getObjVal(userData, 'character.id') + '_32.jpg');
                }
                // init "character switch" popover
                userInfoElement.initCharacterSwitchPopover(userData);

                resolve({
                    action: 'updateHeaderCharacterSwitch',
                    data: {}
                });
            }, true);
        };

        return new Promise(executor);
    };

    /**
     *
     * @param userData
     * @param changedShip
     * @returns {Promise<any>}
     */
    let updateHeaderCharacterLocation = (userData, changedShip) => {
        let executor = resolve => {
            let userLocationElement = $('#' + Util.config.headUserLocationId);
            let breadcrumbHtml = '';
            let logData = Util.getObjVal(userData, 'character.log');
            let logDataAll = [];

            if(logData){
                let shipData = Util.getObjVal(userData, 'character.log.ship');
                let shipTypeId = Util.getObjVal(shipData, 'typeId') || 0;
                let shipTypeName = Util.getObjVal(shipData, 'typeName') || '';

                logDataAll.push(logData);

                // check for log history data as well
                let logHistoryData = Util.getObjVal(userData, 'character.logHistory');
                if(logHistoryData){
                    // check if there are more history log entries than max visual limit
                    if(logHistoryData.length > config.headMaxLocationHistoryBreadcrumbs){
                        breadcrumbHtml += '<li class="--empty">';
                        breadcrumbHtml += '<span class="pf-head-breadcrumb-item">';
                        breadcrumbHtml += '…';
                        breadcrumbHtml += '</span></li>';
                    }
                    logDataAll = logDataAll.concat(logHistoryData.map(data => data.log).slice(0, config.headMaxLocationHistoryBreadcrumbs));
                }

                logDataAll = logDataAll.reverse();

                // build breadcrumb
                for(let [key, logDataTmp] of logDataAll.entries()){
                    let systemId = Util.getObjVal(logDataTmp, 'system.id');
                    let systemName = Util.getObjVal(logDataTmp, 'system.name');
                    let isCurrentLocation = key === logDataAll.length -1;
                    let visibleClass = !isCurrentLocation ? 'hidden-xs' : '';

                    breadcrumbHtml += '<li class="' + visibleClass + '" data-systemId="' + systemId + '" data-systemName="' + systemName + '">';
                    breadcrumbHtml += '<span class="pf-head-breadcrumb-item">';

                    if(isCurrentLocation){
                        breadcrumbHtml += '<i class="fas fa-fw fa-map-marker-alt" title="current location"></i>';
                    }

                    breadcrumbHtml += systemName;

                    if(isCurrentLocation && shipTypeId){
                        // show ship image
                        let shipSrc = Init.url.ccpImageServer + '/Render/' + shipTypeId + '_32.png';
                        breadcrumbHtml += '<img class="pf-head-image --right" ';
                        breadcrumbHtml += 'src="' + shipSrc + '" ';
                        breadcrumbHtml += 'title="' + shipTypeName + '" ';
                        breadcrumbHtml += '>';
                    }

                    breadcrumbHtml += '</span></li>';
                }
            }

            animateHeaderElement(userLocationElement, userLocationElement => {
                userLocationElement.html(breadcrumbHtml);
                initHeaderTooltips(userLocationElement);

                if(changedShip){
                    $(document).trigger('pf:activeShip');
                }
            }, Boolean(logData));

            resolve({
                action: 'updateHeaderCharacterLocation',
                data: {}
            });
        };

        return new Promise(executor);
    };

    /**
     * update the "active user" badge in header
     * @param userCountInside
     * @param userCountOutside
     * @param userCountInactive
     */
    let updateHeaderActiveUserCount = (userCountInside, userCountOutside, userCountInactive) => {
        let activeUserElement = $('.' + config.headActiveUsersClass);

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
            (changedInside || changedOutside || changedInactive) &&
            !activeUserElement.is(':visible')
        ){
            activeUserElement.velocity('fadeIn', {duration: Init.animationSpeed.headerLink});
        }
    };

    /**
     * function for header element toggle animation
     * @param element
     * @param callback
     * @param triggerShow
     */
    let animateHeaderElement = (element, callback, triggerShow) => {
        let currentOpacity = parseInt(element.css('opacity'));

        let showHeaderElement = (element) => {
            element.show().velocity({
                opacity: [ 1, 0 ]
            },{
                // display: 'block',
                visibility : 'visible',
                duration: Init.animationSpeed.headerLink
            });
        };

        let hideHeaderElement = (element, callback) => {
            element.velocity('stop').velocity({
                opacity: [ 0, 1 ]
            },{
                // display: 'none',
                visibility : 'hidden',
                duration: Init.animationSpeed.headerLink,
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

        let iconClass = '';
        let textClass = '';

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

        if(statusElement.data('status') !== status){
            // status has changed
            if(!programStatusInterval){
                // check if timer exists if not -> set default (in case of the "init" ajax call failed
                let programStatusVisible = Util.getObjVal(Init, 'timer.PROGRAM_STATUS_VISIBLE') || 5000;

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
        loadPageStructure: loadPageStructure,
        initTabChangeObserver: initTabChangeObserver,
        renderMapContextMenus: renderMapContextMenus
    };
});