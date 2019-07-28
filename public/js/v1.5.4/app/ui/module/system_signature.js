/**
 * System signature module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox',
    'app/counter',
    'app/map/map',
    'app/map/util',
    'app/ui/form_element'
], ($, Init, Util, bootbox, Counter, Map, MapUtil, FormElement) => {
    'use strict';

    let config = {
        // module info
        modulePosition: 4,
        moduleName: 'systemSignature',
        moduleHeadClass: 'pf-module-head',                                      // class for module header
        moduleHandlerClass: 'pf-module-handler-drag',                           // class for "drag" handler

        // system signature module
        moduleTypeClass: 'pf-system-signature-module',                          // class for this module

        // headline toolbar
        moduleHeadlineIconClass: 'pf-module-icon-button',                       // class for toolbar icons in the head
        moduleHeadlineIconAddClass: 'pf-module-icon-button-add',                // class for "add signature" icon
        moduleHeadlineIconReaderClass: 'pf-module-icon-button-reader',          // class for "signature reader" icon
        moduleHeadlineIconLazyClass: 'pf-module-icon-button-lazy',              // class for "lazy delete" toggle icon
        moduleHeadlineProgressBarClass: 'pf-system-progress-scanned',           // class for signature progress bar

        // tables
        tableToolsActionClass: 'pf-table-tools-action',                         // class for "new signature" table (hidden)

        // table toolbar
        sigTableClearButtonClass: 'pf-sig-table-clear-button',                  // class for "clear" signatures button

        // signature table
        sigTableId: 'pf-sig-table-',                                            // Table id prefix
        sigTableClass: 'pf-sig-table',                                          // Table class for all Signature Tables
        sigTablePrimaryClass: 'pf-sig-table-primary',                           // class for primary sig table
        sigTableSecondaryClass: 'pf-sig-table-secondary',                       // class for secondary sig table
        sigTableRowIdPrefix: 'pf-sig-row_',                                     // id prefix for table rows

        sigTableEditSigNameInput: 'pf-sig-table-edit-name-input',               // class for editable fields (sig name)

        tableCellConnectionClass: 'pf-table-connection-cell',                   // class for "connection" cells
        tableCellFocusClass: 'pf-table-focus-cell',                             // class for "tab-able" cells. enable focus()
        tableCellCounterClass: 'pf-table-counter-cell',                         // class for "counter" cells
        tableCellActionClass: 'pf-table-action-cell',                           // class for "action" cells

        // xEditable
        editableNameInputClass: 'pf-editable-name',                             // class for "name" input
        editableDescriptionInputClass: 'pf-editable-description',               // class for "description" textarea
        editableUnknownInputClass: 'pf-editable-unknown',                       // class for input fields (e.g. checkboxes) with "unknown" status

        signatureGroupsLabels: Util.getSignatureGroupOptions('label'),
        signatureGroupsNames: Util.getSignatureGroupOptions('name')
    };

    let sigNameCache = {};                                                      // cache signature names

    let validSignatureNames = [                                                 // allowed signature type/names
        'Cosmic Anomaly',
        'Cosmic Signature',
        'Kosmische Anomalie',                                                   // de: "Cosmic Anomaly"
        'Kosmische Signatur',                                                   // de: "Cosmic Signature"
        'Космическая аномалия',                                                 // ru: "Cosmic Anomaly"
        'Скрытый сигнал',                                                       // ru: "Cosmic Signature"
        'Anomalie cosmique',                                                    // fr: "Cosmic Anomaly"
        'Signature cosmique',                                                   // fr: "Cosmic Signature"
        '宇宙の特異点',                                                               // ja: "Cosmic Anomaly"
        '宇宙のシグネチャ',                                                             // ja: "Cosmic Signature"
        '异常空间',                                                                 // zh: "Cosmic Anomaly"
        '空间信号'                                                                  // zh: "Cosmic Signature"
    ];

    let emptySignatureData = {
        id: 0,
        name: '',
        groupId: 0,
        typeId: 0
    };

    let editableDefaults = {                                                    // xEditable default options for signature fields
        url: function(params){
            let saveExecutor =  (resolve, reject) => {
                // only submit params if id (pk) is set
                if(params.pk){
                    let requestData = {};
                    requestData[params.name] = params.value;

                    Util.request('PATCH', 'signature', params.pk, requestData)
                        .then(payload => resolve(payload.data))
                        .catch(payload => reject(payload.data.jqXHR));
                }else{
                    resolve();
                }
            };

            return new Promise(saveExecutor);
        },
        dataType: 'json',
        container: 'body',
        highlight: false,   // i use a custom implementation. xEditable uses inline styles for bg color animation -> does not work properly on datatables "sort" cols
        error: function(jqXHR, newValue){
            let reason = '';
            let status = 'Error';
            if(jqXHR.statusText){
                reason = jqXHR.statusText;
            }else if(jqXHR.name){
                // validation error new sig (new row data save function)
                reason = jqXHR.name;
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
     * get dataTable id
     * @param mapId
     * @param systemId
     * @param tableType
     * @returns {string}
     */
    let getTableId = (mapId, systemId, tableType) => Util.getTableId(config.sigTableId, mapId, systemId, tableType);

    /**
     * get a dataTableApi instance from global cache
     * @param mapId
     * @param systemId
     * @param tableType
     * @returns {*}
     */
    let getDataTableInstance = (mapId, systemId, tableType) => Util.getDataTableInstance(config.sigTableId, mapId, systemId, tableType);

    /**
     * Update/set tooltip for an element
     * @param element
     * @param title
     */
    let updateTooltip = (element, title) => {
        $(element).attr('data-container', 'body')
            .attr('title', title.toUpperCase())
            .tooltip('fixTitle').tooltip('setContent');
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
     * get all signature types that can exist for a given system
     * -> result is partially cached
     * @param systemData
     * @param systemTypeId
     * @param areaId
     * @param groupId
     * @returns {Array}
     */
    let getAllSignatureNames = (systemData, systemTypeId, areaId, groupId) => {
        systemTypeId    = parseInt(systemTypeId || 0);
        areaId          = parseInt(areaId || 0);
        groupId         = parseInt(groupId || 0);
        let newSelectOptions = [];
        let newSelectOptionsCount = 0;

        if(!systemTypeId || !areaId || !groupId){
            return newSelectOptions;
        }

        let cacheKey = [systemTypeId, areaId, groupId].join('_');

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
                    if(
                        frigKey > 0 &&
                        frigateHoles.hasOwnProperty(frigKey)
                    ){
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
                    if(
                        incomingKey > 0 &&
                        Init.incomingWormholes.hasOwnProperty(incomingKey)
                    ){
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

            let option = {
                value: connectionData.id,
                text: text,
                metaData: {
                    type: connectionData.type
                }
            };

            return option;
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
            newSelectOptions.push({ text: 'System', children: connectionOptions});
        }

        return newSelectOptions;
    };

    /**
     * show/hides a table <tr> rowElement
     * @param rowElement
     */
    let toggleTableRow = rowElement => {

        let toggleTableRowExecutor = (resolve, reject) => {
            let cellElements = rowElement.children('td');
            let duration = 350;
            // wrap each <td> into a container (for better animation performance)
            // slideUp new wrapper divs
            if(rowElement.is(':visible')){
                // hide row

                // stop sig counter by adding a stopClass to each <td>, remove padding
                cellElements.addClass('stopCounter')
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
    };

    /**
     * update scanned signatures progress bar
     * @param tableApi
     * @param options
     */
    let updateScannedSignaturesBar = (tableApi, options) => {
        let tableElement = tableApi.table().node();
        let moduleElement = $(tableElement).parents('.' + config.moduleTypeClass);
        let progressBar = moduleElement.find('.progress-bar');
        let progressBarLabel = moduleElement.find('.progress-label-right');

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
                Util.showNotify({title: 'Unscanned signatures', text: notification, type: 'info'});
            }else{
                Util.showNotify({title: 'System is scanned', text: notification, type: 'success'});
            }
        }
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
                        callback: function(){
                            let form = this.find('form');
                            let formData = form.getFormValues();
                            let signatureOptions = {
                                deleteOld: (formData.deleteOld) ? 1 : 0
                            };

                            let mapId = moduleElement.data('mapId');
                            let systemId = moduleElement.data('systemId');
                            let tableApi = getDataTableInstance(mapId, systemId, 'primary');

                            updateSignatureTableByClipboard(tableApi, systemData, formData.clipboard, signatureOptions);
                        }
                    }
                }
            });

            // dialog shown event
            signatureReaderDialog.on('shown.bs.modal', function(e){
                signatureReaderDialog.initTooltips();

                // set focus on sig-input textarea
                signatureReaderDialog.find('textarea').focus();
            });
        });
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

                            let typeOptions = getAllSignatureNames(
                                systemData,
                                systemData.type.id,
                                Util.getAreaIdBySecurity(systemData.security),
                                sigGroupId
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
                            systemId: systemData.id,
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
    };

    /**
     * updates the signature table with all signatures pasted into the "signature reader" dialog
     * -> Hint: copy&paste signature data (without any open dialog) will add signatures as well
     * @param tableApi
     * @param systemData
     * @param clipboard data stream
     * @param options
     */
    let updateSignatureTableByClipboard = (tableApi, systemData, clipboard, options) => {
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
                'signature',
                [],
                {
                    signatures: signatureData,
                    deleteOld: options.deleteOld,
                    systemId: parseInt(systemData.id)
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
                    updateSignatureTable(payload.context.tableApi, payload.data, !!options.deleteOld);
                },
                Util.handleAjaxErrorResponse
            );
        };

        // parse input stream
        let signatureData = parseSignatureString(systemData, clipboard);
        if(signatureData.length > 0){
            // valid signature data parsed

            // check if signatures will be added to a system where character is currently in
            // if character is not in any system -> id === undefined -> no "confirmation required
            let currentLocationData = Util.getCurrentLocationData();
            if(
                currentLocationData.id &&
                currentLocationData.id !== systemData.systemId
            ){
                let systemNameStr = (systemData.name === systemData.alias) ? '"' + systemData.name + '"' : '"' + systemData.alias + '" (' + systemData.name + ')';
                systemNameStr = '<span class="txt-color txt-color-warning">' + systemNameStr + '</span>';

                let msg = 'Update signatures in ' + systemNameStr + ' ? This is not your current location, "' + currentLocationData.name + '" !';
                bootbox.confirm(msg, function(result){
                    if(result){
                        saveSignatureData(signatureData);
                    }
                });
            }else{
                // current system selected -> no "confirmation" required
                saveSignatureData(signatureData);
            }
        }
    };

    /**
     * deletes signature rows from signature table
     * @param tableApi
     * @param rows
     */
    let deleteSignatures = (tableApi, rows) => {
        // get unique id array from rows -> in case there are 2 rows with same id -> you never know
        let signatureIds = [...new Set(rows.data().toArray().map(rowData => rowData.id))];
        let metaData = getTableMetaData(tableApi);

        let processRequestPromise = tableApi.newProcess('request');

        Util.request('DELETE', 'signature', signatureIds, {
                systemId: metaData.systemId
            }, {
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

                    promisesToggleRow.push(toggleTableRow(rowElement));
                });

                // ... all hide animations done ...
                Promise.all(promisesToggleRow).then(payloads => {
                    // ... get deleted (hide animation done) and delete them
                    tableApi.rows(payloads.map(payload => payload.row)).remove().draw();

                    // update signature bar
                    updateScannedSignaturesBar(tableApi, {showNotice: false});

                    // update connection conflicts
                    checkConnectionConflicts();

                    let notificationOptions = {
                        type: 'success'
                    };
                    if (payloads.length === 1) {
                        notificationOptions.title = 'Signature deleted';
                    } else {
                        notificationOptions.title = payloads.length + ' Signatures deleted ';
                    }
                    Util.showNotify(notificationOptions);
                });
            },
            Util.handleAjaxErrorResponse
        );
    };

    /**
     * updates a single cell with new data (e.g. "updated" cell)
     * @param tableApi
     * @param rowIndex
     * @param columnSelector
     * @param data
     */
    let updateSignatureCell = (tableApi, rowIndex, columnSelector, data) => {
        tableApi.cell(rowIndex, columnSelector).data(data);
    };

    /**
     * check connectionIds for conflicts (multiple signatures -> same connection)
     * -> show "conflict" icon next to select
     */
    let checkConnectionConflicts = () => {
        setTimeout(() => {
            let connectionSelects = $('.' + config.tableCellConnectionClass + '.editable');
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
     * get group label by groupId
     * @param groupId
     * @returns {string}
     */
    let getGroupLabelById = (groupId) => {
        let options = config.signatureGroupsLabels.filter(option => option.value === groupId);
        return options.length ? options[0].text : '';
    };

    /**
     * helper function - get cell by columnSelector from same row as cell
     * @param tableApi
     * @param cell
     * @param columnSelector
     * @returns {*}
     */
    let getNeighboringCell = (tableApi, cell, columnSelector) => {
        return tableApi.cell(tableApi.row(cell).index(), columnSelector);
    };

    /**
     * get next cell by columnSelector
     * @param tableApi
     * @param cell
     * @param columnSelectors
     * @returns {*}
     */
    let searchNextCell = (tableApi, cell, columnSelectors) => {
        if(columnSelectors.length){
            // copy selectors -> .shift() modifies the orig array, important!
            columnSelectors = columnSelectors.slice(0);
            let nextCell = getNeighboringCell(tableApi, cell, columnSelectors.shift());
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
                    return searchNextCell(tableApi, cell, columnSelectors);
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
    };

    /**
     * make cell active -> focus() + show xEditable
     * @param cell
     */
    let activateCell = (cell) => {
        let cellElement = cell.nodes().to$();
        // NO xEditable
        cellElement.focus();

        if( cellElement.data('editable') ){
            // cell is xEditable field -> show xEditable form
            cellElement.editable('show');
        }
    };

    /**
     * search neighboring cell (same row) and set "active" -> show editable
     * @param tableApi
     * @param cell
     * @param columnSelectors
     */
    let activateNextCell = (tableApi, cell, columnSelectors) => {
        let nextCell = searchNextCell(tableApi, cell, columnSelectors);
        activateCell(nextCell);
    };

    /**
     * helper function - set 'save' observer for xEditable cell
     * -> show "neighboring" xEditable field
     * @param tableApi
     * @param cell
     * @param columnSelectorsAjax - used for Ajax save (edit signature)
     * @param columnSelectorsDry - used for dry save (new signature)
     */
    let editableOnSave = (tableApi, cell, columnSelectorsAjax = [], columnSelectorsDry = []) => {
        $(cell).on('save', function(e, params){
            if(params.response){
                // send by Ajax
                activateNextCell(tableApi, cell, columnSelectorsAjax);
            }else{
                // dry save - no request
                activateNextCell(tableApi, cell, columnSelectorsDry);
            }
        });
    };

    /**
     * helper function - set 'hidden' observer for xEditable cell
     * -> set focus() on xEditable field
     * @param tableApi
     * @param cell
     */
    let editableOnHidden = (tableApi, cell) => {
        $(cell).on('hidden', function(e, reason){
            // re-focus element on close (keyboard navigation)
            // 'save' event handles default focus (e.g. open new xEditable)
            // 'hide' handles all the rest (experimental)
            if(reason !== 'save'){
                this.focus();
            }
        });
    };

    /**
     * helper function - set 'shown' observer for xEditable type cell
     * -> enable Select2 for xEditable form
     * @param cell
     */
    let editableGroupOnShown = cell => {
        $(cell).on('shown', function(e, editable){
            let inputField = editable.input.$input;
            inputField.addClass('pf-select2').initSignatureGroupSelect();
        });
    };

    /**
     * helper function - set 'save' observer for xEditable group cell
     * -> update scanned signature bar
     * @param tableApi
     * @param cell
     */
    let editableGroupOnSave = (tableApi, cell) => {
        $(cell).on('save', function(e, params){
            if(params.response){
                // send by Ajax
                updateScannedSignaturesBar(tableApi, {showNotice: true});
            }
        });
    };

    /**
     * helper function - set 'init' observer for xEditable type cell
     * -> disable xEditable field if no options available
     * @param cell
     */
    let editableTypeOnInit = cell => {
        $(cell).on('init', function(e, editable){
            if(!editable.options.source().length){
                editableDisable($(this));
            }
        });
    };

    /**
     * helper function - set 'shown' observer for xEditable type cell
     * -> enable Select2 for xEditable form
     * @param cell
     */
    let editableTypeOnShown = cell => {
        $(cell).on('shown', function(e, editable){
            // destroy possible open popovers (e.g. wormhole types)
            $(this).destroyPopover(true);

            let inputField = editable.input.$input;
            let hasOptGroups = inputField.has('optgroup').length > 0;
            inputField.addClass('pf-select2').initSignatureTypeSelect({}, hasOptGroups);
        });
    };

    /**
     * helper function - set 'shown' observer for xEditable description cell
     * -> change height for "new signature" table wrapper
     * @param cell
     */
    let editableDescriptionOnShown = cell => {
        $(cell).on('shown', function(e, editable){
            $(this).parents('.' + config.tableToolsActionClass).css('height', '+=35px');
        });
    };

    /**
     * helper function - set 'hidden' observer for xEditable description cell
     * -> change height for "new signature" table wrapper
     * @param cell
     */
    let editableDescriptionOnHidden = cell => {
        $(cell).on('hidden', function(e, editable){
            $(this).parents('.' + config.tableToolsActionClass).css('height', '-=35px');
        });
    };

    /**
     * helper function - set 'init' observer for xEditable connection cell
     * -> set focus() on xEditable field
     * @param cell
     */
    let editableConnectionOnInit = cell => {
        $(cell).on('init', function(e, editable){
            if(editable.value > 0){
                // empty connection selects ON INIT don´t make a difference for conflicts
                checkConnectionConflicts();
            }
        });
    };

    /**
     * helper function - set 'shown' observer for xEditable connection cell
     * -> enable Select2 for xEditable form
     * @param tableApi
     * @param cell
     */
    let editableConnectionOnShown = (tableApi, cell) => {
        $(cell).on('shown', function(e, editable){
            let inputField = editable.input.$input;

            if(!$(tableApi.table().node()).hasClass(config.sigTablePrimaryClass)){
                // we need the primary table API to get selected connections
                let metaData = getTableMetaData(tableApi);
                tableApi = getDataTableInstance(metaData.mapId, metaData.systemId, 'primary');
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
    };

    /**
     * helper function - set 'save' observer for xEditable connection cell
     * -> check connection conflicts
     * @param cell
     */
    let editableConnectionOnSave = cell => {
        $(cell).on('save', function(e, params){
            checkConnectionConflicts();
        });
    };

    /**
     * enable xEditable element
     * @param element
     */
    let editableEnable = element => {
        element.editable('enable');
        // (re)-enable focus on element by tabbing, xEditable removes "tabindex" on 'disable'
        element.attr('tabindex', 0);
    };

    /**
     * disable xEditable element
     * @param element
     */
    let editableDisable = element => {
        element.editable('disable');
        // xEditable sets 'tabindex = -1'
    };

    /**
     * en/disables xEditable element (select)
     * -> disables if there are no source options found
     * @param element
     */
    let editableSelectCheck = element => {
        if(element.data('editable')){
            let options = element.data('editable').options.source();
            if(options.length > 0){
                editableEnable(element);
            }else{
                editableDisable(element);
            }
        }
    };

    /**
     * get dataTables default options for signature tables
     * @param mapId
     * @param systemData
     * @returns {{}}
     */
    let getSignatureDataTableDefaults = (mapId, systemData) => {

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
            rowId: rowData => config.sigTableRowIdPrefix + rowData.id,
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
                    class: [config.tableCellFocusClass, config.sigTableEditSigNameInput].join(' '),
                    data: 'name',
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tableApi = this.api();

                        updateTooltip(cell, cellData);

                        editableOnSave(tableApi, cell, [], ['group:name', 'type:name', 'action:name']);
                        editableOnHidden(tableApi, cell);

                        $(cell).editable($.extend({
                            mode: 'popup',
                            type: 'text',
                            title: 'signature id',
                            name: 'name',
                            pk: rowData.id || null,
                            emptytext: '? ? ?',
                            value: cellData,
                            inputclass: config.editableNameInputClass,
                            display: function(value){
                                // change display value to first 3 letters
                                $(this).text($.trim( value.substr(0, 3) ).toLowerCase());
                            },
                            validate: function(value){
                                let msg = false;
                                if($.trim(value).length < 3){
                                    msg = 'Id is less than min of "3"';
                                }else if($.trim(value).length > 10){
                                    msg = 'Id is more than max of "10"';
                                }

                                if(msg){
                                    return {newValue: value, msg: msg, field: this};
                                }
                            },
                            params: modifyFieldParamsOnSend,
                            success: function(response, newValue){
                                tableApi.cell(cell).data(newValue);

                                $(this).pulseBackgroundColor('changed');
                                updateTooltip(cell, newValue);

                                if(response){
                                    let newRowData = response[0];
                                    updateSignatureCell(tableApi, rowIndex, 'status:name', newRowData.updated);
                                    updateSignatureCell(tableApi, rowIndex, 'updated:name', newRowData.updated.updated);
                                }
                                tableApi.draw();
                            }
                        }, editableDefaults));
                    }
                },{
                    targets: 2,
                    name: 'group',
                    orderable: true,
                    searchable: true,
                    title: 'group',
                    type: 'string',     // required for sort/filter because initial data type is numeric
                    width: 40,
                    class: [config.tableCellFocusClass].join(' '),
                    data: 'groupId',
                    render: {
                        sort: getGroupLabelById,
                        filter: getGroupLabelById
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tableApi = this.api();

                        editableOnSave(tableApi, cell, ['type:name'], ['type:name', 'action:name']);
                        editableOnHidden(tableApi, cell);
                        editableGroupOnShown(cell);
                        editableGroupOnSave(tableApi, cell);

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
                            source: config.signatureGroupsLabels,
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
                                    updateSignatureCell(tableApi, rowIndex, 'status:name', newRowData.updated);
                                    updateSignatureCell(tableApi, rowIndex, 'updated:name', newRowData.updated.updated);
                                }
                                tableApi.draw();

                                // find related "type" select (same row) and change options ---------------------------
                                let signatureTypeCell = getNeighboringCell(tableApi, cell, 'type:name');
                                let signatureTypeField = signatureTypeCell.nodes().to$();
                                editableSelectCheck(signatureTypeField);

                                signatureTypeCell.data(0);
                                signatureTypeField.editable('setValue', 0);


                                // find "connection" select (same row) and change "enabled" flag ----------------------
                                let signatureConnectionCell = getNeighboringCell(tableApi, cell, 'connection:name');
                                let signatureConnectionField = signatureConnectionCell.nodes().to$();

                                if(newValue === 5){
                                    // wormhole
                                    editableEnable(signatureConnectionField);
                                }else{
                                    checkConnectionConflicts();
                                    editableDisable(signatureConnectionField);
                                }
                                signatureConnectionCell.data(0);
                                signatureConnectionField.editable('setValue', 0);
                            }
                        }, editableDefaults));
                    }
                },{
                    targets: 3,
                    name: 'type',
                    orderable: false,
                    searchable: false,
                    title: 'type',
                    type: 'string',     // required for sort/filter because initial data type is numeric
                    width: 180,
                    class: [config.tableCellFocusClass].join(' '),
                    data: 'typeId',
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tableApi = this.api();

                        editableOnSave(tableApi, cell, ['connection:name'], ['action:name']);
                        editableOnHidden(tableApi, cell);
                        editableTypeOnInit(cell);
                        editableTypeOnShown(cell);

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

                                let typeOptions = getAllSignatureNames(
                                    systemData,
                                    systemData.type.id,
                                    Util.getAreaIdBySecurity(systemData.security),
                                    rowData.groupId
                                );
                                return typeOptions;
                            },
                            display: function(value, sourceData){
                                let selected = $.fn.editableutils.itemsByValue(value, sourceData);
                                if(selected.length && selected[0].value > 0){
                                    $(this).html(FormElement.formatSignatureTypeSelectionData({text: selected[0].text}));
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
                                    updateSignatureCell(tableApi, rowIndex, 'status:name', newRowData.updated);
                                    updateSignatureCell(tableApi, rowIndex, 'updated:name', newRowData.updated.updated);
                                }
                                tableApi.draw();
                            }
                        }, editableDefaults));
                    }
                },{
                    targets: 4,
                    name: 'description',
                    orderable: false,
                    searchable: false,
                    title: 'description',
                    class: [config.tableCellFocusClass, config.tableCellActionClass].join(' '),
                    type: 'html',
                    data: 'description',
                    defaultContent: '',
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tableApi = this.api();

                        editableOnSave(tableApi, cell, [], ['action:name']);
                        editableOnHidden(tableApi, cell);
                        editableDescriptionOnShown(cell);
                        editableDescriptionOnHidden(cell);

                        $(cell).editable($.extend({
                            mode: 'inline',
                            type: 'textarea',
                            title: 'description',
                            name: 'description',
                            pk: rowData.id || null,
                            emptytext: '<i class="fas fa-fw fa-lg fa-pen"></i>',
                            onblur: 'submit',
                            showbuttons: false,
                            inputclass: config.editableDescriptionInputClass,
                            emptyclass: config.moduleHeadlineIconClass,
                            params: modifyFieldParamsOnSend,
                            success: function(response, newValue){
                                tableApi.cell(cell).data(newValue);

                                $(this).pulseBackgroundColor('changed');

                                if(response){
                                    let newRowData = response[0];
                                    updateSignatureCell(tableApi, rowIndex, 'status:name', newRowData.updated);
                                    updateSignatureCell(tableApi, rowIndex, 'updated:name', newRowData.updated.updated);
                                }
                                tableApi.draw();
                            }
                        }, editableDefaults));
                    }
                },{
                    targets: 5,
                    name: 'connection',
                    orderable: false,
                    searchable: false,
                    title: 'leads to',
                    type: 'string',     // required for sort/filter because initial data type is numeric
                    className: [config.tableCellFocusClass, config.tableCellConnectionClass].join(' '),
                    width: 80,
                    data: 'connection.id',
                    defaultContent: 0,
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tableApi = this.api();

                        editableOnSave(tableApi, cell, [], ['action:name']);
                        editableOnHidden(tableApi, cell);
                        editableConnectionOnInit(cell);
                        editableConnectionOnShown(tableApi, cell);
                        editableConnectionOnSave(cell);

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
                                let connectionOptions = getSignatureConnectionOptions(mapId, systemData);
                                return connectionOptions;
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
                            validate: function(value, b, c){
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
                                    updateSignatureCell(tableApi, rowIndex, 'status:name', newRowData.updated);
                                    updateSignatureCell(tableApi, rowIndex, 'updated:name', newRowData.updated.updated);
                                }
                                tableApi.draw();
                            }
                        }, editableDefaults));
                    }
                },{
                    targets: 6,
                    name: 'created',
                    title: 'created',
                    searchable: false,
                    width: 80,
                    className: ['text-right', config.tableCellCounterClass, 'min-screen-d'].join(' '),
                    data: 'created.created',
                    defaultContent: ''
                },{
                    targets: 7,
                    name: 'updated',
                    title: 'updated',
                    searchable: false,
                    width: 80,
                    className: ['text-right', config.tableCellCounterClass, 'min-screen-d'].join(' '),
                    data: 'updated.updated',
                    defaultContent: '',
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        // highlight cell
                        let diff = Math.floor((new Date()).getTime()) - cellData * 1000;

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
                    class: ['text-center', config.tableCellFocusClass, config.tableCellActionClass].join(' '),
                    data: null,
                    render: {
                        display: (cellData, type, rowData, meta) => {
                            let val = '<i class="fas fa-plus"></i>';
                            if(rowData.id){
                                val = '<i class="fas fa-times txt-color txt-color-redDarker"></i>';
                            }
                            return val;
                        }
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        let tableApi = this.api();

                        if(rowData.id){
                            // delete signature -----------------------------------------------------------------------
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

                                    let deleteRowElement = $(target).parents('tr');
                                    let row = tableApi.rows(deleteRowElement);
                                    deleteSignatures(tableApi, row);
                                }
                            };

                            $(cell).confirmation(confirmationSettings);
                        }else{
                            // add new signature ----------------------------------------------------------------------
                            $(cell).on('click', {tableApi: tableApi, rowIndex: rowIndex}, function(e){
                                e.stopPropagation();
                                e.preventDefault();

                                let secondaryTableApi = e.data.tableApi;
                                let metaData = getTableMetaData(secondaryTableApi);
                                let primaryTableApi = getDataTableInstance(metaData.mapId, metaData.systemId, 'primary');

                                let formFields = secondaryTableApi.row(e.data.rowIndex).nodes().to$().find('.editable');

                                // the "hide" makes sure to take care about open editable fields (e.g. description)
                                // otherwise, changes would not be submitted in this field (not necessary)
                                formFields.editable('hide');

                                let processLockPromise = null;
                                let processRequestPromise = null;

                                // submit all xEditable fields
                                formFields.editable('submit', {
                                    url: Init.path.api + '/signature',
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
                                    error: editableDefaults.error, // user default xEditable error function
                                    success: function(response, editableConfig){
                                        let context = editableConfig.ajaxOptions.context;
                                        let primaryTableApi = context.primaryTableApi;
                                        let secondaryTableApi = context.secondaryTableApi;

                                        let signatureData = response[0];
                                        let row = addSignatureRow(primaryTableApi, signatureData);
                                        if(row){
                                            primaryTableApi.draw();
                                            // highlight
                                            row.nodes().to$().pulseBackgroundColor('added');

                                            // prepare "add signature" table for new entry -> reset -------------------
                                            secondaryTableApi.clear().row.add($.extend(true, {}, emptySignatureData)).draw();

                                            Util.showNotify({
                                                title: 'Signature added',
                                                text: 'Name: ' + signatureData.name,
                                                type: 'success'
                                            });

                                            // update signature bar
                                            updateScannedSignaturesBar(primaryTableApi, {showNotice: true});
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
                let focusCells = $(row).find('.' + config.tableCellFocusClass + ':not(.editable-disabled)').attr('tabindex', 0);
                // enable "return" key -> click()
                focusCells.on('keydown', function(e){
                    e.stopPropagation();
                    if(e.which === 13){
                        $(this).trigger('click');
                    }
                });
            }
        };

        return dataTableDefaults;
    };

    /**
     * key (arrow) navigation inside a table -> set cell focus()
     * @param tableApi
     * @param e
     */
    let keyNavigation = (tableApi, e) => {
        let offset = [0, 0];
        if(e.keyCode === 37){
            offset = [-1, 0];
        }else if(e.keyCode === 38){
            offset = [0, -1];
        }else if(e.keyCode === 39){
            offset = [1, 0];
        }else if(e.keyCode === 40){
            offset = [0, 1];
        }

        if(offset !== [0, 0]){
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
    };

    /**
     * draw signature table toolbar (add signature button, scan progress bar
     * @param moduleElement
     * @param mapId
     * @param systemData
     */
    let drawSignatureTableNew = (moduleElement, mapId, systemData) => {
        let secondaryTableContainer = $('<div>', {
            class: config.tableToolsActionClass
        });

        // create "empty table for new signature
        let table = $('<table>', {
            id: getTableId(mapId, systemData.id, 'secondary'),
            class: ['stripe', 'row-border', 'compact', 'nowrap', config.sigTableClass, config.sigTableSecondaryClass].join(' ')
        });

        secondaryTableContainer.append(table);

        moduleElement.find('.' + config.moduleHeadClass).after(secondaryTableContainer);

        let dataTableOptions = {
            paging: false,
            info: false,
            searching: false,
            tabIndex: -1,
            data: [$.extend(true, {}, emptySignatureData)],
            initComplete: function(settings, json){
                let tableApi = this.api();

                $(this).on('keyup', 'td', {tableApi: tableApi}, function(e){
                    keyNavigation(tableApi, e);
                });
            }
        };

        $.extend(true, dataTableOptions, getSignatureDataTableDefaults(mapId, systemData));

        let tableApi = table.DataTable(dataTableOptions);

        // "Responsive" dataTables plugin did not load automatic (because table is invisible onInit)
        // -> manually start "Responsive" extension -> see default dataTable setting for config e.g. breakpoints
        new $.fn.dataTable.Responsive(tableApi);
    };

    /**
     * filter table "group" column
     * @param tableApi
     * @param newValue
     * @param sourceOptions
     */
    let searchGroupColumn = (tableApi, newValue, sourceOptions) => {
        let column = tableApi.column('group:name');
        let pattern = '';

        if(newValue.length <= sourceOptions.length){
            // all options selected + "prepend" option
            let selected = $.fn.editableutils.itemsByValue(newValue, sourceOptions);

            pattern = selected.map(option => option.value !== 0 ? $.fn.dataTable.util.escapeRegex(option.text) : '^$').join('|');
        }
        column.search(pattern, true, false).draw();
    };

    /**
     * init table filter button "group" column
     * @param tableApi
     */
    let initGroupFilterButton = tableApi => {
        let promiseStore = MapUtil.getLocaleData('character', Util.getCurrentCharacterId());
        promiseStore.then(data => {
            let filterButton = tableApi.button('tableTools', 'filterGroup:name').node();
            let prependOptions = [{value: 0, text: 'unknown'}];
            let sourceOptions = config.signatureGroupsLabels;
            let selectedValues = [];

            if(data && data.filterSignatureGroups && data.filterSignatureGroups.length){
                // select local stored values
                selectedValues = data.filterSignatureGroups;
            }else{
                // no default group filter options -> show all
                selectedValues = sourceOptions.map(option => option.value);
                selectedValues.unshift(0);
            }

            filterButton.editable({
                mode: 'popup',
                container: 'body',
                type: 'checklist',
                showbuttons: false,
                onblur: 'submit',
                highlight: false,
                title: 'filter groups',
                value: selectedValues,
                prepend: prependOptions,
                source: sourceOptions,
                inputclass: config.editableUnknownInputClass,
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

            filterButton.on('save', {tableApi: tableApi, sourceOptions: allOptions}, function(e, params){
                // store values local -> IndexDB
                MapUtil.storeLocaleCharacterData('filterSignatureGroups', params.newValue);

                searchGroupColumn(e.data.tableApi, params.newValue, e.data.sourceOptions);
            });

            // set initial search string -> even if table ist currently empty
            searchGroupColumn(tableApi, selectedValues, allOptions);
        });
    };

    /**
     * init table undo button
     * @param tableApi
     */
    let initUndoButton = tableApi => {
        let undoButton = tableApi.button('tableTools', 'undo:name').node();
        let metaData = getTableMetaData(tableApi);

        let getIconByAction = action => {
          switch(action){
              case 'add':       return 'fa-plus txt-color-green';
              case 'delete':    return 'fa-times txt-color-redDarker';
              case 'edit':      return 'fa-pen txt-color-orangeDark';
              case 'undo':      return 'fa-undo txt-color-grayLight';
              case 'sync':      return 'fa-exchange-alt txt-color-orangeDark';
          }
        };

        undoButton.on('shown', function(e, editable){
            // check if history options loaded -> else forward to error function
            if(!editable.input.$input.length){
                editable.options.error.call(editable, ['No record found']);
            }else{
                // disable first option
                editable.input.$input.first().prop('disabled', true);
                // preselect second option
                //editable.input.$input.eq(1).prop('checked', true);
                //editable.setValue('ad78172b72d0327b237c4a7dc1daa5d7');


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

        undoButton.editable({
            url: Init.path.api + '/signaturehistory',
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
            container: 'body',
            type: 'checklist',
            showbuttons: true,
            highlight: false,
            title: 'historical records',
            name: 'history',
            pk: metaData.systemId,
            source: Init.path.api + '/signaturehistory/' + metaData.systemId,
            sourceOptions: {
                type: 'GET',
                data: {
                    mapId: metaData.mapId
                }
            },
            sourceCache: false, // always get new source options on open
            display: function(value){
                $(this).html('<i class="fas fa-undo"></i>undo');
            },
            success: function(response, newValue){
                // update signature table
                tableApi.endProcess(processLockPromise);

                updateSignatureTable(tableApi, response, true);
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
    };

    /**
     * init table selectAll button
     * @param tableApi
     */
    let initSelectAllButton = tableApi => {
        let selectButton = tableApi.button('tableTools', 'selectAll:name').node();

        selectButton.on('click', function(){
            let allRows = tableApi.rows();
            let selectedRows = getSelectedRows(tableApi);
            let allRowElements = allRows.nodes().to$();

            if(allRows.data().length === selectedRows.data().length){
                allRowElements.removeClass('selected');
            }else{
                allRowElements.addClass('selected');
            }

            // check delete button
            checkDeleteSignaturesButton(tableApi);
        });
    };

    /**
     * init table delete button
     * @param tableApi
     */
    let initDeleteButton = tableApi => {
        let deleteButton = tableApi.button('tableTools', 'delete:name').node();

        deleteButton.on('click', function(){
            let selectedRows = getSelectedRows(tableApi);
            bootbox.confirm('Delete ' + selectedRows.data().length + ' signature?', function(result){
                if(result){
                    deleteSignatures(tableApi, selectedRows);
                }
            });
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
            id: getTableId(mapId, systemData.id, 'primary'),
            class: ['display', 'compact', 'nowrap', config.sigTableClass, config.sigTablePrimaryClass].join(' ')
        });

        moduleElement.append(table);

        let dataTableOptions = {
            tabIndex: -1,
            dom: '<"row"<"col-xs-3"l><"col-xs-5"B><"col-xs-4"fS>>' +
                '<"row"<"col-xs-12"tr>>' +
                '<"row"<"col-xs-5"i><"col-xs-7"p>>',
            buttons: {
                name: 'tableTools',
                buttons: [
                    {
                        name: 'filterGroup',
                        tag: 'a',
                        className: config.moduleHeadlineIconClass,
                        text: '' // set by js (xEditable)
                    },
                    {
                        name: 'undo',
                        tag: 'a',
                        className: config.moduleHeadlineIconClass,
                        text: '' // set by js (xEditable)
                    },
                    {
                        name: 'selectAll',
                        tag: 'a',
                        className: config.moduleHeadlineIconClass,
                        text: '<i class="fas fa-check-double"></i>select all'
                    },
                    {
                        name: 'delete',
                        tag: 'a',
                        className: [config.moduleHeadlineIconClass, config.sigTableClearButtonClass].join(' '),
                        text: '<i class="fas fa-trash"></i>delete&nbsp;(<span>0</span>)'
                    }
                ]
            },
            initComplete: function(settings, json){
                let tableApi = this.api();

                initGroupFilterButton(tableApi);
                initUndoButton(tableApi);
                initSelectAllButton(tableApi);
                initDeleteButton(tableApi);

                $(this).on('keyup', 'td', {tableApi: tableApi}, function(e){
                    keyNavigation(tableApi, e);
                });

                Counter.initTableCounter(this, ['created:name', 'updated:name']);
            }
        };

        $.extend(true, dataTableOptions, getSignatureDataTableDefaults(mapId, systemData));

        let tableApi = table.DataTable(dataTableOptions);

        // "Responsive" dataTables plugin did not load automatic (because table is invisible onInit)
        // -> manually start "Responsive" extension -> see default dataTable setting for config e.g. breakpoints
        new $.fn.dataTable.Responsive(tableApi);

        // lock table until module is fully rendered
        moduleElement.data('lockPromise', tableApi.newProcess('lock'));
    };

    /**
     * open xEditable input field in "new Signature" table
     * @param moduleElement
     */
    let focusNewSignatureEditableField = moduleElement => {
        moduleElement.find('.' + config.sigTableSecondaryClass)
            .find('td.' + config.sigTableEditSigNameInput).editable('show');
    };

    /**
     * get all selected rows of a table
     * @param tableApi
     * @returns {*}
     */
    let getSelectedRows = tableApi => {
        return tableApi.rows('.selected');
    };

    /**
     * check the "delete signature" button. show/hide the button if a signature is selected
     * @param tableApi
     */
    let checkDeleteSignaturesButton = tableApi => {
        let selectedRows = getSelectedRows(tableApi);
        let selectedRowCount = selectedRows.data().length;
        let clearButton = tableApi.button('tableTools', 'delete:name').node();

        if(selectedRowCount > 0){
            let allRows = tableApi.rows();
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
     * set module observer and look for relevant signature data to update
     * @param moduleElement
     * @param mapId
     * @param systemData
     */
    let setModuleObserver = (moduleElement, mapId, systemData) => {
        let primaryTable = moduleElement.find('.' + config.sigTablePrimaryClass);
        let primaryTableApi = getDataTableInstance(mapId, systemData.id, 'primary');

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
        moduleElement.find('.' + config.moduleHeadlineIconReaderClass).on('click', function(e){
            moduleElement.showSignatureReaderDialog(systemData);
        });

        // "lazy update" toggle ---------------------------------------------------------------------------------------
        moduleElement.find('.' + config.moduleHeadlineIconLazyClass).on('click', function(e){
            $(this).toggleClass('active');
        });

        // set multi row select ---------------------------------------------------------------------------------------
        primaryTable.on('mousedown', 'td', {tableApi: primaryTableApi}, function(e){
            if(e.ctrlKey){
                e.preventDefault();
                e.stopPropagation();
                // xEditable field should not open -> on 'click'
                // -> therefore disable "pointer-events" on "td" for some ms -> 'click' event is not triggered
                $(this).css('pointer-events', 'none');
                $(e.target).closest('tr').toggleClass('selected');

                // check delete button
                checkDeleteSignaturesButton(e.data.tableApi);

                setTimeout(() => {
                    $(this).css('pointer-events', 'auto');
                }, 250);
            }
        });

        // draw event for signature table -----------------------------------------------------------------------------
        primaryTableApi.on('draw.dt', function(e, settings){
            // check delete button
            let tableApi = $(this).dataTable().api();
            checkDeleteSignaturesButton(tableApi);
        });

        // event listener for global "paste" signatures into the page -------------------------------------------------
        moduleElement.on('pf:updateSystemSignatureModuleByClipboard', {tableApi: primaryTableApi}, function(e, clipboard){
            let lazyUpdateToggle = moduleElement.find('.' + config.moduleHeadlineIconLazyClass);
            let signatureOptions = {
                deleteOld: lazyUpdateToggle.hasClass('active') ? 1 : 0
            };

            // "disable" lazy update icon -> prevents accidental removal for next paste #724
            lazyUpdateToggle.toggleClass('active', false);

            updateSignatureTableByClipboard(e.data.tableApi, systemData, clipboard, signatureOptions);
        });

        // signature column - "type" popover --------------------------------------------------------------------------
        MapUtil.initWormholeInfoTooltip(
            moduleElement.find('.' + config.sigTableClass),
            '.editable-click:not(.editable-open) span[class^="pf-system-sec-"]'
        );

        // signature column - "info" popover --------------------------------------------------------------------------
        moduleElement.find('.' + config.sigTablePrimaryClass).hoverIntent({
            over: function(e){
                let cellElement = $(this);
                let rowData = primaryTableApi.row(cellElement.parents('tr')).data();
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
    };

    /**
     * add new row to signature table
     * @param tableApi
     * @param signatureData
     * @returns {*}
     */
    let addSignatureRow = (tableApi, signatureData) => {
        let row = null;
        if(tableApi){
            row = tableApi.row.add(signatureData);
        }
        return row;
    };

    /**
     * update signature table with new signatures
     * -> add/update/delete rows
     * @param tableApi
     * @param signaturesDataOrig
     * @param deleteOutdatedSignatures
     */
    let updateSignatureTable = (tableApi, signaturesDataOrig, deleteOutdatedSignatures = false) => {
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

        let rowUpdate = function(rowIndex, colIndex, tableLoopCount, cellLoopCount){
            let cell = this;
            let node = cell.nodes().to$();
            if(node.data('editable')){
                // xEditable is active -> should always be active!
                // set new value even if no change -> e.g. render selected Ids as text labels
                let oldValue = node.editable('getValue', true);

                // ... some editable cells depend on each other (e.g. group->type, group->connection)
                switch(node.data('editable').options.name){
                    case 'typeId':
                        // ... disable if no type options found
                        editableSelectCheck(node);
                        break;
                    case 'connectionId':
                        // disables if no wormhole group set
                        let groupId = cell.cell(rowIndex, 'group:name').data();
                        if(groupId === 5){
                            // wormhole
                            editableEnable(node);
                        }else{
                            editableDisable(node);
                        }
                        break;
                }

                // values should be set AFTER en/disabling of a field
                node.editable('setValue', cell.data());

                if(oldValue !== cell.data()){
                    // highlight cell on data change
                    node.pulseBackgroundColor('changed');
                }
            }else if(node.hasClass(config.tableCellCounterClass)){
                // "updated" timestamp always changed
                node.pulseBackgroundColor('changed');
            }
        };

        let getPromiseForRow = (action, rowId) => {
            return new Promise((resolve, reject) => {
                resolve({action: action, rowId: rowId});
            });
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
                            .every(rowUpdate);

                        promisesChanged.push(getPromiseForRow('changed', rowId));
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
            let rows = tableApi.rows((rowIdx, rowData, node) => !rowIdsExist.includes('#' + config.sigTableRowIdPrefix + rowData.id));
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
                    toggleTableRow(rowElement).then(payload => resolve({action: 'deleted', rowIdx: rowId}));
                }));
            }).remove();
        }

        // add new signatures -----------------------------------------------------------------------------------------
        for(let signatureData of signaturesData){
            let row = addSignatureRow(tableApi, signatureData);
            let rowId = row.id(true);
            let rowElement = row.nodes().to$();
            rowElement.pulseBackgroundColor('added');

            promisesAdded.push(getPromiseForRow('added', rowId));
        }

        // done -------------------------------------------------------------------------------------------------------
        Promise.all(promisesAdded.concat(promisesChanged, promisesDeleted)).then(payloads => {
            if(payloads.length){
                // table data changed -> draw() table changes
                tableApi.draw();

                // check for "leads to" conflicts -> important if there are just "update" (no add/delete) changes
                checkConnectionConflicts();

                if(!updateEmptyTable){
                    // no notifications if table was empty just progressbar notification is needed
                    // sum payloads by "action"
                    let notificationCounter = payloads.reduce((acc, payload) => {
                        if(!acc[payload.action]){
                            acc[payload.action] = 0;
                        }
                        acc[payload.action]++;
                        return acc;
                    }, {});

                    let notification = '';
                    if(notificationCounter.added > 0){
                        notification += notificationCounter.added + ' added<br>';
                    }
                    if(notificationCounter.changed > 0){
                        notification += notificationCounter.changed + ' updated<br>';
                    }
                    if(notificationCounter.deleted > 0){
                        notification += notificationCounter.deleted + ' deleted<br>';
                    }
                    if(notification.length){
                        Util.showNotify({title: 'Signatures updated', text: notification, type: 'success'});
                    }
                }

                updateScannedSignaturesBar(tableApi, {showNotice: true});
            }

            // unlock table
            tableApi.endProcess(processLockPromise);
        });
    };

    /**
     * update signature "history" popover
     * @param tableApi
     * @param historyData
     */
    let updateSignatureHistory = (tableApi, historyData) => {
        let tableElement = tableApi.table().node();
        $(tableElement).data('history', historyData);
    };

    /**
     * update trigger function for this module
     * compare data and update module
     * @param moduleElement
     * @param systemData
     */
    let updateModule = (moduleElement, systemData) => {

        if(
            systemData.signatures &&
            systemData.sigHistory
        ){
            let mapId = moduleElement.data('mapId');
            let systemId = moduleElement.data('systemId');
            let tableApi = getDataTableInstance(mapId, systemId, 'primary');
            updateSignatureTable(tableApi, systemData.signatures, true);
            updateSignatureHistory(tableApi, systemData.sigHistory);
        }

        moduleElement.hideLoadingAnimation();
    };

    /**
     * init callback
     * @param moduleElement
     * @param mapId
     * @param systemData
     */
    let initModule = (moduleElement, mapId, systemData) => {
        let tableApi = getDataTableInstance(mapId, systemData.id, 'primary');
        tableApi.endProcess(moduleElement.data('lockPromise'));
    };

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
                class: ['fas', 'fa-fw', 'fa-plus', config.moduleHeadlineIconClass, config.moduleHeadlineIconAddClass].join(' '),
                title: 'add'
            }).attr('data-toggle', 'tooltip'),
            $('<i>', {
                class: ['fas', 'fa-fw', 'fa-paste', config.moduleHeadlineIconClass, config.moduleHeadlineIconReaderClass].join(' '),
                title: 'signature reader'
            }).attr('data-toggle', 'tooltip'),
            $('<i>', {
                class: ['fas', 'fa-fw', 'fa-exchange-alt', config.moduleHeadlineIconClass, config.moduleHeadlineIconLazyClass].join(' '),
                title: 'lazy \'delete\' signatures'
            }).attr('data-toggle', 'tooltip')
        );

        headlineToolbar.find('[data-toggle="tooltip"]').tooltip({
            container: 'body'
        });

        return headlineToolbar;
    };

    /**
     * get module element
     * @param parentElement
     * @param mapId
     * @param systemData
     * @returns {jQuery}
     */
    let getModule = (parentElement, mapId, systemData) => {
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
                wrapperClass: config.moduleHeadlineProgressBarClass,
                class: ['progress-bar-success'].join(' '),
                percent: 0
            };
            moduleElement.find('.' + config.moduleHeadClass).append(Mustache.render(template, data));
        });

        moduleElement.data('mapId', mapId);
        moduleElement.data('systemId', systemData.id);

        moduleElement.showLoadingAnimation();

        // draw "new signature" add table
        drawSignatureTableNew(moduleElement, mapId, systemData);

        // draw signature table
        drawSignatureTable(moduleElement, mapId, systemData);

        // set module observer
        setModuleObserver(moduleElement, mapId, systemData);

        return moduleElement;
    };

    /**
     * before module hide callback
     * @param moduleElement
     */
    let beforeHide = moduleElement => {
        // disable update
        let mapId = moduleElement.data('mapId');
        let systemId = moduleElement.data('systemId');
        let tableApi = getDataTableInstance(mapId, systemId, 'primary');
        tableApi.newProcess('lock');
    };

    /**
     * before module destroy callback
     * @param moduleElement
     */
    let beforeDestroy = moduleElement => {
        // Destroying the data tables throws
        // -> safety remove  all dataTables
        let mapId = moduleElement.data('mapId');
        let systemId = moduleElement.data('systemId');
        let primaryTableApi = getDataTableInstance(mapId, systemId, 'primary');
        let secondaryTableApi = getDataTableInstance(mapId, systemId, 'secondary');
        primaryTableApi.destroy();
        secondaryTableApi.destroy();
    };

    return {
        config: config,
        getModule: getModule,
        initModule: initModule,
        updateModule: updateModule,
        beforeHide: beforeHide,
        beforeDestroy: beforeDestroy,
        getAllSignatureNamesBySystem: getAllSignatureNamesBySystem
    };
});