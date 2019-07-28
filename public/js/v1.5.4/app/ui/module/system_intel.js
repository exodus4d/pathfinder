/**
 * System intel module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox',
    'app/counter'
], ($, Init, Util, bootbox, Counter) => {
    'use strict';

    let config = {
        // module info
        modulePosition: 1,
        moduleName: 'systemIntel',
        moduleHeadClass: 'pf-module-head',                                      // class for module header
        moduleHandlerClass: 'pf-module-handler-drag',                           // class for "drag" handler

        // system info module
        moduleTypeClass: 'pf-system-intel-module',                              // class for this module

        // headline toolbar
        moduleHeadlineIconClass: 'pf-module-icon-button',                       // class for toolbar icons in the head
        moduleHeadlineIconAddClass: 'pf-module-icon-button-add',                // class for "add structure" icon
        moduleHeadlineIconReaderClass: 'pf-module-icon-button-reader',          // class for "dScan reader" icon
        moduleHeadlineIconRefreshClass: 'pf-module-icon-button-refresh',        // class for "refresh" icon

        // system intel module
        systemStructuresTableClass: 'pf-system-structure-table',                // class for route tables

        // structure dialog
        structureDialogId: 'pf-structure-dialog',                               // id for "structure" dialog
        statusSelectId: 'pf-structure-dialog-status-select',                    // id for "status" select
        typeSelectId: 'pf-structure-dialog-type-select',                        // id for "type" select
        corporationSelectId: 'pf-structure-dialog-corporation-select',          // id for "corporation" select
        descriptionTextareaId: 'pf-structure-dialog-description-textarea',      // id for "description" textarea
        descriptionTextareaCharCounter: 'pf-form-field-char-count',             // class for "character counter" element for form field

        // dataTable
        tableRowIdPrefix: 'pf-structure-row_',                                  // id prefix for table rows
        tableCellImageClass: 'pf-table-image-smaller-cell',                     // class for table "image" cells
        tableCellCounterClass: 'pf-table-counter-cell',                         // class for table "counter" cells
        tableCellEllipsisClass: 'pf-table-cell-ellipses-auto',                  // class for table "ellipsis" cells
        dataTableActionCellClass: 'pf-table-action-cell'                        // class for "action" cells
    };

    let maxDescriptionLength = 512;

    /**
     * get status icon for structure
     * @param statusData
     * @returns {string}
     */
    let getStatusData = statusData => {
        return '<i class="fas fa-fw fa-circle ' + statusData.class + '" title="' + statusData.label + '"></i>';
    };

    /**
     * get <tr> DOM id by id
     * @param tableApi
     * @param id
     * @returns {*}
     */
    let getRowId = (tableApi, id) => {
        return tableApi.rows().ids().toArray().find(rowId => rowId === config.tableRowIdPrefix + id);
    };

    /**
     * callback -> add structure rows from systemData
     * @param context
     * @param systemData
     */
    let callbackUpdateStructureRows = (context, systemData) => {
        let touchedRows = [];
        let hadData = context.tableApi.rows().any();
        let notificationCounter = {
            added: 0,
            changed: 0,
            deleted: 0
        };

        if(systemData){
            let corporations = Util.getObjVal(systemData, 'structures');
            if(corporations){
                for(let [corporationId, corporationData] of Object.entries(corporations)){
                    if(corporationData.structures && corporationData.structures.length){
                        for(let structureData of corporationData.structures){
                            let rowId = getRowId(context.tableApi, structureData.id);

                            // add corporation data
                            structureData.corporation = {
                                id: corporationData.id,
                                name: corporationData.name
                            };

                            if(rowId){
                                // update row
                                let api = context.tableApi.row('#' + rowId);
                                let rowData = api.data();

                                // check for update
                                if(rowData.updated.updated !== structureData.updated.updated){
                                    // row data changed -> update
                                    api.data(structureData);
                                    notificationCounter.changed++;
                                }

                                touchedRows.push(api.id());
                            }else{
                                // insert new row
                                let api = context.tableApi.row.add(structureData);
                                api.nodes().to$().data('animationStatus', 'added');
                                notificationCounter.added++;

                                touchedRows.push(api.id());
                            }
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

        if(
            notificationCounter.added > 0 ||
            notificationCounter.changed > 0 ||
            notificationCounter.deleted > 0
        ){
            context.tableApi.draw();
        }

        // show notification ------------------------------------------------------------------------------------------
        let notification = '';
        notification += notificationCounter.added > 0 ? notificationCounter.added + ' added<br>' : '';
        notification += notificationCounter.changed > 0 ? notificationCounter.changed + ' changed<br>' : '';
        notification += notificationCounter.deleted > 0 ? notificationCounter.deleted + ' deleted<br>' : '';

        if(hadData && notification.length){
            Util.showNotify({title: 'Structures updated', text: notification, type: 'success'});
        }
    };

    /**
     * callback -> delete structure rows
     * @param context
     * @param structureIds
     */
    let callbackDeleteStructures = (context, structureIds) => {
        let deletedCounter = 0;
        if(structureIds && structureIds.length){
            for(let structureId of structureIds){
                let rowId = getRowId(context.tableApi, structureId);
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
    };

    /**
     * send ajax request
     * @param url
     * @param requestData
     * @param context
     * @param callback
     */
    let sendRequest = (url, requestData, context, callback) => {
        context.moduleElement.showLoadingAnimation();

        $.ajax({
            url: url,
            type: 'POST',
            dataType: 'json',
            data: requestData,
            context: context
        }).done(function(data){
            callback(this, data);
        }).fail(function(jqXHR, status, error){
            let reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': System intel data', text: reason, type: 'warning'});
            $(document).setProgramStatus('problem');
        }).always(function(){
            // hide loading animation
            this.moduleElement.hideLoadingAnimation();
        });
    };

    /**
     * show structure dialog
     * @param moduleElement
     * @param tableApi
     * @param systemId
     * @param structureData
     */
    let showStructureDialog = (moduleElement, tableApi, systemId, structureData) => {
        let structureStatusData = Util.getObjVal(Init, 'structureStatus');

        let statusData = Object.keys(structureStatusData).map((k) => {
            let data = structureStatusData[k];
            data.selected = data.id === Util.getObjVal(structureData, 'status.id');
            return data;
        });

        let data = {
            id: config.structureDialogId,
            structureData: structureData,
            structureStatus: statusData,
            statusSelectId: config.statusSelectId,
            typeSelectId: config.typeSelectId,
            corporationSelectId: config.corporationSelectId,
            descriptionTextareaId: config.descriptionTextareaId,
            descriptionTextareaCharCounter: config.descriptionTextareaCharCounter,
            maxDescriptionLength: maxDescriptionLength
        };

        requirejs(['text!templates/dialog/structure.html', 'mustache'], (template, Mustache) => {
            let content = Mustache.render(template, data);

            let structureDialog = bootbox.dialog({
                title: 'Structure',
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
                                formData.systemId = systemId | 0;

                                moduleElement.showLoadingAnimation();

                                let method = formData.id ? 'PATCH' : 'PUT';
                                Util.request(method, 'structure', formData.id, formData,
                                    {
                                        moduleElement: moduleElement,
                                        tableApi: tableApi
                                    },
                                    context => context.moduleElement.hideLoadingAnimation()
                                ).then(
                                    payload => callbackUpdateStructureRows(payload.context, {structures: payload.data}),
                                    Util.handleAjaxErrorResponse
                                );
                            }else{
                                return false;
                            }
                        }
                    }
                }
            });

            structureDialog.on('show.bs.modal', function(e){
                let modalContent = $('#' + config.structureDialogId);

                // init type select live search
                let selectElementType = modalContent.find('#' + config.typeSelectId);
                selectElementType.initUniverseTypeSelect({
                    categoryIds: [65],
                    maxSelectionLength: 1,
                    selected: [Util.getObjVal(structureData, 'structure.id')]
                });

                // init corporation select live search
                let selectElementCorporation = modalContent.find('#' + config.corporationSelectId);
                selectElementCorporation.initUniverseSearch({
                    categoryNames: ['corporation'],
                    maxSelectionLength: 1
                });

                // init status select2
                modalContent.find('#' + config.statusSelectId).initStatusSelect({
                    data: statusData
                });

                // init char counter
                let textarea = modalContent.find('#' + config.descriptionTextareaId);
                let charCounter = modalContent.find('.' + config.descriptionTextareaCharCounter);
                Util.updateCounter(textarea, charCounter, maxDescriptionLength);

                textarea.on('keyup', function(){
                    Util.updateCounter($(this), charCounter, maxDescriptionLength);
                });

                // set form validator (after select2 init finish)
                modalContent.find('form').initFormValidation();
            });

            // show dialog
            structureDialog.modal('show');
        });
    };

    /**
     * show D-Scan reader dialog
     * @param moduleElement
     * @param tableApi
     * @param systemData
     */
    let showDscanReaderDialog = (moduleElement, tableApi, systemData) => {
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
                        callback: function(){
                            let form = this.find('form');
                            let formData = form.getFormValues();

                            updateStructureTableByClipboard(systemData, formData.clipboard, {
                                moduleElement: moduleElement,
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
    };

    /**
     * get module element
     * @param parentElement
     * @param mapId
     * @param systemData
     * @returns {jQuery}
     */
    let getModule = (parentElement, mapId, systemData) => {
        let corporationId = Util.getCurrentUserInfo('corporationId');

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
                        class: ['fas', 'fa-fw', 'fa-plus', config.moduleHeadlineIconClass, config.moduleHeadlineIconAddClass].join(' '),
                        title: 'add'
                    }).attr('data-html', 'true').attr('data-toggle', 'tooltip'),
                    $('<i>', {
                        class: ['fas', 'fa-fw', 'fa-paste', config.moduleHeadlineIconClass, config.moduleHeadlineIconReaderClass].join(' '),
                        title: 'D-Scan&nbsp;reader'
                    }).attr('data-html', 'true').attr('data-toggle', 'tooltip'),
                    $('<i>', {
                        class: ['fas', 'fa-fw', 'fa-sync', config.moduleHeadlineIconClass, config.moduleHeadlineIconRefreshClass].join(' '),
                        title: 'refresh&nbsp;all'
                    }).attr('data-html', 'true').attr('data-toggle', 'tooltip')
                ),
                $('<h5>', {
                    text: 'Intel'
                })
            )
        );

        let table = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border', 'pf-table-fixed', config.systemStructuresTableClass].join(' ')
        });
        moduleElement.append(table);

        let tableApi = table.DataTable({
            paging: false,
            lengthChange: false,
            ordering: true,
            order: [[ 10, 'desc' ], [ 0, 'asc' ]],
            info: false,
            searching: false,
            hover: false,
            autoWidth: false,
            rowId: rowData => config.tableRowIdPrefix + rowData.id,
            language: {
                emptyTable:  'No structures recorded',
                info: '_START_ to _END_ of _MAX_',
                infoEmpty: ''
            },
            rowGroup: {
                enable: true,
                dataSrc: 'systemId'
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
                        display: data => getStatusData(data),
                        sort: data => data.id
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                         $(cell).find('i').tooltip();
                    }
                },{
                    targets: 1,
                    name: 'structureImage',
                    title: '',
                    width: 26,
                    orderable: false,
                    className: [config.tableCellImageClass, 'text-center', 'all'].join(' '),
                    data: 'structure.id',
                    defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display' && value){
                                value = '<img src="' + Init.url.ccpImageServer + '/Type/' + value + '_32.png" />';
                            }
                            return value;
                        }
                    }
                },{
                    targets: 2,
                    name: 'structureType',
                    title: 'type',
                    width: 30,
                    className: [config.tableCellEllipsisClass, 'all'].join(' '),
                    data: 'structure.name',
                    defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                },{
                    targets: 3,
                    name: 'name',
                    title: 'name',
                    width: 60,
                    className: [config.tableCellEllipsisClass, 'all'].join(' '),
                    data: 'name'
                },{
                    targets: 4,
                    name: 'ownerImage',
                    title: '',
                    width: 26,
                    orderable: false,
                    className: [config.tableCellImageClass, 'text-center', 'all'].join(' '),
                    data: 'owner.id',
                    defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display' && value){
                                value = '<a href="https://zkillboard.com/corporation/' + data + '/" target="_blank" rel="noopener">';
                                value += '<img src="' + Init.url.ccpImageServer + '/Corporation/' + data + '_32.png" />';
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
                    className: [config.tableCellEllipsisClass, 'all'].join(' '),
                    data: 'owner.name',
                    defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                },{
                    targets: 6,
                    name: 'note',
                    title: 'note',
                    className: [config.tableCellEllipsisClass, 'all'].join(' '),
                    data: 'description'
                },{
                    targets: 7,
                    name: 'updated',
                    title: 'updated',
                    width: 60,
                    className: ['text-right', config.tableCellCounterClass, 'not-screen-l'].join(' '),
                    data: 'updated.updated'
                },{
                    targets: 8,
                    name: 'edit',
                    title: '',
                    orderable: false,
                    width: 10,
                    className: ['text-center', config.dataTableActionCellClass, config.moduleHeadlineIconClass, 'all'].join(' '),
                    data: null,
                    render: {
                        display: data => {
                            let icon = '<i class="fas fa-pen"></i>';
                            if(data.corporation.id !== corporationId){
                                icon = '';
                            }
                            return icon;
                        }
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tableApi = this.api();

                        if($(cell).is(':empty')){
                            $(cell).removeClass(config.dataTableActionCellClass + ' ' + config.moduleHeadlineIconClass);
                        }else{
                            $(cell).on('click', function(e){
                                // get current row data (important!)
                                // -> "rowData" param is not current state, values are "on createCell()" state
                                rowData = tableApi.row( $(cell).parents('tr')).data();
                                showStructureDialog(moduleElement, tableApi, systemData.systemId, rowData);
                            });
                        }
                    }
                },{
                    targets: 9,
                    name: 'delete',
                    title: '',
                    orderable: false,
                    width: 10,
                    className: ['text-center', config.dataTableActionCellClass, 'all'].join(' '),
                    data: null,
                    render: {
                        display: data => {
                            let icon = '<i class="fas fa-times txt-color txt-color-redDarker"></i>';
                            if(data.corporation.id !== corporationId){
                                icon = '<i class="fas fa-ban txt-color txt-color-grayLight" title="restricted" data-placement="left"></i>';
                            }
                            return icon;
                        }
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tableApi = this.api();

                        if($(cell).find('.fa-ban').length){
                            $(cell).removeClass(config.dataTableActionCellClass + ' ' + config.moduleHeadlineIconClass);
                            $(cell).find('i').tooltip();
                        }else{
                            let confirmationSettings = {
                                container: 'body',
                                placement: 'left',
                                btnCancelClass: 'btn btn-sm btn-default',
                                btnCancelLabel: 'cancel',
                                btnCancelIcon: 'fas fa-fw fa-ban',
                                title: 'delete structure',
                                btnOkClass: 'btn btn-sm btn-danger',
                                btnOkLabel: 'delete',
                                btnOkIcon: 'fas fa-fw fa-times',
                                onConfirm : function(e, target){
                                    // get current row data (important!)
                                    // -> "rowData" param is not current state, values are "on createCell()" state
                                    rowData = tableApi.row( $(cell).parents('tr')).data();

                                    // let deleteRowElement = $(cell).parents('tr');
                                    // tableApi.rows(deleteRowElement).remove().draw();

                                    moduleElement.showLoadingAnimation();
                                    Util.request('DELETE', 'structure', rowData.id, {},
                                        {
                                            moduleElement: moduleElement,
                                            tableApi: tableApi
                                        },
                                        context => context.moduleElement.hideLoadingAnimation()
                                    ).then(
                                        payload => callbackDeleteStructures(payload.context, payload.data),
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
                    name: 'corporation',
                    className: 'never',     // never show this column. see: https://datatables.net/extensions/responsive/classes
                    data: 'corporation',
                    visible: false,
                    render: {
                        sort: function(data){
                            return data.name;
                        }
                    }
                }
            ],
            drawCallback: function(settings){
                let tableApi = this.api();
                let columnCount = tableApi.columns(':visible').count();
                let rows = tableApi.rows( {page:'current'} ).nodes();
                let last= null;

                tableApi.column('corporation:name', {page:'current'} ).data().each( function(group, i ){
                    if( !last || last.id !== group.id ){
                        $(rows).eq(i).before(
                            '<tr class="group">' +
                                '<td></td>' +
                                '<td class="' + config.tableCellImageClass + '">' +
                                    '<img src="' + Init.url.ccpImageServer + '/Corporation/' + group.id + '_32.png" />' +
                                '</td>' +
                                '<td colspan="' + (columnCount - 2 ) + '">' + group.name + '</td>' +
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
            },
            initComplete: function(settings){
                // table data is load in updateModule() method
                // -> no need to trigger additional ajax call here for data
                // -> in case table update failed -> each if this initComplete() function finished before table updated
                // e.g. return now promise in getModule() function

                Counter.initTableCounter(this, ['updated:name'], 'd');
            }
        });

        new $.fn.dataTable.Responsive(tableApi);

        tableApi.on('responsive-resize', function(e, tableApi, columns){
            // rowGroup length changes as well -> trigger draw() updates rowGroup length (see drawCallback())
            tableApi.draw();
        });

        // init tooltips for this module
        let tooltipElements = moduleElement.find('[data-toggle="tooltip"]');
        tooltipElements.tooltip({
            container: 'body'
        });

        moduleElement.showLoadingAnimation();

        return moduleElement;
    };

    /**
     * get universe typeIds for given categoryIds
     * @param categoryIds
     * @returns {Array}
     */
    let getUniverseTypeIdsByCategoryIds = (categoryIds) => {
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
    };

    /**
     * parse a copy&paste string from ingame dScan windows
     * @param systemData
     * @param clipboard
     * @returns {Array}
     */
    let parseDscanString = (systemData, clipboard) => {
        let dScanData = [];
        let structureTypeIds = getUniverseTypeIdsByCategoryIds([65]);

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
    };

    /**
     * parse clipboard data for structures and update table
     * @param systemData
     * @param clipboard
     * @param context
     */
    let updateStructureTableByClipboard = (systemData, clipboard, context) => {

        let saveStructureData = (structureData, context) => {
            context.moduleElement.showLoadingAnimation();

            Util.request('POST', 'structure', [], structureData, context, context => context.moduleElement.hideLoadingAnimation())
                .then(
                    payload => callbackUpdateStructureRows(payload.context, {structures: payload.data}),
                    Util.handleAjaxErrorResponse
                );
        };

        let structureData = parseDscanString(systemData, clipboard);
        if(structureData.length){
            // valid structure data parsed

            // check if structures will be added to a system where character is currently in
            // if character is not in any system -> id === undefined -> no "confirmation required
            let currentLocationData = Util.getCurrentLocationData();
            if(
                currentLocationData.id &&
                currentLocationData.id !== systemData.systemId
            ){
                let systemNameStr = (systemData.name === systemData.alias) ? '"' + systemData.name + '"' : '"' + systemData.alias + '" (' + systemData.name + ')';
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
    };

    /**
     * update trigger function for this module
     * compare data and update module
     * @param moduleElement
     * @param systemData
     */
    let updateModule = (moduleElement, systemData) => {

        // update structure table data
        let structureTableElement = moduleElement.find('.' + config.systemStructuresTableClass);
        let tableApi = structureTableElement.DataTable();

        let context = {
            tableApi: tableApi,
            removeMissing: true
        };

        callbackUpdateStructureRows(context, systemData);

        moduleElement.hideLoadingAnimation();
    };

    /**
     * init intel module
     * @param moduleElement
     * @param mapId
     * @param systemData
     */
    let initModule = (moduleElement, mapId, systemData) => {

        let structureTableElement =  moduleElement.find('.' + config.systemStructuresTableClass);
        let tableApi = structureTableElement.DataTable();

        // init structure dialog --------------------------------------------------------------------------------------
        moduleElement.find('.' + config.moduleHeadlineIconAddClass).on('click', function(e){
            showStructureDialog(moduleElement, tableApi, systemData.systemId);
        });

        // init structure dialog --------------------------------------------------------------------------------------
        moduleElement.find('.' + config.moduleHeadlineIconReaderClass).on('click', function(e){
            showDscanReaderDialog(moduleElement, tableApi, systemData);
        });

        // init refresh button ----------------------------------------------------------------------------------------
        moduleElement.find('.' + config.moduleHeadlineIconRefreshClass).on('click', function(e){
            moduleElement.showLoadingAnimation();

            Util.request('GET', 'system', systemData.id, {mapId: mapId},
                    {
                        moduleElement: moduleElement,
                        tableApi: tableApi,
                        removeMissing: true
                    },
                    context => context.moduleElement.hideLoadingAnimation()
                ).then(payload => callbackUpdateStructureRows(payload.context, payload.data));
        });

        // init listener for global "past" dScan into this page -------------------------------------------------------
        moduleElement.on('pf:updateIntelModuleByClipboard', function(e, clipboard){
            updateStructureTableByClipboard(systemData, clipboard, {
                moduleElement: moduleElement,
                tableApi: tableApi
            });
        });
    };

    /**
     * before module destroy callback
     * @param moduleElement
     */
    let beforeDestroy = moduleElement => {
        let structureTableElement = moduleElement.find('.' + config.systemStructuresTableClass);
        let tableApi = structureTableElement.DataTable();
        tableApi.destroy();
    };

    return {
        config: config,
        getModule: getModule,
        initModule: initModule,
        updateModule: updateModule,
        beforeDestroy: beforeDestroy
    };

});