define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/map',
    'app/map/util',
    'sortable',
    'module/system_info',
    'module/system_graph',
    'module/system_signature',
    'module/system_route',
    'module/system_intel',
    'module/system_killboard',
    'module/connection_info',
    'app/counter'
], (
    $,
    Init,
    Util,
    Map,
    MapUtil,
    Sortable,
    SystemInfoModule,
    SystemGraphModule,
    SystemSignatureModule,
    SystemRouteModule,
    SystemIntelModule,
    SystemKillboardModule,
    ConnectionInfoModule
) => {
    'use strict';

    let config = {
        mapTabElementId: 'pf-map-tab-element',                                  // id for map tab element (tabs + content)
        mapTabBarId: 'pf-map-tabs',                                             // id for map tab bar
        mapTabIdPrefix: 'pf-map-tab-',                                          // id prefix for a map tab
        mapTabClass: 'pf-map-tab',                                              // class for a map tab
        mapTabDragHandlerClass: 'pf-map-tab-handler',                           // class for drag handler
        mapTabIconClass: 'pf-map-tab-icon',                                     // class for map icon
        mapTabLinkTextClass: 'nav-tabs-link',                                   // class for span elements in a tab
        mapTabSharedIconClass: 'pf-map-tab-shared-icon',                        // class for map shared icon
        mapTabContentClass: 'pf-map-tab-content',                               // class for tab content container
        mapTabContentSystemInfoClass: 'pf-map-tab-content-system',
        mapWrapperClass: 'pf-map-wrapper',                                      // scrollable
        mapClass: 'pf-map',                                                     // class for each map

        // TabContentStructure
        mapTabContentRow: 'pf-map-content-row',                                 // main row for Tab content (grid)
        mapTabContentCell: 'pf-map-content-col',                                // column
        mapTabContentCellFirst: 'pf-map-content-col-first',                     // first column
        mapTabContentCellSecond: 'pf-map-content-col-second',                   // second column

        // module
        moduleClass: 'pf-module',                                               // class for a module
        moduleSpacerClass: 'pf-module-spacer',                                  // class for "spacer" module (preserves height during hide/show animation)
        moduleClosedClass: 'pf-module-closed'                                   // class for a closed module
    };

    let mapTabChangeBlocked = false;                                            // flag for preventing map tab switch

    /**
     * get all maps for a maps module
     * @param mapModule
     * @returns {jQuery}
     */
    let getMaps = mapModule => $(mapModule).find('.' + config.mapClass);

    /**
     * get the current active mapElement
     * @returns {JQuery|*|T|{}|jQuery}
     */
    $.fn.getActiveMap = function(){
        let map = $(this).find('.active.' + config.mapTabContentClass + ' .' + config.mapClass);
        if(!map.length){
            map = false;
        }
        return map;
    };

    /**
     * set mapContent Observer, events are triggered within map.js
     * @param tabElement
     */
    let setMapContentObserver = (tabElement) => {

        tabElement.on('pf:drawSystemModules', '.' + config.mapTabContentClass, function(e){
            drawSystemModules($(e.target));
        });

        tabElement.on('pf:removeSystemModules', '.' + config.mapTabContentClass, function(e){
            removeSystemModules($(e.target));
        });

        tabElement.on('pf:drawConnectionModules', '.' + config.mapTabContentClass, function(e, data){
            drawConnectionModules($(e.target), data);
        });

        tabElement.on('pf:removeConnectionModules', '.' + config.mapTabContentClass, function(e){
            removeConnectionModules($(e.target));
        });

        tabElement.on('pf:updateSystemModules',  '.' + config.mapTabContentClass, function(e, data){
            updateSystemModules($(e.target), data);
        });

        tabElement.on('pf:updateRouteModules',  '.' + config.mapTabContentClass, function(e, data){
            updateRouteModules($(e.target), data);
        });
    };

    /**
     * update (multiple) modules
     * @param tabContentElement
     * @param modules
     * @param data
     */
    let updateModules = (tabContentElement, modules, data) => {
        for(let Module of modules){
            let moduleElement = tabContentElement.find('.' + Module.config.moduleTypeClass);
            if(moduleElement.length > 0){
                Module.updateModule(moduleElement, data);
            }
        }
    };

    /**
     * update system modules with new data
     * @param tabContentElement
     * @param data
     */
    let updateSystemModules = (tabContentElement, data) => {
        let systemModules = [SystemInfoModule, SystemSignatureModule, SystemIntelModule];
        updateModules(tabContentElement, systemModules, data);
    };

    /**
     * update route modules with new data
     * @param tabContentElement
     * @param data
     */
    let updateRouteModules = (tabContentElement, data) => {
        let routeModules = [SystemRouteModule];
        updateModules(tabContentElement, routeModules, data);
    };

    /**
     * remove multiple modules
     * @param tabContentElement
     * @param modules
     */
    let removeModules = (tabContentElement, modules) => {
        for(let Module of modules){
            let moduleElement = tabContentElement.find('.' + Module.config.moduleTypeClass);
            removeModule(moduleElement, Module);
        }
    };

    /**
     * clear all system modules and remove them
     * @param tabContentElement
     */
    let removeSystemModules = (tabContentElement) => {
        let systemModules = [SystemInfoModule, SystemGraphModule, SystemSignatureModule, SystemRouteModule, SystemIntelModule, SystemKillboardModule];
        removeModules(tabContentElement, systemModules);
    };

    /**
     * clear all connection modules and remove them
     * @param tabContentElement
     */
    let removeConnectionModules = (tabContentElement) => {
        let connectionModules = [ConnectionInfoModule];
        removeModules(tabContentElement, connectionModules);
    };

    /**
     * remove a single module
     * @param moduleElement
     * @param Module
     * @param callback
     * @param addSpacer
     */
    let removeModule = (moduleElement, Module, callback, addSpacer) => {
        if(moduleElement.length > 0){
            if(typeof Module.beforeHide === 'function'){
                Module.beforeHide(moduleElement);
            }

            moduleElement.velocity('reverse',{
                complete: function(moduleElement){
                    moduleElement = $(moduleElement);
                    let oldModuleHeight = moduleElement.outerHeight();

                    if(typeof Module.beforeDestroy === 'function'){
                        Module.beforeDestroy(moduleElement);
                    }

                    // [optional] add a "spacer" <div> that fakes Module height during hide->show animation
                    if(addSpacer){
                        moduleElement.after($('<div>', {
                            class: [config.moduleSpacerClass, Module.config.moduleTypeClass + '-spacer'].join(' '),
                            css: {
                                height: oldModuleHeight + 'px'
                            }
                        }));
                    }

                    moduleElement.remove();

                    if(typeof callback === 'function'){
                        callback();
                    }
                }
            });
        }
    };

    /**
     * generic function that draws a modulePanel for a given Module object
     * @param parentElement
     * @param Module
     * @param mapId
     * @param data
     */
    let drawModule = (parentElement, Module, mapId, data) => {

        let drawModuleExecutor = (resolve, reject) => {

            /**
             * remove "Spacer" Module
             * @param parentElement
             * @param Module
             */
            let removeSpacerModule = (parentElement, Module) => {
                parentElement.find('.' + Module.config.moduleTypeClass + '-spacer').remove();
            };

            /**
             * show/render a Module
             * @param parentElement
             * @param Module
             * @param mapId
             * @param data
             */
            let showPanel = (parentElement, Module, mapId, data) => {
                let moduleElement = Module.getModule(parentElement, mapId, data);
                if(moduleElement){
                    // store Module object to DOM element for further access
                    moduleElement.data('module', Module);
                    moduleElement.data('data', data);
                    moduleElement.addClass([config.moduleClass, Module.config.moduleTypeClass].join(' '));
                    moduleElement.css({opacity: 0}); // will be animated

                    // check module position from local storage
                    let promiseStore = MapUtil.getLocaleData('map', mapId);
                    promiseStore.then(function(dataStore){
                        let Module = this.moduleElement.data('module');
                        let defaultPosition = Module.config.modulePosition || 0;

                        // hide "spacer" Module (in case it exist)
                        // -> Must be done BEFORE position calculation! Spacer Modules should not be counted!
                        removeSpacerModule(this.parentElement, Module);

                        // check for stored module order in indexDB (client) ----------------------------------------------
                        let key = 'modules_cell_' + this.parentElement.attr('data-position');
                        if(
                            dataStore &&
                            dataStore[key]
                        ){
                            let positionIndex = dataStore[key].indexOf(Module.config.moduleName);
                            if(positionIndex !== -1){
                                // first index (0) => is position 1
                                defaultPosition = positionIndex + 1;
                            }
                        }

                        // find correct position for new moduleElement ----------------------------------------------------
                        let position = getModulePosition(this.parentElement, '.' + config.moduleClass, defaultPosition);

                        this.moduleElement.attr('data-position', defaultPosition);
                        this.moduleElement.attr('data-module', Module.config.moduleName);

                        // insert at correct position ---------------------------------------------------------------------
                        // -> no :nth-child or :nth-of-type here because there might be temporary "spacer" div "modules"
                        // that should be ignored for positioning
                        let prevModuleElement = this.parentElement.find('.' + config.moduleClass).filter(i => ++i === position);
                        if(prevModuleElement.length){
                            this.moduleElement.insertAfter(prevModuleElement);
                        }else{
                            this.parentElement.prepend(this.moduleElement);
                        }

                        if(typeof Module.beforeShow === 'function'){
                            Module.beforeShow(this.moduleElement, moduleElement.data('data'));
                        }

                        // show animation ---------------------------------------------------------------------------------
                        this.moduleElement.velocity({
                            opacity: [1, 0],
                            translateY: [0, +20]
                        }, {
                            duration: Init.animationSpeed.mapModule,
                            easing: 'easeOutSine',
                            complete: function(moduleElement){
                                moduleElement = $(moduleElement);
                                let Module = $(moduleElement).data('module');
                                if(typeof Module.initModule === 'function'){
                                    Module.initModule(moduleElement, mapId, moduleElement.data('data'));
                                }

                                resolve({
                                    action: 'drawModule',
                                    data: {
                                        module: Module
                                    }
                                });
                            }
                        });
                    }.bind({
                        parentElement: parentElement,
                        moduleElement: moduleElement
                    }));
                }else{
                    // Module should not be shown (e.g. "Graph" module on WH systems)
                    removeSpacerModule(parentElement, Module);
                }
            };

            // check if module already exists
            let moduleElement = parentElement.find('.' + Module.config.moduleTypeClass);
            if(moduleElement.length > 0){
                removeModule(moduleElement, Module, () => {
                    showPanel(parentElement, Module, mapId, data);
                }, true);
            }else{
                showPanel(parentElement, Module, mapId, data);
            }
        };

        return new Promise(drawModuleExecutor);
    };

    /**
     * clears and updates the system info element (signature table, system info,...)
     * @param tabContentElement
     */
    let drawSystemModules = (tabContentElement) => {

        require(['datatables.loader'], () => {
            let currentSystemData = Util.getCurrentSystemData();

            let promiseDrawAll = [];

            // request "additional" system data (e.g. Structures, Description)
            // -> this is used to update some modules after initial draw
            let promiseRequestData = Util.request('GET', 'system', currentSystemData.systemData.id, {mapId: currentSystemData.mapId});

            // draw modules -------------------------------------------------------------------------------------------

            let firstCell = tabContentElement.find('.' + config.mapTabContentCellFirst);
            let secondCell = tabContentElement.find('.' + config.mapTabContentCellSecond);

            // draw system info module
            let promiseInfo = drawModule(firstCell, SystemInfoModule, currentSystemData.mapId, currentSystemData.systemData);

            // draw system graph module
            drawModule(firstCell, SystemGraphModule, currentSystemData.mapId, currentSystemData.systemData);

            // draw signature table module
            let promiseSignature = drawModule(firstCell, SystemSignatureModule, currentSystemData.mapId, currentSystemData.systemData);

            // draw system routes module
            drawModule(secondCell, SystemRouteModule, currentSystemData.mapId, currentSystemData.systemData);

            // draw system intel module
            let promiseIntel = drawModule(secondCell, SystemIntelModule, currentSystemData.mapId, currentSystemData.systemData);

            // draw system killboard module
            drawModule(secondCell, SystemKillboardModule, currentSystemData.mapId, currentSystemData.systemData);

            // update some modules ------------------------------------------------------------------------------------
            promiseDrawAll.push(promiseRequestData, promiseInfo, promiseSignature, promiseIntel);

            // update "some" modules after draw AND additional system data was requested
            Promise.all(promiseDrawAll).then(payload => {
                // get systemData from first Promise (ajax call)
                let responseData = payload.shift();
                if(responseData.data){
                    let systemData = responseData.data;

                    // update all Modules
                    let modules = [];
                    for(let responseData of payload){
                        modules.push(responseData.data.module);
                    }
                    updateModules(tabContentElement, modules, systemData);
                }
            });
        });
    };

    /**
     * clears and updates the connection info element (mass log)
     * @param tabContentElement
     * @param data
     */
    let drawConnectionModules = (tabContentElement, data) => {
        require(['datatables.loader'], function(){

            // get grid cells
            let firstCell = $(tabContentElement).find('.' + config.mapTabContentCellFirst);

            // draw connection info module
            drawModule(firstCell, ConnectionInfoModule, this.mapId, this.connections);
        }.bind(data));
    };

    /**
     * updates current visible/active mapElement in mapModule with user data
     * @param mapModule
     * @returns {Promise<any>}
     */
    let updateActiveMapUserData = (mapModule) => {

        let updateActiveMapModuleExecutor = (resolve, reject) => {
            // get all active map elements for module
            let mapElement = mapModule.getActiveMap();

            updateMapUserData(mapElement).then(payload => resolve());
        };

        return new Promise(updateActiveMapModuleExecutor);
    };

    /**
     * updates mapElement with user data
     * update
     * @param mapElement
     * @returns {Promise<any>}
     */
    let updateMapUserData = (mapElement) => {
        // performance logging (time measurement)
        let logKeyClientUserData = Init.performanceLogging.keyClientUserData;
        Util.timeStart(logKeyClientUserData);

        let updateMapUserDataExecutor = (resolve, reject) => {
            if(mapElement !== false){
                let mapId = mapElement.data('id');
                let currentMapUserData = Util.getCurrentMapUserData(mapId);

                if(currentMapUserData){
                    // trigger "update local" for this map => async
                    mapElement.trigger('pf:updateLocal', currentMapUserData);

                    // update map with current user data
                    Map.updateUserData(mapElement, currentMapUserData);
                }
            }

            resolve();
        };

        return new Promise(updateMapUserDataExecutor).then(payload => {
            // log client map update time
            let duration = Util.timeStop(logKeyClientUserData);
            Util.log(logKeyClientUserData, {duration: duration, type: 'client', description: 'update users'});
        });
    };

    /**
     * update active system modules (below map)
     * @param mapModule
     * @param systemData
     */
    let updateSystemModulesData = (mapModule, systemData) => {
        if(systemData){
            // check if current open system is still the requested info system
            let currentSystemData = Util.getCurrentSystemData();

            if(
                currentSystemData &&
                systemData.id === currentSystemData.systemData.id
            ){
                // trigger system update events
                let tabContentElement = $('#' + config.mapTabIdPrefix + systemData.mapId + '.' + config.mapTabContentClass);
                tabContentElement.trigger('pf:updateSystemModules', [systemData]);
            }
        }
    };

    /**
     * set observer for tab content (area where modules will be shown)
     * @param contentStructure
     * @param mapId
     */
    let setContentStructureObserver = (contentStructure, mapId) => {
        contentStructure.find('.' + config.mapTabContentCell).each((index, cellElement) => {
            let sortable = Sortable.create(cellElement, {
                group: {
                    name: 'cell_' + cellElement.getAttribute('data-position')
                },
                animation: Init.animationSpeed.mapModule,
                handle: '.pf-module-handler-drag',
                draggable: '.' + config.moduleClass,
                ghostClass: 'pf-sortable-ghost',
                scroll: true,
                scrollSensitivity: 50,
                scrollSpeed: 20,
                dataIdAttr: 'data-module',
                sort: true,
                store: {
                    get: function(sortable){
                        return [];
                    },
                    set: function(sortable){
                        let key = 'modules_' + sortable.options.group.name;
                        MapUtil.storeLocalData('map', mapId, key, sortable.toArray());
                    }
                },
                onStart: function(e){
                    // Element dragging started
                    // -> save initial sort state -> see store.set()
                    this.save();
                }
            });
        });

        // toggle height for a module
        contentStructure.on('click.toggleModuleHeight', '.' + config.moduleClass, function(e){
            let moduleElement = $(this);
            // get click position
            let posX = moduleElement.offset().left;
            let posY = moduleElement.offset().top;
            let clickX = e.pageX - posX;
            let clickY = e.pageY - posY;

            // check for top-left click
            if(clickX <= 9 && clickY <= 9 && clickX >= 0 && clickY >= 0){

                // remember height
                if( !moduleElement.data('origHeight') ){
                    moduleElement.data('origHeight', moduleElement.outerHeight());
                }

                if(moduleElement.hasClass(config.moduleClosedClass)){
                    let moduleHeight = moduleElement.data('origHeight');
                    moduleElement.velocity('finish').velocity({
                        height: [ moduleHeight + 'px', [ 400, 15 ] ]
                    },{
                        duration: 400,
                        easing: 'easeOutSine',
                        complete: function(moduleElement){
                            moduleElement = $(moduleElement);
                            moduleElement.removeClass(config.moduleClosedClass);
                            moduleElement.removeData('origHeight');
                            moduleElement.css({height: ''});
                        }
                    });
                }else{
                    moduleElement.velocity('finish').velocity({
                        height: [ '35px', [ 400, 15 ] ]
                    },{
                        duration: 400,
                        easing: 'easeOutSine',
                        complete: function(moduleElement){
                            moduleElement = $(moduleElement);
                            moduleElement.addClass(config.moduleClosedClass);
                        }
                    });
                }
            }
        });
    };

    /**
     * load all structure elements into a TabsContent div (tab body)
     * @param tabContentElements
     */
    let initContentStructure = (tabContentElements) => {
        tabContentElements.each(function(){
            let tabContentElement = $(this);
            let mapId = parseInt( tabContentElement.attr('data-mapid') );

            // "add" tab does not need a structure and observer...
            if(mapId > 0){
                let contentStructure = $('<div>', {
                    class: ['row', config.mapTabContentRow].join(' ')
                }).append(
                    $('<div>', {
                        class: ['col-xs-12', 'col-md-8', config.mapTabContentCellFirst, config.mapTabContentCell].join(' ')
                    }).attr('data-position', 1)
                ).append(
                    $('<div>', {
                        class: ['col-xs-12', 'col-md-4', config.mapTabContentCellSecond, config.mapTabContentCell].join(' ')
                    }).attr('data-position', 2)
                );

                // append grid structure
                tabContentElement.append(contentStructure);

                // set content structure observer
                setContentStructureObserver(contentStructure, mapId);
            }
        });
    };

    /**
     * get a fresh tab element
     * @param options
     * @param currentUserData
     * @returns {*|jQuery|HTMLElement}
     */
    let getMapTabElement = (options, currentUserData) => {
        let tabElement = $('<div>', {
            id: config.mapTabElementId
        });

        let tabBar = $('<ul>', {
            class: ['nav', 'nav-tabs'].join(' '),
            id: options.barId
        }).attr('role', 'tablist').attr('data-position', options.position);

        let tabContent = $('<div>', {
            class: 'tab-content'
        }).attr('data-map-tabs', options.barId);

        tabElement.append(tabBar);
        tabElement.append(tabContent);

        setMapTabObserver(tabElement, currentUserData.character.id);
        setMapContentObserver(tabElement);

        return tabElement;
    };

    /**
     * get module position
     * @param parentElement
     * @param childSelector
     * @param defaultPosition
     * @returns {number}
     */
    let getModulePosition = (parentElement, childSelector, defaultPosition) => {
        let position = 0;
        if(defaultPosition > 0){
            parentElement.children(childSelector).each((i, moduleElement) => {
                position = i + 1;
                let tempPosition = parseInt(moduleElement.getAttribute('data-position')) || 0;
                if(tempPosition >= defaultPosition){
                    position--;
                    return false;
                }
            });
        }
        return position;
    };

    /**
     * set map tab observer
     * @param tabElement
     * @param characterId
     */
    let setMapTabObserver = (tabElement, characterId) => {

        tabElement.find('.nav.nav-tabs').each((index, tabListElement) => {
            // set tab sortable ---------------------------------------------------------------------------------------
            let sortable = Sortable.create(tabListElement, {
                group: {
                     name: 'list_' + tabListElement.getAttribute('data-position')
                },
                animation: Init.animationSpeed.mapModule,
                handle: '.' + config.mapTabDragHandlerClass,
                draggable: '.' + config.mapTabClass,
                ghostClass: 'pf-sortable-ghost',
                scroll: false,
                dataIdAttr: 'data-mapId',
                sort: true,
                filter: function(e, listElement){
                    listElement = $(listElement);
                    let mapId = parseInt(listElement.attr('data-mapid')) || 0;
                    return !Boolean(mapId);
                },
                store: {
                    get: function(sortable){
                        return [];
                    },
                    set: function(sortable){
                        let key = 'maps_' + sortable.options.group.name;
                        // convert string array to int array
                        let order = sortable.toArray().map((x) => parseInt(x, 10));
                        MapUtil.storeLocalData('character', characterId, key, order);
                    }
                },
                onStart: function(e){
                    // Element dragging started
                    // -> save initial sort state -> see store.set()
                    this.save();
                }
            });

            // set tab click ------------------------------------------------------------------------------------------
            $(tabListElement).on('click', 'a', function(e){
                e.preventDefault();

                // callback function after tab switch
                let switchTabCallback = (mapElement, tabLinkElement) => {
                    tabLinkElement.tab('show');
                    // unfreeze map
                    mapElement.data('frozen', false);
                    return false;
                };

                if(mapTabChangeBlocked === false){
                    let tabLinkElement = $(this);
                    let mapId = tabLinkElement.data('mapId');

                    // ignore "add" tab. no need for map change
                    if(mapId > 0){
                        let mapElement = $('#' + config.mapTabElementId).getActiveMap();

                        if(mapId !== mapElement.data('id')){
                            // block tabs until switch is done
                            mapTabChangeBlocked = true;

                            // freeze active map -> no user data update while map switch
                            mapElement.data('frozen', true);

                            // hide current map with animation
                            MapUtil.visualizeMap(mapElement, 'hide').then(payload => {
                                // un-block map tabs
                                mapTabChangeBlocked = switchTabCallback(mapElement, tabLinkElement);
                            });
                        }
                    }else{
                        tabLinkElement.tab('show');
                    }
                }
            });

             // tab switch --------------------------------------------------------------------------------------------
            $(tabListElement).on('show.bs.tab', 'a', function(e){
                let mapId = $(e.target).data('mapId');

                if(mapId > 0){
                    // save mapId as new "default" (local storage)
                    MapUtil.storeLocaleCharacterData('defaultMapId', mapId);
                }else{
                    // add new Tab selected
                    Util.triggerMenuAction(document, 'ShowMapSettings', {tab: 'new'});
                    e.preventDefault();
                }
            });

            $(tabListElement).on('shown.bs.tab', 'a', function(e){
                // load new map right after tab-change
                let tabLinkElement = $(e.target);
                let mapId = tabLinkElement.data('mapId');
                let defaultSystemId = tabLinkElement.data('defaultSystemId');
                let tabMapData = Util.getCurrentMapData(mapId);

                if(tabMapData !== false){
                    // load map
                    let tabContentElement = $('#' + config.mapTabIdPrefix + mapId);
                    Map.loadMap(tabContentElement, tabMapData, {showAnimation: true})
                        .then(payload => {
                            // "wake up" scrollbar for map and get previous state back
                            let mapConfig = payload.data.mapConfig;
                            let mapElement = $(mapConfig.map.getContainer());
                            let mapWrapperElement = mapElement.closest('.mCustomScrollbar');
                            mapWrapperElement.mCustomScrollbar('update');

                            // if there is an already an "active" system -> setCurrentSystemData for that again
                            let activeSystem = mapElement.find('.' + MapUtil.config.systemActiveClass + ':first');
                            if(activeSystem.length){
                                MapUtil.setSystemActive(mapConfig.map, activeSystem);
                            }else if(defaultSystemId){
                                // currently no system "active" check if there is a default system set for this mapTab
                                // -> e.g. from URL link
                                let systemId = MapUtil.getSystemId(mapConfig.config.id, defaultSystemId);
                                let system = mapElement.find('#' + systemId);
                                if(system.length){
                                    // system exists on map -> make active and show panels
                                    MapUtil.showSystemInfo(mapConfig.map, system);
                                }
                            }

                            // change url to unique map URL
                            if(history.pushState){
                                let mapUrl = MapUtil.getMapDeeplinkUrl(mapConfig.config.id);
                                history.pushState({}, '', mapUrl);
                            }

                            // update map user data (do not wait until next update is triggered)
                            updateMapUserData(mapElement);
                        });
                }
            });

            $(tabListElement).on('hide.bs.tab', 'a', function(e){
                let newMapId = $(e.relatedTarget).data('mapId');
                let oldMapId = $(e.target).data('mapId');

                // skip "add button"
                if(newMapId > 0){
                    // delete currentSystemData -> will be set for new map (if there is is an active system)
                    delete Init.currentSystemData;

                    let currentTabContentElement = $('#' + config.mapTabIdPrefix + oldMapId);

                    // disable scrollbar for map that will be hidden. "freeze" current state
                    let mapWrapperElement = currentTabContentElement.find('.' + config.mapWrapperClass);
                    mapWrapperElement.mCustomScrollbar('disable', false);
                }

            });

        });
    };

    /**
     * set data for a map tab, or update an existing map tab with new data return promise
     * @param tabElement
     * @param options
     * @returns {Promise<any>}
     */
    let updateTabData = (tabElement, options) => {

        /**
         * update tab promise
         * @param resolve
         * @param reject
         */
        let updateTabExecutor = (resolve, reject) => {
            // set "main" data
            tabElement.data('mapId', options.id);

            // add updated timestamp (not available for "add" tab
            if(Util.getObjVal(options, 'updated.updated')){
                tabElement.data('updated', options.updated.updated);
            }

            // change "tab" link
            tabElement.attr('href', '#' + config.mapTabIdPrefix + options.id);

            // change "map" icon
            let mapIconElement = tabElement.find('.' + config.mapTabIconClass);
            mapIconElement.removeClass().addClass([config.mapTabIconClass, 'fas', 'fa-fw', options.icon].join(' '));

            // change "shared" icon
            let mapSharedIconElement = tabElement.find('.' + config.mapTabSharedIconClass);
            mapSharedIconElement.hide();

            // check if the map is a "shared" map
            if(options.access){
                if(
                    options.access.character.length > 1 ||
                    options.access.corporation.length > 1 ||
                    options.access.alliance.length > 1
                ){
                    mapSharedIconElement.show();
                }
            }

            // change map name label
            let tabLinkTextElement = tabElement.find('.' + config.mapTabLinkTextClass);
            tabLinkTextElement.text(options.name);

            // change tabClass
            let listElement = tabElement.parent();

            // new tab classes
            let tabClasses = [config.mapTabClass, options.type.classTab ];

            // check if tab was "active" before
            if( listElement.hasClass('active') ){
                tabClasses.push('active');
            }
            listElement.removeClass().addClass( tabClasses.join(' ') );

            // set title for tooltip
            if(options.type.name !== undefined){
                tabLinkTextElement.attr('title', options.type.name + ' map');
            }

            let mapTooltipOptions = {
                placement: 'bottom',
                container: 'body',
                trigger: 'hover',
                delay: 150
            };

            listElement.find('[title]').tooltip(mapTooltipOptions).tooltip('fixTitle');

            if(options.right === true){
                listElement.addClass('pull-right');
            }

            resolve({
                action: 'update',
                data: {
                    mapId: options.id,
                    mapName: options.name
                }
            });
        };

        return new Promise(updateTabExecutor);
    };

    /**
     * add a new tab to tab-map-module end return promise
     * @param tabElement
     * @param options
     * @param currentUserData
     * @returns {Promise<any>}
     */
    let addTab = (tabElement, options, currentUserData) => {

        /**
         * get new <li> element used as map tab
         * @param options
         * @returns {jQuery|*|void}
         */
        let getTabListElement = (options) => {
            let listElement = $('<li>')
                .attr('role', 'presentation')
                .attr('data-mapId', options.id);

            if(options.right === true){
                listElement.addClass('pull-right');
            }

            // link element
            let linkElement = $('<a>').attr('role', 'tab');

            // map drag handler element
            let linkDragElement = null;
            if(options.id > 0){
                linkDragElement = $('<i>', {
                    class: config.mapTabDragHandlerClass
                });
            }

            // map icon element
            let mapIconElement = $('<i>', {
                class: config.mapTabIconClass
            });

            // map shared icon element
            let mapSharedIconElement = $('<i>', {
                class: [config.mapTabSharedIconClass, 'fas', 'fa-fw', 'fa-share-alt'].join(' '),
                title: 'shared map'
            });

            // text element
            let textElement = $('<span>', {
                class: config.mapTabLinkTextClass
            });

            let newListElement = listElement.append(
                linkElement.append(linkDragElement).append(mapIconElement)
                    .append(textElement).append(mapSharedIconElement)
            );

            return newListElement;
        };

        /**
         * get tab content element
         * @param options
         * @returns {jQuery}
         */
        let getTabContentElement = (options) => {
            let contentElement = $('<div>', {
                id: config.mapTabIdPrefix + parseInt( options.id ),
                class: [config.mapTabContentClass, 'tab-pane'].join(' ')
            }).attr('data-mapid', parseInt( options.id ));

            return contentElement;
        };

        /**
         * add tab promise
         * @param resolve
         * @param reject
         */
        let addTabExecutor = (resolve, reject) => {
            let promiseStore = MapUtil.getLocaleData('character', currentUserData.character.id);
            promiseStore.then( function(dataStore){
                let tabBar = this.tabElement.find('> ul.nav-tabs');
                let tabContent = this.tabElement.find('> div.tab-content');
                let tabListElement = getTabListElement(options);
                let tabContentElement = getTabContentElement(options);
                let defaultPosition = 0;

                // check for stored map tab order in indexDB (client) -------------------------------------------------
                let key = 'maps_list_' + tabBar.attr('data-position');
                if(dataStore && dataStore[key]){
                    let positionIndex = dataStore[key].indexOf(this.options.id);
                    if(positionIndex !== -1){
                        // first index (0) => is position 1
                        defaultPosition = positionIndex + 1;
                    }
                }

                // find correct position for new tabs -----------------------------------------------------------------
                let position = getModulePosition(tabBar, '.' + config.mapTabClass, defaultPosition);
                tabListElement.attr('data-position', defaultPosition);

                // insert at correct position -------------------------------------------------------------------------
                let prevListElement = tabBar.find('li' + '' + ':nth-child(' + position + ')');
                if(prevListElement.length){
                    tabListElement.insertAfter(prevListElement);
                }else{
                    tabBar.prepend(tabListElement);
                }

                // update Tab element -> set data
                updateTabData(tabListElement.find('a'), options);

                tabContent.append(tabContentElement);

                // load all the structure elements for the new tab
                initContentStructure(tabContentElement);

                resolve({
                    action: 'add',
                    data: {
                        mapId: options.id,
                        mapName: options.name
                    }
                });
            }.bind({
                tabElement: tabElement,
                options: options
            }));
        };

        return new Promise(addTabExecutor);
    };

    /**
     * deletes tab from tab-map-module end return promise
     * @param tabElement
     * @param mapId
     * @returns {Promise<any>}
     */
    let deleteTab = (tabElement, mapId) => {

        /**
         * delete tab promise
         * @param resolve
         * @param reject
         */
        let deleteTabExecutor = (resolve, reject) => {
            let linkElement = tabElement.find('a[href="#' + config.mapTabIdPrefix + mapId + '"]');
            let deletedTabName = '';

            if(linkElement.length > 0){
                deletedTabName = linkElement.find('.' + config.mapTabLinkTextClass).text();

                let liElement = linkElement.parent();
                let contentElement = tabElement.find('div[id="' + config.mapTabIdPrefix + mapId + '"]');

                liElement.remove();
                contentElement.remove();

                // remove map instance from local cache
                MapUtil.clearMapInstance(mapId);
            }

            resolve({
                action: 'delete',
                data: {
                    mapId: mapId,
                    mapName: deletedTabName
                }
            });
        };

        return new Promise(deleteTabExecutor);
    };

    /**
     * clear all active maps
     * @param mapModule
     * @returns {Promise<any>}
     */
    let clearMapModule = (mapModule) => {
        let promiseDeleteTab = [];
        let tabMapElement = $('#' + config.mapTabElementId);

        if(tabMapElement.length > 0){
            let tabElements = mapModule.getMapTabElements();
            for(let i = 0; i < tabElements.length; i++){
                let tabElement = $(tabElements[i]);
                let mapId = tabElement.data('mapId');
                if(mapId > 0){
                    promiseDeleteTab.push(deleteTab(tabMapElement, mapId));
                }
            }
        }

        return Promise.all(promiseDeleteTab);
    };

    /**
     * get last URL segment e.g. https://pathfinder/map/test -> test
     * @returns {string | undefined}
     */
    let getLastUrlSegment = () => {
        let parts = window.location.pathname.split('/');
        return parts.pop() || parts.pop();
    };

    /**
     * extract data from map url
     * @returns {Array}
     */
    let getMapDataFromUrl = () => {
        let data = [];
        let lastURLSegment = getLastUrlSegment();
        if(lastURLSegment.length){
            try{
                data = lastURLSegment.split('_').map(part => parseInt(atob(decodeURIComponent(part))) || 0);
            }catch(e){
                // data could not be extracted from URL -> ignore
            }
        }
        return data;
    };

    /**
     * set "default" map tab
     * -> default mapId might be available in local storage
     * @param tabMapElement
     * @param currentUserData
     * @returns {Promise<any>}
     */
    let showDefaultTab = (tabMapElement, currentUserData) => {

        let getActiveTabLinkElement = (mapId) => {
            return tabMapElement.find('.' + config.mapTabClass + '[data-mapid="' + mapId + '"] > a');
        };

        /**
         * show default tab promise
         * @param resolve
         * @param reject
         */
        let showDefaultTabExecutor = (resolve, reject) => {
            let promiseStore = MapUtil.getLocaleData('character', currentUserData.character.id);
            promiseStore.then(data => {
                let activeTabLinkElement = false;

                // check for existing mapId URL identifier ------------------------------------------------------------
                let urlData = getMapDataFromUrl();
                let defaultMapId = urlData[0] || 0;
                let defaultSystemId = urlData[1] || 0;

                if(defaultMapId){
                    activeTabLinkElement = getActiveTabLinkElement(defaultMapId);
                    if(defaultSystemId && activeTabLinkElement.length){
                        activeTabLinkElement.data('defaultSystemId', defaultSystemId);
                    }
                }

                // ... else check for existing cached default mapId ---------------------------------------------------
                if(
                    (!activeTabLinkElement || !activeTabLinkElement.length) &&
                    data && data.defaultMapId
                ){
                    // make specific map tab active
                    activeTabLinkElement = getActiveTabLinkElement(data.defaultMapId);
                }

                // ... else make first map tab active (default) -------------------------------------------------------
                if(!activeTabLinkElement || !activeTabLinkElement.length){
                    activeTabLinkElement = tabMapElement.find('.' + config.mapTabClass + ':not(.pull-right):first > a');
                }

                if(activeTabLinkElement.length){
                    activeTabLinkElement.tab('show');
                }

                resolve();
            });
        };

        return new Promise(showDefaultTabExecutor);
    };

    /**
     * load/update map module into element (all maps)
     * @param mapModule
     * @returns {Promise<any>}
     */
    let updateMapModule = (mapModule) => {
        // performance logging (time measurement)
        let logKeyClientMapData = Init.performanceLogging.keyClientMapData;
        Util.timeStart(logKeyClientMapData);

        let updateMapModuleExecutor = (resolve, reject) => {
            // check if tabs module is already loaded
            let tabMapElement = $('#' + config.mapTabElementId);

            let currentUserData = Util.getCurrentUserData();

            // store current map data global (cache)
            // temp store current map data to prevent data-change while function execution!
            let tempMapData = Util.getCurrentMapData();

            if(tempMapData.length === 0){
                // clear all existing maps ----------------------------------------------------------------------------
                clearMapModule(mapModule)
                    .then(payload => {
                        // no map data available -> show "new map" dialog
                        Util.triggerMenuAction(document, 'ShowMapSettings', {tab: 'new'});
                    })
                    .then(payload => resolve());
            }else{
                if(tabMapElement.length > 0){
                    // tab element exists -> update -------------------------------------------------------------------
                    let promisesAddTab = [];
                    let promiseDeleteTab = [];
                    let promiseUpdateTab = [];

                    let tabDeletedCallback = payload => {
                        Util.showNotify({title: 'Map removed', text: payload.data.mapName + ' deleted', type: 'warning'});
                    };

                    let tabAddCallback = payload => {
                        Util.showNotify({title: 'Map added', text: payload.data.mapName + ' added', type: 'success'});
                    };

                    // tab element already exists
                    let tabElements = mapModule.getMapTabElements();

                    // mapIds that are currently active
                    let activeMapIds = [];

                    // check whether a tab/map is still active
                    for(let i = 0; i < tabElements.length; i++){
                        let tabElement = $(tabElements[i]);
                        let mapId = tabElement.data('mapId');

                        if(mapId > 0){
                            let tabMapData = Util.getCurrentMapData(mapId);
                            if(tabMapData !== false){
                                // map data available ->
                                activeMapIds.push(mapId);

                                // check for map data change and update tab
                                if(tabMapData.config.updated.updated > tabElement.data('updated')){
                                    promiseUpdateTab.push(updateTabData(tabElement, tabMapData.config));
                                }
                            }else{
                                // map data not available -> remove tab
                                promiseDeleteTab.push(deleteTab(tabMapElement, mapId).then(tabDeletedCallback));
                            }
                        }
                    }

                    // add new tabs for new maps
                    for(let data of tempMapData){
                        if( activeMapIds.indexOf( data.config.id ) === -1 ){
                            // add new map tab
                            promisesAddTab.push(addTab(tabMapElement, data.config, currentUserData).then(tabAddCallback));
                        }
                    }

                    // wait until ALL "add", "delete", "update" promises are fulfilled
                    let promisesAll = promisesAddTab.concat(promiseDeleteTab, promiseUpdateTab);

                    Promise.all(promisesAll).then(payload => {
                        // if there is an active map ...
                        let activeMap = Util.getMapModule().getActiveMap();
                        if(activeMap){
                            let activeMapId = activeMap.data('id');
                            let activeMapData = Util.getCurrentMapData(activeMapId);
                            if(activeMapData !== false){
                                // .. active map found, just update no tab switch
                                return Map.loadMap($('#' + config.mapTabIdPrefix + activeMapId), activeMapData, {});
                            }else{
                                console.error('No active map found!');
                            }
                        }else{
                            // .. no map active, make one active
                            return showDefaultTab(tabMapElement, currentUserData);
                        }
                    }).then(payload => resolve());

                }else{
                    // tab Element does not exists -> create ----------------------------------------------------------
                    let promisesAddTab = [];

                    let options = {
                        barId: config.mapTabBarId,
                        position: 1                 // for "sortable tabs"
                    };

                    tabMapElement = getMapTabElement(options, currentUserData);
                    mapModule.prepend(tabMapElement);

                    // add new tab for each map
                    for(let j = 0; j < tempMapData.length; j++){
                        let data = tempMapData[j];
                        promisesAddTab.push(addTab(tabMapElement, data.config, currentUserData));
                    }

                    // add "add" button
                    let tabAddOptions = {
                        id: 0,
                        type: {
                            classTab: MapUtil.getInfoForMap('standard', 'classTab')
                        },
                        icon: 'fa-plus',
                        name: 'add',
                        right: true
                    };

                    promisesAddTab.push(addTab(tabMapElement, tabAddOptions, currentUserData));

                    Promise.all(promisesAddTab)
                        .then(payload => showDefaultTab(tabMapElement, currentUserData))
                        .then(payload => resolve());
                }
            }
        };

        return new Promise(updateMapModuleExecutor).then(payload => {
            // log client map update time
            let duration = Util.timeStop(logKeyClientMapData);
            Util.log(logKeyClientMapData, {duration: duration, type: 'client', description: 'update map'});
        });
    };

    /**
     * collect all data (systems/connections) for export/save from each active map in the map module
     * if no change detected -> do not attach map data to return array
     * @param mapModule
     * @param filter
     * @returns {Array}
     */
    let getMapModuleDataForUpdate = (mapModule, filter = ['hasId', 'hasChanged']) => {
        // get all active map elements for module
        let mapElements = getMaps(mapModule);

        let data = [];
        for(let i = 0; i < mapElements.length; i++){
            // get all changed (system / connection) data from this map
            let mapData = Map.getMapDataForSync($(mapElements[i]), filter);
            if(mapData !== false){
                if(
                    mapData.data.systems.length > 0 ||
                    mapData.data.connections.length > 0
                ){
                    data.push(mapData);
                }
            }
        }

        return data;
    };

    return {
        updateTabData: updateTabData,
        updateMapModule: updateMapModule,
        updateActiveMapUserData: updateActiveMapUserData,
        updateSystemModulesData: updateSystemModulesData,
        getMapModuleDataForUpdate: getMapModuleDataForUpdate
    };
});