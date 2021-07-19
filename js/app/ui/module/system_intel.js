/**
 * System intel module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'module/base',
    'bootbox',
    'app/counter'
], ($, Init, Util, BaseModule, bootbox, Counter) => {
    'use strict';

    let SystemIntelModule = class SystemIntelModule extends BaseModule {
        constructor(config = {}) {
            super(Object.assign({}, new.target.defaultConfig, config));
        }

        /**
         * get status icon for structure
         * @param statusData
         * @returns {string}
         */
        getIconForStatusData(statusData){
            return '<i class="fas fa-fw fa-circle ' + statusData.class + '" title="' + statusData.label + '"></i>';
        }

        /**
         * get icon that marks a table cell as clickable
         * @returns {string}
         */
        getIconForInformationWindow(){
            return '<i class="fas fa-fw fa-id-card ' + this._config.tableCellActionIconClass + '" title="open ingame" data-toggle="tooltip"></i>';
        }

        /**
         * get a dataTableApi instance from global cache
         * @param mapId
         * @param systemId
         * @param tableType
         * @returns {*}
         */
        getDataTableInstance(mapId, systemId, tableType){
            return BaseModule.Util.getDataTableInstance(this._config.intelTableId, mapId, systemId, tableType);
        }

        /**
         * get dataTable id
         * @param {...string} parts  e.g. 'tableType', 'mapId', 'systemId'
         * @returns {string}
         */
        getTableId(...parts){
            return BaseModule.Util.getTableId(this._config.intelTableId, ...parts);
        }

        /**
         * get dataTable row id
         * @param tableType
         * @param id
         * @returns {string}
         */
        getRowId(tableType, id){
            return BaseModule.Util.getTableRowId(this._config.intelTableRowIdPrefix, tableType, id);
        }

        /**
         * get <tr> DOM id by id
         * @param tableApi
         * @param id
         * @returns {*}
         */
        getRowById(tableApi, id){
            return tableApi.rows().ids().toArray().find(rowId => rowId === this.getRowId(BaseModule.Util.getObjVal(this.getTableMetaData(tableApi), 'type'), id));
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
         * vormat roman numeric string to int
         * -> e.g. 'VII' => 7
         * @param str
         * @returns {number}
         */
        romanToInt(str){
            let charToTnt = char => {
                switch (char) {
                    case 'I': return 1;
                    case 'V': return 5;
                    case 'X': return 10;
                    case 'L': return 50;
                    case 'C': return 100;
                    case 'D': return 500;
                    case 'M': return 1000;
                    default: return -1;
                }
            };

            if(str == null) return -1;
            let num = charToTnt(str.charAt(0));
            let pre, curr;

            for(let i = 1; i < str.length; i++){
                curr = charToTnt(str.charAt(i));
                pre = charToTnt(str.charAt(i - 1));
                if(curr <= pre){
                    num += curr;
                }else{
                    num = num - pre * 2 + curr;
                }
            }

            return num;
        }

        /**
         * render module
         * @param mapId
         * @param systemData
         * @returns {HTMLElement}
         */
        render(mapId, systemData){
            this._systemData = systemData;
            let showStationTable = ['H', 'L', '0.0', 'T', 'C12'].includes(Util.getObjVal(this._systemData, 'security'));

            this._bodyEl = Object.assign(document.createElement('div'), {
                className: this._config.bodyClassName
            });
            this.moduleElement.append(this._bodyEl);

            $(this.moduleElement).showLoadingAnimation();

            this.initStructureTable();
            if(showStationTable){
                this.initStationTable();
            }

            this.setModuleObserver();

            return this.moduleElement;
        }

        /**
         * init 'Structure' table
         */
        initStructureTable(){
            let module = this;
            let corporationId = Util.getCurrentUserInfo('corporationId');

            let structureTableEl = document.createElement('table');
            structureTableEl.id = module.getTableId('structure', module._systemData.mapId, module._systemData.id);
            structureTableEl.classList.add('compact', 'stripe', 'order-column', 'row-border', 'pf-table-fixed', module._config.systemStructuresTableClass);
            this._bodyEl.append(structureTableEl);

            let structureDataTableOptions = {
                pfMeta: {
                    type: 'structures'
                },
                order: [[10, 'desc' ], [0, 'asc' ]],
                rowId: rowData => module.getRowId('structures', rowData.id),
                select: {
                    style: 'os',
                    selector: 'td:not(.' + module._config.tableCellActionClass + ')'
                },
                language: {
                    emptyTable:  'No structures recorded',
                    info: '_START_ to _END_ of _MAX_',
                    infoEmpty: ''
                },
                columnDefs: [
                    {
                        targets: 0,
                        name: 'status',
                        title: '',
                        width: 2,
                        className: ['text-center', 'all'].join(' '),
                        data: 'status',
                        render: {
                            display: data => module.getIconForStatusData(data),
                            sort: data => data.id
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            $(cell).find('i').tooltip();
                        }
                    },{
                        targets: 1,
                        name: 'structureImage',
                        title: '',
                        width: 24,
                        orderable: false,
                        className: [module._config.tableCellImageClass, 'text-center', 'all'].join(' '),
                        data: 'structure.id',
                        defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                        render: {
                            _: function(data, type, row, meta){
                                let value = data;
                                if(type === 'display' && value){
                                    value = '<img src="' + Util.eveImageUrl('types', value, 64) +'"/>';
                                }
                                return value;
                            }
                        }
                    },{
                        targets: 2,
                        name: 'structureType',
                        title: 'type',
                        width: 30,
                        className: [module._config.tableCellEllipsisClass, 'all'].join(' '),
                        data: 'structure.name',
                        defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                    },{
                        targets: 3,
                        name: 'name',
                        title: 'name',
                        width: 60,
                        className: [module._config.tableCellEllipsisClass, 'all'].join(' '),
                        data: 'name'
                    },{
                        targets: 4,
                        name: 'ownerImage',
                        title: '',
                        width: 24,
                        orderable: false,
                        className: [module._config.tableCellImageClass, 'text-center', 'all'].join(' '),
                        data: 'owner.id',
                        defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                        render: {
                            _: function(data, type, row, meta){
                                let value = data;
                                if(type === 'display' && value){
                                    value = '<a href="https://zkillboard.com/corporation/' + data + '/" target="_blank" rel="noopener">';
                                    value += '<img src="' + Util.eveImageUrl('corporations', data, 64) + '"/>';
                                    value += '</a>';
                                }
                                return value;
                            }
                        }
                    },{
                        targets: 5,
                        name: 'ownerName',
                        title: 'owner',
                        width: 50,
                        className: [module._config.tableCellEllipsisClass, 'all'].join(' '),
                        data: 'owner.name',
                        defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                    },{
                        targets: 6,
                        name: 'note',
                        title: 'note',
                        className: [module._config.tableCellEllipsisClass, 'all', Util.config.popoverTriggerClass, module._config.tableCellPopoverClass].join(' '),
                        data: 'description'
                    },{
                        targets: 7,
                        name: 'updated',
                        title: 'updated',
                        width: 60,
                        className: ['text-right', module._config.tableCellCounterClass, 'not-screen-l'].join(' '),
                        data: 'updated.updated'
                    },{
                        targets: 8,
                        name: 'edit',
                        title: '',
                        orderable: false,
                        width: 10,
                        className: ['text-center', module._config.tableCellActionClass, module._config.moduleHeadlineIconClass, 'all'].join(' '),
                        data: null,
                        render: {
                            display: data => {
                                let icon = '<i class="fas fa-pen"></i>';
                                if(data.rowGroupData.id !== corporationId){
                                    icon = '';
                                }
                                return icon;
                            }
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            if($(cell).is(':empty')){
                                $(cell).removeClass(module._config.tableCellActionClass + ' ' + module._config.moduleHeadlineIconClass);
                            }else{
                                $(cell).on('click', function(e){
                                    let rowData = null;
                                    let bulkData = null;
                                    // check if multiple rows are selected + current row is one of them -> bulk edit
                                    let rowsSelected = tableApi.rows({selected: true});
                                    if(rowsSelected.count() && tableApi.row(rowIndex, {selected: true}).count()){
                                        bulkData = [...new Set(rowsSelected.data().toArray().map(rowData => ({id: rowData.id})))];
                                    }else{
                                        // get current row data (important!)
                                        // -> "rowData" param is not current state, values are "on createCell()" state
                                        rowData = tableApi.row( $(cell).parents('tr')).data();
                                    }

                                    module.showStructureDialog(tableApi, rowData, bulkData);
                                });
                            }
                        }
                    },{
                        targets: 9,
                        name: 'delete',
                        title: '',
                        orderable: false,
                        width: 10,
                        className: ['text-center', module._config.tableCellActionClass, 'all'].join(' '),
                        data: null,
                        render: {
                            display: data => {
                                let icon = '<i class="fas fa-times txt-color txt-color-redDark"></i>';
                                if(data.rowGroupData.id !== corporationId){
                                    icon = '<i class="fas fa-ban txt-color txt-color-grayLight" title="restricted" data-placement="left"></i>';
                                }
                                return icon;
                            }
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            if($(cell).find('.fa-ban').length){
                                $(cell).removeClass(module._config.tableCellActionClass + ' ' + module._config.moduleHeadlineIconClass);
                                $(cell).find('i').tooltip();
                            }else{
                                let confirmationSettings = {
                                    title: '---',
                                    template: Util.getConfirmationTemplate(null, {
                                        size: 'small',
                                        noTitle: true
                                    }),
                                    onConfirm : function(e, target){
                                        // get current row data (important!)
                                        // -> "rowData" param is not current state, values are "on createCell()" state
                                        rowData = tableApi.row( $(cell).parents('tr')).data();

                                        // let deleteRowElement = $(cell).parents('tr');
                                        // tableApi.rows(deleteRowElement).remove().draw();

                                        $(module.moduleElement).showLoadingAnimation();
                                        Util.request('DELETE', 'Structure', rowData.id, {},
                                            {
                                                tableApi: tableApi
                                            },
                                            () => $(module.moduleElement).hideLoadingAnimation()
                                        ).then(
                                            payload => module.callbackDeleteStructures(payload.context, payload.data),
                                            Util.handleAjaxErrorResponse
                                        );
                                    }
                                };

                                // init confirmation dialog
                                $(cell).confirmation(confirmationSettings);
                            }
                        }
                    },{
                        targets: 10,
                        name: 'rowGroupData',
                        className: 'never',     // never show this column. see: https://datatables.net/extensions/responsive/classes
                        data: 'rowGroupData',
                        visible: false,
                        render: {
                            sort: function(data){
                                return data.name;
                            }
                        }
                    }
                ],
                initComplete: function(settings){
                    // table data is load in updateModule() method
                    // -> no need to trigger additional ajax call here for data
                    // -> in case table update failed -> each if this initComplete() function finished before table updated
                    // e.g. return now promise in getModule() function

                    Counter.initTableCounter(this, ['updated:name'], 'd');
                }
            };

            this._tableApiStructure = $(structureTableEl).DataTable($.extend(true, {}, module.getDataTableDefaults(module), structureDataTableOptions));

            // "Responsive" Datatables Plugin
            new $.fn.dataTable.Responsive(this._tableApiStructure);

            this._tableApiStructure.on('responsive-resize', function(e, tableApi, columns){
                // rowGroup length changes as well -> trigger draw() updates rowGroup length (see drawCallback())
                tableApi.draw();
            });

            // "Select" Datatables Plugin
            this._tableApiStructure.select();

            this._tableApiStructure.on('user-select', function(e, tableApi, type, cell, originalEvent){
                let rowData = tableApi.row(cell.index().row).data();
                if(Util.getObjVal(rowData, 'rowGroupData.id') !== corporationId){
                    e.preventDefault();
                }
            });

            // "Buttons" Datatables Plugin
            let buttons = new $.fn.dataTable.Buttons(this._tableApiStructure, {
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
                        name: 'add',
                        className: 'fa-plus',
                        titleAttr: 'add',
                        attr:  {
                            'data-toggle': 'tooltip',
                            'data-html': true
                        },
                        action: function(e, tableApi, node, config){
                            module.showStructureDialog(tableApi);
                        }
                    },
                    {
                        name: 'selectToggle',
                        className: ['fa-check-double'].join(' '),
                        titleAttr: 'select&nbsp;all',
                        attr:  {
                            'data-toggle': 'tooltip',
                            'data-html': true
                        },
                        action: function(e, tableApi, node, config){
                            let indexes = tableApi.rows().eq(0).filter(rowIdx => {
                                return Util.getObjVal(tableApi.cell(rowIdx, 'rowGroupData:name').data(), 'id') === corporationId;
                            });

                            let rowCountAll = tableApi.rows(indexes).count();
                            let rowCountSelected = tableApi.rows({selected: true}).count();
                            if(rowCountSelected && (rowCountSelected >= rowCountAll)){
                                tableApi.rows().deselect();
                                node.removeClass('active');
                            }else{
                                tableApi.rows(indexes).select();
                                node.addClass('active');
                            }
                        }
                    },
                    {
                        name: 'dScan',
                        className: 'fa-paste',
                        titleAttr: 'D-Scan&nbsp;reader',
                        attr:  {
                            'data-toggle': 'tooltip',
                            'data-html': true
                        },
                        action: function(e, tableApi, node, config){
                            module.showDscanReaderDialog(tableApi);
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
                            $(module.moduleElement).showLoadingAnimation();

                            Util.request('GET', 'System', module._systemData.id, {mapId: module._systemData.mapId},
                                {
                                    tableApi: tableApi,
                                    removeMissing: true
                                },
                                context => $(module.moduleElement).hideLoadingAnimation()
                            ).then(payload => module.callbackUpdateTableRows(payload.context, Util.getObjVal(payload.data, 'structures')));
                        }
                    }
                ]
            });

            this._tableApiStructure.buttons().container().appendTo(module.moduleElement.querySelector('.' + module._config.headClassName));
        }

        /**
         * init 'Station' table
         */
        initStationTable(){
            let module = this;

            this._bodyEl.append(module.newHeaderElement(module._config.headlineSub));

            let stationTableEl = document.createElement('table');
            stationTableEl.id = module.getTableId('station', module._systemData.mapId, module._systemData.id);
            stationTableEl.classList.add('compact', 'stripe', 'order-column', 'row-border', 'pf-table-fixed', module._config.systemStationsTableClass);
            this._bodyEl.append(stationTableEl);

            let stationDataTableOptions = {
                pfMeta: {
                    type: 'stations'
                },
                order: [[1, 'asc' ], [8, 'asc' ]],
                rowId: rowData => module.getRowId('stations', rowData.id),
                language: {
                    emptyTable: 'No stations found',
                    info: '_START_ to _END_ of _MAX_',
                    infoEmpty: ''
                },
                columnDefs: [
                    {
                        targets: 0,
                        name: 'stationImage',
                        title: '',
                        width: 24,
                        orderable: false,
                        className: [module._config.tableCellImageClass, 'text-center', 'all'].join(' '),
                        data: 'type.id',
                        defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                        render: {
                            _: function(data, type, row, meta){
                                let value = data;
                                if(type === 'display' && value){
                                    value = '<img src="' + Util.eveImageUrl('types', value, 64) +'"/>';
                                }
                                return value;
                            }
                        }
                    },{
                        targets: 1,
                        name: 'count',
                        title: '',
                        width: 5,
                        className: ['text-center', 'all'].join(' '),
                        data: 'name',
                        render: {
                            _: function(cellData, type, rowData, meta){
                                let value = '';
                                if(cellData){
                                    // "grouped" regex not supported by FF
                                    // let matches = /^(?<system>[a-z0-9\s\-]+) (?<count>[MDCLXVI]+) .*$/i.exec(cellData);
                                    // let count = Util.getObjVal(matches, 'groups.count');
                                    let matches = /^([a-z0-9\s\-]+) ([MDCLXVI]+) .*$/i.exec(cellData);
                                    let count = Util.getObjVal(matches, '2');

                                    if(type === 'display'){
                                        value = count || 0;
                                    }else{
                                        value = module.romanToInt(count) || '';
                                    }
                                }

                                return value;
                            }
                        }
                    },{
                        targets: 2,
                        name: 'name',
                        title: 'station',
                        className: [module._config.tableCellEllipsisClass, 'all'].join(' '),
                        data: 'name',
                        render: {
                            _: function(cellData, type, rowData, meta){
                                let value = cellData;
                                if(cellData){
                                    // "grouped" regex not supported by FF
                                    // let matches = /^(?<system>[a-z0-9\s\-]+) (?<count>[MDCLXVI]+) (?<label>\(\w+\)\s)?\- (?<moon>moon (?<moonCount>\d)+)?.*$/i.exec(cellData);
                                    let matches = /^([a-z0-9\s\-]+) ([MDCLXVI]+) (\(\w+\)\s)?\- (moon (\d)+)?.*$/i.exec(cellData);
                                    let systemName = Util.getObjVal(matches, '1');
                                    let count = Util.getObjVal(matches, '2');
                                    let moon = Util.getObjVal(matches, '4');
                                    if(systemName === (Util.getObjVal(module._systemData, 'name') || '')){
                                        value = value.slice(systemName.length).trim();
                                        if(count){
                                            value = value.slice(count.length).trimLeftChars(' \-');
                                        }
                                        if(moon){
                                            let moonCount = Util.getObjVal(matches, '5');
                                            value = value.replace(moon, 'M' + moonCount);
                                        }
                                    }
                                }
                                return value;
                            }
                        }
                    },{
                        targets: 3,
                        name: 'stationType',
                        title: 'type',
                        width: 100,
                        className: [module._config.tableCellEllipsisClass, 'not-screen-l'].join(' '),
                        data: 'type.name',
                        defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                        render: {
                            display: (cellData, type, rowData, meta) => {
                                let value = cellData;
                                if(value){
                                    let rowGroupDataName = Util.getObjVal(rowData, 'rowGroupData.name') || '';
                                    if(value.indexOf(rowGroupDataName) === 0){
                                        value = value.slice(rowGroupDataName.length).trim();
                                    }
                                }
                                return value;
                            }
                        }
                    },{
                        targets: 4,
                        name: 'ownerImage',
                        title: '',
                        width: 24,
                        orderable: false,
                        className: [module._config.tableCellImageClass, 'text-center', 'all'].join(' '),
                        data: 'corporation.id',
                        defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                        render: {
                            _: function(data, type, row, meta){
                                let value = data;
                                if(type === 'display' && value){
                                    value = '<a href="https://zkillboard.com/corporation/' + data + '/" target="_blank" rel="noopener">';
                                    value += '<img src="' + Util.eveImageUrl('corporations', data, 64) + '"/>';
                                    value += '</a>';
                                }
                                return value;
                            }
                        }
                    },{
                        targets: 5,
                        name: 'ownerName',
                        title: 'owner',
                        width: 80,
                        className: [module._config.tableCellActionClass, module._config.tableCellEllipsisClass, 'all'].join(' '),
                        data: 'corporation',
                        defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                        render: {
                            _: function(data, type, row, meta){
                                let value = data.name;
                                if(type === 'display'){
                                    value += '&nbsp;' + module.getIconForInformationWindow();
                                }
                                return value;
                            }
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            // open corporation information window (ingame)
                            $(cell).on('click', { tableApi: this.api() }, function(e){
                                let cellData = e.data.tableApi.cell(this).data();
                                Util.openIngameWindow(cellData.id);
                            });
                        }
                    },{
                        targets: 6,
                        title: '<i title="set&nbsp;destination" data-toggle="tooltip" class="fas fa-flag text-right"></i>',
                        orderable: false,
                        searchable: false,
                        width: 10,
                        class: [module._config.tableCellActionClass, module._config.moduleHeadlineIconClass, 'text-center', 'all'].join(' '),
                        data: 'id',
                        render: {
                            display: (cellData, type, rowData, meta) => {
                                if(cellData){
                                    return '<i class="fas fa-flag"></i>';
                                }
                            }
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            $(cell).on('click', function(e){
                                Util.setDestination('set_destination', 'station', {id: cellData, name: rowData.name});
                            });
                        }
                    },{
                        targets: 7,
                        title: '<i title="services" data-toggle="tooltip" class="fas fa-tools text-right"></i>',
                        orderable: false,
                        searchable: false,
                        width: 10,
                        class: [
                            module._config.tableCellActionClass,
                            module._config.moduleHeadlineIconClass,
                            module._config.tableCellServicesClass,
                            Util.config.popoverTriggerClass, 'text-center', 'all'
                        ].join(' '),
                        data: 'services',
                        defaultContent: '<i class="fas fa-ban txt-color txt-color-grayLight"></i>',
                        render: {
                            display: (cellData, type, rowData, meta) => {
                                if(cellData && cellData.length){
                                    return '<i class="fas fa-tools"></i>';
                                }
                            }
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let cellElement = $(cell);
                            if(cellElement.find('.fa-ban').length){
                                cellElement.removeClass(module._config.tableCellActionClass + ' ' + module._config.moduleHeadlineIconClass);
                            }
                        }
                    },{
                        targets: 8,
                        name: 'rowGroupData',
                        className: 'never',     // never show this column. see: https://datatables.net/extensions/responsive/classes
                        data: 'rowGroupData',
                        visible: false,
                        render: {
                            sort: function(data){
                                return data.name;
                            }
                        }
                    }
                ],
                initComplete: function(settings, json){
                    let tableApi = this.api();

                    module.initStationServiceTooltip(this, tableApi);
                }
            };

            this._tableApiStation = $(stationTableEl).DataTable($.extend(true, {}, module.getDataTableDefaults(module), stationDataTableOptions));

            new $.fn.dataTable.Responsive(this._tableApiStation);

            this._tableApiStation.on('responsive-resize', function(e, tableApi, columns){
                // rowGroup length changes as well -> trigger draw() updates rowGroup length (see drawCallback())
                tableApi.draw();
            });
        }

        /**
         *
         * @param module
         * @returns {*}
         */
        getDataTableDefaults(module){
            return {
                paging: false,
                lengthChange: false,
                ordering: true,
                info: false,
                searching: false,
                hover: false,
                autoWidth: false,
                drawCallback: function(settings){
                    let tableApi = this.api();
                    let columnCount = tableApi.columns(':visible').count();
                    let rows = tableApi.rows({page: 'current'}).nodes();
                    let last = null;

                    tableApi.column('rowGroupData:name', {page: 'current'}).data().each(function(group, i){
                        if (!last || last.id !== group.id) {
                            // "stations" are grouped by "raceId" with its "factionId"
                            // "structures" are grouped by "corporationId" that ADDED it (not the ingame "owner" of it)
                            let imgType = 'stations' === group.groupedDataKey ? 'factions' : 'corporations';

                            $(rows).eq(i).before(
                                '<tr class="group">' +
                                '<td></td>' +
                                '<td class="text-right ' + module._config.tableCellImageClass + '">' +
                                '<img src="' + Util.eveImageUrl(imgType, group.id, 64) + '"/>' +
                                '</td>' +
                                '<td colspan="' + Math.max((columnCount - 2), 1) + '">' + group.name + '</td>' +
                                '</tr>'
                            );
                            last = group;
                        }
                    });

                    let animationRows = rows.to$().filter(function(){
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
                }
            };
        }

        /**
         * show structure dialog
         * @param tableApi
         * @param structureData
         * @param bulkData
         */
        showStructureDialog(tableApi, structureData = null, bulkData = null){
            let structureStatusData = Util.getObjVal(Init, 'structureStatus');

            let statusData = Object.keys(structureStatusData).map((k) => {
                let data = structureStatusData[k];
                data.selected = data.id === Util.getObjVal(structureData, 'status.id');
                return data;
            });

            // if current user is currently docked at a structure (not station)
            // -> add a modal button for pre-fill modal with it
            // -> systemId must match systemId from current character log
            let currentUserData = Util.getCurrentUserData();
            let characterStructureId = Util.getCurrentCharacterData('log.structure.id') || 0;
            let characterStructureName = Util.getCurrentCharacterData('log.structure.name') || '';
            let characterStructureTypeId = Util.getCurrentCharacterData('log.structure.type.id') || 0;
            let characterStructureTypeName = Util.getCurrentCharacterData('log.structure.type.name') || '';
            let isCurrentLocation = false;

            if(this._systemData.id ===  Util.getCurrentCharacterData('log.system.id')){
                isCurrentLocation = true;
            }

            let disableButtonAutoFill = true;
            let buttonLabelAutoFill = '<i class="fas fa-fw fa-map-marker-alt"></i>&nbsp;';
            if(characterStructureId){
                buttonLabelAutoFill += characterStructureTypeName + ' "' + characterStructureName + '"';
                if(isCurrentLocation){
                    disableButtonAutoFill = false;
                }
            }else{
                buttonLabelAutoFill += 'unknown structure';
            }

            let data = {
                id: this._config.structureDialogId,
                structureData: structureData,
                bulkData: bulkData,
                structureStatus: statusData,
                nameInputId: this._config.nameInputId,
                statusSelectId: this._config.statusSelectId,
                typeSelectId: this._config.typeSelectId,
                corporationSelectId: this._config.corporationSelectId,
                descriptionTextareaId: this._config.descriptionTextareaId,
                descriptionTextareaCharCounter: this._config.descriptionTextareaCharCounter,
                maxDescriptionLength: SystemIntelModule.maxDescriptionLength
            };

            requirejs(['text!templates/dialog/structure.html', 'mustache'], (template, Mustache) => {
                let content = Mustache.render(template, data);
                let title = 'Structure';
                if(bulkData){
                    title += ' <span class="txt-color txt-color-warning">&nbsp;(' + bulkData.length + ' rows)</span>&nbsp;';
                }

                let structureDialog = bootbox.dialog({
                    title: title,
                    message: content,
                    show: false,
                    buttons: {
                        close: {
                            label: 'cancel',
                            className: 'btn-default pull-left'
                        },
                        autoFill: {
                            label: buttonLabelAutoFill,
                            className: 'btn-primary' +
                                (disableButtonAutoFill ? ' pf-font-italic disabled' : '') +
                                (bulkData ? ' hidden' : ''),
                            callback: e => {
                                let form = $(e.delegateTarget).find('form');
                                form.find('#' + this._config.nameInputId).val(characterStructureName);
                                form.find('#' + this._config.statusSelectId).val(2).trigger('change');
                                form.find('#' + this._config.typeSelectId).val(characterStructureTypeId).trigger('change');
                                return false;
                            }
                        },
                        success: {
                            label: '<i class="fas fa-fw fa-check"></i>&nbsp;save',
                            className: 'btn-success',
                            callback: e => {
                                let form = $(e.delegateTarget).find('form');

                                // validate form
                                form.validator('validate');

                                // check whether the form is valid
                                let formValid = form.isValidForm();

                                if(formValid){
                                    // get form data
                                    let formData = form.getFormValues();
                                    formData.id = Util.getObjVal(structureData, 'id') | 0;
                                    formData.structureId = Util.getObjVal(formData, 'structureId') | 0;
                                    formData.corporationId = Util.getObjVal(formData, 'corporationId') | 0;
                                    formData.systemId = this._systemData.systemId | 0;

                                    $(this.moduleElement).showLoadingAnimation();

                                    let method = formData.id ? 'PATCH' : 'PUT';
                                    let ids = formData.id;
                                    let data = formData;

                                    if(bulkData){
                                        // bulk update multiple rows
                                        method = 'POST';
                                        ids = [];
                                        data = bulkData.map(structureData => {
                                            structureData.corporationId = formData.corporationId;
                                            return structureData;
                                        });
                                    }

                                    this.request(method, 'Structure', ids, data,
                                        {
                                            tableApi: tableApi
                                        },
                                        () => $(this.moduleElement).hideLoadingAnimation()
                                    ).then(
                                        payload => this.callbackUpdateTableRows(payload.context, payload.data),
                                        Util.handleAjaxErrorResponse
                                    );
                                }else{
                                    return false;
                                }
                            }
                        }
                    }
                });

                structureDialog.on('show.bs.modal', e => {
                    let modalContent = $('#' + this._config.structureDialogId);

                    // init type select live search
                    let selectElementType = modalContent.find('#' + this._config.typeSelectId);
                    selectElementType.initUniverseTypeSelect({
                        categoryIds: [65],
                        maxSelectionLength: 1,
                        selected: [Util.getObjVal(structureData, 'structure.id')]
                    });

                    // init corporation select live search
                    let selectElementCorporation = modalContent.find('#' + this._config.corporationSelectId);
                    selectElementCorporation.initUniverseSearch({
                        categoryNames: ['corporation'],
                        maxSelectionLength: 1
                    });

                    // init status select2
                    modalContent.find('#' + this._config.statusSelectId).initStatusSelect({
                        data: statusData
                    });

                    // init char counter
                    let textarea = modalContent.find('#' + this._config.descriptionTextareaId);
                    let charCounter = modalContent.find('.' + this._config.descriptionTextareaCharCounter);
                    Util.updateCounter(textarea, charCounter, SystemIntelModule.maxDescriptionLength);

                    textarea.on('keyup', function(){
                        Util.updateCounter($(this), charCounter, SystemIntelModule.maxDescriptionLength);
                    });

                    // set form validator (after select2 init finish)
                    modalContent.find('form').initFormValidation();
                });

                // show dialog
                structureDialog.modal('show');
            });
        }

        /**
         * show D-Scan reader dialog
         * @param tableApi
         */
        showDscanReaderDialog(tableApi){
            requirejs(['text!templates/dialog/dscan_reader.html', 'mustache'], (template, Mustache) => {
                let structureDialog = bootbox.dialog({
                    title: 'D-Scan reader',
                    message: Mustache.render(template, {}),
                    show: true,
                    buttons: {
                        close: {
                            label: 'cancel',
                            className: 'btn-default'
                        },
                        success: {
                            label: '<i class="fas fa-fw fa-paste fa-fw"></i>&nbsp;update intel',
                            className: 'btn-success',
                            callback: e => {
                                let form = $(e.delegateTarget).find('form');
                                let formData = form.getFormValues();

                                this.updateStructureTableByClipboard(formData.clipboard, {
                                    tableApi: tableApi
                                });
                            }
                        }
                    }
                });

                // dialog shown event
                structureDialog.on('shown.bs.modal', function(e){
                    // set focus on textarea
                    structureDialog.find('textarea').focus();
                });
            });
        }

        /**
         * callback -> add table rows from grouped tableData
         * @param context
         * @param tableData
         * @param groupedDataKey
         */
        callbackUpdateTableRows(context, tableData, groupedDataKey = 'structures'){
            let touchedRows = [];
            let hadData = context.tableApi.rows().any();
            let notificationCounter = {
                added: 0,
                changed: 0,
                deleted: 0
            };

            if(tableData){
                for(let [rowGroupId, rowGroupData] of Object.entries(tableData)){
                    if(rowGroupData[groupedDataKey] && rowGroupData[groupedDataKey].length){
                        for(let rowData of rowGroupData[groupedDataKey]){
                            let rowId = this.getRowById(context.tableApi, rowData.id);

                            // add rowGroupData as well to each rowData
                            rowData.rowGroupData = {
                                id: rowGroupData.id,
                                name: rowGroupData.name,
                                groupedDataKey: groupedDataKey
                            };

                            if(rowId){
                                // update row
                                let api = context.tableApi.row('#' + rowId);
                                let rowDataCurrent = api.data();

                                // check for update
                                if(Util.getObjVal(rowDataCurrent, 'updated.updated') !== Util.getObjVal(rowData, 'updated.updated')){
                                    // row data changed -> update
                                    api.data(rowData);
                                    notificationCounter.changed++;
                                }

                                touchedRows.push(api.id());
                            }else{
                                // insert new row
                                let api = context.tableApi.row.add(rowData);
                                api.nodes().to$().data('animationStatus', 'added');
                                notificationCounter.added++;

                                touchedRows.push(api.id());
                            }
                        }
                    }
                }
            }

            if(context.removeMissing){
                let api = context.tableApi.rows((idx, data, node) => !touchedRows.includes(node.id));
                notificationCounter.deleted += api.ids().count();
                api.remove();
            }

            if(Math.max(...Object.values(notificationCounter))){
                context.tableApi.draw();
            }

            // show notification --------------------------------------------------------------------------------------
            let notification = Object.keys(notificationCounter).reduce((acc, key) => {
                return `${acc}${notificationCounter[key] ? `${notificationCounter[key]} ${key}<br>` : ''}`;
            }, '');

            if(hadData && notification.length){
                this.showNotify({title: 'Structures updated', text: notification, type: 'success', textTrusted: true});
            }
        }


        /**
         * parse clipboard data for structures and update table
         * @param clipboard
         * @param context
         */
        updateStructureTableByClipboard(clipboard, context){

            let saveStructureData = (structureData, context) => {
                $(this.moduleElement).showLoadingAnimation();

                this.request('POST', 'Structure', [], structureData, context, () => $(this.moduleElement).hideLoadingAnimation())
                    .then(
                        payload => this.callbackUpdateTableRows(payload.context, payload.data),
                        Util.handleAjaxErrorResponse
                    );
            };

            let structureData = this.parseDscanString(this._systemData, clipboard);
            if(structureData.length){
                // valid structure data parsed

                // check if structures will be added to a system where character is currently in
                // if character is not in any system -> id === undefined -> no "confirmation required
                let currentLocationData = Util.getCurrentLocationData();
                if(
                    currentLocationData.id &&
                    currentLocationData.id !== this._systemData.systemId
                ){
                    let systemNameStr = (this._systemData.name === this._systemData.alias) ?
                        '"' + this._systemData.name + '"' :
                        '"' + this._systemData.alias + '" (' + this._systemData.name + ')';
                    systemNameStr = '<span class="txt-color txt-color-warning">' + systemNameStr + '</span>';

                    let msg = 'Update structures in ' + systemNameStr + ' ? This is not your current location, "' + currentLocationData.name + '" !';
                    bootbox.confirm(msg, result => {
                        if(result){
                            saveStructureData(structureData, context);
                        }
                    });
                }else{
                    saveStructureData(structureData, context);
                }
            }
        }

        /**
         * get universe typeIds for given categoryIds
         * @param categoryIds
         * @returns {Array}
         */
        getUniverseTypeIdsByCategoryIds(categoryIds){
            let typeIds = [];
            let mapIds = type => type.id;
            for(let categoryId of categoryIds){
                let categoryData = Util.getObjVal(Init, 'universeCategories.' + categoryId);
                if(categoryData && categoryData.groups){
                    for(let groupData of categoryData.groups){
                        if(groupData && groupData.types){
                            typeIds = typeIds.concat(groupData.types.map(mapIds));
                        }
                    }
                }
            }

            return typeIds;
        }

        /**
         * parse a copy&paste string from ingame dScan windows
         * @param systemData
         * @param clipboard
         * @returns {Array}
         */
        parseDscanString(systemData, clipboard){
            let dScanData = [];
            let structureTypeIds = this.getUniverseTypeIdsByCategoryIds([65]);

            if(clipboard.length){
                let dScanRows = clipboard.split(/\r\n|\r|\n/g);

                for(let rowData of dScanRows){
                    rowData = rowData.split(/\t/g);

                    if(rowData.length === 4){
                        rowData[0] = parseInt(rowData[0]);
                        // valid dScan result
                        if(structureTypeIds.indexOf( rowData[0] ) !== -1){
                            dScanData.push({
                                structureId: rowData[0],
                                name: rowData[1],
                                systemId: systemData.systemId
                            });
                        }
                    }
                }
            }

            return dScanData;
        }

        /**
         * callback -> delete structure rows
         * @param context
         * @param structureIds
         */
        callbackDeleteStructures(context, structureIds){
            let deletedCounter = 0;
            if(structureIds && structureIds.length){
                for(let structureId of structureIds){
                    let rowId = this.getRowById(context.tableApi, structureId);
                    if(rowId){
                        context.tableApi.row('#' + rowId).remove();
                        deletedCounter++;
                    }
                }
            }

            if(deletedCounter){
                context.tableApi.draw();
                Util.showNotify({title: 'Structure deleted', text: deletedCounter + ' deleted', type: 'success'});
            }
        }

        /**
         * init station services tooltips
         * @param element
         * @param tableApi
         */
        initStationServiceTooltip(element, tableApi){
            element.hoverIntent({
                over: function(e){
                    let cellElement = $(this);
                    let rowData = tableApi.row(cellElement.parents('tr')).data();
                    cellElement.addStationServiceTooltip(Util.getObjVal(rowData, 'services'), {
                        placement: 'left',
                        trigger: 'manual',
                        show: true
                    });
                },
                out: function(e){
                    $(this).destroyPopover();
                },
                selector: 'td.' + this._config.tableCellServicesClass
            });
        }

        /**
         * set module observer
         */
        setModuleObserver(){
            let module = this;
            let structureTableElement =  $(module.moduleElement).find('.' + module._config.systemStructuresTableClass);
            let tableApi = structureTableElement.DataTable();

            // init listener for global "past" dScan into this page
            $(module.moduleElement).on('pf:updateIntelModuleByClipboard', (e, clipboard) => {
                module.updateStructureTableByClipboard(clipboard, {
                    tableApi: tableApi
                });
            });

            // init popovers for some table cells
            $(module.moduleElement).hoverIntent({
                over: function(e){
                    let tableApi = module.getDataTableInstance(module._systemData.mapId, module._systemData.id, 'structure');

                    // simple <table> for layout (CSS)
                    let cellData = tableApi.cell(this).data();
                    if(cellData && cellData.length){
                        let content = '<table><tr><td>' + cellData.replace(/\r?\n/g, '<br />') + '</td></tr></table>';

                        let options = {
                            placement: 'top',
                            html: true,
                            trigger: 'manual',
                            container: 'body',
                            title: '',
                            content: content,
                            delay: {
                                show: 0,
                                hide: 0
                            },
                        };

                        $(this).popover(options).popover('show');
                    }
                },
                out: function(e){
                    $(this).destroyPopover();
                },
                selector: '.' + module._config.tableCellPopoverClass
            });

            // init tooltips
            $(this.moduleElement).initTooltips();
        }

        /**
         * update module
         * compare data and update module
         * @param systemData
         * @returns {Promise}
         */
        update(systemData){
            return super.update(systemData).then(systemData => new Promise(resolve => {
                // update structure table data ------------------------------------------------------------------------
                if(this._tableApiStructure){
                    let structureContext = {
                        tableApi: this._tableApiStructure,
                        removeMissing: true
                    };

                    this.callbackUpdateTableRows(structureContext, Util.getObjVal(systemData, 'structures'));
                }else{
                    console.warn('DataTable "structures" not initialized. Can not update "intel" module');
                }

                // update station table data --------------------------------------------------------------------------
                if(this._tableApiStation){
                    let stationContext = {
                        tableApi: this._tableApiStation,
                        removeMissing: false
                    };

                    this.callbackUpdateTableRows(stationContext, Util.getObjVal(systemData, 'stations'), 'stations');
                }

                $(this.moduleElement).hideLoadingAnimation();

                resolve({
                    action: 'update',
                    data: {
                        module: this
                    }
                });
            }));
        }

        /**
         * init module
         */
        init(){
            super.init();
        }
    };

    SystemIntelModule.isPlugin = false;                                         // module is defined as 'plugin'
    SystemIntelModule.scope = 'system';                                         // module scope controls how module gets updated and what type of data is injected
    SystemIntelModule.sortArea = 'b';                                           // default sortable area
    SystemIntelModule.position = 2;                                             // default sort/order position within sortable area
    SystemIntelModule.label = 'Structures';                                     // static module label (e.g. description)
    SystemIntelModule.fullDataUpdate = true;                                    // static module requires additional data (e.g. system description,...)

    SystemIntelModule.maxDescriptionLength = 512;

    SystemIntelModule.defaultConfig = {
        className: 'pf-system-intel-module',                                    // class for module
        sortTargetAreas: ['a', 'b', 'c'],                                       // sortable areas where module can be dragged into
        headline: 'Structures',
        headlineSub: 'Stations',

        // system intel module
        intelTableId: 'pf-intel-table-',                                        // id prefix for all tables in module
        intelTableRowIdPrefix: 'pf-intel-row-',                                 // id prefix for table rows
        systemStationsTableClass: 'pf-system-station-table',                    // class for NPC owned stations table
        systemStructuresTableClass: 'pf-system-structure-table',                // class for player owned structures table

        // structure dialog
        structureDialogId: 'pf-structure-dialog',                               // id for "structure" dialog
        nameInputId: 'pf-structure-dialog-name-input',                          // id for "name" input
        statusSelectId: 'pf-structure-dialog-status-select',                    // id for "status" select
        typeSelectId: 'pf-structure-dialog-type-select',                        // id for "type" select
        corporationSelectId: 'pf-structure-dialog-corporation-select',          // id for "corporation" select
        descriptionTextareaId: 'pf-structure-dialog-description-textarea',      // id for "description" textarea
        descriptionTextareaCharCounter: 'pf-form-field-char-count',             // class for "character counter" element for form field

        // dataTable
        tableCellImageClass: 'pf-table-image-smaller-cell',                     // class for table "image" cells
        tableCellCounterClass: 'pf-table-counter-cell',                         // class for table "counter" cells
        tableCellEllipsisClass: 'pf-table-cell-ellipses-auto',                  // class for table "ellipsis" cells
        tableCellActionClass: 'pf-table-action-cell',                           // class for "action" cells
        tableCellActionIconClass: 'pf-table-action-icon-cell',                  // class for table "action" icon (icon is part of cell content)
        tableCellServicesClass: 'pf-table-services-cell',                       // class for table station "services" cells
        tableCellPopoverClass: 'pf-table-popover-cell'                          // class for table cells with a "popover"
    };

    return SystemIntelModule;
});