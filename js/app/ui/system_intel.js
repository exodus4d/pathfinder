/**
 * system route module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox'
], ($, Init, Util, bootbox) => {
    'use strict';

    let config = {
        // module info
        modulePosition: 1,
        moduleName: 'systemIntel',
        moduleHeadClass: 'pf-module-head',                                      // class for module header
        moduleHandlerClass: 'pf-module-handler-drag',                           // class for "drag" handler
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
    let getStatusData = (statusData) => {
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
     * callback -> add structure rows from responseData
     * @param context
     * @param responseData
     */
    let callbackAddStructureRows = (context, responseData) => {
        let systemData = Util.getObjVal(responseData, 'system');
        callbackUpdateStructureRows(context, systemData);
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
            if(corporations) {
                for (let [corporationId, corporationData] of Object.entries(corporations)){
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
                                let api = context.tableApi.row('#' + rowId).data(structureData);
                                api.nodes().to$().data('animationStatus', 'changed').destroyTimestampCounter();

                                touchedRows.push(api.id());
                                notificationCounter.changed++;
                            }else{
                                // insert new row
                                //context.tableApi.row.add(structureData).nodes().to$().data('animationStatus', 'added');
                                let api = context.tableApi.row.add(structureData);
                                api.nodes().to$().data('animationStatus', 'added');

                                touchedRows.push(api.id());
                                notificationCounter.added++;
                            }
                        }
                    }
                }
            }
        }

        if(context.removeMissing){
            notificationCounter.deleted += context.tableApi.rows((idx, data, node) => !touchedRows.includes(node.id)).remove().ids().count();
        }

        context.tableApi.draw();

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
     * @param responseData
     */
    let callbackDeleteStructures = (context, responseData) => {
        let structureIds = Util.getObjVal(responseData, 'deletedStructureIds');
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
        }).fail(function( jqXHR, status, error) {
            let reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': System intel data', text: reason, type: 'warning'});
            $(document).setProgramStatus('problem');
        }).always(function(){
            // hide loading animation
            this.moduleElement.hideLoadingAnimation();
        });
    };

    /**
     * requests system data
     * @param requestData
     * @param context
     * @param callback
     */
    let getStructureData = (requestData, context, callback) => {
        sendRequest(Init.path.getSystemData, requestData, context, callback);
    };

    /**
     * save structure data
     * @param requestData
     * @param context
     * @param callback
     */
    let saveStructureData = (requestData, context, callback) => {
        sendRequest(Init.path.saveStructureData, requestData, context, callback);
    };

    /**
     * delete structure
     * @param requestData
     * @param context
     * @param callback
     */
    let deleteStructure = (requestData, context, callback) => {
        sendRequest(Init.path.deleteStructureData, requestData, context, callback);
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
        let structureTypeData = Util.getObjVal(Init, 'structureStatus');

        let data = {
            id: config.structureDialogId,
            structureData: structureData,
            structureStatus: Object.keys(structureStatusData).map((k) => {
                let data = structureStatusData[k];
                data.selected = data.id === Util.getObjVal(structureData, 'status.id');
                return data;
            }),
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
                show: true,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fas fa-fw fa-check"></i>&nbsp;save',
                        className: 'btn-success',
                        callback: function (){
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

                                saveStructureData({
                                    structures: [formData]
                                }, {
                                    moduleElement: moduleElement,
                                    tableApi: tableApi
                                }, callbackUpdateStructureRows);
                            }else{
                                return false;
                            }
                        }
                    }
                }
            });

            structureDialog.on('shown.bs.modal', function(e) {
                // init type select live search
                let selectElementType = $(this).find('#' + config.typeSelectId);
                selectElementType.initUniverseTypeSelect({
                    categoryIds: [65],
                    maxSelectionLength: 1,
                    selected: [Util.getObjVal(structureData, 'structure.id')]
                });

                // init corporation select live search
                let selectElementCorporation = $(this).find('#' + config.corporationSelectId);
                selectElementCorporation.initUniverseSearch({
                    categoryNames: ['corporation'],
                    maxSelectionLength: 1
                });

                $(this).find('#' + config.statusSelectId).select2({
                    minimumResultsForSearch: -1
                });

                // init character counter
                let textarea = $(this).find('#' + config.descriptionTextareaId);
                let charCounter = $(this).find('.' + config.descriptionTextareaCharCounter);
                Util.updateCounter(textarea, charCounter, maxDescriptionLength);

                textarea.on('keyup', function(){
                    Util.updateCounter($(this), charCounter, maxDescriptionLength);
                });

                // set form validator (after select2 init finish)
                $(this).find('form').initFormValidation();
            });

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
                        callback: function (){
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
            structureDialog.on('shown.bs.modal', function(e) {
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

        // create new module container
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

        let structureTable = table.DataTable({
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
                    title: '',
                    width: 2,
                    class: 'text-center',
                    data: 'status',
                    render: {
                        display: data =>  getStatusData(data),
                        sort: data => data.id
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                         $(cell).find('i').tooltip();
                    }
                },{
                    targets: 1,
                    title: '',
                    width: 26,
                    orderable: false,
                    className: [config.tableCellImageClass, 'text-center'].join(' '),
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
                    title: 'type',
                    width: 30,
                    className: [config.tableCellEllipsisClass].join(' '),
                    data: 'structure.name',
                    defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                },{
                    targets: 3,
                    title: 'name',
                    width: 60,
                    className: [config.tableCellEllipsisClass].join(' '),
                    data: 'name'
                },{
                    targets: 4,
                    title: '',
                    width: 26,
                    orderable: false,
                    className: [config.tableCellImageClass, 'text-center'].join(' '),
                    data: 'owner.id',
                    defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display' && value){
                                value = '<img src="' + Init.url.ccpImageServer + '/Corporation/' + value + '_32.png" />';
                            }
                            return value;
                        }
                    }
                },{
                    targets: 5,
                    title: 'owner',
                    width: 50,
                    className: [config.tableCellEllipsisClass].join(' '),
                    data: 'owner.name',
                    defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                },{
                    targets: 6,
                    title: 'note',
                    className: [config.tableCellEllipsisClass].join(' '),
                    data: 'description'
                },{
                    targets: 7,
                    title: 'updated',
                    width: 80,
                    className: ['text-right', config.tableCellCounterClass].join(' '),
                    data: 'updated.updated'
                },{
                    targets: 8,
                    title: '',
                    orderable: false,
                    width: 10,
                    class: ['text-center', config.dataTableActionCellClass, config.moduleHeadlineIconClass].join(' '),
                    data: null,
                    render: {
                        display: data => {
                            let icon = '<i class="fas fa-pencil-alt"></i>';
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
                            $(cell).on('click', function(e) {
                                // get current row data (important!)
                                // -> "rowData" param is not current state, values are "on createCell()" state
                                rowData = tableApi.row( $(cell).parents('tr')).data();
                                showStructureDialog(moduleElement, tableApi, systemData.systemId, rowData);
                            });
                        }
                    }
                },{
                    targets: 9,
                    title: '',
                    orderable: false,
                    width: 10,
                    class: ['text-center', config.dataTableActionCellClass].join(' '),
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
                                    deleteStructure({
                                        id: rowData.id
                                    },{
                                        moduleElement: moduleElement,
                                        tableApi: tableApi
                                    }, callbackDeleteStructures);
                                }
                            };

                            // init confirmation dialog
                            $(cell).confirmation(confirmationSettings);
                        }
                    }
                },{
                    targets: 10,
                    name: 'corporation',
                    data: 'corporation',
                    visible: false,
                    render: {
                        sort: function(data){
                            return data.name;
                        }
                    }
                }
            ],
            drawCallback: function (settings){
                let tableApi = this.api();
                let columnCount = tableApi.columns(':visible').count();
                let rows = tableApi.rows( {page:'current'} ).nodes();
                let last= null;

                tableApi.column('corporation:name', {page:'current'} ).data().each( function ( group, i ) {
                    if ( !last || last.id !== group.id ) {
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

                rows.to$().find('.' + config.tableCellCounterClass + ':not([data-counter])').initTimestampCounter();

                let animationRows = rows.to$().filter(function() {
                    return (
                        $(this).data('animationStatus') ||
                        $(this).data('animationTimer')
                    );
                });

                for(let i = 0; i < animationRows.length; i++){
                    let animationRow = $(animationRows[i]);
                    animationRow.pulseTableRow(animationRow.data('animationStatus'));
                    animationRow.removeData('animationStatus');
                }
            },
            initComplete: function(settings){
                let tableApi = this.api();

                // initial structure data request
                getStructureData({
                    mapId: mapId,
                    systemId: systemData.id
                },{
                    moduleElement: moduleElement,
                    tableApi: tableApi
                }, callbackAddStructureRows);
            }
        });

        // init tooltips for this module
        let tooltipElements = moduleElement.find('[data-toggle="tooltip"]');
        tooltipElements.tooltip({
            container: 'body'
        });

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
        let structureData = parseDscanString(systemData, clipboard);
        if(structureData.length){
            saveStructureData({
                structures: structureData
            }, context, callbackUpdateStructureRows);
        }
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
            getStructureData({
                mapId: mapId,
                systemId: systemData.id
            },{
                moduleElement: moduleElement,
                tableApi: tableApi,
                removeMissing: true
            }, callbackAddStructureRows);
        });

        // init listener for global "past" dScan into this page -------------------------------------------------------
        moduleElement.on('pf:updateIntelModuleByClipboard', function(e, clipboard){
            updateStructureTableByClipboard(systemData, clipboard, {
                moduleElement: moduleElement,
                tableApi: tableApi
            });
        });
    };

    return {
        config: config,
        getModule: getModule,
        initModule: initModule
    };

});