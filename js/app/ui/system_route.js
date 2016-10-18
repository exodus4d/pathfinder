/**
 * system route module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox',
    'app/map/util'
], function($, Init, Util, bootbox, MapUtil) {
    'use strict';

    var config = {
        // module info
        moduleClass: 'pf-module',                                               // class for each module

        routeCacheTTL: 10,                                                      // route cache timer (client) in seconds

        // system route module
        systemRouteModuleClass: 'pf-system-route-module',                       // class  for this module

        // headline toolbar
        systemModuleHeadlineIcon: 'pf-module-icon-button',                      // class for toolbar icons in the head
        systemModuleHeadlineIconSearch: 'pf-module-icon-button-search',         // class for "search" icon
        systemModuleHeadlineIconSettings: 'pf-module-icon-button-settings',     // class for "settings" icon
        systemModuleHeadlineIconRefresh: 'pf-module-icon-button-refresh',       // class for "refresh" icon

        systemSecurityClassPrefix: 'pf-system-security-',                       // prefix class for system security level (color)

        // dialog
        routeSettingsDialogId: 'pf-route-settings-dialog',                      // id for route "settings" dialog
        routeDialogId: 'pf-route-dialog',                                       // id for route "search" dialog
        systemDialogSelectClass: 'pf-system-dialog-select',                     // class for system select Element
        systemInfoRoutesTableClass: 'pf-system-route-table',                    // class for route tables
        mapSelectId: 'pf-route-dialog-map-select',                              // id for "map" select

        dataTableActionCellClass: 'pf-table-action-cell'                       // class for "action" cells
    };

    // cache for system routes
    var cache = {
        systemRoutes: {}                                                        // jump information between solar systems
    };

    /**
     * callback function, adds new row to a dataTable with jump information for a route
     * @param context
     * @param routesData
     */
    var callbackAddRouteRow = function(context, routesData){

        if(routesData.length > 0){
            for(var i = 0; i < routesData.length; i++){
                var routeData = routesData[i];

                // format routeData
                var rowData = formatRouteData(routeData);

                if(rowData.route){
                    var cacheKey = routeData.systemFromData.name.toLowerCase() +
                        '_' + routeData.systemToData.name.toLowerCase();

                    // update route cache
                    cache.systemRoutes[cacheKey] = {
                        data: rowData,
                        updated: Util.getServerTime().getTime() / 1000
                    };

                    var rowElement = addRow(context, rowData);

                    rowElement.initTooltips({
                        container: 'body'
                    });
                }
            }

            // redraw dataTable
            context.dataTable.draw();
        }
    };

    /**
     * add a new dataTable row to the routes table
     * @param context
     * @param rowData
     * @returns {*}
     */
    var addRow = function(context, rowData){
        var dataTable = context.dataTable;
        var rowElement = null;
        var row = null;
        var animationStatus = 'changed';

        // search for an existing row (e.g. on mass "table refresh" [all routes])
        // get rowIndex where column 0 (equals to "systemToData.name") matches rowData.systemToData.name
        var indexes = dataTable.rows().eq(0).filter( function (rowIdx) {
            return (dataTable.cell(rowIdx, 0 ).data().name === rowData.systemToData.name);
        });

        if(indexes.length > 0){
            // update row with FIRST index
            // -> systemFrom should be unique!
            row = dataTable.row( parseInt(indexes[0]) );
            // update row data
            row.data(rowData);
        }else{
            // no existing route found -> add new row
            row = dataTable.row.add( rowData );

            animationStatus = 'added';
        }

        if(row.length > 0){
            rowElement = row.nodes().to$();

            if(animationStatus !== null){
                rowElement.data('animationStatus', animationStatus);
            }
        }

        return rowElement;
    };

    /**
     * update complete routes table (refresh all)
     * @param moduleElement
     * @param dataTable
     */
    var updateRoutesTable = function(moduleElement, dataTable){
        var context = {
            moduleElement: moduleElement,
            dataTable: dataTable
        };
        var routeData = [];

        dataTable.rows().every( function() {
            routeData.push( getRouteRequestDataFromRowData( this.data() ));
        });

        getRouteData({routeData: routeData}, context, callbackAddRouteRow);
    };

    /**
     * format rowData for route search/update request
     * @param {Object} rowData
     * @returns {Object}
     */
    var getRouteRequestDataFromRowData = function(rowData){
        return {
            mapIds: (rowData.hasOwnProperty('mapIds')) ? rowData.mapIds : [],
            systemFromData: (rowData.hasOwnProperty('systemFromData')) ? rowData.systemFromData : {},
            systemToData: (rowData.hasOwnProperty('systemToData')) ? rowData.systemToData : {},
            stargates: (rowData.hasOwnProperty('stargates')) ? rowData.stargates | 0 : 1,
            jumpbridges: (rowData.hasOwnProperty('jumpbridges')) ? rowData.jumpbridges | 0 : 1,
            wormholes: (rowData.hasOwnProperty('wormholes')) ? rowData.wormholes | 0 : 1,
            wormholesReduced: (rowData.hasOwnProperty('wormholesReduced')) ? rowData.wormholesReduced | 0 : 1,
            wormholesCritical: (rowData.hasOwnProperty('wormholesCritical')) ? rowData.wormholesCritical | 0 : 1,
            wormholesEOL: (rowData.hasOwnProperty('wormholesEOL')) ? rowData.wormholesEOL | 0 : 1
        };
    };

    /**
     * show route dialog. User can search for systems and jump-info for each system is added to a data table
     * @param dialogData
     */
    var showFindRouteDialog = function(dialogData){

        var mapSelectOptions = [];
        var currentMapData = Util.getCurrentMapData();
        if(currentMapData !== false){
            for(var i = 0; i < currentMapData.length; i++){
                mapSelectOptions.push({
                    id: currentMapData[i].config.id,
                    name: currentMapData[i].config.name,
                    selected: (dialogData.mapId === currentMapData[i].config.id)
                });
            }
        }
        var data = {
            id: config.routeDialogId,
            selectClass: config.systemDialogSelectClass,
            mapSelectId: config.mapSelectId,
            systemFromData: dialogData.systemFromData,
            mapSelectOptions: mapSelectOptions
        };

        requirejs(['text!templates/dialog/route.html', 'mustache'], function(template, Mustache) {

            var content = Mustache.render(template, data);

            var findRouteDialog = bootbox.dialog({
                title: 'Route finder',
                message: content,
                show: false,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fa fa-fw fa-search"></i>&nbsp;search route',
                        className: 'btn-primary',
                        callback: function () {
                            // add new route to route table

                            // get form Values
                            var form = $('#' + config.routeDialogId).find('form');

                            var routeDialogData = $(form).getFormValues();

                            // validate form
                            form.validator('validate');

                            // check whether the form is valid
                            var formValid = form.isValidForm();

                            if(formValid === false){
                                // don't close dialog
                                return false;
                            }

                            // get all system data from select2
                            var systemSelectData = form.find('.' + config.systemDialogSelectClass).select2('data');

                            if(
                                systemSelectData &&
                                systemSelectData.length === 1
                            ){
                                var context = {
                                    moduleElement: dialogData.moduleElement,
                                    dataTable: dialogData.dataTable
                                };

                                var requestData = {
                                    routeData: [{
                                        mapIds: routeDialogData.mapIds,
                                        systemFromData: dialogData.systemFromData,
                                        systemToData: {
                                            systemId:  systemSelectData[0].systemId,
                                            name: systemSelectData[0].text
                                        },
                                        stargates: routeDialogData.hasOwnProperty('stargates') ? parseInt( routeDialogData.stargates ) : 0,
                                        jumpbridges: routeDialogData.hasOwnProperty('jumpbridges') ? parseInt( routeDialogData.jumpbridges ) : 0,
                                        wormholes: routeDialogData.hasOwnProperty('wormholes') ? parseInt( routeDialogData.wormholes ) : 0,
                                        wormholesReduced: routeDialogData.hasOwnProperty('wormholesReduced') ? parseInt( routeDialogData.wormholesReduced ) : 0,
                                        wormholesCritical: routeDialogData.hasOwnProperty('wormholesCritical') ? parseInt( routeDialogData.wormholesCritical ) : 0,
                                        wormholesEOL: routeDialogData.hasOwnProperty('wormholesEOL') ? parseInt( routeDialogData.wormholesEOL ) : 0
                                    }]
                                };

                                getRouteData(requestData, context, callbackAddRouteRow);
                            }
                        }
                    }
                }
            });

            findRouteDialog.on('show.bs.modal', function(e) {
                findRouteDialog.initTooltips();

                // init some dialog/form observer
                setDialogObserver( $(this) );

                // init map select ----------------------------------------------------------------
                var mapSelect = $(this).find('#' + config.mapSelectId);
                mapSelect.initMapSelect();
            });


            findRouteDialog.on('shown.bs.modal', function(e) {

                // init system select live  search ------------------------------------------------
                // -> add some delay until modal transition has finished
                var systemTargetSelect = $(this).find('.' + config.systemDialogSelectClass);
                systemTargetSelect.delay(240).initSystemSelect({key: 'name'});
            });

            // show dialog
            findRouteDialog.modal('show');
        });
    };

    /**
     * show route settings dialog
     * @param dialogData
     * @param moduleElement
     * @param systemFromData
     * @param routesTable
     */
    var showSettingsDialog = function(dialogData, moduleElement, systemFromData, routesTable){

        var promiseStore = MapUtil.getLocaleData('map', dialogData.mapId);
        promiseStore.then(function(dataStore) {
            // selected systems (if already stored)
            var systemSelectOptions = [];
            if(
                dataStore &&
                dataStore.routes
            ){
                systemSelectOptions = dataStore.routes;
            }

            var maxSelectionLength = 4;

            var data = {
                id: config.routeSettingsDialogId,
                selectClass: config.systemDialogSelectClass,
                systemSelectOptions: systemSelectOptions,
                maxSelectionLength: maxSelectionLength
            };

            requirejs(['text!templates/dialog/route_settings.html', 'mustache'], function(template, Mustache) {
                var content = Mustache.render(template, data);

                var settingsDialog = bootbox.dialog({
                    title: 'Route settings',
                    message: content,
                    show: false,
                    buttons: {
                        close: {
                            label: 'cancel',
                            className: 'btn-default'
                        },
                        success: {
                            label: '<i class="fa fa-fw fa-check"></i>&nbsp;save',
                            className: 'btn-success',
                            callback: function () {
                                var form = this.find('form');
                                // get all system data from select2
                                var systemSelectData = form.find('.' + config.systemDialogSelectClass).select2('data');
                                var systemsTo = [];

                                if( systemSelectData.length > 0 ){
                                    systemsTo = formSystemSelectData(systemSelectData);
                                    MapUtil.storeLocalData('map', dialogData.mapId, 'routes', systemsTo);
                                }else{
                                    MapUtil.deleteLocalData('map', dialogData.mapId, 'routes');
                                }

                                Util.showNotify({title: 'Route settings stored', type: 'success'});

                                // (re) draw table
                                drawRouteTable(dialogData.mapId, moduleElement, systemFromData, routesTable, systemsTo);
                            }
                        }
                    }
                });

                settingsDialog.on('shown.bs.modal', function(e) {

                    // init default system select -----------------------------------------------------
                    // -> add some delay until modal transition has finished
                    var systemTargetSelect = $(this).find('.' + config.systemDialogSelectClass);
                    systemTargetSelect.delay(240).initSystemSelect({key: 'name', maxSelectionLength: maxSelectionLength});
                });

                // show dialog
                settingsDialog.modal('show');
            });
        });
    };

    /**
     * format select2 system data
     * @param {Array} data
     * @returns {Array}
     */
    var formSystemSelectData = function(data){
        var formattedData = [];
        for(let i = 0; i < data.length; i++){
            var tmpData = data[i];

            formattedData.push({
                name: tmpData.id,
                systemId: parseInt( tmpData.hasOwnProperty('systemId') ? tmpData.systemId : tmpData.element.getAttribute('data-systemid') )
            });
        }

        return formattedData;
    };

    /**
     * set event observer for route finder dialog
     * @param routeDialog
     */
    var setDialogObserver = function(routeDialog){
        var wormholeCheckbox = routeDialog.find('input[type="checkbox"][name="wormholes"]');
        var wormholeReducedCheckbox = routeDialog.find('input[type="checkbox"][name="wormholesReduced"]');
        var wormholeCriticalCheckbox = routeDialog.find('input[type="checkbox"][name="wormholesCritical"]');
        var wormholeEolCheckbox = routeDialog.find('input[type="checkbox"][name="wormholesEOL"]');

        // store current "checked" state for each box ---------------------------------------------
        var storeCheckboxStatus = function(){
            wormholeReducedCheckbox.data('selectState', wormholeReducedCheckbox.prop('checked'));
            wormholeCriticalCheckbox.data('selectState', wormholeCriticalCheckbox.prop('checked'));
            wormholeEolCheckbox.data('selectState', wormholeEolCheckbox.prop('checked'));
        };

        // on wormhole checkbox change ------------------------------------------------------------
        var onWormholeCheckboxChange = function(){

            if( $(this).is(':checked') ){
                wormholeReducedCheckbox.prop('disabled', false);
                wormholeCriticalCheckbox.prop('disabled', false);
                wormholeEolCheckbox.prop('disabled', false);

                wormholeReducedCheckbox.prop('checked', wormholeReducedCheckbox.data('selectState'));
                wormholeCriticalCheckbox.prop('checked', wormholeCriticalCheckbox.data('selectState'));
                wormholeEolCheckbox.prop('checked', wormholeEolCheckbox.data('selectState'));
            }else{
                storeCheckboxStatus();

                wormholeReducedCheckbox.prop('checked', false);
                wormholeReducedCheckbox.prop('disabled', true);
                wormholeCriticalCheckbox.prop('checked', false);
                wormholeCriticalCheckbox.prop('disabled', true);
                wormholeEolCheckbox.prop('checked', false);
                wormholeEolCheckbox.prop('disabled', true);
            }
        }.bind(wormholeCheckbox);

        wormholeCheckbox.on('change', onWormholeCheckboxChange);

        // initial checkbox check
        storeCheckboxStatus();
        onWormholeCheckboxChange();
    };

    /**
     * requests route data from eveCentral API and execute callback
     * @param requestData
     * @param context
     * @param callback
     */
    var getRouteData = function(requestData, context, callback){

        context.moduleElement.showLoadingAnimation();

        $.ajax({
            url: Init.path.searchRoute,
            type: 'POST',
            dataType: 'json',
            data: requestData,
            context: context
        }).done(function(routesData){
            this.moduleElement.hideLoadingAnimation();

            // execute callback
            callback(this, routesData.routesData);
        });

    };

    /**
     * format route data from API request into dataTable row format
     * @param routeData
     * @returns {{}}
     */
    var formatRouteData = function(routeData){

        var reloadButton = '<i class="fa ' + ['fa-refresh'].join(' ') + '"></i>';
        var deleteButton = '<i class="fa ' + ['fa-close', 'txt-color', 'txt-color-redDarker'].join(' ') + '"></i>';

        // default row data (e.g. no route found)
        var tableRowData = {
            systemFromData:  routeData.systemFromData,
            systemToData:  routeData.systemToData,
            jumps: {
                value: 0,
                formatted: '---'
            },
            avgTrueSec: {
                value: '',
                formatted: ''
            },
            route: 'not found',
            stargates: routeData.stargates,
            jumpbridges: routeData.jumpbridges,
            wormholes: routeData.wormholes,
            wormholesReduced: routeData.wormholesReduced,
            wormholesCritical: routeData.wormholesCritical,
            wormholesEOL: routeData.wormholesEOL,
            reload: {
                button: reloadButton
            },
            clear: {
                button: deleteButton
            },
            maps: routeData.maps,
            mapIds: routeData.mapIds //map data (mapIds is "redundant")
        };

        if(
            routeData.routePossible === true &&
            routeData.route.length > 0
        ){
            // route data available

            // add route Data
            var jumpData = [];
            var avgSecTemp = 0;

            // loop all systems on this route
            for(var i = 0; i < routeData.route.length; i++){
                var routeNodeData = routeData.route[i];
                // format system name (camelCase)
                var systemName = routeNodeData.system.charAt(0).toUpperCase() + routeNodeData.system.slice(1).toLowerCase();

                var systemSec = Number(routeNodeData.security).toFixed(1).toString();
                var tempSystemSec = systemSec;

                if(tempSystemSec <= 0){
                    tempSystemSec = '0-0';
                }

                var systemSecClass = config.systemSecurityClassPrefix + tempSystemSec.replace('.', '-');

                var system = '<i class="fa fa-square ' + systemSecClass + '" ';
                system += 'data-toggle="tooltip" data-placement="bottom" data-container="body" ';
                system += 'title="' + systemName + ' [' + systemSec + '] "></i>';
                jumpData.push( system );

                // "source" system is not relevant for average security
                if(i > 0){
                    avgSecTemp += Number(routeNodeData.security);
                }
            }

            var avgSec = ( avgSecTemp /  (routeData.route.length - 1)).toFixed(2);
            var avgSecForClass = Number(avgSec).toFixed(1);

            if(avgSecForClass <= 0){
                avgSecForClass = '0.0';
            }

            var avgSecClass = config.systemSecurityClassPrefix + avgSecForClass.toString().replace('.', '-');

            tableRowData.jumps = {
                value: routeData.routeJumps,
                formatted: routeData.routeJumps
            };

            tableRowData.avgTrueSec = {
                value: avgSec,
                formatted: '<span class="' + avgSecClass + '">' + avgSec + '</span>'
            };
            tableRowData.route = jumpData.join(' ');
        }

        return tableRowData;
    };

    /**
     * get the route finder moduleElement
     * @returns {*}
     */
    var getModule = function(){

        // create new module container
        var moduleElement = $('<div>', {
            class: [config.moduleClass, config.systemRouteModuleClass].join(' ')
        });

        // headline toolbar icons
        var headlineToolbar  = $('<h5>', {
            class: 'pull-right'
        }).append(
            $('<i>', {
                class: ['fa', 'fa-fw', 'fa-search', config.systemModuleHeadlineIcon, config.systemModuleHeadlineIconSearch].join(' '),
                title: 'find&nbsp;route'
            }).attr('data-html', 'true').attr('data-toggle', 'tooltip'),
            $('<i>', {
                class: ['fa', 'fa-fw', 'fa-sliders', config.systemModuleHeadlineIcon, config.systemModuleHeadlineIconSettings].join(' '),
                title: 'settings'
            }).attr('data-html', 'true').attr('data-toggle', 'tooltip'),
            $('<i>', {
                class: ['fa', 'fa-fw', 'fa-refresh', config.systemModuleHeadlineIcon, config.systemModuleHeadlineIconRefresh].join(' '),
                title: 'refresh&nbsp;all'
            }).attr('data-html', 'true').attr('data-toggle', 'tooltip')
        );

        moduleElement.append(headlineToolbar);

        // headline
        var headline = $('<h5>', {
            class: 'pull-left',
            text: 'Routes'
        });

        moduleElement.append(headline);

        // crate new route table
        var table = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border', config.systemInfoRoutesTableClass].join(' ')
        });

        moduleElement.append( $(table) );

        // init empty table
        var routesTable = table.DataTable( {
            paging: false,
            ordering: true,
            order: [ 1, 'asc' ],
            info: false,
            searching: false,
            hover: false,
            autoWidth: false,
            rowId: 'systemTo',
            language: {
                emptyTable:  'No routes added'
            },
            columnDefs: [
                {
                    targets: 0,
                    orderable: true,
                    title: 'system&nbsp;&nbsp;&nbsp;',
                    class: Util.config.popoverTriggerClass,
                    data: 'systemToData',
                    render: {
                        _: 'name',
                        sort: 'name'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex) {
                        // init context menu
                        $(cell).initSystemPopover({
                            systemToData: rowData.systemToData
                        });
                    }
                },{
                    targets: 1,
                    orderable: true,
                    title: '<span title="jumps" data-toggle="tooltip"><i class="fa fa-arrows-h"></i>&nbsp;&nbsp;</span>',
                    width: '18px',
                    class: 'text-right',
                    data: 'jumps',
                    render: {
                        _: 'formatted',
                        sort: 'value'
                    }
                },{
                    targets: 2,
                    orderable: true,
                    title: '<span title="average security" data-toggle="tooltip">&#216;&nbsp;&nbsp;</span>',
                    width: '15px',
                    class: 'text-right',
                    data: 'avgTrueSec',
                    render: {
                        _: 'formatted',
                        sort: 'value'
                    }
                },{
                    targets: 3,
                    orderable: false,
                    title: 'route',
                    data: 'route'
                },{
                    targets: 4,
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: '10px',
                    class: ['text-center', config.dataTableActionCellClass].join(' '),
                    data: 'reload',
                    render: {
                        _: 'button'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        var tempTableApi = this.api();

                        $(cell).on('click', function(e) {
                            // get current row data (important!)
                            // -> "rowData" param is not current state, values are "on createCell()" state
                            rowData = tempTableApi.row( $(cell).parents('tr')).data();

                            var context = {
                                moduleElement: moduleElement,
                                dataTable: tempTableApi
                            };

                            var requestData = {
                                routeData: [{
                                    mapIds: rowData.mapIds,
                                    systemFromData: rowData.systemFromData,
                                    systemToData: rowData.systemToData,
                                    stargates: rowData.stargates ? 1 : 0,
                                    jumpbridges: rowData.jumpbridges ? 1 : 0,
                                    wormholes: rowData.wormholes ? 1 : 0,
                                    wormholesReduced: rowData.wormholesReduced ? 1 : 0,
                                    wormholesCritical: rowData.wormholesCritical ? 1 : 0,
                                    wormholesEOL: rowData.wormholesEOL ? 1 : 0
                                }]
                            };

                            getRouteData(requestData, context, callbackAddRouteRow);
                        });
                    }
                },{
                    targets: 5,
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: '10px',
                    class: ['text-center', config.dataTableActionCellClass].join(' '),
                    data: 'clear',
                    render: {
                        _: 'button'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        var tempTableElement = this;

                        var confirmationSettings = {
                            container: 'body',
                            placement: 'left',
                            btnCancelClass: 'btn btn-sm btn-default',
                            btnCancelLabel: 'cancel',
                            btnCancelIcon: 'fa fa-fw fa-ban',
                            title: 'delete route',
                            btnOkClass: 'btn btn-sm btn-danger',
                            btnOkLabel: 'delete',
                            btnOkIcon: 'fa fa-fw fa-close',
                            onConfirm : function(e, target){
                                var deleteRowElement = $(cell).parents('tr');
                                tempTableElement.api().rows(deleteRowElement).remove().draw();
                            }
                        };

                        // init confirmation dialog
                        $(cell).confirmation(confirmationSettings);
                    }
                }
            ],
            drawCallback: function(settings){

                var animationRows = this.api().rows().nodes().to$().filter(function() {
                    return (
                        $(this).data('animationStatus') ||
                        $(this).data('animationTimer')
                    );
                });

                for(var i = 0; i < animationRows.length; i++){
                    $(animationRows[i]).pulseTableRow($(animationRows[i]).data('animationStatus'));
                    $(animationRows[i]).removeData('animationStatus');
                }

            },
            data: [] // will be added dynamic
        });

        // init tooltips for this module
        var tooltipElements = moduleElement.find('[data-toggle="tooltip"]');
        tooltipElements.tooltip({
            container: 'body'
        });

        return moduleElement;
    };


    /**
     * init system popover (e.g. for setWaypoints)
     * @param options
     */
    $.fn.initSystemPopover = function(options){
        var elements = $(this);
        var eventNamespace = 'hideSystemPopup';
        var systemToData = options.systemToData;

        requirejs(['text!templates/tooltip/system_popover.html', 'mustache'], function (template, Mustache) {
            var data = {
                systemToData: systemToData
            };

            var content = Mustache.render(template, data);

            elements.each(function() {
                var element = $(this);
                // destroy "popover" and remove "click" event for animation
                element.popover('destroy').off();

                // init popover and add specific class to it (for styling)
                element.popover({
                    html: true,
                    title: systemToData.name,
                    trigger: 'manual',
                    placement: 'top',
                    container: 'body',
                    content: content
                }).data('bs.popover').tip().addClass('pf-popover');
            });

            // set popup "close" observer
            elements.initPopoverClose(eventNamespace);

            // set "open" trigger on "right click"
            // -> this is not supported by the "trigger" param in .popover();
            // -> therefore we need to set it up manually
            elements.on('contextmenu', function(e){
                e.preventDefault();
               $(this).popover('show');
            });

            // set link observer "on shown" event
            elements.on('shown.bs.popover', function () {
                var popoverRoot = $(this);

                popoverRoot.data('bs.popover').tip().find('a').on('click', function(){
                    // hint: "data" attributes should be in lower case!
                    var systemData = {
                        name: $(this).data('name'),
                        systemId: $(this).data('systemid')
                    };
                    Util.setDestination(systemData, 'set_destination');

                    // close popover
                    popoverRoot.popover('hide');
                });
            });
        });
    };

    /**
     * init route module
     * -> request route path fore "default" trade hub systems
     * @param moduleElement
     * @param mapId
     * @param systemData
     */
    var initModule = function(moduleElement, mapId, systemData){

        var systemFromData = {
            name: systemData.name,
            systemId: systemData.systemId
        };

        var routesTableElement =  moduleElement.find('.' + config.systemInfoRoutesTableClass);

        var routesTable = routesTableElement.DataTable();

        // init refresh routes --------------------------------------------------------------------
        moduleElement.find('.' + config.systemModuleHeadlineIconRefresh).on('click', function(e){
            updateRoutesTable(moduleElement, routesTable);
        });

        // init search routes dialog --------------------------------------------------------------
        moduleElement.find('.' + config.systemModuleHeadlineIconSearch).on('click', function(e){
            var dialogData = {
                moduleElement: moduleElement,
                mapId: mapId,
                systemFromData: systemFromData,
                dataTable: routesTable
            };

            showFindRouteDialog(dialogData);
        });

        // init settings dialog -------------------------------------------------------------------
        moduleElement.find('.' + config.systemModuleHeadlineIconSettings).on('click', function(e){
            var dialogData = {
                mapId: mapId
            };

            showSettingsDialog(dialogData, moduleElement, systemFromData, routesTable);
        });

        // fill routesTable with data -------------------------------------------------------------
        var promiseStore = MapUtil.getLocaleData('map', mapId);
        promiseStore.then(function(dataStore) {
            // selected systems (if already stored)
            var systemsTo = [{
                name: 'Jita',
                systemId: 30000142
            }];

            if(
                dataStore &&
                dataStore.routes
            ){
                systemsTo = dataStore.routes;
            }

            drawRouteTable(mapId, moduleElement, systemFromData, routesTable, systemsTo);
        });

    };

    /**
     * draw route table
     * @param  mapId
     * @param moduleElement
     * @param systemFromData
     * @param routesTable
     * @param systemsTo
     */
    var drawRouteTable = function(mapId, moduleElement, systemFromData, routesTable, systemsTo){
        var requestRouteData = [];
        var currentTimestamp = Util.getServerTime().getTime();

        for(var i = 0; i < systemsTo.length; i++){
            var systemToData = systemsTo[i];

            if(systemFromData.name !== systemToData.name){
                var cacheKey = 'route_' + mapId + '_' + systemFromData.name.toUpperCase() + '_' + systemToData.name.toUpperCase();

                if(
                    cache.systemRoutes.hasOwnProperty(cacheKey) &&
                    Math.round(
                        ( currentTimestamp - (new Date( cache.systemRoutes[cacheKey].updated * 1000).getTime())) / 1000
                    ) <= config.routeCacheTTL
                ){
                    // route data is cached (client side)
                    var context = {
                        dataTable: routesTable
                    };

                    addRow(context, cache.systemRoutes[cacheKey].data);
                }else{
                    // get route data
                    var searchData = {
                        mapIds: [mapId],
                        systemFromData: systemFromData,
                        systemToData: systemToData
                    };

                    requestRouteData.push( getRouteRequestDataFromRowData( searchData ));
                }
            }
        }

        // check if routes data is not cached and is requested
        if(requestRouteData.length > 0){
            var contextData = {
                moduleElement: moduleElement,
                dataTable: routesTable
            };

            var requestData = {
                routeData: requestRouteData
            };

            getRouteData(requestData, contextData, callbackAddRouteRow);
        }
    };

    /**
     * updates an dom element with the system route module
     * @param mapId
     * @param systemData
     */
    $.fn.drawSystemRouteModule = function(mapId, systemData){

        var parentElement = $(this);

        // show route module
        var showModule = function(moduleElement){
            if(moduleElement){
                moduleElement.css({ opacity: 0 });
                parentElement.append(moduleElement);

                moduleElement.velocity('transition.slideDownIn', {
                    duration: Init.animationSpeed.mapModule,
                    delay: Init.animationSpeed.mapModule,
                    complete: function(){
                        initModule(moduleElement, mapId, systemData);
                    }
                });
            }
        };

        // check if module already exists
        var moduleElement = parentElement.find('.' + config.systemRouteModuleClass);

        if(moduleElement.length > 0){
            moduleElement.velocity('transition.slideDownOut', {
                duration: Init.animationSpeed.mapModule,
                complete: function(tempElement){
                    $(tempElement).remove();

                    moduleElement = getModule();
                    showModule(moduleElement);
                }
            });
        }else{
            moduleElement = getModule();
            showModule(moduleElement);
        }

    };

});