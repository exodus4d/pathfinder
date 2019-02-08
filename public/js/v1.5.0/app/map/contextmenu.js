/**
 * context menu
 */

define([
    'jquery',
    'app/render'
], ($, Render) => {

    'use strict';

    let config = {
        dynamicElementWrapperId: 'pf-dialog-wrapper',                   // wrapper div for context menus (initial hidden)

        mapContextMenuId: 'pf-map-contextmenu',                         // id for "maps" context menu
        connectionContextMenuId: 'pf-map-connection-contextmenu',       // id for "connections" context menu
        systemContextMenuId: 'pf-map-system-contextmenu'                // id for "systems" context menu
    };

    $.fn.contextMenu = function(settings){

        // animation
        let animationInType = 'transition.flipXIn';
        let animationInDuration = 150;
        let animationOutType = 'transition.flipXOut';
        let animationOutDuration = 150;

        return this.each(function(){

            // Open context menu
            $(this).off('pf:openContextMenu').on('pf:openContextMenu', function(e, originalEvent, component, hiddenOptions, activeOptions, disabledOptions){

                // hide all other open context menus
               $('#pf-dialog-wrapper > .dropdown-menu').hide();

                let contextMenu = $(settings.menuSelector);

                let menuLiElements = contextMenu.find('li');

                // reset all menu entries
                menuLiElements.removeClass('active').removeClass('disabled').show();

                // hide specific menu entries
                for(let action of hiddenOptions){
                    contextMenu.find('li[data-action="' + action + '"]').hide();
                }

                //set active specific menu entries
                for(let action of activeOptions){
                    contextMenu.find('li[data-action="' + action + '"]').addClass('active');
                }

                //disable specific menu entries
                for(let action of disabledOptions){
                    contextMenu.find('li[data-action="' + action + '"]').addClass('disabled');
                }

                //open menu
                contextMenu.css({
                    position: 'absolute',
                    left: getLeftLocation(originalEvent),
                    top: getTopLocation(originalEvent)
                }).velocity(animationInType, {
                    duration: animationInDuration,
                    complete: function(){

                        let posX = 0;
                        let posY = 0;

                        if(
                            originalEvent.offsetX &&
                            originalEvent.offsetY
                        ){
                            // Chrome
                            posX = originalEvent.offsetX;
                            posY = originalEvent.offsetY;
                        }else if(originalEvent.originalEvent){
                            // Firefox -> #415
                            posX =  originalEvent.originalEvent.layerX;
                            posY = originalEvent.originalEvent.layerY;
                        }

                        let position = {
                            x: posX,
                            y: posY
                        };

                        $(this).off('click').one('click', {component: component, position: position}, function(e){
                            // hide contextmenu
                            $(this).hide();

                            let params = {
                                selectedMenu: $(e.target),
                                component: e.data.component,
                                position: e.data.position
                            };

                            settings.menuSelected.call(this, params);
                            return false;
                        });
                    }
                });

                //make sure menu closes on any click
                $(document).one('click.closeContextmenu', function(){
                    $('.dropdown-menu[role="menu"]').velocity(animationOutType, {
                        duration: animationOutDuration
                    });
                });

                return false;
            });

        });

        function getLeftLocation(e){
            let mouseWidth = e.pageX;
            let pageWidth = $(window).width();
            let menuWidth = $(settings.menuSelector).width();

            // opening menu would pass the side of the page
            if(mouseWidth + menuWidth > pageWidth &&
                menuWidth < mouseWidth){
                return mouseWidth - menuWidth;
            }
            return mouseWidth;
        }

        function getTopLocation(e){
            let mouseHeight = e.pageY;
            let pageHeight = $(window).height();
            let menuHeight = $(settings.menuSelector).height();

            // opening menu would pass the bottom of the page
            if(mouseHeight + menuHeight > pageHeight &&
                menuHeight < mouseHeight){
                return mouseHeight - menuHeight;
            }
            return mouseHeight;
        }

    };

    /**
     * load context menu template for maps
     */
    let initMapContextMenu = () => {
        let moduleConfig = {
            name: 'modules/contextmenu',
            position: $('#' + config.dynamicElementWrapperId)
        };

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

        Render.showModule(moduleConfig, moduleData);
    };

    /**
     * load context menu template for connections
     */
    let initConnectionContextMenu = () => {
        let moduleConfig = {
            name: 'modules/contextmenu',
            position: $('#' + config.dynamicElementWrapperId)
        };

        let moduleData = {
            id: config.connectionContextMenuId,
            items: [
                {icon: 'fa-plane', action: 'frigate', text: 'frigate hole'},
                {icon: 'fa-exclamation-triangle', action: 'preserve_mass', text: 'preserve mass'},
                {icon: 'fa-crosshairs', action: 'change_scope', text: 'change scope', subitems: [
                        {subIcon: 'fa-minus-circle', subIconClass: '', subAction: 'scope_wh', subText: 'wormhole'},
                        {subIcon: 'fa-minus-circle', subIconClass: 'txt-color  txt-color-indigoDarkest', subAction: 'scope_stargate', subText: 'stargate'},
                        {subIcon: 'fa-minus-circle', subIconClass: 'txt-color  txt-color-tealLighter', subAction: 'scope_jumpbridge', subText: 'jumpbridge'}

                    ]},
                {icon: 'fa-reply fa-rotate-180', action: 'change_status', text: 'change status', subitems: [
                        {subIcon: 'fa-clock', subAction: 'wh_eol', subText: 'toggle EOL'},
                        {subDivider: true},
                        {subIcon: 'fa-circle', subAction: 'status_fresh', subText: 'stage 1 (fresh)'},
                        {subIcon: 'fa-adjust', subAction: 'status_reduced', subText: 'stage 2 (reduced)'},
                        {subIcon: 'fa-circle', subAction: 'status_critical', subText: 'stage 3 (critical)'}

                    ]},
                {divider: true, action: 'separator'} ,
                {icon: 'fa-unlink', action: 'delete_connection', text: 'detach'}
            ]
        };

        Render.showModule(moduleConfig, moduleData);
    };

    /**
     * load context menu template for systems
     * @param systemStatusData
     */
    let initSystemContextMenu = (systemStatusData) => {

        let statusData = [];
        for(let [statusName, data] of Object.entries(systemStatusData)){
            statusData.push({
                subIcon:        'fa-tag',
                subIconClass:   data.class,
                subAction:      'change_status_' + statusName,
                subText:        data.label
            });
        }

        let moduleConfig = {
            name: 'modules/contextmenu',
            position: $('#' + config.dynamicElementWrapperId)
        };

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

        Render.showModule(moduleConfig, moduleData);
    };

    return {
        initMapContextMenu: initMapContextMenu,
        initConnectionContextMenu: initConnectionContextMenu,
        initSystemContextMenu: initSystemContextMenu
    };
});