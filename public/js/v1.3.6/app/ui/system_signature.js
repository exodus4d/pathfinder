/**
 *  System signature module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'app/map/map',
    'app/map/util'
], function($, Init, Util, Render, bootbox, Map, MapUtil) {
    'use strict';

    let config = {
        // module info
        modulePosition: 4,
        moduleName: 'systemSignature',
        moduleHeadClass: 'pf-module-head',                                      // class for module header
        moduleHandlerClass: 'pf-module-handler-drag',                           // class for "drag" handler

        moduleClass: 'pf-module',                                               // class for each module

        // system signature module
        moduleTypeClass: 'pf-signature-table-module',                           // module wrapper

        // tables
        tableToolsClass: 'pf-table-tools',                                      // class for table toolbar
        tableToolsActionClass: 'pf-table-tools-action',                         // class for table toolbar action

        // signature progress bar
        signatureScannedProgressBarClass: 'pf-system-progress-scanned',         // class for signature progress bar

        // toolbar
        sigTableLazyToggleButtonClass: 'pf-sig-table-lazy-button',              // class for "lazy update" toggle button
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
        sigTableEditSigConnectionSelect: 'pf-sig-table-edit-connection-select', // class for editable fields (sig connection)
        sigTableEditSigDescriptionTextarea: 'pf-sig-table-edit-desc-text',      // class for editable fields (sig description)
        sigTableCreatedCellClass: 'pf-sig-table-created',                       // class for "created" cells
        sigTableUpdatedCellClass: 'pf-sig-table-updated',                       // class for "updated" cells

        sigTableConnectionClass: 'pf-table-connection-cell',                    // class for "connection" cells
        sigTableCounterClass: 'pf-table-counter-cell',                          // class for "counter" cells
        sigTableActionCellClass: 'pf-table-action-cell',                        // class for "action" cells

        // xEditable
        moduleIcon: 'pf-module-icon-button',                                    // class for "filter" - icons
        editableDescriptionInputClass: 'pf-editable-description',               // class for "description" textarea
        editableFilterElementClass: 'pf-editable-filter',                       // class for "filter" selects (not active)
        editableFilterSelectPopoverClass: 'pf-editable-filter-active'           // class for active "filter" selects (popover)
    };

    // lock Signature Table update temporary (until. some requests/animations) are finished
    let disableTableUpdate = true;

    // disable "copy&paste" from clipboard (until  request finished)
    let disableCopyFromClipboard = false;

    // cache for dataTable object6
    let dataTableInstances = {};

    // empty signatureData object -> for "add row" table
    let emptySignatureData = {
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

    let fullSignatureOptions = {
        action: 'delete',
        actionClass: ['fa-times', 'txt-color', 'txt-color-redDarker'].join(' ')
    };

    // empty signatureData row Options
    let emptySignatureOptions = {
        action: 'add',
        actionClass: ['fa-plus'].join(' ')
    };

    let sigNameCache = {};                                                      // cache signature names

    let validSignatureNames = [                                                 // allowed signature type/names
        'Cosmic Anomaly',
        'Cosmic Signature',
        'Kosmische Anomalie',
        'Kosmische Signatur',
        'Anomalie cosmique',
        'Signature cosmique',
        'Космическая аномалия',                                                 // == "Cosmic Anomaly"
        'Источники сигналов'                                                    // == "Cosmic Signature"
    ];

    // some static signature data
    let signatureGroupsLabels   = Util.getSignatureGroupInfo('label');
    let signatureGroupsNames    = Util.getSignatureGroupInfo('name');

    /**
     * check whether a dataTable API instance exists in the global cache
     * args: 1. mapId, 2. systemId, 3, tableType (primary/secondary) string
     * @param args
     * @returns {boolean}
     */
    let checkDataTableInstance = (...args) => {
        let obj = dataTableInstances;
        for(let arg of args){
            if ( !obj || !obj.hasOwnProperty(arg) ){
                return false;
            }
            obj = obj[arg];
        }
        return true;
    };

    /**
     * stores a dataTableApi instance to global cache ( overwrites existing)
     * @param mapId
     * @param systemId
     * @param tableType
     * @param instance
     */
    let setDataTableInstance = (mapId, systemId, tableType, instance) => {
        let tmpObj = {
            [mapId]: {
                [systemId]: {
                    [tableType]: instance
                }
            }
        };

        $.extend(true, dataTableInstances, tmpObj);
    };

    /**
     * get a dataTableApi instance from global cache
     * @param mapId
     * @param systemId
     * @param tableType
     * @returns {*}
     */
    let getDataTableInstance = (mapId, systemId, tableType) => {
        let instance = null;
        if( checkDataTableInstance(mapId, systemId, tableType) ){
            instance = dataTableInstances[mapId][systemId][tableType];
        }
        return instance;
    };

    /**
     * get dataTable instance from "moduleElement" (DOM node)
     * @param moduleElement
     * @param tableType
     * @returns {*}
     */
    let getDataTableInstanceByModuleElement = (moduleElement, tableType) => {
        return getDataTableInstance(moduleElement.data('mapId'), moduleElement.data('systemId'), tableType);
    };

    /**
     * delete a dataTableApi instance from global cache
     * -> see checkDataTableInstance() for parameter order
     * @param args
     */
    let deleteDataTableInstance = (...args) => {
        // check if instance exists
        if( checkDataTableInstance.apply(null, args) ){

            // callback for "leaf" delete callback
            let deleteCallback = (dataTableApi) => {
                dataTableApi.destroy();
            };

            // recursive delete from dataTableInstances Object cache
            let deepDelete = (target, obj, callback) => {
                if(target.length > 1){
                    // remove first target param for next recursive call
                    let currentTarget = target.shift();

                    deepDelete(target, obj[currentTarget], callback);

                    // delete "parent" key when current key became empty
                    if( !Object.keys( obj[currentTarget] ).length ){
                        delete obj[currentTarget];
                    }
                }else{
                    // check for callback function
                    if( typeof callback === 'function' ){
                        callback(obj[target]);
                    }

                    delete obj[target];
                }
            };

            deepDelete(args, dataTableInstances, deleteCallback);
        }
    };

    /**
     * collect all data of all editable fields in a signature table
     * @param tableApi
     * @returns {Array}
     */
    let getTableData = function(tableApi){
        let tableData = [];

        if(tableApi){
            tableApi.rows().eq(0).each(function(idx){
                let row = tableApi.row(idx);
                // default row data
                let defaultRowData = row.data();
                let rowElement = row.nodes().to$();

                if(defaultRowData.id > 0){
                    // get all editable fields per row
                    let editableFields = rowElement.find('.editable');

                    if(editableFields.length > 0){
                        let values = $(editableFields).editable('getValue');

                        if(values.name){
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
                }
            });
        }

        return tableData;
    };

    /**
     * updates a single cell with new data (e.g. "updated" cell)
     * @param tableApi
     * @param rowElement
     * @param cellIndex
     * @param data
     */
    let updateSignatureCell = function(tableApi, rowElement, cellIndex, data){
        let rowIndex = tableApi.row( rowElement ).index();
        let updateCell = tableApi.cell( rowIndex, cellIndex );
        let updateCellElement = updateCell.nodes().to$();

        if(cellIndex === 7){
            // clear existing counter interval
            clearInterval( updateCellElement.data('interval') );
        }

        // set new value
        updateCell.data( data ).draw();

        if(cellIndex === 7){
            updateCellElement.initTimestampCounter();
        }
    };

    /**
     * Updates a signature table, changes all signatures where name matches
     * add all new signatures as a row
     *
     * @param signatureDataOrig
     * @param deleteOutdatedSignatures -> set to "true" if signatures should be deleted that are not included in "signatureData"
     */
    $.fn.updateSignatureTable = function(signatureDataOrig, deleteOutdatedSignatures){
        // check if table update is allowed
        if(disableTableUpdate === true){
            return;
        }

        // clone signature array because of further manipulation
        let signatureData = $.extend([], signatureDataOrig);

        // disable update until function is ready;
        lockSignatureTable();

        let moduleElement = $(this);

        // get signature table API
        let signatureTableApi = getDataTableInstanceByModuleElement(moduleElement, 'primary');

        // get current system data
        let currentSystemData = Util.getCurrentSystemData();

        let tableData = getTableData(signatureTableApi);

        let notificationCounter = {
            added: 0,
            changed: 0,
            deleted: 0
        };

        for(let i = 0; i < signatureData.length; i++){
            for(let j = 0; j < tableData.length; j++){
                if(signatureData[i].id === tableData[j].id){

                    // check if row was updated
                    if(signatureData[i].updated.updated > tableData[j].updated.updated){
                        // row element to remove
                        let currentRowElement = signatureTableApi.row(tableData[j].index).nodes().to$();

                        // hide open editable fields on the row before removing them
                        currentRowElement.find('.editable').editable('destroy');

                        // remove "old" row
                        signatureTableApi.row(currentRowElement).remove().draw();

                        // and add "new" row
                        let changedRowElement = addSignatureRow(signatureTableApi, currentSystemData.systemData, signatureData[i], false);

                        if(changedRowElement){
                            // highlight
                            changedRowElement.pulseTableRow('changed');
                            notificationCounter.changed++;
                        }
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

        // delete signatures ------------------------------------------------------------------------------------------
        if(deleteOutdatedSignatures === true){

            // callback function after row deleted
            let toggleTableRowCallback = function(tempRowElement){
                // hide open editable fields on the row before removing them
                tempRowElement.find('.editable').editable('destroy');

                // delete signature row
                signatureTableApi.row(tempRowElement).remove().draw();
            };

            for(let l = 0; l < tableData.length; l++){
                let rowElement = signatureTableApi.row(tableData[l].index).nodes().to$();
                rowElement.toggleTableRow(toggleTableRowCallback);
                notificationCounter.deleted++;
            }
        }

        // add new signatures -----------------------------------------------------------------------------------------
        for(let k = 0; k < signatureData.length; k++){
            // and add "new" row
            let newRowElement = addSignatureRow(signatureTableApi, currentSystemData.systemData, signatureData[k], false);

            if(newRowElement){
                // highlight
                newRowElement.pulseTableRow('added');
                notificationCounter.added++;
            }
        }

        // show notification ------------------------------------------------------------------------------------------
        if(
            notificationCounter.added > 0 ||
            notificationCounter.changed > 0 ||
            notificationCounter.deleted > 0
        ){
            // update signature bar
            moduleElement.updateScannedSignaturesBar({showNotice: true});

            let notification = notificationCounter.added + ' added<br>';
            notification += notificationCounter.changed + ' updated<br>';
            notification += notificationCounter.deleted + ' deleted<br>';
            Util.showNotify({title: 'Signatures updated', text: notification, type: 'success'});

            // wait until add/remove animations are finished before enable table for auto update again
            unlockSignatureTable(false);
        }else{
            // enable table for next update
            unlockSignatureTable(true);
        }
    };

    /**
     * lock system signature table for
     */
    let lockSignatureTable = function(){
        disableTableUpdate = true;
    };

    /**
     * unlock system signature table from been locked
     * -> make table "update-able" again
     * @param instant
     */
    let unlockSignatureTable = function(instant){
        if(disableTableUpdate === true){
            if(instant === true){
                disableTableUpdate = false;
            }else{
                // wait until add/remove animations are finished before enable table for auto update again
                setTimeout(function(){ disableTableUpdate = false; }, 2000);
            }

        }
    };

    /**
     * update Progressbar for all scanned signatures in a system
     * @param options
     */
    $.fn.updateScannedSignaturesBar = function(options){
        let moduleElement = $(this);
        let signatureTableApi = getDataTableInstanceByModuleElement(moduleElement, 'primary');

        // get progress bar
        let progressBarWrapper = moduleElement.find('.' + config.signatureScannedProgressBarClass);
        let progressBar = $(progressBarWrapper).find('.progress-bar');
        let progressBarLabel = $(progressBarWrapper).find('.progress-label-right');

        let tableData = getTableData(signatureTableApi);

        let sigCount = 0;
        let percent = 0;
        let sigIncompleteCount = 0;
        let progressBarType = 'progress-bar-danger';

        if(tableData){
            sigCount = tableData.length;

            // check for  signatures without "groupId" -> these are un scanned signatures

            for(let i = 0; i < tableData.length; i++){
                let groupId = parseInt(tableData[i].groupId);
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

                let notification = (sigCount - sigIncompleteCount) + ' / ' + sigCount + ' (' + percent + '%) signatures scanned';

                // show notifications
                if(options.showNotice !== false){
                    if(percent < 100){
                        Util.showNotify({title: 'Unscanned signatures', text: notification, type: 'info'});
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
        let moduleElement = $(this);

        requirejs(['text!templates/dialog/signature_reader.html', 'mustache'], (template, Mustache) => {
            let signatureReaderDialog = bootbox.dialog({
                title: 'Signature reader',
                message: Mustache.render(template, {}),
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fas fa-paste fa-fw"></i>&nbsp;update signatures',
                        className: 'btn-success',
                        callback: function () {
                            let form = this.find('form');
                            let formData = form.getFormValues();
                            let signatureOptions = {
                                deleteOld: (formData.deleteOld) ? 1 : 0
                            };
                            moduleElement.updateSignatureTableByClipboard(systemData, formData.clipboard, signatureOptions);
                        }
                    }
                }
            });

            // dialog shown event
            signatureReaderDialog.on('shown.bs.modal', function(e) {
                signatureReaderDialog.initTooltips();

                // set focus on sig-input textarea
                signatureReaderDialog.find('textarea').focus();
            });
        });
    };

    /**
     * updates the signature table with all signatures pasted into the "signature reader" dialog
     * -> Hint: copy&paste signature data (without any open dialog) will add signatures as well
     * @param systemData
     * @param clipboard data stream
     * @param options
     */
    $.fn.updateSignatureTableByClipboard = function(systemData, clipboard, options){
        let moduleElement = $(this);

        let saveSignatureData = function(signatureData){
            // lock update function until request is finished
            lockSignatureTable();

            // lock copy during request (prevent spamming (ctrl + c )
            disableCopyFromClipboard = true;

            let requestData = {
                signatures: signatureData,
                deleteOld: (options.deleteOld) ? 1 : 0,
                systemId: parseInt(systemData.id)
            };

            $.ajax({
                type: 'POST',
                url: Init.path.saveSignatureData,
                data: requestData,
                dataType: 'json',
                context: {
                    moduleElement: moduleElement
                }
            }).done(function(responseData){
                unlockSignatureTable(true);

                // updates table with new/updated signature information
                this.moduleElement.updateSignatureTable(responseData.signatures, false);
            }).fail(function( jqXHR, status, error) {
                let reason = status + ' ' + error;
                Util.showNotify({title: jqXHR.status + ': Update signatures', text: reason, type: 'warning'});
                $(document).setProgramStatus('problem');
            }).always(function() {
                unlockSignatureTable(true);
                disableCopyFromClipboard = false;
            });
        };

        // check if copy&paste is enabled
        if( !disableCopyFromClipboard ){
            // parse input stream
            let signatureData = parseSignatureString(systemData, clipboard);
            if(signatureData.length > 0){
                // valid signature data parsed

                // check if signatures will be added to a system where character is currently in
                // if user is not in any system -> id === undefined -> no "confirmation required
                let currentLocationData = Util.getCurrentLocationData();
                if(
                    currentLocationData.id &&
                    currentLocationData.id !== systemData.id
                ){

                    let systemNameStr = (systemData.name === systemData.alias) ? '"' + systemData.name + '"' : '"' + systemData.alias + '" (' + systemData.name + ')';
                    systemNameStr = '<span class="txt-color txt-color-warning">' + systemNameStr + '</span>';

                    let msg = '';
                    msg += 'Update signatures in ' + systemNameStr + ' ? This not your current location, "' + currentLocationData.name + '" !';
                    bootbox.confirm(msg, function(result) {
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
    };

    /**
     * parses a copy&paste string from ingame scanning window
     * @param systemData
     * @param clipboard
     * @returns {Array}
     */
    let parseSignatureString = function(systemData, clipboard){
        let signatureData = [];

        if(clipboard.length){
            let signatureRows = clipboard.split(/\r\n|\r|\n/g);
            let signatureGroupOptions = signatureGroupsNames;
            let invalidSignatures = 0;

            for(let i = 0; i < signatureRows.length; i++){
                let rowData = signatureRows[i].split(/\t/g);
                if(rowData.length === 6){
                    // check if sig Type = anomaly or combat site
                    if(validSignatureNames.indexOf( rowData[1] ) !== -1){

                        let sigGroup = $.trim(rowData[2]).toLowerCase();
                        let sigDescription = $.trim(rowData[3]);
                        let sigGroupId = 0;
                        let typeId = 0;

                        // get groupId by groupName
                        for (let prop in signatureGroupOptions) {
                            if(signatureGroupOptions.hasOwnProperty(prop)){
                                let reg = new RegExp(signatureGroupOptions[prop], 'i');
                                if (reg.test(sigGroup)) {
                                    sigGroupId = parseInt( prop );
                                    break;
                                }
                            }
                        }

                        // wormhole type cant be extracted from signature string -> skip function call
                        if(sigGroupId !== 5){
                            // try to get "typeId" by description string
                            typeId = Util.getSignatureTypeIdByName( systemData, sigGroupId, sigDescription );

                            // set signature name as "description" if signature matching failed
                            sigDescription = (typeId === 0) ? sigDescription : '';
                        }else{
                            sigDescription = '';
                        }

                        // map array values to signature Object
                        let signatureObj = {
                            systemId: systemData.id,
                            name: $.trim( rowData[0] ).toLowerCase(),
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
    };

    /**
     * format signature data array into dataTable structure
     * @param systemData
     * @param signatureData
     * @param options
     * @returns {Array}
     */
    let formatSignatureData = function(systemData, signatureData, options){

        let formattedData = [];

        // security check
        if(
            systemData &&
            systemData.id &&
            systemData.id > 0
        ){
            let systemTypeId = systemData.type.id;

            // areaId is required as a key for signature names
            // if areaId is 0, no signature data is available for this system
            let areaId = Util.getAreaIdBySecurity(systemData.security);

            for(let i = 0; i < signatureData.length; i++){
                let data = signatureData[i];

                let tempData = {};

                // set id ---------------------------------------------------------------------------------------------
                let sigId = 0;
                if(data.id > 0){
                    sigId = data.id;
                }
                tempData.id = sigId;

                // set status -----------------------------------------------------------------------------------------
                let statusClass = '';
                if(data.updated.character !== undefined){
                    statusClass = Util.getStatusInfoForCharacter(data.updated.character, 'class');
                }
                let status = '<i class="fas fa-fw fa-circle pf-user-status ' + statusClass + '"></i>';

                tempData.status = {
                    status: status,
                    status_sort: statusClass
                };

                // set name -------------------------------------------------------------------------------------------
                let sigName = '<a href="#" class="' + config.sigTableEditSigNameInput + '" ';
                if(data.id > 0){
                    sigName += 'data-pk="' + data.id + '" ';
                }
                sigName += '>' + data.name + '</a>';

                tempData.name = {
                    render: sigName,
                    name: data.name
                };

                // set group id ---------------------------------------------------------------------------------------
                let sigGroup = '<a href="#" class="' + config.sigTableEditSigGroupSelect + '" ';
                if(data.id > 0){
                    sigGroup += 'data-pk="' + data.id + '" ';
                }
                sigGroup += 'data-systemTypeId="' + systemTypeId + '" ';
                sigGroup += 'data-areaId="' + areaId + '" ';
                sigGroup += 'data-value="' + data.groupId + '" ';
                sigGroup += '></a>';

                tempData.group = {
                    group: sigGroup,
                    sort: signatureGroupsLabels[data.groupId],
                    filter: signatureGroupsLabels[data.groupId]
                };

                // set type id ----------------------------------------------------------------------------------------
                let sigType = '<a href="#" class="' + config.sigTableEditSigTypeSelect + '" ';
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

                // set connection (to target system) ------------------------------------------------------------------
                let sigConnection = '<a href="#" class="' + config.sigTableEditSigConnectionSelect + '" ';
                if(data.id > 0){
                    sigConnection += 'data-pk="' + data.id + '" ';
                }

                // set disabled if group is not wromhole
                if(data.groupId !== 5){
                    sigConnection += 'data-disabled="1" ';
                }

                if(data.connection){
                    sigConnection += 'data-value="' + data.connection.id + '" ';
                }
                sigConnection += '></a>';

                tempData.connection = {
                    render: sigConnection,
                    connection: data.connection
                };

                // set description ------------------------------------------------------------------------------------
                let sigDescription = '<a href="#" class="' + config.sigTableEditSigDescriptionTextarea + '" ';
                if(data.id > 0){
                    sigDescription += 'data-pk="' + data.id + '" ';
                }
                sigDescription += '>' + data.description + '</a>';

                tempData.description = sigDescription;

                // set created ----------------------------------------------------------------------------------------
                tempData.created = data.created;

                // set updated ----------------------------------------------------------------------------------------
                tempData.updated = data.updated;

                // info icon ------------------------------------------------------------------------------------------
                let infoButton = '';
                if(data.id > 0){
                    infoButton = '<i class="fas fa-fw fa-question-circle"></i>';
                }
                tempData.info = infoButton;

                // action icon ----------------------------------------------------------------------------------------

                let actionButton = '<i class="fas ' + options.actionClass + '"></i>';
                tempData.action = {
                    action: options.action,
                    button: actionButton
                };

                formattedData.push(tempData);

            }

        }

        return formattedData;
    };

    /**
     * get a labeled button
     * @param options
     * @returns {*|jQuery}
     */
    let getLabeledButton = function(options){

        let buttonClasses = ['btn', 'btn-sm', 'btn-labeled'];

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


        let buttonElement = $('<button>', {
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
                    class: ['fas', options.icon, 'fa-fw'].join(' ')
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
     * get all rows of a table
     * @param tableApi
     * @returns {*}
     */
    let getRows = function(tableApi){
        let rows = tableApi.rows();
        return rows;
    };

    /**
     * get all selected rows of a table
     * @param tableApi
     * @returns {*}
     */
    let getSelectedRows = function(tableApi){
        let selectedRows = tableApi.rows('.selected');
        return selectedRows;
    };

    /**
     * check the "delete signature" button. show/hide the button if a signature is selected
     * @param moduleElement
     */
    let checkDeleteSignaturesButton = function(moduleElement){
        moduleElement = $(moduleElement);
        let signatureTableApi = getDataTableInstanceByModuleElement(moduleElement, 'primary');

        let selectedRows = getSelectedRows(signatureTableApi);
        let selectedRowCount = selectedRows.data().length;
        let clearButton = moduleElement.find('.' + config.sigTableClearButtonClass);

        if(selectedRowCount > 0){
            let allRows = getRows(signatureTableApi);
            let rowCount = allRows.data().length;

            let badgeText = selectedRowCount;
            if(selectedRowCount >= rowCount){
                badgeText = 'all';
            }
            clearButton.find('.badge').text( badgeText );

            // update clear signatures button text
            clearButton.velocity('stop');

            if( clearButton.is(':hidden') ){
                // show button
                clearButton.velocity('transition.expandIn', {
                    duration: 100
                });
            }else{
                // highlight button
                clearButton.velocity('callout.pulse', {
                    duration: 200
                });
            }
        }else{
            // hide button
            clearButton.velocity('transition.expandOut', {
                duration: 100
            });
        }
    };

    /**
     * draw signature table toolbar (add signature button, scan progress bar
     * @param mapId
     * @param systemData
     */
    $.fn.drawSignatureTableToolbar = function(mapId, systemData){
        let moduleElement = $(this);

        // add toolbar buttons for table ------------------------------------------------------------------------------
        let tableToolbar = $('<div>', {
            class: config.tableToolsClass
        }).append(
            getLabeledButton({
                type: 'primary',
                label: 'add',
                icon: 'fa-plus',
                onClick: function(e){
                    // show "add sig" div
                    let toolsElement = $(e.target).parents('.' + config.moduleClass).find('.' + config.tableToolsActionClass);

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
            getLabeledButton({
                type: 'primary',
                label: 'signature reader',
                icon: 'fa-paste',
                onClick: function(){
                    moduleElement.showSignatureReaderDialog(systemData);
                }
            })
        ).append(
            getLabeledButton({
                type: 'default',
                label: 'select all',
                icon: 'fa-check-square',
                onClick: function(){
                    let signatureTableApi = getDataTableInstanceByModuleElement(moduleElement, 'primary');

                    let allRows = getRows(signatureTableApi);
                    let selectedRows = getSelectedRows(signatureTableApi);
                    let allRowElements = allRows.nodes().to$();

                    if(allRows.data().length === selectedRows.data().length){
                        allRowElements.removeClass('selected');
                    }else{
                        allRowElements.addClass('selected');
                    }

                    // check delete button
                    checkDeleteSignaturesButton(moduleElement);
                }
            })
        ).append(
            $('<input>', {
                type: 'checkbox',
                class: [config.sigTableLazyToggleButtonClass, 'btn-labeled'].join(' '),
                value: 1,
            }).attr('data-toggle', 'toggle')
        ).append(
            getLabeledButton({
                type: 'danger',
                classes: [config.sigTableClearButtonClass, 'pull-right'],
                label: 'delete',
                icon: 'fa-times',
                badge: {
                    label: '0'
                },
                onClick: function(){
                    // delete all rows
                    let signatureTableApi = getDataTableInstanceByModuleElement(moduleElement, 'primary');
                    let selectedRows = getSelectedRows(signatureTableApi);

                    bootbox.confirm('Delete ' + selectedRows.data().length + ' signature?', function(result) {
                        if(result){
                            deleteSignatures(signatureTableApi, selectedRows);
                        }
                    });
                }
            })
        );

        moduleElement.append(tableToolbar);

        // "lazy update" toggle button --------------------------------------------------------------------------------
        let lazyToggleCheckbox = moduleElement.find('.' + config.sigTableLazyToggleButtonClass).bootstrapToggle({
            size: 'small' ,
            on: '<i class="fas fa-fw fa-exchange-alt"></i>&nbsp;&nbsp;lazy&nbsp;delete',
            off: '<i class="fas fa-fw fa-paste"></i>&nbsp;&nbsp;lazy&nbsp;update',
            onstyle: 'warning' ,
            offstyle: 'default' ,
            width: 110
        });

        let lazyToggleButton = lazyToggleCheckbox.parent();
        lazyToggleButton.find('.toggle-on').attr('title', 'lazy \'update\' and \'delete\' old<br>from clipboard |ctrl&nbsp;+&nbsp;v|');
        lazyToggleButton.find('.toggle-off').attr('title', 'lazy \'update\' signatures<br>from clipboard |ctrl&nbsp;+&nbsp;v|');
        lazyToggleButton.initTooltips({
            container: 'body',
            html: true
        });

        // add toolbar action for table -------------------------------------------------------------------------------
        let tableToolbarAction = $('<div>', {
            class: config.tableToolsActionClass
        });

        // create "empty table for new signature
        let table = $('<table>', {
            class: ['display', 'compact', 'nowrap', config.sigTableClass, config.sigTableSecondaryClass].join(' ')
        });

        tableToolbarAction.append(table);

        tableToolbar.after(tableToolbarAction);

        let signatureData = formatSignatureData(systemData, [emptySignatureData], emptySignatureOptions);
        let signatureTable = table.dataTable( {
            data: signatureData,
            paging: false,
            ordering: false,
            info: false,
            searching: false
        } );
        let signatureTableApi = signatureTable.api();

        setDataTableInstance(mapId, systemData.id, 'secondary', signatureTableApi);

        table.makeEditable(signatureTableApi, systemData);

        // scanned signatures progress bar ----------------------------------------------------------------------------
        let moduleConfig = {
            name: 'form/progress',
            position: tableToolbar,
            link: 'before'
        };

        let moduleData = {
            label: true,
            wrapperClass: config.signatureScannedProgressBarClass,
            class: ['progress-bar-success'].join(' '),
            percent: 0,
            headline: 'System scanned',
            headlineRight: ' ' // will be updated by js
        };

        Render.showModule(moduleConfig, moduleData);
    };

    /**
     * Update/set tooltip for an element
     * @param element
     * @param title
     */
    let updateTooltip = function(element, title){
        $(element).attr('data-container', 'body').attr('title', title.toUpperCase()).tooltip('fixTitle')
            .tooltip('setContent');
    };

    /**
     * make a table or row editable
     * @param tableApi
     * @param systemData
     */
    $.fn.makeEditable = function(tableApi, systemData){
        // table element OR row element
        let tableElement = $(this);

        // find editable fields
        let sigNameFields = tableElement.find('.' + config.sigTableEditSigNameInput);
        let sigGroupFields = tableElement.find('.' + config.sigTableEditSigGroupSelect);
        let sigTypeFields = tableElement.find('.' + config.sigTableEditSigTypeSelect);
        let sigDescriptionFields = tableElement.find('.' + config.sigTableEditSigDescriptionTextarea);
        let sigConnectionFields = tableElement.find('.' + config.sigTableEditSigConnectionSelect);

        // jump to "next" editable field on save
        let openNextEditDialogOnSave = function(fields){
            fields.on('save', function(e, a){

                let currentField = $(this);

                setTimeout(function() {
                    let nextField = getNextEditableField(currentField);
                    nextField.editable('show');

                    // update scanning progressbar if sig "type" has changed AND
                    // the current field is in the "primary" table (not the "add" new sig row)
                    if(
                        $(e.target).hasClass(config.sigTableEditSigGroupSelect) &&
                        $(e.target).parents('.' + config.sigTableClass).hasClass(config.sigTablePrimaryClass)
                    ){
                        currentField.parents('.' + config.moduleClass).updateScannedSignaturesBar({showNotice: true});
                    }
                }, 200);
            });
        };

        // helper function - get the next editable field in next table column
        let getNextEditableField = function(field, selector){
            let nextEditableField = null;
            if(selector){
                // search specific sibling
                nextEditableField = $(field).closest('td').nextAll(selector).find('.editable');
            }else{
                // get next sibling
                nextEditableField = $(field).closest('td').next().find('.editable');
            }

            return $(nextEditableField);
        };

        /**
         * add map/system specific data for each editable field in the sig-table
         * @param params
         * @returns {*}
         */
        let modifyFieldParamsOnSend = function(params){
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
                let reason = '';
                let status = '';
                if(jqXHR.name){
                    // save error new sig (mass save)
                    reason = jqXHR.name;
                    status = 'Error';
                }else{
                    reason = jqXHR.responseJSON.text;
                    status = jqXHR.status;
                }

                Util.showNotify({title: status + ': save signature', text: reason, type: 'error'});
                $(document).setProgramStatus('problem');
                return reason;
            }
        });


        // Input sig name ---------------------------------------------------------------------------------------------
        sigNameFields.editable({
            type: 'text',
            title: 'signature id',
            name: 'name',
            emptytext: '? ? ?',
            display: function(value) {
                // change display value to first 3 letters
                $(this).text( $.trim( value.substr(0, 3) ).toLowerCase() );
            },
            validate: function(value) {
                if($.trim(value).length < 3) {
                    return 'Id is less than min of "3"';
                }else if($.trim(value).length > 10){
                    return 'Id is more than max of "10"';
                }
            },
            params: modifyFieldParamsOnSend,
            success: function(response, newValue){
                if(response){
                    let signatureTypeField = $(this);
                    let columnElement = signatureTypeField.parents('td');
                    let rowElement = signatureTypeField.parents('tr');
                    let newRowData = response.signatures[0];

                    // update column tooltip
                    updateTooltip(columnElement, newValue);

                    // update "updated" cell
                    updateSignatureCell(tableApi, rowElement, 7, newRowData.updated);
                }
            }
        });


        // Select sig group (master) ----------------------------------------------------------------------------------
        sigGroupFields.editable({
            type: 'select',
            title: 'group',
            name: 'groupId',
            emptytext: 'unknown',
            onblur: 'submit',
            showbuttons: false,
            params: modifyFieldParamsOnSend,
            source: function(){

                let signatureGroupField = $(this);
                let systemTypeId = parseInt( signatureGroupField.attr('data-systemTypeId') );

                // get all available Signature Types
                let availableTypes = signatureGroupsLabels;

                // add empty option
                availableTypes[0] = '';

                return availableTypes;
            },
            success: function(response, newValue){
                let signatureTypeField = $(this);
                let rowElement = signatureTypeField.parents('tr');
                newValue = parseInt(newValue);

                if(response){
                    let newRowData = response.signatures[0];

                    // update "updated" cell
                    updateSignatureCell(tableApi, rowElement, 7, newRowData.updated);
                }

                // find related "type" select (same row) and change options
                let typeSelect = getNextEditableField(signatureTypeField);

                let systemTypeId = parseInt( signatureTypeField.attr('data-systemTypeId') );
                let areaId = parseInt( signatureTypeField.attr('data-areaid') );

                let newSelectOptions = getAllSignatureNames(systemData, systemTypeId, areaId, newValue);
                typeSelect.editable('option', 'source', newSelectOptions);
                typeSelect.editable('setValue', null);

                if(
                    newValue > 0 &&
                    newSelectOptions.length > 0
                ){
                    typeSelect.editable('enable');
                }else{
                    typeSelect.editable('disable');
                }

                // find "connection" select (same row) and change "enabled" flag
                let connectionSelect = getNextEditableField(signatureTypeField, '.' + config.sigTableConnectionClass);
                connectionSelect.editable('setValue', null);

                if(newValue === 5){
                    // wormhole
                    connectionSelect.editable('enable');
                }else{
                    checkConnectionConflicts();
                    connectionSelect.editable('disable');
                }
            }
        });


        // Select sig type (slave: depends on sig type) ---------------------------------------------------------------
        sigTypeFields.on('init', function(e, editable) {
            // check if there are initial options available
            let options = editable.input.options.source.bind(e.target)();
            if(options.length <= 0){
                editable.disable();
            }
        });

        sigTypeFields.editable({
            type: 'select',
            title: 'type',
            name: 'typeId',
            emptytext: 'unknown',
            onblur: 'submit',
            showbuttons: false,
            params: modifyFieldParamsOnSend,
            source: function(){
                let signatureTypeField = $(this);

                let systemTypeId = parseInt( signatureTypeField.attr('data-systemTypeId') );
                let areaId = parseInt( signatureTypeField.attr('data-areaid') );
                let groupId = parseInt( signatureTypeField.attr('data-groupId') );
                let availableSigs = getAllSignatureNames(systemData, systemTypeId, areaId, groupId);

                return availableSigs;
            },
            success: function(response, newValue){
                if(response){
                    let signatureTypeField = $(this);
                    let rowElement = signatureTypeField.parents('tr');
                    let newRowData = response.signatures[0];

                    // update "updated" cell
                    updateSignatureCell(tableApi, rowElement, 7, newRowData.updated);
                }
            }
        });

        // Textarea sig description -----------------------------------------------------------------------------------
        sigDescriptionFields.editable({
            type: 'textarea',
            title: 'description',
            name: 'description',
            emptytext: '<i class="fas fa-fw fa-lg fa-pencil-alt"></i>',
            onblur: 'submit',
            mode: 'inline',
            showbuttons: false,
            inputclass: config.editableDescriptionInputClass,
            params: modifyFieldParamsOnSend,
            success: function(response, newValue){
                if(response){
                    let signatureTypeField = $(this);
                    let rowElement = signatureTypeField.parents('tr');
                    let newRowData = response.signatures[0];

                    // update "updated" cell
                    updateSignatureCell(tableApi, rowElement, 7, newRowData.updated);
                }
            }
        });

        // Select connection (target system) --------------------------------------------------------------------------
        let initCount = 0;
        sigConnectionFields.on('init', function(e, editable) {
            if(++initCount >= sigConnectionFields.length){
                checkConnectionConflicts();
            }
        });

        sigConnectionFields.editable({
            type: 'select',
            title: 'system',
            name: 'connectionId',
            emptytext: 'unknown',
            onblur: 'submit',
            showbuttons: false,
            params: modifyFieldParamsOnSend,
            display: function(value, sourceData) {
                let editableElement = $(this);
                let newValue = '';

                if(value !== null){
                    let selected = $.fn.editableutils.itemsByValue(value, sourceData);
                    if(
                        selected.length &&
                        selected[0].text !== ''
                    ){
                        newValue += '<i class="fas fa-exclamation-triangle txt-color txt-color-danger hide"></i>';
                        newValue += ' ' + selected[0].text;
                    }else{
                        newValue = '<span class="editable-empty">unknown</span>';
                    }
                }

                editableElement.html(newValue);
            },
            source: function(a,b){
                let activeMap = Util.getMapModule().getActiveMap();
                let mapId = activeMap.data('id');

                let availableConnections = getSignatureConnectionOptions(mapId, systemData);

                return availableConnections;
            },
            success: function(response, newValue){
                if(response){
                    let signatureConnectionField = $(this);
                    let rowElement = signatureConnectionField.parents('tr');
                    let newRowData = response.signatures[0];

                    // update "updated" cell
                    updateSignatureCell(tableApi, rowElement, 7, newRowData.updated);
                }
            }
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

        // save events
        sigConnectionFields.on('save', function(e, editable){
            checkConnectionConflicts();
        });

        // open next field dialog -------------------------------------------------------------------------------------
        openNextEditDialogOnSave(sigNameFields);
        openNextEditDialogOnSave(sigGroupFields);
    };

    /**
     * get all connection select options
     * @param mapId
     * @param systemData
     * @returns {Array}
     */
    let getSignatureConnectionOptions = (mapId, systemData) => {
        let map = Map.getMapInstance( mapId );
        let systemId = MapUtil.getSystemId(mapId, systemData.id);
        let systemConnections = MapUtil.searchConnectionsBySystems(map, [systemId], 'wh');
        let newSelectOptions = [];
        let connectionOptions = [];

        for(let i = 0; i < systemConnections.length; i++){
            let connectionData = MapUtil.getDataByConnection(systemConnections[i]);

            // connectionId is required (must be stored)
            if(connectionData.id){
                // check whether "source" or "target" system is relevant for this connection
                // -> hint "source" === 'target' --> loop
                if(systemData.id !== connectionData.target){
                    let targetSystemData = MapUtil.getSystemData(mapId, connectionData.target);
                    if(targetSystemData){
                        // take target...
                        connectionOptions.push({
                            value: connectionData.id,
                            text: connectionData.targetAlias + ' - ' + targetSystemData.security
                        });
                    }
                }else if(systemData.id !== connectionData.source){
                    let sourceSystemData = MapUtil.getSystemData(mapId, connectionData.source);
                    if(sourceSystemData){
                        // take source...
                        connectionOptions.push({
                            value: connectionData.id,
                            text: connectionData.sourceAlias + ' - ' + sourceSystemData.security
                        });
                    }
                }
            }
        }

        if(connectionOptions.length > 0){
            newSelectOptions.push({ text: 'System', children: connectionOptions});
        }

        // add empty entry
        newSelectOptions.unshift({ value: null, text: ''});

        return newSelectOptions;
    };

    /**
     * check connectionIds for conflicts (multiple signatures -> same connection)
     * -> show "conflict" icon next to select
     */
    let checkConnectionConflicts = () => {
        setTimeout(function() {
            let connectionSelects = $('.' + config.sigTableConnectionClass + ' .editable');
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
    };

    /**
     * get all signature types that can exist for a given system
     * -> result is partially cached
     * @param systemData
     * @param systemTypeId
     * @param areaId
     * @param groupId
     * @returns {Array}
     */
    let getAllSignatureNames = function(systemData, systemTypeId, areaId, groupId){
        let newSelectOptions = [];
        let cacheKey = [systemTypeId, areaId, groupId].join('_');
        let newSelectOptionsCount = 0;

        // check for cached signature names
        if(sigNameCache.hasOwnProperty( cacheKey )){
            // cached signatures do not include static WHs!
            // -> ".slice(0)" creates copy
            newSelectOptions =  sigNameCache[cacheKey].slice(0);
            newSelectOptionsCount = sumSignaturesRecursive('children', newSelectOptions);
        }else{
            // get new Options ----------
            // get all possible "static" signature names by the selected groupId
            let tempSelectOptions = Util.getAllSignatureNames(systemTypeId, areaId, groupId);

            // format options into array with objects advantages: keep order, add more options (whs), use optgroup
            if(tempSelectOptions){
                let fixSelectOptions = [];
                for (let key in tempSelectOptions) {
                    if (
                        key > 0 &&
                        tempSelectOptions.hasOwnProperty(key)
                    ) {
                        newSelectOptionsCount++;
                        fixSelectOptions.push( {value: parseInt(key), text: tempSelectOptions[key] } );
                    }
                }

                if(newSelectOptionsCount > 0){
                    if(groupId === 5){
                        // "wormhole" selected => multiple <optgroup> available
                        newSelectOptions.push({ text: 'Wandering WH', children: fixSelectOptions});
                    }else{
                        newSelectOptions = fixSelectOptions;
                    }
                }
            }

            // wormhole (cached signatures)
            if( groupId === 5 ){

                // add possible frigate holes
                let frigateHoles = getFrigateHolesBySystem(areaId);
                let frigateWHData = [];
                for(let frigKey in frigateHoles){
                    if (
                        frigKey > 0 &&
                        frigateHoles.hasOwnProperty(frigKey)
                    ) {
                        newSelectOptionsCount++;
                        frigateWHData.push( {value: newSelectOptionsCount, text: frigateHoles[frigKey]} );
                    }
                }

                if(frigateWHData.length > 0){
                    newSelectOptions.push({ text: 'Frigate WH', children: frigateWHData});
                }

                // add possible incoming holes
                let incomingWHData = [];
                for(let incomingKey in Init.incomingWormholes){
                    if (
                        incomingKey > 0 &&
                        Init.incomingWormholes.hasOwnProperty(incomingKey)
                    ) {
                        newSelectOptionsCount++;
                        incomingWHData.push( {value: newSelectOptionsCount, text: Init.incomingWormholes[incomingKey]} );
                    }
                }

                if(incomingWHData.length > 0){
                    newSelectOptions.push({ text: 'Incoming WH', children: incomingWHData});
                }
            }else{
                // groups without "children" (optgroup) should be sorted by "value"
                // this is completely optional and not necessary!
                newSelectOptions = newSelectOptions.sortBy('text');
            }

            // update cache (clone array) -> further manipulation to this array, should not be cached
            sigNameCache[cacheKey] = newSelectOptions.slice(0);
        }

        // static wormholes (DO NOT CACHE) (not all C2 WHs have the same statics,...
        if( groupId === 5 ){
            // add static WH(s) for this system
            if(systemData.statics){
                let staticWHData = [];
                for(let i = 0; i < systemData.statics.length; i++){
                    let staticWHName = systemData.statics[i].name + ' - ' + systemData.statics[i].security;

                    newSelectOptionsCount++;
                    staticWHData.push( {value: newSelectOptionsCount, text: staticWHName} );
                }

                if(staticWHData.length > 0){
                    newSelectOptions.unshift({ text: 'Static WH', children: staticWHData});
                }
            }
        }

        // if selectOptions available -> add "empty" option as well
        if(newSelectOptionsCount > 0){
            newSelectOptions.unshift({ value: '0', text: ''});
        }

        return newSelectOptions;
    };

    /**
     * get all signature types that can exist for a system (jQuery obj)
     * @param systemElement
     * @param groupId
     * @returns {Array}
     */
    let getAllSignatureNamesBySystem = (systemElement, groupId) => {
        let systemTypeId = systemElement.data('typeId');
        let areaId = Util.getAreaIdBySecurity(systemElement.data('security'));
        let systemData = {statics: systemElement.data('statics')};
        return getAllSignatureNames(systemData, systemTypeId, areaId, groupId);
    };

    /**
     * recursive sum array.length for a given object key
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
     * -> sumSignaturesRecursive('count', obj) => 5;
     * @param key
     * @param obj
     * @returns {number}
     */
    let sumSignaturesRecursive = function(key, obj){
        let sum = 0;

        for (let prop in obj) {
            if (obj.hasOwnProperty(prop) && key === prop) {
                sum += obj[prop].length;
            }
            else if (Object.prototype.toString.call(obj[prop]) === '[object Object]') {
                sum += sumSignaturesRecursive(key, obj[prop]);
            }
        }

        return sum;
    };

    /**
     * get possible frig holes that could spawn in a system
     * filtered by "systemTypeId"
     * @param systemTypeId
     * @returns {{}}
     */
    let getFrigateHolesBySystem = function(systemTypeId){
        let signatureNames = {};

        if(Init.frigateWormholes[systemTypeId]){
            signatureNames =  Init.frigateWormholes[systemTypeId];
        }

        return signatureNames;
    };

    /**
     * deletes signature rows from signature table
     * @param tableApi
     * @param rows
     */
    let deleteSignatures = function(tableApi, rows){
        let deletedSignatures = 0;

        let moduleElement = $('.' + config.moduleTypeClass);
        let data = rows.data();
        let rowElements = rows.nodes().to$();
        let signatureCount = data.length;

        let signatureIds = [];
        for(let i = 0; i < data.length; i++){
            signatureIds.push(data[i].id);
        }

        let requestData = {
            signatureIds: signatureIds
        };

        // animation callback function
        let removeCallback = function(rowElement){
            // delete signature row
            tableApi.row(rowElement).remove().draw();

            deletedSignatures++;

            if(deletedSignatures === signatureCount){
                // all animations finished

                // update signature bar
                moduleElement.updateScannedSignaturesBar({showNotice: false});

                // update connection conflicts
                checkConnectionConflicts();

                Util.showNotify({title: 'Signature deleted', text: signatureCount + ' deleted', type: 'success'});
            }
        };

        $.ajax({
            type: 'POST',
            url: Init.path.deleteSignatureData,
            data: requestData,
            dataType: 'json'
        }).done(function(data){

            for(let j = 0; j < rowElements.length; j++){
                // removeRow
                $(rowElements[j]).toggleTableRow(removeCallback);
            }

        }).fail(function( jqXHR, status, error) {
            let reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': Delete signature', text: reason, type: 'warning'});
            $(document).setProgramStatus('problem');
        });
    };

    /**
     * adds a new row to signature Table
     * @param signatureTableApi
     * @param systemData
     * @param signatureData
     * @param animate
     * @returns {*}
     */
    let addSignatureRow = (signatureTableApi, systemData, signatureData, animate) => {
        let newRowElement = null;
        if(signatureTableApi){
            let newSignatureData = formatSignatureData(systemData, [signatureData], fullSignatureOptions);
            let newRowNode = signatureTableApi.row.add(newSignatureData.shift()).draw().nodes();
            newRowElement = newRowNode.to$();

            if(animate === true){
                newRowElement.hide();
                newRowElement.toggleTableRow(newRowElement => {
                    // make new row editable
                    newRowElement.makeEditable(signatureTableApi, systemData);

                    // update scan progress bar
                    newRowElement.parents('.' + config.moduleClass).updateScannedSignaturesBar({showNotice: true});
                });
            }else{
                newRowElement.makeEditable(signatureTableApi, systemData);
            }
        }

        return newRowElement;
    };

    /**
     * show/hides a table <tr> tag
     * @param callback
     */
    $.fn.toggleTableRow = function(callback){
        let rowElement = $(this);
        let cellElements = rowElement.children('td');
        let duration = 100;

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
                    // remove wrapper
                    $(animationElements).children().unwrap();

                    if(callback !== undefined){
                        callback(rowElement);
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
                            // remove wrapper
                            for(let i = 0; i < animationElements.length; i++){
                                let currentWrapper = $(animationElements[i]);
                                if(currentWrapper.children().length > 0){
                                    currentWrapper.children().unwrap();
                                }else{
                                    currentWrapper.parent().html( currentWrapper.html() );
                                }
                            }

                            if(callback !== undefined){
                                callback(rowElement);
                            }
                        }
                    });
                }
            });
        }
    };

    /**
     * draw a signature table with data
     * @param mapId
     * @param signatureData
     * @param systemData
     */
    $.fn.drawSignatureTable = function(mapId, signatureData, systemData){
        let moduleElement = $(this);

        // setup filter select in footer
        // column indexes that need a filter select
        let filterColumnIndexes = [2];

        // create new signature table ---------------------------------------------------------------------------------
        let table = $('<table>', {
            class: ['display', 'compact', 'nowrap', config.sigTableClass, config.sigTablePrimaryClass].join(' ')
        });

        // create table footer ----------------------------------------------------------------------------------------
        // get column count from default dataTable config
        let columnCount = $.fn.dataTable.defaults.columnDefs.length;
        let footerHtml = '<tfoot><tr>';
        for(let i = 0; i < columnCount; i++){
            footerHtml += '<td></td>';
        }
        footerHtml += '</tr></tfoot>';
        table.append(footerHtml);

        moduleElement.append(table);

        let dataTableOptions = {
            data: signatureData,
            drawCallback: function(settings){
                this.api().columns(filterColumnIndexes).every(function(){
                    let column = this;
                    let footerColumnElement = $(column.footer());
                    let filterSelect = footerColumnElement.find('.editable');

                    // update select values
                    filterSelect.editable('option', 'source', getColumnTableDataForFilter(column));
                });
            },
            initComplete: function (settings, json){

                this.api().columns(filterColumnIndexes).every(function(){
                    let column = this;
                    let headerLabel = $(column.header()).text();
                    let selectField = $('<a class="pf-editable ' +
                        config.moduleIcon + ' ' +
                        config.editableFilterElementClass +
                        '" href="#" data-type="select" data-name="' + headerLabel + '"></a>');

                    // add field to footer
                    selectField.appendTo( $(column.footer()).empty() );

                    selectField.editable({
                        emptytext: '<i class="fas fa-filter fa-fw"></i>',
                        onblur: 'submit',
                        title: 'filter',
                        showbuttons: false,
                        source: getColumnTableDataForFilter(column),
                        inputclass: config.editableFilterSelectPopoverClass
                    });

                    selectField.on('save', { column: column }, function(e, params) {
                        let val = $.fn.dataTable.util.escapeRegex( params.newValue );
                        e.data.column.search( val !== '0' ? '^' + val + '$' : '', true, false ).draw();
                    });
                });
            }
        };

        // create signature table and store the jquery object global for this module
        let signatureTable = table.dataTable(dataTableOptions);
        let signatureTableApi = signatureTable.api();
        setDataTableInstance(mapId, systemData.id, 'primary', signatureTableApi);

        // make Table editable
        signatureTable.makeEditable(signatureTableApi, systemData);

        moduleElement.updateScannedSignaturesBar({showNotice: true});
    };

    /**
     * get unique column data from column object for select filter options
     * @param column
     * @returns {{}}
     */
    let getColumnTableDataForFilter = function(column){
        // get all available options from column
        let source = {};
        column.data().unique().sort(function(a,b){
            // sort alphabetically
            let valA = a.filter.toLowerCase();
            let valB = b.filter.toLowerCase();

            if(valA < valB) return -1;
            if(valA > valB) return 1;
            return 0;
        }).each(function(callData){
            if(callData.filter){
                source[callData.filter] = callData.filter;
            }
        });

        // add empty option
        source[0] = '';

        return source;
    };

    /**
     * setup dataTable options for all signatureTables
     * @param systemData
     */
    let initSignatureDataTable = function(systemData){

        $.extend( true, $.fn.dataTable.defaults, {
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
                    data: 'name',
                    render: {
                        _: 'render'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        // update column tooltip
                        updateTooltip(cell, cellData.name);
                    }
                },{
                    targets: 2,
                    orderable: true,
                    searchable: true,
                    title: 'group',
                    type: 'html',
                    width: '50px',
                    data: 'group',
                    render: {
                        _: 'group',
                        sort: 'sort',
                        filter: 'filter'
                    }
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
                    orderable: false,
                    searchable: false,
                    className: [config.sigTableConnectionClass].join(' '),
                    title: 'leads to',
                    type: 'html',
                    width: '70px',
                    data: 'connection',
                    render: {
                        _: 'render'
                    }
                },{
                    targets: 6,
                    title: 'created',
                    width: '90px',
                    searchable: false,
                    className: ['text-right', config.sigTableCounterClass, config.sigTableCreatedCellClass, 'min-tablet-l'].join(' '),
                    data: 'created',
                    render: {
                        _: 'created',
                        sort: 'created'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        $(cell).initTimestampCounter();
                    }
                },{
                    targets: 7,
                    title: 'updated',
                    width: '90px',
                    searchable: false,
                    className: ['text-right', config.sigTableCounterClass, config.sigTableUpdatedCellClass, 'min-tablet-l'].join(' '),
                    data: 'updated',
                    render: {
                        _: 'updated',
                        sort: 'updated'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        $(cell).initTimestampCounter();

                        // highlight cell
                        let diff = Math.floor((new Date()).getTime()) - cellData.updated * 1000;

                        // age > 1 day
                        if( diff > 86400000){
                            $(cell).addClass('txt-color txt-color-warning');
                        }
                    }
                },{
                    targets: 8,
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: '10px',
                    class: 'pf-help text-center',
                    data: 'info',
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){

                        if(rowData.id > 0){

                            // add row tooltip
                            let tooltipData = {
                                created: rowData.created,
                                updated: rowData.updated
                            };

                            $(cell).addCharacterInfoTooltip( tooltipData );
                        }
                    }
                },{
                    targets: 9,
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
                        let tempTableElement = this;
                        let rowElement = $(cell).parents('tr');

                        switch(cellData.action){
                            case 'add':
                                // add new signature ------------------------------------------------------------------
                                $(cell).on('click', function(e) {
                                    // submit all fields within a table row
                                    let formFields = rowElement.find('.editable');

                                    // get the current "primary table" for insert row on ajax callback
                                    // -> important: in case of long response, target table might have changed...
                                    let moduleElement =  $(e.target).parents('.' + config.moduleClass);
                                    let primaryTable = moduleElement.find('.' + config.sigTablePrimaryClass);
                                    let secondaryTable = moduleElement.find('.' + config.sigTableSecondaryClass);

                                    // the "hide" makes sure to take care about open editable fields (e.g. description)
                                    // otherwise, changes would not be submitted in this field (not necessary)
                                    formFields.editable('hide');

                                    // submit all xEditable fields
                                    formFields.editable('submit', {
                                        url: Init.path.saveSignatureData,
                                        ajaxOptions: {
                                            dataType: 'json', //assuming json response
                                            beforeSend: function( xhr, settings ){
                                                lockSignatureTable();
                                            },
                                            context: {
                                                primaryTable: primaryTable,
                                                secondaryTable: secondaryTable
                                            }
                                        },
                                        data: {
                                            systemId: systemData.id, // additional data to submit
                                            pk: 0 // new data no primary key
                                        },
                                        error: $.fn.editable.defaults.error, // user default xEditable error function
                                        success: function (data, editableConfig) {
                                            let context = editableConfig.ajaxOptions.context;
                                            let primaryTableApi = context.primaryTable.DataTable();
                                            let secondaryTableApi = context.secondaryTable.DataTable();

                                            unlockSignatureTable(false);

                                            let newRowElement = addSignatureRow(primaryTableApi, systemData, data.signatures[0], true);

                                            if(newRowElement){
                                                // highlight
                                                newRowElement.pulseTableRow('added');

                                                // prepare "add signature" table for new entry -> reset -------------------
                                                let signatureData = formatSignatureData(systemData, [emptySignatureData], emptySignatureOptions);
                                                let newAddRowElement = secondaryTableApi.clear().row.add(signatureData.shift()).draw().nodes();

                                                newAddRowElement.to$().makeEditable(secondaryTableApi, systemData);

                                                Util.showNotify({
                                                    title: 'Signature added',
                                                    text: 'Name: ' + data.name,
                                                    type: 'success'
                                                });
                                            }
                                        }
                                    });
                                });
                                break;
                            case 'delete':
                                // delete signature -------------------------------------------------------------------
                                let confirmationSettings = {
                                    container: 'body',
                                    placement: 'left',
                                    btnCancelClass: 'btn btn-sm btn-default',
                                    btnCancelLabel: 'cancel',
                                    btnCancelIcon: 'fas fa-fw fa-ban',
                                    title: 'delete signature',
                                    btnOkClass: 'btn btn-sm btn-danger',
                                    btnOkLabel: 'delete',
                                    btnOkIcon: 'fas fa-fw fa-times',
                                    onConfirm: function(e, target){
                                        // top scroll to top
                                        e.preventDefault();

                                        let tableApi = tempTableElement.DataTable();

                                        let deleteRowElement = $(target).parents('tr');
                                        let row = tableApi.rows(deleteRowElement);
                                        deleteSignatures(tableApi, row);
                                    }
                                };

                                // init confirmation dialog
                                $(cell).confirmation(confirmationSettings);

                                break;
                        }

                    }
                }
            ]
        });
    };

    /**
     * set module observer and look for relevant signature data to update
     * @param moduleElement
     * @param systemData
     */
    let setModuleObserver = function(moduleElement, systemData){
        let tablePrimaryElement = moduleElement.find('.' + config.sigTablePrimaryClass);
        let signatureTableApi = getDataTableInstanceByModuleElement(moduleElement, 'primary');

        $(document).off('pf:updateSystemSignatureModule').on('pf:updateSystemSignatureModule', function(e, data){
            if(data.signatures){
                moduleElement.updateSignatureTable(data.signatures, true);
            }
        });

        // set multi row select ---------------------------------------------------------------------------------------
        tablePrimaryElement.on('click', 'tr', {moduleElement: moduleElement}, function(e){
            if(e.ctrlKey) {
                $(this).toggleClass('selected');

                // check delete button
                checkDeleteSignaturesButton(e.data.moduleElement);
            }
        });

        // draw event for signature table -----------------------------------------------------------------------------
        signatureTableApi.on('draw.dt', {moduleElement: moduleElement}, function(e, settings){
            // check delete button
            checkDeleteSignaturesButton(e.data.moduleElement);
        });

        // destroy dataTables event -----------------------------------------------------------------------------------
        tablePrimaryElement.on('destroy.dt', function(){
            $(this).destroyTimestampCounter();
        });
        signatureTableApi.on('destroy.dt', function(){
            $(this).destroyTimestampCounter();
        });

        // event listener for global "paste" signatures into the page -------------------------------------------------
        moduleElement.on('pf:updateSystemSignatureModuleByClipboard', function(e, clipboard){
            // check "lazy update" toggle button
            let signatureOptions = {
                deleteOld: moduleElement.find('.' + config.sigTableLazyToggleButtonClass).is(':checked') ? 1 : 0
            };

            $(this).updateSignatureTableByClipboard(systemData, clipboard, signatureOptions);
        });
    };

    /**
     * init callback
     * @param moduleElement
     * @param mapId
     * @param connectionData
     */
    let initModule = (moduleElement, mapId, systemData) => {
        unlockSignatureTable(true);
    };

    /**
     * get module element
     * @param parentElement
     * @param mapId
     * @param systemData
     * @returns {*|jQuery|HTMLElement}
     */
    let getModule = function(parentElement, mapId, systemData){
        // create new module container
        let moduleElement = $('<div>').append(
            $('<div>', {
                class: config.moduleHeadClass
            }).append(
                $('<h5>', {
                    class: config.moduleHandlerClass
                }),
                $('<h5>', {
                    text: 'Signatures'
                })
            )
        );

        moduleElement.data('mapId', mapId);
        moduleElement.data('systemId', systemData.id);

        // init dataTables
        initSignatureDataTable(systemData);

        // draw "new signature" add table -----------------------------------------------------------------------------

        moduleElement.drawSignatureTableToolbar(mapId, systemData);

        // request signature data for system --------------------------------------------------------------------------

        let requestData = {
            systemIds: [systemData.id]
        };

        $.ajax({
            type: 'POST',
            url: Init.path.getSignatures,
            data: requestData,
            dataType: 'json',
            context: {
                mapId: mapId,
                systemData: systemData
            }
        }).done(function(signatureData){
            let signatureTableData = formatSignatureData(this.systemData, signatureData, fullSignatureOptions);

            // draw signature table
            moduleElement.drawSignatureTable(this.mapId, signatureTableData, this.systemData);

            // set module observer
            setModuleObserver(moduleElement, this.systemData);
        }).fail(function( jqXHR, status, error) {
            let reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': Get signatures', text: reason, type: 'warning'});
            $(document).setProgramStatus('problem');
        });

        return moduleElement;
    };

    /**
     * before module reDraw callback
     */
    let beforeReDraw = () => {
        // disable update
        lockSignatureTable();
    };

    /**
     * before module destroy callback
     */
    let beforeDestroy = (moduleElement) => {
        // Destroying the data tables throws
        // -> safety remove  all dataTables
        let mapId = moduleElement.data('mapId');
        let systemId = moduleElement.data('systemId');
        deleteDataTableInstance(mapId, systemId, 'primary');
        deleteDataTableInstance(mapId, systemId, 'secondary');
    };

    return {
        config: config,
        getModule: getModule,
        initModule: initModule,
        beforeReDraw: beforeReDraw,
        beforeDestroy: beforeDestroy,
        getAllSignatureNamesBySystem: getAllSignatureNamesBySystem
    };

});
