define([
    'jquery',
    'app/init',
    'app/util',
    'module/base',
    'app/map/map',
    'app/map/util',
    'app/ui/form_element'
], ($, Init, Util, BaseModule, Map, MapUtil, FormElement) => {
    'use strict';

    /**
     * TheraModule class
     * @type {TheraModule}
     */
    let TheraModule = class TheraModule extends BaseModule {
        constructor(config = {}) {
            config.eveScoutUrl = new URL(Init.url.eveScout);
            super(Object.assign({}, new.target.defaultConfig, config));
        }

        /**
         * get icon for undefined/missing cell value
         * @returns {string}
         */
        getIconForUndefinedCellValue(){
            return '<i class="fas fa-question txt-color txt-color-orangeDark"></i>';
        }

        /**
         * get icon for "syncStatus" (connection is mapped) cell value
         * @param status
         * @returns {string}
         */
        getIconForStatusCellValue(status = ''){
            let title = '';
            switch(status){
                case 'warning':
                    title = `not in ${this._config.eveScoutUrl.hostname.replace('www.', '')} connections`;
                    break;
                case 'success':
                    title = `in ${this._config.eveScoutUrl.hostname.replace('www.', '')} connections`;
                    break;
                case 'hint':
                    title += `sync connections/signatures`;
                    break;
                default:
                    title = `not mapped`;
            }

            return `<i class="fas fa-circle txt-color txt-color-${status}" title="${title}"></i>`;
        }

        /**
         * get dataTable id
         * @param {...string} parts  e.g. 'tableType', 'mapId', 'systemId'
         * @returns {string}
         */
        getTableId(...parts){
            return BaseModule.Util.getTableId(this._config.theraTableId, ...parts);
        }

        /**
         * get dataTable row id
         * @param tableType
         * @param id
         * @returns {string}
         */
        getRowId(tableType, id){
            return BaseModule.Util.getTableRowId(this._config.theraTableRowIdPrefix, tableType, id);
        }

        /**
         * get <tr> DOM id by id
         * @param tableApi
         * @param id
         * @returns {*}
         */
        getRowById(tableApi, id){
            return tableApi.rows().ids().toArray().find(rowId =>
                rowId === this.getRowId(BaseModule.Util.getObjVal(this.getTableMetaData(tableApi), 'type'), id)
            );
        }

        /**
         * get custom "metaData" from dataTables API
         * @param tableApi
         * @returns {*}
         */
        getTableMetaData(tableApi){
            return tableApi ? tableApi.init().pfMeta : null;
        }

        /**
         * initial module render method
         * -> implementation is enforced by BaseModule
         * -> must return a single node element
         * @param mapId
         * @returns {HTMLElement}
         */
        render(mapId){
            this._mapId = mapId;

            // ... append your custom module body
            this._bodyEl = Object.assign(document.createElement('div'), {
                className: this._config.bodyClassName
            });

            this.moduleElement.append(this._bodyEl);

            this._bodyEl.append(
                this.newControlElement(
                    'Thera not found on map. Click here to add',
                    [this._config.moduleHeadlineIconClass, this._config.controlAreaTheraClass, 'hidden'],
                    ['fa-plus']
                )
            );

            $(this.moduleElement).showLoadingAnimation();

            this.initTheraTable();

            this.setModuleObserver();

            return this.moduleElement;
        }

        /**
         * init 'Thera connections' table (EveScout)
         */
        initTheraTable(){
            let module = this;

            let tableEl = document.createElement('table');
            tableEl.id = module.getTableId('thera', module._mapId);
            tableEl.classList.add('compact', 'stripe', 'order-column', 'row-border', 'pf-table-fixed', module._config.globalTheraTableClass);
            this._bodyEl.append(tableEl);

            this._tableApi = $(tableEl).DataTable( {
                pfMeta: {
                    type: 'theraConnection'
                },
                paging: false,
                ordering: true,
                order: [[0, 'desc'], [8, 'desc']],
                orderFixed: [[ 10, 'desc']],
                info: false,
                searching: false,
                hover: false,
                autoWidth: false,
                rowId: rowData => module.getRowId('theraConnection', rowData.id),
                select: {
                    style: 'os',
                    selector: 'td:not(.' + module._config.tableCellActionClass + ')'
                },
                language: {
                    emptyTable: 'No Thera connections found'
                },
                columnDefs: [
                    {
                        targets: 0,
                        name: 'syncStatus',
                        title: '',
                        width: 2,
                        className: 'text-center',
                        data: 'syncStatus',
                        defaultContent: module.getIconForStatusCellValue(),
                        render: {
                            display: (cellData, type, rowData, meta) => {
                                return module.getIconForStatusCellValue(cellData);
                            },
                            sort: syncStatus => ['warning', 'hint', 'success'].indexOf(syncStatus)
                        }
                    },{
                        targets: 1,
                        name: 'trueSec',
                        title: 'sec',
                        width: 15,
                        className:'text-center',
                        data: 'target.trueSec',
                        defaultContent: module.getIconForUndefinedCellValue(),
                        render: {
                            display: (cellData, type, rowData, meta) => {
                                if(cellData !== undefined){
                                    let systemTrueSecClass = BaseModule.Util.getTrueSecClassForSystem(cellData);
                                    return '<span class="' + systemTrueSecClass + '">' + cellData.toFixed(1) + '</span>';
                                }
                            }
                        }
                    },{
                        targets: 2,
                        name: 'systemName',
                        title: 'system',
                        className: module._config.tableCellEllipsisClass,
                        data: 'target',
                        defaultContent: module.getIconForUndefinedCellValue(),
                        render: {
                            display: (cellData, type, rowData, meta) => {
                                let systemId = cellData.id || '';
                                let cls = (
                                    cellData.name && (
                                        BaseModule.Util.getObjVal(rowData, 'relRowId') ||   // secondary table
                                        BaseModule.Util.getObjVal(rowData, 'connectionId')  // primary table
                                    )
                                ) ? module._config.linkClass : '';
                                return `<span data-systemid="${systemId}" class="${cls}">${cellData.name || ''}</span>`;
                            },
                            sort: 'name'
                        }
                    },{
                        targets: 3,
                        name: 'region',
                        title: 'region',
                        className: module._config.tableCellEllipsisClass,
                        data: 'target',
                        defaultContent: module.getIconForUndefinedCellValue(),
                        render: {
                            _: 'region.name'
                        }
                    },{
                        targets: 4,
                        name: 'outSig',
                        title: '<i title="Out signature" data-toggle="tooltip" class="fas fa-sign-out-alt fa-rotate-270"></i>',
                        width: 12,
                        className: ['text-center', module._config.fontUppercaseClass].join(' '),
                        data: 'sourceSignature',
                        defaultContent: module.getIconForUndefinedCellValue(),
                        render: {
                            _: 'name'
                        }
                    },{
                        targets: 5,
                        name: 'fakeConnection',
                        title: 'con.',
                        orderable: false,
                        width: 30,
                        className: 'text-center',
                        data: 'fakeConnection',
                        defaultContent: ''
                    },{
                        targets: 6,
                        name: 'inSig',
                        title: '<i title="In signature" data-toggle="tooltip" class="fas fa-sign-in-alt fa-rotate-90"></i>',
                        width: 12,
                        className: ['text-center', module._config.fontUppercaseClass].join(' '),
                        data: 'targetSignature',
                        defaultContent: module.getIconForUndefinedCellValue(),
                        render: {
                            _: 'name'
                        }
                    },{
                        targets: 7,
                        name: 'wormholeLabel',
                        title: 'type',
                        width: 50,
                        className: module._config.tableCellTypeClass,
                        data: 'wormholeLabel',
                        defaultContent: module.getIconForUndefinedCellValue(),
                        render: {
                            display: (cellData, type, rowData, meta) => {
                                if(cellData){
                                    let wormholeData = BaseModule.Util.getObjVal(Init, `wormholes.${cellData}`);
                                    let security = BaseModule.Util.getObjVal(wormholeData, `security`);
                                    let typeNodes = FormElement.formatSignatureTypeSelectionData({text: `${cellData} - ${security}`}, undefined, {showWhSizeLabel: false});
                                    return [...typeNodes].reduce((acc, node) => {
                                        acc += node.outerHTML;
                                        return acc;
                                    }, '');
                                }
                            }
                        }
                    },{
                        targets: 8,
                        name: 'estimatedLife',
                        title: '<i title="estimated lifetime" data-toggle="tooltip" class="fas fa-hourglass-start"></i>',
                        width: 15,
                        className: 'text-right',
                        data: 'estimatedEol',
                        defaultContent: module.getIconForUndefinedCellValue(),
                        render: {
                            display: (cellData, type, rowData, meta) => {
                                try{
                                    let timeNow = (new Date()).getTime();
                                    let timeEol = Date.parse(cellData);
                                    if(!isNaN(timeNow) && !isNaN(timeEol) ){
                                        let diff = (timeEol - timeNow) / 1000;
                                        diff /= (60 * 60);
                                        return `< ${Math.ceil(diff)}h`;
                                    }
                                }catch(e){}
                            },
                            sort: dateVal => Date.parse(dateVal)
                        }
                    },{
                        targets: 9,
                        name: 'action',
                        title: '',
                        orderable: false,
                        width: 10,
                        className: ['text-center', module._config.tableCellActionClass, module._config.moduleHeadlineIconClass].join(' '),
                        data: null,
                        render: {
                            display: data => {
                                let icon = '';
                                if(data.connectionId){
                                    icon = '<i class="fas fa-times txt-color txt-color-redDark"></i>';
                                }else if(!data.syncStatus){
                                    icon = '<i class="fas fa-plus"></i>';
                                }
                                return icon;
                            }
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            cell.addEventListener('click', e => {
                                e.stopPropagation();

                                let rowClicked = tableApi.row(e.target.closest('tr'));
                                rowData = rowClicked.data();

                                if(rowData.connectionId){
                                    // delete row(s) ------------------------------------------------------------------
                                    let deleteData = {
                                        systemIds: [],
                                        connectionIds: [],
                                    };

                                    let value, label;
                                    // check if multiple rows are selected + current row is one of them -> bulk edit
                                    let rowsSelected = tableApi.rows({selected: true});
                                    if(rowsSelected.count() > 1 && tableApi.row(rowIndex, {selected: true}).count()){
                                        deleteData = rowsSelected.data().toArray()
                                            .reduce((acc, rowData) => {
                                                acc.systemIds.push(BaseModule.Util.getObjVal(rowData, 'target.realId'));
                                                acc.connectionIds.push(BaseModule.Util.getObjVal(rowData, 'connectionId'));
                                                return acc;
                                            }, deleteData);
                                        label = `delete ${deleteData.systemIds.length} systems`;
                                    }else{
                                        // get current row data (important!)
                                        // -> "rowData" param is not current state, values are "on createCell()" state
                                        rowsSelected = tableApi.row( $(cell).parents('tr'));
                                        rowData = rowsSelected.data();
                                        deleteData.systemIds.push(BaseModule.Util.getObjVal(rowData, 'target.realId') || 0);
                                        deleteData.connectionIds.push(BaseModule.Util.getObjVal(rowData, 'connectionId') || 0);
                                        label = `delete '${BaseModule.Util.getObjVal(rowData, 'target.name')}'`;
                                    }

                                    let confirmationSettings = {
                                        title: '---',
                                        template: BaseModule.Util.getConfirmationTemplate(BaseModule.Util.getConfirmationContent([{
                                            name: 'deleteSystems',
                                            value: 1,
                                            label: label,
                                            class: 'pf-editable-warn',
                                            checked: false
                                        }]), {
                                            size: 'small',
                                            noTitle: true
                                        }),
                                        trigger: 'manual',
                                        onConfirm : function(e, target){
                                            // stop scroll to top
                                            e.preventDefault();

                                            // get form data (check if form tag is not hidden!) from confirmation popover
                                            let tip = target.data('bs.confirmation').tip();
                                            let form = tip.find('form:not(.hidden)').first();
                                            let formData = form.getFormValues();
                                            let deleteSystems = BaseModule.Util.getObjVal(formData, 'deleteSystems');

                                            if(deleteSystems){
                                                // delete systems -> connections get auto removed as well
                                                let activeMap = BaseModule.Util.getMapModule().getActiveMap();
                                                let systems = deleteData.systemIds.map(systemId =>
                                                    document.getElementById(MapUtil.getSystemId(module._mapId, systemId))
                                                ).filter(Boolean);

                                                $(module.moduleElement).showLoadingAnimation();
                                                activeMap.trigger('pf:deleteSystems', [{
                                                    systems: systems,
                                                    callback: deletedSystems => {
                                                        // callback function after ajax "delete" success
                                                        // check if system was deleted
                                                        if(deletedSystems.length){
                                                            // remove table row
                                                            rowsSelected.remove().draw();
                                                        }else{
                                                            // error
                                                            this.showNotify({title: 'Failed to delete system', type: 'error'});
                                                        }
                                                        $(module.moduleElement).hideLoadingAnimation();
                                                    }
                                                }]);
                                            }else{
                                                // just delete connections
                                                let connections = deleteData.connectionIds.map(connectionId =>
                                                    $().getConnectionById(module._mapId, connectionId)
                                                ).filter(Boolean);

                                                $(module.moduleElement).showLoadingAnimation();
                                                MapUtil.deleteConnections(connections, () => {
                                                    // callback function after ajax "delete" success
                                                    // remove table row
                                                    rowsSelected.remove().draw();
                                                    $(module.moduleElement).hideLoadingAnimation();
                                                });
                                            }
                                        }
                                    };

                                    // init confirmation dialog
                                    $(cell).confirmation('destroy').confirmation(confirmationSettings).confirmation('show');
                                }else if(!rowData.syncStatus){
                                    // add row ------------------------------------------------------------------------

                                    let systemDataThera = MapUtil.getSystemData(module._mapId, TheraModule.systemIdThera, 'systemId');
                                    let systemDataSource = MapUtil.getSystemData(module._mapId, BaseModule.Util.getObjVal(rowData, 'target.id'), 'systemId');

                                    if(systemDataThera && systemDataSource){
                                        // source & target system are already on map -> just draw connection
                                        let map = MapUtil.getMapInstance(module._mapId);
                                        let connectionData = {
                                            source: systemDataThera.id,
                                            target: systemDataSource.id,
                                            scope: rowData.scope,
                                            type: rowData.type
                                        };

                                        $(module.moduleElement).showLoadingAnimation();

                                        Map.drawConnection(map, connectionData)
                                            .then(payload => Map.saveConnection(payload.data.connection, true))
                                            .catch(console.warn);
                                    }else{
                                        let options = {
                                            systemData: {
                                                id: BaseModule.Util.getObjVal(rowData, 'target.id'),
                                                name: BaseModule.Util.getObjVal(rowData, 'target.name')
                                            }
                                        };

                                        if(systemDataThera){
                                            let systemThera = document.getElementById(MapUtil.getSystemId(systemDataThera.mapId, systemDataThera.id));
                                            if(systemThera){
                                                options.sourceSystem = $(systemThera);
                                                options.connectionData = {
                                                    scope: rowData.scope,
                                                    type: rowData.type,
                                                    disableAutoScope: true
                                                };
                                            }
                                        }

                                        module.showNewSystemDialog(options);
                                    }
                                }
                            });
                        }
                    },{
                        targets: 10,
                        name: 'rowGroupData',
                        className: 'never',     // never show this column. see: https://datatables.net/extensions/responsive/classes
                        data: 'rowGroupData',
                        defaultContent: 0,
                        visible: false,
                        render: {
                            sort: 'id'
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

                    animationRows.initTooltips();

                    for(let i = 0; i < animationRows.length; i++){
                        let animationRow = $(animationRows[i]);
                        animationRow.pulseBackgroundColor(animationRow.data('animationStatus'));
                        animationRow.removeData('animationStatus');
                    }
                },
                initComplete: function(settings, json){
                    module.getTheraConnectionsData('callbackUpdateTableRows');

                    // hover effect -----------------------------------------------------------------------------------
                    let tableApi = this.api();
                    let relRowId = null;
                    tableApi.tables().nodes().to$().on('mouseenter', 'td', function(){
                        relRowId = BaseModule.Util.getObjVal(tableApi.row(this.parentElement).data(), 'relRowId') || null;
                        if(relRowId){
                            let colIndex = tableApi.cell(this).index().column;
                            if(colIndex <= 8){
                                let cell = tableApi.cell(this);
                                let relCell = tableApi.cell(
                                    `#${module.getRowById(tableApi, relRowId)}`,
                                    colIndex
                                );
                                cell.nodes().to$().addClass('cellHighlight');
                                relCell.nodes().to$().addClass('cellHighlight');

                                if([4,5,6,7,8].includes(colIndex)){
                                    let cellNode = cell.node();
                                    let relCellNode = relCell.node(); // might not exist if relRow was recently removed
                                    if(
                                        cellNode && relCellNode &&
                                        cellNode.innerHTML !== relCellNode.innerHTML
                                    ){
                                        cellNode.dataset.origValue = cellNode.innerHTML;
                                        cellNode.innerHTML = relCellNode.innerHTML;
                                    }
                                }
                            }
                        }
                    }).on('mouseleave', 'td', function(){
                        if(relRowId){
                            if(this.dataset.origValue){
                                this.innerHTML = this.dataset.origValue;
                                delete this.dataset.origValue;
                            }
                            tableApi.cells().nodes().to$().removeClass('cellHighlight');
                            relRowId = null;
                        }
                    });

                    // click on "fake connection" ---------------------------------------------------------------------
                    $(this).on('click', '.pf-fake-connection', function(){
                        let rowData = tableApi.row(this.closest('tr')).data();
                        if(rowData.connectionId){
                            let connection = $().getConnectionById(module._mapId, rowData.connectionId);
                            if(connection){
                                let map = connection._jsPlumb.instance;
                                MapUtil.showConnectionInfo(map, [connection]);
                            }
                        }
                    });

                    // click on "target system name" ------------------------------------------------------------------
                    $(this).on('click', `.${module._config.linkClass}[data-systemid]:not([data-systemid=''])`, e => {
                        BaseModule.Util.triggerMenuAction(
                            BaseModule.Util.getMapModule().getActiveMap(),
                            'SelectSystem',
                            {systemId: MapUtil.getSystemData(module._mapId, parseInt(e.target.dataset.systemid), 'systemId').id}
                        );
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
                        name: 'eveScout',
                        className: 'fa-external-link-alt',
                        titleAttr: module._config.eveScoutUrl.hostname.replace('www.', ''),
                        attr:  {
                            'data-toggle': 'tooltip',
                            'data-html': true
                        },
                        action: function(e, tableApi, node, config){
                            e.stopPropagation();
                            window.open(`//${module._config.eveScoutUrl.hostname}`, '_blank');
                        }
                    }, {
                        name: 'refresh',
                        className: 'fa-sync',
                        titleAttr: 'refresh',
                        attr:  {
                            'data-toggle': 'tooltip',
                            'data-html': true
                        },
                        action: function(e, tableApi, node, config){
                            $(module.moduleElement).showLoadingAnimation();
                            module.getTheraConnectionsData('callbackUpdateTableRows');
                        }
                    }
                ]
            });

            // "RowGroup" Datatables Plugin
            this._tableApi.buttons().container().appendTo(module.moduleElement.querySelector('.' + module._config.headClassName));

            new $.fn.dataTable.RowGroup(this._tableApi, {
                dataSrc: 'rowGroupData.name',
                startRender: function(rows, group, level){
                    return `<div class="flex-row flex-between">` +
                                `<span class="flex-col flex-grow">${group}</span>` +
                                `<span class="flex-col">${rows.count()}</span>` +
                            `</div>`;
                }
            });

            // "Select" Datatables Plugin
            this._tableApi.select();

            this._tableApi.on('user-select', function(e, tableApi, type, cell, originalEvent){
                let rowData = tableApi.row(cell.index().row).data();
                if(!BaseModule.Util.getObjVal(rowData, 'connectionId')){
                    e.preventDefault();
                }
            });
        }

        /**
         * @param options
         * @param isThera
         */
        showNewSystemDialog(options = {}, isThera = false){
            let activeMap = BaseModule.Util.getMapModule().getActiveMap();

            // custom callback -> refresh Thera table
            options.callback = (map, newSystemData, sourceSystem, connectionData) => {
                $(this.moduleElement).showLoadingAnimation();

                Map.saveSystemCallback(map, newSystemData, sourceSystem, connectionData);
            };
            BaseModule.Util.triggerMenuAction(activeMap, 'AddSystem', options);
        }

        /**
         * get thera connections data
         * @param callback
         * @param system
         */
        getTheraConnectionsData(callback, system = null){

            this.getLocalStore().getItem('eveScout')
                .then(cacheEntry => new Promise(resolve => {

                    if(
                        cacheEntry && cacheEntry.tSet &&
                        TheraModule.ttlEveScoutResponse > BaseModule.now() - cacheEntry.tSet
                    ){
                        $(this.moduleElement).hideLoadingAnimation();
                        resolve(cacheEntry.value);
                    }else{
                        this.request('GET', 'SystemThera', [], {}, this, context => {
                            $(this.moduleElement).hideLoadingAnimation();
                        }).then(payload => {
                            let cacheEntry = {
                                tSet: BaseModule.now(),
                                value: Array.isArray(payload.data) ? payload.data : []
                            };
                            this.getLocalStore().setItem('eveScout', cacheEntry)
                                .then(cacheEntry => resolve(cacheEntry.value));
                        }).catch(payload => {
                            let reason = payload.data.status + ' ' + payload.data.error;
                            this.showNotify({
                                title: payload.data.jqXHR.status + ': Thera connections data',
                                text: reason,
                                type: 'warning'
                            });
                            resolve([]);
                        });
                    }
                }))
                .then(connectionsData => this[callback](connectionsData, system));
        }

        /**
         * update thera table with data
         * @param connectionsData
         * @param systemThera
         */
        callbackUpdateTableRows(connectionsData = [], systemThera = null){
            if(!this._tableApi){
                return;
            }

            connectionsData = Array.isArray(connectionsData) ? connectionsData : [];

            let getGroupedRowId = (groupData, rowId) => {
              return `${groupData.id}-${rowId}`;
            };

            let touchedRows = [];
            let hadData = this._tableApi.rows().any();
            let notificationCounter = {
                added: 0,
                changed: 0,
                deleted: 0
            };

            let map = MapUtil.getMapInstance(this._mapId);
            let currentMapData = BaseModule.Util.getCurrentMapData(this._mapId);
            if(map && currentMapData){
                let groupDataMap = {
                    id: this._mapId,
                    name: BaseModule.Util.getObjVal(currentMapData, 'config.name')
                };

                let groupDataEveScout = {
                    id: 0,
                    name: 'eve-scout.com'
                };

                // get data from all Thera connections from current map -----------------------------------------------
                let currentConnectionsData = {};
                let systemTheraFound = false;
                if(systemThera){
                    systemTheraFound = true;
                    let currentConnections = MapUtil.searchConnectionsBySystems(map, [systemThera], '*');
                    currentConnectionsData = BaseModule.getConnectionsDataFromConnections(this._mapId, currentConnections);
                }else{
                    let systemDataThera = MapUtil.getSystemData(this._mapId, TheraModule.systemIdThera, 'systemId');
                    if(systemDataThera){
                        systemTheraFound = true;
                        let systemIdThera = MapUtil.getSystemId(this._mapId, systemDataThera.id);
                        let currentConnections = MapUtil.searchConnectionsBySystems(map, [systemIdThera], '*');
                        currentConnectionsData = BaseModule.getConnectionsDataFromConnections(this._mapId, currentConnections);
                    }
                }

                this._bodyEl.querySelector(`.${this._config.controlAreaTheraClass}`).classList.toggle('hidden', systemTheraFound);

                let dateNow = new Date();

                let tableDataPrimary = [];
                let tableDataSecondary = [];

                let formatSignatureData = data => ({
                    id: data.ids,
                    name: data.names.length ? data.names.map(name => name.substring(0, 3)).join(', ') : null,
                    type: {
                        name: data.labels.length ? data.labels.join(', ') : null
                    }
                });

                let equalPropVal = (val, prop = 'id') => b => b[prop] === val;

                // add mapped Thera connections (primary) -------------------------------------------------------------
                for(let currentConnectionData of Object.values(currentConnectionsData)){
                    let connectionId = BaseModule.Util.getObjVal(currentConnectionData, 'connection.id') || 0;
                    let updated = BaseModule.Util.getObjVal(currentConnectionData, 'connection.updated') || 0;
                    let source = currentConnectionData.source;
                    let target = currentConnectionData.target;
                    let connectionHash = BaseModule.getConnectionDataCacheKey(source.name, target.name);

                    // mapped connection not exists in eveScout data
                    let currentConnectionDataFull = MapUtil.getConnectionDataFromMapData(currentMapData, connectionId);
                    let connection = $().getConnectionById(this._mapId, connectionId);
                    let signatureTypeNames = MapUtil.getConnectionDataFromSignatures(connection, currentConnectionDataFull);

                    let sourceSignature = formatSignatureData(signatureTypeNames.source);
                    let targetSignature = formatSignatureData(signatureTypeNames.target);

                    // swap source <-> target. 'Thera' should be the source system
                    // -> In order to match the eve-scout response format for connections
                    if(target.name.toLowerCase() === 'thera'){
                        [source, target] = [target, source];
                        [sourceSignature, targetSignature] = [targetSignature, sourceSignature];
                    }

                    let whLabel = null;
                    let whSigId = 0;
                    for(let data of Object.values(signatureTypeNames)){
                        if(!data.labels){
                            continue;
                        }
                        let i = data.labels.findIndex(label => label !== 'K162');
                        if(i !== -1){
                            whLabel = data.labels[i];
                            whSigId = data.ids[i];
                            break;
                        }
                    }

                    // to calc the remaining lifetime of the wormhole, we need the 'created' date of linked sig.
                    // -> This is "hacky"! We re-search all signatures by whSigId === id... :(
                    let estimatedEol;
                    let maxStableTime = BaseModule.Util.getObjVal(Object.assign({}, Init.wormholes[whLabel]), 'maxStableTime');
                    if(maxStableTime && whSigId){
                        let whSignatureData = (BaseModule.Util.getObjVal(currentConnectionDataFull, 'signatures') || [])
                            .find(equalPropVal(whSigId));
                        let whSignatureCreated = BaseModule.Util.getObjVal(whSignatureData, 'created.created') || 0;
                        if(whSignatureCreated){
                            let createdDate = new Date( whSignatureCreated * 1000);
                            createdDate.setHours(createdDate.getHours() + maxStableTime);
                            //estimatedEol = Math.floor(createdDate.getTime() / 1000);
                            estimatedEol = createdDate.toISOString();
                        }
                    }

                    let rowData = {
                        id: getGroupedRowId(groupDataMap, connectionHash),
                        hash: connectionHash,
                        scope: BaseModule.Util.getObjVal(currentConnectionData, 'connection.scope'),
                        type: BaseModule.Util.getObjVal(currentConnectionData, 'connection.type'),
                        source: (({id:realId, systemId:id, name, trueSec, constellation, region}) =>
                            ({
                                realId,
                                id,
                                name,
                                trueSec,
                                constellation,
                                region
                            }))(MapUtil.getSystemDataFromMapData(currentMapData, source.id)),
                        target: (({id:realId, systemId:id, name, trueSec, constellation, region}) =>
                            ({
                                realId,
                                id,
                                name,
                                trueSec,
                                constellation,
                                region
                            }))(MapUtil.getSystemDataFromMapData(currentMapData, target.id)),
                        sourceSignature: sourceSignature,
                        targetSignature: targetSignature,
                        wormholeLabel: whLabel,
                        syncStatus: 'warning',
                        rowGroupData: groupDataMap,
                        connectionId: connectionId,
                        fakeConnection: BaseModule.getFakeConnectionElement(currentConnectionData),
                        estimatedEol: estimatedEol,
                        updated: updated,
                        updatedHash: [updated, signatureTypeNames.hash].join().hashCode()
                    };

                    tableDataPrimary.push(rowData);
                }

                // add EveScout Thera connections (secondary) ---------------------------------------------------------
                for(let rowData of connectionsData){
                    let systemNameSource = BaseModule.Util.getObjVal(rowData, 'source.name');
                    let systemNameTarget = BaseModule.Util.getObjVal(rowData, 'target.name');
                    let connectionHash = BaseModule.getConnectionDataCacheKey(systemNameSource, systemNameTarget);

                    let whLabel = BaseModule.Util.getObjVal(rowData, 'sourceSignature.type.name') || null;
                    if(!whLabel){
                        whLabel = BaseModule.Util.getObjVal(rowData, 'targetSignature.type.name') || null;
                    }

                    let massType = BaseModule.Util.getObjVal(Object.assign({}, Init.wormholes[whLabel]), 'size.type');
                    let connectionType = [...rowData.type, massType];

                    // overwrite eveScout id with new id (hash)
                    rowData.id = getGroupedRowId(groupDataEveScout, connectionHash);
                    rowData.hash = connectionHash;
                    rowData.wormholeLabel = whLabel;
                    rowData.syncStatus = null;
                    rowData.rowGroupData = groupDataEveScout;
                    rowData.connectionId = null;
                    rowData.type = connectionType;
                    rowData.fakeConnection = BaseModule.getFakeConnectionElement(BaseModule.getFakeConnectionData(
                        {system: systemNameSource},
                        {system: systemNameTarget},
                        rowData.scope,
                        rowData.type
                    ));
                    rowData.updatedHash = String(rowData.updated).hashCode();
                    tableDataSecondary.push(rowData);
                }

                // + Merge Primary + Secondary table data -------------------------------------------------------------
                for(let primaryRowData of tableDataPrimary){
                    let secondaryIndex = tableDataSecondary.findIndex(equalPropVal(primaryRowData.hash, 'hash'));
                    if(secondaryIndex !== -1){
                        // get a new hash key from both 'updated' values (primary + secondary) tableData
                        // -> if a signature gets updated on map, table row should be updated, too
                        // -> so we can check it later on if either prim. or sec. data has changed...
                        let updatedHash = [
                            primaryRowData.updatedHash,
                            tableDataSecondary[secondaryIndex].updatedHash
                        ].join().hashCode();

                        primaryRowData.syncStatus = 'success';
                        primaryRowData.relRowId = tableDataSecondary[secondaryIndex].id;
                        primaryRowData.updatedHash = updatedHash;

                        // remove from secondary table data -> no duplicated rows
                        //tableDataSecondary.splice(secondaryIndex, 1);

                        tableDataSecondary[secondaryIndex].syncStatus = 'hint';
                        tableDataSecondary[secondaryIndex].relRowId = primaryRowData.id;
                        tableDataSecondary[secondaryIndex].updatedHash = updatedHash;
                    }
                }

                let tableData = [...tableDataPrimary, ...tableDataSecondary];

                // update table data ----------------------------------------------------------------------------------
                for(let rowData of tableData){
                    let rowId = this.getRowById(this._tableApi, rowData.id);

                    if(rowId){
                        // update row
                        let api = this._tableApi.row('#' + rowId);
                        let rowDataCurrent = api.data();

                        // check for update
                        if(
                            BaseModule.Util.getObjVal(rowDataCurrent, 'updatedHash') !==
                            BaseModule.Util.getObjVal(rowData, 'updatedHash')
                        ){
                            // row data changed -> update
                            api.data(rowData);
                            api.nodes().to$().data('animationStatus', 'changed');
                            notificationCounter.changed++;
                        }

                        touchedRows.push(api.id());
                    }else{
                        // insert new row
                        let api = this._tableApi.row.add(rowData);
                        api.nodes().to$().data('animationStatus', 'added');
                        notificationCounter.added++;

                        touchedRows.push(api.id());
                    }
                }

                let api = this._tableApi.rows((idx, data, node) => !touchedRows.includes(node.id));
                notificationCounter.deleted += api.ids().count();
                api.remove();

                if(Math.max(...Object.values(notificationCounter))){
                    this._tableApi.draw();
                }

                // show notification ----------------------------------------------------------------------------------
                let notification = Object.keys(notificationCounter).reduce((acc, key) => {
                    return `${acc}${notificationCounter[key] ? `${notificationCounter[key]} ${key}<br>` : ''}`;
                }, '');

                if(hadData && notification.length){
                    this.showNotify({title: 'Thera connections updated', text: notification, type: 'success', textTrusted: true});
                }
            }else{
                console.warn('Table update failed for Thera connections. MapData is missing');
            }
        }

        /**
         * set module observer
         */
        setModuleObserver(){

            // add Thera system
            this._bodyEl.querySelector(`.${this._config.controlAreaTheraClass}`).addEventListener('click', e => {
                this.showNewSystemDialog({
                    systemData: {
                        id: TheraModule.systemIdThera,
                        name: 'Thera'
                    }
                }, true);
            }, false);

            // signature column - "type" popover
            MapUtil.initWormholeInfoTooltip(
                $(this.moduleElement).find('.' + this._config.globalTheraTableClass),
                `.${this._config.tableCellTypeClass} span[class^="pf-system-sec-"]`
            );

            // init tooltips
            $(this.moduleElement).initTooltips();
        }

        /**
         * update module
         * compare data and update module
         * @param mapId
         * @returns {Promise}
         */
        update(mapId){
            return super.update(mapId).then(mapId => new Promise(resolve => {
                this.getTheraConnectionsData('callbackUpdateTableRows');

                resolve({
                    action: 'update',
                    data: {
                        module: this
                    }
                });
            }));
        }
    };

    TheraModule.isPlugin = false;                                   // module is defined as 'plugin'
    TheraModule.scope = 'global';                                   // module scope controls how module gets updated and what type of data is injected
    TheraModule.sortArea = 'b';                                     // default sortable area
    TheraModule.position = 3;                                       // default sort/order position within sortable area
    TheraModule.label = 'Thera';                                    // static module label (e.g. description)
    TheraModule.systemIdThera = 31000005;
    TheraModule.ttlEveScoutResponse = 120;

    TheraModule.defaultConfig = {
        className: 'pf-global-thera-module',                        // class for module
        sortTargetAreas: ['a', 'b', 'c'],                           // sortable areas where module can be dragged into
        headline: 'Thera Connection',

        // Thera module
        theraTableId: 'pf-thera-table-',                            // id prefix for all tables in module
        theraTableRowIdPrefix: 'pf-thera-row-',                     // id prefix for table rows
        globalTheraTableClass: 'pf-global-thera-table',             // class for NPC owned stations table
        controlAreaTheraClass: 'pf-global-thera-control',           // class for "thera system exists" label

        // fonts
        fontUppercaseClass: 'pf-font-uppercase',                    // class for "uppercase" font
        linkClass: 'pf-link',

        // Thera connections table
        tableCellTypeClass: 'pf-table-type-cell',                   // class for "type" cells
        tableCellEllipsisClass: 'pf-table-cell-ellipses-auto',      // class for table "ellipsis" cells
        tableCellActionClass: 'pf-table-action-cell'
    };

    return TheraModule;
});