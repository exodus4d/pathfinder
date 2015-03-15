define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'app/ui/system_info',
    'app/ui/system_graph',
    'app/ui/system_route',
    'app/ui/system_killboard',
    'datatablesTableTools',
    'xEditable',
    'app/map/map',
    'app/counter'
], function($, Config, Util, Render, bootbox) {

    'use strict';

    var currentMapData = [];                                                    // current map data

    var config = {
        dynamicElementWrapperId: 'pf-dialog-wrapper',                           // parent Element for dynamic content (dialogs,..)
        mapTabElementId: 'pf-map-tab-element',                                  // id for map tab element (tabs + content)
        mapTabBarId: 'pf-map-tabs',                                             // id for map tab bar
        mapTabIdPrefix: 'pf-map-tab-',                                          // id prefix for a map tab
        mapTabClass: 'pf-map-tab',                                              // class for a map tab
        mapTabLinkTextClass: 'nav-tabs-link',                                   // class for span elements in a tab
        mapTabContentClass: 'pf-map-tab-content',                               // class for tab content container
        mapTabContentSystemInfoClass: 'pf-map-tab-content-system',
        mapWrapperClass: 'pf-map-wrapper',                                      // scrollable
        mapClass: 'pf-map',                                                     // class for each map

        // dialogs
        signatureReaderDialogId: 'pf-signature-reader-dialog',                  // id for signature reader dialog

        // tables
        tableToolsClass: 'pf-table-tools',                                      // table toolbar
        tableToolsActionClass: 'pf-table-tools-action',                         // table toolbar action

        // TabContentStructure
        mapTabContentRow: 'pf-map-content-row',                                 // main row for Tab content (grid)
        mapTabContentCell: 'pf-map-content-col',                                // column
        mapTabContentCellFirst: 'pf-map-content-col-first',                     // first column
        mapTabContentCellSecond: 'pf-map-content-col-second',                   // second column

        // module info
        moduleClass: 'pf-module',                                               // class for each module

        // system info module
        systemInfoProgressScannedClass: 'pf-system-progress-scanned',           // progress bar scanned signatures

        // sig table module
        sigTableModuleClass: 'pf-sig-table-module',                             // module wrapper
        sigTableClass: 'pf-sig-table',                                          // Table class for all Signature Tables
        sigTableMainClass: 'pf-sig-table-main',                                 // Table class for main sig table
        sigTableEditText: 'pf-sig-table-edit-text',                             // class for editable fields (text)
        sigTableEditSigNameInput: 'pf-sig-table-edit-name-input',               // class for editable fields (input)
        sigTableEditSigTypeSelect: 'pf-sig-table-edit-type-select',             // class for editable fields (select)
        sigTableEditSigNameSelect: 'pf-sig-table-edit-name-select',             // class for editable fields (select)
        sigTableCounterClass: 'pf-sig-table-counter'                            // class for signature table counter
    };



    var mapTabChangeBlocked = false;                                            // flag for preventing map tab switch

    /**
     * get all maps for a maps module
     * @param mapModule
     * @returns {*}
     */
    $.fn.getMaps = function(){

        var maps = $(this).find('.' + config.mapClass);

        return maps;
    };

    /**
     * get the current active map for
     * @returns {*}
     */
    $.fn.getActiveMap = function(){

        var map = $(this).find('.active.' + config.mapTabContentClass + ' .' + config.mapClass);

        if(map.length === 0){
            map = false;
        }

        return map;
    };


    /**
     * get all TabElements in this map module
     * @returns {*}
     */
    var getTabElements = function(){
        return $('#' + config.mapTabBarId).find('a');
    };

    /**
     * set Tab Observer, events are triggered within map.js
     * @param mapContentModule
     */
    $.fn.setTabContentObserver = function(){

        return this.each(function(){
            // update Tab Content with system data information
            $(this).on('pf:updateSystemData', function(e, mapData){

                // collect all relevant data for SystemInfoElement
                var systemInfoData = {
                    systemData: $( mapData.system).getSystemData(),
                    mapId: parseInt( $( mapData.system).attr('data-mapid') )
                };

                drawSystemInfoElement($( e.target ), systemInfoData);
            });

        });
    };

    /**
     * open "signature reader" dialog for signature table
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
                        label: 'update signatures',
                        className: 'btn-primary',
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
     * draw signature table toolbar (add signature button, scan progress bar
     * @param systemData
     * @param emptySignatureData
     */
    $.fn.drawSignatureTableToolbar = function(systemData, emptySignatureData){

        var moduleElement = $(this);

        // add toolbar buttons for table -------------------------------------
        var tableToolbar = $('<div>', {
            class: config.tableToolsClass
        }).append(
                $('<button>', {
                    class: ['btn', 'btn-primary', 'btn-sm'].join(' '),
                    text: ' add signature',
                    type: 'button'
                }).on('click', function(e){
                    // show "add sig" div
                    var toolsElement = $(e.target).parents('.' + config.moduleClass).find('.' + config.tableToolsActionClass);
                    toolsElement.slideToggle( 100 );
                }).prepend(
                        $('<i>', {
                            class: ['fa', 'fa-plus', 'fa-fw'].join(' ')
                        })
                    )
            ).append(
                $('<button>', {
                    class: ['btn', 'btn-primary', 'btn-sm'].join(' '),
                    text: ' signature reader',
                    type: 'button'
                }).on('click', function(){
                    // show signature reader dialog
                    moduleElement.showSignatureReaderDialog(systemData);
                }).prepend(
                        $('<i>', {
                            class: ['fa', 'fa-clipboard', 'fa-fw'].join(' ')
                        })
                    )
            ).append(
                $('<button>', {
                    class: ['btn', 'btn-danger', 'btn-sm', 'pull-right'].join(' '),
                    text: ' clear signatures',
                    type: 'button'
                }).on('click', function(){
                    // delete all rows
                    bootbox.confirm('Delete all signature?', function(result) {
                        if(result){
                            var signatureTable = moduleElement.find('.' + config.sigTableMainClass);
                            signatureTable = $(signatureTable).DataTable();
                            var signatureCount = signatureTable.rows().data().length;
                            // clear all
                            signatureTable.clear().draw();

                            moduleElement.updateScannedSignaturesBar({showNotice: false});

                            Util.showNotify({title: 'Signatures cleared', text: signatureCount + ' signatures deleted', type: 'success'});
                        }
                    });
                }).prepend(
                        $('<i>', {
                            class: ['fa', 'fa-close', 'fa-fw'].join(' ')
                        })
                    )
            );

        moduleElement.prepend(tableToolbar);

        // add toolbar action for table -------------------------------------
        var tableToolbarAction = $('<div>', {
            class: config.tableToolsActionClass
        });

        // create "empty table for new signature
        var table = $('<table>', {
            class: ['display', 'compact', config.sigTableClass].join(' ')
        });

        tableToolbarAction.append(table);

        tableToolbar.after(tableToolbarAction);

        table.dataTable( {
            data: emptySignatureData,
            paging: false,
            ordering: false,
            info: false,
            searching: false
        } );

        table.makeEditable();

        // scanned signatures progress bar --------------------------------------
        var moduleConfig = {
            name: 'form/progress',
            position: tableToolbar,
            link: 'before',
            functions: {
                after: function(){
                    moduleElement.updateScannedSignaturesBar({showNotice: true});
                }
            }
        };

        var moduleData = {
            label: true,
            wrapperClass: config.systemInfoProgressScannedClass,
            class: ['progress-bar-success'].join(' '),
            percent: 0,
            headline: 'System scanned',
            headlineRight: ' ' // will be updated by js
        };

        Render.showModule(moduleConfig, moduleData);


        // event listener for global "paste" signatures into the page
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
     * draws a signature table
     * @param signatureData
     * @param systemInfoData
     * @returns {*}
     */
    $.fn.drawSignatureTable = function(signatureData, systemInfoData){

        var moduleElement = $(this);

        // create new signature table -------------------------------------------

        var table = $('<table>', {
            class: ['display', 'compact', config.sigTableClass, config.sigTableMainClass].join(' ')
        });

        moduleElement.append(table);

        // set event listener
        table.on( 'draw.dt', function () {
            // TODO maybe needet :D
        });

        var signatureTable = table.dataTable( {
            data: signatureData
        } );

        // make Table editable
        signatureTable.makeEditable(systemInfoData);

        return signatureTable;
    };

    /**
     * Updates a signature table, changes all signatures where name matches
     * add all new signatures as a row
     * @param signatureData
     */
    $.fn.updateSignatureTable = function(signatureData){

        var moduleElement = $(this);

        var tableData = moduleElement.getSignatureTableData();

        var notificationCounter = {
            added: 0,
            changed: 0,
            unchanged: 0
        };

        var tempGroupSelect = null;
        var tempNameSelect = null;

        for(var i = 0; i < signatureData.length; i++){
            for(var j = 0; j < tableData.length; j++){
                if(signatureData[i].name === tableData[j].name){

                    // update signature group
                    if(signatureData[i].groupId !== tableData[j].groupId){

                        tempGroupSelect = moduleElement.find('.' + config.sigTableEditSigTypeSelect + '[data-pk="' + tableData[j].id + '"]');
                        tempNameSelect = moduleElement.find('.' + config.sigTableEditSigNameSelect + '[data-pk="' + tableData[j].id + '"]');

                        $(tempGroupSelect).editable('setValue', signatureData[i].groupId);

                        // update signature name select
                        var systemType = $(tempGroupSelect).attr('data-systemtype');
                        var areaId = $(tempGroupSelect).attr('data-areaid');

                        // set new Options
                        var newSelectOptions = Util.getAllSignatureNames(systemType, areaId, signatureData[i].groupId);

                        $(tempNameSelect).editable('option', 'source', newSelectOptions);

                        $(tempNameSelect).editable('setValue', signatureData[i].typeId);

                        if(signatureData[i].typeId > 0){
                            $(tempNameSelect).editable('enable');
                        }else{
                            $(tempNameSelect).editable('disable');
                        }

                        notificationCounter.changed++;

                    }else if(signatureData[i].typeId !== tableData[j].typeId){

                        // update just the name
                        $(tempNameSelect).editable('setValue', signatureData[i].typeId);

                        if(signatureData[j].typeId > 0){
                            $(tempNameSelect).editable('enable');
                        }else{
                            $(tempNameSelect).editable('disable');
                        }

                        notificationCounter.changed++;
                    }else{
                        // nothing changed
                        notificationCounter.unchanged++;
                    }

                    // remove signature data -> all left signatures will be added later
                    signatureData.splice(i, 1);
                    i--; // decrement

                    break;
                }
            }
        }

        // add new signatures ===================================================
        var signatureTable = moduleElement.find('.' + config.sigTableMainClass);
        var signatureDataTable = $(signatureTable).DataTable();

        // TODO save NEW signatures and get them back with NEW ID :)
        var systemData = tempFunctionGetSystemData();

        // fake data for new signature table entry
        systemData.signatures = signatureData;

        var options = {
            action: {
                buttonClass: 'btn-danger',
                buttonIcon: 'fa-close'
            }
        };

        var newSignatureData = formatSignatureData(systemData, options);

        for(var k = 0; k < newSignatureData.length; k++){
            var row = signatureDataTable.row.add( newSignatureData[k] ).draw().nodes().to$();

            var tooltipData = {
                addedBy: 'Exodus 4D', //newSignatureData[k].addedBy,
                updatedBy: 'Exodus 4D' //newSignatureData[k].updatedBy
            };

            row.addRowTooltip( tooltipData );

            notificationCounter.added++;
        }

        signatureTable.makeEditable();

        // update signature bar
        moduleElement.updateScannedSignaturesBar({showNotice: true});

        // show Notification
        var notification = notificationCounter.added + ' added<br>';
        notification += notificationCounter.changed + ' changed<br>';
        notification += notificationCounter.unchanged + ' unchanged';
        Util.showNotify({title: 'Signatures updated', text: notification, type: 'success'});

    };

    /**
     * adds a popup tooltip with signature information to rows
     * @param data
     */
    $.fn.addRowTooltip = function(data){

        if(
            data.addedBy.length > 0 &&
            data.updatedBy.length > 0
        ){
            var tooltip = '<table>' +
                '<tr>' +
                '<td>Added</td>' +
                '<td>' + data.addedBy + '</td>' +
                '</tr>' +
                '<tr>' +
                '<td>Updated</td>' +
                '<td>' + data.updatedBy + '</td>' +
                '</tr>' +
                '</table>';

            $(this).attr('data-toggle', 'popover')
                .attr('data-trigger', 'hover')
                .attr('data-placement', 'bottom')
                .attr('data-html', 1)
                .attr('data-content', tooltip)
                .popover();
        }
    };

    /**
     * collect all data of all editable fields in a signature table
     * @returns {Array}
     */
    $.fn.getSignatureTableData = function(){

        var tableRows = $(this).find('.' + config.sigTableMainClass + ' tbody tr');

        var tableData = [];

        $.each(tableRows, function(i, tableRow){
            // get all editable fields per row
            var editableFields = $(tableRow).find('.editable');

            if(editableFields.length > 0){
                var values = $(editableFields).editable('getValue');

                // convert to lower for better compare options
                values.name = values.name.toLowerCase();

                // add pk for this row
                values.id = $(editableFields[0]).data('pk');

                tableData.push( values );
            }
        });

        return tableData;
    };


    /**
     * clears and updates the system info element (signature table, system info,...)
     * @param tabContentElement
     * @param systemInfoData
     */
    var drawSystemInfoElement = function(tabContentElement, systemInfoData){

        // get Table cell for system Info
        var firstCell = $(tabContentElement).find('.' + config.mapTabContentCellFirst);
        var secondCell = $(tabContentElement).find('.' + config.mapTabContentCellSecond);

        // update signature table module
        firstCell.drawSignatureTableModule(systemInfoData);

        // draw system info module
        firstCell.drawSystemInfoModule(systemInfoData.systemData);

        // draw system graph module
        firstCell.drawSystemGraphModule(systemInfoData.systemData);

        // update system routes module
        secondCell.drawSystemRouteModule(systemInfoData.systemData);

        // draw system killboard module
        secondCell.drawSystemKillboardModule(systemInfoData.systemData);
    };

    $.fn.drawSignatureTableModule = function(systemInfoData){

        // TODO replace with backend ajax request
        var systemData = tempFunctionGetSystemData(systemInfoData);
        var emptySystemData = $.extend({}, systemData); // copy object for manipulation

        // fake data for new signature table entry
        emptySystemData.signatures = [
            {
                id: 0,
                name: '',
                typeId: null,
                groupId: null,
                created: null,
                updated: null

            }];

        var signatureData = formatSignatureData(systemData, {});

        var options = {
            action: {
                buttonClass: 'btn-default',
                buttonIcon: 'fa-plus'
            }
        };

        var emptySignatureData = formatSignatureData(emptySystemData, options);

        // create new module container
        var moduleElement = $('<div>', {
            class: [config.moduleClass, config.sigTableModuleClass].join(' ')
        });

        $(this).append(moduleElement);

        // set default values for all signature "datatables"
        $.extend( $.fn.dataTable.defaults, {
            pageLength: -1,
            lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, 'All']],
            autoWidth: false,
            language: {
                emptyTable:  'No signatures added',
                zeroRecords: 'No signatures found',
                lengthMenu:  'Show _MENU_ signatures',
                info:        'Showing _START_ to _END_ of _TOTAL_ signatures'
            },
            columnDefs: [
                {
                    targets: 0,
                    //"orderData": 0,
                    orderable: true,
                    title: 'sig',
                    width: '30px'
                },{
                    targets: 1,
                    orderable: false,
                    title: 'group',
                    width: '50px'
                },{
                    targets: 2,
                    orderable: false,
                    title: "name/description"
                },{
                    targets: 3,
                    title: 'created',
                    width: '90px',
                    className: config.sigTableCounterClass
                },{
                    targets: 4,
                    title: "updated",
                    width: '90px',
                    className: config.sigTableCounterClass
                },{
                    targets: 5,
                    title: '',
                    orderable: false,
                    width: '10px',
                    class: 'text-center'
                }
            ]
        } );

        // draw signature table
        moduleElement.drawSignatureTable(signatureData, systemInfoData);

        // draw toolbar for signature table
        moduleElement.drawSignatureTableToolbar(systemData, emptySignatureData);

    };

    /**
     * update Progressbar for all scanned signatures in a system
     */
    $.fn.updateScannedSignaturesBar = function(options){

        var moduleElement = $(this);

        // get progress bar
        var progressBarWrapper = $(this).find('.' + config.systemInfoProgressScannedClass);
        var progressBar = $(progressBarWrapper).find('.progress-bar');
        var progressBarLabel = $(progressBarWrapper).find('.progress-label-right');

        var tableData = moduleElement.getSignatureTableData();

        var percent = 0;
        var progressBarType = 'progress-bar-danger';

        if(tableData){
            var sigCount = tableData.length;
            var sigIncompleteCount = 0;
            // check for  signatures without "type" -> these are un scanned signatures
            $.each(tableData, function(i, data){
                var typeId = parseInt(data.typeId);
                if(typeId === 0){
                    sigIncompleteCount++;
                }
            });

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
     * make a table editable (in-line-editor)
     * @param systemInfoData
     */
    $.fn.makeEditable = function(systemInfoData){

        var table = $(this);

        // default x-editable options for each field
        //$.fn.editable.defaults.url = '/post';
        $.fn.editable.defaults.ajaxOptions = {
            type: 'post',
            dataType: 'json'
        };

        // find editable fields
        var sigIdFields = table.find('.' + config.sigTableEditSigNameInput);
        var sigTypeFields = table.find('.' + config.sigTableEditSigTypeSelect);
        var sigNameFields = table.find('.' + config.sigTableEditSigNameSelect);

        // jump to "next" editable field on save
        var openNextEditDialogOnSave = function(fields, updateProgressBar){
            fields.on('save', {test: 1}, function(e, data){
                var that = this;
                setTimeout(function() {
                    var nextField = getNextEditableField(that);

                    $(nextField).editable('show');

                    // update scanning progressbar if sig "type" has changed
                    if($(e.target).hasClass(config.sigTableEditSigTypeSelect)){
                        $(that).parents('.' + config.moduleClass).updateScannedSignaturesBar({showNotice: true});
                    }
                }, 200);
            });
        };

        // get the next editable field
        var getNextEditableField = function(field){
            return $(field).closest('td').next().find('.editable');
        };

        /**
         * add map/system specific data for each editable field in the sig-table
         * @param params
         * @returns {*}
         */
        var modifyFieldParamsOnSend = function(params){

            params.systemId = systemInfoData.systemId;
            params.mapId = systemInfoData.mapId;

            return params;
        };

        // sigTableEditSigNameInput
        sigIdFields.editable({
            mode: 'popup',
            type: 'text',
            title: 'signature id',
            name: 'name',
            emptytext: '? ? ?',
            validate: function(value) {
                if($.trim(value) === '') {
                    return 'Signature id cant be empty';
                }
            },
            params: modifyFieldParamsOnSend
        });


        // cache signature groups -----------------------------------------------------
        var sigTypeCache = {};

        // Select sig type (master)
        sigTypeFields.editable({
            mode: 'popup',
            type: 'select',
            title: 'signature type',
            name: 'typeId',
            emptytext: 'unknown',
            params: modifyFieldParamsOnSend,
            source: function(){

                var systemType = $(this).attr('data-systemtype');
                var areaId = $(this).attr('data-areaid');

                var cacheKey = [systemType, areaId].join('_');

                // check for cached signature names
                if(sigTypeCache.hasOwnProperty( cacheKey )){
                    return sigTypeCache[cacheKey];
                }

                var availableTypes = {};

                // get all available Signature Types
                if(
                    Config.signatureTypes[systemType] &&
                    Config.signatureTypes[systemType][areaId]
                ){
                    // json object -> "translate" keys to names
                    var tempTypes = Config.signatureTypes[systemType][areaId];


                    availableTypes = Util.getSignatureGroupInfo('label');
                    // add empty option
                    availableTypes[0] = '';

                    availableTypes = sigTypeCache[cacheKey] = availableTypes;
                }

                return availableTypes;
            },
            success: function(response, newValue){

                // find related "name" select (same row) and change options
                var nameSelect = getNextEditableField(this);

                var systemType = $(this).attr('data-systemtype');
                var areaId = $(this).attr('data-areaid');

                // set new Options
                var newSelectOptions = Util.getAllSignatureNames(systemType, areaId, newValue);

                $(nameSelect).editable('option', 'source', newSelectOptions);

                $(nameSelect).editable('setValue', null);

                if(newValue > 0){
                    $(nameSelect).editable('enable');
                }else{
                    $(nameSelect).editable('disable');
                }
            }
        });

        // cache signature names -----------------------------------------------------------
        var sigNameCache = {};

        // Select sig name (slave: depends on sig type)
        sigNameFields.editable({
            mode: 'popup',
            type: 'select',
            title: 'signature name',
            name: 'groupId',
            emptytext: 'unknown',
            params: modifyFieldParamsOnSend,
            source: function(){

                var systemType = $(this).attr('data-systemtype');
                var areaId = $(this).attr('data-areaid');
                var groupId = $(this).attr('data-groupId');

                var cacheKey = [systemType, areaId, groupId].join('_');

                // check for cached signature names
                if(sigNameCache.hasOwnProperty( cacheKey )){
                    return sigNameCache[cacheKey];
                }

                var signatureNames = Util.getAllSignatureNames(systemType, areaId, groupId);

                // add empty option
                signatureNames[0] = '';

                // get all available Signature Names
                var availableSigs = sigNameCache[cacheKey] = signatureNames;

                return availableSigs;
            }
        });

        // open next field dialog
        openNextEditDialogOnSave(sigIdFields, true);
        openNextEditDialogOnSave(sigTypeFields, false);

        // set button observer (delete sig)
        $(this).find('.btn-danger').on('click', function(e){
            e.preventDefault();

            bootbox.confirm('Delete signature?', function(result) {
                if(result){
                    // get module
                    var moduleElement = $(e.target).parents('.' + config.moduleClass);

                    // get clicked dataTable object
                    var currentTable = moduleElement.find('.' + config.sigTableMainClass);

                    currentTable = $(currentTable).dataTable();

                    // delete signature row
                    currentTable.fnDeleteRow($(e.target).parents('tr'));

                    // update signature bar
                    moduleElement.updateScannedSignaturesBar({showNotice: false});

                    Util.showNotify({title: 'Signature deleted', type: 'success'});
                }
            });


        });

        // init signature counter
        $(this).find('.' + config.sigTableCounterClass + '[data-counter!="init"]').initSignatureCounter();



    };

    /**
     * formats all signature data for table
     * @param systemData
     * @returns {Array}
     */
    var formatSignatureData = function(systemData, options){

        var formattedData = [];

        if(
            systemData &&
            systemData.config &&
            systemData.config.id &&
            systemData.config.type === 'wh'
        ){
            // system data "should" be valid :)
            var systemSecurity = systemData.config.security;
            var systemType = systemData.config.type;


            var areaId = Util.getAreaIdBySecurity(systemSecurity);

            // areaId is required as a key for signature names
            if(areaId){

                $.each(systemData.signatures, function(i, data){

                    if(! data.created){
                        data.created = Math.round( new Date().getTime() / 1000 );
                    }

                    if(! data.updated){
                        data.updated = Math.round( new Date().getTime() / 1000 );
                    }

                    var tempData = [];

                    // set signature name
                    var sigName = '<a href="#" class="' + config.sigTableEditSigNameInput + '" ';
                    if(data.id > 0){
                        sigName += 'data-pk="' + data.id + '" ';
                    }
                    sigName += '>' + data.name + '</a>';

                    tempData.push(sigName);

                    var sigType = '<a href="#" class="' + config.sigTableEditSigTypeSelect + '" ';
                    if(data.id > 0){
                        sigType += 'data-pk="' + data.id + '" ';
                    }
                    sigType += 'data-systemType="' + systemType + '" ';
                    sigType += 'data-areaId="' + areaId + '" ';
                    sigType += 'data-value="' + data.groupId + '" ';
                    sigType += '></a>';

                    // set signature group id -----------------------------------------------
                    tempData.push( sigType );

                    var sigElement = '<a href="#" class="' + config.sigTableEditSigNameSelect + '" ';
                    if(data.id > 0){
                        sigElement += 'data-pk="' + data.id + '" ';
                    }

                    // set disabled if sig type is not selected
                    if(data.groupId < 1){
                        sigElement += 'data-disabled="1" ';
                    }

                    sigElement += 'data-systemType="' + systemType + '" ';
                    sigElement += 'data-areaId="' + areaId + '" ';
                    sigElement += 'data-groupId="' + data.groupId + '" ';
                    sigElement += 'data-value="' + data.typeId + '" ';
                    sigElement += '></a>';

                    // set signature type id ---------------------------------------------
                    tempData.push( sigElement );

                    // set Sig created
                    tempData.push( data.created );

                    // set Sig updated
                    tempData.push( data.updated );

                    // action icon
                    var actionButtonClass = 'btn-danger';
                    var actionButtonIcon = 'fa-close';
                    if(options.action){
                        actionButtonClass = options.action.buttonClass;
                        actionButtonIcon = options.action.buttonIcon;
                    }

                    var deleteButton = '<a class="btn ' + actionButtonClass + ' btn-xs" href="#">';
                    deleteButton += '&nbsp;<i class="fa ' + actionButtonIcon + '"></i>&nbsp;';
                    deleteButton += '</a>';

                    tempData.push( deleteButton );


                    formattedData.push(tempData);
                });
            }

        }



        return formattedData;
    };


    /**
     * TODO delete function !!!!!!!
     */
    var tempFunctionGetSystemData = function(){

        var data = {
            config: {
                id: 2,
                name: 'J150020',
                alias: 'Polaris',
                effect: 'magnetar',
                security: 'C6',
                static: [{
                    lifetime: 24
                }],
                type: 'wh'
            },
            signatures: [
                {
                    id: 2,
                    name: 'gdf',
                    typeId: 1,
                    groupId: 2,
                    created: 1325376000,
                    updated: 1415215936,
                    createdBy: 'Exodus4D',
                    updatedBy: 'Exodus4D'
                },{
                    id: 6,
                    name: 'hfs',
                    typeId: 0,
                    groupId: 1,
                    created: 1415989953,
                    updated: 1415215936,
                    createdBy: 'Exodus4D',
                    updatedBy: 'Exodus4D'
                },{
                    id: 8,
                    name: 'hfg',
                    typeId: 1,
                    groupId: 1,
                    created: 1415215936,
                    updated: 1415215936,
                    createdBy: 'Exodus4D',
                    updatedBy: 'Exodus4D'
                },{
                    id: 12,
                    name: 'lld',
                    typeId: 1,
                    groupId: 1,
                    created: 1415215936,
                    updated: 1415215936,
                    createdBy: 'Exodus4D',
                    updatedBy: 'Exodus4D'
                },{
                    id: 13,
                    name: 'dge',
                    typeId: 1,
                    groupId: 1,
                    created: 1394613252,
                    updated: 1415215936,
                    updatedBy: 'Exodus4D'

                },{
                    id: 14,
                    name: 'exs',
                    typeId: 1,
                    groupId: 1,
                    created: 1415215936,
                    updated: 1415215936,
                    createdBy: 'Exodus4D',
                    updatedBy: 'Exodus4D'
                },{
                    id: 15,
                    name: 'cvs',
                    typeId: 3,
                    groupId: 1,
                    created: 1415215936,
                    updated: 1386934983,
                    createdBy: 'Exodus4D',
                    updatedBy: 'Exodus4D'
                },{
                    id: 16,
                    name: 'ggd',
                    typeId: 0,
                    groupId: 0,
                    created: 1415215936,
                    updated: 1415215936,
                    createdBy: 'Exodus4D',
                    updatedBy: 'Exodus4D'
                },{
                    id: 18,
                    name: 'okd',
                    typeId: 1,
                    groupId: 1,
                    created: 1415215936,
                    updated: 1394613252,
                    createdBy: 'Exodus4D',
                    updatedBy: 'Exodus4D'
                },{
                    id: 8,
                    name: 'dbe',
                    typeId: 3,
                    groupId: 1,
                    created: 1415215936,
                    updated: 1415215936,
                    createdBy: 'Exodus4D',
                    updatedBy: 'Exodus4D'
                },{
                    id: 20,
                    name: 'asw',
                    typeId: 0,
                    groupId: 3,
                    created: 1415215936,
                    updated: 1386934983,
                    createdBy: 'Exodus4D',
                    updatedBy: 'Exodus4D'
                },{
                    id: 22,
                    name: 'nfg',
                    typeId: 2,
                    groupId: 2,
                    created: 1415215936,
                    updated: 1415215936,
                    createdBy: 'Exodus4D',
                    updatedBy: 'Exodus4D'
                }
            ]

        };


        return data;
    };


    /**
     * updates only visible/active map module
     * @param userData
     * @returns {boolean}
     */
    var test = 1
    $.fn.updateMapModuleData = function(userData){

        var mapModule = $(this);

        test++;
        // get all active map elements for module
        var mapElement = mapModule.getActiveMap();

        var currentUserData = null;

        // current user data
        if(userData.currentUserData){
            currentUserData = userData.currentUserData;
        }

        if(mapElement !== false){
            var mapId = mapElement.data('id');

            //var tempMapUserData = null;
            // get user data for each active map
            var tempMapUserDataClone = null;

            for(var j = 0; j < userData.mapUserData.length; j++){
                //var tempMapData = userData.mapUserData[j];
                var tempMapData = JSON.parse(JSON.stringify(userData.mapUserData[j]));
                if(tempMapData.config.id === mapId){
                    // map userData found

                    // clone object (pass by value) due to object manipulation
                    tempMapUserDataClone = JSON.parse(JSON.stringify(tempMapData));

                    // TODO remove !!!!
                    if( (test % 2) === 0){
                        tempMapUserDataClone.data.systems[0].user.push({
                            id: 7,
                            name: 'Lijama',
                            ship: {
                                id: 59,
                                name: 'Archon'
                            },
                            status: 'corp'
                        })
                    }else if((test % 3) === 0){
                        tempMapUserDataClone.data.systems = new Array();

                    }

                    break;
                }
            }

            // update map
            if(tempMapUserDataClone){
                mapElement.updateUserData(tempMapUserDataClone, currentUserData);
            }
        }

        return true;
    };

    /**
     * load all structure elements into a TabsContent div (tab body)
     */
    $.fn.initContentStructure = function(){

        return this.each(function(){
            // init bootstrap Grid
            var contentStructure = $('<div>', {
                class: ['row', config.mapTabContentRow].join(' ')
            }).append(
                    $('<div>', {
                        class: ['col-xs-12', 'col-md-8', config.mapTabContentCellFirst, config.mapTabContentCell].join(' ')
                    })
                ).append(
                    $('<div>', {
                        class: ['col-xs-12', 'col-md-4', config.mapTabContentCellSecond, config.mapTabContentCell].join(' ')
                    })
                );


            // append grid structure
            $(this).append(contentStructure);
        });

    };

    var getTabElement = function(options){

        var tabElement = $('<div>', {
            id: config.mapTabElementId
        });

        var tabBar = $('<ul>', {
            class: ['nav', 'nav-tabs'].join(' '),
            id: options.barId
        }).attr('role', 'tablist');

        var tabContent = $('<div>', {
            class: 'tab-content'
        }).attr('data-map-tabs', options.barId);

        tabElement.append(tabBar);
        tabElement.append(tabContent);

        return tabElement;
    };

    /**
     * set data for a map tab, or update an existing map tab with new data
     * @param options
     */
    $.fn.updateTabData = function(options){
        var tabElement = $(this);

        // set main data
        tabElement.data('map-id', options.id).data('updated', options.updated);

        // change tab link
        tabElement.attr('href', '#' + config.mapTabIdPrefix + options.id);

        // change map icon
        tabElement.find('i').removeClass().addClass(['fa', 'fa-fw', options.icon].join(' '));

        // change map name label
        tabElement.find('.' + config.mapTabLinkTextClass).text(options.name);

        // change tabClass
        var listElement = tabElement.parent();
       tabElement.parent().removeClass().addClass([config.mapTabClass, options.type.classTab ].join(' '));
        if(options.right === true){
            listElement.addClass('pull-right');
        }
    };


    /**
     * add a new tab to tab-map-module end returns the new objects
     * @param options
     * @returns {{listElement: (*|void), contentElement: (*|HTMLElement)}}
     */
    $.fn.addTab = function(options){

        var tabElement = $(this);
        var tabBar = tabElement.find('ul.nav-tabs');
        var tabContent = tabElement.find('div.tab-content');

        var listElement = $('<li>').attr('role', 'presentation');

        if(options.active === true){
            listElement.addClass('active');
        }

        if(options.right === true){
            listElement.addClass('pull-right');
        }

        // link element -------
        var linkElement = $('<a>').attr('role', 'tab');

        // icon element ------
        var iconElement = $('<i>');

        // text element -----
        var textElement = $('<span>', {
            class: config.mapTabLinkTextClass
        });

        var newListElement = listElement.append(
            linkElement.append(iconElement).append(textElement)
        );

        tabBar.append( newListElement );

        // update Tab element -> set data
        linkElement.updateTabData(options);

        // tabs content ====================================
        var contentElement = $('<div>', {
            id: config.mapTabIdPrefix + options.id,
            class: options.contentClasses.join(' ')
        });

        contentElement.addClass('tab-pane');

        if(options.active === true){
            contentElement.addClass('active');
        }

        tabContent.append(contentElement);


        // init tab =========================================================
        linkElement.on('click', function(e){
            e.preventDefault();

            // callback function after tab switch
            function switchTabCallback(mapElement, tabLinkElement){
                tabLinkElement.tab('show');
                // unfreeze map
                mapElement.data('frozen', false);
                return false;
            }

            if(mapTabChangeBlocked === false){

                var tabLinkElement = $(this);
                var mapId = tabLinkElement.data('map-id');

                // ignore "add" tab. no need for map change
                if(mapId > 0){
                    var mapElement = $('#' + config.mapTabElementId).getActiveMap();

                    if(mapId !== mapElement.data('id')){
                        // block tabs until switch is done
                        mapTabChangeBlocked = true;

                        // freeze active map -> no user data update while map switch
                        mapElement.data('frozen', true);

                        // hide current map with animation
                        mapElement.visualizeMap('hide', function(){
                            // un-block map tabs
                            mapTabChangeBlocked = switchTabCallback(mapElement, tabLinkElement);
                        });
                    }
                }else{
                    tabLinkElement.tab('show');
                }

            }
        });


        return {
            listElement: newListElement,
            contentElement: contentElement
        };
    };

    /**
     * deletes a map tab for a given map id
     * @param mapId
     */
    $.fn.deleteTab = function(mapId){

        var tabElement = $(this);

        var linkElement = tabElement.find('a[href="#' + config.mapTabIdPrefix + mapId + '"]');

        var deletedTabName = '';

        if(linkElement.length > 0){
            deletedTabName = linkElement.find('.' + config.mapTabLinkTextClass).text();

            var liElement = linkElement.parent();
            var contentElement = tabElement.find('div[id="' + config.mapTabIdPrefix + mapId + '"]');

            var findNewActiveTab = false;
            // check if liElement was active
            if(liElement.hasClass('active')){
                // search any remaining li element and set active
                findNewActiveTab = true;
            }

            liElement.remove();
            contentElement.remove();

            if(findNewActiveTab === true){
                tabElement.find('a:first').tab('show');
            }
        }

        return deletedTabName;
    };

    /**
     * get current map data for a map id
     * @param mapId
     * @returns {boolean}
     */
    var getMapDataById = function(mapId){

        var mapData = false;

        for(var i = 0; i < currentMapData.length; i++){
            if(currentMapData[i].config.id === mapId){
                mapData = currentMapData[i];
                break;
            }
        }

        return mapData;
    };

    /**
     * load/update map module into element (all maps)
     * @param mapData
     * @returns {boolean}
     */
    $.fn.updateMapModule = function(mapData){

        if(mapData.length === 0){
            return true;
        }


        // update current map data
        currentMapData = mapData;

        // temp store current map data to prevent data-change while function execution!
        var tempMapData = currentMapData;

        var mapModuleElement = $(this);

        // check if tabs module is already loaded
        var tabMapElement = $('#' + config.mapTabElementId);

        // check if tabs have changed
        var tabsChanged = false;

        if(tabMapElement.length > 0){
            // tab element already exists
            var tabElements = getTabElements();

            // mapIds that are currently active
            var activeMapIds = [];

            // check whether a tab/map is still active
            for(var i = 0; i < tabElements.length; i++){
                var tabElement = $(tabElements[i]);
                var mapId = tabElement.data('map-id');

                if(mapId > 0){
                    var tabMapData = getMapDataById(mapId);

                    if(tabMapData !== false){
                        // map data available ->
                        activeMapIds.push(mapId);

                        // check for map data change and update tab
                        if(tabMapData.config.updated !== tabElement.data('updated')){
                            tabElement.updateTabData(tabMapData.config);
                        }

                    }else{
                        // map data not available -> remove tab
                        var deletedTabName = tabMapElement.deleteTab(mapId);

                        tabsChanged = true;

                        if(deletedTabName.length > 0){
                            Util.showNotify({title: 'Map removed', text: deletedTabName + ' deleted', type: 'warning'});
                        }
                    }
                }
            }

            // add new tabs for new maps
            $.each(tempMapData, function(i, data){

                if( activeMapIds.indexOf( data.config.id ) === -1 ){
                    // add new map tab

                    var tabOptions = {
                        id: parseInt( data.config.id ),
                        type: data.config.type,
                        contentClasses: [config.mapTabContentClass],
                        active: false,
                        icon: data.config.icon,
                        name: data.config.name,
                        right: false,
                        updated: data.config.updated
                    };

                    var newTabElements = tabMapElement.addTab(tabOptions);

                    // set observer for manually triggered map events
                    newTabElements.contentElement.setTabContentObserver();

                    // load all the structure elements for the new tab
                    newTabElements.contentElement.initContentStructure();

                    tabsChanged = true;

                    Util.showNotify({title: 'Map added', text: data.config.name + ' added', type: 'success'});
                }

            });

            // get current active map
            var activeMapId = Util.getMapModule().getActiveMap().data('id');
            var activeMapData = getMapDataById(activeMapId);

            if(activeMapData !== false){
                // update active map with new mapData
                var currentTabContentElement = $('#' + config.mapTabIdPrefix + activeMapId);
                $( currentTabContentElement).loadMap( activeMapData, {} );
            }
        }else{
            // create Tab Element

            tabsChanged = true;

            var options = {
                barId: config.mapTabBarId
            };

            tabMapElement = getTabElement(options);

            // add new tab for each map
            for(var j = 0; j < tempMapData.length; j++){

                var data = tempMapData[j];

                var activeTab = false;
                if(j === 0){
                    activeTab = true;
                }

                var tabOptions = {
                    id: parseInt( data.config.id ),
                    type: data.config.type,
                    contentClasses: [config.mapTabContentClass],
                    active: activeTab,
                    icon: data.config.icon,
                    name: data.config.name,
                    right: false,
                    updated: data.config.updated
                };

                tabMapElement.addTab(tabOptions);

            }

            // add "add" button
            var tabAddOptions = {
                id: 0,
                type: {
                    classTab: Util.getInfoForMap( 'standard', 'classTab')
                },
                contentClasses: [config.mapTabContentClass],
                icon: 'fa-plus',
                name: 'add',
                right: true
            };

            tabMapElement.addTab(tabAddOptions);


            mapModuleElement.prepend(tabMapElement);

            // ==============================================================

            // this new created module
            var tabContentElements = tabMapElement.find('.' + config.mapTabContentClass);

            // set observer for manually triggered map events
            tabContentElements.setTabContentObserver();

            // load all the structure elements for ALL Tab Content Body
            tabContentElements.initContentStructure();

            // load first map i in first tab content container
            $( tabContentElements[0] ).loadMap( tempMapData[0], {showAnimation: true} );
        }

        if(tabsChanged === true){

            // remove previous event handlers
            var allTabElements = getTabElements();
            allTabElements.off('show.bs.tab');
            allTabElements.off('shown.bs.tab');
            allTabElements.off('hide.bs.tab');


            // check for "new map" action before tap-change
            allTabElements.on('show.bs.tab', function (e) {
                var mapId = $(e.target).data('map-id');

                if(mapId === 0){
                    // add new Tab selected
                    $(document).trigger('pf:menuEditMap', {newMap: true});
                    e.preventDefault();
                }
            });

            // load new map right after tab-change
            allTabElements.on('shown.bs.tab', function (e) {
                var mapId = $(e.target).data('map-id');
                var tabMapData = getMapDataById(mapId);

                if(tabMapData !== false){
                    // load map
                    var currentTabContentElement = $('#' + config.mapTabIdPrefix + mapId);

                    $( currentTabContentElement).loadMap( tabMapData, {showAnimation: true} );

                    // "wake up" scrollbar for map and get previous state back
                    var scrollableElement = currentTabContentElement.find('.' + config.mapWrapperClass);
                    $(scrollableElement).mCustomScrollbar( 'update');
                }else{
                    // no map data found -> remove tab
                    tabMapElement.deleteTab(mapId);
                }
            });

            allTabElements.on('hide.bs.tab', function (e, a) {

                var newMapId = $(e.relatedTarget).data('map-id');
                var oldMapId = $(e.target).data('map-id');

                // disable map if new map is selected -> not "add button"
                if(newMapId > 0){

                    var currentTabContentElement = $('#' + config.mapTabIdPrefix + oldMapId);

                    // disable scrollbar for map that will be hidden. "freeze" current state
                    var scrollableElement = currentTabContentElement.find('.' + config.mapWrapperClass);
                    $(scrollableElement).mCustomScrollbar( 'disable' );
                }
            });
        }

        return true;
    };

    /**
     * collect all data for export/save from each active map in the map module
     * @returns {Array}
     */
    $.fn.getMapModuleData = function(){

        // get all active map elements for module
        var mapElements = $(this).getMaps();

        var data = [];
        for(var i = 0; i < mapElements.length; i++){

            var mapData = $(mapElements[i]).getMapData(false);

            if(mapData !== false){
                data.push(mapData);
            }
        }

        return data;
    };

});