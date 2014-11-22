define(['jquery', 'app/util', 'app/render', 'bootbox', 'datatables', 'xEditable', 'app/map/map', 'customScrollbar', 'app/counter'], function($, Util, Render, bootbox) {

    "use strict";

    var config = {
        dynamicElementWrapperId: 'pf-dialog-wrapper',                           // parent Element for dynamic content (dialoges,..)
        mapTabBarId: 'pf-map-tabs',
        mapTabIdPrefix: 'pf-map-tab-',
        mapTabClass: 'pf-map-tab',
        mapTabContentClass: 'pf-map-tab-content',
        mapTabContentSystemInfoClass: 'pf-map-tab-content-system',
        mapWrapperClass: 'pf-map-wrapper',                                      // scrollable
        mapClass: 'pf-map',                                                     // class for each map
        newMapDialogId: 'pf-map-new-dialog',

        // TabContentStructure
        mapTabContentRow: 'pf-map-content-row',                                 // main row for Tab content (grid)
        mapTabContentCell: 'pf-map-content-col',                                // column
        mapTabContentCellFirst: 'pf-map-content-col-first',                     // first column
        mapTabContentCellSecond: 'pf-map-content-col-second',                   // second column

        // module info
        moduleClass: 'pf-module',                                               // class for each module

        // system info module
        systemInfoModuleClass: 'pf-system-info-module',                         // module wrapper
        systemInfoRoutesClass: 'pf-system-info-routes',                         // wrapper for trade hub routes
        systemInfoRoutesTableClass: 'pf-system-route-table',                    // class for route tables
        systemInfoRoutesTableRowPrefix: 'pf-system-info-routes-row-',           // prefix class for a row in the route table
        systemSecurityClassPrefix: 'pf-system-security-',                       // prefix class for system security level (color)

        systemInfoProgressScannedClass: 'pf-system-progress-scanned',           // progress bar scanned signatures

        // sig table module
        sigTableModuleClass: 'pf-sig-table-module',                             // module wrapper
        sigTableToolsClass: 'pf-sig-table-tools',                               // table toolbar
        sigTableToolsActionClass: 'pf-sig-table-tools-action',                  // table toolbar action
        sigTableClass: 'pf-sig-table',                                          // Table class for all Signature Tables
        sigTableMainClass: 'pf-sig-table-main',                                 // Table class for main sig table
        sigTableEditText: 'pf-sig-table-edit-text',                             // class for editable fields (text)
        sigTableEditSigNameInput: 'pf-sig-table-edit-name-input',               // class for editable fields (input)
        sigTableEditSigTypeSelect: 'pf-sig-table-edit-type-select',             // class for editable fields (select)
        sigTableEditSigNameSelect: 'pf-sig-table-edit-name-select',             // class for editable fields (select)
        sigTableCounterClass: 'pf-sig-table-counter',                           // class for signature table counter

        // map types
        mapTypes: [
            {type: 'default', label: 'default', class: 'pf-map-type-default'},
            {type: 'global', label: 'global', class: 'pf-map-type-global'},
            {type: 'alliance', label: 'alliance', class: 'pf-map-type-alliance'},
            {type: 'private', label: 'private', class: 'pf-map-type-private'}
        ],

        // map scopes
        mapScopes: [
            {scope: 'wormhole', label: 'W-Space'}
        ],

        mapIcons: [
            {class: 'fa-desktop', label: 'desktop'},
            {class: 'fa-bookmark', label: 'bookmark'},
            {class: 'fa-cube', label: 'cube'},
            {class: 'fa-warning', label: 'warning'},
            {class: 'fa-plane', label: 'plane'},
            {class: 'fa-rocket', label: 'rocket'}
        ],

        // Signature Type
        signatureTypes: {
            wh: { // system type
                1: {    // C1 (area id)
                    1: {    // Combat
                        1: 'Perimeter Ambush Point',
                        2: 'Perimeter Camp',
                        3: 'Phase Catalyst Node',
                        4: 'The Line'
                    },
                    2: {    // Relict
                        1: 'Forgotten Perimeter Coronation Platform'
                    },
                    3: {    // Data
                        1: 'Unsecured Perimeter Amplifier ',
                        2: 'Unsecured Perimeter Information Center '
                    }
                },
                2: {    // C2
                    1: {    // Combat
                        1: 'Perimeter Checkpoint',
                        2: 'Perimeter Hangar',
                        3: 'The Ruins of Enclave Cohort 27',
                        4: 'Sleeper Data Sanctuary'
                    },
                    2: {    // Relict
                        1: 'Forgotten Perimeter Gateway',
                        2: 'Forgotten Perimeter Habitation Coils'
                    },
                    3: {    // Data
                        1: 'Unsecured Perimeter Comms Relay',
                        2: 'Unsecured Perimeter Transponder Farm '
                    }
                },
                3: {    // C3
                    1: {    // Combat
                        1: 'Fortification Frontier Stronghold',
                        2: 'Outpost Frontier Stronghold',
                        3: 'Solar Cell',
                        4: 'The Oruze Construct'
                    },
                    2: {    // Relict
                        1: 'Forgotten Frontier Quarantine Outpost',
                        2: 'Forgotten Frontier Recursive Depot'
                    },
                    3: {    // Data
                        1: 'Unsecured Frontier Database',
                        2: 'Unsecured Frontier Receiver'
                    }
                },
                4: {    // C4
                    1: {    // Combat
                        1: 'Frontier Barracks',
                        2: 'Frontier Command Post',
                        3: 'Integrated Terminus',
                        4: 'Sleeper Information Sanctum'
                    },
                    2: {    // Relict
                        1: 'Forgotten Frontier Conversion Module',
                        2: 'Forgotten Frontier Evacuation Center'
                    },
                    3: {    // Data
                        1: 'Unsecured Frontier Digital Nexus',
                        2: 'Unsecured Frontier Trinary Hub'
                    }
                },
                5: {    // C5
                    1: {    // Combat
                        1: 'Core Garrison',
                        2: 'Core Stronghold',
                        3: 'Oruze Osobnyk',
                        4: 'Quarantine Area'
                    },
                    2: {    // Relict
                        1: 'Forgotten Core Data Field',
                        2: 'Forgotten Core Information Pen'
                    },
                    3: {    // Data
                        1: 'Unsecured Frontier Enclave Relay',
                        2: 'Unsecured Frontier Server Bank'
                    }
                },
                6: {    // C6
                    1: {    // Combat
                        1: 'Core Citadel',
                        2: 'Core Bastion',
                        3: 'Strange Energy Readings',
                        4: 'The Mirror'
                    },
                    2: {    // Relict
                        1: 'Forgotten Core Assembly Hall',
                        2: 'Forgotten Core Circuitry Disassembler'
                    },
                    3: {    // Data
                        1: 'Unsecured Core Backup Array',
                        2: 'Unsecured Core Emergence '
                    }
                }
            }
        }


    };

    /**
     * get map type class for a type
     * @param type
     * @returns {string}
     */
    var getMapTypeClassForType = function(type){

        var typeClass= '';

        $.each(config.mapTypes, function(i, typeData){
            if(typeData.type === type){
               typeClass = typeData.class;
            }
        });

        return typeClass;
    };

    /**
     * shows the add new map dialog
     */
    var showNewMapDialog = function(){

        // confirm dialog
        var moduleConfig = {
            name: 'modules/map_dialog',
            position: $('#' + config.dynamicElementWrapperId),
            link: 'after',
            functions: {
                after: function(){
                    $( "#" + config.newMapDialogId).dialog({
                        modal: true,
                        resizable: false,
                        buttons: {
                            'Cancel': function(){
                                $(this).dialog('close');
                            },
                            'Add map': function(){

                                // get form Values
                                var form = $('#' + config.newMapDialogId).find('form');

                                var  newMapData = {};

                                $.each(form.serializeArray(), function(i, field) {
                                    newMapData[field.name] = field.value;
                                });

                                saveMapData(newMapData);

                                $(this).dialog('close');
                            }
                        }
                    });
                }
            }
        };

        var moduleData = {
            id: config.newMapDialogId,
            title: 'Add new map',
            scope: config.mapScopes,
            type: config.mapTypes,
            icon: config.mapIcons
        };

        Render.showModule(moduleConfig, moduleData);
    };

    var saveMapData = function(mapData){

        // TODO: save map
        console.log(mapData);
    };

    /**
     * get all maps for a maps module
     * @param mapModule
     * @returns {*}
     */
    var getMaps = function(mapModule){

        var maps = $(mapModule).find('.' + config.mapClass);

        return maps;
    };


    /**
     * get all TabElements in this map module
     * @returns {*}
     */
    var getTabElements = function(){
        return $('#' + config.mapTabBarId).find('a[data-toggle="tab"]');
    };

    /**
     * get all Tabs for a maps module
     * @param mapModule
     * @returns {*}
     */
    var getTabContentElements = function(mapContentModule){

        var tabs = $(mapContentModule).find('.' + config.mapTabContentClass );

        return tabs;
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
                    systemId: parseInt( $( mapData.system).attr('data-id') ),
                    mapId: parseInt( $( mapData.system).attr('data-mapid') )
                };

                updateSystemInfoElement($( e.target ), systemInfoData);
            });

            // highlite a mapTab
            $(this).on('pf:highlightTab', function(e, data){
                // update Tab Content with system data information
                highlightTab(e.target, data);

            });

        });
    };

    /**
     * highlight a Tab in this module e.g. when user has an active pilot in this map
     * @param contentElement
     * @param data
     */
    var highlightTab = function(contentElement, data){
        var tabElements = getTabElements();

        contentElement = $(contentElement);

        // look for related tab element
        $.each(tabElements, function(i, tabElement){

            tabElement = $(tabElement);

            if(tabElement.attr('data-map-index') === contentElement.attr('data-map-index')){

                tabElement.tooltip({placement: 'top', trigger: 'manual'});

                tabElement.attr('title', '');
                tabElement.tooltip('hide');

                // check if this tab needs to be highlighted
                if(data.system){
                    // destroy empty tooltip end create new
                    tabElement.tooltip('destroy');
                    tabElement.attr('title', $(data.system).data('name'));
                    tabElement.tooltip('show');

                    // scroll to system
                    contentElement.find('.' + config.mapWrapperClass).scrollTo( '#' + data.system.id );
                }
               return false;
           }
        });

    };

    /**
     * draw signature table toolbar (add signature button, scan progress bar
     * @param emptySignatureData
     */
    $.fn.drawSignatureTableToolbar = function(emptySignatureData){

        var systemCell = $(this);

        // add toolbar buttons for table -------------------------------------
        var tableToolbar = $('<div>', {
            class: config.sigTableToolsClass
        }).append(
                $('<a>', {
                    class: ['btn', 'btn-primary', 'btn-sm'].join(' '),
                    text: ' add signature'
                }).on('click', function(e){
                    // show "add sig" div
                    var toolsElement = $(e.target).parents('.' + config.moduleClass).find('.' + config.sigTableToolsActionClass);
                    toolsElement.slideToggle( 100 );
                }).prepend(
                        $('<i>', {
                            class: ['fa', 'fa-plus', 'fa-fw'].join(' ')
                        })
                    )
            );

        systemCell.prepend(tableToolbar);

        // add toolbar action for table -------------------------------------
        var tableToolbarAction = $('<div>', {
            class: config.sigTableToolsActionClass
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
                    systemCell.updateScannedSignaturesBar();
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


    };


    // draw signature table
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
    var updateSystemInfoElement = function(tabContentElement, systemInfoData){

        // get Table cell for system Info
        var systemCell = $(tabContentElement).find('.' + config.mapTabContentCellFirst);

        // clear systemCell
        systemCell.empty();

        // update signature table module
        systemCell.updateSignatureTableModule(systemInfoData);

        // update system info module
        systemCell.updateSystemInfo(systemInfoData);
    };

    $.fn.updateSignatureTableModule = function(systemInfoData){

        // TODO replace with backend ajax request
        var systemData = tempFunctionGetSystemData(systemInfoData);
        var emptySystemData = $.extend({}, systemData); // copy object for manipulation

        // fake data for new signature table entry
        emptySystemData.signatures = [
            {
                id: 0,
                name: '',
                typeId: null,
                sigTypeId: null,
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

        // check if signatures exist
        if(signatureData.length > 0){

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
                        title: 'type',
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
            moduleElement.drawSignatureTableToolbar(emptySignatureData);


        }
    };

    /**
     * update systeminfo
     */
    $.fn.updateSystemInfo = function(systemInfoData){


        // TODO replace by AJAX
        if(systemInfoData.systemId === 30002979){
            var system =  {
                id: 30002979,
                //name: 'J150020',
                name: 'Tararan',
                alias: '',
                effect: '',
                security: 'L',
                trueSec: 0.3,
                region: {
                    id: '10000036',
                    name: 'Devoid'
                },
                constellation: {
                    id: '20000436',
                    name: 'Jayai'
                },
                type: 'k-space'
            };
        }else{
            var system =  {
                id: 2,
                name: 'J150020',
                alias: 'Polaris',
                effect: 'magnetar',
                security: 'C6',
                trueSec: -1,
                region: {
                    id: '12345',
                    name: 'F-R00030'
                },
                constellation: {
                    id: '678990',
                    name: 'F-C00298'
                },
                static: [{
                    security: 'C6',
                    name: ' W237',
                    lifetime: 24
                }],
                //type: 'wh'
                type: 'wh'
            };
        }




        // create new module container
        var moduleElement = $('<div>', {
            class: [config.moduleClass, config.systemInfoModuleClass].join(' ')
        });

        $(this).prepend(moduleElement);

        // confirm dialog
        var moduleConfig = {
            name: 'modules/system_info',
            position: moduleElement,
            link: 'append',
            functions: {
                after: function(){
                    // init tooltips
                    var tooltipElements = $('.' + config.systemInfoModuleClass + ' [data-toggle="tooltip"]');
                    tooltipElements.tooltip();

                    // load trade routes
                    if(system.type !== 'wh'){
                        $(moduleElement).find('.' + config.systemInfoRoutesClass).updateSystemInfoRoutes(system.name, ['Jita', 'Amarr', 'Rens', 'Dodixie']);
                    }


                }
            }
        };


        // add security class for statics
        if(system.static){
            $.each(system.static, function(i, staticWH){
               system['static'][i]['class'] = Util.getSecurityClassForSystem( staticWH.security );
            });
        }


        var moduleData = {
            system:  system,
            securityClass: Util.getSecurityClassForSystem( system.security ),
            trueSecClass: Util.getTrueSecClassForSystem( system.trueSec ),
            effectName: Util.getEffectInfoForSystem(system.effect, 'name'),
            effectClass: Util.getEffectInfoForSystem(system.effect, 'class')
        };

        Render.showModule(moduleConfig, moduleData);

    };

    $.fn.updateSystemInfoRoutes = function(systemFrom, systemsTo){

        // TODO get cached routes from backend

        var baseUrl = 'http://api.eve-central.com/api/route/from/';

        var wrapperElement = $(this);

        // crate new route table
        var table = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border', config.systemInfoRoutesTableClass].join(' ')
        });

        wrapperElement.append( $(table) );

        // init empty table
        var routesTable = table.DataTable( {
           paging: false,
           ordering: true,
           info: false,
           searching: false,
           hover: false,

           //autoWidth: false,
           columnDefs: [
               {
                   targets: 0,
                   //"orderData": 0,
                   orderable: true,
                   title: 'system'
               },{
                   targets: 1,
                   orderable: true,
                   title: 'jumps &nbsp;&nbsp;&nbsp',
                   width: '40px',
                   class: 'text-right'
               },{
                   targets: 2,
                   orderable: false,
                   title: 'route'
               }
           ],
           data: [] // will be added dynamic
        } );


        $.each(systemsTo, function(i, systemTo){

            if(systemFrom !== systemTo){
                var url = baseUrl + systemFrom + '/to/' + systemTo;
                $.getJSON(url, function(routeData){

                    // row class
                    var rowClass = config.systemInfoRoutesTableRowPrefix + i;

                    // add row Data
                    var rowData = [systemTo, routeData.length];

                    var jumpData = [];
                    // loop all systems on a rout
                    $.each(routeData, function(j, systemData){

                        var systemSecClass = config.systemSecurityClassPrefix;
                        var systemSec = systemData.to.security.toFixed(1).toString();
                        systemSecClass += systemSec.replace('.', '-');
                        var system = '<i class="fa fa-square ' + systemSecClass + '" ';
                        system += 'data-toggle="tooltip" data-placement="bottom" ';
                        system += 'title="' + systemData.to.name + ' - ' + systemSec + ' [' + systemData.to.region.name  + ']"></i>';
                        jumpData.push( system );

                    });


                    rowData.push( jumpData.join(' ') );

                    // add new row
                    routesTable.row.add( rowData ).draw().nodes().to$().addClass( rowClass );

                    // init tooltips for each jump system
                    var tooltipElements = wrapperElement.find('.' + rowClass + ' [data-toggle="tooltip"]');

                    $(tooltipElements).tooltip();

                });
            }



        });



    };


    /**
     * update Progressbar for all scanned signatures in a system
     */
    $.fn.updateScannedSignaturesBar = function(){

        var systemCell = $(this);

        // get progress bar
        var progressBarWrapper = $(this).find('.' + config.systemInfoProgressScannedClass);
        var progressBar = $(progressBarWrapper).find('.progress-bar');
        var progressBarLabel = $(progressBarWrapper).find('.progress-label-right');

        var tableData = systemCell.getSignatureTableData();

        var percent = 0;
        var progressBarType = 'progress-bar-danger';

        if(tableData){
            var sigCount = tableData.length;
            var sigIncompleteCount = 0;
            // check for  signatures without "type" -> these are unscanned sigs
            $.each(tableData, function(i, data){
                var typeId = parseInt(data.typeId);
                if(typeId === 0){
                    sigIncompleteCount++;
                }
            });

            percent = 100 - Math.round( 100 / sigCount * sigIncompleteCount );

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
                        $(that).parents('.' + config.moduleClass).updateScannedSignaturesBar();
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


        // cache sige types -----------------------------------------------------
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
                    config.signatureTypes[systemType] &&
                    config.signatureTypes[systemType][areaId]
                ){
                    // json object -> "translate" keys to names
                    var tempTypes = config.signatureTypes[systemType][areaId];


                    for (var prop in tempTypes) {
                        if(tempTypes.hasOwnProperty(prop)){
                             prop = parseInt(prop);

                            switch(prop){
                                case 1:
                                    availableTypes[prop] = 'Combat';
                                    break;
                                case 2:
                                    availableTypes[prop] = 'Relict';
                                    break;
                                case 3:
                                    availableTypes[prop] = 'Data';
                                    break;
                                case 4:
                                    availableTypes[prop] = 'Gas';
                                    break;
                            }
                        }
                    }

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
                var newSelectOptions = getSignatureNames(systemType, areaId, newValue);

                $(nameSelect).editable('option', 'source', newSelectOptions);

                $(nameSelect).editable('setValue', null);

                if(newValue > 0){
                    $(nameSelect).editable('option', 'disabled', false);
                }else{
                    $(nameSelect).editable('option', 'disabled', true);
                }
            }
        });

        // cache sig names -----------------------------------------------------------
        var sigNameCache = {};

        // Select sig name (slave: depends on sig type)
        sigNameFields.editable({
            mode: 'popup',
            type: 'select',
            title: 'signature name',
            name: 'sigTypeId',
            emptytext: 'unknown',
            params: modifyFieldParamsOnSend,
            source: function(){

                var systemType = $(this).attr('data-systemtype');
                var areaId = $(this).attr('data-areaid');
                var typeId = $(this).attr('data-typeid');

                var cacheKey = [systemType, areaId, typeId].join('_');

                // check for cached signature names
                if(sigNameCache.hasOwnProperty( cacheKey )){
                    return sigNameCache[cacheKey];
                }

                var signatureNames = getSignatureNames(systemType, areaId, typeId);

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
                    moduleElement.updateScannedSignaturesBar();
                }
            });


        });

        // init signature counter
        $(this).find('.' + config.sigTableCounterClass).initSignatureCounter();



    };

    /**
     * get Signature names out of global
     * @param systemType
     * @param areaId
     * @param sigType
     * @returns {{}}
     */
    var getSignatureNames = function(systemType, areaId, sigType){

        var signatureNames = {};

        if(
            config.signatureTypes[systemType] &&
            config.signatureTypes[systemType][areaId] &&
            config.signatureTypes[systemType][areaId][sigType]
        ){
            signatureNames =  config.signatureTypes[systemType][areaId][sigType];
        }

        return signatureNames;
    };

    /**
     * get Area ID by security string
     * k-space not implemented jet
     * @param security
     * @returns {*}
     */
    var getAreaIdBySecurity = function(security){

        var areaId = null;

        switch(security){
            case 'C1':
                areaId = 1;
                break;
            case 'C2':
                areaId = 2;
                break;
            case 'C3':
                areaId = 3;
                break;
            case 'C4':
                areaId = 4;
                break;
            case 'C5':
                areaId = 5;
                break;
            case 'C6':
                areaId = 6;
                break;
        }

        return areaId;
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


            var areaId = getAreaIdBySecurity(systemSecurity);

            // areaId is required as a key for signature names
            if(areaId){

                $.each(systemData.signatures, function(i, data){

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
                    sigType += 'data-value="' + data.typeId + '" ';
                    sigType += '></a>';

                    // set Sig Id
                    tempData.push( sigType );

                    var sigElement = '<a href="#" class="' + config.sigTableEditSigNameSelect + '" ';
                    if(data.id > 0){
                        sigElement += 'data-pk="' + data.id + '" ';
                    }

                    // set disabled if sig type is not selected
                    if(data.typeId < 1){
                        sigElement += 'data-disabled="1" ';
                    }

                    sigElement += 'data-systemType="' + systemType + '" ';
                    sigElement += 'data-areaId="' + areaId + '" ';
                    sigElement += 'data-typeId="' + data.typeId + '" ';
                    sigElement += 'data-value="' + data.sigTypeId + '" ';
                    sigElement += '></a>';

                    // set Sig Id
                    tempData.push( sigElement );

                    // set Sig created
                    tempData.push( data.created );

                    // set Sig updated
                    tempData.push( data.updated );

                    // action icon
                    var actionButtonClass = 'btn-danger';
                    var actionButtonIcon = 'fa-minus';
                    if(options.action){
                        actionButtonClass = options.action.buttonClass;
                        actionButtonIcon = options.action.buttonIcon;
                    }

                    var deleteButton = '<a class="btn ' + actionButtonClass + ' btn-xs" href="#">';
                    deleteButton += '<i class="fa ' + actionButtonIcon + ' fa-fw"></i>';
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
                    name: 'GDF',
                    typeId: 1,
                    sigTypeId: 2,
                    created: 1325376000,
                    updated: 1415215936

                },{
                    id: 6,
                    name: 'HFS',
                    typeId: 0,
                    sigTypeId: 1,
                    created: 1415989953,
                    updated: 1415215936

                },{
                    id: 8,
                    name: 'HFG',
                    typeId: 1,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 12,
                    name: 'LLD',
                    typeId: 1,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 13,
                    name: 'DGE',
                    typeId: 1,
                    sigTypeId: 1,
                    created: 1394613252,
                    updated: 1415215936

                },{
                    id: 14,
                    name: 'EXS',
                    typeId: 1,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 15,
                    name: 'CVS',
                    typeId: 3,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1386934983

                },{
                    id: 16,
                    name: 'GGD',
                    typeId: 0,
                    sigTypeId: 0,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 18,
                    name: 'OKD',
                    typeId: 1,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1394613252

                },{
                    id: 8,
                    name: 'DBE',
                    typeId: 3,
                    sigTypeId: 1,
                    created: 1415215936,
                    updated: 1415215936

                },{
                    id: 20,
                    name: 'ASW',
                    typeId: 0,
                    sigTypeId: 3,
                    created: 1415215936,
                    updated: 1386934983

                },{
                    id: 22,
                    name: 'NFG',
                    typeId: 2,
                    sigTypeId: 2,
                    created: 1415215936,
                    updated: 1415215936

                }
            ]

        };


        return data;
    };


    /**
     * updates complete map module (all maps)
     * @param userData
     */
    $.fn.updateMapModule = function(userData){

        // get all active map elements for module
        var mapElements = getMaps(this);

        var currentUserData = null;

        // current user data
        if(userData.currentUserData){
            currentUserData = userData.currentUserData;
        }

        // get map Data
        $.each(mapElements, function(i, mapElement){

            var mapId = parseInt( $(mapElement).attr('data-mapid') );

            var mapUserData = null;
            // get user data for each active map
            $.each(userData.mapUserData, function(j, tempMapData){

                if(tempMapData.config.id === mapId){
                    // map userdata found
                    mapUserData = tempMapData;
                }
            });

            // update map
            if(mapUserData){
                $(mapElement).updateUserData(mapUserData, currentUserData);
            }
        });
    };

    /**
     * load all structrure elements into a TabsContent div (tab body)
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
                        class: ['col-xs-6', 'col-md-4', config.mapTabContentCellSecond, config.mapTabContentCell].join(' ')
                    })
                );


            // append grid structure
            $(this).append(contentStructure);
        });

    };

    /**
     * load map module into element (all maps)
     * @param mapData
     */
    $.fn.loadMapModule = function(mapData){

        var moduleConfig = {
            name: 'modules/tabs',
            position: $(this),
            link: 'prepend',
            functions: {
                after: function(){

                    // this new created module
                    var mapContentModule = $("div[data-map-tabs='" + config.mapTabBarId + "']");

                    // load first map i in first tab content container
                    var tabContentElements = getTabContentElements(mapContentModule);

                    // set observer for manually triggered map events
                    tabContentElements.setTabContentObserver();

                    // load all the structure elements for ALL Tab Content Body
                    tabContentElements.initContentStructure();

                    // load first map i in first tab content container
                    $( tabContentElements[0] ).initMap(mapData[0]);

                    // check for "new map" action before tap-change
                    getTabElements().on('show.bs.tab', function (e) {

                        var mapIndex = parseInt( $(e.target).attr('data-map-index') );

                        if(mapIndex === -1){
                            // add new Tab selected
                            showNewMapDialog();
                            e.preventDefault();
                        }


                    });

                    // load new map right after tab-change
                    getTabElements().on('shown.bs.tab', function (e) {

                        var mapIndex = parseInt( $(e.target).attr('data-map-index') );

                        var mapId = mapData[mapIndex].config.id;
                        var currentTabContentElement = $('#' + config.mapTabIdPrefix + mapId);

                        $( currentTabContentElement).initMap( mapData[mapIndex]);

                    });



                }
            }
        };

        var moduleData = {
            id: config.mapTabBarId,
            tabs: []
        };

        // add new tab data for each map
        $.each(mapData, function(i, data){

            var active = false;
            if(i === 0){
                active = true;
            }

            moduleData.tabs.push({
                id: data.config.id,
                index: i,
                name: data.config.name,
                icon: data.config.icon,
                tabClass: [config.mapTabClass, getMapTypeClassForType( data.config.type) ].join(' '),
                contentClass: config.mapTabContentClass,
                active: active
            });
        });

        // add new tab
        moduleData.tabs.push({
            id: 0,
            index: -1,
            name: 'add',
            icon: 'fa-plus',
            tabClass: [config.mapTabClass, getMapTypeClassForType('default')].join(' '),
            contentClass: config.mapTabContentClass,
            pullRight: true
        });

        Render.showModule(moduleConfig, moduleData);
    };

    /**
     * init map, load into a container and init custom scrollbar
     * @param container
     * @param mapData
     */
    $.fn.initMap = function(mapData){

        return this.each(function(){
            $(this).loadMap(mapData);

            // init custom scrollbars
            $(this).initMapScrollbar();

        });
    };

    /**
     * init scrollbar for Map element
     */
    $.fn.initMapScrollbar = function(){
        // get Map Scrollbar
        var scrollableElement = $(this).find('.' + config.mapWrapperClass);
        initCutomScrollbar( scrollableElement );
    };

    /**
     * init a custom scrollbar
     * @param scrollableElement
     */
    var initCutomScrollbar = function( scrollableElement ){

        // init custom scrollbars
        $(scrollableElement).mCustomScrollbar({
            axis:"x",
            theme:"light-thick",
            scrollButtons:{
                enable:true
            }
        });
    };

    /**
     * scroll to a specific position in the map
     * @returns {*} // string or id
     */
    $.fn.scrollTo = function(position){
        return this.each(function(){
            // todo re-comment
            //$(this).mCustomScrollbar('scrollTo', position);
        });
    };

});