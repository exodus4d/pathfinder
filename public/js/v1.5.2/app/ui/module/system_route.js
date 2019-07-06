/**
 * System route module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox',
    'app/map/util'
], ($, Init, Util, bootbox, MapUtil) => {
    'use strict';

    let config = {
        // module info
        modulePosition: 1,
        moduleName: 'systemRoute',
        moduleHeadClass: 'pf-module-head',                                      // class for module header
        moduleHandlerClass: 'pf-module-handler-drag',                           // class for "drag" handler

        // system route module
        moduleTypeClass: 'pf-system-route-module',                              // class for this module

        // headline toolbar
        moduleHeadlineIconClass: 'pf-module-icon-button',                       // class for toolbar icons in the head
        moduleHeadlineIconSearchClass: 'pf-module-icon-button-search',          // class for "search" icon
        moduleHeadlineIconSettingsClass: 'pf-module-icon-button-settings',      // class for "settings" icon
        moduleHeadlineIconRefreshClass: 'pf-module-icon-button-refresh',        // class for "refresh" icon

        systemSecurityClassPrefix: 'pf-system-security-',                       // prefix class for system security level (color)

        // dialog
        routeSettingsDialogId: 'pf-route-settings-dialog',                      // id for route "settings" dialog
        routeDialogId: 'pf-route-dialog',                                       // id for route "search" dialog
        systemDialogSelectClass: 'pf-system-dialog-select',                     // class for system select Element
        systemInfoRoutesTableClass: 'pf-system-route-table',                    // class for route tables

        routeDialogMapSelectId: 'pf-route-dialog-map-select',                   // id for "map" select
        routeDialogSizeSelectId: 'pf-route-dialog-size-select',                 // id for "wh size" select

        dataTableActionCellClass: 'pf-table-action-cell',                       // class for "action" cells
        dataTableRouteCellClass: 'pf-table-route-cell',                         // class for "route" cells
        dataTableJumpCellClass: 'pf-table-jump-cell',                           // class for "route jump" cells

        rallyClass: 'pf-rally',                                                 // class for "rally point" style

        routeCacheTTL: 5                                                        // route cache timer (client) in seconds
    };

    // cache for system routes
    let cache = {
        systemRoutes: {},                                                       // jump information between solar systems
        mapConnections: {}                                                      // connection data read from UI
    };

    /**
     * set cache data
     * @param cacheType
     * @param cacheKey
     * @param data
     */
    let setCacheData = (cacheType, cacheKey, data) => {
        cache[cacheType][cacheKey] = {
            data: data,
            updated: Util.getServerTime().getTime() / 1000
        };
    };

    /**
     * get cache data
     * @param cacheType
     * @param cacheKey
     * @returns {*}
     */
    let getCacheData = (cacheType, cacheKey) => {
        let cachedData = null;
        let currentTimestamp = Util.getServerTime().getTime();

        if(
            cache[cacheType].hasOwnProperty(cacheKey) &&
            Math.round(
                ( currentTimestamp - (new Date( cache[cacheType][cacheKey].updated * 1000).getTime())) / 1000
            ) <= config.routeCacheTTL
        ){
            cachedData = cache[cacheType][cacheKey].data;
        }

        return cachedData;
    };

    let getRouteDataCacheKey = (mapIds, sourceName, targetName) => {
        return [mapIds.join('_'), sourceName.toLowerCase(), targetName.toLowerCase()].join('###');
    };

    /**
     * get a unique cache key name for "source"/"target"-name
     * @param sourceName
     * @param targetName
     * @returns {*}
     */
    let getConnectionDataCacheKey = (sourceName, targetName) => {
        let key = false;
        if(sourceName && targetName){
            // names can be "undefined" in case system is currently on drag/drop
            key = [sourceName.toLowerCase(), targetName.toLowerCase()].sort().join('###');
        }
        return key;
    };

    /**
     * callback function, adds new row to a dataTable with jump information for a route
     * @param context
     * @param routesData
     */
    let callbackAddRouteRows = (context, routesData) => {
        if(routesData.length > 0){
            for(let routeData of routesData){
                // format routeData
                let rowData = formatRouteData(routeData);
                if(rowData.route){
                    // update route cache
                    let cacheKey = getRouteDataCacheKey(rowData.mapIds, routeData.systemFromData.name, routeData.systemToData.name);
                    setCacheData('systemRoutes', cacheKey, rowData);

                    addRow(context, rowData);
                }
            }

            // redraw dataTable
            context.dataTable.draw();
        }
    };

    /**
     * add a new dataTable row to the routes table
     * @param context
     * @param rowData
     * @returns {*}
     */
    let addRow = (context, rowData) => {
        let dataTable = context.dataTable;
        let rowElement = null;
        let row = null;
        let animationStatus = 'changed';

        // search for an existing row (e.g. on mass "table refresh" [all routes])
        // get rowIndex where column 1 (equals to "systemToData.name") matches rowData.systemToData.name
        let indexes = dataTable.rows().eq(0).filter((rowIdx) => {
            return (dataTable.cell(rowIdx, 1).data().name === rowData.systemToData.name);
        });

        if(indexes.length > 0){
            // update row with FIRST index
            // -> systemFrom should be unique!
            row = dataTable.row( parseInt(indexes[0]) );
            // update row data
            row.data(rowData);
        }else{
            // no existing route found -> add new row
            row = dataTable.row.add( rowData );

            animationStatus = 'added';
        }

        if(row.length > 0){
            rowElement = row.nodes().to$();
            rowElement.data('animationStatus', animationStatus);

            rowElement.initTooltips({
                container: 'body'
            });
        }

        return rowElement;
    };

    /**
     * requests route data from eveCentral API and execute callback
     * @param requestData
     * @param context
     * @param callback
     */
    let getRouteData = (requestData, context, callback) => {
        context.moduleElement.showLoadingAnimation();

        $.ajax({
            url: Init.path.searchRoute,
            type: 'POST',
            dataType: 'json',
            data: requestData,
            context: context
        }).done(function(routesData){
            this.moduleElement.hideLoadingAnimation();

            // execute callback
            callback(this, routesData.routesData);
        });
    };

    /**
     * update complete routes table (refresh all)
     * @param moduleElement
     * @param dataTable
     */
    let updateRoutesTable = (moduleElement, dataTable) => {
        let context = {
            moduleElement: moduleElement,
            dataTable: dataTable
        };
        let routeData = [];

        dataTable.rows().every(function(){
            routeData.push(getRouteRequestDataFromRowData(this.data()));
        });

        getRouteData({routeData: routeData}, context, callbackAddRouteRows);
    };

    /**
     * format rowData for route search/update request
     * @param {Object} rowData
     * @returns {Object}
     */
    let getRouteRequestDataFromRowData = rowData => {
        return {
            mapIds: (rowData.hasOwnProperty('mapIds')) ? rowData.mapIds : [],
            systemFromData: (rowData.hasOwnProperty('systemFromData')) ? rowData.systemFromData : {},
            systemToData: (rowData.hasOwnProperty('systemToData')) ? rowData.systemToData : {},
            skipSearch: (rowData.hasOwnProperty('skipSearch')) ? rowData.skipSearch | 0 : 0,
            stargates: (rowData.hasOwnProperty('stargates')) ? rowData.stargates | 0 : 1,
            jumpbridges: (rowData.hasOwnProperty('jumpbridges')) ? rowData.jumpbridges | 0 : 1,
            wormholes: (rowData.hasOwnProperty('wormholes')) ? rowData.wormholes | 0 : 1,
            wormholesReduced: (rowData.hasOwnProperty('wormholesReduced')) ? rowData.wormholesReduced | 0 : 1,
            wormholesCritical: (rowData.hasOwnProperty('wormholesCritical')) ? rowData.wormholesCritical | 0 : 1,
            wormholesEOL: (rowData.hasOwnProperty('wormholesEOL')) ? rowData.wormholesEOL | 0 : 1,
            wormholesSizeMin: (rowData.hasOwnProperty('wormholesSizeMin')) ? rowData.wormholesSizeMin : '',
            excludeTypes: (rowData.hasOwnProperty('excludeTypes')) ? rowData.excludeTypes : [],
            endpointsBubble: (rowData.hasOwnProperty('endpointsBubble')) ? rowData.endpointsBubble | 0 : 1,
            connections: (rowData.hasOwnProperty('connections')) ? rowData.connections.value | 0 : 0,
            flag: (rowData.hasOwnProperty('flag')) ? rowData.flag.value : 'shortest'
        };
    };

    /**
     * show route dialog. User can search for systems and jump-info for each system is added to a data table
     * @param dialogData
     */
    let showFindRouteDialog = (dialogData) => {

        let mapSelectOptions = [];
        let currentMapData = Util.getCurrentMapData();
        if(currentMapData !== false){
            for(let i = 0; i < currentMapData.length; i++){
                mapSelectOptions.push({
                    id: currentMapData[i].config.id,
                    name: currentMapData[i].config.name,
                    selected: (dialogData.mapId === currentMapData[i].config.id)
                });
            }
        }

        let sizeOptions = MapUtil.allConnectionJumpMassTypes().map(type => {
            return {
                id: type,
                name: type,
                selected: false
            };
        });

        let data = {
            id: config.routeDialogId,
            select2Class: Util.config.select2Class,
            selectClass: config.systemDialogSelectClass,
            routeDialogMapSelectId: config.routeDialogMapSelectId,
            routeDialogSizeSelectId: config.routeDialogSizeSelectId,
            systemFromData: dialogData.systemFromData,
            systemToData: dialogData.systemToData,
            mapSelectOptions: mapSelectOptions,
            sizeOptions: sizeOptions
        };

        requirejs(['text!templates/dialog/route.html', 'mustache'], (template, Mustache) => {

            let content = Mustache.render(template, data);

            let findRouteDialog = bootbox.dialog({
                title: 'Route finder',
                message: content,
                show: false,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fas fa-fw fa-search"></i>&nbsp;search route',
                        className: 'btn-primary',
                        callback: function(){
                            // add new route to route table

                            // get form Values
                            let form = $('#' + config.routeDialogId).find('form');

                            let routeDialogData = $(form).getFormValues();

                            // validate form
                            form.validator('validate');

                            // check whether the form is valid
                            let formValid = form.isValidForm();

                            if(formValid === false){
                                // don't close dialog
                                return false;
                            }

                            // get all system data from select2
                            // -> we could also get value from "routeDialogData" var, but we need systemName also
                            let systemSelectData = form.find('.' + config.systemDialogSelectClass).select2('data');

                            if(
                                systemSelectData &&
                                systemSelectData.length === 1
                            ){
                                let context = {
                                    moduleElement: dialogData.moduleElement,
                                    dataTable: dialogData.dataTable
                                };

                                let requestData = {
                                    routeData: [{
                                        mapIds: routeDialogData.mapIds,
                                        systemFromData: dialogData.systemFromData,
                                        systemToData: {
                                            systemId:  parseInt(systemSelectData[0].id),
                                            name: systemSelectData[0].text
                                        },
                                        stargates: routeDialogData.hasOwnProperty('stargates') ? parseInt(routeDialogData.stargates) : 0,
                                        jumpbridges: routeDialogData.hasOwnProperty('jumpbridges') ? parseInt(routeDialogData.jumpbridges) : 0,
                                        wormholes: routeDialogData.hasOwnProperty('wormholes') ? parseInt(routeDialogData.wormholes) : 0,
                                        wormholesReduced: routeDialogData.hasOwnProperty('wormholesReduced') ? parseInt(routeDialogData.wormholesReduced) : 0,
                                        wormholesCritical: routeDialogData.hasOwnProperty('wormholesCritical') ? parseInt(routeDialogData.wormholesCritical) : 0,
                                        wormholesEOL: routeDialogData.hasOwnProperty('wormholesEOL') ? parseInt(routeDialogData.wormholesEOL) : 0,
                                        wormholesSizeMin: routeDialogData.wormholesSizeMin || '',
                                        excludeTypes: getLowerSizeConnectionTypes(routeDialogData.wormholesSizeMin),
                                        endpointsBubble: routeDialogData.hasOwnProperty('endpointsBubble') ? parseInt(routeDialogData.endpointsBubble) : 0
                                    }]
                                };

                                getRouteData(requestData, context, callbackAddRouteRows);
                            }
                        }
                    }
                }
            });

            findRouteDialog.on('show.bs.modal', function(e){
                findRouteDialog.initTooltips();

                // init some dialog/form observer
                setDialogObserver( $(this) );

                // init map select ------------------------------------------------------------------------------------
                let mapSelect = findRouteDialog.find('#' + config.routeDialogMapSelectId);
                mapSelect.initMapSelect();

                // init connection jump size select -------------------------------------------------------------------
                findRouteDialog.find('#' + config.routeDialogSizeSelectId).initConnectionSizeSelect();
            });


            findRouteDialog.on('shown.bs.modal', function(e){

                // init system select live  search --------------------------------------------------------------------
                // -> add some delay until modal transition has finished
                let systemTargetSelect = $(this).find('.' + config.systemDialogSelectClass);
                systemTargetSelect.delay(240).initSystemSelect({key: 'id'});
            });

            // show dialog
            findRouteDialog.modal('show');
        });
    };

    /**
     * draw route table
     * @param  mapId
     * @param moduleElement
     * @param systemFromData
     * @param routesTable
     * @param systemsToData
     */
    let drawRouteTable = (mapId, moduleElement, systemFromData, routesTable, systemsToData) => {
        let requestRouteData = [];

        // Skip some routes from search
        // -> this should help to throttle requests (heavy CPU load for route calculation)
        let defaultRoutesCount = Init.routeSearch.defaultCount;
        let rowElements = [];

        for(let systemToData of systemsToData){
            if(systemFromData.name !== systemToData.name){
                // check for cached rowData
                let cacheKey = getRouteDataCacheKey([mapId], systemFromData.name, systemToData.name);
                let rowData = getCacheData('systemRoutes', cacheKey);
                if(rowData){
                    // route data is cached (client side)
                    let context = {
                        dataTable: routesTable
                    };

                    rowElements.push( addRow(context, rowData) );
                }else{
                    // get route data -> ajax
                    let searchData = {
                        mapIds: [mapId],
                        systemFromData: systemFromData,
                        systemToData: systemToData,
                        skipSearch: requestRouteData.length >= defaultRoutesCount
                    };

                    requestRouteData.push(getRouteRequestDataFromRowData(searchData));
                }
            }
        }

        // rows added from cache -> redraw() table
        if(rowElements.length){
            routesTable.draw();
        }

        // check if routes data is not cached and is requested
        if(requestRouteData.length > 0){
            let contextData = {
                moduleElement: moduleElement,
                dataTable: routesTable
            };

            let requestData = {
                routeData: requestRouteData
            };

            getRouteData(requestData, contextData, callbackAddRouteRows);
        }
    };

    /**
     * show route settings dialog
     * @param dialogData
     * @param moduleElement
     * @param systemFromData
     * @param routesTable
     */
    let showSettingsDialog = (dialogData, moduleElement, systemFromData, routesTable) => {

        let promiseStore = MapUtil.getLocaleData('map', dialogData.mapId);
        promiseStore.then(dataStore => {
            // selected systems (if already stored)
            let systemSelectOptions = [];
            if(
                dataStore &&
                dataStore.routes
            ){
                systemSelectOptions = dataStore.routes;
            }

            // max count of "default" target systems
            let maxSelectionLength = Init.routeSearch.maxDefaultCount;

            let data = {
                id: config.routeSettingsDialogId,
                selectClass: config.systemDialogSelectClass,
                systemSelectOptions: systemSelectOptions,
                maxSelectionLength: maxSelectionLength
            };

            requirejs(['text!templates/dialog/route_settings.html', 'mustache'], (template, Mustache) => {
                let content = Mustache.render(template, data);

                let settingsDialog = bootbox.dialog({
                    title: 'Route settings',
                    message: content,
                    show: false,
                    buttons: {
                        close: {
                            label: 'cancel',
                            className: 'btn-default'
                        },
                        success: {
                            label: '<i class="fas fa-fw fa-check"></i>&nbsp;save',
                            className: 'btn-success',
                            callback: function(){
                                let form = this.find('form');
                                // get all system data from select2
                                let systemSelectData = form.find('.' + config.systemDialogSelectClass).select2('data');
                                let systemsTo = [];

                                if( systemSelectData.length > 0 ){
                                    systemsTo = formSystemSelectData(systemSelectData);
                                    MapUtil.storeLocalData('map', dialogData.mapId, 'routes', systemsTo);
                                }else{
                                    MapUtil.deleteLocalData('map', dialogData.mapId, 'routes');
                                }

                                Util.showNotify({title: 'Route settings stored', type: 'success'});

                                // (re) draw table
                                drawRouteTable(dialogData.mapId, moduleElement, systemFromData, routesTable, systemsTo);
                            }
                        }
                    }
                });

                settingsDialog.on('shown.bs.modal', function(e){

                    // init default system select ---------------------------------------------------------------------
                    // -> add some delay until modal transition has finished
                    let systemTargetSelect = $(this).find('.' + config.systemDialogSelectClass);
                    systemTargetSelect.delay(240).initSystemSelect({key: 'id', maxSelectionLength: maxSelectionLength});
                });

                // show dialog
                settingsDialog.modal('show');
            });
        });
    };

    /**
     * format select2 system data
     * @param {Array} data
     * @returns {Array}
     */
    let formSystemSelectData = (data) => {
        let formattedData = [];
        for(let i = 0; i < data.length; i++){
            let tmpData = data[i];

            formattedData.push({
                systemId: parseInt(tmpData.id),
                name: tmpData.text
            });
        }

        return formattedData;
    };

    /**
     * set event observer for route finder dialog
     * @param routeDialog
     */
    let setDialogObserver = (routeDialog) => {
        let wormholeCheckbox = routeDialog.find('input[type="checkbox"][name="wormholes"]');
        let wormholeReducedCheckbox = routeDialog.find('input[type="checkbox"][name="wormholesReduced"]');
        let wormholeCriticalCheckbox = routeDialog.find('input[type="checkbox"][name="wormholesCritical"]');
        let wormholeEolCheckbox = routeDialog.find('input[type="checkbox"][name="wormholesEOL"]');
        let wormholeSizeSelect = routeDialog.find('#' + config.routeDialogSizeSelectId);

        // store current "checked" state for each box ---------------------------------------------
        let storeCheckboxStatus = function(){
            wormholeReducedCheckbox.data('selectState', wormholeReducedCheckbox.prop('checked'));
            wormholeCriticalCheckbox.data('selectState', wormholeCriticalCheckbox.prop('checked'));
            wormholeEolCheckbox.data('selectState', wormholeEolCheckbox.prop('checked'));
        };

        // on wormhole checkbox change ------------------------------------------------------------
        let onWormholeCheckboxChange = function(){

            if( $(this).is(':checked') ){
                wormholeSizeSelect.prop('disabled', false);

                wormholeReducedCheckbox.prop('disabled', false);
                wormholeCriticalCheckbox.prop('disabled', false);
                wormholeEolCheckbox.prop('disabled', false);

                wormholeReducedCheckbox.prop('checked', wormholeReducedCheckbox.data('selectState'));
                wormholeCriticalCheckbox.prop('checked', wormholeCriticalCheckbox.data('selectState'));
                wormholeEolCheckbox.prop('checked', wormholeEolCheckbox.data('selectState'));
            }else{
                wormholeSizeSelect.prop('disabled', true);

                storeCheckboxStatus();

                wormholeReducedCheckbox.prop('checked', false);
                wormholeReducedCheckbox.prop('disabled', true);
                wormholeCriticalCheckbox.prop('checked', false);
                wormholeCriticalCheckbox.prop('disabled', true);
                wormholeEolCheckbox.prop('checked', false);
                wormholeEolCheckbox.prop('disabled', true);
            }
        }.bind(wormholeCheckbox);

        wormholeCheckbox.on('change', onWormholeCheckboxChange);

        // initial checkbox check
        storeCheckboxStatus();
        onWormholeCheckboxChange();
    };

    /**
     * get a connectionsData object that holds all connections for given mapIds (used as cache for route search)
     * @param mapIds
     * @returns {{}}
     */
    let getConnectionsDataFromMaps = (mapIds) => {
        let connectionsData = {};
        for(let mapId of mapIds){
            let map = MapUtil.getMapInstance(mapId);
            if(map){
                let cacheKey = 'map_' + mapId;
                let mapConnectionsData = getCacheData('mapConnections', cacheKey);

                if(!mapConnectionsData){
                    mapConnectionsData = {};
                    let connections = map.getAllConnections();
                    if(connections.length){
                        let connectionsData = MapUtil.getDataByConnections(connections);
                        for(let connectionData of connectionsData){
                            let connectionDataCacheKey = getConnectionDataCacheKey(connectionData.sourceName, connectionData.targetName);

                            // skip double connections between same systems
                            if( !mapConnectionsData.hasOwnProperty(connectionDataCacheKey) ){
                                mapConnectionsData[connectionDataCacheKey] = {
                                    map: {
                                        id: mapId
                                    },
                                    connection: {
                                        id: connectionData.id,
                                        type: connectionData.type,
                                        scope: connectionData.scope
                                    },
                                    source: {
                                        id: connectionData.source,
                                        name: connectionData.sourceName,
                                        alias: connectionData.sourceAlias
                                    },
                                    target: {
                                        id: connectionData.target,
                                        name: connectionData.targetName,
                                        alias: connectionData.targetAlias
                                    }
                                };
                            }
                        }
                    }

                    // update cache
                    setCacheData('mapConnections', cacheKey, mapConnectionsData);
                }

                if(connectionsData !== null){
                    connectionsData = Object.assign({}, mapConnectionsData, connectionsData);
                }
            }
        }

        return connectionsData;
    };

    /**
     * search for a specific connection by "source"/"target"-name inside connectionsData cache
     * @param connectionsData
     * @param sourceName
     * @param targetName
     * @returns {{}}
     */
    let findConnectionsData = (connectionsData, sourceName, targetName) => {
        let connectionDataCacheKey = getConnectionDataCacheKey(sourceName, targetName);
        return connectionsData.hasOwnProperty(connectionDataCacheKey) ?
            connectionsData[connectionDataCacheKey] : {};
    };

    /**
     * get stargate connection data (default connection type in case connection was not found on a map)
     * @param sourceRouteNodeData
     * @param targetRouteNodeData
     * @returns {{connection: {id: number, type: string[], scope: string}, source: {id: number, name, alias}, target: {id: number, name, alias}}}
     */
    let getStargateConnectionData = (sourceRouteNodeData, targetRouteNodeData) => {
        return {
            connection: {
                id: 0,
                type: ['stargate'],
                scope: 'stargate'
            },
            source: {
                id: 0,
                name: sourceRouteNodeData.system,
                alias: sourceRouteNodeData.system
            },
            target: {
                id: 0,
                name: targetRouteNodeData.system,
                alias: targetRouteNodeData.system
            }
        };
    };

    /**
     * get fake connection Element
     * @param connectionData
     * @returns {string}
     */
    let getFakeConnectionElement = (connectionData) => {
        let mapId = Util.getObjVal(connectionData, 'map.id') | 0;
        let connectionId = Util.getObjVal(connectionData, 'connection.id') | 0;
        let scope = Util.getObjVal(connectionData, 'connection.scope');
        let classes = MapUtil.getConnectionFakeClassesByTypes(connectionData.connection.type);
        let disabled = !mapId || !connectionId;

        let connectionElement = '<div data-mapId="' + mapId + '" data-connectionId="' + connectionId + '" ';
        connectionElement += (disabled ? 'data-disabled' : '');
        connectionElement += ' class="' + classes.join(' ') + '" ';
        connectionElement += ' title="' + scope + '" data-placement="bottom"></div>';
        return connectionElement;
    };

    /**
     * format route data from API request into dataTable row format
     * @param routeData
     * @returns {{}}
     */
    let formatRouteData = (routeData) => {

        /**
         * get status icon for route
         * @param status
         * @returns {string}
         */
        let getStatusIcon= (status) => {
            let color = 'txt-color-danger';
            let title = 'route not found';
            switch(status){
                case 1:
                    color = 'txt-color-success';
                    title = 'route exists';
                    break;
                case 2:
                    color = 'txt-color-warning';
                    title = 'not search performed';
                    break;
            }

            return '<i class="fas fa-fw fa-circle txt-color ' + color + '" title="' + title + '"></i>';
        };

        // route status:
        // 0: not found
        // 1: round (OK)
        // 2: not searched
        let routeStatus = routeData.skipSearch ? 2 : 0;

        // button class for flag (e.g. "secure" routes)
        let flagButtonClass = routeData.flag === 'secure' ? 'txt-color-success' : '';

        let connectionButton = '<i class="fas ' + ['fa-code-branch', 'fa-rotate-270', 'txt-color'].join(' ') + '"></i>';
        let flagButton = '<i class="fas ' + ['fa-shield-alt', 'txt-color', flagButtonClass].join(' ') + '"></i>';
        let reloadButton = '<i class="fas ' + ['fa-sync'].join(' ') + '"></i>';
        let searchButton = '<i class="fas ' + ['fa-search'].join(' ') + '"></i>';
        let deleteButton = '<i class="fas ' + ['fa-times', 'txt-color', 'txt-color-redDarker'].join(' ') + '"></i>';

        // default row data (e.g. no route found)
        let tableRowData = {
            systemFromData:  routeData.systemFromData,
            systemToData:  routeData.systemToData,
            jumps: {
                value: 9999, // for sorting
                formatted: ''
            },
            avgTrueSec: {
                value: '',
                formatted: ''
            },
            route: {
              value: routeStatus === 2 ? 'search now' : 'not found',
              data: routeData.route
            },
            stargates: routeData.stargates,
            jumpbridges: routeData.jumpbridges,
            wormholes: routeData.wormholes,
            wormholesReduced: routeData.wormholesReduced,
            wormholesCritical: routeData.wormholesCritical,
            wormholesEOL: routeData.wormholesEOL,
            wormholesSizeMin: routeData.wormholesSizeMin,
            excludeTypes: routeData.excludeTypes,
            endpointsBubble: routeData.endpointsBubble,
            connections: {
                value: 0,
                button: connectionButton
            },
            flag: {
                value: routeData.flag,
                button: flagButton
            },
            reload: {
                button: routeData.skipSearch ? searchButton : reloadButton
            },
            clear: {
                button: deleteButton
            },
            maps: routeData.maps,
            mapIds: routeData.mapIds //map data (mapIds is "redundant")
        };

        if(
            routeData.routePossible === true &&
            routeData.route.length > 0
        ){
            // route data available
            routeStatus = 1;

            // add route Data
            let routeJumpElements = [];
            let avgSecTemp = 0;

            let connectionsData = getConnectionsDataFromMaps(routeData.mapIds);
            let prevRouteNodeData = null;
            // loop all systems on this route
            for(let i = 0; i < routeData.route.length; i++){
                let routeNodeData = routeData.route[i];
                let systemName = routeNodeData.system;

                // fake connection elements between systems -----------------------------------------------------------
                if(prevRouteNodeData){
                    let connectionData = findConnectionsData(connectionsData, prevRouteNodeData.system, systemName);
                    if(!connectionData.hasOwnProperty('connection')){
                        connectionData = getStargateConnectionData(prevRouteNodeData, routeNodeData);
                    }
                    let connectionElement = getFakeConnectionElement(connectionData);

                    routeJumpElements.push( connectionElement );
                }

                // system elements ------------------------------------------------------------------------------------
                let systemSec = Number(routeNodeData.security).toFixed(1).toString();
                let tempSystemSec = systemSec;

                if(tempSystemSec <= 0){
                    tempSystemSec = '0-0';
                }

                let systemSecClass = config.systemSecurityClassPrefix + tempSystemSec.replace('.', '-');

                // check for wormhole
                let icon = 'fas fa-square';
                if( /^J\d+$/.test(systemName) ){
                    icon = 'fas fa-dot-circle';
                }

                let system = '<i class="' + icon + ' ' + systemSecClass + '" ';
                system += 'data-toggle="tooltip" data-placement="bottom" data-container="body" ';
                system += 'title="' + systemName + ' [' + systemSec + '] "></i>';
                routeJumpElements.push( system );

                // "source" system is not relevant for average security
                if(i > 0){
                    avgSecTemp += Number(routeNodeData.security);
                }

                prevRouteNodeData = routeNodeData;
            }

            let avgSec = ( avgSecTemp /  (routeData.route.length - 1)).toFixed(2);
            let avgSecForClass = Number(avgSec).toFixed(1);

            if(avgSecForClass <= 0){
                avgSecForClass = '0.0';
            }

            let avgSecClass = config.systemSecurityClassPrefix + avgSecForClass.toString().replace('.', '-');

            tableRowData.jumps = {
                value: routeData.routeJumps,
                formatted: routeData.routeJumps
            };

            tableRowData.avgTrueSec = {
                value: avgSec,
                formatted: '<span class="' + avgSecClass + '">' + avgSec + '</span>'
            };

            tableRowData.route.value = routeJumpElements.join(' ');
        }

        // route status data ------------------------------------------------------------------------------------------
        tableRowData.status = {
            value: routeStatus,
            formatted: getStatusIcon(routeStatus)
        };

        return tableRowData;
    };

    /**
     * get module element
     * @param parentElement
     * @param mapId
     * @param systemData
     * @returns {jQuery}
     */
    let getModule = (parentElement, mapId, systemData) => {
        let moduleElement = $('<div>').append(
            $('<div>', {
                class: config.moduleHeadClass
            }).append(
                $('<h5>', {
                    class: config.moduleHandlerClass
                }),
                $('<h5>', {
                    class: 'pull-right'
                }).append(
                    $('<i>', {
                        class: ['fas', 'fa-fw', 'fa-sliders-h', config.moduleHeadlineIconClass, config.moduleHeadlineIconSettingsClass].join(' '),
                        title: 'settings'
                    }).attr('data-html', 'true').attr('data-toggle', 'tooltip'),
                    $('<i>', {
                        class: ['fas', 'fa-fw', 'fa-search', config.moduleHeadlineIconClass, config.moduleHeadlineIconSearchClass].join(' '),
                        title: 'find&nbsp;route'
                    }).attr('data-html', 'true').attr('data-toggle', 'tooltip'),
                    $('<i>', {
                        class: ['fas', 'fa-fw', 'fa-sync', config.moduleHeadlineIconClass, config.moduleHeadlineIconRefreshClass].join(' '),
                        title: 'refresh&nbsp;all'
                    }).attr('data-html', 'true').attr('data-toggle', 'tooltip')
                ),
                $('<h5>', {
                    text: 'Routes'
                })
            )
        );

        // save systemFromData to module (data never changes during module lifetime)
        // -> we need this later in updateModule()
        let systemFromData = {
            systemId: systemData.systemId,
            name: systemData.name,
        };

        moduleElement.data('systemFromData', systemFromData);

        let table = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border', config.systemInfoRoutesTableClass].join(' ')
        });
        moduleElement.append(table);

        // init empty table
        let routesTable = table.dataTable( {
            paging: false,
            ordering: true,
            order: [[ 2, 'asc' ], [ 0, 'asc' ]],
            info: false,
            searching: false,
            hover: false,
            autoWidth: false,
            rowId: 'systemTo',
            language: {
                emptyTable: 'No routes added'
            },
            columnDefs: [
                {
                    targets: 0,
                    orderable: true,
                    title: '',
                    width: 2,
                    class: ['text-center'].join(' '),
                    data: 'status',
                    render: {
                        _: 'formatted',
                        sort: 'value'
                    }
                },{
                    targets: 1,
                    orderable: true,
                    title: 'system&nbsp;&nbsp;&nbsp;',
                    class: Util.config.popoverTriggerClass,
                    data: 'systemToData',
                    render: {
                        _: 'name',
                        sort: 'name'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        // init context menu
                        $(cell).initSystemPopover({
                            systemToData: rowData.systemToData
                        });

                        $(cell).toggleClass(config.rallyClass, cellData.hasOwnProperty('rally'));
                    }
                },{
                    targets: 2,
                    orderable: true,
                    title: '<span title="jumps" data-toggle="tooltip"><i class="fas fa-arrows-alt-h"></i>&nbsp;&nbsp;</span>',
                    width: 16,
                    class: 'text-right',
                    data: 'jumps',
                    render: {
                        _: 'formatted',
                        sort: 'value'
                    }
                },{
                    targets: 3,
                    orderable: true,
                    title: '<span title="average security" data-toggle="tooltip">&#216;&nbsp;&nbsp;</span>',
                    width: 14,
                    class: 'text-right',
                    data: 'avgTrueSec',
                    render: {
                        _: 'formatted',
                        sort: 'value'
                    }
                },{
                    targets: 4,
                    orderable: false,
                    title: 'route',
                    class: [config.dataTableRouteCellClass].join(' '),
                    data: 'route',
                    render: {
                        _: 'value'
                    }
                },{
                    targets: 5,
                    title: '<i title="toggle connections" data-toggle="tooltip" class="fas fa-code-branch fa-rotate-270 text-right"></i>',
                    orderable: false,
                    searchable: false,
                    width: 10,
                    class: ['text-center', config.dataTableActionCellClass].join(' '),
                    data: 'connections',
                    render: {
                        _: 'button'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tempTableApi = this.api();

                        $(cell).on('click', function(e){
                            let routeCellElement = tempTableApi.cell( rowIndex, 4 ).nodes().to$();

                            if(routeCellElement.hasClass(config.dataTableJumpCellClass)){
                                routeCellElement.toggleClass(config.dataTableJumpCellClass, false);
                                $(this).find('i').toggleClass('txt-color-orange', false);
                            }else{
                                routeCellElement.toggleClass(config.dataTableJumpCellClass, true);
                                $(this).find('i').toggleClass('txt-color-orange', true);
                            }
                        });
                    }
                },{
                    targets: 6,
                    title: '<i title="search safer route (HS)" data-toggle="tooltip" class="fas fa-shield-alt text-right"></i>',
                    orderable: false,
                    searchable: false,
                    width: 10,
                    class: ['text-center', config.dataTableActionCellClass].join(' '),
                    data: 'flag',
                    render: {
                        _: 'button'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tempTableApi = this.api();

                        $(cell).on('click', function(e){
                            // get current row data (important!)
                            // -> "rowData" param is not current state, values are "on createCell()" state
                            rowData = tempTableApi.row( $(cell).parents('tr')).data();
                            let routeData = getRouteRequestDataFromRowData( rowData );

                            // overwrite some params
                            routeData.skipSearch = 0;
                            routeData.flag = routeData.flag === 'shortest' ? 'secure' : 'shortest'; // toggle

                            let context = {
                                moduleElement: moduleElement,
                                dataTable: tempTableApi
                            };

                            let requestData = {
                                routeData: [routeData]
                            };

                            getRouteData(requestData, context, callbackAddRouteRows);
                        });
                    }
                },{
                    targets: 7,
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: 10,
                    class: ['text-center', config.dataTableActionCellClass].join(' '),
                    data: 'reload',
                    render: {
                        _: 'button'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tempTableApi = this.api();

                        $(cell).on('click', function(e){
                            // get current row data (important!)
                            // -> "rowData" param is not current state, values are "on createCell()" state
                            rowData = tempTableApi.row( $(cell).parents('tr')).data();
                            let routeData = getRouteRequestDataFromRowData( rowData );

                            // overwrite some params
                            routeData.skipSearch = 0;

                            let context = {
                                moduleElement: moduleElement,
                                dataTable: tempTableApi
                            };

                            let requestData = {
                                routeData: [routeData]
                            };

                            getRouteData(requestData, context, callbackAddRouteRows);
                        });
                    }
                },{
                    targets: 8,
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: 10,
                    class: ['text-center', config.dataTableActionCellClass].join(' '),
                    data: 'clear',
                    render: {
                        _: 'button'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tempTableElement = this;

                        let confirmationSettings = {
                            container: 'body',
                            placement: 'left',
                            btnCancelClass: 'btn btn-sm btn-default',
                            btnCancelLabel: 'cancel',
                            btnCancelIcon: 'fas fa-fw fa-ban',
                            title: 'delete route',
                            btnOkClass: 'btn btn-sm btn-danger',
                            btnOkLabel: 'delete',
                            btnOkIcon: 'fas fa-fw fa-times',
                            onConfirm : function(e, target){
                                let deleteRowElement = $(cell).parents('tr');
                                tempTableElement.api().rows(deleteRowElement).remove().draw();
                            }
                        };

                        // init confirmation dialog
                        $(cell).confirmation(confirmationSettings);
                    }
                }
            ],
            drawCallback: function(settings){

                let animationRows = this.api().rows().nodes().to$().filter(function(){
                    return (
                        $(this).data('animationStatus') ||
                        $(this).data('animationTimer')
                    );
                });

                for(let i = 0; i < animationRows.length; i++){
                    let animationRow = $(animationRows[i]);
                    animationRow.pulseBackgroundColor(animationRow.data('animationStatus'));
                    animationRow.removeData('animationStatus');
                }
            },
            initComplete: function(settings, json){
                // click on "fake connection" -------------------------------------------------------------------------
                $(this).on('click', '.pf-fake-connection', function(){
                    let fakeConnectionElement = $(this);
                    let mapId = fakeConnectionElement.attr('data-mapId');
                    let connectionId = fakeConnectionElement.attr('data-connectionId');
                    let connection = $().getConnectionById(mapId, connectionId);

                    if(connection){
                        let map = connection._jsPlumb.instance;
                         MapUtil.showConnectionInfo(map, [connection]);
                    }
                });
            },
            data: [] // will be added dynamic
        });

        // init tooltips for this module
        let tooltipElements = moduleElement.find('[data-toggle="tooltip"]');
        tooltipElements.tooltip({
            container: 'body'
        });

        return moduleElement;
    };


    /**
     * init system popover (e.g. for setWaypoints)
     * @param options
     */
    $.fn.initSystemPopover = function(options){
        let elements = $(this);
        let eventNamespace = 'hideSystemPopup';
        let systemToData = options.systemToData;

        requirejs(['text!templates/tooltip/system_popover.html', 'mustache'], function(template, Mustache){
            let data = {
                systemToData: systemToData
            };

            let content = Mustache.render(template, data);

            elements.each(function(){
                let element = $(this);
                // destroy "popover" and remove "click" event for animation
                element.popover('destroy').off();

                // init popover and add specific class to it (for styling)
                element.popover({
                    html: true,
                    title: systemToData.name,
                    trigger: 'manual',
                    placement: 'top',
                    container: 'body',
                    content: content
                }).data('bs.popover').tip().addClass('pf-popover');
            });

            // set popup "close" observer
            elements.initPopoverClose(eventNamespace);

            // set "open" trigger on "right click"
            // -> this is not supported by the "trigger" param in .popover();
            // -> therefore we need to set it up manually
            elements.on('contextmenu', function(e){
                e.preventDefault();
               $(this).popover('show');
            });

            // set link observer "on shown" event
            elements.on('shown.bs.popover', function(){
                let popoverRoot = $(this);

                popoverRoot.data('bs.popover').tip().find('a').on('click', function(){
                    // hint: "data" attributes should be in lower case!
                    let systemData = {
                        systemId: $(this).data('systemid'),
                        name: $(this).data('name')
                    };
                    Util.setDestination(systemData, 'set_destination');

                    // close popover
                    popoverRoot.popover('hide');
                });
            });
        });
    };

    /**
     * get data from all Rally Point systems
     * @param mapId
     * @returns {Array}
     */
    let getRallySystemsData = (mapId) => {
        let systemsRallyData = [];
        let map = MapUtil.getMapInstance(mapId);
        if(map){
            let mapContainer = $(map.getContainer());
            let systems = mapContainer.find('.pf-system-info-rally');

            for(let system of systems){
                system = $(system);
                systemsRallyData.push({
                    systemId: system.data('systemId'),
                    name: system.data('name'),
                    rally: 1
                });
            }
        }

        return systemsRallyData;
    };

    /**
     * update trigger function for this module
     * @param moduleElement
     * @param data
     */
    let updateModule = (moduleElement, data) => {
        let routesTableElement =  moduleElement.find('.' + config.systemInfoRoutesTableClass);
        let routesTable = routesTableElement.DataTable();

        switch(data.task){
            case 'showFindRouteDialog':
                let dialogData = {
                    moduleElement: moduleElement,
                    mapId: data.mapId,
                    systemFromData: moduleElement.data('systemFromData'),
                    systemToData: data.systemToData,
                    dataTable: routesTable
                };

                showFindRouteDialog(dialogData);
                break;
            case 'findRoute':
                drawRouteTable(data.mapId, moduleElement, moduleElement.data('systemFromData'), routesTable, [data.systemToData]);
                break;
        }
    };

    /**
     * init route module
     * -> request route path fore "default" trade hub systems
     * @param moduleElement
     * @param mapId
     * @param systemData
     */
    let initModule = (moduleElement, mapId, systemData) => {

        let systemFromData = {
            systemId: systemData.systemId,
            name: systemData.name
        };

        let routesTableElement =  moduleElement.find('.' + config.systemInfoRoutesTableClass);
        let routesTable = routesTableElement.DataTable();

        // init refresh routes ----------------------------------------------------------------------------------------
        moduleElement.find('.' + config.moduleHeadlineIconRefreshClass).on('click', function(e){
            updateRoutesTable(moduleElement, routesTable);
        });

        // init search routes dialog ----------------------------------------------------------------------------------
        moduleElement.find('.' + config.moduleHeadlineIconSearchClass).on('click', function(e){
            let maxRouteSearchLimit = this.Init.routeSearch.limit;

            if(routesTable.rows().count() >= maxRouteSearchLimit){
                // max routes limit reached -> show warning
                Util.showNotify({title: 'Route limit reached', text: 'Search is limited by ' + maxRouteSearchLimit, type: 'warning'});
            }else{
                let dialogData = {
                    moduleElement: moduleElement,
                    mapId: mapId,
                    systemFromData: systemFromData,
                    dataTable: routesTable
                };

                showFindRouteDialog(dialogData);
            }
        }.bind({
            Init: Init
        }));

        // init settings dialog ---------------------------------------------------------------------------------------
        moduleElement.find('.' + config.moduleHeadlineIconSettingsClass).on('click', function(e){
            let dialogData = {
                mapId: mapId
            };

            showSettingsDialog(dialogData, moduleElement, systemFromData, routesTable);
        });

        // fill routesTable with data --------------------------------------------------------------------------------
        let promiseStore = MapUtil.getLocaleData('map', mapId);
        promiseStore.then(function(dataStore){
            // selected systems (if already stored)
            let systemsTo = [{
                systemId: 30000142,
                name: 'Jita'
            }];

            if(
                dataStore &&
                dataStore.routes
            ){
                systemsTo = dataStore.routes;
            }

            // add "Rally Point" systems to table
            let systemsToData = getRallySystemsData(mapId);
            systemsToData.push(...systemsTo);

            drawRouteTable(mapId, moduleElement, systemFromData, routesTable, systemsToData);
        });
    };

    /**
     * before module destroy callback
     * @param moduleElement
     */
    let beforeDestroy = moduleElement => {
        let routeTableElement = moduleElement.find('.' + config.systemInfoRoutesTableClass);
        let tableApi = routeTableElement.DataTable();
        tableApi.destroy();
    };

    /**
     * get all jump mass related connection types that have a lower "jumpMassMin" than connectionType
     * @param connectionType
     * @returns {Array}
     */
    let getLowerSizeConnectionTypes = connectionType => {
        let lowerSizeTypes = [];
        let jumpMassMin = Util.getObjVal(Init.wormholeSizes, connectionType + '.jumpMassMin') || 0;

        if(jumpMassMin){
            for(let [type, data] of Object.entries(Init.wormholeSizes)){
                if(data.jumpMassMin < jumpMassMin){
                    lowerSizeTypes.push(type);
                }
            }
        }

        return lowerSizeTypes;
    };

    return {
        config: config,
        getModule: getModule,
        initModule: initModule,
        updateModule: updateModule,
        beforeDestroy: beforeDestroy
    };

});