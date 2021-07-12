/**
 * System signature module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'module/base',
    'bootbox',
    'app/counter',
    'app/map/map',
    'app/map/util',
    'app/ui/form_element'
], ($, Init, Util, BaseModule, bootbox, Counter, Map, MapUtil, FormElement) => {
    'use strict';

    let SystemSignatureModule = class SystemSignatureModule extends BaseModule {
        constructor(config = {}) {
            super(Object.assign({}, new.target.defaultConfig, config));
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
         * get dataTable id
         * @param {...string} parts  e.g. 'tableType', 'mapId', 'systemId'
         * @returns {string}
         */
        getTableId(...parts){
            return Util.getTableId(this._config.sigTableId, ...parts);
        }

        /**
         * get a dataTableApi instance from global cache
         * @param mapId
         * @param systemId
         * @param tableType
         * @returns {*}
         */
        getDataTableInstance(mapId, systemId, tableType){
            return Util.getDataTableInstance(this._config.sigTableId, mapId, systemId, tableType);
        }

        /**
         * Update/set tooltip for an element
         * @param element
         * @param title
         */
        updateTooltip(element, title){
            $(element).attr('title', title.toUpperCase()).tooltip('fixTitle').tooltip('setContent');
        }

        /**
         * get progressbar
         * @param progress
         * @returns {HTMLDivElement}
         */
        newProgressElement(progress = 0){
            let progressWrapperEl = document.createElement('div');
            progressWrapperEl.classList.add(this._config.moduleHeadlineProgressBarClass);

            let progressEl = document.createElement('div');
            progressEl.classList.add('progress', 'progress-micro');

            let barEl = document.createElement('div');
            barEl.classList.add('progress-bar', 'progress-bar-success');
            barEl.setAttribute('role', 'progressbar');
            barEl.setAttribute('aria-valuenow', progress.toString());
            barEl.setAttribute('aria-valuemin', '0');
            barEl.setAttribute('aria-valuemax', '100');
            barEl.style.width = progress + 'px';
            barEl.style.willChange = 'width';
            progressEl.append(barEl);
            progressWrapperEl.append(progressEl);

            return progressWrapperEl;
        }

        /**
         * module header
         * @returns {HTMLDivElement}
         */
        newHeaderElement(text){
            let headEl = super.newHeaderElement(text);

            let progressEl = this.newProgressElement();
            headEl.append(progressEl);

            let progressLabelEl = this.newHeadlineElement('0%');
            progressLabelEl.classList.add('progress-label-right');
            headEl.append(progressLabelEl);

            return headEl;
        }

        /**
         * render module
         * @param mapId
         * @param systemData
         * @returns {HTMLElement}
         */
        render(mapId, systemData){
            this._systemData = systemData;

            this._bodyEl = Object.assign(document.createElement('div'), {
                className: this._config.bodyClassName
            });
            this.moduleElement.append(this._bodyEl);

            $(this.moduleElement).showLoadingAnimation();

            // draw "new signature" add table
            this.drawSignatureTableNew();

            // draw signature table
            this.drawSignatureTable();

            this.setModuleObserver();

            return this.moduleElement;
        }

        /**
         * draw signature 'info' (preview) table in 'signatureReader' dialog
         * @param dialogElement
         * @returns {jQuery}
         */
        drawSignatureTableInfo(dialogElement){
            let module = this;

            let infoElement = $(dialogElement).find('#' + module._config.sigInfoId);

            let infoTableEl = document.createElement('table');
            infoTableEl.id = module.getTableId('info', module._systemData.mapId, module._systemData.id);
            infoTableEl.classList.add('display', 'compact', 'nowrap', module._config.sigTableClass, module._config.sigTableInfoClass);
            infoElement.append(infoTableEl);


            let dataTableOptions = {
                tabIndex: -1,
                dom: '<"flex-row flex-between"<"flex-col"l><"flex-col flex-grow ' + module._config.tableToolbarStatusClass + '"><"flex-col"fS>>' +
                    '<"flex-row"<"flex-col flex-grow"tr>>' +
                    '<"flex-row flex-between"<"flex-col"i><"flex-col"p>>',
                initComplete: function(settings, json){
                    let tableApi = this.api();

                    module.initCharacterInfoTooltip(this, tableApi);

                    tableApi.columns(['action:name']).visible(false);

                    Counter.initTableCounter(this, ['created:name', 'updated:name']);
                }
            };

            let tableApi = $(infoTableEl).DataTable($.extend(true, dataTableOptions, module.getSignatureDataTableDefaults(module._systemData.mapId, module._systemData)));

            tableApi.on('draw.dt', function(e, settings){
                // xEditable cells should not be editable in this table
                $(dialogElement).find('.' + module._config.sigTableInfoClass).find('td.editable').editable('disable');
            });

            return tableApi;
        }

        /**
         * draw signature table toolbar (add signature button, scan progress bar
         */
        drawSignatureTableNew(){
            let module = this;

            let secondaryTableWrapperEl = document.createElement('div');
            secondaryTableWrapperEl.classList.add(module._config.tableToolsActionClass);

            // create "empty table for new signature
            let secondaryTableEl = document.createElement('table');
            secondaryTableEl.id = module.getTableId('secondary', module._systemData.mapId, module._systemData.id);
            secondaryTableEl.classList.add('compact', 'stripe', 'row-border', 'nowrap', module._config.sigTableClass, module._config.sigTableSecondaryClass);
            secondaryTableWrapperEl.append(secondaryTableEl);
            this._bodyEl.append(secondaryTableWrapperEl);

            let dataTableOptions = {
                paging: false,
                info: false,
                searching: false,
                tabIndex: -1,
                data: [$.extend(true, {}, SystemSignatureModule.emptySignatureData)],
                initComplete: function(settings, json){
                    let tableApi = this.api();

                    $(this).on('keyup', 'td', {tableApi: tableApi}, function(e){
                        module.keyNavigation(tableApi, e);
                    });
                }
            };

            let tableApi = $(secondaryTableEl).DataTable($.extend(true, dataTableOptions, module.getSignatureDataTableDefaults(module._systemData.mapId, module._systemData)));

            // "Responsive" dataTables plugin did not load automatic (because table is invisible onInit)
            // -> manually start "Responsive" extension -> see default dataTable setting for config e.g. breakpoints
            new $.fn.dataTable.Responsive(tableApi);
        }

        /**
         * draw empty signature table
         */
        drawSignatureTable(){
            let module = this;

            let primaryTableEl = document.createElement('table');
            primaryTableEl.id = module.getTableId('primary', module._systemData.mapId, module._systemData.id);
            primaryTableEl.classList.add('display', 'compact', 'nowrap', module._config.sigTableClass, module._config.sigTablePrimaryClass);
            this._bodyEl.append(primaryTableEl);

            let dataTableOptions = {
                select: {
                    style: 'os',
                    selector: 'td:not(.' + module._config.tableCellActionClass + ')'
                },
                tabIndex: -1,
                dom: '<"flex-row flex-between"<"flex-col"l><"flex-col flex-grow"B><"flex-col"fS>>' +
                    '<"flex-row"<"flex-col flex-grow"tr>>' +
                    '<"flex-row flex-between"<"flex-col"i><"flex-col"p>>',
                buttons: {
                    name: 'tableTools',
                    buttons: [
                        {
                            name: 'filterGroup',
                            tag: 'a',
                            className: module._config.moduleHeadlineIconClass,
                            text: '', // set by js (xEditable)
                            init: function(tableApi, node, config){

                                Util.getLocalStore('character').getItem(Util.getCurrentCharacterId()).then(data => {
                                    let prependOptions = [{value: 0, text: 'unknown'}];
                                    let sourceOptions = module._config.signatureGroupsLabels;
                                    let selectedValues = [];

                                    if(data && data.filterSignatureGroups && data.filterSignatureGroups.length){
                                        // select local stored values
                                        selectedValues = data.filterSignatureGroups;
                                    }else{
                                        // no default group filter options -> show all
                                        selectedValues = sourceOptions.map(option => option.value);
                                        selectedValues.unshift(0);
                                    }

                                    node.editable({
                                        mode: 'popup',
                                        type: 'checklist',
                                        showbuttons: false,
                                        onblur: 'submit',
                                        highlight: false,
                                        title: 'filter groups',
                                        value: selectedValues,
                                        prepend: prependOptions,
                                        source: sourceOptions,
                                        inputclass: module._config.editableUnknownInputClass,
                                        display: function(value, sourceData){
                                            // update filter button label
                                            let html = '<i class="fas fa-filter"></i>filter';
                                            let allSelected = value.length >= sourceData.length;
                                            if( !allSelected ){
                                                html += '&nbsp;(' + value.length + ')';
                                            }
                                            $(this).toggleClass('active', !allSelected).html(html);
                                        },
                                        validate: function(value){
                                            // convert string to int -> important for further processing
                                            return {newValue: value.map(num => parseInt(num)), msg: null};
                                        }
                                    });

                                    let allOptions = prependOptions.concat(sourceOptions);

                                    node.on('save', {tableApi: tableApi, sourceOptions: allOptions}, (e, params) => {
                                        // store values local -> IndexDB
                                        Util.getLocalStore('character').setItem(`${Util.getCurrentCharacterId()}.filterSignatureGroups`, params.newValue);
                                        module.searchGroupColumn(e.data.tableApi, params.newValue, e.data.sourceOptions);
                                    });

                                    // set initial search string -> even if table ist currently empty
                                    module.searchGroupColumn(tableApi, selectedValues, allOptions);
                                });
                            }
                        },
                        {
                            name: 'undo',
                            tag: 'a',
                            className: module._config.moduleHeadlineIconClass,
                            text: '', // set by js (xEditable)
                            init: function(tableApi, node, config){

                                let getIconByAction = action => {
                                    switch(action){
                                        case 'add':     return 'fa-plus txt-color-green';
                                        case 'delete':  return 'fa-times txt-color-redDark';
                                        case 'edit':    return 'fa-pen txt-color-orangeDark';
                                        case 'undo':    return 'fa-undo txt-color-grayLight';
                                        case 'sync':    return 'fa-exchange-alt txt-color-orangeDark';
                                    }
                                };

                                node.on('shown', (e, editable) => {
                                    // check if history options loaded -> else forward to error function
                                    if(!editable.input.$input.length){
                                        editable.options.error.call(editable, ['No record found']);
                                    }else{
                                        // disable first option
                                        editable.input.$input.first().prop('disabled', true);
                                        // preselect second option
                                        //editable.input.$input.eq(1).prop('checked', true);

                                        // "fake" radio button behaviour
                                        editable.input.$input.attr('name', 'test').attr('type', 'radio');

                                        // preselect second option
                                        editable.input.$input.eq(1).prop('checked', true);

                                        let labels = editable.container.$form.find('label');
                                        labels.addClass('radio');

                                        for(let span of labels.find('span')){
                                            span.style.display = 'inline-block';
                                            span.style.width = '100%';
                                            let parts = span.innerText.trim().split('%%');
                                            parts[0] = '<span style="display: inline-block; width: calc(65% - 38px); text-overflow: ellipsis; overflow: hidden">' + parts[0] + '</span>';
                                            parts[1] = '<span style="display: inline-block; width: 15px; text-align: right"><i class="fas fa-fw txt-color ' + getIconByAction(parts[1]) + '"></i></span>';
                                            parts[2] = '<span style="display: inline-block; width: 23px; text-align: right" title="signature count"><kbd>' + parts[2] + '</kbd></span>';
                                            parts[3] = '<span style="display: inline-block; width: 35%; text-align: right; font-size: 90%" class="txt-color txt-color-grayLight">' + parts[3] + '</span>';
                                            span.innerHTML = parts.join('');
                                        }

                                        labels.initTooltips();
                                    }
                                });

                                let processLockPromise = null;

                                node.editable({
                                    url: Init.path.api + '/SignatureHistory',
                                    ajaxOptions: {
                                        processData: false,
                                        type: 'PUT',
                                        dataType: 'json', //assuming json response
                                        contentType: 'application/json',
                                        beforeSend: function(xhr, settings){
                                            processLockPromise = tableApi.newProcess('lock');
                                        },
                                    },
                                    params: function(params){
                                        return JSON.stringify({
                                            systemId: params.pk,
                                            stamp: params.value[0]
                                        });
                                    },
                                    mode: 'popup',
                                    type: 'checklist',
                                    showbuttons: true,
                                    highlight: false,
                                    title: 'historical records',
                                    name: 'history',
                                    pk: module._systemData.id,
                                    source: Init.path.api + '/SignatureHistory/' + module._systemData.id,
                                    sourceOptions: {
                                        type: 'GET',
                                        data: {
                                            mapId: module._systemData.mapId
                                        }
                                    },
                                    sourceCache: false, // always get new source options on open
                                    display: function(value){
                                        $(this).html('<i class="fas fa-undo"></i>undo');
                                    },
                                    success: (response, newValue) => {
                                        // update signature table
                                        tableApi.endProcess(processLockPromise);

                                        module.updateSignatureTable(tableApi, response, true);
                                    },
                                    error: function(errors){
                                        let errorAll = [];
                                        if(errors && errors.responseText){ //ajax error, errors = xhr object
                                            if(errors.responseJSON && errors.responseJSON.error){
                                                for(let error of errors.responseJSON.error){
                                                    errorAll.push(error.message);
                                                }
                                            }else{
                                                //fallback -> other ajax error
                                                errorAll.push(errors.responseText);
                                            }
                                        }else if(errors.length){
                                            // manual called error
                                            errorAll = errors;

                                            let form = this.container.$form.addClass('has-error');
                                            form.find('.editable-buttons').hide();
                                            form.find('.editable-input').hide();
                                            form.find('.editable-error-block').html(errorAll.join('<br>')).show();
                                        }

                                        return errorAll.join(' | ');
                                    },
                                    validate: function(value){
                                        if(!Array.isArray(value) || value.length !== 1){
                                            return {newValue: value, msg: 'No record selected', field: this};
                                        }
                                    }
                                });
                            }
                        },
                        {
                            name: 'selectAll',
                            tag: 'a',
                            className: module._config.moduleHeadlineIconClass,
                            text: '<i class="fas fa-check-double"></i>select all',
                            action: function(e, tableApi, node, config){
                                let rows = tableApi.rows();
                                let rowCountAll = rows.count();
                                let rowCountSelected = tableApi.rows({selected: true}).count();

                                if(rowCountSelected && (rowCountSelected >= rowCountAll)){
                                    rows.deselect();
                                    node.removeClass('active');
                                }else{
                                    rows.select();
                                    node.addClass('active');
                                }
                            }
                        },
                        {
                            extend: 'selected',
                            name: 'delete',
                            tag: 'a',
                            className: [module._config.moduleHeadlineIconClass, module._config.sigTableClearButtonClass].join(' '),
                            text: '<i class="fas fa-trash"></i>delete&nbsp;(<span>0</span>)',
                            init: function(tableApi, node, config){
                                // call `super` init() for "extend: 'selected'" button
                                $.fn.dataTable.ext.buttons.selected.init.call(this, tableApi, node, config);

                                tableApi.on('select deselect', (e, tableApi, type, indexes) => {
                                    let rowCountAll = tableApi.rows().count();
                                    let rowCountSelected = tableApi.rows({selected: true}).count();
                                    let countText = (rowCountSelected >= rowCountAll) ? 'all' : rowCountSelected;
                                    node.find('i+span').text(countText);
                                });
                            },
                            action: function(e, tableApi, node, config){
                                let selectedRows = tableApi.rows({selected: true});
                                if(selectedRows.count()){
                                    bootbox.confirm('Delete ' + selectedRows.count() + ' signature?', result => {
                                        if(result){
                                            // for some reason using 'tableApi' as first param in deleteSignature()
                                            // does not work because my custom plugin fkt 'newProcess()' is missing here...
                                            // -> using 'this' seems to work...
                                            module.deleteSignatures(this, selectedRows);
                                        }
                                    });
                                }
                            }
                        }
                    ]
                },
                initComplete: function(settings, json){
                    let tableApi = this.api();
                    module.initCharacterInfoTooltip(this, tableApi);

                    $(this).on('keyup', 'td', {tableApi: tableApi}, function(e){
                        module.keyNavigation(tableApi, e);
                    });


                    Counter.initTableCounter(this, ['created:name', 'updated:name']);
                }
            };

            let tableApi = $(primaryTableEl).DataTable($.extend(true, dataTableOptions, module.getSignatureDataTableDefaults(module._systemData.mapId, module._systemData)));

            // "Responsive" dataTables plugin did not load automatic (because table is invisible onInit)
            // -> manually start "Responsive" extension -> see default dataTable setting for config e.g. breakpoints
            new $.fn.dataTable.Responsive(tableApi);

            // "Select" Datatables Plugin
            tableApi.select();

            let buttons = new $.fn.dataTable.Buttons(tableApi, {
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
                name: 'moduleTools',
                buttons: [
                    {
                        name: 'add',
                        className: ['fa-plus', module._config.moduleHeadlineIconAddClass].join(' '),
                        titleAttr: 'add',
                        attr:  {
                            'data-toggle': 'tooltip',
                            'data-html': true
                        },
                        action: function(e, tableApi, node, config){
                            module.toggleAddSignature('auto');
                        }
                    },
                    {
                        name: 'reader',
                        className: ['fa-paste', module._config.moduleHeadlineIconReaderClass].join(' '),
                        titleAttr: 'signature reader',
                        attr:  {
                            'data-toggle': 'tooltip',
                            'data-html': true
                        },
                        action: function(e, tableApi, node, config){
                            module.showSignatureReaderDialog(tableApi);
                        }
                    },
                    {
                        name: 'lazy',
                        className: ['fa-exchange-alt', module._config.moduleHeadlineIconLazyClass].join(' '),
                        titleAttr: 'lazy \'delete\' signatures',
                        attr:  {
                            'data-toggle': 'tooltip',
                            'data-html': true
                        },
                        action: function(e, tableApi, node, config){
                            $(node).toggleClass('active');
                        }
                    }
                ]
            });

            tableApi.buttons('moduleTools', null).container().appendTo(module.moduleElement.querySelector('.' + module._config.headClassName));

            // lock table until module is fully rendered
            $(module.moduleElement).data('lockPromise', tableApi.newProcess('lock'));
        }

        /**
         * get dataTables default options for signature tables
         * @param mapId
         * @param systemData
         * @returns {{}}
         */
        getSignatureDataTableDefaults(mapId, systemData){
            let module = this;

            /**
             * add map/system specific data for each editable field in the sig-table
             * @param params
             * @returns {*}
             */
            let modifyFieldParamsOnSend = params => {
                params.systemId = systemData.id;
                return params;
            };

            let dataTableDefaults = {
                pfMeta: {
                    'mapId': mapId,
                    'systemId': systemData.id
                },
                order: [1, 'asc'],
                rowId: rowData => module._config.sigTableRowIdPrefix + rowData.id,
                language: {
                    emptyTable:     'No signatures added',
                    info:           'Showing _START_ to _END_ of _TOTAL_ signatures',
                    infoEmpty:      'Showing 0 to 0 of 0 signatures',
                    infoFiltered:   '(<i class="fas fa-fw fa-filter"></i> from _MAX_ total)',
                    lengthMenu:     'Show _MENU_',
                    zeroRecords:    'No signatures recorded'
                },
                columnDefs: [
                    {
                        targets: 0,
                        name: 'status',
                        orderable: true,
                        searchable: false,
                        title: '',
                        width: 2,
                        class: ['text-center'].join(' '),
                        data: 'updated',
                        type: 'html',
                        render: {
                            _: (cellData, type, rowData, meta) => {
                                let value = '';
                                if(cellData && cellData.character){
                                    value = Util.getStatusInfoForCharacter(cellData.character, 'class');
                                }

                                if(type === 'display'){
                                    value = '<i class="fas fa-fw fa-circle pf-user-status ' + value + '"></i>';
                                }
                                return value;
                            }
                        }
                    },{
                        targets: 1,
                        name: 'id',
                        orderable: true,
                        searchable: true,
                        title: 'id',
                        type: 'string',
                        width: 12,
                        class: [module._config.tableCellFocusClass, module._config.sigTableEditSigNameInput, module._config.fontUppercaseClass].join(' '),
                        data: 'name',
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            module.updateTooltip(cell, cellData);

                            module.editableOnSave(tableApi, cell, [], ['group:name', 'type:name', 'action:name']);
                            module.editableOnHidden(tableApi, cell);

                            $(cell).editable($.extend({
                                mode: 'popup',
                                type: 'text',
                                title: 'signature id',
                                name: 'name',
                                pk: rowData.id || null,
                                emptytext: '? ? ?',
                                value: cellData,
                                inputclass: module._config.fontUppercaseClass,
                                display: function(value){
                                    // change display value to first 3 chars -> unicode beware
                                    $(this).text([...$.trim(value)].slice(0, 3).join('').toLowerCase());
                                },
                                validate: function(value){
                                    let msg = false;
                                    //let mbLength = [...$.trim(value)].length; // unicode beware
                                    if(! value.trimChars().match(/^[a-zA-Z]{3}-\d{3}$/)){
                                        msg = 'ID format invalid. E.g.: ABC-123';
                                    }

                                    if(msg){
                                        return {newValue: value, msg: msg, field: this};
                                    }
                                },
                                params: modifyFieldParamsOnSend,
                                success: function(response, newValue){
                                    tableApi.cell(cell).data(newValue);

                                    $(this).pulseBackgroundColor('changed');
                                    module.updateTooltip(cell, newValue);

                                    if(response){
                                        let newRowData = response[0];
                                        module.updateSignatureCell(tableApi, rowIndex, 'status:name', newRowData.updated);
                                        module.updateSignatureCell(tableApi, rowIndex, 'updated:name', newRowData.updated.updated);
                                    }
                                    tableApi.draw();
                                }
                            }, SystemSignatureModule.editableDefaults));
                        }
                    },{
                        targets: 2,
                        name: 'group',
                        orderable: true,
                        searchable: true,
                        title: 'group',
                        type: 'string',     // required for sort/filter because initial data type is numeric
                        width: 40,
                        class: [module._config.tableCellFocusClass].join(' '),
                        data: 'groupId',
                        render: {
                            sort: module.getGroupLabelById.bind(module),
                            filter: module.getGroupLabelById.bind(module)
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            module.editableOnSave(tableApi, cell, ['type:name'], ['type:name', 'action:name']);
                            module.editableOnHidden(tableApi, cell);
                            module.editableGroupOnShown(cell);
                            module.editableGroupOnSave(tableApi, cell);

                            $(cell).editable($.extend({
                                mode: 'popup',
                                type: 'select',
                                title: 'group',
                                name: 'groupId',
                                pk: rowData.id || null,
                                emptytext: 'unknown',
                                onblur: 'submit',
                                showbuttons: false,
                                value: cellData,
                                prepend: [{value: 0, text: ''}],
                                params: modifyFieldParamsOnSend,
                                source: module._config.signatureGroupsLabels,
                                display: function(value, sourceData){
                                    let selected = $.fn.editableutils.itemsByValue(value, sourceData);
                                    if(selected.length && selected[0].value > 0){
                                        $(this).html(selected[0].text);
                                    }else{
                                        $(this).empty();
                                    }
                                },
                                validate: function(value){
                                    // convert string to int -> important for further processing
                                    // -> on submit record (new signature) validate() is called and no error should be returned
                                    // value should already be integer
                                    if( !Number.isInteger(value) ){
                                        return {newValue: parseInt(value) || 0, msg: null};
                                    }
                                },
                                success: function(response, newValue){
                                    tableApi.cell(cell).data(newValue);

                                    $(this).pulseBackgroundColor('changed');

                                    if(response){
                                        let newRowData = response[0];
                                        module.updateSignatureCell(tableApi, rowIndex, 'status:name', newRowData.updated);
                                        module.updateSignatureCell(tableApi, rowIndex, 'updated:name', newRowData.updated.updated);
                                    }
                                    tableApi.draw();

                                    // find related "type" select (same row) and change options ---------------------------
                                    let signatureTypeCell = module.getNeighboringCell(tableApi, cell, 'type:name');
                                    let signatureTypeField = signatureTypeCell.nodes().to$();
                                    module.editableSelectCheck(signatureTypeField);

                                    signatureTypeCell.data(0);
                                    signatureTypeField.editable('setValue', 0);


                                    // find "connection" select (same row) and change "enabled" flag ----------------------
                                    let signatureConnectionCell = module.getNeighboringCell(tableApi, cell, 'connection:name');
                                    let signatureConnectionField = signatureConnectionCell.nodes().to$();

                                    if(newValue === 5){
                                        // wormhole
                                        module.editableEnable(signatureConnectionField);
                                    }else{
                                        module.checkConnectionConflicts();
                                        module.editableDisable(signatureConnectionField);
                                    }
                                    signatureConnectionCell.data(0);
                                    signatureConnectionField.editable('setValue', 0);
                                }
                            }, SystemSignatureModule.editableDefaults));
                        }
                    },{
                        targets: 3,
                        name: 'type',
                        orderable: false,
                        searchable: false,
                        title: 'type',
                        type: 'string',     // required for sort/filter because initial data type is numeric
                        width: 180,
                        class: [module._config.tableCellFocusClass, module._config.tableCellTypeClass].join(' '),
                        data: 'typeId',
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            module.editableOnSave(tableApi, cell, ['connection:name'], ['action:name']);
                            module.editableOnHidden(tableApi, cell);
                            module.editableTypeOnInit(cell);
                            module.editableTypeOnShown(cell);

                            $(cell).editable($.extend({
                                mode: 'popup',
                                type: 'select',
                                title: 'type',
                                name: 'typeId',
                                pk: rowData.id || null,
                                emptytext: 'unknown',
                                onblur: 'submit',
                                showbuttons: false,
                                disabled: rowData.groupId <= 0,    // initial disabled if groupId not set
                                value: cellData,
                                prepend: [{value: 0, text: ''}],
                                params: modifyFieldParamsOnSend,
                                source: function(){
                                    // get current row data (important!)
                                    // -> "rowData" param is not current state, values are "on createCell()" state
                                    let rowData = tableApi.row($(cell).parents('tr')).data();

                                    return SystemSignatureModule.getSignatureTypeOptions(
                                        systemData.type.id,
                                        Util.getAreaIdBySecurity(systemData.security),
                                        rowData.groupId,
                                        systemData
                                    );
                                },
                                display: function(value, sourceData){
                                    let selected = $.fn.editableutils.itemsByValue(value, sourceData);
                                    if(selected.length && selected[0].value > 0){
                                        $(this).html(FormElement.formatSignatureTypeSelectionData({text: selected[0].text}, undefined, {showWhSizeLabel: true}));
                                    }else{
                                        $(this).empty();
                                    }
                                },
                                validate: function(value){
                                    // convert string to int -> important for further processing
                                    // -> on submit record (new signature) validate() is called and no error should be returned
                                    // value should already be integer
                                    if( !Number.isInteger(value) ){
                                        return {newValue: parseInt(value) || 0, msg: null};
                                    }
                                },
                                success: function(response, newValue){
                                    tableApi.cell(cell).data(newValue);

                                    $(this).pulseBackgroundColor('changed');

                                    if(response){
                                        let newRowData = response[0];
                                        module.updateSignatureCell(tableApi, rowIndex, 'status:name', newRowData.updated);
                                        module.updateSignatureCell(tableApi, rowIndex, 'updated:name', newRowData.updated.updated);
                                    }
                                    tableApi.draw();
                                }
                            }, SystemSignatureModule.editableDefaults));
                        }
                    },{
                        targets: 4,
                        name: 'description',
                        orderable: false,
                        searchable: true,
                        title: 'description',
                        class: [module._config.tableCellFocusClass, module._config.tableCellActionClass].join(' '),
                        type: 'html',
                        data: 'description',
                        defaultContent: '',
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            module.editableOnSave(tableApi, cell, [], ['action:name']);
                            module.editableOnHidden(tableApi, cell);
                            module.editableDescriptionOnShown(cell);
                            module.editableDescriptionOnHidden(cell);

                            $(cell).editable($.extend({
                                mode: 'inline',
                                type: 'textarea',
                                title: 'description',
                                name: 'description',
                                pk: rowData.id || null,
                                emptytext: '<i class="fas fa-fw fa-lg fa-pen"></i>',
                                onblur: 'submit',
                                showbuttons: false,
                                inputclass: module._config.editableDescriptionInputClass,
                                emptyclass: module._config.moduleHeadlineIconClass,
                                params: modifyFieldParamsOnSend,
                                success: function(response, newValue){
                                    tableApi.cell(cell).data(newValue);

                                    $(this).pulseBackgroundColor('changed');

                                    if(response){
                                        let newRowData = response[0];
                                        module.updateSignatureCell(tableApi, rowIndex, 'status:name', newRowData.updated);
                                        module.updateSignatureCell(tableApi, rowIndex, 'updated:name', newRowData.updated.updated);
                                    }
                                    tableApi.draw();
                                }
                            }, SystemSignatureModule.editableDefaults));
                        }
                    },{
                        targets: 5,
                        name: 'connection',
                        orderable: false,
                        searchable: false,
                        title: 'leads to',
                        type: 'string',     // required for sort/filter because initial data type is numeric
                        className: [module._config.tableCellFocusClass, module._config.tableCellConnectionClass].join(' '),
                        width: 80,
                        data: 'connection.id',
                        defaultContent: 0,
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            module.editableOnSave(tableApi, cell, [], ['action:name']);
                            module.editableOnHidden(tableApi, cell);
                            module.editableConnectionOnInit(cell);
                            module.editableConnectionOnShown(tableApi, cell);
                            module.editableConnectionOnSave(cell);

                            $(cell).editable($.extend({
                                mode: 'popup',
                                type: 'select',
                                title: 'system',
                                name: 'connectionId',
                                pk: rowData.id || null,
                                emptytext: 'unknown',
                                onblur: 'submit',
                                showbuttons: false,
                                disabled: rowData.groupId !== 5,    // initial disabled if NON wh
                                value: cellData,
                                prepend: [{value: 0, text: ''}],
                                params: modifyFieldParamsOnSend,
                                source: function(){
                                    let activeMap = Util.getMapModule().getActiveMap();
                                    let mapId = activeMap.data('id');
                                    return SystemSignatureModule.getSignatureConnectionOptions(mapId, systemData);
                                },
                                display: function(value, sourceData){
                                    let selected = $.fn.editableutils.itemsByValue(value, sourceData);
                                    if(selected.length && selected[0].value > 0){
                                        let errorIcon = '<i class="fas fa-exclamation-triangle txt-color txt-color-danger hide"></i>&nbsp;';
                                        $(this).html(FormElement.formatSignatureConnectionSelectionData({
                                            text: selected[0].text,
                                            metaData: selected[0].metaData
                                        })).prepend(errorIcon);
                                    }else{
                                        $(this).empty();
                                    }
                                },
                                validate: function(value){
                                    // convert string to int -> important for further processing
                                    // -> on submit record (new signature) validate() is called and no error should be returned
                                    // value should already be integer
                                    if(!Number.isInteger(value)){
                                        return {newValue: parseInt(value) || 0, msg: null};
                                    }
                                },
                                success: function(response, newValue){
                                    tableApi.cell(cell).data(newValue);

                                    $(this).pulseBackgroundColor('changed');

                                    if(response){
                                        let newRowData = response[0];
                                        module.updateSignatureCell(tableApi, rowIndex, 'status:name', newRowData.updated);
                                        module.updateSignatureCell(tableApi, rowIndex, 'updated:name', newRowData.updated.updated);
                                    }
                                    tableApi.draw();
                                }
                            }, SystemSignatureModule.editableDefaults));
                        }
                    },{
                        targets: 6,
                        name: 'created',
                        title: 'created',
                        searchable: false,
                        width: 80,
                        className: ['text-right', module._config.tableCellCounterClass, 'min-screen-d'].join(' '),
                        data: 'created.created',
                        defaultContent: '',
                    },{
                        targets: 7,
                        name: 'updated',
                        title: 'updated',
                        searchable: false,
                        width: 80,
                        className: ['text-right', module._config.tableCellCounterClass, 'min-screen-d'].join(' '),
                        data: 'updated.updated',
                        defaultContent: ''
                    },{
                        targets: 8,
                        name: 'info',
                        title: '',
                        orderable: false,
                        searchable: false,
                        width: 10,
                        class: ['text-center', Util.config.helpClass , Util.config.popoverTriggerClass].join(' '),
                        data: 'created.created',
                        defaultContent: '',
                        render: {
                            display: (cellData, type, rowData, meta) => {
                                if(cellData){
                                    return '<i class="fas fa-question-circle"></i>';
                                }
                            }
                        }
                    },{
                        targets: 9,
                        name: 'action',
                        title: '',
                        orderable: false,
                        searchable: false,
                        width: 10,
                        class: ['text-center', module._config.tableCellFocusClass, module._config.tableCellActionClass].join(' '),
                        data: null,
                        render: {
                            display: (cellData, type, rowData, meta) => {
                                let val = '<i class="fas fa-plus"></i>';
                                if(rowData.id){
                                    val = '<i class="fas fa-times txt-color txt-color-redDark"></i>';
                                }
                                return val;
                            }
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            if(rowData.id){
                                // delete signature -----------------------------------------------------------------------
                                let confirmationSettings = {
                                    title: '---',
                                    template: Util.getConfirmationTemplate(Util.getConfirmationContent([{
                                        name: 'deleteConnection',
                                        value: '1',
                                        label: 'delete connection',
                                        class: 'pf-editable-warn',
                                        checked: true
                                    }]), {
                                        size: 'small',
                                        noTitle: true
                                    }),
                                    onConfirm: function(e, target){
                                        // top scroll to top
                                        e.preventDefault();

                                        // get form data (check if form tag is not hidden!) from confirmation popover
                                        let tip = target.data('bs.confirmation').tip();
                                        let form = tip.find('form:not(.hidden)').first();
                                        let formData = form.getFormValues();
                                        let deleteOptions = Util.getObjVal(formData, 'deleteConnection') ? formData : {};

                                        // add "processing" state or connection that will be deleted as well
                                        if(deleteOptions.deleteConnection){
                                            let connectionId = tableApi.cell(rowIndex, 'connection:name').data();
                                            if(connectionId){
                                                let metaData = module.getTableMetaData(tableApi);
                                                let connection = $().getConnectionById(metaData.mapId, connectionId);
                                                if(connection){
                                                    connection.addType('state_process');
                                                }
                                            }
                                        }

                                        let deleteRowElement = $(target).parents('tr');
                                        let row = tableApi.rows(deleteRowElement);
                                        module.deleteSignatures(tableApi, row, deleteOptions);
                                    },
                                    onShow: function(e, target){
                                        // hide "deleteConnection" checkbox if no connectionId linked
                                        let tip = target.data('bs.confirmation').tip();
                                        let form = tip.find('form').first();
                                        let connectionId = tableApi.cell(rowIndex, 'connection:name').data();
                                        form.toggleClass('hidden', !connectionId);
                                    }
                                };

                                $(cell).confirmation(confirmationSettings);
                            }else{
                                // add new signature ----------------------------------------------------------------------
                                $(cell).on('click', {tableApi: tableApi, rowIndex: rowIndex}, function(e){
                                    e.stopPropagation();
                                    e.preventDefault();

                                    let secondaryTableApi = e.data.tableApi;
                                    let metaData = module.getTableMetaData(secondaryTableApi);
                                    let primaryTableApi = module.getDataTableInstance(metaData.mapId, metaData.systemId, 'primary');

                                    let formFields = secondaryTableApi.row(e.data.rowIndex).nodes().to$().find('.editable');

                                    // the "hide" makes sure to take care about open editable fields (e.g. description)
                                    // otherwise, changes would not be submitted in this field (not necessary)
                                    formFields.editable('hide');

                                    let processLockPromise = null;
                                    let processRequestPromise = null;

                                    // submit all xEditable fields
                                    formFields.editable('submit', {
                                        url: Init.path.api + '/Signature',
                                        ajaxOptions: {
                                            processData: false, // we need to "process" data in beforeSend()
                                            type: 'PUT',
                                            dataType: 'json', //assuming json response
                                            contentType: 'application/json',
                                            beforeSend: function(xhr, settings){
                                                settings.data = JSON.stringify(settings.data);

                                                processLockPromise = primaryTableApi.newProcess('lock');
                                                processRequestPromise = primaryTableApi.newProcess('request');

                                            },
                                            context: {
                                                primaryTableApi: primaryTableApi,
                                                secondaryTableApi: secondaryTableApi,
                                            }
                                        },
                                        data: {
                                            systemId: metaData.systemId
                                        },
                                        error: SystemSignatureModule.editableDefaults.error, // user default xEditable error function
                                        success: function(response, editableConfig){
                                            let context = editableConfig.ajaxOptions.context;
                                            let primaryTableApi = context.primaryTableApi;
                                            let secondaryTableApi = context.secondaryTableApi;

                                            let signatureData = response[0];
                                            let row = module.addSignatureRow(primaryTableApi, signatureData);
                                            if(row){
                                                primaryTableApi.draw();
                                                // highlight
                                                row.nodes().to$().pulseBackgroundColor('added');

                                                // prepare "add signature" table for new entry -> reset -------------------
                                                secondaryTableApi.clear().row.add($.extend(true, {}, SystemSignatureModule.emptySignatureData)).draw();

                                                Util.showNotify({
                                                    title: 'Signature added',
                                                    text: 'Name: ' + signatureData.name,
                                                    type: 'success'
                                                });

                                                // update signature bar
                                                module.updateScannedSignaturesBar(primaryTableApi, {showNotice: true});
                                            }

                                            primaryTableApi.endProcess(processLockPromise);
                                            primaryTableApi.endProcess(processRequestPromise);
                                        }
                                    });
                                });
                            }
                        }
                    }
                ],
                createdRow: function(row, data, dataIndex){
                    // enable tabbing for interactive cells
                    let focusCells = $(row).find('.' + module._config.tableCellFocusClass + ':not(.editable-disabled)').attr('tabindex', 0);
                    // enable "return" key -> click()
                    focusCells.on('keydown', function(e){
                        e.stopPropagation();
                        if(e.which === 13){
                            $(this).trigger('click');
                        }
                    });
                },
                rowCallback: function(){
                    let tableApi = this.api();
                    let time = Math.floor((new Date()).getTime());

                    tableApi.cells(null, ['updated:name']).every(function(rowIndex, colIndex, tableLoopCount, cellLoopCount){
                        let cell = this;
                        let node = cell.node();
                        let cellData = cell.data();
                        let diff = time - cellData * 1000;

                        // highlight cell: age > 1 day
                        $(node).toggleClass('txt-color txt-color-warning', diff > 86400000);
                    });
                }
            };

            return dataTableDefaults;
        }

        /**
         * toggle primary table visibility
         * @param show
         */
        toggleAddSignature(show = 'auto'){
            let button = $(this.moduleElement).find('.' + this._config.moduleHeadlineIconAddClass);
            let toolsElement = $(this.moduleElement).find('.' + this._config.tableToolsActionClass);
            button.toggleClass('active', show === 'auto' ? undefined : show);

            if(toolsElement.is(':visible') && (!show || show === 'auto')){
                // hide container
                toolsElement.velocity('stop').velocity({
                    opacity: [0, 1],
                    height: [0, '70px']
                },{
                    duration: 150,
                    display: 'none'
                });
            }else if(!toolsElement.is(':visible') && (show || show === 'auto')){
                // show container
                toolsElement.velocity('stop').velocity({
                    opacity: [1, 0],
                    height: ['70px', 0]
                },{
                    duration: 150,
                    display: 'block',
                    complete: () => {
                        this.focusNewSignatureEditableField();
                    }
                });
            }else if(toolsElement.is(':visible') && show){
                // still visible -> no animation
                this.focusNewSignatureEditableField();
            }
        }

        /**
         * filter table "group" column
         * @param tableApi
         * @param newValue
         * @param sourceOptions
         */
        searchGroupColumn(tableApi, newValue, sourceOptions){
            let column = tableApi.column('group:name');
            let pattern = '';

            if(newValue.length <= sourceOptions.length){
                // all options selected + "prepend" option
                let selected = $.fn.editableutils.itemsByValue(newValue, sourceOptions);

                pattern = selected.map(option => option.value !== 0 ? $.fn.dataTable.util.escapeRegex(option.text) : '^$').join('|');
            }
            column.search(pattern, true, false).draw();
        }

        /**
         * init character info tooltips
         * -> e.g. table cell 'question mark' icon
         * @param element
         * @param tableApi
         */
        initCharacterInfoTooltip(element, tableApi){
            element.hoverIntent({
                over: function(e){
                    let cellElement = $(this);
                    let rowData = tableApi.row(cellElement.parents('tr')).data();
                    cellElement.addCharacterInfoTooltip(rowData, {
                        trigger: 'manual',
                        placement: 'top',
                        show: true
                    });
                },
                out: function(e){
                    $(this).destroyPopover();
                },
                selector: 'td.' + Util.config.helpClass
            });
        }

        /**
         * Parsed scan result data (from EVE client) should be enriched with some data
         * -> fill up more columns in the 'preview' signature tab.e
         * @param signatureData
         * @returns {*}
         */
        enrichParsedSignatureData(signatureData){
            let characterData = Util.getCurrentCharacter();
            let timestamp = Math.floor((new Date()).getTime() / 1000);

            for(let i = 0; i < signatureData.length; i++){
                signatureData[i].created = {
                    created: timestamp,
                    character: characterData
                };
                signatureData[i].updated = {
                    updated: timestamp,
                    character: characterData
                };
            }

            return signatureData;
        }

        /**
         * parses a copy&paste string from ingame scanning window
         * @param clipboard
         * @returns {Array}
         */
        parseSignatureString(clipboard){
            let signatureData = [];

            if(clipboard.length){
                let signatureRows = clipboard.split(/\r\n|\r|\n/g);
                let signatureGroupOptions = this._config.signatureGroupsNames;
                let invalidSignatures = 0;

                for(let i = 0; i < signatureRows.length; i++){
                    let rowData = signatureRows[i].split(/\t|\s{4}/g);
                    if(rowData.length === 6){
                        // check if sig Type = anomaly or combat site
                        if(SystemSignatureModule.validSignatureNames.indexOf(rowData[1]) !== -1){

                            let sigGroup = $.trim(rowData[2]).toLowerCase();
                            let sigDescription = $.trim(rowData[3]);
                            let sigGroupId = 0;
                            let typeId = 0;

                            // get groupId by groupName
                            for(let groupOption of signatureGroupOptions){
                                let reg = new RegExp(groupOption.text, 'i');
                                if(reg.test(sigGroup)){
                                    sigGroupId = groupOption.value;
                                    break;
                                }
                            }

                            // wormhole type cant be extracted from signature string -> skip function call
                            if(sigGroupId !== 5){
                                // try to get "typeId" from description string
                                let sigDescriptionLowerCase = sigDescription.toLowerCase();

                                let typeOptions = SystemSignatureModule.getSignatureTypeOptions(
                                    this._systemData.type.id,
                                    Util.getAreaIdBySecurity(this._systemData.security),
                                    sigGroupId,
                                    this._systemData
                                );

                                for(let [key, name] of Object.entries(Util.flattenXEditableSelectArray(typeOptions))){
                                    if(name.toLowerCase() === sigDescriptionLowerCase){
                                        typeId = parseInt(key);
                                        break;
                                    }
                                }

                                // set signature name as "description" if signature matching failed
                                sigDescription = (typeId === 0) ? sigDescription : '';
                            }else{
                                sigDescription = '';
                            }

                            // map array values to signature Object
                            let signatureObj = {
                                systemId: this._systemData.id,
                                name: $.trim(rowData[0]).toLowerCase(),
                                groupId: sigGroupId,
                                typeId: typeId,
                                description: sigDescription
                            };

                            signatureData.push(signatureObj);
                        }else{
                            invalidSignatures++;
                        }
                    }
                }

                if(invalidSignatures > 0){
                    let notification = invalidSignatures + ' / ' + signatureRows.length + ' signatures invalid';
                    Util.showNotify({title: 'Invalid signature(s)', text: notification, type: 'warning'});
                }
            }

            return signatureData;
        }

        /**
         * updates the signature table with all signatures pasted into the "signature reader" dialog
         * -> Hint: copy&paste signature data (without any open dialog) will add signatures as well
         * @param tableApi
         * @param clipboard data stream
         * @param options
         */
        updateSignatureTableByClipboard(tableApi, clipboard, options){
            if(tableApi.hasProcesses('request')){
                console.info('Update signature table By clipboard locked.');
                return;
            }

            let saveSignatureData = signatureData => {
                // lock update function until request is finished
                let processLockPromise = tableApi.newProcess('lock');
                let processRequestPromise = tableApi.newProcess('request');

                Util.request(
                    'POST',
                    'Signature',
                    [],
                    {
                        signatures: signatureData,
                        deleteOld: options.deleteOld || 0,
                        deleteConnection: options.deleteConnection || 0,
                        systemId: parseInt(this._systemData.id)
                    },
                    {
                        tableApi: tableApi,
                        processLockPromise: processLockPromise,
                        processRequestPromise: processRequestPromise
                    },
                    context => {
                        context.tableApi.endProcess(context.processLockPromise);
                        context.tableApi.endProcess(context.processRequestPromise);
                    }).then(
                    payload => {
                        // updates table with new/updated signature information
                        this.updateSignatureTable(payload.context.tableApi, payload.data, !!options.deleteOld);
                    },
                    Util.handleAjaxErrorResponse
                );
            };

            // parse input stream
            let signatureData = this.parseSignatureString(clipboard);
            if(signatureData.length > 0){
                // valid signature data parsed

                // check if signatures will be added to a system where character is currently in
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

                    let msg = 'Update signatures in ' + systemNameStr + ' ? This is not your current location, "' + currentLocationData.name + '" !';
                    bootbox.confirm(msg, result => {
                        if(result){
                            saveSignatureData(signatureData);
                        }
                    });
                }else{
                    // current system selected -> no "confirmation" required
                    saveSignatureData(signatureData);
                }
            }
        }

        /**
         * deletes signature rows from signature table
         * @param tableApi
         * @param rows
         * @param deleteOptions
         */
        deleteSignatures(tableApi, rows, deleteOptions = {}){
            let module = this;
            // get unique id array from rows -> in case there are 2 rows with same id -> you never know
            let signatureIds = [...new Set(rows.data().toArray().map(rowData => rowData.id))];
            let metaData = module.getTableMetaData(tableApi);
            let data = Object.assign(deleteOptions, {
                systemId: metaData.systemId
            });

            let processRequestPromise = tableApi.newProcess('request');

            Util.request('DELETE', 'Signature', signatureIds, data, {
                    tableApi: tableApi,
                    processRequestPromise: processRequestPromise
                },
                context => {
                    context.tableApi.endProcess(context.processRequestPromise);
                }).then(
                payload => {
                    let tableApi = payload.context.tableApi;

                    // promises for all delete rows
                    let promisesToggleRow = [];
                    // get deleted rows -> match with response data
                    let rows = tableApi.rows((idx, rowData, node) => payload.data.includes(rowData.id));
                    // toggle hide animation for rows one by one...
                    rows.every(function (rowIdx, tableLoop, rowLoop) {
                        let row = this;
                        let rowElement = row.nodes().to$();

                        rowElement.pulseBackgroundColor('deleted');

                        promisesToggleRow.push(module.toggleTableRow(rowElement));
                    });

                    // ... all hide animations done ...
                    Promise.all(promisesToggleRow).then(payloads => {
                        // ... get deleted (hide animation done) and delete them
                        tableApi.rows(payloads.map(payload => payload.row)).remove().draw();

                        // update signature bar
                        module.updateScannedSignaturesBar(tableApi, {showNotice: false});

                        // update connection conflicts
                        module.checkConnectionConflicts();

                        let notificationOptions = {
                            type: 'success'
                        };
                        if (payloads.length === 1) {
                            notificationOptions.title = 'Signature deleted';
                        } else {
                            notificationOptions.title = payloads.length + ' Signatures deleted ';
                        }
                        module.showNotify(notificationOptions);
                    });
                },
                Util.handleAjaxErrorResponse
            );
        }

        /**
         * updates a single cell with new data (e.g. "updated" cell)
         * @param tableApi
         * @param rowIndex
         * @param columnSelector
         * @param data
         */
        updateSignatureCell(tableApi, rowIndex, columnSelector, data){
            tableApi.cell(rowIndex, columnSelector).data(data);
        }

        /**
         * check connectionIds for conflicts (multiple signatures -> same connection)
         * -> show "conflict" icon next to select
         */
        checkConnectionConflicts(){
            setTimeout(() => {
                let connectionSelectsSelector = [this._config.sigTablePrimaryClass, this._config.sigTableSecondaryClass].map(
                    tableClass => '.' + tableClass + ' .' + this._config.tableCellConnectionClass + '.editable'
                ).join(', ');

                let connectionSelects = $(connectionSelectsSelector);
                let connectionIds = [];
                let duplicateConnectionIds = [];
                let groupedSelects = [];

                connectionSelects.each(function(){
                    let select = $(this);
                    let value = parseInt(select.editable('getValue', true) )|| 0;

                    if(
                        connectionIds.indexOf(value) > -1 &&
                        duplicateConnectionIds.indexOf(value) === -1
                    ){
                        // duplicate found
                        duplicateConnectionIds.push(value);
                    }

                    if(groupedSelects[value] !== undefined){
                        groupedSelects[value].push(select[0]);
                    }else{
                        groupedSelects[value] = [select[0]];
                    }

                    connectionIds.push(value);
                });

                // update "conflict" icon next to select label for connectionIds
                connectionSelects.each(function(){
                    let select = $(this);
                    let value = parseInt(select.editable('getValue', true) )|| 0;
                    let conflictIcon = select.find('.fa-exclamation-triangle');
                    if(
                        duplicateConnectionIds.indexOf(value) > -1 &&
                        groupedSelects[value].indexOf(select[0]) > -1
                    ){
                        conflictIcon.removeClass('hide');
                    }else{
                        conflictIcon.addClass('hide');
                    }
                });
            }, 200);
        }

        /**
         * get group label by groupId
         * @param groupId
         * @returns {string}
         */
        getGroupLabelById(groupId){
            let options = this._config.signatureGroupsLabels.filter(option => option.value === groupId);
            return options.length ? options[0].text : '';
        }

        /**
         * helper function - get cell by columnSelector from same row as cell
         * @param tableApi
         * @param cell
         * @param columnSelector
         * @returns {*}
         */
        getNeighboringCell(tableApi, cell, columnSelector){
            return tableApi.cell(tableApi.cell(cell).index().row, columnSelector);
        }

        /**
         * get next cell by columnSelector
         * @param tableApi
         * @param cell
         * @param columnSelectors
         * @returns {*}
         */
        searchNextCell(tableApi, cell, columnSelectors){
            if(columnSelectors.length){
                // copy selectors -> .shift() modifies the orig array, important!
                columnSelectors = columnSelectors.slice(0);
                let nextCell = this.getNeighboringCell(tableApi, cell, columnSelectors.shift());
                let nextCellElement = nextCell.nodes().to$();
                if( nextCellElement.data('editable') ){
                    // cell is xEditable field -> skip "disabled" OR check value
                    let nextCellValue = nextCellElement.editable('getValue', true);
                    if(
                        [0, null].includes(nextCellValue) &&
                        !nextCellElement.data('editable').options.disabled
                    ){
                        // xEditable value is empty
                        return nextCell;
                    }else{
                        // search next cell
                        return this.searchNextCell(tableApi, cell, columnSelectors);
                    }
                }else if( nextCell.index().column === tableApi.column(-1).index() ){
                    // NO xEditable cell BUT last column (=> action cell) -> OK
                    return nextCell;
                }else{
                    console.error('No cell found for activation!');
                }
            }else{
                // return origin cell
                return tableApi.cell(cell);
            }
        }

        /**
         * make cell active -> focus() + show xEditable
         * @param cell
         */
        activateCell(cell){
            let cellElement = cell.nodes().to$();
            // check if cell is visible and not e.g. immediately filtered out by a search filter
            // -> https://github.com/exodus4d/pathfinder/issues/865
            if(cellElement.is(':visible')){
                // NO xEditable
                cellElement.focus();

                if(cellElement.data('editable')){
                    // cell is xEditable field -> show xEditable form
                    cellElement.editable('show');
                }
            }
        }

        /**
         * search neighboring cell (same row) and set "active" -> show editable
         * @param tableApi
         * @param cell
         * @param columnSelectors
         */
        activateNextCell(tableApi, cell, columnSelectors){
            let nextCell = this.searchNextCell(tableApi, cell, columnSelectors);
            this.activateCell(nextCell);
        }

        /**
         * helper function - set 'save' observer for xEditable cell
         * -> show "neighboring" xEditable field
         * @param tableApi
         * @param cell
         * @param columnSelectorsAjax - used for Ajax save (edit signature)
         * @param columnSelectorsDry - used for dry save (new signature)
         */
        editableOnSave(tableApi, cell, columnSelectorsAjax = [], columnSelectorsDry = []){
            $(cell).on('save', (e, params) => {
                if(params.response){
                    // send by Ajax
                    this.activateNextCell(tableApi, cell, columnSelectorsAjax);
                }else{
                    // dry save - no request
                    this.activateNextCell(tableApi, cell, columnSelectorsDry);
                }
            });
        }

        /**
         * helper function - set 'hidden' observer for xEditable cell
         * -> set focus() on xEditable field
         * @param tableApi
         * @param cell
         */
        editableOnHidden(tableApi, cell){
            $(cell).on('hidden', function(e, reason){
                // re-focus element on close (keyboard navigation)
                // 'save' event handles default focus (e.g. open new xEditable)
                // 'hide' handles all the rest (experimental)
                if(reason !== 'save'){
                    this.focus();
                }
            });
        }

        /**
         * helper function - set 'shown' observer for xEditable type cell
         * -> enable Select2 for xEditable form
         * @param cell
         */
        editableGroupOnShown(cell){
            $(cell).on('shown', (e, editable) => {
                let inputField = editable.input.$input;
                inputField.addClass('pf-select2').initSignatureGroupSelect();
            });
        }

        /**
         * helper function - set 'save' observer for xEditable group cell
         * -> update scanned signature bar
         * @param tableApi
         * @param cell
         */
        editableGroupOnSave(tableApi, cell){
            $(cell).on('save', (e, params) => {
                if(params.response){
                    // send by Ajax
                    this.updateScannedSignaturesBar(tableApi, {showNotice: true});
                }
            });
        }

        /**
         * helper function - set 'init' observer for xEditable type cell
         * -> disable xEditable field if no options available
         * @param cell
         */
        editableTypeOnInit(cell){
            $(cell).on('init', (e, editable) => {
                if(!editable.options.source().length){
                    this.editableDisable($(e.target));
                }
            });
        }

        /**
         * helper function - set 'shown' observer for xEditable type cell
         * -> enable Select2 for xEditable form
         * @param cell
         */
        editableTypeOnShown(cell){
            $(cell).on('shown', (e, editable) => {
                // destroy possible open popovers (e.g. wormhole types)
                $(e.target).destroyPopover(true);

                let inputField = editable.input.$input;
                let hasOptGroups = inputField.has('optgroup').length > 0;
                inputField.addClass('pf-select2').initSignatureTypeSelect({}, hasOptGroups);
            });
        }

        /**
         * helper function - set 'shown' observer for xEditable description cell
         * -> change height for "new signature" table wrapper
         * @param cell
         */
        editableDescriptionOnShown(cell){
            $(cell).on('shown', (e, editable) => {
                $(e.target).parents('.' + this._config.tableToolsActionClass).css('height', '+=35px');
            });
        }

        /**
         * helper function - set 'hidden' observer for xEditable description cell
         * -> change height for "new signature" table wrapper
         * @param cell
         */
        editableDescriptionOnHidden(cell){
            $(cell).on('hidden', (e, editable) => {
                $(cell).parents('.' + this._config.tableToolsActionClass).css('height', '-=35px');
            });
        }

        /**
         * helper function - set 'init' observer for xEditable connection cell
         * -> set focus() on xEditable field
         * @param cell
         */
        editableConnectionOnInit(cell){
            $(cell).on('init', (e, editable) => {
                if(editable.value > 0){
                    // empty connection selects ON INIT don´t make a difference for conflicts
                    this.checkConnectionConflicts();
                }
            });
        }

        /**
         * helper function - set 'shown' observer for xEditable connection cell
         * -> enable Select2 for xEditable form
         * @param tableApi
         * @param cell
         */
        editableConnectionOnShown(tableApi, cell){
            $(cell).on('shown', (e, editable) => {
                let inputField = editable.input.$input;

                if(!$(tableApi.table().node()).hasClass(this._config.sigTablePrimaryClass)){
                    // we need the primary table API to get selected connections
                    let metaData = this.getTableMetaData(tableApi);
                    tableApi = this.getDataTableInstance(metaData.mapId, metaData.systemId, 'primary');
                }

                // Select2 init would work without passing select options as "data", Select2 would grap data from DOM
                // -> We want to pass "meta" data for each option into Select2 for formatting
                let selectOptions = Util.convertXEditableOptionsToSelect2(editable);

                // for better UX, systems that are already linked to a wh signatures should be "disabled"
                // -> and grouped into a new <optgroup>
                let linkedConnectionIds = tableApi.column('connection:name').data().toArray();
                linkedConnectionIds = linkedConnectionIds.filter(id => id > 0);

                if(linkedConnectionIds.length){
                    let groupedSelectOptions = [];
                    let newSelectOptionGroupDisabled = [];
                    for(let selectOptionGroup of selectOptions){
                        if(Array.isArray(selectOptionGroup.children)){
                            let newSelectOptionGroup = [];
                            for(let option of selectOptionGroup.children){
                                if(!option.selected && linkedConnectionIds.includes(option.id)){
                                    // connection already linked -> move to "disabled" group
                                    option.disabled = true;
                                    newSelectOptionGroupDisabled.push(option);
                                }else{
                                    // connection is available for link
                                    newSelectOptionGroup.push(option);
                                }
                            }

                            if(newSelectOptionGroup.length){
                                groupedSelectOptions.push({
                                    text: selectOptionGroup.text,
                                    children: newSelectOptionGroup
                                });
                            }
                        }else{
                            // option has no children -> is prepend (id = 0) option
                            groupedSelectOptions.push(selectOptionGroup);
                        }
                    }

                    if(newSelectOptionGroupDisabled.length){
                        groupedSelectOptions.push({
                            text: 'linked',
                            children: newSelectOptionGroupDisabled
                        });
                    }

                    selectOptions = groupedSelectOptions;
                }

                let options = {
                    data: selectOptions
                };

                inputField.addClass('pf-select2').initSignatureConnectionSelect(options);
            });
        }

        /**
         * helper function - set 'save' observer for xEditable connection cell
         * -> check connection conflicts
         * @param cell
         */
        editableConnectionOnSave(cell){
            $(cell).on('save', (e, params) => {
                this.checkConnectionConflicts();
            });
        }

        /**
         * enable xEditable element
         * @param element
         */
        editableEnable(element){
            element.editable('enable');
            // (re)-enable focus on element by tabbing, xEditable removes "tabindex" on 'disable'
            element.attr('tabindex', 0);
        }

        /**
         * disable xEditable element
         * @param element
         */
        editableDisable(element){
            element.editable('disable');
            // xEditable sets 'tabindex = -1'
        }

        /**
         * en/disables xEditable element (select)
         * -> disables if there are no source options found
         * @param element
         */
        editableSelectCheck(element){
            if(element.data('editable')){
                let options = element.data('editable').options.source();
                if(options.length > 0){
                    this.editableEnable(element);
                }else{
                    this.editableDisable(element);
                }
            }
        }

        /**
         * open xEditable input field in "new Signature" table
         */
        focusNewSignatureEditableField(){
            $(this.moduleElement).find('.' + this._config.sigTableSecondaryClass)
                .find('td.' + this._config.sigTableEditSigNameInput).editable('show');
        }

        /**
         * set module observer
         */
        setModuleObserver(){
            // add signature toggle
            $(this.moduleElement).on('pf:showSystemSignatureModuleAddNew', e => {
                this.toggleAddSignature(true);
            });

            // event listener for global "paste" signatures into the page
            $(this.moduleElement).on('pf:updateSystemSignatureModuleByClipboard', (e, clipboard) => {
                let signatureOptions = {
                    deleteOld: this.getLazyUpdateToggleStatus(),
                    deleteConnection: 0
                };

                // "disable" lazy update icon -> prevents accidental removal for next paste #724
                $(this.getLazyUpdateToggleElement()).toggleClass('active', false);

                this.updateSignatureTableByClipboard(
                    this.getDataTableInstance(this._systemData.mapId, this._systemData.id, 'primary'),
                    clipboard,
                    signatureOptions
                );
            });

            // signature column - "type" popover
            MapUtil.initWormholeInfoTooltip(
                $(this.moduleElement).find('.' + this._config.sigTableClass),
                '.editable-click:not(.editable-open) span[class^="pf-system-sec-"]'
            );

            // init tooltips
            $(this.moduleElement).initTooltips();
        }

        /**
         * key (arrow) navigation inside a table -> set cell focus()
         * @param tableApi
         * @param e
         */
        keyNavigation(tableApi, e){
            let offset;
            if(e.keyCode === 37){
                offset = [-1, 0];
            }else if(e.keyCode === 38){
                offset = [0, -1];
            }else if(e.keyCode === 39){
                offset = [1, 0];
            }else if(e.keyCode === 40){
                offset = [0, 1];
            }

            if(Array.isArray(offset)){
                /**
                 * check if cellIndex is out of table range
                 * @param tableApi
                 * @param cellIndex
                 * @returns {*}
                 */
                let checkIndex = (tableApi, cellIndex) => {
                    if(cellIndex[0] < 0){
                        cellIndex[0] = tableApi.column(':last').nodes().to$().index(); // last column
                    }
                    if(cellIndex[0] > tableApi.column(':last').nodes().to$().index()){
                        cellIndex[0] = 0; // first column
                    }
                    if(cellIndex[1] < 0){
                        cellIndex[1] = tableApi.row(':last', {search: 'applied'}).nodes().to$().index(); // last row
                    }
                    if(cellIndex[1] > tableApi.row(':last', {search: 'applied'}).nodes().to$().index()){
                        cellIndex[1] = 0; // first row
                    }
                    return cellIndex;
                };

                /**
                 * recursive search next cell
                 * @param tableApi
                 * @param cellOrigin
                 * @param offset
                 * @returns {*}
                 */
                let searchCell = (tableApi, cellOrigin, offset) => {
                    // we need to get the current cell indexes from DOM (not internal DataTables indexes)
                    let nodeOrig = cellOrigin.nodes();
                    let colIndex = nodeOrig.to$().index();
                    let rowIndex = nodeOrig.to$().closest('tr').index();
                    let currentCellIndex = [colIndex, rowIndex];
                    let newCellIndex = currentCellIndex.map((index, i) => index + offset[i]);
                    // check if cell index is inside table dimensions
                    newCellIndex = checkIndex(tableApi, newCellIndex);

                    let cell = tableApi.cell(':eq(' + newCellIndex[1] + ')', ':eq(' + newCellIndex[0] + ')', {search: 'applied'});
                    let node = cell.node();

                    if(
                        !node.hasAttribute('tabindex') ||
                        parseInt(node.getAttribute('tabindex')) < 0
                    ){
                        // cell can not be focused -> search next
                        cell = searchCell(tableApi, cell, offset);
                    }
                    return cell;
                };

                let cell = searchCell(tableApi, tableApi.cell(e.target), offset);
                cell.node().focus();
            }
        }

        /**
         * show/hides a table <tr> rowElement
         * @param rowElement
         */
        toggleTableRow(rowElement){

            let toggleTableRowExecutor = (resolve, reject) => {
                let cellElements = rowElement.children('td');
                let duration = 350;
                // wrap each <td> into a container (for better animation performance)
                // slideUp new wrapper divs
                if(rowElement.is(':visible')){
                    // hide row

                    // stop sig counter by adding a stopClass to each <td>, remove padding
                    cellElements.addClass(Counter.config.counterStopClass)
                        .velocity({
                            paddingTop: [0, '4px'],
                            paddingBottom: [0, '4px'],
                            opacity: [0, 1]
                        },{
                            duration: duration,
                            easing: 'linear'
                        }).wrapInner('<div>')
                        .children()
                        .css({
                            'willChange': 'height'
                        }).velocity('slideUp', {
                        duration: duration,
                        easing: 'linear',
                        complete: function(animationElements){
                            // remove wrapper
                            $(animationElements).children().unwrap();

                            resolve({
                                action: 'rowHidden',
                                row: rowElement
                            });
                        }
                    });
                }else{
                    // show row

                    // remove padding on "hidden" cells for smother animation
                    cellElements.css({
                        'padding-top': 0,
                        'padding-bottom': 0,
                        'willChange': 'padding-top, padding-top, height'
                    });

                    // add hidden wrapper for ea
                    cellElements.wrapInner($('<div>').hide());

                    // show row for padding animation
                    rowElement.show();

                    cellElements.velocity({
                        paddingTop: ['4px', 0],
                        paddingBottom: ['4px', 0]
                    },{
                        duration: duration,
                        queue: false,
                        complete: function(){
                            // animate <td> wrapper
                            cellElements.children()
                                .css({
                                    'willChange': 'height'
                                }).velocity('slideDown', {
                                duration: duration,
                                complete: function(animationElements){
                                    // remove wrapper
                                    for(let i = 0; i < animationElements.length; i++){
                                        let currentWrapper = $(animationElements[i]);
                                        if(currentWrapper.children().length > 0){
                                            currentWrapper.children().unwrap();
                                        }else{
                                            currentWrapper.parent().html( currentWrapper.html() );
                                        }
                                    }

                                    resolve({
                                        action: 'rowShown',
                                        row: rowElement
                                    });
                                }
                            });
                        }
                    });
                }
            };

            return new Promise(toggleTableRowExecutor);
        }

        /**
         * update scanned signatures progress bar
         * @param tableApi
         * @param options
         */
        updateScannedSignaturesBar(tableApi, options){
            let tableElement = tableApi.table().node();
            let parentElement = $(tableElement).parents('.' + this._config.className + ', .' + this._config.sigReaderDialogClass);
            let progressBar = parentElement.find('.progress-bar');
            let progressBarLabel = parentElement.find('.progress-label-right');

            let percent = 0;
            let progressBarType = '';
            let columnGroupData = tableApi.column('group:name').data();
            let sigCount = columnGroupData.length;
            let sigIncompleteCount = columnGroupData.filter((value, index) => !value).length;

            if(sigCount){
                percent = 100 - Math.round( 100 / sigCount * sigIncompleteCount );
            }

            if(percent < 30){
                progressBarType = 'progress-bar-danger';
            }else if(percent < 100){
                progressBarType = 'progress-bar-warning';
            }else{
                progressBarType = 'progress-bar-success';
            }

            progressBarLabel.text(percent + '%');
            progressBar.removeClass().addClass('progress-bar').addClass(progressBarType);
            progressBar.attr('aria-valuenow', percent);
            progressBar.css({width: percent + '%'});

            // show notifications
            if(options.showNotice !== false){
                let notification = (sigCount - sigIncompleteCount) + ' / ' + sigCount + ' (' + percent + '%) signatures scanned';

                if(percent < 100){
                    this.showNotify({title: 'Unscanned signatures', text: notification, type: 'info'});
                }else{
                    this.showNotify({title: 'System is scanned', text: notification, type: 'success'});
                }
            }
        }

        /**
         * load existing (current) signature data into info table (preview)
         * @param infoTableApi
         * @param draw
         */
        initTableDataWithCurrentSignatureData(infoTableApi, draw = false){
            // reset/clear infoTable
            infoTableApi.clear();

            let primaryTableApi = this.getDataTableInstance(this._systemData.mapId, this._systemData.id, 'primary');
            if(primaryTableApi){
                infoTableApi.rows.add(primaryTableApi.data().toArray());
                if(draw){
                    infoTableApi.draw();
                }
            }else{
                console.warn('Signature table not found. mapId: %d; systemId: %d',this._systemData.mapId, this._systemData.id);
            }
        }

        /**
         * set "signature reader" dialog observer
         * @param dialogElement
         */
        setSignatureReaderDialogObserver(dialogElement){
            dialogElement                   = $(dialogElement);
            let form                        = dialogElement.find('form').first();
            let textarea                    = form.find('#' + this._config.sigInfoTextareaId);
            let deleteOutdatedCheckbox      = form.find('#' + this._config.sigReaderLazyUpdateId);
            let deleteConnectionsCheckbox   = form.find('#' + this._config.sigReaderConnectionDeleteId);
            let errorClipboardValidation    = 'No signatures found in scan result';
            let tableStatusElement          = dialogElement.find('.' + this._config.tableToolbarStatusClass);

            form.initFormValidation({
                delay: 0,
                feedback: {
                    success: 'fa-check',
                    error: 'fa-times'
                },
                custom: {
                    clipboard: textarea => {
                        let signatureData = this.parseSignatureString(textarea.val());
                        tableStatusElement.text(signatureData.length + ' signatures parsed');
                        if(signatureData.length === 0){
                            return errorClipboardValidation;
                        }
                    }
                }
            });

            let updatePreviewSection = (formData) => {
                let infoTableApi = this.getDataTableInstance(this._systemData.mapId, this._systemData.id, 'info');
                if(infoTableApi){
                    // init 'infoTable' with existing signature rows
                    // infoTableApi.draw() not necessary at this point!
                    this.initTableDataWithCurrentSignatureData(infoTableApi);

                    let signatureData = this.parseSignatureString(formData.clipboard);
                    if(signatureData.length > 0){
                        // valid signature data parsed
                        // -> add some default data (e.g. currentCharacter data) to parsed signatureData
                        // -> not required, just for filling up some more columns
                        signatureData = this.enrichParsedSignatureData(signatureData);

                        this.updateSignatureInfoTable(infoTableApi, signatureData, Boolean(formData.deleteOld), Boolean(formData.deleteConnection));
                    }else{
                        // no signatures pasted -> draw current signature rows
                        infoTableApi.draw();
                        // reset counter elements
                        this.updateSignatureReaderCounters(SystemSignatureModule.emptySignatureReaderCounterData);

                        this.updateScannedSignaturesBar(infoTableApi, {showNotice: false});

                        console.info(errorClipboardValidation);
                    }
                }else{
                    console.warn('Signature "preview" table not found. mapId: %d; systemId: %d', this._systemData.mapId, this._systemData.id);
                }
            };

            // changes in 'scan result' textarea -> update preview table --------------------------------------------------
            let oldValue = '';
            textarea.on('change keyup paste', () => {
                let formData = form.getFormValues();
                let currentValue = formData.clipboard;
                if(currentValue === oldValue){
                    return; //check to prevent multiple simultaneous triggers
                }
                oldValue = currentValue;

                updatePreviewSection(formData);
            });

            textarea.on('focus', function(e){
                this.select();
            });

            // en/disable 'lazy update' toggles dependent checkbox --------------------------------------------------------
            let onDeleteOutdatedCheckboxChange = function(){
                deleteConnectionsCheckbox.prop('disabled', !this.checked);
                deleteConnectionsCheckbox.prop('checked', false);
            }.bind(deleteOutdatedCheckbox[0]);

            deleteOutdatedCheckbox.on('change', onDeleteOutdatedCheckboxChange);
            onDeleteOutdatedCheckboxChange();

            // en/disable checkboxes -> update preview table --------------------------------------------------------------
            deleteOutdatedCheckbox.add(deleteConnectionsCheckbox).on('change', () => {
                let formData = form.getFormValues();
                if(formData.clipboard.length){
                    updatePreviewSection(form.getFormValues());
                }
            });

            // listen 'primary' sig table updates -> update 'preview' sig table in the dialog -----------------------------
            dialogElement.on('pf:updateSignatureReaderDialog', () => {
                updatePreviewSection(form.getFormValues());
            });
        }

        /**
         * open "signature reader" dialog for signature table
         * @param tableApi
         */
        showSignatureReaderDialog(tableApi){
            requirejs([
                'text!templates/dialog/signature_reader.html',
                'mustache'
            ], (TplDialog, Mustache) => {
                let data = {
                    sigInfoId: this._config.sigInfoId,
                    sigReaderLazyUpdateId: this._config.sigReaderLazyUpdateId,
                    sigReaderConnectionDeleteId: this._config.sigReaderConnectionDeleteId,
                    sigInfoTextareaId: this._config.sigInfoTextareaId,
                    sigInfoLazyUpdateStatus: this.getLazyUpdateToggleStatus(),
                    sigInfoCountSigNewId: this._config.sigInfoCountSigNewId,
                    sigInfoCountSigChangeId: this._config.sigInfoCountSigChangeId,
                    sigInfoCountSigDeleteId: this._config.sigInfoCountSigDeleteId,
                    sigInfoCountConDeleteId: this._config.sigInfoCountConDeleteId,
                    sigInfoProgressElement: this.newProgressElement().outerHTML
                };

                let signatureReaderDialog = bootbox.dialog({
                    className: this._config.sigReaderDialogClass,
                    title: 'Signature reader',
                    size: 'large',
                    message: Mustache.render(TplDialog, data),
                    show: false,
                    buttons: {
                        close: {
                            label: 'cancel',
                            className: 'btn-default'
                        },
                        success: {
                            label: '<i class="fas fa-paste fa-fw"></i>&nbsp;update signatures',
                            className: 'btn-success',
                            callback: e => {
                                let form = $(e.delegateTarget).find('form');

                                // validate form
                                form.validator('validate');

                                // check whether the form is valid
                                if(form.isValidForm()){
                                    // get form data
                                    let formData = form.getFormValues();

                                    let signatureOptions = {
                                        deleteOld: (formData.deleteOld) ? 1 : 0,
                                        deleteConnection: (formData.deleteConnection) ? 1 : 0
                                    };

                                    this.updateSignatureTableByClipboard(tableApi, formData.clipboard, signatureOptions);
                                }else{
                                    return false;
                                }
                            }
                        }
                    }
                });

                signatureReaderDialog.on('show.bs.modal', e => {
                    let infoTableApi = this.drawSignatureTableInfo(e.target);
                    // init 'infoTable' with existing signature rows
                    this.initTableDataWithCurrentSignatureData(infoTableApi, true);

                    this.updateScannedSignaturesBar(infoTableApi, {showNotice: false});

                    this.setSignatureReaderDialogObserver(e.target);
                });

                // dialog shown event
                signatureReaderDialog.on('shown.bs.modal', e => {
                    signatureReaderDialog.initTooltips();

                    // set focus on sig-input textarea
                    signatureReaderDialog.find('textarea').focus();
                });

                // show dialog
                signatureReaderDialog.modal('show');
            });
        }

        /**
         * get "lazy delete" toggle element
         * @returns {*}
         */
        getLazyUpdateToggleElement(){
            return this.moduleElement.querySelector('.' + this._config.moduleHeadlineIconLazyClass);
        }

        /**
         * get status for "lazy delete" toggle
         * @returns {number}
         */
        getLazyUpdateToggleStatus(){
            return this.getLazyUpdateToggleElement().classList.contains('active') ? 1 : 0;
        }

        /**
         * update 'counter' UI elements in 'signature reader' dialog
         * @param data
         */
        updateSignatureReaderCounters(data){
            let counterElement = $('#' + this._config.sigInfoCountSigNewId).text(data.added || 0);
            counterElement.toggleClass(counterElement.attr('data-class'), Boolean(data.added));

            counterElement = $('#' + this._config.sigInfoCountSigChangeId).text(data.changed || 0);
            counterElement.toggleClass(counterElement.attr('data-class'), Boolean(data.changed));

            counterElement = $('#' + this._config.sigInfoCountSigDeleteId).text(data.deleted || 0);
            counterElement.toggleClass(counterElement.attr('data-class'), Boolean(data.deleted));

            counterElement = $('#' + this._config.sigInfoCountConDeleteId).text(data.deleteCon || 0);
            counterElement.toggleClass(counterElement.attr('data-class'), Boolean(data.deleteCon));
        }

        /**
         * add new row to signature table
         * @param tableApi
         * @param signatureData
         * @returns {*}
         */
        addSignatureRow(tableApi, signatureData){
            return tableApi ? tableApi.row.add(signatureData) : null;
        }

        /**
         * @param action
         * @param rowId
         * @returns {Promise}
         */
        getPromiseForRow(action, rowId){
            return new Promise(resolve => {
                resolve({action: action, rowId: rowId});
            });
        }

        /**
         * callback for a changed row
         * @param rowIndex
         * @param colIndex
         * @param tableLoopCount
         * @param cellLoopCount
         * @param options           CUSTOM parameter (not DataTables specific)!
         */
        rowUpdate(rowIndex, colIndex, tableLoopCount, cellLoopCount, options){
            let cell = Util.getObjVal(options, 'cell');
            let node = cell.nodes().to$();
            if(node.data('editable')){
                // xEditable is active -> should always be active!
                // set new value even if no change -> e.g. render selected Ids as text labels
                let oldValue = node.editable('getValue', true);

                // ... some editable cells depend on each other (e.g. group->type, group->connection)
                switch(node.data('editable').options.name){
                    case 'typeId':
                        // ... disable if no type options found
                        this.editableSelectCheck(node);
                        break;
                    case 'connectionId':
                        // disables if no wormhole group set
                        let groupId = cell.cell(rowIndex, 'group:name').data();
                        if(groupId === 5){
                            // wormhole
                            this.editableEnable(node);
                        }else{
                            this.editableDisable(node);
                        }
                        break;
                }

                // values should be set AFTER en/disabling of a field
                node.editable('setValue', cell.data());

                if(oldValue !== cell.data()){
                    // highlight cell on data change
                    node.pulseBackgroundColor('changed', Util.getObjVal(options, 'keepVisible') || false);
                }
            }else if(node.hasClass(this._config.tableCellCounterClass)){
                // "updated" timestamp always changed
                node.pulseBackgroundColor('changed', Util.getObjVal(options, 'keepVisible') || false);
            }
        }

        /**
         * update 'info' (preview) signature table (inside 'signature reader' dialog)
         * @param tableApi
         * @param signaturesDataOrig
         * @param deleteOutdatedSignatures
         * @param deleteConnections
         */
        updateSignatureInfoTable(tableApi, signaturesDataOrig, deleteOutdatedSignatures = false, deleteConnections = false){
            let module = this;

            // clone signature array because of further manipulation
            let signaturesData = $.extend([], signaturesDataOrig);

            let rowIdsExist = [];

            let promisesAdded = [];
            let promisesChanged = [];
            let promisesDeleted = [];

            let allRows = tableApi.rows();

            let rowUpdateCallback = function(){
                module.rowUpdate(...arguments, {cell: this, keepVisible: true});
            };

            // update rows ------------------------------------------------------------------------------------------------
            allRows.every(function(rowIdx, tableLoop, rowLoop){
                let row = this;
                let rowData = row.data();

                for(let i = 0; i < signaturesData.length; i++){
                    if(signaturesData[i].name === rowData.name){
                        let rowId = row.id(true);

                        // check if row was updated
                        if(signaturesData[i].updated.updated > rowData.updated.updated){
                            // set new row data -> draw() is executed after all changes made
                            let newRowData = signaturesData[i];
                            // keep "description" must not be replaced
                            newRowData.description = rowData.description;
                            // existing "groupId" must not be removed
                            if(!newRowData.groupId){
                                newRowData.groupId = rowData.groupId;
                                newRowData.typeId = rowData.typeId;
                            }else if(newRowData.groupId === rowData.groupId){
                                if(!newRowData.typeId){
                                    newRowData.typeId = rowData.typeId;
                                }
                            }

                            // "created" timestamp will not change -> use existing
                            newRowData.created = rowData.created;
                            row.data(newRowData);

                            // bind new signature dataTable data() -> to xEditable inputs
                            row.cells(row.id(true), ['id:name', 'group:name', 'type:name', 'description:name', 'connection:name', 'updated:name'])
                                .every(rowUpdateCallback);

                            promisesChanged.push(module.getPromiseForRow('changed', rowId));
                        }

                        rowIdsExist.push(rowIdx);

                        // remove signature data -> all left signatures will be added
                        signaturesData.splice(i, 1);
                        i--;
                    }
                }
            });

            // delete rows ------------------------------------------------------------------------------------------------
            if(deleteOutdatedSignatures){
                let rows = tableApi.rows((rowIdx, rowData, node) => !rowIdsExist.includes(rowIdx));
                rows.every(function(rowIdx, tableLoop, rowLoop){
                    let row = this;
                    let rowId = row.id(true);
                    let rowElement = row.nodes().to$();
                    let rowData = row.data();

                    rowElement.pulseBackgroundColor('deleted', true);

                    promisesChanged.push(module.getPromiseForRow('deleted', rowId));

                    // check if there is a connectionId.
                    if(deleteConnections && Util.getObjVal(rowData, 'connection.id')){
                        promisesChanged.push(module.getPromiseForRow('deleteCon', rowId));
                    }
                });
            }

            // add rows ---------------------------------------------------------------------------------------------------
            for(let signatureData of signaturesData){
                let row = module.addSignatureRow(tableApi, signatureData);
                let rowElement = row.nodes().to$();
                rowElement.pulseBackgroundColor('added', true);

                promisesAdded.push(module.getPromiseForRow('added', row.index()));
            }

            // done -------------------------------------------------------------------------------------------------------
            Promise.all(promisesAdded.concat(promisesChanged, promisesDeleted)).then(payloads => {
                if(payloads.length){
                    // table data changed -> draw() table changes
                    tableApi.draw();

                    // no notifications if table was empty just progressbar notification is needed
                    // sum payloads by "action"
                    let notificationCounter = payloads.reduce((acc, payload) => {
                        acc[payload.action]++;
                        return acc;
                    }, Object.assign({}, SystemSignatureModule.emptySignatureReaderCounterData));

                    module.updateSignatureReaderCounters(notificationCounter);

                    module.updateScannedSignaturesBar(tableApi, {showNotice: false});
                }
            });
        }

        /**
         * update signature table with new signatures
         * -> add/update/delete rows
         * @param tableApi
         * @param signaturesDataOrig
         * @param deleteOutdatedSignatures
         */
        updateSignatureTable(tableApi, signaturesDataOrig, deleteOutdatedSignatures = false){
            let module = this;

            if(tableApi.hasProcesses('lock')){
                console.info('Signature table locked. Skip table update');
                return;
            }

            // disable tableApi until update finished;
            let processLockPromise = tableApi.newProcess('lock');

            // clone signature array because of further manipulation
            let signaturesData = $.extend([], signaturesDataOrig);

            let rowIdsExist = [];

            let promisesAdded = [];
            let promisesChanged = [];
            let promisesDeleted = [];

            let allRows = tableApi.rows();
            let updateEmptyTable = !allRows.any();

            let rowUpdateCallback = function(){
                module.rowUpdate(...arguments, {cell: this});
            };

            // update signatures ------------------------------------------------------------------------------------------
            allRows.every(function(rowIdx, tableLoop, rowLoop){
                let row = this;
                let rowData = row.data();

                for(let i = 0; i < signaturesData.length; i++){
                    if(signaturesData[i].id === rowData.id){
                        let rowId = row.id(true);

                        // check if row was updated
                        if(signaturesData[i].updated.updated > rowData.updated.updated){
                            // set new row data -> draw() is executed after all changes made
                            row.data(signaturesData[i]);

                            // bind new signature dataTable data() -> to xEditable inputs
                            row.cells(row.id(true), ['id:name', 'group:name', 'type:name', 'description:name', 'connection:name', 'updated:name'])
                                .every(rowUpdateCallback);

                            promisesChanged.push(module.getPromiseForRow('changed', rowId));
                        }

                        rowIdsExist.push(rowId);

                        // remove signature data -> all left signatures will be added
                        signaturesData.splice(i, 1);
                        i--;
                    }
                }
            });

            // delete signatures ------------------------------------------------------------------------------------------
            if(deleteOutdatedSignatures){
                let rows = tableApi.rows((rowIdx, rowData, node) => !rowIdsExist.includes('#' + module._config.sigTableRowIdPrefix + rowData.id));
                rows.every(function(rowIdx, tableLoop, rowLoop){
                    let row = this;
                    let rowId = row.id(true);
                    let rowElement = row.nodes().to$();

                    // hide open editable fields on the row before removing them
                    rowElement.find('.editable').editable('destroy');

                    // destroy possible open popovers (e.g. wormhole types, update popover)
                    rowElement.destroyPopover(true);

                    rowElement.pulseBackgroundColor('deleted');

                    promisesDeleted.push(new Promise((resolve, reject) => {
                        module.toggleTableRow(rowElement).then(payload => resolve({action: 'deleted', rowIdx: rowId}));
                    }));
                }).remove();
            }

            // add new signatures -----------------------------------------------------------------------------------------
            for(let signatureData of signaturesData){
                let row = module.addSignatureRow(tableApi, signatureData);
                let rowId = row.id(true);
                let rowElement = row.nodes().to$();
                rowElement.pulseBackgroundColor('added');

                promisesAdded.push(module.getPromiseForRow('added', rowId));
            }

            // done -------------------------------------------------------------------------------------------------------
            Promise.all(promisesAdded.concat(promisesChanged, promisesDeleted)).then(payloads => {
                if(payloads.length){
                    // table data changed -> draw() table changes
                    tableApi.draw();

                    // check for "leads to" conflicts -> important if there are just "update" (no add/delete) changes
                    module.checkConnectionConflicts();

                    if(!updateEmptyTable){
                        // no notifications if table was empty just progressbar notification is needed
                        // sum payloads by "action"
                        let notificationCounter = payloads.reduce((acc, payload) => {
                            if(!acc[payload.action]){
                                acc[payload.action] = 0;
                            }
                            acc[payload.action]++;
                            return acc;
                        }, Object.assign({}, SystemSignatureModule.emptySignatureReaderCounterData));

                        let notification = Object.keys(notificationCounter).reduce((acc, key) => {
                            return `${acc}${notificationCounter[key] ? `${notificationCounter[key]} ${key}<br>` : ''}`;
                        }, '');

                        if(notification.length){
                            Util.showNotify({title: 'Signatures updated', text: notification, type: 'success', textTrusted: true});
                        }
                    }

                    module.updateScannedSignaturesBar(tableApi, {showNotice: true});

                    // at this point the 'primary' signature table update is done
                    // we need to check if there is an open 'signature reader' dialog,
                    // that needs to update its 'preview' signature table
                    // -> to use DataTables "drawCallback" option or "draw.dt" event is not the *best* option:
                    //    Both are called to frequently (e.g. after filter/sort actions)
                    $('.' + module._config.sigReaderDialogClass + '.in').trigger('pf:updateSignatureReaderDialog');
                }

                // unlock table
                tableApi.endProcess(processLockPromise);
            });
        }

        /**
         * update signature "history" popover
         * @param tableApi
         * @param historyData
         */
        updateSignatureHistory(tableApi, historyData){
            let tableElement = tableApi.table().node();
            $(tableElement).data('history', historyData);
        }

        /**
         * update module
         * compare data and update module
         * @param systemData
         * @returns {Promise}
         */
        update(systemData){
            return super.update(systemData).then(systemData => new Promise(resolve => {
                if(
                    Util.getObjVal(systemData, 'id') === this._systemData.id &&
                    Util.getObjVal(systemData, 'mapId') === this._systemData.mapId &&
                    Util.getObjVal(systemData, 'signatures') &&
                    Util.getObjVal(systemData, 'sigHistory')
                ){
                    let tableApi = this.getDataTableInstance(systemData.mapId, systemData.id, 'primary');
                    this.updateSignatureTable(tableApi, systemData.signatures, true);
                    this.updateSignatureHistory(tableApi, systemData.sigHistory);
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

            let tableApi = this.getDataTableInstance(this._systemData.mapId, this._systemData.id, 'primary');
            tableApi.endProcess($(this.moduleElement).data('lockPromise'));
        }

        /**
         * before module hide callback
         */
        beforeHide(){
            super.beforeHide();
            // disable update
            this.getDataTableInstance(this._systemData.mapId, this._systemData.id, 'primary').newProcess('lock');
        }

        /**
         * get all signature types that can exist for a system (jQuery obj)
         * @param systemElement
         * @param groupId
         * @returns {*[]|*}
         */
        static getSignatureTypeOptionsBySystem(systemElement, groupId){
            let systemTypeId = systemElement.data('typeId');
            let areaId = Util.getAreaIdBySecurity(systemElement.data('security'));
            let systemData = {statics: systemElement.data('statics')};
            return SystemSignatureModule.getSignatureTypeOptions(systemTypeId, areaId, groupId, systemData);
        }

        /**
         * get all connection select options
         * @param mapId
         * @param systemData
         * @returns {[]}
         */
        static getSignatureConnectionOptions(mapId, systemData){
            let map = Map.getMapInstance(mapId);
            let systemId = MapUtil.getSystemId(mapId, systemData.id);
            let systemConnections = MapUtil.searchConnectionsBySystems(map, [systemId], 'wh');
            let newSelectOptions = [];
            let connectionOptions = [];

            /**
             * get option data for a single connection
             * @param type
             * @param connectionData
             * @param systemData
             * @returns {{value: *, text: string, metaData: {type: *}}}
             */
            let getOption = (type, connectionData, systemData) => {
                let text = 'UNKNOWN';
                if(type === 'source'){
                    text = connectionData.sourceAlias + ' - ' + systemData.security;
                }else if(type === 'target'){
                    text = connectionData.targetAlias + ' - ' + systemData.security;
                }

                return {
                    value: connectionData.id,
                    text: text,
                    metaData: {
                        type: connectionData.type
                    }
                };
            };

            for(let systemConnection of systemConnections){
                let connectionData = MapUtil.getDataByConnection(systemConnection);

                // connectionId is required (must be stored)
                if(connectionData.id){
                    // check whether "source" or "target" system is relevant for this connection
                    // -> hint "source" === 'target' --> loop
                    if(systemData.id !== connectionData.target){
                        let targetSystemData = MapUtil.getSystemData(mapId, connectionData.target);
                        if(targetSystemData){
                            // take target...
                            connectionOptions.push(getOption('target', connectionData, targetSystemData));
                        }
                    }else if(systemData.id !== connectionData.source){
                        let sourceSystemData = MapUtil.getSystemData(mapId, connectionData.source);
                        if(sourceSystemData){
                            // take source...
                            connectionOptions.push(getOption('source', connectionData, sourceSystemData));
                        }
                    }
                }
            }

            if(connectionOptions.length > 0){
                newSelectOptions.push({text: 'System', children: connectionOptions});
            }

            return newSelectOptions;
        }

        /**
         * get all signature types that can exist for a given system
         * -> result is partially cached
         * @param systemTypeId
         * @param areaId
         * @param groupId
         * @param statics
         * @param shattered
         * @returns {[]|*}
         */
        static getSignatureTypeOptions(systemTypeId, areaId, groupId, {statics = null, shattered = false} = {}){
            systemTypeId    = parseInt(systemTypeId || 0);
            areaId          = parseInt(areaId || 0);
            groupId         = parseInt(groupId || 0);
            let newSelectOptionsCount = 0;

            if(!systemTypeId || !areaId || !groupId){
                return [];
            }

            // check if sig types require more than one 'areaId' to be checked
            let areaIds = SystemSignatureModule.getAreaIdsForSignatureTypeOptions(systemTypeId, areaId, groupId, shattered);

            let cacheKey = [systemTypeId, ...areaIds, groupId].join('_');

            let newSelectOptions = SystemSignatureModule.getCache('sigTypeOptions').get(cacheKey);

            // check for cached signature names
            if(Array.isArray(newSelectOptions)){
                // hint: Cached signatures do not include static WHs!
                // -> ".slice(0)" creates copy
                newSelectOptions = newSelectOptions.slice(0);
                newSelectOptionsCount = SystemSignatureModule.getOptionsCount('children', newSelectOptions);
            }else{
                newSelectOptions = [];
                // get new Options ----------
                // get all possible "static" signature names by the selected groupId
                // -> for groupId == 5 (wormholes) this give you "wandering" whs
                let tempSelectOptions = Util.getSignatureTypeNames(systemTypeId, areaIds, groupId);

                // format options into array with objects advantages: keep order, add more options (whs), use optgroup
                if(tempSelectOptions){
                    let fixSelectOptions = [];
                    for(let key in tempSelectOptions){
                        if(
                            key > 0 &&
                            tempSelectOptions.hasOwnProperty(key)
                        ){
                            newSelectOptionsCount++;
                            fixSelectOptions.push({value: newSelectOptionsCount, text: tempSelectOptions[key]});
                        }
                    }

                    if(newSelectOptionsCount > 0){
                        if(groupId === 5){
                            // "wormhole" selected => multiple <optgroup> available
                            newSelectOptions.push({text: 'Wandering', children: fixSelectOptions});
                        }else{
                            newSelectOptions = fixSelectOptions;
                        }
                    }
                }

                // wormhole (cached signatures)
                if( groupId === 5 ){

                    // add possible frigate holes
                    let frigateHoles = SystemSignatureModule.getFrigateHolesBySystem(areaId);
                    let frigateWHData = [];
                    for(let frigKey in frigateHoles){
                        if(
                            frigKey > 0 &&
                            frigateHoles.hasOwnProperty(frigKey)
                        ){
                            newSelectOptionsCount++;
                            frigateWHData.push({value: newSelectOptionsCount, text: frigateHoles[frigKey]});
                        }
                    }

                    if(frigateWHData.length > 0){
                        newSelectOptions.push({text: 'Frigate', children: frigateWHData});
                    }

                    // add potential drifter holes (k-space only)
                    if([30, 31, 32].includes(areaId)){
                        let drifterWHData = [];
                        for(let drifterKey in Init.drifterWormholes){
                            if(
                                drifterKey > 0 &&
                                Init.drifterWormholes.hasOwnProperty(drifterKey)
                            ){
                                newSelectOptionsCount++;
                                drifterWHData.push({value: newSelectOptionsCount, text: Init.drifterWormholes[drifterKey]});
                            }
                        }

                        if(drifterWHData.length > 0){
                            newSelectOptions.push({text: 'Drifter', children: drifterWHData});
                        }
                    }

                    // add potential incoming holes
                    let incomingWHData = [];
                    for(let incomingKey in Init.incomingWormholes){
                        if(
                            incomingKey > 0 &&
                            Init.incomingWormholes.hasOwnProperty(incomingKey)
                        ){
                            newSelectOptionsCount++;
                            incomingWHData.push({value: newSelectOptionsCount, text: Init.incomingWormholes[incomingKey]});
                        }
                    }

                    if(incomingWHData.length > 0){
                        newSelectOptions.push({text: 'Incoming', children: incomingWHData});
                    }
                }else{
                    // groups without "children" (optgroup) should be sorted by "value"
                    // this is completely optional and not necessary!
                    newSelectOptions = newSelectOptions.sortBy('text');
                }

                // update cache (clone array) -> further manipulation to this array, should not be cached
                SystemSignatureModule.getCache('sigTypeOptions').set(cacheKey, newSelectOptions.slice(0));
            }

            // static wormholes (DO NOT CACHE) (not all C2 WHs have the same statics..)
            if(groupId === 5){
                // add static WH(s) for this system
                if(statics){
                    let staticWHData = [];
                    let filterOptionCallback = text => option => option.text !== text;

                    for(let wormholeName of statics){
                        let wormholeData = Object.assign({}, Init.wormholes[wormholeName]);
                        let staticWHName = wormholeData.name + ' - ' + wormholeData.security;

                        // filter staticWHName from existing options -> prevent duplicates in <optgroup>
                        SystemSignatureModule.filterGroupedOptions(newSelectOptions, filterOptionCallback(staticWHName));

                        newSelectOptionsCount++;
                        staticWHData.push({value: newSelectOptionsCount, text: staticWHName});
                    }

                    if(staticWHData.length > 0){
                        newSelectOptions.unshift({text: 'Static', children: staticWHData});
                    }
                }
            }

            return newSelectOptions;
        }

        /**
         * filter out some options from nested select options
         * @param obj
         * @param callback
         * @param key
         */
        static filterGroupedOptions(obj, callback = () => true, key = 'children'){
            for(let [i, val] of Object.entries(obj)){
                // pre-check if filter callback will some, prevents unnecessary cloning
                if(
                    typeof val === 'object' &&
                    val.hasOwnProperty(key) &&
                    val[key].not(callback).length
                ){
                    // clone object, apply filter to key prop
                    obj[i] = Object.assign({}, obj[i], {[key]: val[key].filter(callback)});
                }
            }
        }

        /**
         * get possible frig holes that could spawn in a system
         * filtered by "systemTypeId"
         * @param systemTypeId
         * @returns {{}}
         */
        static getFrigateHolesBySystem(systemTypeId){
            let signatureNames = {};
            if(Init.frigateWormholes[systemTypeId]){
                signatureNames = Init.frigateWormholes[systemTypeId];
            }
            return signatureNames;
        }

        /**
         * sum up all options in nested (or not nested) object of objects
         * -> e.g.
         * {
         *     first: {
         *         count = [4, 2, 1]
         *         test = { ... }
         *     },
         *     second: {
         *         count = [12, 13]
         *         test = { ... }
         *     }
         * }
         * -> getOptionsCount('count', obj) => 5;
         * @param key
         * @param obj
         * @returns {number}
         */
        static getOptionsCount(key, obj){
            let sum = 0;
            for(let entry of obj){
                if(entry.hasOwnProperty(key)){
                    sum += entry[key].length;
                }else{
                    sum++;
                }
            }
            return sum;
        }

        /**
         * Some signatures types can spawn in more than one 'areaId' for a 'groupId'
         * -> e.g. a 'shattered' C3 WHs have Combat/Relic/.. sites from C2, C3, c4!
         *    https://github.com/exodus4d/pathfinder/issues/875
         * @param systemTypeId
         * @param areaId
         * @param groupId
         * @param shattered
         * @returns {[*]}
         */
        static getAreaIdsForSignatureTypeOptions(systemTypeId, areaId, groupId, shattered = false){
            let areaIds = [areaId];

            if(
                systemTypeId === 1 && shattered &&
                [1, 2, 3, 4, 5, 6].includes(areaId) &&
                [1, 2, 3].includes(groupId) // Combat, Relic, Data
            ){
                areaIds = [areaId - 1, areaId, areaId + 1].filter(areaId => areaId >= 1 && areaId <= 6);
            }else if(
                systemTypeId === 1 && shattered &&
                [1, 2, 3, 4, 5, 6].includes(areaId) &&
                [4, 6].includes(groupId) // Gas, Ore
            ){
                areaIds = [1, 2, 3, 4, 5, 6, 13];
            }

            return areaIds;
        }
    };

    SystemSignatureModule.isPlugin = false;                                     // module is defined as 'plugin'
    SystemSignatureModule.scope = 'system';                                     // module scope controls how module gets updated and what type of data is injected
    SystemSignatureModule.sortArea = 'a';                                       // default sortable area
    SystemSignatureModule.position = 4;                                         // default sort/order position within sortable area
    SystemSignatureModule.label = 'Signatures';                                 // static module label (e.g. description)
    SystemSignatureModule.fullDataUpdate = true;                                // static module requires additional data (e.g. system description,...)
    SystemSignatureModule.cacheConfig = {
        sigTypeOptions: {                                                       // cache signature names
            ttl: 60 * 5,
            maxSize: 100
        }
    };

    SystemSignatureModule.validSignatureNames = [                               // allowed signature type/names
        'Cosmic Anomaly',
        'Cosmic Signature',
        'Kosmische Anomalie',                                                   // de: "Cosmic Anomaly"
        'Kosmische Signatur',                                                   // de: "Cosmic Signature"
        'Космическая аномалия',                                                 // ru: "Cosmic Anomaly"
        'Скрытый сигнал',                                                       // ru: "Cosmic Signature"
        'Anomalie cosmique',                                                    // fr: "Cosmic Anomaly"
        'Signature cosmique',                                                   // fr: "Cosmic Signature"
        '宇宙の特異点',                                                           // ja: "Cosmic Anomaly"
        '宇宙のシグネチャ',                                                        // ja: "Cosmic Signature"
        '异常空间',                                                                 // zh: "Cosmic Anomaly"
        '空间信号'                                                                  // zh: "Cosmic Signature"
    ];

    SystemSignatureModule.emptySignatureData = {
        id: 0,
        name: '',
        groupId: 0,
        typeId: 0
    };

    SystemSignatureModule.emptySignatureReaderCounterData = {
        added: 0,
        changed: 0,
        deleted: 0,
        deleteCon: 0
    };

    SystemSignatureModule.editableDefaults = {                                  // xEditable default options for signature fields
        url: function(params){
            let saveExecutor = (resolve, reject) => {
                // only submit params if id (pk) is set
                if(params.pk){
                    let requestData = {};
                    requestData[params.name] = params.value;

                    Util.request('PATCH', 'Signature', params.pk, requestData)
                        .then(payload => resolve(payload.data))
                        .catch(payload => reject(payload.data.jqXHR));
                }else{
                    resolve();
                }
            };

            return new Promise(saveExecutor);
        },
        dataType: 'json',
        highlight: false,   // i use a custom implementation. xEditable uses inline styles for bg color animation -> does not work properly on datatables "sort" cols
        error: function(jqXHR, newValue){
            let reason = '';
            let status = 'Error';
            if(jqXHR.statusText){
                reason = jqXHR.statusText;
            }else if(jqXHR.name){
                // validation error new sig (new row data save function)
                reason = jqXHR.name.msg;
                // re-open "name" fields (its a collection of fields but we need "id" field)
                jqXHR.name.field.$element.editable('show');
            }else{
                reason = jqXHR.responseJSON.text;
                status = jqXHR.status;
            }

            Util.showNotify({title: status + ': save signature', text: reason, type: 'error'});
            $(document).setProgramStatus('problem');
            return reason;
        }
    };

    SystemSignatureModule.defaultConfig = {
        className: 'pf-system-signature-module',                                // class for module
        sortTargetAreas: ['a', 'b', 'c'],                                       // sortable areas where module can be dragged into
        headline: 'Signatures',

        // headline toolbar
        moduleHeadlineIconAddClass: 'pf-module-icon-button-add',                // class for "add signature" icon
        moduleHeadlineIconReaderClass: 'pf-module-icon-button-reader',          // class for "signature reader" icon
        moduleHeadlineIconLazyClass: 'pf-module-icon-button-lazy',              // class for "lazy delete" toggle icon
        moduleHeadlineProgressBarClass: 'pf-system-progress-scanned',           // class for signature progress bar

        // fonts
        fontUppercaseClass: 'pf-font-uppercase',                                // class for "uppercase" font

        // tables
        tableToolsActionClass: 'pf-table-tools-action',                         // class for "new signature" table (hidden)

        // table toolbar
        tableToolbarStatusClass: 'pf-table-toolbar-status',                     // class for "status" DataTable Toolbar
        sigTableClearButtonClass: 'pf-sig-table-clear-button',                  // class for "clear" signatures button

        // signature table
        sigTableId: 'pf-sig-table-',                                            // Table id prefix
        sigTableClass: 'pf-sig-table',                                          // Table class for all Signature Tables
        sigTablePrimaryClass: 'pf-sig-table-primary',                           // class for primary sig table
        sigTableSecondaryClass: 'pf-sig-table-secondary',                       // class for secondary sig table
        sigTableInfoClass: 'pf-sig-table-info',                                 // class for info sig table
        sigTableRowIdPrefix: 'pf-sig-row_',                                     // id prefix for table rows

        sigTableEditSigNameInput: 'pf-sig-table-edit-name-input',               // class for editable fields (sig name)

        tableCellTypeClass: 'pf-table-type-cell',                               // class for "type" cells
        tableCellConnectionClass: 'pf-table-connection-cell',                   // class for "connection" cells
        tableCellFocusClass: 'pf-table-focus-cell',                             // class for "tab-able" cells. enable focus()
        tableCellCounterClass: 'pf-table-counter-cell',                         // class for "counter" cells
        tableCellActionClass: 'pf-table-action-cell',                           // class for "action" cells

        // xEditable
        editableDescriptionInputClass: 'pf-editable-description',               // class for "description" textarea
        editableUnknownInputClass: 'pf-editable-unknown',                       // class for input fields (e.g. checkboxes) with "unknown" status

        signatureGroupsLabels: Util.getSignatureGroupOptions('label'),
        signatureGroupsNames: Util.getSignatureGroupOptions('name'),

        // signature reader dialog
        sigReaderDialogClass: 'pf-sig-reader-dialog',                           // class for "signature reader" dialog
        sigInfoId: 'pf-sig-info',                                               // id for "signature info" table area
        sigInfoTextareaId: 'pf-sig-info-textarea',                              // id for signature reader "textarea"
        sigReaderLazyUpdateId: 'pf-sig-reader-lazy-update',                     // id for "lazy update" checkbox
        sigReaderConnectionDeleteId: 'pf-sig-reader-delete-connection',         // id for "delete connection" checkbox

        sigInfoCountSigNewId: 'pf-sig-info-count-sig-new',                      // id for "signature new" counter
        sigInfoCountSigChangeId: 'pf-sig-info-count-sig-change',                // id for "signature change" counter
        sigInfoCountSigDeleteId: 'pf-sig-info-count-sig-delete',                // id for "signature delete" counter
        sigInfoCountConDeleteId: 'pf-sig-info-count-con-delete'                 // id for "connection delete" counter
    };

    return SystemSignatureModule;
});