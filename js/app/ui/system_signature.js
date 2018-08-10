/**
 *  System signature module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'mustache',
    'bootbox',
    'app/map/map',
    'app/map/util',
    'app/ui/form_element'
], ($, Init, Util, Mustache, bootbox, Map, MapUtil, FormElement) => {
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

        // headline toolbar
        moduleHeadlineIconClass: 'pf-module-icon-button',                       // class for toolbar icons in the head
        moduleHeadlineIconAddClass: 'pf-module-icon-button-add',                // class for "add signature" icon
        moduleHeadlineIconReaderClass: 'pf-module-icon-button-reader',          // class for "signature reader" icon
        moduleHeadlineIconLazyClass: 'pf-module-icon-button-lazy',              // class for "lazy delete" toggle icon

        // tables
        tableToolsActionClass: 'pf-table-tools-action',                         // class for table toolbar action

        // signature progress bar
        signatureScannedProgressBarClass: 'pf-system-progress-scanned',         // class for signature progress bar

        // table toolbar
        sigTableClearButtonClass: 'pf-sig-table-clear-button',                  // class for "clear" signatures button

        // signature table
        sigTableClass: 'pf-sig-table',                                          // Table class for all Signature Tables
        sigTablePrimaryClass: 'pf-sig-table-primary',                           // class for primary sig table
        sigTableSecondaryClass: 'pf-sig-table-secondary',                       // class for secondary sig table
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
        editableDescriptionInputClass: 'pf-editable-description',               // class for "description" textarea
        editableUnknownInputClass: 'pf-editable-unknown',                       // class for input fields (e.g. checkboxes) with "unknown" status

        signatureGroupsLabels: Util.getSignatureGroupInfo('label'),
        signatureGroupsNames: Util.getSignatureGroupInfo('name')
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
     * get module toolbar element
     * @returns {jQuery}
     */
    let getHeadlineToolbar = () => {
        let headlineToolbar  = $('<h5>', {
            class: 'pull-right'
        }).append(
            $('<span>', {
                class: 'progress-label-right',
                text: '0%'
            }),
            $('<i>', {
                class: ['fas', 'fa-fw', 'fa-plus',
                    config.moduleHeadlineIconClass,
                    config.moduleHeadlineIconAddClass].join(' '),
                title: 'add'
            }).attr('data-toggle', 'tooltip'),
            $('<i>', {
                class: ['fas', 'fa-fw', 'fa-paste',
                    config.moduleHeadlineIconClass,
                    config.moduleHeadlineIconReaderClass].join(' '),
                title: 'signature reader'
            }).attr('data-toggle', 'tooltip'),
            $('<i>', {
                class: ['fas', 'fa-fw', 'fa-exchange-alt',
                    config.moduleHeadlineIconClass,
                    config.moduleHeadlineIconLazyClass].join(' '),
                title: 'lazy \'delete\' signatures'
            }).attr('data-toggle', 'tooltip')
        );

        headlineToolbar.find('[data-toggle="tooltip"]').tooltip({
            container: 'body'
        });

        return headlineToolbar;
    };

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
    let getTableData = tableApi => {
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
    let updateSignatureCell = (tableApi, rowElement, cellIndex, data) => {
        let rowIndex = tableApi.row(rowElement).index();
        let updateCell = tableApi.cell( rowIndex, cellIndex );
        let updateCellElement = updateCell.nodes().to$();

        if(cellIndex === 7){
            // clear existing counter interval
            clearInterval( updateCellElement.data('interval') );
        }

        // set new value
        updateCell.data(data).draw();

        if(cellIndex === 7){
            updateCellElement.initTimestampCounter();
        }
    };

    /**
     * update trigger function for this module
     * compare data and update module
     * @param moduleElement
     * @param systemData
     */
    let updateModule = (moduleElement, systemData) => {

        if(systemData.signatures){
            updateSignatureTable(moduleElement, systemData.signatures, true);
        }

        moduleElement.hideLoadingAnimation();
    };

    /**
     * Updates a signature table, changes all signatures where name matches
     * add all new signatures as a row
     * @param moduleElement
     * @param signatureDataOrig
     * @param deleteOutdatedSignatures -> set to "true" if signatures should be deleted that are not included in "signatureData"
     */
    let updateSignatureTable = (moduleElement, signatureDataOrig, deleteOutdatedSignatures) => {
        // check if table update is allowed
        if(disableTableUpdate === true){
            return;
        }

        // clone signature array because of further manipulation
        let signatureData = $.extend([], signatureDataOrig);

        // disable update until function is ready;
        lockSignatureTable();

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
    let lockSignatureTable = () => {
        disableTableUpdate = true;
    };

    /**
     * unlock system signature table from been locked
     * -> make table "update-able" again
     * @param instant
     */
    let unlockSignatureTable = instant =>{
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
        let progressBarLabel = moduleElement.find('.progress-label-right');

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
                // unlock table for update
                unlockSignatureTable(true);
                // updates table with new/updated signature information
                updateSignatureTable(this.moduleElement, responseData.signatures, false);
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
    let parseSignatureString = (systemData, clipboard) => {
        let signatureData = [];

        if(clipboard.length){
            let signatureRows = clipboard.split(/\r\n|\r|\n/g);
            let signatureGroupOptions = config.signatureGroupsNames;
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
    let formatSignatureData = (systemData, signatureData, options) => {
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
                    sort: config.signatureGroupsLabels[data.groupId],
                    filter: config.signatureGroupsLabels[data.groupId]
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

                // set disabled if group is not wormhole
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
     * get all rows of a table
     * @param tableApi
     * @returns {*}
     */
    let getRows = tableApi => {
        let rows = tableApi.rows();
        return rows;
    };

    /**
     * get all selected rows of a table
     * @param tableApi
     * @returns {*}
     */
    let getSelectedRows = tableApi => {
        let selectedRows = tableApi.rows('.selected');
        return selectedRows;
    };

    /**
     * check the "delete signature" button. show/hide the button if a signature is selected
     * @param moduleElement
     */
    let checkDeleteSignaturesButton = tableApi => {
        let selectedRows = getSelectedRows(tableApi);
        let selectedRowCount = selectedRows.data().length;
        let clearButton = tableApi.button('tableTools', 'delete:name').node();

        if(selectedRowCount > 0){
            let allRows = getRows(tableApi);
            let rowCount = allRows.data().length;

            let countText = selectedRowCount;
            if(selectedRowCount >= rowCount){
                countText = 'all';
            }
            clearButton.find('i+span').text(countText);

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
     * @param moduleElement
     * @param mapId
     * @param systemData
     */
    let drawSignatureTableNew = (moduleElement, mapId, systemData) => {
        // add toolbar action for table -------------------------------------------------------------------------------
        let tableToolbarAction = $('<div>', {
            class: config.tableToolsActionClass
        });

        // create "empty table for new signature
        let table = $('<table>', {
            class: ['stripe', 'row-border', 'compact', 'nowrap', config.sigTableClass, config.sigTableSecondaryClass].join(' ')
        });

        tableToolbarAction.append(table);

        moduleElement.find('.' + config.moduleHeadClass).after(tableToolbarAction);

        let signatureData = formatSignatureData(systemData, [emptySignatureData], emptySignatureOptions);
        let signatureTable = table.dataTable( {
            data: signatureData,
            paging: false,
            info: false,
            searching: false,
            tabIndex: -1
        } );
        let signatureTableApi = signatureTable.api();

        setDataTableInstance(mapId, systemData.id, 'secondary', signatureTableApi);

        table.makeEditable(signatureTableApi, systemData);
    };

    /**
     * Update/set tooltip for an element
     * @param element
     * @param title
     */
    let updateTooltip = (element, title) => {
        $(element).attr('data-container', 'body').attr('title', title.toUpperCase()).tooltip('fixTitle')
            .tooltip('setContent');
    };

    /**
     * helper function - jump to "next" editable field on save
     * @param field
     * @param selector
     * @returns {*|jQuery|HTMLElement}
     */
    let getNextEditableField = (field, selector) => {
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
     * helper function - get the next editable field in next table column
     * @param fields
     */
    let openNextEditDialogOnSave = fields => {
        fields.on('save', function(e, params){
            let currentField = $(this);
            let nextField = getNextEditableField(currentField);
            nextField.editable('show');

            setTimeout(() => {
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

        /**
         * add map/system specific data for each editable field in the sig-table
         * @param params
         * @returns {*}
         */
        let modifyFieldParamsOnSend = params => {
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
                $(this).text($.trim( value.substr(0, 3) ).toLowerCase());
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
                let availableTypes = config.signatureGroupsLabels;

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

                if(
                    newValue > 0 &&
                    newSelectOptions.length > 0
                ){
                    typeSelect.editable('enable');
                }else{
                    typeSelect.editable('disable');
                }

                typeSelect.editable('setValue', null);

                // find "connection" select (same row) and change "enabled" flag
                let connectionSelect = getNextEditableField(signatureTypeField, '.' + config.sigTableConnectionClass);
                if(newValue === 5){
                    // wormhole
                    connectionSelect.editable('enable');
                }else{
                    checkConnectionConflicts();
                    connectionSelect.editable('disable');
                }

                connectionSelect.editable('setValue', null);

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
            display: function(value, sourceData){
                let selected = $.fn.editableutils.itemsByValue(value, sourceData);
                if(selected.length && selected[0].text.length){
                    $(this).html(FormElement.formatSignatureTypeSelectionData({text: selected[0].text}));
                }else{
                    $(this).empty();
                }
            },
            source: function(){
                let signatureTypeField = $(this);

                let systemTypeId = parseInt( signatureTypeField.attr('data-systemTypeId') );
                let areaId = parseInt( signatureTypeField.attr('data-areaid') );
                let groupId = parseInt( signatureTypeField.attr('data-groupId') );
                let availableSigs = getAllSignatureNames(systemData, systemTypeId, areaId, groupId);

                return availableSigs;
            },
            success: function(response, newValue){
                let signatureTypeField = $(this);
                let rowElement = signatureTypeField.parents('tr');

                if(response){
                    let newRowData = response.signatures[0];
                    // update "updated" cell
                    updateSignatureCell(tableApi, rowElement, 7, newRowData.updated);
                }else{
                    // "add new" signature -> set "+" focus for keyboard control
                    setTimeout(() => {
                        rowElement.find('.pf-table-action-cell')[0].focus();
                    }, 50);
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
            prepend: [{value: '0', text: ''}],
            display: function(value, sourceData) {
                let selected = $.fn.editableutils.itemsByValue(value, sourceData);
                if(selected.length && selected[0].text.length){
                    let errorIcon = '<i class="fas fa-exclamation-triangle txt-color txt-color-danger hide"></i>&nbsp;';
                    $(this).html(FormElement.formatSignatureConnectionSelectionData({text: selected[0].text})).prepend(errorIcon);
                }else{
                    $(this).empty() ;
                }
            },
            source: function(a,b){
                let activeMap = Util.getMapModule().getActiveMap();
                let mapId = activeMap.data('id');

                let availableConnections = getSignatureConnectionOptions(mapId, systemData);

                return availableConnections;
            },
            success: function(response, newValue){
                let signatureConnectionField = $(this);
                let rowElement = signatureConnectionField.parents('tr');

                if(response){
                    let newRowData = response.signatures[0];

                    // update "updated" cell
                    updateSignatureCell(tableApi, rowElement, 7, newRowData.updated);
                }else{
                    // "add new" signature -> set "+" focus for keyboard control
                    setTimeout(() => {
                        rowElement.find('.pf-table-action-cell')[0].focus();
                    }, 50);
                }
            }
        });

        sigGroupFields.on('shown', function(e, editable){
            let inputField = editable.input.$input;
            inputField.addClass('pf-select2').initSignatureGroupSelect();
        });

        sigTypeFields.on('shown', function(e, editable){
            // destroy possible open popovers (e.g. wormhole types)
            $(this).destroyPopover(true);

            let inputField = editable.input.$input;
            let hasOptGroups = inputField.has('optgroup').length > 0;
            inputField.addClass('pf-select2').initSignatureTypeSelect({}, hasOptGroups);
        });

        sigConnectionFields.on('shown', function(e, editable){
            let inputField = editable.input.$input;
            inputField.addClass('pf-select2').initSignatureConnectionSelect();
        });

        // open even
        sigDescriptionFields.on('shown', function(e, editable){
            // enlarge the tools-action container because the tables gets bigger
            tableElement.parents('.' + config.tableToolsActionClass).css( 'height', '+=35px' );
        });

        // close event
        sigDescriptionFields.on('hidden', function(e, editable){
            // enlarge the tools-action container because the tables gets bigger
            tableElement.parents('.' + config.tableToolsActionClass).css( 'height', '-=35px' );
        });

        // save events
        sigConnectionFields.on('save', function(e, editable){
            checkConnectionConflicts();
        });

        $().add(sigNameFields).add(sigGroupFields).add(sigTypeFields)
            .add(sigDescriptionFields).add(sigConnectionFields).on('hidden', function(e, editable) {
                // re-focus element on close (keyboard navigation)
                this.focus();
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
    let getAllSignatureNames = (systemData, systemTypeId, areaId, groupId) => {
        let newSelectOptions = [];
        let cacheKey = [systemTypeId, areaId, groupId].join('_');
        let newSelectOptionsCount = 0;

        // check for cached signature names
        if(sigNameCache.hasOwnProperty( cacheKey )){
            // cached signatures do not include static WHs!
            // -> ".slice(0)" creates copy
            newSelectOptions =  sigNameCache[cacheKey].slice(0);
            newSelectOptionsCount = getOptionsCount('children', newSelectOptions);
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
                        fixSelectOptions.push({value: parseInt(key), text: tempSelectOptions[key]});
                    }
                }

                if(newSelectOptionsCount > 0){
                    if(groupId === 5){
                        // "wormhole" selected => multiple <optgroup> available
                        newSelectOptions.push({ text: 'Wandering', children: fixSelectOptions});
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
                    newSelectOptions.push({ text: 'Frigate', children: frigateWHData});
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
                    newSelectOptions.push({ text: 'Incoming', children: incomingWHData});
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
                for(let wormholeName of systemData.statics){
                    let wormholeData = Object.assign({}, Init.wormholes[wormholeName]);
                    let staticWHName = wormholeData.name + ' - ' + wormholeData.security;

                    newSelectOptionsCount++;
                    staticWHData.push( {value: newSelectOptionsCount, text: staticWHName} );
                }

                if(staticWHData.length > 0){
                    newSelectOptions.unshift({ text: 'Static', children: staticWHData});
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
    let getOptionsCount = (key, obj) => {
        let sum = 0;
        for(let entry of obj){
            if(entry.hasOwnProperty(key)){
                sum += entry[key].length;
            }else{
                sum++;
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
    let getFrigateHolesBySystem = systemTypeId => {
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
    let deleteSignatures = (tableApi, rows) => {
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
     * get unique column data from column object for select filter options
     * @param column
     * @returns {{}}
     */
    /* currently not needet but could be helpful one day
    let getColumnTableDataForFilter = column => {
        // get all available options from column
        let source = {};
        column.data().unique().sort((a,b) => {
            // sort alphabetically
            let valA = a.filter.toLowerCase();
            let valB = b.filter.toLowerCase();

            if(valA < valB) return -1;
            if(valA > valB) return 1;
            return 0;
        }).each(callData => {
            if(callData.filter){
                source[callData.filter] = callData.filter;
            }
        });

        // add empty option
        source[0] = '';

        return source;
    };*/

    /**
     * init table filter button "group" column
     * @param tableApi
     */
    let initGroupFilterButton = tableApi => {
        let characterId = Util.getCurrentCharacterId();

        let searchGroupColumn = (tableApi, newValue, sourceOptions) => {
            let column = tableApi.column('group:name');
            let pattern = '';
            if(newValue.length <= sourceOptions.length){
                // all options selected + "prepend" option
                pattern = newValue.map(val => val !== '0' ? $.fn.dataTable.util.escapeRegex(val) : '^$').join('|');
            }
            column.search(pattern, true, false).draw();
        };

        let promiseStore = MapUtil.getLocaleData('character', Util.getCurrentCharacterId());
        promiseStore.then(data => {
            let filterButton = tableApi.button('tableTools', 'filterGroup:name').node();
            let prependOptions = [{value: '0', text: 'unknown'}];
            let sourceOptions = [];
            let selectedValues = [];

            // format group filter options
            let groups = Object.assign({}, config.signatureGroupsLabels);
            for(let [value, label] of Object.entries(groups)){
                if(label.length){
                    sourceOptions.push({value: label, text: label});
                }
            }

            if(data && data.filterSignatureGroups && data.filterSignatureGroups.length){
                // select local stored values
                selectedValues = data.filterSignatureGroups;
            }else{
                // no default group filter options -> show all
                selectedValues = sourceOptions.map(option => option.text);
                selectedValues.unshift('0');
            }

            filterButton.editable({
                mode: 'popup',
                type: 'checklist',
                showbuttons: false,
                onblur: 'submit',
                highlight: false,
                title: 'filter groups',
                value: selectedValues,
                source: sourceOptions,
                prepend: prependOptions,
                inputclass: config.editableUnknownInputClass,
                display: function(value, sourceData){
                    // update filter button label
                    let html = '<i class="fa fa-filter"></i>group';
                    let allSelected = value.length >= (sourceOptions.length + prependOptions.length);
                    if( !allSelected ){
                        html += '&nbsp;(' + value.length + ')';
                    }
                    $(this).toggleClass('active', !allSelected).html(html);
                }
            });

            filterButton.on('save', {tableApi: tableApi, sourceOptions: sourceOptions}, function(e, params){
                // store values local -> IndexDB
                MapUtil.storeLocaleCharacterData('filterSignatureGroups', params.newValue);

                searchGroupColumn(e.data.tableApi, params.newValue, e.data.sourceOptions);
            });

            // set initial search string -> even if table ist currently empty
            searchGroupColumn(tableApi, selectedValues, sourceOptions);
        });
    };

    /**
     * draw empty signature table
     * @param moduleElement
     * @param mapId
     * @param systemData
     */
    let drawSignatureTable = (moduleElement, mapId, systemData) => {

        let table = $('<table>', {
            class: ['display', 'compact', 'nowrap', config.sigTableClass, config.sigTablePrimaryClass].join(' ')
        });

        moduleElement.append(table);

        let dataTableOptions = {
            tabIndex: -1,
            dom: '<"row"<"col-xs-3"l><"col-xs-5"B><"col-xs-4"f>>' +
                '<"row"<"col-xs-12"tr>>' +
                '<"row"<"col-xs-5"i><"col-xs-7"p>>',
            buttons: {
                name: 'tableTools',
                buttons: [
                    {
                        name: 'filterGroup',
                        className: config.moduleHeadlineIconClass,
                        text: '' // set by js (xEditable)
                    },
                    {
                        name: 'selectAll',
                        className: config.moduleHeadlineIconClass,
                        text: '<i class="fa fa-check-double"></i>select all',
                        action: function(e, tableApi, node, conf){
                            let allRows = getRows(tableApi);
                            let selectedRows = getSelectedRows(tableApi);
                            let allRowElements = allRows.nodes().to$();

                            if(allRows.data().length === selectedRows.data().length){
                                allRowElements.removeClass('selected');
                            }else{
                                allRowElements.addClass('selected');
                            }

                            // check delete button
                            checkDeleteSignaturesButton(tableApi);
                        }
                    },
                    {
                        name: 'delete',
                        className: [config.moduleHeadlineIconClass, config.sigTableClearButtonClass].join(' '),
                        text: '<i class="fa fa-trash"></i>delete&nbsp;(<span>0</span>)',
                        action: function(e, tableApi, node, conf){
                            let selectedRows = getSelectedRows(tableApi);
                            bootbox.confirm('Delete ' + selectedRows.data().length + ' signature?', function(result){
                                if(result){
                                    deleteSignatures(tableApi, selectedRows);
                                }
                            });
                        }
                    }
                ]
            },
            initComplete: function (settings, json){
                let tableApi = this.api();
                initGroupFilterButton(tableApi);
            }
        };

        // create signature table and store the jquery object global for this module
        let signatureTable = table.dataTable(dataTableOptions);
        let signatureTableApi = signatureTable.api();
        setDataTableInstance(mapId, systemData.id, 'primary', signatureTableApi);
    };

    /**
     * setup dataTable options for all signatureTables
     * @param systemData
     */
    let initSignatureDataTable = systemData => {

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
                    name: 'status',
                    orderable: true,
                    searchable: false,
                    title: '',
                    width: 2,
                    class: ['text-center', 'min-tablet-l'].join(' '),
                    data: 'status',
                    type: 'html',
                    render: {
                        _: 'status',
                        sort: 'status_sort'
                    }
                },{
                    targets: 1,
                    name: 'id',
                    orderable: true,
                    searchable: true,
                    title: 'id',
                    type: 'html',
                    width: 15,
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
                    name: 'group',
                    orderable: true,
                    searchable: true,
                    title: 'group',
                    type: 'html',
                    width: 40,
                    data: 'group',
                    render: {
                        _: 'group',
                        sort: 'sort',
                        filter: 'filter'
                    }
                },{
                    targets: 3,
                    name: 'type',
                    orderable: false,
                    searchable: false,
                    title: 'type',
                    type: 'html',
                    width: 180,
                    data: 'type'
                },{
                    targets: 4,
                    name: 'description',
                    orderable: false,
                    searchable: false,
                    title: 'description',
                    type: 'html',
                    data: 'description'
                },{
                    targets: 5,
                    name: 'connection',
                    orderable: false,
                    searchable: false,
                    className: [config.sigTableConnectionClass].join(' '),
                    title: 'leads to',
                    type: 'html',
                    width: 70,
                    data: 'connection',
                    render: {
                        _: 'render'
                    }
                },{
                    targets: 6,
                    name: 'created',
                    title: 'created',
                    width: 90,
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
                    name: 'updated',
                    title: 'updated',
                    width: 90,
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
                    name: 'info',
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: 10,
                    class: ['text-center', Util.config.helpClass].join(' '),
                    data: 'info',
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        if(rowData.id > 0){
                            let tooltipData = {
                                created: rowData.created,
                                updated: rowData.updated
                            };

                            $(cell).addCharacterInfoTooltip( tooltipData );
                        }
                    }
                },{
                    targets: 9,
                    name: 'action',
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: 10,
                    class: ['text-center', config.sigTableActionCellClass].join(' '),
                    data: 'action',
                    render: {
                        _: 'button',
                        sort: 'action'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tempTableElement = this;
                        let rowElement = $(cell).parents('tr');

                        $(cell).attr('tabindex', 0).on('keydown', function(e){
                            e.stopPropagation();
                            if(e.which === 13){
                                $(this).trigger('click');
                            }
                        });

                        switch(cellData.action){
                            case 'add':
                                // add new signature ------------------------------------------------------------------
                                $(cell).on('click', function(e) {
                                    e.stopPropagation();
                                    e.preventDefault();

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
     * open xEditable input field in "new Signature" table
     * @param moduleElement
     */
    let focusNewSignatureEditableField = moduleElement => {
        let secondaryTable = moduleElement.find('.' + config.sigTableSecondaryClass);
        secondaryTable.find('.' + config.sigTableEditSigNameInput).editable('show');
    };

    /**
     * set module observer and look for relevant signature data to update
     * @param moduleElement
     * @param systemData
     */
    let setModuleObserver = (moduleElement, systemData) => {
        let primaryTable = moduleElement.find('.' + config.sigTablePrimaryClass);
        let primaryTableApi = getDataTableInstanceByModuleElement(moduleElement, 'primary');

        // add signature toggle ---------------------------------------------------------------------------------------
        let toggleAddSignature = (show = 'auto') => {
            let button = moduleElement.find('.' + config.moduleHeadlineIconAddClass);
            let toolsElement = moduleElement.find('.' + config.tableToolsActionClass);
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
                    complete: function(){
                        focusNewSignatureEditableField(moduleElement);
                    }
                });
            }else if(toolsElement.is(':visible') && show){
                // still visible -> no animation
                focusNewSignatureEditableField(moduleElement);
            }
        };

        moduleElement.find('.' + config.moduleHeadlineIconAddClass).on('click', function(e){
            toggleAddSignature('auto');
        });

        moduleElement.on('pf:showSystemSignatureModuleAddNew', function(e){
            toggleAddSignature(true);
        });

        // signature reader dialog ------------------------------------------------------------------------------------
        moduleElement.find('.' + config.moduleHeadlineIconReaderClass).on('click', function(e) {
            moduleElement.showSignatureReaderDialog(systemData);
        });

        // "lazy update" toggle ---------------------------------------------------------------------------------------
        moduleElement.find('.' + config.moduleHeadlineIconLazyClass).on('click', function(e) {
            let button = $(this);
            button.toggleClass('active');
        });

        // set multi row select ---------------------------------------------------------------------------------------
        primaryTable.on('click', 'tr', {tableApi: primaryTableApi}, function(e){
            if(e.ctrlKey) {
                $(this).toggleClass('selected');

                // check delete button
                checkDeleteSignaturesButton(e.data.tableApi);
            }
        });

        // draw event for signature table -----------------------------------------------------------------------------
        primaryTableApi.on('draw.dt', function(e, settings){
            // check delete button
            let tableApi = $(this).dataTable().api();
            checkDeleteSignaturesButton(tableApi);
        });

        // destroy dataTables event -----------------------------------------------------------------------------------
        primaryTable.on('destroy.dt', function(){
            $(this).destroyTimestampCounter();
        });
        primaryTableApi.on('destroy.dt', function(){
            $(this).destroyTimestampCounter();
        });

        // event listener for global "paste" signatures into the page -------------------------------------------------
        moduleElement.on('pf:updateSystemSignatureModuleByClipboard', function(e, clipboard){
            // check "lazy update" toggle button
            let signatureOptions = {
                deleteOld: moduleElement.find('.' + config.moduleHeadlineIconLazyClass).hasClass('active') ? 1 : 0
            };

            $(this).updateSignatureTableByClipboard(systemData, clipboard, signatureOptions);
        });

        // signature cell - "type" popover ----------------------------------------------------------------------------
        moduleElement.find('.' + config.sigTableClass).hoverIntent({
            over: function(e){
                let staticWormholeElement = $(this);
                let wormholeName = staticWormholeElement.attr('data-name');
                let wormholeData =  Util.getObjVal(Init, 'wormholes.' + wormholeName);
                if(wormholeData){
                    staticWormholeElement.addWormholeInfoTooltip(wormholeData, {
                        trigger: 'manual',
                        placement: 'top',
                        show: true
                    });
                }
            },
            out: function(e){
                $(this).destroyPopover();
            },
            selector: '.editable-click:not(.editable-open) span[class^="pf-system-sec-"]'
        });
    };

    /**
     * init callback
     * @param moduleElement
     * @param mapId
     * @param systemData
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
                }),
                getHeadlineToolbar()
            )
        );

        // scanned signatures progress bar ----------------------------------------------------------------------------
        requirejs(['text!templates/form/progress.html', 'mustache'], (template, Mustache) => {
            let data = {
                label: true,
                wrapperClass: config.signatureScannedProgressBarClass,
                class: ['progress-bar-success'].join(' '),
                percent: 0
            };

            let content = Mustache.render(template, data);

            moduleElement.find('.' + config.moduleHeadClass).append(content);
        });



        moduleElement.data('mapId', mapId);
        moduleElement.data('systemId', systemData.id);

        moduleElement.showLoadingAnimation();

        // init dataTables
        initSignatureDataTable(systemData);

        // draw "new signature" add table
        drawSignatureTableNew(moduleElement, mapId, systemData);

        // draw signature table
        drawSignatureTable(moduleElement, mapId, systemData);

        // set module observer
        setModuleObserver(moduleElement, systemData);

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
        updateModule: updateModule,
        beforeDestroy: beforeDestroy,
        getAllSignatureNamesBySystem: getAllSignatureNamesBySystem
    };

});
