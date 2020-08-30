define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/map',
    'app/map/util',
    'app/lib/eventHandler',
    'app/lib/svg',
    'sortable',
    'module/base',
    'module/system_info',
    'module/system_graph',
    'module/system_signature',
    'module/system_route',
    'module/system_intel',
    'module/system_killboard',
    'module/global_thera',
    'module/connection_info',
    'app/counter'
], (
    $,
    Init,
    Util,
    Map,
    MapUtil,
    EventHandler,
    Svg,
    Sortable,
    BaseModule,
    SystemInfoModule,
    SystemGraphModule,
    SystemSignatureModule,
    SystemRouteModule,
    SystemIntelModule,
    SystemKillboardModule,
    TheraModule,
    ConnectionInfoModule
) => {
    'use strict';

    let config = {
        mapTabElementId: 'pf-map-tab-element',                                  // id for map tab element (tabs + content)
        mapTabIdPrefix: 'pf-map-tab-',                                          // id prefix for a map tab
        mapTabClass: 'pf-map-tab',                                              // class for a map tab
        mapTabIconClass: 'pf-map-tab-icon',                                     // class for map icon
        mapTabLinkTextClass: 'nav-tabs-link',                                   // class for span elements in a tab
        mapTabSharedIconClass: 'pf-map-tab-shared-icon',                        // class for map shared icon
        mapTabContentWrapperClass: 'pf-map-tab-content-wrapper',                // class for map tab content wrapper

        // module
        moduleClass: 'pf-module',                                               // class for a module
        moduleSpacerClass: 'pf-module-spacer',                                  // class for "spacer" module (preserves height during hide/show animation)
        moduleCollapsedClass: 'collapsed',                                      // class for a collapsed module

        // sortable
        sortableHandleClass: 'pf-sortable-handle',
        sortableDropzoneClass: 'pf-sortable-dropzone',
        sortableGhostClass: 'pf-sortable-ghost',
        sortableChosenClass: 'pf-sortable-chosen',

        // editable 'settings' popover
        editableSettingsClass: 'pf-editable-settings',
        editableHeadlineClass: 'pf-editable-headline',
        editableToggleClass: 'pf-editable-toggle',
        editableToggleItemClass: 'pf-editable-toggle-item',
        editableToggleSvgClass: 'pf-editable-toggle-svg',
        editableToggleBtnClass: 'pf-editable-toggle-btn',

        mapTabContentLayoutColumnOptions: ['grid-2', 'grid-3'],
        mapTabContentLayoutOrientationOptions: ['left', 'right'],
        defaultMapTabContentCols: 'grid-3',
        defaultMapTabContentOrientation: 'right',
    };

    let mapTabChangeBlocked = false;                                            // flag for preventing map tab switch

    /**
     * get the current active mapElement
     * @returns {bool|jQuery}
     */
    $.fn.getActiveMap = function(){
        let map = $(this).find('.active.' + Util.config.mapTabContentClass + ' .' + Util.config.mapClass);
        if(!map.length){
            map = false;
        }
        return map;
    };

    /**
     * set map tab content wrapper observer.
     * -> Events are triggered within map.js
     * @param tabContentWrapperEl
     */
    let setMapTabContentWrapperObserver = tabContentWrapperEl => {
        $(tabContentWrapperEl).on('pf:renderGlobalModules', `.${Util.config.mapTabContentClass}`, function(e, data){
            getModules()
                .then(modules => filterModules(modules, 'global'))
                .then(modules => renderModules(modules, e.target, data));
        });

        $(tabContentWrapperEl).on('pf:renderSystemModules', `.${Util.config.mapTabContentClass}`, function(e, data){
            getModules()
                .then(modules => filterModules(modules, 'system'))
                .then(modules => renderModules(modules, e.target, data));
        });

        $(tabContentWrapperEl).on('pf:removeSystemModules', `.${Util.config.mapTabContentClass}`, e => {
            getModules()
                .then(modules => filterModules(modules, 'system'))
                .then(modules => removeModules(modules, e.target));
        });

        $(tabContentWrapperEl).on('pf:renderConnectionModules', `.${Util.config.mapTabContentClass}`, (e, data) => {
            getModules()
                .then(modules => filterModules(modules, 'connection'))
                .then(modules => renderModules(modules, e.target, data));
        });

        $(tabContentWrapperEl).on('pf:removeConnectionModules', `.${Util.config.mapTabContentClass}`, e => {
            getModules()
                .then(modules => filterModules(modules, 'connection'))
                .then(modules => removeModules(modules, e.target));
        });

        $(tabContentWrapperEl).on('pf:updateGlobalModules', `.${Util.config.mapTabContentClass}`, (e, data) => {
            getModules()
                .then(modules => filterModules(modules, 'global'))
                .then(modules => updateModules(modules, e.target, data));
        });

        $(tabContentWrapperEl).on('pf:updateSystemModules', `.${Util.config.mapTabContentClass}`, (e, data) => {
            getModules()
                .then(modules => filterModules(modules, true, 'fullDataUpdate'))
                .then(modules => updateModules(modules, e.target, data));
        });

        $(tabContentWrapperEl).on('pf:updateRouteModules', `.${Util.config.mapTabContentClass}`, (e, data) => {
            getModules()
                .then(modules => filterModules(modules, 'SystemRouteModule', 'name'))
                .then(modules => updateModules(modules, e.target, data));
        });
    };

    /**
     * get/load module classes
     * -> default modules + custom plugin modules
     * @returns {Promise<any>}
     */
    let getModules = () => {
        return new Promise(resolve => {
            let modules = [
                SystemInfoModule,
                SystemGraphModule,
                SystemSignatureModule,
                SystemRouteModule,
                SystemIntelModule,
                SystemKillboardModule,
                TheraModule,
                ConnectionInfoModule
            ];

            // try to load custom plugin modules (see: plugin.ihi)
            let pluginModulesConfig = Util.getObjVal(Init, 'plugin.modules');
            if(pluginModulesConfig === Object(pluginModulesConfig)){
                requirejs(Object.values(pluginModulesConfig), (...pluginModules) => {
                    modules.push(...pluginModules);
                    resolve(modules);
                }, err => {
                    console.error(err.message);
                    resolve(modules);
                });
            }else{
                // custom plugins disabled
                resolve(modules);
            }
        });
    };

    /**
     * filer array of module classes by property filterVal(s)
     * @param modules
     * @param filterVal
     * @param filterProp
     * @returns BaseModule[]
     */
    let filterModules = (modules, filterVal = false, filterProp = 'scope') => modules.filter(Module =>
        filterVal ?
            (
                Array.isArray(filterVal) ?
                    filterVal.includes(Module[filterProp]) :
                    Module[filterProp] === filterVal
            ) :
            true
    );

    /**
     * @param modules
     * @param tabContentElement
     * @param data
     * @returns {PromiseLike<any[]> | Promise<any[]> | *}
     */
    let renderModules = (modules, tabContentElement, data) => {
        /**
         * @param dataStore
         * @returns {Promise<any[]>}
         */
        let render = dataStore => {
            let promiseRenderAll = [];
            for(let Module of modules){
                let defaultGridArea = Module.sortArea || 'a';
                let defaultPosition = Module.position || 0;

                for(let areaAlias of Util.config.mapTabContentAreaAliases){
                    let key = 'modules_area_' + areaAlias;
                    if(dataStore && dataStore[key]){
                        let positionIndex = dataStore[key].indexOf(Module.name);
                        if(positionIndex !== -1){
                            // first index (0) => is position 1
                            defaultPosition = positionIndex + 1;
                            defaultGridArea = areaAlias;
                            break;
                        }
                    }
                }

                // check if gridArea exists
                let gridArea = tabContentElement.getElementsByClassName(Util.getMapTabContentAreaClass(defaultGridArea));
                if(gridArea.length){
                    gridArea = gridArea[0];
                    promiseRenderAll.push(renderModule(Module, gridArea, defaultPosition, data.mapId, data.payload));
                }else{
                    console.warn(
                        'renderModules() failed for %o. GridArea class=%o not found',
                        Module.name,
                        Util.getMapTabContentAreaClass(defaultGridArea)
                    );
                }
            }

            return Promise.all(promiseRenderAll);
        };

        let renderModulesAndUpdateExecutor = resolve => {
            // get local data for map
            // -> filter out disabled modules
            // -> get default module positions
            Util.getLocalStore('map').getItem(data.mapId).then(dataStore => {
                // filter disabled modules (layout settings)
                let modulesDisabled = Util.getObjVal(dataStore, 'modulesDisabled') || [];
                modules = modules.filter(Module => !modulesDisabled.includes(Module.name));

                // check if modules require "additional" data (e.g. structures, description)
                // -> this is used to update some modules after initial draw
                let requestSystemData = false;
                for(let Module of modules){
                    if(Module.scope === 'system' && Module.fullDataUpdate){
                        requestSystemData = true;
                    }
                }

                let renderPromises = [];
                if(requestSystemData){
                    renderPromises.push(Util.request('GET', 'System', data.payload.id, {mapId: data.mapId}));
                }
                renderPromises.push(render(dataStore));

                Promise.all(renderPromises)
                    .then(payload => {
                        let promiseUpdateAll = [];

                        let systemData;
                        if(requestSystemData){
                            // get systemData from first Promise (ajax call)
                            let responseData = payload.shift();
                            systemData = Util.getObjVal(responseData, 'data');
                        }

                        if(systemData){
                            // get all rendered modules
                            let modules = payload.shift().map(payload => payload.data.module);

                            // get modules that require "additional" data
                            let systemModules = modules.filter(Module => Module.scope === 'system' && Module.fullDataUpdate);
                            promiseUpdateAll.push(updateModules(systemModules, tabContentElement, {
                                payload: systemData
                            }));
                        }

                        Promise.all(promiseUpdateAll).then(payload => resolve(payload));
                    });
            });
        };

        return new Promise(renderModulesAndUpdateExecutor);
    };

    /**
     * @param Module
     * @param gridArea
     * @param defaultPosition
     * @param mapId
     * @param payload
     * @returns {Promise}
     */
    let renderModule = (Module, gridArea, defaultPosition, mapId, payload) => {
        let renderModuleExecutor = (resolve, reject) => {

            /**
             * remove "Spacer" Module
             * @param gridArea
             * @param Module
             */
            let removeSpacerModule = (gridArea, Module) => {
                for(let spacerEl of gridArea.querySelectorAll('.' + Module.className + '-spacer[data-module="' +  Module.name + '"]')){
                    spacerEl.remove();
                }
            };

            /**
             * render module
             * @param Module
             * @param gridArea
             * @param defaultPosition
             * @param mapId
             * @param payload
             */
            let render = (Module, gridArea, defaultPosition, mapId, payload) => {
                let payBack = {
                    action: 'renderModule',
                    data: {
                        module: Module
                    }
                };

                // hide "spacer" Module (in case it exist)
                // -> Must be done BEFORE position calculation! Spacer Modules should not be counted!
                removeSpacerModule(gridArea, Module);

                let module = new Module({
                    position: defaultPosition
                });

                let moduleElement = module.handle('render', mapId, payload);

                if(!(moduleElement instanceof HTMLElement)){
                    // module should not be rendered
                    resolve(payBack);
                    return;
                }

                // find correct position for new moduleElement
                let position = getModulePosition(gridArea, '.' + Module.className, defaultPosition);

                // insert at correct position
                // -> no :nth-child or :nth-of-type here because there might be temporary "spacer" div "modules"
                // that should be ignored for positioning
                let prevModuleElement = [...gridArea.getElementsByClassName(Module.className)].find((el, i) => ++i === position);
                if(prevModuleElement){
                    prevModuleElement.insertAdjacentElement('afterend', moduleElement);
                }else{
                    gridArea.prepend(moduleElement);
                }

                // show animation -------------------------------------------------------------------------------------
                $(moduleElement).velocity({
                    opacity: [1, 0],
                    translateY: [0, +20],
                    translateZ: 0 // Force HA by animating a 3D property
                }, {
                    duration: Init.animationSpeed.mapModule,
                    easing: 'easeOutSine',
                    complete: moduleElement => {
                        moduleElement[0].getData('module').handle('init');
                        resolve(payBack);
                    }
                });
            };

            removeModule(Module, gridArea, false).then(abc => render(Module, gridArea, defaultPosition, mapId, payload));
        };

        return new Promise(renderModuleExecutor);
    };

    /**
     * update multiple modules
     * @param modules
     * @param tabContentElement
     * @param data
     * @returns {Promise}
     */
    let updateModules = (modules, tabContentElement, data) => {
        let promiseUpdateAll = [];
        for(let Module of modules){
            promiseUpdateAll.push(updateModule(Module, tabContentElement, data.payload));
        }
        return Promise.all(promiseUpdateAll);
    };

    /**
     * update module
     * @param Module
     * @param parentElement
     * @param payload
     * @returns {Promise}
     */
    let updateModule = (Module, parentElement, payload) => {
        let updateModuleExecutor = resolve => {
            let promiseUpdateAll = [];
            let moduleElements = parentElement.querySelectorAll('.' + Module.className + '[data-module="' +  Module.name + '"]');
            for(let moduleElement of moduleElements){
                promiseUpdateAll.push(moduleElement.getData('module').handle('update', payload));
            }
            Promise.all(promiseUpdateAll).then(payload => resolve(payload));
        };

        return new Promise(updateModuleExecutor);
    };

    /**
     * remove multiple modules
     * @param modules
     * @param tabContentElement
     * @returns {Promise}
     */
    let removeModules = (modules, tabContentElement) => {
        let promiseRemoveAll = [];
        for(let Module of modules){
            promiseRemoveAll.push(removeModule(Module, tabContentElement));
        }
        return Promise.all(promiseRemoveAll);
    };

    /**
     * remove module
     * @param Module
     * @param parentElement
     * @param addSpacer
     * @returns {Promise}
     */
    let removeModule = (Module, parentElement, addSpacer = false) => {

        let removeModuleElement = moduleElement => {
            let removeModuleElementExecutor = (resolve, reject) => {
                let payload = {
                    action: 'removeModule',
                    data: {}
                };

                // get module instance
                let module = moduleElement.getData('module');
                if(module instanceof BaseModule){
                    module.handle('beforeHide');

                    $(moduleElement).velocity('reverse', {
                        complete: moduleElement => {
                            moduleElement = moduleElement[0];
                            let module = moduleElement.getData('module');
                            module.handle('beforeDestroy');

                            // [optional] add a "spacer" <div> that fakes Module height during hide->show animation
                            if(addSpacer){
                                let spacerEl = document.createElement('div');
                                spacerEl.classList.add(Module.className + '-spacer');
                                spacerEl.setAttribute('data-module', Module.name);
                                spacerEl.style.height = moduleElement.offsetHeight + 'px';

                                moduleElement.insertAdjacentElement('afterend', spacerEl);
                            }

                            moduleElement.remove();

                            resolve(payload);
                        }
                    });
                }else{
                    console.warn('Invalid module. Instance of %O expected for %o', BaseModule, moduleElement);
                    resolve(payload);
                }
            };

            return new Promise(removeModuleElementExecutor);
        };

        let removeModuleExecutor = resolve => {
            let promiseRemoveAll = [];
            let moduleElements = parentElement.querySelectorAll('.' + Module.className + '[data-module="' +  Module.name + '"]');
            for(let moduleElement of moduleElements){
                promiseRemoveAll.push(removeModuleElement(moduleElement));
            }
            Promise.all(promiseRemoveAll).then(payload => resolve(payload));
        };

        return new Promise(removeModuleExecutor);
    };

    /**
     * updates current visible/active mapElement in mapModule with user data
     * @param mapModule
     * @returns {Promise<any>}
     */
    let updateActiveMapUserData = mapModule => new Promise(resolve => {
        // get all active map elements for module
        let mapElement = $(mapModule).getActiveMap();
        updateMapUserData(mapElement).then(() => resolve());
    });

    /**
     * updates mapElement with user data
     * update
     * @param mapElement
     * @returns {Promise<any>}
     */
    let updateMapUserData = mapElement => {
        // performance logging (time measurement)
        let logKeyClientUserData = Init.performanceLogging.keyClientUserData;
        Util.timeStart(logKeyClientUserData);

        let updateMapUserDataExecutor = resolve => {
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
            let currentSystemData = Util.getCurrentSystemData(systemData.mapId);

            if(
                currentSystemData &&
                systemData.id === currentSystemData.id
            ){
                // trigger system update events
                let tabContentEl = document.getElementById(config.mapTabIdPrefix + systemData.mapId);
                $(tabContentEl).trigger('pf:updateSystemModules', {
                    payload: systemData
                });
            }
        }
    };

    /**
     * set observer for tab content (areas where modules will be shown)
     * @param tabContent
     * @param mapId
     */
    let setTabContentObserver = (tabContent, mapId) => {

        let defaultSortableOptions = {
            invertSwap: true,
            animation: Init.animationSpeed.mapModule,
            handle: '.' + config.sortableHandleClass,
            draggable: '.' + config.moduleClass,
            ghostClass: config.sortableGhostClass,
            chosenClass: config.sortableChosenClass,
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
                    // function is called to frequently for different "groups"
                    // if an element moved between groups -> async local store can not handle this in time
                    // -> queue up store calls
                    let key = 'modules_' + sortable.options.group.name;
                    Util.getLocalStore('map').setItem(`${mapId}.${key}`, sortable.toArray());
                }
            },
            onStart: function(e){
                // Element dragging started
                // -> save initial sort state -> see store.set()
                this.save();

                // highlight valid grid areas where module could be dropped
                let module = e.item.getData('module');
                let sortTargetAreas = module.config.sortTargetAreas || [];

                tabContent.querySelectorAll('.' + Util.getMapTabContentAreaClass()).forEach(gridArea => {
                    if(sortTargetAreas.includes(gridArea.getAttribute('data-area'))){
                        gridArea.classList.add(config.sortableDropzoneClass);
                    }else{
                        gridArea.classList.remove(config.sortableDropzoneClass);
                    }
                });
            },
            onEnd: function(e){
                // remove highlight grid areas
                tabContent.querySelectorAll('.' + Util.getMapTabContentAreaClass()).forEach(gridArea => {
                    gridArea.classList.remove(config.sortableDropzoneClass);
                });
            }
        };

        [
            'onChoose',
            'onStart',
            'onEnd',
            'onAdd',
            'onUpdate',
            'onSort',
            'onRemove',
            'onChange',
            'onUnchoose',
            //'onMove'
        ].forEach(name => {
            defaultSortableOptions[name] = function(e){
                // onMove is the only event where e.item does not exist
                // -> e.related is the element that is moved by the dragged one
                let target = e.item || e.related;
                let module = target.getData('module');

                switch(name){
                    case 'onStart':
                        // Element dragging started
                        // -> save initial sort state -> see store.set()
                        this.save();

                        // highlight valid grid areas where module could be dropped
                        let sortTargetAreas = module.config.sortTargetAreas || [];
                        tabContent.querySelectorAll('.' + Util.getMapTabContentAreaClass()).forEach(gridArea => {
                            if(sortTargetAreas.includes(gridArea.getAttribute('data-area'))){
                                gridArea.classList.add(config.sortableDropzoneClass);
                            }else{
                                gridArea.classList.remove(config.sortableDropzoneClass);
                            }
                        });
                        break;
                    case 'onEnd':
                        // remove highlight grid areas
                        tabContent.querySelectorAll('.' + Util.getMapTabContentAreaClass()).forEach(gridArea => {
                            gridArea.classList.remove(config.sortableDropzoneClass);
                        });
                        break;

                }
                // pipe events to module
                module.handle('onSortableEvent', name, e);
            };
        });

        /**
         * sortable map modules
         */
        tabContent.querySelectorAll('.' + Util.getMapTabContentAreaClass()).forEach(gridArea => {

            let sortable = Sortable.create(gridArea, Object.assign({}, defaultSortableOptions, {
                group: {
                    name: 'area_' + gridArea.getAttribute('data-area'),
                    pull: (to, from, dragEl, e) => {
                        // set allowed droppable target areas for module
                        let module = dragEl.getData('module');
                        return (module.config.sortTargetAreas || []).map(area => 'area_' + area);
                    },
                    put: (to, from, dragEl, e) => {
                        return true;
                    }
                }
            }));
        });

        /**
         * toggle module height
         * @param e
         */
        let toggleModuleHeight = e => {
            if(
                e.target.classList.contains(config.moduleClass) &&
                e.layerX <= 9 && e.layerY <= 9 && e.layerX >= 0 && e.layerY >= 0
            ){
                e.stopPropagation();
                let moduleElement = e.target;

                // remember height
                if(!moduleElement.dataset.origHeight){
                    moduleElement.dataset.origHeight = moduleElement.offsetHeight;
                }

                if(moduleElement.classList.contains(config.moduleCollapsedClass)){
                    $(moduleElement).velocity('finish').velocity({
                        height: [moduleElement.dataset.origHeight + 'px', [400, 15]]
                    },{
                        duration: 400,
                        easing: 'easeOutSine',
                        complete: moduleElement => {
                            moduleElement[0].classList.remove(config.moduleCollapsedClass);
                            delete moduleElement[0].dataset.origHeight;
                            moduleElement[0].style.height = null;
                        }
                    });
                }else{
                    $(moduleElement).velocity('finish').velocity({
                        height: ['38px', [400, 15]]
                    },{
                        duration: 400,
                        easing: 'easeOutSine',
                        complete: moduleElement => {
                            moduleElement[0].classList.add(config.moduleCollapsedClass);
                        }
                    });
                }
            }
        };

        EventHandler.addEventListener(tabContent, 'click.toggleModuleHeight', toggleModuleHeight, {passive: false});
    };

    /**
     * get grid item (area) elements for map tab content
     * @returns {[]}
     */
    let getTabContentAreaElements = () => {
        let gridAreas = [];
        for(let areaAlias of Util.config.mapTabContentAreaAliases){
            let gridArea = document.createElement('div');
            gridArea.classList.add(Util.getMapTabContentAreaClass(), Util.getMapTabContentAreaClass(areaAlias));
            gridArea.setAttribute('data-area', areaAlias);

            gridAreas.push(gridArea);
        }
        return gridAreas;
    };

    /**
     * new tabs element
     * @returns {HTMLDivElement}
     */
    let newMapTabsElement = () => {
        let tabEl = Object.assign(document.createElement('div'), {
            id: config.mapTabElementId
        });

        /**
         * new tabBar element
         * @param options
         * @returns {HTMLUListElement}
         */
        let newTabBar = options => {
            let tabBarEl = document.createElement('ul');
            tabBarEl.id = Util.config.mapTabBarIdPrefix + options.area;
            tabBarEl.dataset.area = options.area;
            tabBarEl.classList.add('nav', 'nav-tabs', Util.config.mapTabBarClass);
            tabBarEl.setAttribute('role', 'tablist');
            return tabBarEl;
        };

        /**
         * new tabContent wrapper element
         * @param options
         * @returns {HTMLDivElement}
         */
        let newTabContentWrapper = options => {
            let tabContentWrapperEl = document.createElement('div');
            tabContentWrapperEl.dataset.target = Util.config.mapTabBarIdPrefix + options.area;
            tabContentWrapperEl.classList.add('tab-content', config.mapTabContentWrapperClass);
            return tabContentWrapperEl;
        };

        let tabBarEls = [
            newTabBar({area: 'left'}),
            //newTabBar({area: 'right'})
        ];

        let tabContentWrapperEls = [
            newTabContentWrapper({area: 'left'}),
            //newTabContentWrapper({area: 'right'})
        ];

        tabEl.append(
            ...tabBarEls,
            ...tabContentWrapperEls
        );
        tabBarEls.forEach(tabBarEl => setMapTabBarObserver(tabBarEl));
        tabContentWrapperEls.forEach(tabContentWrapperEl => setMapTabContentWrapperObserver(tabContentWrapperEl));

        return tabEl;
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
            $(parentElement).children(childSelector).each((i, moduleElement) => {
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
     * set map tab bar observer
     * @param tabBarEl
     */
    let setMapTabBarObserver = tabBarEl => {

        // set tab sortable -------------------------------------------------------------------------------------------
        let sortable = Sortable.create(tabBarEl, {
            group: {
                name: 'tabs_' + tabBarEl.dataset.area,
                pull: (to, from, dragEl, e) => {
                    // set allowed droppable target areas for module
                    return ['left', 'right'].map(area => 'tabs_' + area);
                },
                put: (to, from, dragEl, e) => {
                    return true;
                }
            },
            animation: Init.animationSpeed.mapModule,
            handle: '.' + config.sortableHandleClass,
            draggable: '.' + config.mapTabClass + ':not(.noSort)',
            ghostClass: config.sortableGhostClass,
            scroll: false,
            dataIdAttr: 'data-sort-id',
            sort: true,
            direction: 'horizontal',
            store: {
                get: function(sortable){
                    return [];
                },
                set: function(sortable){
                    let key = `map_${sortable.options.group.name}`;
                    Util.getLocalStore('character').setItem(`${Util.getCurrentCharacterId()}.${key}`, sortable.toArray());
                }
            },
            onStart: function(e){
                // Element dragging started
                // -> save initial sort state -> see store.set()
                this.save();

                // highlight dropable tabBarEls areas
                [...document.getElementsByClassName(Util.config.mapTabBarClass)].forEach(tabBarEl => {
                    tabBarEl.classList.add(config.sortableDropzoneClass);
                });
            },
            onEnd: function(e){
                // remove highlight dropable tabBarEls areas
                [...document.getElementsByClassName(Util.config.mapTabBarClass)].forEach(tabBarEl => {
                    tabBarEl.classList.remove(config.sortableDropzoneClass);
                });
            }
        });

        // set tab click ----------------------------------------------------------------------------------------------
        $(tabBarEl).on('click', 'a', e => {
            e.preventDefault();
            // callback function after tab switch
            let switchTabCallback = (mapElement, linkEl) => {
                $(linkEl).tab('show');
                // unfreeze map
                mapElement.data('frozen', false);
                return false;
            };

            let linkEl = e.currentTarget;
            let tabType = linkEl.dataset.tabType;
            let mapId = parseInt(linkEl.dataset.mapId) || 0;

            // ignore "add"/"settings" tab. no need for map change
            if(tabType === 'map' && mapId > 0){
                if(mapTabChangeBlocked === false){
                    let mapElement = $(document.getElementById(config.mapTabElementId)).getActiveMap();

                    if(mapId !== mapElement.data('id')){
                        // block tabs until switch is done
                        mapTabChangeBlocked = true;
                        // freeze active map -> no user data update while map switch
                        mapElement.data('frozen', true);

                        // hide current map with animation
                        MapUtil.visualizeMap(mapElement, 'hide').then(payload => {
                            // un-block map tabs
                            mapTabChangeBlocked = switchTabCallback(mapElement, linkEl);
                        });
                    }
                }
            }else{
                e.stopPropagation();
                if(tabType === 'add'){
                    // "add" tab clicked
                    Util.triggerMenuAction(document, 'ShowMapSettings', {tab: 'new'});
                }else if(tabType === 'settings'){
                    // "settings" tab clicked
                    $(linkEl).editable('show');
                }else{
                    console.error('Invalid tabType = %o for %O', tabType, linkEl);
                }
            }
        });

        // tab switch -------------------------------------------------------------------------------------------------
        $(tabBarEl).on('show.bs.tab', 'a', e => {
            let linkEl = e.currentTarget;
            let tabType = linkEl.dataset.tabType;
            let mapId = parseInt(linkEl.dataset.mapId) || 0;

            if(tabType === 'map' && mapId > 0){
                mapTabOnShow(tabBarEl, mapId);
            }
        });

        $(tabBarEl).on('shown.bs.tab', 'a', function(e){
            // load new map right after tab-change
            let linkEl = e.currentTarget;
            let mapId = parseInt(linkEl.dataset.mapId) || 0;
            let defaultSystemId = parseInt(linkEl.dataset.defaultSystemId) || 0;
            let tabMapData = Util.getCurrentMapData(mapId);
            let tabContentEl = document.getElementById(config.mapTabIdPrefix + mapId);

            // tabContentEl does not exist in case of error where all map elements got removed
            if(tabMapData !== false && tabContentEl){
                // load map
                let areaMap = tabContentEl.querySelector(`.${Util.getMapTabContentAreaClass('map')}`);
                Map.loadMap(areaMap, tabMapData, {showAnimation: true}).then(payload => {
                    // "wake up" scrollbar for map and get previous state back
                    let mapConfig = payload.data.mapConfig;
                    let mapElement = mapConfig.map.getContainer();
                    let areaMap = mapElement.closest('.mCustomScrollbar');
                    $(areaMap).mCustomScrollbar('update');

                    // show "global" map panels of map was initial loaded
                    if(payload.isFirstLoad){
                        MapUtil.showMapInfo(mapConfig.map);
                    }

                    // if there is an already an "active" system -> setCurrentSystemData for that again
                    let activeSystemEl = mapElement.querySelector(`.${MapUtil.config.systemActiveClass}`);
                    if(activeSystemEl){
                        MapUtil.setSystemActive(mapConfig.map, $(activeSystemEl));
                    }else if(defaultSystemId){
                        // currently no system "active" check if there is a default system set for this mapTab
                        // -> e.g. from URL link
                        let systemId = MapUtil.getSystemId(mapConfig.config.id, defaultSystemId);
                        let systemEl = mapElement.querySelector(`#${systemId}`);
                        if(systemEl){
                            // system exists on map -> make active and show panels
                            MapUtil.showSystemInfo(mapConfig.map, $(systemEl));
                        }
                    }

                    // change url to unique map URL
                    if(history.pushState){
                        history.pushState({}, '', MapUtil.getMapDeeplinkUrl(mapConfig.config.id));
                    }

                    // update map user data (do not wait until next update is triggered)
                    updateMapUserData($(mapElement));
                });
            }
        });

        $(tabBarEl).on('hide.bs.tab', 'a', e => {
            let oldLinkEl = e.currentTarget;
            let newLinkEl = e.relatedTarget;

            let oldMapId = parseInt(oldLinkEl.dataset.mapId) || 0;
            let newMapId = parseInt(newLinkEl.dataset.mapId) || 0;

            // skip "add button"
            if(newMapId > 0){
                let currentTabContentEl = document.getElementById(config.mapTabIdPrefix + oldMapId);

                // disable scrollbar for map that will be hidden. "freeze" current state
                let areaMap = currentTabContentEl.querySelector(`.${Util.getMapTabContentAreaClass('map')}`);
                $(areaMap).mCustomScrollbar('disable', false);
            }
        });
    };

    /**
     * set data for a map tab, or update an existing map tab with new data return promise
     * @param tabLinkEl
     * @param options
     * @returns {Promise<any>}
     */
    let updateTabData = (tabLinkEl, options) => new Promise(resolve => {
        // set "main" data
        tabLinkEl.dataset.mapId = options.id;

        // add updated timestamp (not available for "add" tab
        if(Util.getObjVal(options, 'updated.updated')){
            tabLinkEl.dataset.updated = options.updated.updated;
        }

        // change "tab" link
        tabLinkEl.setAttribute('href', `#${config.mapTabIdPrefix}${options.id}`);

        // change "map" icon
        let mapIconEl = tabLinkEl.querySelector(`.${config.mapTabIconClass}`);
        mapIconEl.classList.remove(...mapIconEl.classList);
        mapIconEl.classList.add(config.mapTabIconClass, 'fas', 'fa-fw', options.icon);

        // change "shared" icon
        let mapSharedIconEl = tabLinkEl.querySelector(`.${config.mapTabSharedIconClass}`);
        mapSharedIconEl.style.display = 'none';

        // check if the map is a "shared" map
        if(options.access){
            if(
                options.access.character.length > 1 ||
                options.access.corporation.length > 1 ||
                options.access.alliance.length > 1
            ){
                mapSharedIconEl.style.display = 'initial';
            }
        }

        // change map name label
        let textEl = tabLinkEl.querySelector(`.${config.mapTabLinkTextClass}`);
        textEl.textContent = options.name;

        // change tabClass
        let listEl = tabLinkEl.parentNode;

        // new tab classes
        let tabClasses = [config.mapTabClass, options.type.classTab];

        if(options.draggable === false){
            tabClasses.push('noSort');
        }

        // check if tab was "active" before
        if(listEl.classList.contains('active')){
            tabClasses.push('active');
        }
        listEl.classList.remove(...listEl.classList);
        listEl.classList.add(...tabClasses);

        // set title for tooltip
        if(options.type.name !== undefined){
            textEl.setAttribute('title', `${options.type.name} map`);
        }

        let mapTooltipOptions = {
            placement: 'bottom',
            container: 'body',
            trigger: 'hover',
            delay: 150
        };

        $(listEl.querySelector('[title]')).tooltip(mapTooltipOptions).tooltip('fixTitle');

        resolve({
            action: 'update',
            data: {
                mapId: options.id,
                mapName: options.name
            }
        });
    });

    /**
     * add a new tab to tab-map-module end return promise
     * @param tabEl
     * @param options
     * @returns {Promise<any>}
     */
    let addTab = (tabEl, options) => {

        /**
         * get new <li> element used as map tab
         * @param mapId
         * @param tabType
         * @param tabSortId
         * @returns {HTMLLIElement}
         */
        let newTabListElement = (mapId, tabType, tabSortId) => {
            let listEl = document.createElement('li');
            listEl.dataset.sortId = tabSortId;
            listEl.setAttribute('role', 'presentation');

            // link element
            let linkEl = document.createElement('a');
            linkEl.dataset.tabType = tabType;
            linkEl.setAttribute('role', 'tab');

            // tab drag handler element
            if(mapId > 0){
                linkEl.append(Object.assign(document.createElement('i'), {
                    className: config.sortableHandleClass
                }));
            }

            // map icon element
            linkEl.append(Object.assign(document.createElement('i'), {
                className: config.mapTabIconClass
            }));

            // text element
            linkEl.append(Object.assign(document.createElement('span'), {
                className: config.mapTabLinkTextClass
            }));

            // map shared icon element
            linkEl.append(Object.assign(document.createElement('i'), {
                className: [config.mapTabSharedIconClass, 'fas', 'fa-fw', 'fa-share-alt'].join(' '),
                title: 'shared map'
            }));

            listEl.append(linkEl);
            return listEl;
        };

        /**
         * get tab content element
         * @param mapId
         * @returns {HTMLDivElement}
         */
        let newTabContentElement = mapId => {
            let contentEl = document.createElement('div');
            contentEl.id = config.mapTabIdPrefix + parseInt(mapId);
            contentEl.classList.add(Util.config.mapTabContentClass, 'tab-pane');
            contentEl.dataset.mapId = mapId;
            return contentEl;
        };

        /**
         * add tab promise
         * @param resolve
         */
        let addTabExecutor = resolve => {
            Util.getLocalStore('character').getItem(Util.getCurrentCharacterId()).then(localDataCharacter => {
                let mapId = options.id || 0;
                let defaultTabArea = options.area || 'left'; // whether tab should be added to left or right list
                let defaultPosition = options.position || 0;
                let tabType = options.tabType || 'map';
                let tabSortId = [tabType, mapId].join('_');

                // check for stored map tab order in indexDB (client) -------------------------------------------------
                if(localDataCharacter){
                    for(let tabArea of ['left', 'right']){
                        let positionIndex = (Util.getObjVal(localDataCharacter, `map_tabs_${tabArea}`) || []).indexOf(tabSortId);
                        if(positionIndex !== -1){
                            // first index (0) => is position 1
                            defaultPosition = positionIndex + 1;
                            defaultTabArea = tabArea;
                            break;
                        }
                    }
                }

                let tabBarId = Util.config.mapTabBarIdPrefix + defaultTabArea;
                let tabBar = tabEl.querySelector('#' + tabBarId);
                let tabContentWrapperEl = tabEl.querySelector(`.${config.mapTabContentWrapperClass}[data-target="${tabBarId}"]`);
                let listEl = newTabListElement(mapId, tabType, tabSortId);
                let tabContentEl = newTabContentElement(mapId);

                listEl.dataset.position = String(defaultPosition);

                // find correct position for new tabs -----------------------------------------------------------------
                let position = getModulePosition(tabBar, `.${config.mapTabClass}`, defaultPosition);

                // insert at correct position -------------------------------------------------------------------------
                let prevListEl = tabBar.querySelector(`li:nth-child(${position})`);

                if(prevListEl){
                    prevListEl.insertAdjacentElement('afterend', listEl);
                }else{
                    tabBar.insertAdjacentElement('afterbegin', listEl);
                }

                // update Tab element -> set data
                updateTabData(listEl.querySelector('a'), options);

                // add grid area elements for the new tab
                if(mapId){
                    tabContentEl.append(...getTabContentAreaElements());
                    setTabContentObserver(tabContentEl, mapId);
                }
                tabContentWrapperEl.insertAdjacentElement('beforeend', tabContentEl);

                resolve({
                    action: 'add',
                    data: {
                        mapId: mapId,
                        mapName: options.name
                    }
                });
            });
        };

        return new Promise(addTabExecutor);
    };

    /**
     * deletes tab from tab-map-module end return promise
     * @param tabEl
     * @param mapId
     * @returns {Promise<any>}
     */
    let deleteTab = (tabEl, mapId) => {

        /**
         * delete tab promise
         * @param resolve
         */
        let deleteTabExecutor = resolve => {
            let linkEl = tabEl.querySelector(`a[href="#${config.mapTabIdPrefix + mapId}"]`);
            let deletedTabName = '';

            if(linkEl){
                deletedTabName = linkEl.querySelector(`.${config.mapTabLinkTextClass}`).textContent;

                let listEl = linkEl.parentNode;
                let tabContentEl = tabEl.querySelector(`#${config.mapTabIdPrefix + mapId}`);

                $(listEl).remove();
                $(tabContentEl).remove();

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
     * @returns {Promise<any[]>}
     */
    let clearMapModule = mapModule => {
        let promiseDeleteTab = [];
        let tabEl = document.getElementById(config.mapTabElementId);
        if(tabEl){
            let tabLinkEls = Util.getMapTabLinkElements(mapModule);
            for(let i = 0; i < tabLinkEls.length; i++){
                let tabLinkEl = tabLinkEls[i];
                let mapId = parseInt(tabLinkEl.dataset.mapId) || 0;
                if(mapId > 0){
                    promiseDeleteTab.push(deleteTab(tabEl, mapId));
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
     * @param tabEl
     * @returns {Promise<any>}
     */
    let showDefaultTab = tabEl => {

        let getActiveTabLinkElement = mapId => {
            return tabEl.querySelector(`.${config.mapTabClass} > a[data-map-id="${mapId}"]`);
        };

        /**
         * show default tab promise
         * @param resolve
         */
        let showDefaultTabExecutor = resolve => {
            Util.getLocalStore('character').getItem(Util.getCurrentCharacterId()).then(data => {
                let linkEl = null;

                // check for existing mapId URL identifier ------------------------------------------------------------
                let urlData = getMapDataFromUrl();
                let defaultMapId = urlData[0] || 0;
                let defaultSystemId = urlData[1] || 0;

                if(defaultMapId){
                    linkEl = getActiveTabLinkElement(defaultMapId);
                    if(defaultSystemId && linkEl){
                        linkEl.dataset.defaultSystemId = defaultSystemId;
                    }
                }

                // ... else check for existing cached default mapId ---------------------------------------------------
                if(!linkEl && data && data.defaultMapId){
                    // make specific map tab active
                    linkEl = getActiveTabLinkElement(data.defaultMapId);
                }

                // ... else make first map tab active (default) -------------------------------------------------------
                if(!linkEl){
                    linkEl = tabEl.querySelector(`.${config.mapTabClass} > a`);
                }

                if(linkEl){
                    $(linkEl).tab('show');
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
    let updateMapModule = mapModule => {
        // performance logging (time measurement)
        let logKeyClientMapData = Init.performanceLogging.keyClientMapData;
        Util.timeStart(logKeyClientMapData);

        let updateMapModuleExecutor = resolve => {
            // check if tabs module is already loaded
            let tabEl = document.getElementById(config.mapTabElementId);

            // store current map data global (cache)
            // temp store current map data to prevent data-change while function execution!
            let tempMapData = Util.getCurrentMapData();

            if(tempMapData.length === 0){
                // clear all existing maps ============================================================================
                clearMapModule(mapModule)
                    .then(payload => {
                        // no map data available -> show "new map" dialog
                        Util.triggerMenuAction(document, 'ShowMapSettings', {tab: 'new'});
                    })
                    .then(payload => resolve());
            }else{
                if(tabEl){
                    // tab element exists -> update ===================================================================
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
                    let tabLinkEls = Util.getMapTabLinkElements(mapModule);

                    // mapIds that are currently active
                    let activeMapIds = [];

                    // check whether a tab/map is still active
                    for(let i = 0; i < tabLinkEls.length; i++){
                        let tabLinkEl = tabLinkEls[i];
                        let mapId = parseInt(tabLinkEl.dataset.mapId) || 0;

                        if(mapId > 0){
                            let tabMapData = Util.getCurrentMapData(mapId);
                            if(tabMapData !== false){
                                // map data available ->
                                activeMapIds.push(mapId);

                                // check for map data change and update tab
                                if(tabMapData.config.updated.updated > (parseInt(tabLinkEl.dataset.updated) || 0)){
                                    promiseUpdateTab.push(updateTabData(tabLinkEl, tabMapData.config));
                                }
                            }else{
                                // map data not available -> remove tab
                                promiseDeleteTab.push(deleteTab(tabEl, mapId).then(tabDeletedCallback));
                            }
                        }
                    }

                    // add new tabs for new maps
                    for(let data of tempMapData){
                        if(activeMapIds.indexOf(data.config.id) === -1){
                            // add new map tab
                            promisesAddTab.push(addTab(tabEl, data.config).then(tabAddCallback));
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
                                let tabContentEl = document.getElementById(config.mapTabIdPrefix + activeMapId);
                                let areaMap = tabContentEl.querySelector(`.${Util.getMapTabContentAreaClass('map')}`);
                                return Map.loadMap(areaMap, activeMapData, {});
                            }else{
                                console.error('No active map found!');
                            }
                        }else{
                            // .. no map active, make one active
                            return showDefaultTab(tabEl);
                        }
                    }).then(payload => resolve());

                }else{
                    // tab Element does not exists -> create ==========================================================
                    let promisesAddTab = [];
                    tabEl = newMapTabsElement();
                    mapModule.prepend(tabEl);

                    // add new tab for each map
                    for(let j = 0; j < tempMapData.length; j++){
                        let data = tempMapData[j];
                        promisesAddTab.push(addTab(tabEl, data.config));
                    }

                    // "add" map tab
                    let tabAddOptions = {
                        id: 0,
                        type: {
                            classTab: MapUtil.getInfoForMap('standard', 'classTab'),
                            name: 'new'
                        },
                        icon: 'fa-plus',
                        name: 'add',
                        area: 'left',
                        tabType: 'add',
                        position: 90 // always the most right tab
                    };

                    // "settings" tab
                    let tabSettingsOptions = {
                        id: 0,
                        type: {
                            classTab: MapUtil.getInfoForMap('standard', 'classTab')
                        },
                        icon: 'fa-tv',
                        name: '',
                        area: 'left',
                        tabType: 'settings',
                        position: 100, // always the most right tab
                        draggable: false
                    };

                    promisesAddTab.push(addTab(tabEl, tabAddOptions));
                    promisesAddTab.push(addTab(tabEl, tabSettingsOptions));

                    Promise.all(promisesAddTab)
                        .then(payload => showDefaultTab(tabEl))
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

    let mapTabOnShow = (tabBarEl, mapId) => {
        // save mapId as new "default" (local storage)
        Util.getLocalStore('character').setItem(`${Util.getCurrentCharacterId()}.defaultMapId`, mapId);
        // update mapTab element
        updateMapTabElement(mapId);
    };

    /**
     * update mapTab element
     *    -> e.g. "Settings" popover data
     *    -> e.g. update mapModule layout
     * @param mapId
     */
    let updateMapTabElement = mapId => {
        let tabEl = document.getElementById(config.mapTabElementId);
        if(!tabEl || !mapId){
            return;
        }

        let setMapTabLayout = (tabEl, layoutNew) => {
            config.mapTabContentLayoutColumnOptions.forEach(columns => tabEl.classList.toggle(columns, columns === layoutNew.columns));
            config.mapTabContentLayoutOrientationOptions.forEach(orientation => tabEl.classList.toggle(orientation, orientation === layoutNew.orientation));
        };

        let getLayoutSvgLink = (layoutCols = config.defaultMapTabContentCols, orientation = config.defaultMapTabContentOrientation) => {
            return `#pf-svg-${layoutCols}-${orientation}`;
        };

        Promise.all([
            getModules(),
            Util.getLocalStore('map').getItem(mapId)
        ]).then(payload => {
            let modules = payload[0];
            let localDataMap = payload[1];
            let disabledValues = Util.getObjVal(localDataMap, 'modulesDisabled');
            let layoutCurrent = Object.assign({}, {
                columns: config.defaultMapTabContentCols,
                orientation: config.defaultMapTabContentOrientation
            }, Util.getObjVal(localDataMap, 'layout'));

            // update mapModule with current layout class
            setMapTabLayout(tabEl, layoutCurrent);

            // prepare select options for modules
            let modulePrioCounts = Array(BaseModule.scopeOrder.length).fill(0);
            let sourceOptions = modules.sort((a, b) => a.getOrderPrio() - b.getOrderPrio()).map(Module => ({
                value: Module.name,
                text: Module.label,
                metaData: {
                    scope: Module.scope,
                    orderPrio: Module.getOrderPrio(),
                    prioCount: ++modulePrioCounts[Module.getOrderPrio()],
                    isPlugin: Module.isPlugin
                }
            }));

            // default -> all modules selected -> plugin modules disabled
            if(!disabledValues){
                disabledValues = sourceOptions.reduce((acc, optionData) => {
                        if(optionData.metaData.isPlugin){
                            acc.push(optionData.value);
                        }
                        return acc;
                    }, []
                );
                Util.getLocalStore('map').setItem(`${mapId}.modulesDisabled`, disabledValues);
            }

            let settingsLinkEl = tabEl.querySelector(`.${config.mapTabClass} > a[data-tab-type="settings"]`);
            if(settingsLinkEl){
                // settings settingsLinkEl should always exist
                settingsLinkEl = $(settingsLinkEl);

                /**
                 * we store "unselected" options only -> new modules should be visible by default!
                 * @param sourceOptions
                 * @param values
                 * @returns []
                 */
                let invertValues = (sourceOptions, values = []) => sourceOptions
                    .filter(optionData => !values.includes(optionData.value))
                    .map(optionData => optionData.value);

                let selectedValues = invertValues(sourceOptions, disabledValues);

                if(settingsLinkEl.data('editable')){
                    settingsLinkEl.editable('setValue', selectedValues);
                    settingsLinkEl.editable('option', 'pk', mapId);
                    settingsLinkEl.editable('option', 'pfLayoutCurrent', layoutCurrent);
                }else{
                    settingsLinkEl.on('shown', (e, editable) => {
                        let layoutCurrent = Util.getObjVal(editable, 'options.pfLayoutCurrent');

                        // add "layout" toggle to popover -----------------------------------------------------------------
                        let anchorEl = editable.container.$form[0].querySelector(`.${config.editableSettingsClass}`);

                        let toggleGroupEl = Object.assign(document.createElement('div'), {
                            className: [config.editableToggleClass].join(' ')
                        });

                        let gridItemEls = config.mapTabContentLayoutColumnOptions.map((layoutCols, i) => {
                            let isActive = layoutCols === layoutCurrent.columns;
                            let orientation = isActive ? layoutCurrent.orientation : undefined;

                            let svgEl = Svg.newSymbolSvg(getLayoutSvgLink(layoutCols, orientation));
                            svgEl.classList.add('btn', 'btn-default', config.editableToggleSvgClass);
                            svgEl.dataset.value = layoutCols;
                            if(isActive){
                                svgEl.classList.add('active');
                            }

                            // left/right layout button
                            let btnEl = Object.assign(document.createElement('div'), {
                                className: ['btn', 'btn-xs', 'btn-default', config.editableToggleBtnClass].join(' ')
                            });
                            btnEl.append(Object.assign(document.createElement('i'), {
                                className: ['fas', 'fa-rotate-90', 'fa-retweet'].join(' ')
                            }));
                            btnEl.dataset.value = 'left';
                            if(!isActive){
                                btnEl.classList.add('disabled');
                            }
                            if(orientation === btnEl.dataset.value){
                                btnEl.classList.add('active');
                            }

                            // btn group
                            let btnGroupEl = Object.assign(document.createElement('div'), {
                                className: ['btn-group', config.editableToggleItemClass].join(' ')
                            });
                            btnGroupEl.append(...(i % 2) ? [svgEl, btnEl] : [btnEl, svgEl]);

                            return btnGroupEl;
                        });

                        toggleGroupEl.append(...gridItemEls);
                        anchorEl.insertAdjacentElement('beforebegin', toggleGroupEl);

                        // click event for layout switch -> change layout -> store new layout setting
                        EventHandler.addEventListener(toggleGroupEl, 'click.toggleSelect', e => {
                            e.stopPropagation();
                            // check if "click" bubbles up to .btn and button is not disabled
                            let btnEl = e.target.closest(`.btn`);
                            if(!btnEl || btnEl.classList.contains('disabled')){
                                return;
                            }

                            [...e.currentTarget.getElementsByClassName(config.editableToggleItemClass)].forEach(btnGroupEl => {
                                let svgEl = btnGroupEl.querySelector(`.${config.editableToggleSvgClass}`);
                                let btnEl = btnGroupEl.querySelector(`.${config.editableToggleBtnClass}`);

                                if(btnGroupEl === e.target.closest(`.${config.editableToggleItemClass}`)){
                                    if(svgEl === e.target.closest(`.${config.editableToggleSvgClass}`)){
                                        // click on SVG
                                        svgEl.classList.toggle('active', true);
                                        btnEl.classList.toggle('disabled', false);
                                    }

                                    if(btnEl === e.target.closest(`.${config.editableToggleBtnClass}`)){
                                        // click on left/right btn
                                        btnEl.classList.toggle('active');
                                        // toggle SVG left/right
                                        Svg.updateSymbolSvg(svgEl, getLayoutSvgLink(
                                            svgEl.dataset.value,
                                            btnEl.classList.contains('active') ? btnEl.dataset.value : undefined
                                        ));
                                    }

                                    // store new values
                                    if(svgEl.classList.contains('active')){
                                        let activeMapId = Util.getObjVal(editable, 'options.pk');
                                        Util.getLocalStore('map').setItem(`${activeMapId}.layout`, {
                                            'columns': svgEl.dataset.value,
                                            'orientation': btnEl.classList.contains('active') ? btnEl.dataset.value : config.defaultMapTabContentOrientation
                                        }).then(layoutNew => {
                                            setMapTabLayout(tabEl, layoutNew);
                                            // for next "toggle" detection
                                            layoutCurrent = layoutNew;
                                            editable.option('pfLayoutCurrent', layoutNew);
                                        });
                                    }
                                }else{
                                    Svg.updateSymbolSvg(svgEl, getLayoutSvgLink(svgEl.dataset.value));
                                    svgEl.classList.toggle('active', false);
                                    btnEl.classList.toggle('active', false);
                                    btnEl.classList.toggle('disabled', true);
                                }
                            });
                        }, {passive: false});

                        // add "headlines" to Modules checklist -------------------------------------------------------
                        anchorEl.childNodes.forEach((gridItem, i) => {
                            if(sourceOptions[i].metaData.prioCount === 1){
                                gridItem.classList.add(config.editableHeadlineClass);
                                gridItem.setAttribute('data-count',
                                    modulePrioCounts[sourceOptions[i].metaData.orderPrio]
                                );
                                gridItem.setAttribute('data-headline',
                                    BaseModule.scopeOrder[sourceOptions[i].metaData.orderPrio]
                                );
                            }
                        });
                    });

                    settingsLinkEl.on('save', {sourceOptions: sourceOptions}, (e, params) => {
                        let editable = $(e.target).data('editable');
                        let activeMapId = Util.getObjVal(editable, 'options.pk');
                        let oldValue = editable.value;
                        let newValue = invertValues(e.data.sourceOptions, params.newValue || []);

                        let map = MapUtil.getMapInstance(activeMapId);
                        let tabContentEl = document.getElementById(config.mapTabIdPrefix + activeMapId);

                        Util.getLocalStore('map').setItem(`${activeMapId}.modulesDisabled`, newValue).then(newValue => {
                            let hideModules = filterModules(modules, oldValue.diff(params.newValue), 'name');
                            let showModules = filterModules(modules, params.newValue.diff(oldValue), 'name');

                            removeModules(hideModules, tabContentEl).then(payload => {
                                let showGlobalModules = showModules.filter(Module => Module.scope === 'global');
                                let showSystemModules = showModules.filter(Module => Module.scope === 'system');
                                let showConnectionModules = showModules.filter(Module => Module.scope === 'connection');
                                if(showGlobalModules.length){
                                    renderModules(showGlobalModules, tabContentEl, {
                                        mapId: activeMapId,
                                        payload: null
                                    });
                                }

                                if(
                                    showSystemModules.length &&
                                    Util.getCurrentSystemData(activeMapId)
                                ){
                                    renderModules(showSystemModules, tabContentEl, {
                                        mapId: activeMapId,
                                        payload: Util.getCurrentSystemData(activeMapId)
                                    });
                                }

                                if(
                                    showConnectionModules.length &&
                                    MapUtil.getConnectionsByType(map, 'state_active').length
                                ){
                                    renderModules(showConnectionModules, tabContentEl, {
                                        mapId: activeMapId,
                                        payload: MapUtil.getConnectionsByType(map, 'state_active')
                                    });
                                }
                            });
                        });
                    });

                    settingsLinkEl.editable({
                        toggle: 'manual',
                        mode: 'popup',
                        type: 'checklist',
                        showbuttons: false,
                        onblur: 'submit',
                        highlight: false,
                        title: 'layout settings',
                        placement: 'left',
                        pk: mapId,
                        value: selectedValues,
                        //prepend: prependOptions,
                        source: sourceOptions,
                        emptyclass: '',
                        emptytext: '',
                        display: function(value, sourceData){
                            // update filter badge
                            if(
                                value && sourceData &&
                                value.length < sourceData.length
                            ){
                                this.dataset.badge = String(value.length);
                            }else{
                                delete this.dataset.badge;
                            }
                        },
                        tpl: `<div class="editable-checklist ${config.editableSettingsClass}"></div>`,
                        pfLayoutCurrent: layoutCurrent
                    });
                }
            }
        });
    };

    /**
     * collect all data (systems/connections) for export/save from each active map in the map module
     * if no change detected -> do not attach map data to return array
     * @param {HTMLElement} mapModule
     * @param filter
     * @returns {[]}
     */
    let getMapModuleDataForUpdate = (mapModule, filter = ['hasId', 'hasChanged']) => {
        let data = [];
        [...mapModule.getElementsByClassName(Util.config.mapClass)].forEach(mapElement => {
            // get all changed (system / connection) data from this map
            let mapData = Map.getMapDataForSync(mapElement, filter);
            if(
                mapData && (
                    (Util.getObjVal(mapData, 'data.systems') || []).length ||
                    (Util.getObjVal(mapData, 'data.connections') || []).length
                )
            ){
                data.push(mapData);
            }
        });
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