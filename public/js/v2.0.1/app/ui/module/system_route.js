/**
 * System route module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox',
    'app/map/util',
    'module/base'
], ($, Init, Util, bootbox, MapUtil, BaseModule) => {
    'use strict';

    let SystemRouteModule = class SystemRouteModule extends BaseModule {
        constructor(config = {}) {
            super(Object.assign({}, new.target.defaultConfig, config));
        }

        /**
         * update module
         * @param payload
         * @returns {Promise}
         */
        update(payload){
            return super.update(payload).then(payload => new Promise(resolve => {
                switch(payload.task){
                    case 'showFindRouteDialog':
                        this.showFindRouteDialog({
                            mapId: this._systemData.mapId,
                            systemFromData: this._systemFromData,
                            systemToData: payload.systemToData
                        });
                        break;
                    case 'findRoute':
                        this.drawRouteTable(this._systemData.mapId, this._systemFromData, [payload.systemToData], this._routeSettings);
                        break;
                }

                resolve({
                    action: 'update',
                    data: {
                        module: this
                    }
                });
            }));
        }

        /**
         * render module
         * @param mapId
         * @param systemData
         * @returns {HTMLElement}
         */
        render(mapId, systemData){
            this._systemData = systemData;

            // save systemFromData to module (data never changes during module lifetime)
            // -> we need this later in updateModule()
            this._systemFromData = {
                systemId: systemData.systemId,
                name: systemData.name,
            };

            this._bodyEl = Object.assign(document.createElement('div'), {
                className: this._config.bodyClassName
            });
            this.moduleElement.append(this._bodyEl);

            this.initRouteTable();

            this.setModuleObserver();

            return this.moduleElement;
        }

        /**
         * set module observer
         */
        setModuleObserver(){
            // init tooltips
            $(this.moduleElement).initTooltips({
                placement: 'top'
            });
        }

        /**
         * init new route dataTable
         */
        initRouteTable(){
            let module = this;

            let tableEl = document.createElement('table');
            tableEl.classList.add('compact', 'stripe', 'order-column', 'row-border', module._config.systemInfoRoutesTableClass);
            this._bodyEl.append(tableEl);

            this._tableApi = $(tableEl).DataTable( {
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
                            module.initSystemPopover($(cell),{
                                systemToData: rowData.systemToData
                            });

                            $(cell).toggleClass(module._config.rallyClass, cellData.hasOwnProperty('rally'));
                        }
                    },{
                        targets: 2,
                        orderable: true,
                        title: '<span title="jumps"><i class="fas fa-arrows-alt-h"></i>&nbsp;&nbsp;</span>',
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
                        title: '<span title="average security">&#216;&nbsp;&nbsp;</span>',
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
                        class: [this._config.dataTableRouteCellClass].join(' '),
                        data: 'route',
                        render: {
                            _: 'value'
                        }
                    },{
                        targets: 5,
                        title: '<i title="toggle connections" class="fas fa-code-branch fa-rotate-270 text-right"></i>',
                        orderable: false,
                        searchable: false,
                        width: 10,
                        class: ['text-center', this._config.dataTableActionCellClass].join(' '),
                        data: 'connections',
                        render: {
                            _: 'button'
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            $(cell).on('click', function(e){
                                let routeCellElement = tableApi.cell( rowIndex, 4 ).nodes().to$();

                                if(routeCellElement.hasClass(module._config.dataTableJumpCellClass)){
                                    routeCellElement.toggleClass(module._config.dataTableJumpCellClass, false);
                                    $(this).find('i').toggleClass('txt-color-orange', false);
                                }else{
                                    routeCellElement.toggleClass(module._config.dataTableJumpCellClass, true);
                                    $(this).find('i').toggleClass('txt-color-orange', true);
                                }
                            });
                        }
                    },{
                        targets: 6,
                        title: '<i title="search safer (HS)" class="fas fa-shield-alt text-right"></i>',
                        orderable: false,
                        searchable: false,
                        width: 10,
                        class: ['text-center', this._config.dataTableActionCellClass].join(' '),
                        data: 'flag',
                        render: {
                            _: 'button'
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            $(cell).on('click', function(e){
                                // get current row data (important!)
                                // -> "rowData" param is not current state, values are "on createCell()" state
                                rowData = tableApi.row( $(cell).parents('tr')).data();
                                let routeData = module.getRouteRequestDataFromRowData(rowData, module._routeSettings);

                                // overwrite some params
                                routeData.skipSearch = 0;
                                routeData.flag = routeData.flag === 'shortest' ? 'secure' : 'shortest'; // toggle

                                let requestData = {
                                    routeData: [routeData]
                                };

                                module.getRouteData(requestData, 'callbackAddRouteRows');
                            });
                        }
                    },{
                        targets: 7,
                        title: '',
                        orderable: false,
                        searchable: false,
                        width: 10,
                        class: ['text-center', this._config.dataTableActionCellClass].join(' '),
                        data: 'reload',
                        render: {
                            _: 'button'
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            $(cell).on('click', function(e){
                                // get current row data (important!)
                                // -> "rowData" param is not current state, values are "on createCell()" state
                                rowData = tableApi.row( $(cell).parents('tr')).data();
                                let routeData = module.getRouteRequestDataFromRowData(rowData, module._systemData.mapId, module._routeSettings);

                                // overwrite some params
                                routeData.skipSearch = 0;

                                let requestData = {
                                    routeData: [routeData]
                                };

                                module.getRouteData(requestData, 'callbackAddRouteRows');
                            });
                        }
                    },{
                        targets: 8,
                        title: '',
                        orderable: false,
                        searchable: false,
                        width: 10,
                        class: ['text-center', this._config.dataTableActionCellClass].join(' '),
                        data: 'clear',
                        render: {
                            _: 'button'
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tempTableElement = this;

                            let confirmationSettings = {
                                title: '---',
                                template: Util.getConfirmationTemplate(null, {
                                    size: 'small',
                                    noTitle: true
                                }),
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
                    // create global settings object
                    

                    // fill routesTable with data ---------------------------------------------------------------------
                    Util.getLocalStore('map').getItem(module._systemData.mapId).then(dataStore => {
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
                        
                        // set global route settings from store
                        let routeSettings = {};
                        if(
                            dataStore &&
                            dataStore.routeSettings
                        ){
                            routeSettings = dataStore.routeSettings
                        }
                        module._routeSettings = routeSettings

                        // add "Rally Point" systems to table
                        let systemsToData = module.getRallySystemsData(module._systemData.mapId);
                        systemsToData.push(...systemsTo);

                        module.drawRouteTable(module._systemData.mapId, module._systemFromData, systemsToData, routeSettings);
                    });

                    // click on "fake connection" ---------------------------------------------------------------------
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


            let buttons = new $.fn.dataTable.Buttons(this._tableApi, {
                dom: {
                    container: {
                        tag: 'h5',
                        className: 'pull-right'
                    },
                    button: {
                        tag: 'i',
                        className: ['fas', 'fa-fw', module._config.moduleHeadlineIconClass].join(' '),
                    },
                    buttonLiner: {
                        tag: null
                    }
                },
                name: 'tableTools',
                buttons: [
                    {
                        name: 'settings',
                        className: ['fa-sliders-h'].join(' '),
                        titleAttr: 'settings',
                        attr:  {
                            'data-toggle': 'tooltip',
                            'data-html': true
                        },
                        action: function(e, tableApi, node, config){
                            module.showSettingsDialog({
                                mapId: module._systemData.mapId,
                                systemFromData: module._systemFromData
                            });
                        }
                    },
                    {
                        name: 'search',
                        className: 'fa-search',
                        titleAttr: 'find&nbsp;route',
                        attr:  {
                            'data-toggle': 'tooltip',
                            'data-html': true
                        },
                        action: function(e, tableApi, node, config){
                            let maxRouteSearchLimit = Init.routeSearch.limit;

                            if(tableApi.rows().count() >= maxRouteSearchLimit){
                                // max routes limit reached -> show warning
                                module.showNotify({title: 'Route limit reached', text: 'Search is limited by ' + maxRouteSearchLimit, type: 'warning'});
                            }else{
                                module.showFindRouteDialog({
                                    mapId: module._systemData.mapId,
                                    systemFromData: module._systemFromData
                                });
                            }
                        }
                    },
                    {
                        name: 'refresh',
                        className: 'fa-sync',
                        titleAttr: 'refresh',
                        attr:  {
                            'data-toggle': 'tooltip',
                            'data-html': true
                        },
                        action: function(e, tableApi, node, config){
                            module.updateRoutesTable();
                        }
                    }
                ]
            });

            this._tableApi.buttons().container().appendTo(module.moduleElement.querySelector('.' + module._config.headClassName));
        }

        /**
         * draw route table
         * @param  mapId
         * @param systemFromData
         * @param systemsToData
         */
        drawRouteTable(mapId, systemFromData, systemsToData, routeSettings){
            let requestRouteData = [];

            // Skip some routes from search
            // -> this should help to throttle requests (heavy CPU load for route calculation)
            let defaultRoutesCount = Init.routeSearch.defaultCount;
            let rowElements = [];

            for(let systemToData of systemsToData){
                if(systemFromData.name !== systemToData.name){
                    // check for cached rowData
                    let cacheKey = this.getRouteDataCacheKey([mapId], systemFromData.name, systemToData.name);
                    let rowData = SystemRouteModule.getCache('routes').get(cacheKey);
                    if(rowData){
                        // route data is cached (client side)
                        rowElements.push(this.addRow(rowData));
                    }else{
                        // get route data -> ajax
                        let searchData = {
                            mapIds: [mapId],
                            systemFromData: systemFromData,
                            systemToData: systemToData,
                            skipSearch: requestRouteData.length >= defaultRoutesCount
                        };

                        requestRouteData.push(this.getRouteRequestDataFromRowData(searchData, routeSettings));
                    }
                }
            }

            // rows added from cache -> redraw() table
            if(rowElements.length){
                this._tableApi.draw();
            }

            // check if routes data is not cached and is requested
            if(requestRouteData.length > 0){
                //let contextData = {
                //    tableApi: tableApi
                //};

                let requestData = {
                    routeData: requestRouteData
                };

                this.getRouteData(requestData, 'callbackAddRouteRows');
            }
        }

        /**
         * get cache key
         * @param mapIds
         * @param sourceName
         * @param targetName
         * @returns {string}
         */
        getRouteDataCacheKey(mapIds, sourceName, targetName){
            return `route_` + `${mapIds.join('_')}${sourceName}${targetName}`.hashCode();
        }

        /**
         * format rowData for route search/update request
         * @param {Object} rowData
         * @returns {Object}
         */
        getRouteRequestDataFromRowData(rowData, routeSettings){
          
            return {
                mapIds:             (rowData.hasOwnProperty('mapIds'))              ? rowData.mapIds                : [],
                systemFromData:     (rowData.hasOwnProperty('systemFromData'))      ? rowData.systemFromData        : {},
                systemToData:       (rowData.hasOwnProperty('systemToData'))        ? rowData.systemToData          : {},
                skipSearch:         (rowData.hasOwnProperty('skipSearch'))          ? rowData.skipSearch        | 0 : 0,
                stargates:          (rowData.hasOwnProperty('stargates'))           ? rowData.stargates         | 0 : routeSettings.stargates,
                jumpbridges:        (rowData.hasOwnProperty('jumpbridges'))         ? rowData.jumpbridges       | 0 : routeSettings.jumpbridges,
                wormholes:          (rowData.hasOwnProperty('wormholes'))           ? rowData.wormholes         | 0 : routeSettings.wormholes,
                wormholesReduced:   (rowData.hasOwnProperty('wormholesReduced'))    ? rowData.wormholesReduced  | 0 : routeSettings.wormholesReduced,
                wormholesCritical:  (rowData.hasOwnProperty('wormholesCritical'))   ? rowData.wormholesCritical | 0 : routeSettings.wormholesCritical,
                wormholesEOL:       (rowData.hasOwnProperty('wormholesEOL'))        ? rowData.wormholesEOL      | 0 : routeSettings.wormholesEOL,
                wormholesThera:     (rowData.hasOwnProperty('wormholesThera'))      ? rowData.wormholesThera    | 0 : routeSettings.wormholesThera,
                wormholesSizeMin:   (rowData.hasOwnProperty('wormholesSizeMin'))    ? rowData.wormholesSizeMin      : routeSettings.wormholesSizeMin,
                excludeTypes:       (rowData.hasOwnProperty('excludeTypes'))        ? rowData.excludeTypes          : routeSettings.excludeTypes,
                endpointsBubble:    (rowData.hasOwnProperty('endpointsBubble'))     ? rowData.endpointsBubble   | 0 : routeSettings.endpointsBubble,
                connections:        (rowData.hasOwnProperty('connections'))         ? rowData.connections.value | 0 : 0,
                flag:               (rowData.hasOwnProperty('flag'))                ? rowData.flag.value            : 'shortest'
            };
        }

        /**
         * requests route data from eveCentral API and execute callback
         * @param requestData
         * @param callback
         */
        getRouteData(requestData, callback){
            $(this.moduleElement).showLoadingAnimation();

            this.request('POST', 'Route', [], requestData, this, context => {
                $(this.moduleElement).hideLoadingAnimation();
            })
                .then(payload => payload.context[callback](payload.data.routesData))
                .catch(payload => {
                    let reason = payload.data.status + ' ' + payload.data.error;
                    this.showNotify({
                        title: payload.data.jqXHR.status + ': System route data',
                        text: reason,
                        type: 'warning'
                    });
                });
        }

        /**
         * update complete routes table (refresh all)
         */
        updateRoutesTable(){
            let module = this;
            let routeData = [];

            this._tableApi.rows().every(function(){
                routeData.push(module.getRouteRequestDataFromRowData(this.data(), module._systemData.mapId));
            });

            this.getRouteData({routeData: routeData}, 'callbackAddRouteRows');
        }

        /**
         * callback function, adds new row to a dataTable with jump information for a route
         * @param routesData
         */
        callbackAddRouteRows(routesData){
            if(routesData.length > 0){
                for(let routeData of routesData){
                    // format routeData
                    let rowData = this.formatRouteData(routeData);
                    if(rowData.route){
                        // update route cache
                        let cacheKey = this.getRouteDataCacheKey(rowData.mapIds, routeData.systemFromData.name, routeData.systemToData.name);
                        SystemRouteModule.getCache('routes').set(cacheKey, rowData);

                        this.addRow(rowData);
                    }
                }

                // redraw dataTable
                this._tableApi.draw();
            }
        }

        /**
         * add a new dataTable row to the routes table
         * @param rowData
         * @returns {*}
         */
        addRow(rowData){
            let rowElement = null;
            let row;
            let animationStatus = 'changed';

            // search for an existing row (e.g. on mass "table refresh" [all routes])
            // get rowIndex where column 1 (equals to "systemToData.name") matches rowData.systemToData.name
            let indexes = this._tableApi.rows().eq(0).filter((rowIdx) => {
                return (this._tableApi.cell(rowIdx, 1).data().name === rowData.systemToData.name);
            });

            if(indexes.length > 0){
                // update row with FIRST index
                // -> systemFrom should be unique!
                row = this._tableApi.row(parseInt(indexes[0]));
                // update row data
                row.data(rowData);
            }else{
                // no existing route found -> add new row
                row = this._tableApi.row.add(rowData);
                animationStatus = 'added';
            }

            if(row.length > 0){
                rowElement = row.nodes().to$();
                rowElement.data('animationStatus', animationStatus);

                rowElement.initTooltips();
            }
            return rowElement;
        }

        /**
         * format route data from API request into dataTable row format
         * @param routeData
         * @returns {{}}
         */
        formatRouteData(routeData){

            /**
             * get status icon for route
             * @param status
             * @returns {string}
             */
            let getStatusIcon = status => {
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

            /**
             * check systemName if it "might" be a wormhole
             * @param systemName
             * @returns {boolean}
             */
            let isWormholeSystemName = systemName => /^J\d+$/.test(systemName) || systemName === 'Thera';

            // route status:
            // 0: not found
            // 1: round (OK)
            // 2: not searched
            let routeStatus = routeData.skipSearch ? 2 : 0;

            // button class for flag (e.g. "secure" routes)
            let flagButtonClass = routeData.flag === 'secure' ? 'txt-color-success' : '';

            let connectionButton    = '<i class="fas ' + ['fa-code-branch', 'fa-rotate-270', 'txt-color'].join(' ') + '"></i>';
            let flagButton          = '<i class="fas ' + ['fa-shield-alt', 'txt-color', flagButtonClass].join(' ') + '"></i>';
            let reloadButton        = '<i class="fas ' + ['fa-sync'].join(' ') + '"></i>';
            let searchButton        = '<i class="fas ' + ['fa-search'].join(' ') + '"></i>';
            let deleteButton        = '<i class="fas ' + ['fa-times', 'txt-color', 'txt-color-redDark'].join(' ') + '"></i>';

            // default row data (e.g. no route found)
            let tableRowData = {
                systemFromData: routeData.systemFromData,
                systemToData: routeData.systemToData,
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
                wormholesThera: routeData.wormholesThera,
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

                let connectionsData = BaseModule.getConnectionsDataFromMaps(routeData.mapIds);
                let prevRouteNodeData = null;
                // loop all systems on this route
                for(let i = 0; i < routeData.route.length; i++){
                    let routeNodeData = routeData.route[i];
                    let systemName = routeNodeData.system;

                    // fake connection elements between systems -----------------------------------------------------------
                    if(prevRouteNodeData){
                        let connectionData = BaseModule.findConnectionsData(connectionsData, prevRouteNodeData.system, systemName);
                        if(!connectionData){
                            connectionData = BaseModule.getFakeConnectionData(prevRouteNodeData, routeNodeData, isWormholeSystemName(systemName) ? 'wh' : 'stargate');
                        }
                        let connectionElement = BaseModule.getFakeConnectionElement(connectionData);

                        routeJumpElements.push(connectionElement);
                    }

                    // system elements ------------------------------------------------------------------------------------
                    let systemSec = Number(routeNodeData.security).toFixed(1).toString();
                    let tempSystemSec = systemSec;

                    if(tempSystemSec <= 0){
                        tempSystemSec = '0-0';
                    }

                    let systemSecClass = this._config.systemSecurityClassPrefix + tempSystemSec.replace('.', '-');

                    // check for wormhole
                    let icon = 'fas fa-square-full';
                    if(isWormholeSystemName(systemName)){
                        icon = 'fas fa-dot-circle';
                    }

                    let system = '<i class="' + icon + ' ' + systemSecClass + '" ';
                    system += 'data-toggle="tooltip" data-placement="bottom" ';
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

                let avgSecClass = this._config.systemSecurityClassPrefix + avgSecForClass.toString().replace('.', '-');

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
        }

        /**
         *
         * @param mapId
         * @returns {[]}
         */
        getRallySystemsData(mapId){
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
        }

        /**
         * init system popover (e.g. for setWaypoints)
         * @param elements
         * @param options
         */
        initSystemPopover(elements, options){
            let eventNamespace = 'hideSystemPopup';
            let systemToData = options.systemToData;

            requirejs(['text!templates/tooltip/system_popover.html', 'mustache'], (template, Mustache) => {
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
                    }).data('bs.popover').tip().addClass(Util.config.popoverClass);
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
                            id: $(this).data('systemid'),
                            name: $(this).data('name')
                        };
                        Util.setDestination('set_destination', 'system', systemData);

                        // close popover
                        popoverRoot.popover('hide');
                    });
                });
            });
        }

        /**
         * show route settings dialog
         * @param dialogData
         */
        showSettingsDialog(dialogData){
            Util.getLocalStore('map').getItem(dialogData.mapId).then(dataStore => {
                // selected systems and options (if already stored)
                let systemSelectOptions = [];
                let routeSettingsOptions = {};
                if(
                    dataStore &&
                    dataStore.routes
                ){
                    systemSelectOptions = dataStore.routes;
                }
                if(
                    dataStore &&
                    dataStore.routeSettings
                ){
                    routeSettingsOptions = dataStore.routeSettings;
                }

                // max count of "default" target systems
                let maxSelectionLength = Init.routeSearch.maxDefaultCount;

                let data = {
                    id: this._config.routeSettingsDialogId,
                    selectClass: this._config.systemDialogSelectClass,
                    systemSelectOptions: systemSelectOptions,
                    maxSelectionLength: maxSelectionLength,
                    // new options
                    routeSettings: routeSettingsOptions,
                    select2Class: Util.config.select2Class,
                    routeDialogSizeSelectId: this._config.routeDialogSizeSelectId,
                    select2Class: Util.config.select2Class,
                    sizeOptions: MapUtil.allConnectionJumpMassTypes().map(type => ({
                        id: type,
                        name: type,
                        selected: false
                    }))
                };
                console.log(data);
                
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
                                callback: e => {
                                    let form = $(e.delegateTarget).find('form');
                                    // get all system data from select2
                                    
                                    let systemSelectData = form.find('.' + this._config.systemDialogSelectClass).select2('data');
                                    let systemsToData = [];
                                    if(systemSelectData.length > 0){
                                        systemsToData = SystemRouteModule.formSystemSelectData(systemSelectData);
                                        Util.getLocalStore('map').setItem(`${dialogData.mapId}.routes`, systemsToData);
                                    }else{
                                        Util.getLocalStore('map').removeItem(`${dialogData.mapId}.routes`);
                                    }
                                    
                                    // route settings additions
                                    let routeSettingsData = $(form).getFormValues();
                                    if(
                                        routeSettingsData
                                    ){
                                        let routeSettings = {
                                            stargates: routeSettingsData.hasOwnProperty('stargates') ? parseInt(routeSettingsData.stargates) : 0,
                                            jumpbridges: routeSettingsData.hasOwnProperty('jumpbridges') ? parseInt(routeSettingsData.jumpbridges) : 0,
                                            wormholes: routeSettingsData.hasOwnProperty('wormholes') ? parseInt(routeSettingsData.wormholes) : 0,
                                            wormholesReduced: routeSettingsData.hasOwnProperty('wormholesReduced') ? parseInt(routeSettingsData.wormholesReduced) : 0,
                                            wormholesCritical: routeSettingsData.hasOwnProperty('wormholesCritical') ? parseInt(routeSettingsData.wormholesCritical) : 0,
                                            wormholesEOL: routeSettingsData.hasOwnProperty('wormholesEOL') ? parseInt(routeSettingsData.wormholesEOL) : 0,
                                            wormholesThera: routeSettingsData.hasOwnProperty('wormholesThera') ? parseInt(routeSettingsData.wormholesThera) : 0,
                                            wormholesSizeMin: routeSettingsData.wormholesSizeMin || '',
                                            excludeTypes: SystemRouteModule.getLowerSizeConnectionTypes(routeSettingsData.wormholesSizeMin),
                                            endpointsBubble: routeSettingsData.hasOwnProperty('endpointsBubble') ? parseInt(routeSettingsData.endpointsBubble) : 0,
                                        };
                                        Util.getLocalStore('map').setItem(`${dialogData.mapId}.routeSettings`, routeSettings);
                                    }
                                    // end route settings additions


                                    this.showNotify({title: 'Route settings stored', type: 'success'});

                                    // (re) draw table
                                    this.drawRouteTable(dialogData.mapId, dialogData.systemFromData, systemsToData, routeSettingsData);
                                }
                            }
                        }
                    });

                    settingsDialog.on('shown.bs.modal', e => {

                        // init default system select ---------------------------------------------------------------------
                        // -> add some delay until modal transition has finished
                        let systemTargetSelect = $(e.target).find('.' + this._config.systemDialogSelectClass);
                        systemTargetSelect.delay(240).initSystemSelect({key: 'id', maxSelectionLength: maxSelectionLength});

                        // init connection jump size select -------------------------------------------------------------------
                        $(e.target).find('#' + this._config.routeDialogSizeSelectId).initConnectionSizeSelect();
                    });

                    // show dialog
                    settingsDialog.modal('show');
                });
            });
        }

        /**
         * show route dialog. User can search for systems and jump-info
         * @param dialogData
         */
        showFindRouteDialog(dialogData){
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

            let data = {
                id: this._config.routeDialogId,
                select2Class: Util.config.select2Class,
                selectClass: this._config.systemDialogSelectClass,
                routeDialogMapSelectId: this._config.routeDialogMapSelectId,
                routeDialogSizeSelectId: this._config.routeDialogSizeSelectId,
                systemFromData: dialogData.systemFromData,
                systemToData: dialogData.systemToData,
                mapSelectOptions: mapSelectOptions,
                sizeOptions: MapUtil.allConnectionJumpMassTypes().map(type => ({
                    id: type,
                    name: type,
                    selected: false
                }))
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
                            callback: e => {
                                // add new route to route table
                                let form = $(e.delegateTarget).find('form');
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
                                let systemSelectData = form.find('.' + this._config.systemDialogSelectClass).select2('data');

                                if(
                                    systemSelectData &&
                                    systemSelectData.length === 1
                                ){
                                    let requestData = {
                                        routeData: [{
                                            mapIds: routeDialogData.mapIds,
                                            systemFromData: dialogData.systemFromData,
                                            systemToData: {
                                                systemId: parseInt(systemSelectData[0].id),
                                                name: systemSelectData[0].text
                                            },
                                            stargates: routeDialogData.hasOwnProperty('stargates') ? parseInt(routeDialogData.stargates) : 0,
                                            jumpbridges: routeDialogData.hasOwnProperty('jumpbridges') ? parseInt(routeDialogData.jumpbridges) : 0,
                                            wormholes: routeDialogData.hasOwnProperty('wormholes') ? parseInt(routeDialogData.wormholes) : 0,
                                            wormholesReduced: routeDialogData.hasOwnProperty('wormholesReduced') ? parseInt(routeDialogData.wormholesReduced) : 0,
                                            wormholesCritical: routeDialogData.hasOwnProperty('wormholesCritical') ? parseInt(routeDialogData.wormholesCritical) : 0,
                                            wormholesEOL: routeDialogData.hasOwnProperty('wormholesEOL') ? parseInt(routeDialogData.wormholesEOL) : 0,
                                            wormholesThera: routeDialogData.hasOwnProperty('wormholesThera') ? parseInt(routeDialogData.wormholesThera) : 0,
                                            wormholesSizeMin: routeDialogData.wormholesSizeMin || '',
                                            excludeTypes: SystemRouteModule.getLowerSizeConnectionTypes(routeDialogData.wormholesSizeMin),
                                            endpointsBubble: routeDialogData.hasOwnProperty('endpointsBubble') ? parseInt(routeDialogData.endpointsBubble) : 0,
                                            flag: routeDialogData.hasOwnProperty('flag') ? routeDialogData.flag : 'shortest'
                                        }]
                                    };

                                    this.getRouteData(requestData, 'callbackAddRouteRows');
                                }
                            }
                        }
                    }
                });

                findRouteDialog.on('show.bs.modal', e => {
                    $(e.target).initTooltips();

                    // init some dialog/form observer
                    this.setDialogObserver($(e.target));

                    // init map select ------------------------------------------------------------------------------------
                    $(e.target).find('#' + this._config.routeDialogMapSelectId).initMapSelect();

                    // init connection jump size select -------------------------------------------------------------------
                    $(e.target).find('#' + this._config.routeDialogSizeSelectId).initConnectionSizeSelect();
                });


                findRouteDialog.on('shown.bs.modal', e => {
                    // init system select live  search --------------------------------------------------------------------
                    // -> add some delay until modal transition has finished
                    let systemTargetSelect = $(e.target).find('.' + this._config.systemDialogSelectClass);
                    systemTargetSelect.delay(240).initSystemSelect({key: 'id'});
                });

                // show dialog
                findRouteDialog.modal('show');
            });
        }

        /**
         * set event observer for route finder dialog
         * @param routeDialog
         */
        setDialogObserver(routeDialog){
            let wormholeCheckbox            = routeDialog.find('input[type="checkbox"][name="wormholes"]');
            let wormholeReducedCheckbox     = routeDialog.find('input[type="checkbox"][name="wormholesReduced"]');
            let wormholeCriticalCheckbox    = routeDialog.find('input[type="checkbox"][name="wormholesCritical"]');
            let wormholeEolCheckbox         = routeDialog.find('input[type="checkbox"][name="wormholesEOL"]');
            let wormholeTheraCheckbox       = routeDialog.find('input[type="checkbox"][name="wormholesThera"]');
            let wormholeSizeSelect          = routeDialog.find('#' + this._config.routeDialogSizeSelectId);

            // store current "checked" state for each box ---------------------------------------------
            let storeCheckboxStatus = () => {
                wormholeReducedCheckbox.data('selectState', wormholeReducedCheckbox.prop('checked'));
                wormholeCriticalCheckbox.data('selectState', wormholeCriticalCheckbox.prop('checked'));
                wormholeEolCheckbox.data('selectState', wormholeEolCheckbox.prop('checked'));
                wormholeTheraCheckbox.data('selectState', wormholeTheraCheckbox.prop('checked'));
            };

            // on wormhole checkbox change ------------------------------------------------------------
            let onWormholeCheckboxChange = e => {
                if($(e.target).is(':checked')){
                    wormholeSizeSelect.prop('disabled', false);

                    wormholeReducedCheckbox.prop('disabled', false);
                    wormholeCriticalCheckbox.prop('disabled', false);
                    wormholeEolCheckbox.prop('disabled', false);
                    wormholeTheraCheckbox.prop('disabled', false);

                    wormholeReducedCheckbox.prop('checked', wormholeReducedCheckbox.data('selectState'));
                    wormholeCriticalCheckbox.prop('checked', wormholeCriticalCheckbox.data('selectState'));
                    wormholeEolCheckbox.prop('checked', wormholeEolCheckbox.data('selectState'));
                    wormholeTheraCheckbox.prop('checked', wormholeTheraCheckbox.data('selectState'));
                }else{
                    wormholeSizeSelect.prop('disabled', true);

                    storeCheckboxStatus();

                    wormholeReducedCheckbox.prop('checked', false);
                    wormholeReducedCheckbox.prop('disabled', true);
                    wormholeCriticalCheckbox.prop('checked', false);
                    wormholeCriticalCheckbox.prop('disabled', true);
                    wormholeEolCheckbox.prop('checked', false);
                    wormholeEolCheckbox.prop('disabled', true);
                    wormholeTheraCheckbox.prop('checked', false);
                    wormholeTheraCheckbox.prop('disabled', true);
                }
            };

            wormholeCheckbox.on('change', onWormholeCheckboxChange);

            // initial checkbox check
            storeCheckboxStatus();
            onWormholeCheckboxChange({target: wormholeCheckbox});
        }

        /**
         * init module
         */
        init(){
            super.init();
        }

        /**
         * get all jump mass related connection types that have a lower "jumpMassMin" than connectionType
         * @param connectionType
         * @returns {Array}
         */
        static getLowerSizeConnectionTypes(connectionType){
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
        }

        /**
         * format select2 system data
         * @param {Array} data
         * @returns {Array}
         */
        static formSystemSelectData(data){
            let formattedData = [];
            for(let i = 0; i < data.length; i++){
                let tmpData = data[i];
                formattedData.push({
                    systemId: parseInt(tmpData.id),
                    name: tmpData.text
                });
            }
            return formattedData;
        }
    };

    SystemRouteModule.isPlugin = false;                                         // module is defined as 'plugin'
    SystemRouteModule.scope = 'system';                                         // module scope controls how module gets updated and what type of data is injected
    SystemRouteModule.sortArea = 'b';                                           // default sortable area
    SystemRouteModule.position = 1;                                             // default sort/order position within sortable area
    SystemRouteModule.label = 'Routes';                                         // static module label (e.g. description)
    SystemRouteModule.cacheConfig = {
        routes: {
            ttl: 5,
            maxSize: 100
        }
    };

    SystemRouteModule.defaultConfig = {
        className: 'pf-system-route-module',                                    // class for module
        sortTargetAreas: ['a', 'b', 'c'],                                       // sortable areas where module can be dragged into
        headline: 'Routes',

        // dialog
        routeDialogId: 'pf-route-dialog',                                       // id for route "search" dialog
        routeSettingsDialogId: 'pf-route-settings-dialog',                      // id for route "settings" dialog
        systemDialogSelectClass: 'pf-system-dialog-select',                     // class for system select Element

        routeDialogMapSelectId: 'pf-route-dialog-map-select',                   // id for "map" select
        routeDialogSizeSelectId: 'pf-route-dialog-size-select',                 // id for "wh size" select

        // table
        systemInfoRoutesTableClass: 'pf-system-route-table',                    // class for route tables
        dataTableActionCellClass: 'pf-table-action-cell',                       // class for "action" cells
        dataTableRouteCellClass: 'pf-table-route-cell',                         // class for "route" cells
        dataTableJumpCellClass: 'pf-table-jump-cell',                           // class for "route jump" cells

        systemSecurityClassPrefix: 'pf-system-security-',                       // prefix class for system security level (color)
        rallyClass: 'pf-rally',                                                 // class for "rally point" style
    };

    return SystemRouteModule;
});