define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/map',
    'app/map/util',
    'sortable',
    'app/ui/system_info',
    'app/ui/system_graph',
    'app/ui/system_signature',
    'app/ui/system_route',
    'app/ui/system_killboard',
    'app/ui/connection_info',
    'app/counter'
], function(
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
    SystemKillboardModule,
    ConnectionInfoModule
){
    'use strict';

    let config = {
        dynamicElementWrapperId: 'pf-dialog-wrapper',                           // parent Element for dynamic content (dialogs,..)
        mapTabElementId: 'pf-map-tab-element',                                  // id for map tab element (tabs + content)
        mapTabBarId: 'pf-map-tabs',                                             // id for map tab bar
        mapTabIdPrefix: 'pf-map-tab-',                                          // id prefix for a map tab
        mapTabClass: 'pf-map-tab',                                              // class for a map tab
        mapTabLinkTextClass: 'nav-tabs-link',                                   // class for span elements in a tab
        mapTabIconClass: 'pf-map-tab-icon',                                     // class for map icon
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
        moduleClosedClass: 'pf-module-closed'                                   // class for a closed module

    };

    let mapTabChangeBlocked = false;                                            // flag for preventing map tab switch

    /**
     * get all maps for a maps module
     * @returns {*}
     */
    $.fn.getMaps = function(){
        return $(this).find('.' + config.mapClass);
    };

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
     * set Tab Observer, events are triggered within map.js
     */
    $.fn.setTabContentObserver = function(){
        return this.each(function(){
            let tabContentElement = $(this);
            // update Tab Content with system data information
            tabContentElement.on('pf:drawSystemModules', function(e){
                drawSystemModules($(e.target));
            });

            tabContentElement.on('pf:removeSystemModules', function(e){
                removeSystemModules($(e.target));
            });

            tabContentElement.on('pf:drawConnectionModules', function(e, data){
                drawConnectionModules($(e.target), data);
            });

            tabContentElement.on('pf:removeConnectionModules', function(e){
                removeConnectionModules($(e.target));
            });
        });
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
        let systemModules = [SystemInfoModule, SystemGraphModule, SystemSignatureModule, SystemRouteModule, SystemKillboardModule];
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
     */
    let removeModule = (moduleElement, Module, callback) => {
        if(moduleElement.length > 0){
            if(typeof Module.beforeReDraw === 'function'){
                Module.beforeReDraw();
            }

            moduleElement.velocity('reverse',{
                complete: function(moduleElement){
                    moduleElement = $(moduleElement);
                    if(typeof Module.beforeDestroy === 'function'){
                        Module.beforeDestroy(moduleElement);
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
        /**
         * get module position within its parentElement
         * @param parentElement
         * @param Module
         * @param defaultPosition
         * @returns {number}
         */
        let getModulePosition = (parentElement, Module, defaultPosition) => {
            let position = 0;
            if(defaultPosition > 0){
                parentElement.children().each((i, moduleElement) => {
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
         * show/render a Module
         * @param parentElement
         * @param Module
         * @param mapId
         * @param data
         */
        let showPanel = (parentElement, Module, mapId, data) => {
            let moduleElement = Module.getModule(parentElement, mapId, data);
            if (moduleElement) {
                // store Module object to DOM element for further access
                moduleElement.data('module', Module);
                moduleElement.data('data', data);
                moduleElement.addClass([config.moduleClass, Module.config.moduleTypeClass].join(' '));
                moduleElement.css({opacity: 0}); // will be animated

                // check module position from local storage
                let promiseStore = MapUtil.getLocaleData('map', mapId);
                promiseStore.then(function (dataStore) {
                    let Module = this.moduleElement.data('module');
                    let defaultPosition = Module.config.modulePosition || 0;

                    // check for stored module order in indexDB (client) ----------------------------------------------
                    let key = 'modules_cell_' + this.parentElement.attr('data-position');
                    if (
                        dataStore &&
                        dataStore[key]
                    ) {
                        let positionIndex = dataStore[key].indexOf(Module.config.moduleName);
                        if (positionIndex !== -1) {
                            // first index (0) => is position 1
                            defaultPosition = positionIndex + 1;
                        }
                    }

                    // find correct position for new moduleElement ----------------------------------------------------
                    let position = getModulePosition(this.parentElement, Module, defaultPosition);

                    this.moduleElement.attr('data-position', defaultPosition);
                    this.moduleElement.attr('data-module', Module.config.moduleName);

                    // insert at correct position ---------------------------------------------------------------------
                    let prevModuleElement = this.parentElement.find('.' + config.moduleClass + ':nth-child(' + position + ')');
                    if (prevModuleElement.length) {
                        this.moduleElement.insertAfter(prevModuleElement);
                    } else {
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
                        complete: function (moduleElement) {
                            moduleElement = $(moduleElement);
                            let Module = $(moduleElement).data('module');
                            if (typeof Module.initModule === 'function') {
                                Module.initModule(moduleElement, mapId, moduleElement.data('data'));
                            }
                        }
                    });
                }.bind({
                    parentElement: parentElement,
                    moduleElement: moduleElement
                }));
            }
        };

        // check if module already exists
        let moduleElement = parentElement.find('.' + Module.config.moduleTypeClass);
        if(moduleElement.length > 0){
            removeModule(moduleElement, Module, () => {
                showPanel(parentElement, Module, mapId, data);
            });
        }else{
            showPanel(parentElement, Module, mapId, data);
        }
    };

    /**
     * clears and updates the system info element (signature table, system info,...)
     * @param tabContentElement
     */
    let drawSystemModules = (tabContentElement) => {
        require(['datatables.loader'], function(){
            let currentSystemData = Util.getCurrentSystemData();

            // get grid cells
            let firstCell = tabContentElement.find('.' + config.mapTabContentCellFirst);
            let secondCell = tabContentElement.find('.' + config.mapTabContentCellSecond);

            // draw system info module
            drawModule(firstCell, SystemInfoModule, currentSystemData.mapId, currentSystemData.systemData);

            // draw system graph module
            drawModule(firstCell, SystemGraphModule, currentSystemData.mapId, currentSystemData.systemData);

            // draw signature table module
            drawModule(firstCell, SystemSignatureModule, currentSystemData.mapId, currentSystemData.systemData);

            // draw system routes module
            drawModule(secondCell, SystemRouteModule, currentSystemData.mapId, currentSystemData.systemData);

            // draw system killboard module
            drawModule(secondCell, SystemKillboardModule, currentSystemData.mapId, currentSystemData.systemData);
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
     * updates only visible/active map module
     * @returns {boolean}
     */
    $.fn.updateMapModuleData = function(){
        let mapModule = $(this);

        // performance logging (time measurement)
        let logKeyClientUserData = Init.performanceLogging.keyClientUserData;
        Util.timeStart(logKeyClientUserData);

        // get all active map elements for module
        let mapElement = mapModule.getActiveMap();

        if(mapElement !== false){
            let mapId = mapElement.data('id');

            let currentMapUserData = Util.getCurrentMapUserData(mapId);


            if(currentMapUserData){
                // trigger "update local" for this map => async
                mapElement.trigger('pf:updateLocal', currentMapUserData);

                // update map with current user data
                mapElement.updateUserData(currentMapUserData);
            }
        }

        // log client user data update time
        let duration = Util.timeStop(logKeyClientUserData);
        Util.log(logKeyClientUserData, {duration: duration, type: 'client', description:'update users'});

        return true;
    };

    /**
     * update system info panels (below map)
     * @param systemData
     */
    $.fn.updateSystemModuleData = function(systemData){
        let mapModule = $(this);

        if(systemData){
            // check if current open system is still the requested info system
            let currentSystemData = Util.getCurrentSystemData();

            if(currentSystemData){
                if(systemData.id === currentSystemData.systemData.id){
                    // trigger system update events
                    $(document).triggerHandler('pf:updateSystemInfoModule', [systemData]);
                    $(document).triggerHandler('pf:updateSystemSignatureModule', [systemData]);
                }
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
                    get: function (sortable) {
                        return [];
                    },
                    set: function (sortable) {
                        let key = 'modules_' + sortable.options.group.name;
                        MapUtil.storeLocalData('map', mapId, key, sortable.toArray());
                    }
                },
                onStart: function (e) {
                    // Element dragging started
                    // -> save initial sort state -> see store.set()
                    this.save();
                }
            });
        });

        // toggle height for a module
        $(document).off('click.toggleModuleHeight').on('click.toggleModuleHeight', '.' + config.moduleClass, function(e){
            let moduleElement = $(this);
            // get click position
            let posX = moduleElement.offset().left;
            let posY = moduleElement.offset().top;
            let clickX = e.pageX - posX;
            let clickY = e.pageY - posY;

            // check for top-left click
            if(clickX <= 8 && clickY <= 8){

                // remember height
                if(! moduleElement.data('origHeight')){

                    moduleElement.data('origHeight', moduleElement.outerHeight());
                }

                if(moduleElement.hasClass( config.moduleClosedClass )){
                    let moduleHeight = moduleElement.data('origHeight');
                    moduleElement.velocity('finish').velocity({
                        height: [ moduleHeight + 'px', [ 400, 15 ] ]
                    },{
                        duration: 400,
                        easing: 'easeOutSine',
                        complete: function(){
                            moduleElement.removeClass( config.moduleClosedClass );
                            moduleElement.removeData();
                        }
                    });
                }else{
                    moduleElement.velocity('finish').velocity({
                        height: [ '35px', [ 400, 15 ] ]
                    },{
                        duration: 400,
                        easing: 'easeOutSine',
                        complete: function(){
                            moduleElement.addClass( config.moduleClosedClass );
                        }
                    });
                }
            }
        });
    };

    /**
     * load all structure elements into a TabsContent div (tab body)
     */
    let initContentStructure = (tabContentElements) => {
        tabContentElements.each(function(){
            let tabContentElement = $(this);
            let mapId = parseInt( tabContentElement.attr('data-mapid') );

            // "add" tab does not need a structure and obervers...
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

                setContentStructureObserver(contentStructure, mapId);
            }
        });
    };

    /**
     * get a fresh tab element
     * @param options
     * @returns {*|jQuery|HTMLElement}
     */
    let getTabElement = (options) => {
        let tabElement = $('<div>', {
            id: config.mapTabElementId
        });

        let tabBar = $('<ul>', {
            class: ['nav', 'nav-tabs'].join(' '),
            id: options.barId
        }).attr('role', 'tablist');

        let tabContent = $('<div>', {
            class: 'tab-content'
        }).attr('data-map-tabs', options.barId);

        tabElement.append(tabBar);
        tabElement.append(tabContent);

        return tabElement;
    };

    /**
     * set data for a map tab, or update an existing map tab with new data
     * @param options
     */
    $.fn.updateTabData = function(options){
        let tabElement = $(this);

        // set "main" data
        tabElement.data('map-id', options.id);

        // add updated timestamp (not available for "add" tab
        if(Util.getObjVal(options, 'updated.updated')){
            tabElement.data('updated', options.updated.updated);
        }

        // change "tab" link
        tabElement.attr('href', '#' + config.mapTabIdPrefix + options.id);

        // change "map" icon
        let mapIconElement = tabElement.find('.' + config.mapTabIconClass);
        mapIconElement.removeClass().addClass([config.mapTabIconClass, 'fa', 'fa-fw', options.icon].join(' '));

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
    };


    /**
     * add a new tab to tab-map-module end returns the new objects
     * @param options
     * @returns {{listElement: (*|void), contentElement: (*|HTMLElement)}}
     */
    $.fn.addTab = function(options){
        let tabElement = $(this);
        let tabBar = tabElement.find('ul.nav-tabs');
        let tabContent = tabElement.find('div.tab-content');

        let listElement = $('<li>').attr('role', 'presentation');

        if(options.right === true){
            listElement.addClass('pull-right');
        }

        // link element
        let linkElement = $('<a>').attr('role', 'tab');

        // map icon element
        let mapIconElement = $('<i>', {
            class: config.mapTabIconClass
        });

        // map shared icon element
        let mapSharedIconElement = $('<i>', {
            class: [config.mapTabSharedIconClass, 'fa', 'fa-fw', 'fa-share-alt'].join(' '),
            title: 'shared map'
        });

        // text element
        let textElement = $('<span>', {
            class: config.mapTabLinkTextClass
        });

        let newListElement = listElement.append(
            linkElement.append(mapIconElement).append(textElement).append(mapSharedIconElement)
        );

        tabBar.append( newListElement );

        // update Tab element -> set data
        linkElement.updateTabData(options);

        // tabs content -----------------------------------------------------------------------------------------------
        let contentElement = $('<div>', {
            id: config.mapTabIdPrefix + parseInt( options.id ),
            class: [config.mapTabContentClass].join(' ')
        }).attr('data-mapid', parseInt( options.id ));

        contentElement.addClass('tab-pane');

        tabContent.append(contentElement);

        // init tab ---------------------------------------------------------------------------------------------------
        linkElement.on('click', function(e){
            e.preventDefault();

            // callback function after tab switch
            function switchTabCallback(mapElement, tabLinkElement){
                tabLinkElement.tab('show');
                // unfreeze map
                mapElement.data('frozen', false);
                return false;
            }

            if(mapTabChangeBlocked === false){
                let tabLinkElement = $(this);
                let mapId = tabLinkElement.data('map-id');

                // ignore "add" tab. no need for map change
                if(mapId > 0){
                    let mapElement = $('#' + config.mapTabElementId).getActiveMap();

                    if(mapId !== mapElement.data('id')){
                        // block tabs until switch is done
                        mapTabChangeBlocked = true;

                        // freeze active map -> no user data update while map switch
                        mapElement.data('frozen', true);

                        // hide current map with animation
                        mapElement.visualizeMap('hide', function(){
                            // un-block map tabs
                            mapTabChangeBlocked = switchTabCallback(mapElement, tabLinkElement);
                        });
                    }
                }else{
                    tabLinkElement.tab('show');
                }
            }
        });

        return {
            listElement: newListElement,
            contentElement: contentElement
        };
    };

    /**
     * deletes a map tab for a given map id
     * @param mapId
     */
    $.fn.deleteTab = function(mapId){
        let tabElement = $(this);
        let linkElement = tabElement.find('a[href="#' + config.mapTabIdPrefix + mapId + '"]');
        let deletedTabName = '';

        if(linkElement.length > 0){
            deletedTabName = linkElement.find('.' + config.mapTabLinkTextClass).text();

            let liElement = linkElement.parent();
            let contentElement = tabElement.find('div[id="' + config.mapTabIdPrefix + mapId + '"]');

            let findNewActiveTab = false;
            // check if liElement was active
            if(liElement.hasClass('active')){
                // search any remaining li element and set active
                findNewActiveTab = true;
            }

            liElement.remove();
            contentElement.remove();

            // remove map instance from local cache
            Map.clearMapInstance(mapId);

            if(findNewActiveTab === true){
                tabElement.find('.' + config.mapTabClass + ':not(.pull-right):first a').tab('show');
            }
        }

        return deletedTabName;
    };

    /**
     * clear all active maps
     */
    $.fn.clearMapModule = function(){
        let mapModuleElement = $(this);
        let tabMapElement = $('#' + config.mapTabElementId);

        if(tabMapElement.length > 0){
            let tabElements = mapModuleElement.getMapTabElements();

            for(let i = 0; i < tabElements.length; i++){
                let tabElement = $(tabElements[i]);
                let mapId = tabElement.data('map-id');

                if(mapId > 0){
                    tabMapElement.deleteTab(mapId);
                }
            }
        }
    };

    /**
     * load/update map module into element (all maps)
     * @returns {boolean}
     */
    $.fn.updateMapModule = function(){
        let mapModuleElement = $(this);

        // store current map data global (cache)
        // temp store current map data to prevent data-change while function execution!
        let tempMapData = Util.getCurrentMapData();

        if(tempMapData.length === 0){
            // clear all existing maps
            mapModuleElement.clearMapModule();

            // no map data available -> show "new map" dialog
            $(document).trigger('pf:menuShowMapSettings', {tab: 'new'});

            return true;
        }

        // performance logging (time measurement)
        let logKeyClientMapData = Init.performanceLogging.keyClientMapData;
        Util.timeStart(logKeyClientMapData);

        // check if tabs module is already loaded
        let tabMapElement = $('#' + config.mapTabElementId);

        // check if tabs have changed
        let tabsChanged = false;

        if(tabMapElement.length > 0){
            // tab element already exists
            let tabElements = mapModuleElement.getMapTabElements();

            // map ID that is currently active
            let activeMapId = 0;

            // mapIds that are currently active
            let activeMapIds = [];

            // check whether a tab/map is still active
            for(let i = 0; i < tabElements.length; i++){
                let tabElement = $(tabElements[i]);
                let mapId = tabElement.data('map-id');

                if(mapId > 0){
                    let tabMapData = Util.getCurrentMapData(mapId);

                    if(tabMapData !== false){
                        // map data available ->
                        activeMapIds.push(mapId);

                        // check for map data change and update tab
                        if(tabMapData.config.updated.updated > tabElement.data('updated')){
                            tabElement.updateTabData(tabMapData.config);
                        }
                    }else{
                        // map data not available -> remove tab
                        let deletedTabName = tabMapElement.deleteTab(mapId);

                        tabsChanged = true;

                        if(deletedTabName.length > 0){
                            Util.showNotify({title: 'Map removed', text: deletedTabName + ' deleted', type: 'warning'});
                        }
                    }
                }
            }

            // add new tabs for new maps
            $.each(tempMapData, function(i, data){
                if( activeMapIds.indexOf( data.config.id ) === -1 ){
                    // add new map tab

                    let newTabElements = tabMapElement.addTab(data.config);

                    // check if there is any active map yet (this is not the case
                    // when ALL maps are removed AND new maps are added in one call
                    // e.g. character switch)
                    if(tabMapElement.find('.' + config.mapTabClass + '.active:not(.pull-right)').length === 0){
                        tabMapElement.find('.' + config.mapTabClass + ':not(.pull-right):first a').tab('show');

                        activeMapId = data.config.id;
                    }

                    // set observer for manually triggered map events
                    newTabElements.contentElement.setTabContentObserver();

                    // load all the structure elements for the new tab
                    initContentStructure(newTabElements.contentElement);

                    tabsChanged = true;

                    Util.showNotify({title: 'Map added', text: data.config.name + ' added', type: 'success'});
                }
            });

            // get current active map
            if(activeMapId === 0){
                activeMapId = Util.getMapModule().getActiveMap().data('id');
            }
            let activeMapData = Util.getCurrentMapData(activeMapId);

            if(activeMapData !== false){
                // update active map with new mapData
                let currentTabContentElement = $('#' + config.mapTabIdPrefix + activeMapId);

                $( currentTabContentElement).loadMap( activeMapData, {} );
            }
        }else{
            // create Tab Element
            tabsChanged = true;

            let options = {
                barId: config.mapTabBarId
            };

            tabMapElement = getTabElement(options);

            // add new tab for each map
            for(let j = 0; j < tempMapData.length; j++){
                let data = tempMapData[j];
                tabMapElement.addTab(data.config);
            }

            // add "add" button
            let tabAddOptions = {
                id: 0,
                type: {
                    classTab: MapUtil.getInfoForMap( 'standard', 'classTab')
                },
                icon: 'fa-plus',
                name: 'add',
                right: true
            };

            tabMapElement.addTab(tabAddOptions);

            mapModuleElement.prepend(tabMapElement);

            let currentUserData = Util.getCurrentUserData();
            let promiseStore = MapUtil.getLocaleData('character', currentUserData.character.id);

            promiseStore.then(function(data) {
                // array key where map data is available (0 == first map found)
                let mapDataIndex = 0;
                // tab dom selector
                let mapKeyTabSelector = 'first';

                if(
                    data &&
                    data.defaultMapId
                ){
                    mapDataIndex = Util.getCurrentMapDataIndex(data.defaultMapId);
                    mapKeyTabSelector = 'nth-child(' + ( mapDataIndex + 1 ) + ')';
                }

                // ----------------------------------------------------------------------------------------------------

                // this new created module
                let tabContentElements = tabMapElement.find('.' + config.mapTabContentClass);

                // set observer for manually triggered map events
                tabContentElements.setTabContentObserver();

                // load all the structure elements for ALL Tab Content Body
                initContentStructure(tabContentElements);

                // set first Tab active
                tabMapElement.find('.' + config.mapTabClass + ':' + mapKeyTabSelector + ' a').tab('show');
            });

        }

        if(tabsChanged === true){

            // remove previous event handlers
            let allTabElements = mapModuleElement.getMapTabElements();
            allTabElements.off('show.bs.tab');
            allTabElements.off('shown.bs.tab');
            allTabElements.off('hide.bs.tab');


            // check for "new map" action before tap-change
            allTabElements.on('show.bs.tab', function (e) {
                let mapId = $(e.target).data('map-id');

                if(mapId > 0){
                    // save mapId as new "default" (local storage)
                    let userData = MapUtil.storeDefaultMapId(mapId);
                }else{
                    // add new Tab selected
                    $(document).trigger('pf:menuShowMapSettings', {tab: 'new'});
                    e.preventDefault();
                }
            });

            // load new map right after tab-change
            allTabElements.on('shown.bs.tab', function (e) {
                let mapId = $(e.target).data('map-id');
                let tabMapData = Util.getCurrentMapData(mapId);

                if(tabMapData !== false){
                    // load map
                    let currentTabContentElement = $('#' + config.mapTabIdPrefix + mapId);

                    $( currentTabContentElement).loadMap( tabMapData, {showAnimation: true} );

                    // "wake up" scrollbar for map and get previous state back
                    let scrollableElement = currentTabContentElement.find('.' + config.mapWrapperClass);
                    $(scrollableElement).mCustomScrollbar( 'update');
                }else{
                    // no map data found -> remove tab
                    tabMapElement.deleteTab(mapId);
                }
            });

            allTabElements.on('hide.bs.tab', function (e) {
                let newMapId = $(e.relatedTarget).data('map-id');
                let oldMapId = $(e.target).data('map-id');

                // skip "add button"
                if(newMapId > 0){
                    let currentTabContentElement = $('#' + config.mapTabIdPrefix + oldMapId);

                    // disable scrollbar for map that will be hidden. "freeze" current state
                    let scrollableElement = currentTabContentElement.find('.' + config.mapWrapperClass);
                    $(scrollableElement).mCustomScrollbar( 'disable' );
                }
            });
        }

        // log client map update time
        let duration = Util.timeStop(logKeyClientMapData);
        Util.log(logKeyClientMapData, {duration: duration, type: 'client', description: 'update map'});

        return true;
    };

    /**
     * collect all data (systems/connections) for export/save from each active map in the map module
     * if no change detected -> do not attach map data to return array
     * @returns {Array}
     */
    $.fn.getMapModuleDataForUpdate = function(){
        // get all active map elements for module
        let mapElements = $(this).getMaps();

        let data = [];
        for(let i = 0; i < mapElements.length; i++){
            // get all changed (system / connection) data from this map
            let mapData = $(mapElements[i]).getMapDataFromClient({forceData: false, checkForChange: true});

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

});