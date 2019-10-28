/**
 * System intel module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox',
    'app/counter',
    'app/map/util',
], ($, Init, Util, bootbox, Counter, MapUtil) => {
    'use strict';

    let config = {
        // module info
        modulePosition: 1,
        moduleName: 'systemIntel',
        moduleHeadClass: 'pf-module-head',                                      // class for module header
        moduleHandlerClass: 'pf-module-handler-drag',                           // class for "drag" handler

        // system intel module
        moduleTypeClass: 'pf-system-intel-module',                              // class for this module

        // headline toolbar
        moduleHeadlineIconClass: 'pf-module-icon-button',                       // class for toolbar icons in the head
        moduleHeadlineIconAddClass: 'pf-module-icon-button-add',                // class for "add structure" icon
        moduleHeadlineIconReaderClass: 'pf-module-icon-button-reader',          // class for "dScan reader" icon
        moduleHeadlineIconRefreshClass: 'pf-module-icon-button-refresh',        // class for "refresh" icon

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
        tableCellServicesClass: 'pf-table-services-cell'                        // class for table station "services" cells
    };

    let maxDescriptionLength = 512;

    /**
     * get status icon for structure
     * @param statusData
     * @returns {string}
     */
    let getIconForStatusData = statusData => {
        return '<i class="fas fa-fw fa-circle ' + statusData.class + '" title="' + statusData.label + '"></i>';
    };

    /**
     * get icon that marks a table cell as clickable
     * @returns {string}
     */
    let getIconForInformationWindow = () => {
        return '<i class="fas fa-fw fa-id-card ' + config.tableCellActionIconClass + '" title="open ingame" data-toggle="tooltip"></i>';
    };

    /**
     * get dataTable id
     * @param mapId
     * @param systemId
     * @param tableType
     * @returns {string}
     */
    let getTableId = (tableType, mapId, systemId) => Util.getTableId(config.intelTableId, tableType, mapId, systemId);

    /**
     * get dataTable row id
     * @param tableType
     * @param id
     * @returns {string}
     */
    let getRowId = (tableType, id) => Util.getTableRowId(config.intelTableRowIdPrefix, tableType, id);

    /**
     * get <tr> DOM id by id
     * @param tableApi
     * @param id
     * @returns {*}
     */
    let getRowById = (tableApi, id) => {
        return tableApi.rows().ids().toArray().find(rowId => rowId === getRowId(Util.getObjVal(getTableMetaData(tableApi), 'type'), id));
    };

    /**
     * get custom "metaData" from dataTables API
     * @param tableApi
     * @returns {*}
     */
    let getTableMetaData = tableApi => {
        let data = null;
        if(tableApi){
            data = tableApi.init().pfMeta;
        }
        return data;
    };

    /**
     * vormat roman numeric string to int
     * -> e.g. 'VII' => 7
     * @param str
     * @returns {number}
     */
    let romanToInt = str => {
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
    };

    /**
     * callback -> add table rows from grouped tableData
     * @param context
     * @param tableData
     * @param groupedDataKey
     */
    let callbackUpdateTableRows = (context, tableData, groupedDataKey = 'structures') => {
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
                        let rowId = getRowById(context.tableApi, rowData.id);

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
                            if(rowDataCurrent.updated.updated !== rowData.updated.updated){
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
                let rowId = getRowById(context.tableApi, structureId);
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

        // if current user is currently docked at a structure (not station)
        // -> add a modal button for pre-fill modal with it
        // -> systemId must match systemId from current character log
        let currentUserData = Util.getCurrentUserData();
        let isCurrentLocation = false;
        let characterStructureId = Util.getObjVal(currentUserData, 'character.log.structure.id') || 0;
        let characterStructureName = Util.getObjVal(currentUserData, 'character.log.structure.name') || '';
        let characterStructureTypeId = Util.getObjVal(currentUserData, 'character.log.structure.type.id') || 0;
        let characterStructureTypeName = Util.getObjVal(currentUserData, 'character.log.structure.type.name') || '';

        if(systemId === Util.getObjVal(currentUserData, 'character.log.system.id')){
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
            id: config.structureDialogId,
            structureData: structureData,
            structureStatus: statusData,
            nameInputId: config.nameInputId,
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
                        className: 'btn-default pull-left'
                    },
                    autoFill: {
                        label: buttonLabelAutoFill,
                        className: 'btn-primary' + (disableButtonAutoFill ? ' pf-font-italic disabled' : ''),
                        callback: function(){
                            let form = this.find('form');
                            form.find('#' + config.nameInputId).val(characterStructureName);
                            form.find('#' + config.statusSelectId).val(2).trigger('change');
                            form.find('#' + config.typeSelectId).val(characterStructureTypeId).trigger('change');
                            return false;
                        }
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
                                    payload => callbackUpdateTableRows(payload.context, payload.data),
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
     * init station services tooltips
     * @param element
     * @param tableApi
     */
    let initStationServiceTooltip = (element, tableApi) => {
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
            selector: 'td.' + config.tableCellServicesClass
        });
    };

    /**
     * get dataTables default options for intel tables
     * @returns {*}
     */
    let getDataTableDefaults = () => {
        return {
            paging: false,
            lengthChange: false,
            ordering: true,
            info: false,
            searching: false,
            hover: false,
            autoWidth: false,
            drawCallback: function (settings) {
                let tableApi = this.api();
                let columnCount = tableApi.columns(':visible').count();
                let rows = tableApi.rows({page: 'current'}).nodes();
                let last = null;

                tableApi.column('rowGroupData:name', {page: 'current'}).data().each(function (group, i) {
                    if (!last || last.id !== group.id) {
                        // "stations" are grouped by "raceId" with its "factionId"
                        // "structures" are grouped by "corporationId" that ADDED it (not the ingame "owner" of it)
                        let imgType = 'stations' === group.groupedDataKey ? 'alliance' : 'corporation';

                        $(rows).eq(i).before(
                            '<tr class="group">' +
                            '<td></td>' +
                            '<td class="text-right ' + config.tableCellImageClass + '">' +
                            '<img src="' + Util.eveImageUrl(imgType, group.id, 64) + '"/>' +
                            '</td>' +
                            '<td colspan="' + Math.max((columnCount - 2), 1) + '">' + group.name + '</td>' +
                            '</tr>'
                        );
                        last = group;
                    }
                });

                let animationRows = rows.to$().filter(function () {
                    return (
                        $(this).data('animationStatus') ||
                        $(this).data('animationTimer')
                    );
                });

                for (let i = 0; i < animationRows.length; i++) {
                    let animationRow = $(animationRows[i]);
                    animationRow.pulseBackgroundColor(animationRow.data('animationStatus'));
                    animationRow.removeData('animationStatus');
                }
            }
        };
    };

    /**
     * get module element
     * @param parentElement
     * @param mapId
     * @param systemData
     * @returns {jQuery}
     */
    let getModule = (parentElement, mapId, systemData) => {
        let showStationTable = ['H', 'L', '0.0', 'C12'].includes(Util.getObjVal(systemData, 'security'));
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
                    text: 'Structures'
                })
            )
        );

        // "Structures" table -----------------------------------------------------------------------------------------
        let structureTable = $('<table>', {
            id: getTableId('structure', mapId, systemData.id),
            class: ['compact', 'stripe', 'order-column', 'row-border', 'pf-table-fixed', config.systemStructuresTableClass].join(' ')
        });
        moduleElement.append(structureTable);

        let structureDataTableOptions = {
            pfMeta: {
                type: 'structures'
            },
            order: [[10, 'desc' ], [0, 'asc' ]],
            rowId: rowData => getRowId('structures', rowData.id),
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
                        display: data => getIconForStatusData(data),
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
                    className: [config.tableCellImageClass, 'text-center', 'all'].join(' '),
                    data: 'structure.id',
                    defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display' && value){
                                value = '<img src="' + Util.eveImageUrl('type', value, 64) +'"/>';
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
                    width: 24,
                    orderable: false,
                    className: [config.tableCellImageClass, 'text-center', 'all'].join(' '),
                    data: 'owner.id',
                    defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display' && value){
                                value = '<a href="https://zkillboard.com/corporation/' + data + '/" target="_blank" rel="noopener">';
                                value += '<img src="' + Util.eveImageUrl('corporation', data, 64) + '"/>';
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
                    className: ['text-center', config.tableCellActionClass, config.moduleHeadlineIconClass, 'all'].join(' '),
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
                            $(cell).removeClass(config.tableCellActionClass + ' ' + config.moduleHeadlineIconClass);
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
                    className: ['text-center', config.tableCellActionClass, 'all'].join(' '),
                    data: null,
                    render: {
                        display: data => {
                            let icon = '<i class="fas fa-times txt-color txt-color-redDarker"></i>';
                            if(data.rowGroupData.id !== corporationId){
                                icon = '<i class="fas fa-ban txt-color txt-color-grayLight" title="restricted" data-placement="left"></i>';
                            }
                            return icon;
                        }
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tableApi = this.api();

                        if($(cell).find('.fa-ban').length){
                            $(cell).removeClass(config.tableCellActionClass + ' ' + config.moduleHeadlineIconClass);
                            $(cell).find('i').tooltip();
                        }else{
                            let confirmationSettings = {
                                title: 'delete structure',
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

        $.extend(true, structureDataTableOptions, getDataTableDefaults());
        let tableApiStructure = structureTable.DataTable(structureDataTableOptions);

        new $.fn.dataTable.Responsive(tableApiStructure);

        tableApiStructure.on('responsive-resize', function(e, tableApi, columns){
            // rowGroup length changes as well -> trigger draw() updates rowGroup length (see drawCallback())
            tableApi.draw();
        });

        if(showStationTable){
            // "Stations" table ---------------------------------------------------------------------------------------

            moduleElement.append(
                $('<div>', {
                    class: config.moduleHeadClass
                }).append(
                    $('<h5>', {
                        class: config.moduleHandlerClass
                    }),
                    $('<h5>', {
                        text: 'Stations'
                    })
                )
            );

            let stationTable = $('<table>', {
                id: getTableId('station', mapId, systemData.id),
                class: ['compact', 'stripe', 'order-column', 'row-border', 'pf-table-fixed', config.systemStationsTableClass].join(' ')
            });
            moduleElement.append(stationTable);

            let stationDataTableOptions = {
                pfMeta: {
                    type: 'stations'
                },
                order: [[1, 'asc' ], [8, 'asc' ]],
                rowId: rowData => getRowId('stations', rowData.id),
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
                        className: [config.tableCellImageClass, 'text-center', 'all'].join(' '),
                        data: 'type.id',
                        defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                        render: {
                            _: function(data, type, row, meta){
                                let value = data;
                                if(type === 'display' && value){
                                    value = '<img src="' + Util.eveImageUrl('type', value, 64) +'"/>';
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
                                        value = romanToInt(count) || '';
                                    }
                                }

                                return value;
                            }
                        }
                    },{
                        targets: 2,
                        name: 'name',
                        title: 'station',
                        className: [config.tableCellEllipsisClass, 'all'].join(' '),
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
                                    if(systemName === (Util.getObjVal(systemData, 'name') || '')){
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
                        className: [config.tableCellEllipsisClass, 'not-screen-l'].join(' '),
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
                        className: [config.tableCellImageClass, 'text-center', 'all'].join(' '),
                        data: 'corporation.id',
                        defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                        render: {
                            _: function(data, type, row, meta){
                                let value = data;
                                if(type === 'display' && value){
                                    value = '<a href="https://zkillboard.com/corporation/' + data + '/" target="_blank" rel="noopener">';
                                    value += '<img src="' + Util.eveImageUrl('corporation', data, 64) + '"/>';
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
                        className: [config.tableCellActionClass, config.tableCellEllipsisClass, 'all'].join(' '),
                        data: 'corporation',
                        defaultContent: '<i class="fas fa-question txt-color txt-color-orangeDark"></i>',
                        render: {
                            _: function(data, type, row, meta){
                                let value = data.name;
                                if(type === 'display'){
                                    value += '&nbsp;' + getIconForInformationWindow();
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
                        class: [config.tableCellActionClass, config.moduleHeadlineIconClass, 'text-center', 'all'].join(' '),
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
                                Util.setDestination('set_destination', 'station', {systemId: cellData, name: rowData.name});
                            });
                        }
                    },{
                        targets: 7,
                        title: '<i title="services" data-toggle="tooltip" class="fas fa-tools text-right"></i>',
                        orderable: false,
                        searchable: false,
                        width: 10,
                        class: [config.tableCellActionClass, config.moduleHeadlineIconClass, config.tableCellServicesClass, Util.config.popoverTriggerClass, 'text-center', 'all'].join(' '),
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
                                cellElement.removeClass(config.tableCellActionClass + ' ' + config.moduleHeadlineIconClass);
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

                    initStationServiceTooltip(this, tableApi);
                }
            };

            $.extend(true, stationDataTableOptions, getDataTableDefaults());
            let tableApiStation = stationTable.DataTable(stationDataTableOptions);

            new $.fn.dataTable.Responsive(tableApiStation);

            tableApiStation.on('responsive-resize', function(e, tableApi, columns){
                // rowGroup length changes as well -> trigger draw() updates rowGroup length (see drawCallback())
                tableApi.draw();
            });
        }

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
                    payload => callbackUpdateTableRows(payload.context, payload.data),
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

        // update structure table data --------------------------------------------------------------------------------
        let structureTable = moduleElement.find('.' + config.systemStructuresTableClass);
        let tableApiStructure = structureTable.DataTable();

        let structureContext = {
            tableApi: tableApiStructure,
            removeMissing: true
        };

        callbackUpdateTableRows(structureContext, Util.getObjVal(systemData, 'structures'));

        // update station table data ----------------------------------------------------------------------------------
        let stationTable = moduleElement.find('.' + config.systemStationsTableClass);
        let tableApiStation = stationTable.DataTable();

        let stationContext = {
            tableApi: tableApiStation,
            removeMissing: false
        };

        callbackUpdateTableRows(stationContext, Util.getObjVal(systemData, 'stations'), 'stations');

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
                ).then(payload => callbackUpdateTableRows(payload.context, Util.getObjVal(payload.data, 'structures')));
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
        let structureTable = moduleElement.find('.' + config.systemStructuresTableClass);
        let stationTable = moduleElement.find('.' + config.systemStationsTableClass);
        let tableApiStructure = structureTable.DataTable();
        let tableApiStation = stationTable.DataTable();
        tableApiStructure.destroy();
        tableApiStation.destroy();
    };

    return {
        config: config,
        getModule: getModule,
        initModule: initModule,
        updateModule: updateModule,
        beforeDestroy: beforeDestroy
    };

});
