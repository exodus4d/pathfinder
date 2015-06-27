/**
 *  System signature module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'app/counter',
    'datatablesResponsive'
], function($, Init, Util, Render, bootbox) {
    'use strict';

    var config = {
        // module info
        moduleClass: 'pf-module',                                               // class for each module

        // system signature module
        systemSigModuleClass: 'pf-sig-table-module',                            // module wrapper

        // tables
        tableToolsClass: 'pf-table-tools',                                      // class for table toolbar
        tableToolsActionClass: 'pf-table-tools-action',                         // class for table toolbar action

        // dialogs
        signatureReaderDialogId: 'pf-signature-reader-dialog',                  // id for signature reader dialog

        // signature progress bar
        signatureScannedProgressBarClass: 'pf-system-progress-scanned',         // class for signature progress bar

        // toolbar
        sigTableClearButtonClass: 'pf-sig-table-clear-button',                  // class for "clear" signatures button

        // signature table
        sigTableClass: 'pf-sig-table',                                          // Table class for all Signature Tables
        sigTablePrimaryClass: 'pf-sig-table-primary',                           // class for primary sig table
        sigTableSecondaryClass: 'pf-sig-table-secondary',                       // class for secondary sig table
        sigTableRowIdPrefix: 'pf-sig-table-row-',                               // id prefix for a table row <tr>
        sigTableEditText: 'pf-sig-table-edit-text',                             // class for editable fields (text)
        sigTableEditSigNameInput: 'pf-sig-table-edit-name-input',               // class for editable fields (input)
        sigTableEditSigGroupSelect: 'pf-sig-table-edit-group-select',           // class for editable fields (sig group)
        sigTableEditSigTypeSelect: 'pf-sig-table-edit-type-select',             // class for editable fields (sig type)
        sigTableEditSigDescriptionTextarea: 'pf-sig-table-edit-desc-text',      // class for editable fields (sig description)
        sigTableCounterClass: 'pf-sig-table-counter',                           // class for signature table counter
        sigTableCreatedCellClass: 'pf-sig-table-created',                       // class for "created" cells
        sigTableUpdatedCellClass: 'pf-sig-table-updated',                       // class for "updated" cells
        sigTableActionCellClass: 'pf-sig-table-action-cell',                    // class for "action" cells
        sigTableActionButtonClass: 'pf-sig-table-action-button',                // class for row action button

        // xEditable
        editableDiscriptionInputClass: 'pf-editable-description'                // class for "description" textarea
    };

    // disable Signature Table update temporary (until. some requests/animations) are finished
    var disableTableUpdate = true;

    // cache for dataTable object
    var signatureTable = null;

    // empty signatureData object -> for "add row" table
    var emptySignatureData = {
        id: 0,
        name: '',
        groupId: 0,
        typeId: 0,
        description: '',
        created: {
            created: null
        },
        updated: {
            updated: null
        }
    };

    var fullSignatureOptions = {
        action: 'delete',
        actionClass: ['fa-close', 'txt-color', 'txt-color-redDarker'].join(' ')
    };

    // empty signatureData row Options
    var emptySignatureOptions = {
        action: 'add',
        actionClass: ['fa-plus'].join(' ')
    };

    var sigTypeCache = {};                                                      // cache signature groups
    var sigNameCache = {};                                                      // cache signature names

    /**
     * collect all data of all editable fields in a signature table
     * @returns {Array}
     */
    var getSignatureTableData = function(){

        var signatureTableApi = signatureTable.api();

        var tableData = [];

        signatureTableApi.rows().eq(0).each(function(idx){

            var row = signatureTableApi.row(idx);
            // default row data
            var defaultRowData = row.data();
            var rowElement = row.nodes().to$();

            if(defaultRowData.id > 0){
                // get all editable fields per row
                var editableFields = rowElement.find('.editable');

                if(editableFields.length > 0){
                    var values = $(editableFields).editable('getValue');

                    // convert to lower for better compare options
                    values.name = values.name.toLowerCase();

                    // add pk for this row
                    values.id = defaultRowData.id;

                    // add updated for this row
                    values.updated = defaultRowData.updated;

                    // add row index
                    values.index = idx;

                    tableData.push( values );
                }
            }

        });

        return tableData;
    };

    /**
     * Updates a signature table, changes all signatures where name matches
     * add all new signatures as a row
     * @param signatureData
     */
    $.fn.updateSignatureTable = function(signatureData){

        // check if table update is allowed
        if(disableTableUpdate === true){
            return;
        }

        // disable update until function is ready;
        disableTableUpdate = true;


        var moduleElement = $(this);

        // get signature table API
        var signatureTableApi = signatureTable.api();

        // get current system data
        var currentSystemData = Util.getCurrentSystemData();


        var tableData = getSignatureTableData();

        var notificationCounter = {
            added: 0,
            changed: 0,
            deleted: 0
        };

        for(var i = 0; i < signatureData.length; i++){
            for(var j = 0; j < tableData.length; j++){
                if(signatureData[i].id === tableData[j].id){

                    // check if row has updated
                    if(signatureData[i].updated.updated > tableData[j].updated.updated){

                        // remove "old" row
                        signatureTableApi.row(tableData[j].index).remove().draw();

                        // and add "new" row
                        addSignatureRow(currentSystemData.systemData, signatureData[i], false);

                        notificationCounter.changed++;
                    }

                    // remove signature data -> all left signatures will be added
                    signatureData.splice(i, 1);
                    i--;

                    // remove signature data -> all left signatures will be deleted
                    tableData.splice(j, 1);
                    j--;

                    break;
                }
            }
        }

        // delete signatures ====================================================
        for(var l = 0; l < tableData.length; l++){

            var rowElement = signatureTableApi.row(tableData[l].index).nodes().to$();

            rowElement.toggleTableRow(function(){
                // delete signature row
                signatureTableApi.row(rowElement).remove().draw();
            });

            notificationCounter.deleted++;

        }

        // add new signatures ===================================================
        for(var k = 0; k < signatureData.length; k++){
            // and add "new" row
            addSignatureRow(currentSystemData.systemData, signatureData[k], true);

            notificationCounter.added++;
        }


        if(
            notificationCounter.added > 0 ||
            notificationCounter.changed > 0 ||
            notificationCounter.deleted
        ){
            // update signature bar
            moduleElement.updateScannedSignaturesBar({showNotice: true});

            // show Notification
            var notification = notificationCounter.added + ' added<br>';
            notification += notificationCounter.changed + ' changed<br>';
            notification += notificationCounter.deleted + ' deleted<br>';
            Util.showNotify({title: 'Signatures updated', text: notification, type: 'success'});
        }

        // enable table update
        disableTableUpdate = false;
    };

    /**
     * update Progressbar for all scanned signatures in a system
     * @param options
     */
    $.fn.updateScannedSignaturesBar = function(options){

        var moduleElement = $(this);

        // get progress bar
        var progressBarWrapper = moduleElement.find('.' + config.signatureScannedProgressBarClass);
        var progressBar = $(progressBarWrapper).find('.progress-bar');
        var progressBarLabel = $(progressBarWrapper).find('.progress-label-right');

        var tableData = getSignatureTableData();

        var percent = 0;
        var progressBarType = 'progress-bar-danger';

        if(tableData){
            var sigCount = tableData.length;
            var sigIncompleteCount = 0;
            // check for  signatures without "groupId" -> these are un scanned signatures

            for(var i = 0; i < tableData.length; i++){
                var groupId = parseInt(tableData[i].groupId);
                if(groupId === 0){
                    sigIncompleteCount++;
                }
            }

            if(sigCount > 0){
                percent = 100 - Math.round( 100 / sigCount * sigIncompleteCount );
            }

            if(percent < 30){
                progressBarType = 'progress-bar-danger' ;
            }else if(percent < 100){
                progressBarType = 'progress-bar-warning';
            }else{
                progressBarType = 'progress-bar-success';
            }
        }

        setTimeout(
            function() {
                progressBarLabel.text(percent + '%');
                progressBar.removeClass().addClass('progress-bar').addClass(progressBarType);
                progressBar.attr('aria-valuenow', percent);
                progressBar.css({width: percent + '%'});

                var notification = (sigCount - sigIncompleteCount) + ' / ' + sigCount + ' (' + percent + '%) signatures scanned';

                // show notifications
                if(options.showNotice !== false){
                    if(percent < 100){
                        Util.showNotify({title: 'Unknown signatures', text: notification, type: 'info'});
                    }else{
                        Util.showNotify({title: 'System is scanned', text: notification, type: 'success'});
                    }
                }

            }, 100);

    };

    /**
     * open "signature reader" dialog for signature table
     * @param systemData
     */
    $.fn.showSignatureReaderDialog = function(systemData){

        var moduleElement = $(this);

        var data = {
            id: config.signatureReaderDialogId
        };

        requirejs(['text!templates/modules/signature_reader_dialog.html', 'mustache'], function(template, Mustache) {

            var content = Mustache.render(template, data);

            var signatureReaderDialog = bootbox.dialog({
                title: 'Signature reader',
                message: content,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default',
                        callback: function(){
                            $(signatureReaderDialog).modal('hide');
                        }
                    },
                    success: {
                        label: '<i class="fa fa-clipboard fa-fw"></i>&nbsp;update signatures',
                        className: 'btn-success',
                        callback: function () {
                            // get form Values
                            var form = $('#' + config.signatureReaderDialogId).find('form');

                            var formData = $(form).getFormValues();

                            moduleElement.updateSignatureTableByClipboard(systemData, formData.clipboard);
                        }
                    }
                }
            });
        });
    };

    /**
     * updates
     * @param systemData
     * @param clipboard data stream
     */
    $.fn.updateSignatureTableByClipboard = function(systemData, clipboard){

        var moduleElement = $(this);

        // parse input stream
        var signatureData = parseSignatureString(systemData, clipboard);

        // TODO save data and get date with ID updatedBy names etc.

        // updates table with new signature information
        moduleElement.updateSignatureTable(signatureData);

    };

    /**
     * parses a copy&paste string from ingame scanning window and parses it
     * @param systemData
     * @param clipbaord
     * @returns {Array}
     */
    var parseSignatureString = function(systemData, clipbaord){

        var signatureData = [];
        var signatureRows = clipbaord.split('\r\n');

        var signatureGroupOptions = Util.getSignatureGroupInfo('name');

        for(var i = 0; i < signatureRows.length; i++){
            var rowData = signatureRows[i].split('\t');

            if(rowData.length === 6){

                // check if sig Type = anomaly or combat site
                if(
                    rowData[1] === 'Cosmic Anomaly' ||
                        rowData[1] === 'Cosmic Signature'
                    ){
                    var sigGroup = rowData[2].trim().toLowerCase();

                    var sigGroupId = 0;
                    // get groupId by groupName
                    for (var prop in signatureGroupOptions) {
                        if(signatureGroupOptions.hasOwnProperty(prop)){
                            if(signatureGroupOptions[prop] === sigGroup){
                                sigGroupId = parseInt( prop );
                                break;
                            }
                        }
                    }

                    var typeId = Util.getSignatureTypeIdByName( systemData, sigGroupId, rowData[3].trim() );

                    // map array values to signature Object
                    var signatureObj = {
                        name: rowData[0].substr(0, 3).trim().toLowerCase(),
                        groupId: sigGroupId,
                        typeId: typeId
                    };

                    signatureData.push(signatureObj);
                }
            }
        }

        return signatureData;
    };

    /**
     * get a labeled button
     * @param options
     * @returns {*|jQuery}
     */
    var getLabledButton = function(options){

        var buttonClasses = ['btn', 'btn-sm', 'btn-labeled'];

        switch(options.type){
            case 'default':
                buttonClasses.push('btn-default');
                break;
            case 'primary':
                buttonClasses.push('btn-primary');
                break;
            case 'danger':
                buttonClasses.push('btn-danger');
                break;
        }

        // add optional classes
        if(options.classes){
            buttonClasses = buttonClasses.concat(options.classes);
        }


        var buttonElement = $('<button>', {
            class: buttonClasses.join(' '),
            type: 'button',
            html: '&nbsp;' + options.label + '&nbsp;&nbsp;'
        }).on('click', function(e){
            options.onClick(e);
        }).prepend(
            $('<span>', {
                class: 'btn-label'
            }).prepend(
                $('<i>', {
                    class: ['fa', options.icon, 'fa-fw'].join(' ')
                })
            )
        );

        // add optional badge
        if(options.badge){
            buttonElement.append(
                $('<span>', {
                    class: ['badge'].join(' '),
                    text: options.badge.label
                })
            );
        }

        return buttonElement;
    };

    /**
     * draw signature table toolbar (add signature button, scan progress bar
     * @param systemData
     */
    $.fn.drawSignatureTableToolbar = function(systemData){

        var moduleElement = $(this);

        // add toolbar buttons for table -------------------------------------
        var tableToolbar = $('<div>', {
            class: config.tableToolsClass
        }).append(
            getLabledButton({
                type: 'primary',
                label: 'add',
                icon: 'fa-plus',
                onClick: function(e){
                    // show "add sig" div
                    var toolsElement = $(e.target).parents('.' + config.moduleClass).find('.' + config.tableToolsActionClass);

                    // set toggle animation
                    if(toolsElement.is(':visible')){
                        toolsElement.velocity('stop').velocity('reverse');
                    }else{
                        toolsElement.velocity('stop').velocity({
                            opacity: 1,
                            height: '75px'
                        },{
                            duration: 150,
                            display: 'block',
                            visibility: 'visible'
                        });
                    }
                }
            })
        ).append(
            getLabledButton({
                type: 'primary',
                label: 'signature reader',
                icon: 'fa-clipboard',
                onClick: function(){
                    moduleElement.showSignatureReaderDialog(systemData);
                }
            })
        ).append(
            getLabledButton({
                type: 'default',
                label: 'select all',
                icon: 'fa-check-square',
                onClick: function(){
                    var allRows = getRows(signatureTable);
                    var selectedRows = getSelectedRows(signatureTable);
                    var allRowElements = allRows.nodes().to$();

                    if(allRows.data().length === selectedRows.data().length){
                        allRowElements.removeClass('selected');
                    }else{
                        allRowElements.addClass('selected');
                    }

                    // check delete button
                    checkDeleteSignaturesButton();
                }
            })
        ).append(
            getLabledButton({
                type: 'danger',
                classes: [config.sigTableClearButtonClass, 'pull-right'],
                label: 'delete',
                icon: 'fa-close',
                badge: {
                    label: '0'
                },
                onClick: function(){
                    // delete all rows

                    var selectedRows = getSelectedRows(signatureTable);

                    bootbox.confirm('Delete ' + selectedRows.length + ' signature?', function(result) {
                        if(result){
                            deleteSignatures(selectedRows);
                        }
                    });
                }
            })
        );

        moduleElement.append(tableToolbar);

        // add toolbar action for table ================================================================================
        var tableToolbarAction = $('<div>', {
            class: config.tableToolsActionClass
        });

        // create "empty table for new signature
        var table = $('<table>', {
            class: ['display', 'compact', 'nowrap', config.sigTableClass, config.sigTableSecondaryClass].join(' ')
        });

        tableToolbarAction.append(table);

        tableToolbar.after(tableToolbarAction);

        var signatureData = formatSignatureData(systemData, [emptySignatureData], emptySignatureOptions);
        table.dataTable( {
            data: signatureData,
            paging: false,
            ordering: false,
            info: false,
            searching: false
        } );
        table.makeEditable(systemData);

        // scanned signatures progress bar =============================================================================
        var moduleConfig = {
            name: 'form/progress',
            position: tableToolbar,
            link: 'before'
        };

        var moduleData = {
            label: true,
            wrapperClass: config.signatureScannedProgressBarClass,
            class: ['progress-bar-success'].join(' '),
            percent: 0,
            headline: 'System scanned',
            headlineRight: ' ' // will be updated by js
        };

        Render.showModule(moduleConfig, moduleData);

        // event listener for global "paste" signatures into the page ==================================================
        $(document).on('paste', function(e){

            // do not read clipboard if pasting into form elements
            if(
                $(e.target).prop('tagName').toLowerCase() !== 'input' &&
                    $(e.target).prop('tagName').toLowerCase() !== 'textarea'
                ){
                var clipboard = (e.originalEvent || e).clipboardData.getData('text/plain');
                moduleElement.updateSignatureTableByClipboard(systemData, clipboard);
            }
        });
    };

    /**
     * make a table or row editable
     * @param systemInfoData
     */
    $.fn.makeEditable = function(systemData){

        // table element OR row element
        var tableElement = $(this);

        // find editable fields
        var sigNameFields = tableElement.find('.' + config.sigTableEditSigNameInput);
        var sigGroupFields = tableElement.find('.' + config.sigTableEditSigGroupSelect);
        var sigTypeFields = tableElement.find('.' + config.sigTableEditSigTypeSelect);
        var sigDescriptionFields = tableElement.find('.' + config.sigTableEditSigDescriptionTextarea);

        // jump to "next" editable field on save
        var openNextEditDialogOnSave = function(fields){
            fields.on('save', function(e){
                var currentField = $(this);

                setTimeout(function() {
                    var nextField = getNextEditableField(currentField);
                    nextField.editable('show');

                    // update scanning progressbar if sig "type" has changed
                    if($(e.target).hasClass(config.sigTableEditSigGroupSelect)){
                        currentField.parents('.' + config.moduleClass).updateScannedSignaturesBar({showNotice: true});
                    }
                }, 200);
            });
        };

        // helper function - get the next editable field in next table column
        var getNextEditableField = function(field){
            var nextEditableField = $(field).closest('td').next().find('.editable');
            return $(nextEditableField);
        };

        /**
         * add map/system specific data for each editable field in the sig-table
         * @param params
         * @returns {*}
         */
        var modifyFieldParamsOnSend = function(params){
            params.systemId = systemData.id;

            return params;
        };

        // set global xEditable options for all table fields
        $.extend($.fn.editable.defaults, {
            url: Init.path.saveSignatureData,
            dataType: 'json',
            mode: 'popup',
            container: 'body',
            error: function(jqXHR, newValue){
                var reason = '';
                var status = '';
                if(jqXHR.name){
                    // save error new sig (mass save)
                    reason = jqXHR.name;
                    status = 'Error';
                }else{
                    reason = jqXHR.responseJSON.text;
                    status = jqXHR.status;
                }

                Util.showNotify({title: status + ': save signature', text: reason, type: 'warning'});
                $(document).setProgramStatus('problem');
                return reason;
            }
        });


        // Input sig name ------------------------------------------------------------------------
        sigNameFields.editable({
            type: 'text',
            title: 'signature id',
            name: 'name',
            emptytext: '? ? ?',
            validate: function(value) {
                if($.trim(value).length < 3) {
                    return 'Id is less than min of "3"';
                }else if($.trim(value).length > 10){
                    return 'Id is more than max of "10"';
                }
            },
            success: function(response, newValue){
            },
            params: modifyFieldParamsOnSend
        });


        // Select sig group (master) -------------------------------------------------------------
        sigGroupFields.editable({
            type: 'select',
            title: 'group',
            name: 'groupId',
            emptytext: 'unknown',
            onblur: 'submit',
            showbuttons: false,
            params: modifyFieldParamsOnSend,
            source: function(){

                var signatureGroupField = $(this);
                var systemTypeId = signatureGroupField.attr('data-systemTypeId');
                var areaId = signatureGroupField.attr('data-areaid');

                var cacheKey = [systemTypeId, areaId].join('_');

                // check for cached signature names
                if(sigTypeCache.hasOwnProperty( cacheKey )){
                    return sigTypeCache[cacheKey];
                }

                var availableTypes = {};

                // get all available Signature Types
                if(
                    Init.signatureTypes[systemTypeId] &&
                        Init.signatureTypes[systemTypeId][areaId]
                    ){
                    // json object -> "translate" keys to names
                    availableTypes = Util.getSignatureGroupInfo('label');

                    // add empty option
                    availableTypes[0] = '';

                    availableTypes = sigTypeCache[cacheKey] = availableTypes;
                }

                return availableTypes;
            },
            success: function(response, newValue){
                var signatureTypeField = $(this);

                // find related "name" select (same row) and change options
                var nameSelect = getNextEditableField(signatureTypeField);

                var systemTypeId = signatureTypeField.attr('data-systemTypeId');
                var areaId = signatureTypeField.attr('data-areaid');

                // set new Options
                var newSelectOptions = Util.getAllSignatureNames(systemTypeId, areaId, newValue);

                nameSelect.editable('option', 'source', newSelectOptions);

                nameSelect.editable('setValue', null);

                if(newValue > 0){
                    nameSelect.editable('enable');
                }else{
                    nameSelect.editable('disable');
                }
            }
        });


        // Select sig type (slave: depends on sig type) -----------------------------------------
        sigTypeFields.editable({ mode: 'popup',
            type: 'select',
            title: 'type',
            name: 'typeId',
            emptytext: 'unknown',
            onblur: 'submit',
            showbuttons: false,
            params: modifyFieldParamsOnSend,
            source: function(){
                var signatureNameField = $(this);

                var systemTypeId = signatureNameField.attr('data-systemTypeId');
                var areaId = signatureNameField.attr('data-areaid');
                var groupId = signatureNameField.attr('data-groupId');

                var cacheKey = [systemTypeId, areaId, groupId].join('_');

                // check for cached signature names
                if(sigNameCache.hasOwnProperty( cacheKey )){
                    return sigNameCache[cacheKey];
                }

                var signatureNames = Util.getAllSignatureNames(systemTypeId, areaId, groupId);

                // add empty option
                signatureNames[0] = '';

                // get all available Signature Names
                var availableSigs = sigNameCache[cacheKey] = signatureNames;

                return availableSigs;
            }
        });

        // Textarea sig description -------------------------------------------------------------
        sigDescriptionFields.editable({
            type: 'textarea',
            title: 'description',
            name: 'description',
            emptytext: '<i class="fa fa-fw fa-lg fa-pencil"></i>',
            onblur: 'submit',
            mode: 'inline',
            showbuttons: false,
            inputclass: config.editableDiscriptionInputClass,
            params: modifyFieldParamsOnSend
        });

        // open even
        sigDescriptionFields.on('shown', function(e, editable) {
            // enlarge the tools-action container because the tables gets bigger
            tableElement.parents('.' + config.tableToolsActionClass).css( 'height', '+=35px' );
        });

        // close event
        sigDescriptionFields.on('hidden', function(e, editable) {
            // enlarge the tools-action container because the tables gets bigger
            tableElement.parents('.' + config.tableToolsActionClass).css( 'height', '-=35px' );
        });

        // open next field dialog ---------------------------------------------------------------
        openNextEditDialogOnSave(sigNameFields);
        openNextEditDialogOnSave(sigGroupFields);

        // init signature counter ---------------------------------------------------------------
        tableElement.find('.' + config.sigTableCounterClass + '[data-counter!="init"]').initSignatureCounter();
    };

    /**
     * deletes signature rows from signature table
     * @param rows
     */
    var deleteSignatures = function(rows){
        // disable Table update during delete process
        disableTableUpdate = true;
        var deletedSignatures = 0;

        var moduleElement = $('.' + config.systemSigModuleClass);
        var data = rows.data();
        var signatureTableApi = signatureTable.api();
        var rowElements = rows.nodes().to$();
        var signatureCount = data.length;

        var signatureIds = [];
        for(var i = 0; i < data.length; i++){
            signatureIds.push(data[i].id);
        }

        var requestData = {
            signatureIds: signatureIds
        };

        // animation callback function
        var removeCallback = function(rowElement){
            // delete signature row
            signatureTableApi.row(rowElement).remove().draw();

            deletedSignatures++;

            if(deletedSignatures === signatureCount){
                // all animations finished

                // update signature bar
                moduleElement.updateScannedSignaturesBar({showNotice: false});

                Util.showNotify({title: 'Signature deleted', text: signatureCount + ' signatures deleted', type: 'success'});

                // enable signature Table update
                disableTableUpdate = false;
            }
        };

        $.ajax({
            type: 'POST',
            url: Init.path.deleteSignatureData,
            data: requestData,
            dataType: 'json'
        }).done(function(data){

            for(var j = 0; j < rowElements.length; j++){
                // removeRow
                $(rowElements[j]).toggleTableRow(removeCallback);
            }

        }).fail(function( jqXHR, status, error) {
            var reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': Delete signature', text: reason, type: 'warning'});
            $(document).setProgramStatus('problem');
        });

    };


    /**
     * adds a new row to signature Table
     * @param systemData
     * @param signatureData
     */
    var addSignatureRow = function(systemData, signatureData, animate){

        var newSignatureData = formatSignatureData(systemData, [signatureData], fullSignatureOptions);

        // insert new row in main signature table
        var tablePrimaryElement = $('.' + config.sigTablePrimaryClass);
        var dataTablePrimary = tablePrimaryElement.DataTable();
        var newRowNode = dataTablePrimary.row.add(newSignatureData.shift()).draw().nodes();
        var newRowElement = newRowNode.to$();

        if(animate === true){
            newRowElement.hide();

            newRowElement.toggleTableRow(function(){
                // make new row editable
                newRowElement.makeEditable(systemData);
            });
        }else{
            newRowElement.makeEditable(systemData);
        }


    };

    /**
     * show/hides a table <tr> tag
     * @param callback
     */
    $.fn.toggleTableRow = function(callback){
        var rowElement = $(this);
        var cellElements = rowElement.children('td');

        var duration = 100;
        var tdCounter = 0;


        // wrap each <td> into a container (for better animation performance)
        // slideUp new wrapper divs
        if(rowElement.is(':visible')){
            // hide row

            // stop sig counter by adding a stopClass to each <td>, remove padding
            cellElements.addClass('stopCounter')
                .velocity({
                    paddingTop: 0,
                    paddingBottom: 0
                },{
                    duration: duration
                }).wrapInner('<div>')
                .children()
                .css({
                    'willChange': 'height'
                }).velocity('slideUp', {
                    duration: duration,
                    complete: function(animationElements){
                        tdCounter++;
                        // execute callback when last <td> animation finished
                        if(tdCounter === animationElements.length){
                            // remove wrapper
                            $(animationElements).children().unwrap();

                            if(callback !== undefined){
                                callback(rowElement);
                            }
                        }
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
                paddingTop: '4px',
                paddingBottom: '4px'
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
                                tdCounter++;
                                // execute callback when last <td> animation finished
                                if(tdCounter === animationElements.length){

                                    // remove wrapper
                                    var wrapperElements = cellElements.children();
                                    for(var i = 0; i < wrapperElements.length; i++){
                                        var currentWrapper = $(wrapperElements[i]);
                                        if(currentWrapper.children().length > 0){
                                            currentWrapper.children().unwrap();
                                        }else{
                                            currentWrapper.parent().html( currentWrapper.html() );
                                        }
                                    }

                                    if(callback !== undefined){
                                        callback();
                                    }

                                }
                            }
                        });
                }
            });
        }
    };

    /**
     * draw a signature table with data
     * @param signatureData
     * @param systemData
     * @returns {*}
     */
    $.fn.drawSignatureTable = function(signatureData, systemData){

        var moduleElement = $(this);

        // create new signature table -------------------------------------------
        var table = $('<table>', {
            class: ['display', 'compact', 'nowrap', config.sigTableClass, config.sigTablePrimaryClass].join(' ')
        });

        moduleElement.append(table);

        // create signature table and store the jquery object global for this module
        signatureTable = table.dataTable( {
            data: signatureData
        } );

        // make Table editable
        signatureTable.makeEditable(systemData);

        moduleElement.updateScannedSignaturesBar({showNotice: true});

        return signatureTable;
    };

    /**
     * format signature data array into dataTable structure
     * @param systemData
     * @param signatureData
     * @param options
     * @returns {Array}
     */
    var formatSignatureData = function(systemData, signatureData, options){

        var formattedData = [];

        // security check
        if(
            systemData &&
            systemData.id &&
            systemData.id > 0 &&
            systemData.type.id === 1 // wormholes
        ){
            var systemTypeId = systemData.type.id;
            var areaId = Util.getAreaIdBySecurity(systemData.security);
            // areaId is required as a key for signature names
            if(areaId){

                for(var i = 0; i < signatureData.length; i++){
                    var data = signatureData[i];

                    var tempData = {};

                    // set id ------------------------------------------------------------------------------------------
                    var sigId = 0;
                    if(data.id > 0){
                        sigId = data.id;
                    }
                    tempData.id = sigId;

                    // set status --------------------------------------------------------------------------------------
                    var status = '';
                    var statusClass = '';
                    if(data.updated.character !== undefined){
                        statusClass = Util.getStatusInfoForCharacter(data.updated.character, 'class');
                        status =  '<i class="fa fa-fw fa-circle pf-user-status ' + statusClass + '"></i>';
                    }

                    tempData.status = {
                        status: status,
                        status_sort: statusClass
                    };

                    // set name ----------------------------------------------------------------------------------------
                    var sigName = '<a href="#" class="' + config.sigTableEditSigNameInput + '" ';
                    if(data.id > 0){
                        sigName += 'data-pk="' + data.id + '" ';
                    }
                    sigName += '>' + data.name + '</a>';

                    tempData.name = sigName;

                    // set group id ------------------------------------------------------------------------------------
                    var sigGroup = '<a href="#" class="' + config.sigTableEditSigGroupSelect + '" ';
                    if(data.id > 0){
                        sigGroup += 'data-pk="' + data.id + '" ';
                    }
                    sigGroup += 'data-systemTypeId="' + systemTypeId + '" ';
                    sigGroup += 'data-areaId="' + areaId + '" ';
                    sigGroup += 'data-value="' + data.groupId + '" ';
                    sigGroup += '></a>';

                    tempData.group = sigGroup;

                    // set type id -------------------------------------------------------------------------------------
                    var sigType = '<a href="#" class="' + config.sigTableEditSigTypeSelect + '" ';
                    if(data.id > 0){
                        sigType += 'data-pk="' + data.id + '" ';
                    }

                    // set disabled if sig type is not selected
                    if(data.groupId < 1){
                        sigType += 'data-disabled="1" ';
                    }

                    sigType += 'data-systemTypeId="' + systemTypeId + '" ';
                    sigType += 'data-areaId="' + areaId + '" ';
                    sigType += 'data-groupId="' + data.groupId + '" ';
                    sigType += 'data-value="' + data.typeId + '" ';
                    sigType += '></a>';

                    tempData.type = sigType;

                    // set description ---------------------------------------------------------------------------------
                    var sigDescription = '<a href="#" class="' + config.sigTableEditSigDescriptionTextarea + '" ';
                    if(data.id > 0){
                        sigDescription += 'data-pk="' + data.id + '" ';
                    }
                    sigDescription += '>' + data.description + '</a>';

                    tempData.description = sigDescription;

                    // set created -------------------------------------------------------------------------------------
                    tempData.created = data.created;

                    // set updated -------------------------------------------------------------------------------------
                    tempData.updated = data.updated;

                    // info icon ---------------------------------------------------------------------------------------
                    var infoButton = '';
                    if(data.id > 0){
                        infoButton = '<i class="fa fa-fw fa-question-circle"></i>';
                    }
                    tempData.info = infoButton;

                    // action icon -------------------------------------------------------------------------------------

                    var actionButton = '<i class="fa ' + options.actionClass + ' ' + config.sigTableActionButtonClass + '"></i>';
                    tempData.action = {
                        action: options.action,
                        button: actionButton
                    };

                    formattedData.push(tempData);

                }
            }
        }

        return formattedData;
    };

    /**
     * setup dataTable options for all signatureTables
     * @param systemData
     */
    var initSignatureDataTable = function(systemData){

        $.extend( $.fn.dataTable.defaults, {
            pageLength: -1,
            lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, 'All']],
            order: [1, 'asc'],
            autoWidth: false,
            responsive: {
                details: false
            },
            language: {
                emptyTable:  'No signatures added',
                zeroRecords: 'No signatures found',
                lengthMenu:  'Show _MENU_ signatures',
                info:        'Showing _START_ to _END_ of _TOTAL_ signatures'
            },
            columnDefs: [
                {
                    targets: 0,
                    orderable: true,
                    searchable: false,
                    title: '',
                    width: '10px',
                    class: ['text-center', 'min-tablet-l'].join(' '),
                    data: 'status',
                    type: 'html',
                    render: {
                        _: 'status',
                        sort: 'status_sort'
                    }
                },{
                    targets: 1,
                    orderable: true,
                    searchable: true,
                    title: 'id',
                    type: 'html',
                    width: '30px',
                    data: 'name'
                },{
                    targets: 2,
                    orderable: false,
                    searchable: false,
                    title: 'group',
                    type: 'html',
                    width: '50px',
                    data: 'group'
                },{
                    targets: 3,
                    orderable: false,
                    searchable: false,
                    title: 'type',
                    type: 'html',
                    width: '180px',
                    data: 'type'
                },{
                    targets: 4,
                    orderable: false,
                    searchable: false,
                    title: 'description',
                    type: 'html',
                    data: 'description'
                },{
                    targets: 5,
                    title: 'created',
                    width: '90px',
                    searchable: false,
                    className: [config.sigTableCounterClass, config.sigTableCreatedCellClass, 'min-tablet-l'].join(' '),
                    data: 'created',
                    render: {
                        _: 'created',
                        sort: 'created'
                    }
                },{
                    targets: 6,
                    title: 'updated',
                    width: '90px',
                    searchable: false,
                    className: [config.sigTableCounterClass, config.sigTableUpdatedCellClass, 'min-tablet-l'].join(' '),
                    data: 'updated',
                    render: {
                        _: 'updated',
                        sort: 'updated'
                    }
                },{
                    targets: 7,
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: '10px',
                    class: 'pf-help text-center',
                    data: 'info',
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){

                        if(rowData.id > 0){

                            // add row tooltip
                            var tooltipData = {
                                created: rowData.created,
                                updated: rowData.updated
                            };

                            $(cell).addCharacterInfoTooltip( tooltipData );
                        }
                    }
                },{
                    targets: 8,
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: '10px',
                    class: ['text-center', config.sigTableActionCellClass].join(' '),
                    data: 'action',
                    render: {
                        _: 'button',
                        sort: 'action'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){

                        var tempTableElement = this;
                        var rowElement = $(cell).parents('tr');

                            switch(cellData.action){
                                case 'add':
                                    // add new signature ---------------------------------------------------------------
                                    $(cell).on('click', function(e) {
                                        // submit all fields within a table row
                                        var formFields = rowElement.find('.editable');

                                        // submit all xEditable fields
                                        formFields.editable('submit', {
                                            url: Init.path.saveSignatureData,
                                            ajaxOptions: {
                                                dataType: 'json' //assuming json response
                                            },
                                            data: {
                                                systemId: systemData.id, // additional data to submit
                                                pk: 0 // new data no primary key
                                            },
                                            error: $.fn.editable.defaults.error, // user default xEditable error function
                                            success: function (data, editableConfig) {

                                                addSignatureRow(systemData, data, true);


                                                // prepare "add signature" table for new entry -> reset --------------------------------------------
                                                var signatureData = formatSignatureData(systemData, [emptySignatureData], emptySignatureOptions);

                                                var dataSecondaryElement = $('.' + config.sigTableSecondaryClass);
                                                var dataTableSecondary = dataSecondaryElement.DataTable();
                                                var newAddRowElement = dataTableSecondary.clear().row.add(signatureData.shift()).draw().nodes();

                                                newAddRowElement.to$().makeEditable(systemData);

                                                Util.showNotify({
                                                    title: 'Signature added',
                                                    text: 'Name: ' + data.name,
                                                    type: 'success'
                                                });
                                            }
                                        });
                                    });
                                    break;
                                case 'delete':
                                    // delete signature ----------------------------------------------------------------
                                    var confirmationSettings = {
                                        container: 'body',
                                        placement: 'left',
                                        btnCancelClass: 'btn btn-sm btn-default',
                                        btnCancelLabel: 'cancel',
                                        btnCancelIcon: 'fa fa-fw fa-ban',
                                        title: 'Delete signature',
                                        btnOkClass: 'btn btn-sm btn-danger',
                                        btnOkLabel: 'delete',
                                        btnOkIcon: 'fa fa-fw fa-close',
                                        onConfirm : function(e, target){
                                            var deleteRowElement = $(target).parents('tr');
                                            var row = tempTableElement.DataTable().rows(deleteRowElement);
                                            deleteSignatures(row);
                                        }
                                    };

                                    // init confirmation dialog
                                    $(cell).confirmation(confirmationSettings);


                                    break;
                            }

                    }
                }
            ],
            createdRow: function(row, data, dataIndex){

            },
            initComplete: function(settings, json){
                // table init complete

            }
        });
    };

    /**
     * set module observer and look for relevant signature data to update
     * @param moduleElement
     */
    var setModuleObserver = function(moduleElement){
        var tablePrimaryElement = $('.' + config.sigTablePrimaryClass);
        var dataTablePrimary = signatureTable.DataTable();
        var signatureTableApi = signatureTable.api();

        $(document).off('pf:updateSystemModules').on('pf:updateSystemModules', function(e, data){
            if(data.signatures){
                moduleElement.updateSignatureTable(data.signatures);
            }

        });

        // set multi row select -----------------------------------------------------------------
        tablePrimaryElement.on('click', 'tr', function(e){
            if(event.ctrlKey) {
                $(this).toggleClass('selected');

                // check delete button
                checkDeleteSignaturesButton();
            }
        });

        // draw event for signature table -------------------------------------------------------
        signatureTableApi.on('draw.dt', function(){
            // check delete button
            checkDeleteSignaturesButton();
        });
    };

    /**
     * check the "delete signature" button. show/hide the button if a signature is selected
     */
    var checkDeleteSignaturesButton = function(){

        var selectedRows = getSelectedRows(signatureTable);
        var selectedRowCount = selectedRows.data().length;
        var clearButton = $('.' + config.sigTableClearButtonClass);


        if(selectedRowCount > 0){
            var allRows = getRows(signatureTable);
            var rowCount = allRows.data().length;

            var badgetText = selectedRowCount;
            if(selectedRowCount >= rowCount){
                badgetText = 'all';
            }
            clearButton.find('.badge').text( badgetText );

            // update clear signatures button text
            clearButton.velocity('stop');

            if( clearButton.is(':hidden') ){
                // show button
                clearButton.velocity('transition.bounceIn', {
                    duration: 200
                });
            }else{
                // highlight button
                clearButton.velocity('callout.pulse', {
                    duration: 250
                });
            }
        }else{
            // hide button
            clearButton.velocity('transition.bounceOut', {
                duration: 200
            });
        }
    };

    /**
     * get all rows of a table
     * @param table
     * @returns {*}
     */
    var getRows = function(table){
        var tableApi = table.api();
        var rows = tableApi.rows();

        return rows;
    };

    /**
     * get all selected rows of a table
     * @param table
     * @returns {*}
     */
    var getSelectedRows = function(table){
        var tableApi = table.api();
        var selectedRows = tableApi.rows('.selected');

        return selectedRows;
    };

    /**
     * get module element
     * @param parentElement
     * @param systemData
     * @returns {*|HTMLElement}
     */
    var getModule = function(parentElement, systemData){

        // create new module container
        var moduleElement = $('<div>', {
            class: [config.moduleClass, config.systemSigModuleClass].join(' '),
            css: {opacity: 0}
        });

        // headline
        var headline = $('<h5>', {
            text: 'Signatures'
        });

        moduleElement.append(headline);

        $(parentElement).append(moduleElement);

        // init dataTables
        initSignatureDataTable(systemData);

        // draw "new signature" add table --------------------------------------------

        moduleElement.drawSignatureTableToolbar(systemData);

        // request signature data for system -----------------------------------------

        var requestData = {
            systemIds: [systemData.id]
        };

        $.ajax({
            type: 'POST',
            url: Init.path.getSignatures,
            data: requestData,
            dataType: 'json'
        }).done(function(signatureData){

            var signatureTableData = formatSignatureData(systemData, signatureData, fullSignatureOptions);

            // draw signature table
            moduleElement.drawSignatureTable(signatureTableData, systemData);

            // set module observer
            setModuleObserver(moduleElement);
        }).fail(function( jqXHR, status, error) {
            var reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': Get signatures', text: reason, type: 'warning'});
            $(document).setProgramStatus('problem');
        });

        return moduleElement;
    };

    /**
     * main module load function
     * @param systemData
     */
    $.fn.drawSignatureTableModule = function(systemData){

        var parentElement = $(this);

        // show module
        var showModule = function(moduleElement){
            if(moduleElement){
                moduleElement.velocity('transition.slideDownIn', {
                    duration: Init.animationSpeed.mapModule,
                    delay: Init.animationSpeed.mapModule,
                    complete: function(){
                        disableTableUpdate = false;
                    }
                });

            }
        };

        // check if module already exists
        var moduleElement = parentElement.find('.' + config.systemSigModuleClass);

        if(moduleElement.length > 0){

            // disable update
            disableTableUpdate = true;

            moduleElement.velocity('transition.slideDownOut', {
                duration: Init.animationSpeed.mapModule,
                complete: function(tempElement){
                     // Destroying the data tables throws
                     // save remove of all dataTables
                     signatureTable.api().destroy();

                    $(tempElement).remove();

                    moduleElement = getModule(parentElement, systemData);
                    // make modules appear "nice"
                    moduleElement.delay(150);
                    showModule(moduleElement);
                }
            });
        }else{
            moduleElement = getModule(parentElement, systemData);
            showModule(moduleElement);
        }

        return;
    };


});