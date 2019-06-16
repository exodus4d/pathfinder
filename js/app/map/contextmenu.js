/**
 * context menu
 */

define([
    'jquery',
    'app/render'
], ($, Render) => {

    'use strict';

    let config = {
        mapContextMenuId: 'pf-map-contextmenu',                                     // id for "maps" context menu
        connectionContextMenuId: 'pf-map-connection-contextmenu',                   // id for "connections" context menu
        endpointContextMenuId: 'pf-map-endpoint-contextmenu',                       // id for "endpoints" context menu
        systemContextMenuId: 'pf-map-system-contextmenu',                           // id for "systems" context menu

        animationInType: 'transition.flipXIn',
        animationInDuration: 150,
        animationOutType: 'transition.flipXOut',
        animationOutDuration: 150
    };

    /**
     * calc menu X coordinate
     * @param e
     * @param menuWidth
     * @returns {number|*}
     */
    let getMenuLeftCoordinate = (e, menuWidth) => {
        let mouseWidth = e.pageX;
        let pageWidth = $(window).width();

        // opening menu would pass the side of the page
        if(mouseWidth + menuWidth > pageWidth &&
            menuWidth < mouseWidth){
            return mouseWidth - menuWidth;
        }
        return mouseWidth;
    };

    /**
     * calc menu Y coordinate
     * @param e
     * @param menuHeight
     * @returns {number|*}
     */
    let getMenuTopCoordinate = (e, menuHeight) => {
        let mouseHeight = e.pageY;
        let pageHeight = $(window).height();

        // opening menu would pass the bottom of the page
        if(mouseHeight + menuHeight > pageHeight &&
            menuHeight < mouseHeight){
            return mouseHeight - menuHeight;
        }
        return mouseHeight;
    };

    /**
     * render context menu template for maps
     * @returns {*}
     */
    let renderMapContextMenu = () => {
        let moduleData = {
            id: config.mapContextMenuId,
            items: [
                {icon: 'fa-plus', action: 'add_system', text: 'add system'},
                {icon: 'fa-object-ungroup', action: 'select_all', text: 'select all'},
                {icon: 'fa-filter', action: 'filter_scope', text: 'filter scope', subitems: [
                        {subIcon: '', subAction: 'filter_wh', subText: 'wormhole'},
                        {subIcon: '', subAction: 'filter_stargate', subText: 'stargate'},
                        {subIcon: '', subAction: 'filter_jumpbridge', subText: 'jumpbridge'},
                        {subIcon: '', subAction: 'filter_abyssal', subText: 'abyssal'}
                    ]},
                {icon: 'fa-sitemap', action: 'map', text: 'map', subitems: [
                        {subIcon: 'fa-edit', subAction: 'map_edit', subText: 'edit map'},
                        {subIcon: 'fa-street-view', subAction: 'map_info', subText: 'map info'},
                    ]},
                {divider: true, action: 'delete_systems'},
                {icon: 'fa-trash', action: 'delete_systems', text: 'delete systems'}
            ]
        };

        return Render.render('modules/contextmenu', moduleData);
    };

    /**
     * render context menu template for connections
     * @returns {*}
     */
    let renderConnectionContextMenu = () => {
        let moduleData = {
            id: config.connectionContextMenuId,
            items: [
                {icon: 'fa-hourglass-end', action: 'wh_eol', text: 'toggle EOL'},
                {icon: 'fa-exclamation-triangle', action: 'preserve_mass', text: 'preserve mass'},
                {icon: 'fa-reply fa-rotate-180', action: 'change_status', text: 'mass status', subitems: [
                        {subIcon: 'fa-circle', subIconClass: 'txt-color txt-color-gray', subAction: 'status_fresh', subText: 'stage 1 (fresh)'},
                        {subIcon: 'fa-circle', subIconClass: 'txt-color txt-color-orange', subAction: 'status_reduced', subText: 'stage 2 (reduced)'},
                        {subIcon: 'fa-circle', subIconClass: 'txt-color txt-color-redDarker', subAction: 'status_critical', subText: 'stage 3 (critical)'}

                    ]},
                {icon: 'fa-reply fa-rotate-180', action: 'wh_jump_mass_change', text: 'ship size', subitems: [
                        {subIcon: 'fa-char', subChar: 'S', subAction: 'wh_jump_mass_s', subText: 'smallest ships'},
                        {subIcon: 'fa-char', subChar: 'M', subAction: 'wh_jump_mass_m', subText: 'medium ships'},
                        {subIcon: 'fa-char', subChar: 'L', subAction: 'wh_jump_mass_l', subText: 'larger ships'},
                        {subIcon: 'fa-char', subChar: 'XL', subAction: 'wh_jump_mass_xl', subText: 'capital ships'}

                    ]},
                {icon: 'fa-crosshairs', action: 'change_scope', text: 'change scope', subitems: [
                        {subIcon: 'fa-minus-circle', subIconClass: '', subAction: 'scope_wh', subText: 'wormhole'},
                        {subIcon: 'fa-minus-circle', subIconClass: 'txt-color txt-color-indigoDarkest', subAction: 'scope_stargate', subText: 'stargate'},
                        {subIcon: 'fa-minus-circle', subIconClass: 'txt-color txt-color-tealLighter', subAction: 'scope_jumpbridge', subText: 'jumpbridge'}

                    ]},
                {divider: true, action: 'separator'} ,
                {icon: 'fa-unlink', action: 'delete_connection', text: 'detach'}
            ]
        };

        return Render.render('modules/contextmenu', moduleData);
    };

    /**
     * render context menu template for endpoints
     * @returns {*}
     */
    let renderEndpointContextMenu = () => {
        let moduleData = {
            id: config.endpointContextMenuId,
            items: [
                {icon: 'fa-globe', action: 'bubble', text: 'bubbled'}
            ]
        };

        return Render.render('modules/contextmenu', moduleData);
    };

    /**
     * render context menu template for systems
     * @param systemStatusData
     * @returns {*}
     */
    let renderSystemContextMenu = systemStatusData => {
        let statusData = [];
        for(let [statusName, data] of Object.entries(systemStatusData)){
            statusData.push({
                subIcon:        'fa-tag',
                subIconClass:   data.class,
                subAction:      'change_status_' + statusName,
                subText:        data.label
            });
        }

        let moduleData = {
            id: config.systemContextMenuId,
            items: [
                {icon: 'fa-plus', action: 'add_system', text: 'add system'},
                {icon: 'fa-lock', action: 'lock_system', text: 'lock system'},
                {icon: 'fa-volume-up', action: 'set_rally', text: 'set rally point'},
                {icon: 'fa-tags', text: 'set status', subitems: statusData},
                {icon: 'fa-route', action: 'find_route', text: 'find route'},
                {icon: 'fa-object-group', action: 'select_connections', text: 'select connections'},
                {icon: 'fa-reply fa-rotate-180', text: 'waypoints', subitems: [
                        {subIcon: 'fa-flag-checkered', subAction: 'set_destination', subText: 'set destination'},
                        {subDivider: true, action: ''},
                        {subIcon: 'fa-step-backward', subAction: 'add_first_waypoint', subText: 'add new [start]'},
                        {subIcon: 'fa-step-forward', subAction: 'add_last_waypoint', subText: 'add new [end]'}
                    ]},
                {divider: true, action: 'delete_system'},
                {icon: 'fa-trash', action: 'delete_system', text: 'delete system(s)'}
            ]
        };

        return Render.render('modules/contextmenu', moduleData);
    };

    /**
     * prepare (hide/activate/disable) some menu options
     * @param menuElement
     * @param hiddenOptions
     * @param activeOptions
     * @param disabledOptions
     * @returns {*}
     */
    let prepareMenu = (menuElement, hiddenOptions, activeOptions, disabledOptions) => {
        let menuLiElements = menuElement.find('li');

        // reset all menu entries
        menuLiElements.removeClass('active').removeClass('disabled').show();

        // hide specific menu entries
        for(let action of hiddenOptions){
            menuElement.find('li[data-action="' + action + '"]').hide();
        }

        //set active specific menu entries
        for(let action of activeOptions){
            menuElement.find('li[data-action="' + action + '"]').addClass('active');
        }

        //disable specific menu entries
        for(let action of disabledOptions){
            menuElement.find('li[data-action="' + action + '"]').addClass('disabled');
        }

        return menuElement;
    };

    /**
     * close all context menus (map, connection,...)
     * @param excludeMenu
     */
    let closeMenus = excludeMenu => {
        let allMenus = $('.dropdown-menu[role="menu"]');
        if(excludeMenu){
            allMenus = allMenus.not(excludeMenu);
        }

        allMenus.velocity(config.animationOutType, {
            duration: config.animationOutDuration
        });
    };

    /**
     * open menu handler
     * @param menuConfig
     * @param e
     * @param context
     */
    let openMenu = (menuConfig, e, context) => {
        let menuElement = $('#' + menuConfig.id);

        // close all other context menus
        closeMenus(menuElement);

        // remove menu list click event
        // -> required in case the close handler could not remove them properly
        // -> this happens if menu re-opens without closing (2x right click)
        menuElement.off('click.contextMenuSelect', 'li');

        // hide/activate/disable
        menuElement = prepareMenu(menuElement, menuConfig.hidden, menuConfig.active, menuConfig.disabled);

        menuElement.css({
            position: 'absolute',
            left: getMenuLeftCoordinate(e, menuElement.width()),
            top: getMenuTopCoordinate(e, menuElement.height())
        }).velocity(config.animationInType, {
            duration: config.animationInDuration,
            complete: function(){
                context = {
                    original: {
                        event: e,
                        context: context,
                    },
                    selectCallback: menuConfig.selectCallback
                };

                $(this).one('click.contextMenuSelect', 'li', context, selectHandler);
            }
        });
    };

    /**
     * menu item select handler
     * @param e
     */
    let selectHandler = e => {
        if(e.data.selectCallback){
            e.data.selectCallback(
                $(e.currentTarget).attr('data-action'),
                e.data.original.context.component,
                e.data.original.event
            );
        }
    };

    /**
     * default config (skeleton) for valid context menu configuration
     * @returns {{hidden: Array, active: Array, disabled: Array, id: string, selectCallback: null}}
     */
    let defaultMenuOptionConfig = () => {
        return {
            'id': '',
            'selectCallback': null,
            'hidden': [],
            'active': [],
            'disabled': []
        };
    };

    return {
        config: config,
        defaultMenuOptionConfig: defaultMenuOptionConfig,
        renderMapContextMenu: renderMapContextMenu,
        renderConnectionContextMenu: renderConnectionContextMenu,
        renderEndpointContextMenu: renderEndpointContextMenu,
        renderSystemContextMenu: renderSystemContextMenu,
        openMenu: openMenu,
        closeMenus: closeMenus
    };
});