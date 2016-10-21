/**
 * map info dialog
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
        // global dialog
        dialogNavigationClass: 'pf-dialog-navigation-list',                     // class for dialog navigation bar

        // map info dialog/tabs
        dialogMapInfoSummaryId: 'pf-map-info-dialog-summary',                   // id for map "summary" container
        dialogMapInfoUsersId: 'pf-map-info-dialog-users',                       // id for map "user" container
        dialogMapInfoRefreshId: 'pf-map-info-dialog-refresh',                   // id for map "refresh" container

        // "summary" container
        mapInfoId: 'pf-map-info',                                               // id for map info
        mapInfoSystemsId: 'pf-map-info-systems',                                // id for map info systems box
        mapInfoConnectionsId: 'pf-map-info-connections',                        // id for map info connections box
        mapInfoUsersId: 'pf-map-info-users',                                    // id for map info users box

        mapInfoTableClass: 'pf-map-info-table',                                 // class for data
        mapInfoLifetimeCounterClass: 'pf-map-info-lifetime-counter',            // class for map lifetime counter

        // dataTable
        tableImageCellClass: 'pf-table-image-cell',                             // class for table "image" cells
        tableImageSmallCellClass: 'pf-table-image-small-cell',                  // class for table "small image" cells
        tableActionCellClass: 'pf-table-action-cell',                           // class for table "action" cells
        tableCounterCellClass: 'pf-table-counter-cell',                         // class for table "counter" cells

        systemIdPrefix: 'pf-system-',                                           // id prefix for a system

        loadingOptions: {                                                       // config for loading overlay
            icon: {
                size: 'fa-2x'
            }
        }
    };

    // confirmation dialog settings (e.g. delete row)
    var confirmationSettings = {
        container: 'body',
        placement: 'left',
        btnCancelClass: 'btn btn-sm btn-default',
        btnCancelLabel: 'cancel',
        btnCancelIcon: 'fa fa-fw fa-ban',
        btnOkClass: 'btn btn-sm btn-danger',
        btnOkLabel: 'delete',
        btnOkIcon: 'fa fa-fw fa-close'
    };

    /**
     * loads the map info data into an element
     * @param mapData
     */
    $.fn.loadMapInfoData = function(mapData){

        var mapElement = $(this);

        mapElement.empty();

        mapElement.showLoadingAnimation(config.loadingOptions);

        var countSystems = mapData.data.systems.length;
        var countConnections = mapData.data.connections.length;

        // map type
        var mapTypes = MapUtil.getMapTypes();
        var mapTypeName = '';
        var mapTypeClass = '';
        for(var i = 0; i < mapTypes.length; i++){
            if(mapTypes[i].id === mapData.config.type.id){
                mapTypeName = mapTypes[i].name;
                mapTypeClass = mapTypes[i].class;
            }
        }

        var dlElementLeft = $('<dl>', {
            class: 'dl-horizontal',
            css: {'float': 'left'}
        }).append(
                $('<dt>').text( 'Icon' )
            ).append(
                $('<dd>').append(
                    $('<i>', {
                        class: ['fa', 'fa-fw', mapData.config.icon].join(' ')
                    })
                )
            ).append(
                $('<dt>').text( 'Name' )
            ).append(
                $('<dd>').text( mapData.config.name )
            ).append(
                $('<dt>').text( 'Type' )
            ).append(
                $('<dd>', {
                    class: mapTypeClass
                }).text( mapTypeName )
            );

        mapElement.append(dlElementLeft);

        var dlElementRight = $('<dl>', {
            class: 'dl-horizontal',
            css: {'float': 'right'}
            }).append(
                $('<dt>').text( 'Lifetime' )
            ).append(
                $('<dd>', {
                    class: config.mapInfoLifetimeCounterClass,
                    text: mapData.config.created
                })
            ).append(
                $('<dt>').text( 'Systems' )
            ).append(
                $('<dd>').text( countSystems )
            ).append(
                $('<dt>').text( 'Connections' )
            ).append(
                $('<dd>').text( countConnections )
            );

        mapElement.append(dlElementRight);

        // init map lifetime counter
        $('.' + config.mapInfoLifetimeCounterClass).initTimestampCounter();



        mapElement.hideLoadingAnimation();

    };

    /**
     * loads the system info table into an element
     * @param mapData
     */
    $.fn.loadSystemInfoTable = function(mapData){

        var systemsElement = $(this);

        systemsElement.empty();

        var systemTable = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border', config.mapInfoTableClass].join(' ')
        });
        systemsElement.append(systemTable);

        systemsElement.showLoadingAnimation(config.loadingOptions);

        // table init complete
        systemTable.on( 'init.dt', function () {
            systemsElement.hideLoadingAnimation();

            // init table tooltips
            var tooltipElements = systemsElement.find('[data-toggle="tooltip"]');
            tooltipElements.tooltip();
        });

        // prepare data for dataTables
        var systemsData = [];
        for(var i = 0; i < mapData.data.systems.length; i++){
            var tempSystemData = mapData.data.systems[i];

            var tempData = {};

            // system id
            tempData.id = tempSystemData.id;

            // current position
            if(tempSystemData.currentUser === true){
                tempData.position = {
                    position: '<i class="fa fa fa-map-marker fa-lg fa-fw"></i>',
                    position_sort: 1
                };
            }else{
                tempData.position = {
                    position: '',
                    position_sort: 0
                };
            }

            // active pilots
            if(tempSystemData.userCount > 0){
                tempData.userCount = tempSystemData.userCount;
            }else{
                tempData.userCount = '';
            }

            // type
            tempData.type = {
                type: MapUtil.getSystemTypeInfo(tempSystemData.type.id, 'name'),
                type_sort: tempSystemData.type.id
            };

            // security
            var securityClass = Util.getSecurityClassForSystem(tempSystemData.security);
            tempData.security = {
                security: '<span class="' + securityClass + '">' + tempSystemData.security + '</span>',
                security_sort: tempSystemData.security
            };

            // name
            tempData.name = tempSystemData.name;

            // region
            tempData.region = tempSystemData.region.name;

            // static
            var statics = [];
            for(var j = 0; j < tempSystemData.statics.length; j++){
                var security = tempSystemData.statics[j].security;
                var secClass = Util.getSecurityClassForSystem(security);
                statics.push('<span class="' + secClass + '">' + security + '</span>');
            }
            tempData.static = statics.join('&nbsp;&nbsp;');

            // status
            var systemStatusClass = Util.getStatusInfoForSystem(tempSystemData.status.id, 'class');
            if(systemStatusClass !== ''){
                tempData.status = {
                    status: '<i class="fa fa fa-square-o fa-lg fa-fw ' + systemStatusClass + '"></i>',
                    status_sort: tempSystemData.status.id
                };
            }else{
                tempData.status = {
                    status: '',
                    status_sort: tempSystemData.status.id
                };
            }

            // effect
            var systemEffectClass = MapUtil.getEffectInfoForSystem(tempSystemData.effect, 'class');
            if(systemEffectClass !== ''){
                tempData.effect = {
                    effect: '<i class="fa fa fa-square fa-lg fa-fw ' + systemEffectClass + '"></i>',
                    effect_sort: tempSystemData.effect
                };
            }else{
                tempData.effect = {
                    effect: '',
                    effect_sort: ''
                };
            }

            // trueSec
            var systemTrueSecClass = Util.getTrueSecClassForSystem(tempSystemData.trueSec);
            if(systemTrueSecClass !== ''){
                tempData.trueSec = {
                    trueSec: '<span class="' + systemTrueSecClass + '">' + tempSystemData.trueSec.toFixed(1) + '</span>',
                    trueSec_sort: tempSystemData.trueSec
                };
            }else{
                tempData.trueSec = {
                    trueSec: '',
                    trueSec_sort: tempSystemData.trueSec
                };
            }

            // locked
            if(tempSystemData.locked === 1){
                tempData.locked = {
                    locked: '<i class="fa fa-lock fa-lg fa-fw"></i>',
                    locked_sort: tempSystemData.locked
                };
            }else{
                tempData.locked = {
                    locked: '',
                    locked_sort: 0
                };
            }

            // updated
            tempData.updated = tempSystemData.updated.updated;

            // delete row
            tempData.clear = '<i class="fa fa-close txt-color txt-color-redDarker"></i>';

            systemsData.push(tempData);
        }

        var systemsDataTable = systemTable.dataTable( {
            pageLength: 20,
            paging: true,
            lengthMenu: [[5, 10, 20, 50, -1], [5, 10, 20, 50, 'All']],
            ordering: true,
            order: [[ 9, 'desc' ], [ 3, 'asc' ]],
            autoWidth: false,
            responsive: {
                breakpoints: Init.breakpoints,
                details: false
            },
            hover: false,
            data: systemsData,
            columnDefs: [],
            language: {
                emptyTable:  'Map is empty',
                zeroRecords: 'No systems found',
                lengthMenu:  'Show _MENU_ systems',
                info:        'Showing _START_ to _END_ of _TOTAL_ systems'
            },
            columns: [
                {
                    title: 'type',
                    width: '25px',
                    className: ['min-desktop'].join(' '),
                    data: 'type',
                    render: {
                        _: 'type',
                        sort: 'type_sort'
                    }
                },{
                    title: '',
                    width: '1px',
                    searchable: false,
                    data: 'security',
                    render: {
                        _: 'security',
                        sort: 'security_sort'
                    }
                },{
                    title: 'sec',
                    width: '18px',
                    className: ['text-center', 'min-desktop'].join(' '),
                    searchable: false,
                    data: 'trueSec',
                    render: {
                        _: 'trueSec',
                        sort: 'trueSec_sort'
                    }
                },{
                    title: 'system',
                    data: 'name'
                },{
                    title: 'region',
                    data: 'region'
                },{
                    title: '<i class="fa fa-square-o fa-lg" title="system&nbsp;status" data-toggle="tooltip"></i>',
                    width: '12px',
                    searchable: false,
                    data: 'status',
                    render: {
                        _: 'status',
                        sort: 'status_sort'
                    }
                },{
                    title: '<i class="fa fa-square fa-lg" title="system&nbsp;effect" data-toggle="tooltip"></i>',
                    width: '12px',
                    className: 'text-center',
                    searchable: false,
                    data: 'effect',
                    render: {
                        _: 'effect',
                        sort: 'effect_sort'
                    }
                },{
                    title: 'static',
                    width: '30px',
                    data: 'static'
                },{
                    title: '<i class="fa fa-map-marker fa-lg" title="your&nbsp;position" data-toggle="tooltip"></i>',
                    width: '8px',
                    searchable: false,
                    data: 'position',
                    render: {
                        _: 'position',
                        sort: 'position_sort'
                    }
                },{
                    title: '<i class="fa fa-plane fa-lg" title="active&nbsp;pilots" data-toggle="tooltip"></i>',
                    width: '12px',
                    className: 'text-center',
                    searchable: false,
                    data: 'userCount'
                },{
                    title: '<i class="fa fa-lock fa-lg" title="system&nbsp;locked" data-toggle="tooltip"></i>',
                    width: '10px',
                    searchable: false,
                    data: 'locked',
                    render: {
                        _: 'locked',
                        sort: 'locked_sort'
                    }
                },{
                    title: 'updated',
                    width: '80px',
                    searchable: false,
                    className: ['text-right', config.tableCounterCellClass, 'min-desktop'].join(' '),
                    data: 'updated',
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        $(cell).initTimestampCounter();

                        // highlight cell
                        var diff = new Date().getTime() - cellData * 1000;
                        var dateDiff = new Date(diff);
                        if(dateDiff.getUTCDate() > 1){
                            $(cell).addClass('txt-color txt-color-warning');
                        }
                    }
                },{
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: '10px',
                    className: ['text-center', config.tableActionCellClass].join(' '),
                    data: 'clear',
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex) {
                        var tempTableElement = this;

                        var tempConfirmationSettings = confirmationSettings;
                        tempConfirmationSettings.title = 'Delete system';
                        tempConfirmationSettings.onConfirm = function(e, target){
                            var deleteRowElement = $(target).parents('tr');

                            var activeMap = Util.getMapModule().getActiveMap();
                            var systemElement = $('#' + config.systemIdPrefix + mapData.config.id + '-' + rowData.id);

                            if(systemElement){
                                // trigger system delete event
                                activeMap.trigger('pf:deleteSystems', [{
                                    systems: [systemElement],
                                    callback: function(){
                                        // callback function after ajax "delete" success
                                        // remove table row
                                        tempTableElement.DataTable().rows(deleteRowElement).remove().draw();

                                        Util.showNotify({title: 'System deleted', text: rowData.name, type: 'success'});

                                        // refresh connection table (connections might have changed) ------------------------------
                                        var connectionsElement = $('#' + config.mapInfoConnectionsId);
                                        var mapDataNew = activeMap.getMapDataFromClient({forceData: true});

                                        connectionsElement.loadConnectionInfoTable(mapDataNew);
                                    }
                                }]);
                            }
                        };

                        // init confirmation dialog
                        $(cell).confirmation(tempConfirmationSettings);

                    }
                }
            ]
        });

    };

    /**
     * loads the connection info table into an element
     * @param mapData
     */
    $.fn.loadConnectionInfoTable = function(mapData){
        var connectionsElement = $(this);

        connectionsElement.empty();

        var connectionTable = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border', config.mapInfoTableClass].join(' ')
        });
        connectionsElement.append(connectionTable);

        connectionsElement.showLoadingAnimation(config.loadingOptions);

        // table init complete
        connectionTable.on( 'init.dt', function () {
            connectionsElement.hideLoadingAnimation();
        });

        // connections table ==================================================

        // prepare data for dataTables
        var connectionData = [];
        for(var j = 0; j < mapData.data.connections.length; j++){
            var tempConnectionData = mapData.data.connections[j];

            var tempConData = {};

            tempConData.id = tempConnectionData.id;

            tempConData.scope = {
                scope: MapUtil.getScopeInfoForConnection(tempConnectionData.scope, 'label'),
                scope_sort: tempConnectionData.scope
            };

            // source system name
            tempConData.source = tempConnectionData.sourceName;

            // connection
            var connectionClasses = [];
            for(var k = 0; k < tempConnectionData.type.length; k++){
                connectionClasses.push( MapUtil.getConnectionInfo( tempConnectionData.type[k], 'cssClass') );

            }

            connectionClasses = connectionClasses.join(' ');

            tempConData.connection = '<div class="pf-fake-connection ' + connectionClasses + '"></div>';


            tempConData.target = tempConnectionData.targetName;

            tempConData.updated = tempConnectionData.updated;

            tempConData.clear = '<i class="fa fa-close txt-color txt-color-redDarker"></i>';

            connectionData.push(tempConData);
        }

        var connectionDataTable = connectionTable.dataTable( {
            pageLength: 20,
            paging: true,
            lengthMenu: [[5, 10, 20, 50, -1], [5, 10, 20, 50, 'All']],
            ordering: true,
            order: [ 0, 'desc' ],
            autoWidth: false,
            hover: false,
            data: connectionData,
            columnDefs: [],
            language: {
                emptyTable:  'No connections',
                zeroRecords: 'No connections found',
                lengthMenu:  'Show _MENU_ connections',
                info:        'Showing _START_ to _END_ of _TOTAL_ connections'
            },
            columns: [
                {
                    title: 'scope',
                    width: '50px',
                    orderable: true,
                    data: 'scope',
                    render: {
                        _: 'scope',
                        sort: 'scope_sort'
                    }
                },{
                    title: 'source system',
                    data: 'source'
                },{
                    title: 'connection',
                    width: '80px',
                    className: 'text-center',
                    orderable: false,
                    searchable: false,
                    data: 'connection'
                }, {
                    title: 'target system',
                    data: 'target'
                },{
                    title: 'updated',
                    width: '80px',
                    searchable: false,
                    className: ['text-right', config.tableCounterCellClass].join(' '),
                    data: 'updated',
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        $(cell).initTimestampCounter();

                        // highlight cell
                        var diff = new Date().getTime() - cellData * 1000;
                        var dateDiff = new Date(diff);
                        if(dateDiff.getUTCDate() > 1){
                            $(cell).addClass('txt-color txt-color-warning');
                        }
                    }
                },{
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: '10px',
                    className: ['text-center', config.tableActionCellClass].join(' '),
                    data: 'clear',
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex) {
                        var tempTableElement = this;

                        var tempConfirmationSettings = confirmationSettings;
                        tempConfirmationSettings.title = 'Delete connection';
                        tempConfirmationSettings.onConfirm = function(e, target){
                            var deleteRowElement = $(target).parents('tr');

                            // deleteSignatures(row);
                            var connection = $().getConnectionById(mapData.config.id, rowData.id);

                            $().deleteConnections([connection], function(){
                                // callback function after ajax "delete" success
                                // remove table row
                                tempTableElement.DataTable().rows(deleteRowElement).remove().draw();
                            });
                        };

                        // init confirmation dialog
                        $(cell).confirmation(tempConfirmationSettings);
                    }
                }
            ]
        });
    };

    $.fn.loadUsersInfoTable = function(mapData){
        var usersElement = $(this);

        usersElement.empty();

        var userTable = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border', config.mapInfoTableClass].join(' ')
        });
        usersElement.append(userTable);

        usersElement.showLoadingAnimation(config.loadingOptions);

        // table init complete
        userTable.on( 'init.dt', function () {
            usersElement.hideLoadingAnimation();
        });

        // users table ========================================================
        // prepare users data for dataTables
        var currentMapUserData = Util.getCurrentMapUserData( mapData.config.id );
        var usersData = [];

        if(
            currentMapUserData &&
            currentMapUserData.data &&
            currentMapUserData.data.systems
        ){
            for(var i = 0; i < currentMapUserData.data.systems.length; i++){
                var tempSystemUserData = currentMapUserData.data.systems[i];
                for(var j = 0; j < tempSystemUserData.user.length; j++){
                    usersData.push( tempSystemUserData.user[j] );
                }
            }
        }

        var userDataTable = userTable.dataTable( {
            pageLength: 20,
            paging: true,
            lengthMenu: [[5, 10, 20, 50, -1], [5, 10, 20, 50, 'All']],
            ordering: true,
            order: [ 1, 'asc' ],
            autoWidth: false,
            hover: false,
            data: usersData,
            language: {
                emptyTable:  'No active pilots',
                zeroRecords: 'No active pilots found',
                lengthMenu:  'Show _MENU_ pilots',
                info:        'Showing _START_ to _END_ of _TOTAL_ pilots'
            },
            columnDefs: [
                {
                    targets: 0,
                    title: '',
                    width: '26px',
                    orderable: false,
                    searchable: false,
                    className: ['text-center', config.tableImageCellClass].join(' '),
                    data: 'log.ship',
                    render: {
                        _: function(data, type, row, meta){
                            return '<img src="' + Init.url.ccpImageServer + 'Render/' + data.typeId + '_32.png" />';
                        }
                    }
                },{
                    targets: 1,
                    title: 'ship',
                    orderable: true,
                    searchable: true,
                    data: 'log.ship',
                    render: {
                        _: 'typeName',
                        sort: 'typeName'
                    }
                },{
                    targets: 2,
                    title: '',
                    width: '26px',
                    orderable: false,
                    searchable: false,
                    className: [config.tableImageCellClass].join(' '),
                    data: 'id',
                    render: {
                        _: function(data, type, row, meta){
                            return '<img src="' + Init.url.ccpImageServer + 'Character/' + data + '_32.jpg" />';
                        }
                    }
                },{
                    targets: 3,
                    title: 'pilot',
                    orderable: true,
                    searchable: true,
                    data: 'name'
                },{
                    targets: 4,
                    title: '',
                    width: '26px',
                    orderable: false,
                    searchable: false,
                    className: [config.tableImageCellClass, config.tableImageSmallCellClass].join(' '),
                    data: 'corporation',
                    render: {
                        _: function(data, type, row, meta){
                            return '<img src="' + Init.url.ccpImageServer + 'Corporation/' + data.id + '_32.png" />';
                        }
                    }
                },{
                    targets: 5,
                    title: 'corporation',
                    orderable: true,
                    searchable: true,
                    data: 'corporation',
                    render: {
                        _: 'name'
                    }
                },{
                    targets: 6,
                    title: 'system',
                    orderable: true,
                    searchable: true,
                    data: 'log.system',
                    render: {
                        _: 'name',
                        sort: 'name'
                    }
                },{
                    targets: 7,
                    title: 'station',
                    orderable: true,
                    searchable: true,
                    data: 'log.station',
                    render: {
                        _: 'name',
                        sort: 'name'
                    }
                }
            ]
        });

    };

    /**
     * shows the map information modal dialog
     */
    $.fn.showMapInfoDialog = function(){

        var activeMap = Util.getMapModule().getActiveMap();
        var mapData = activeMap.getMapDataFromClient({forceData: true});

        if(mapData !== false){
            requirejs(['text!templates/dialog/map_info.html', 'mustache'], function(template, Mustache) {

                var data = {
                    dialogSummaryContainerId: config.dialogMapInfoSummaryId,
                    dialogUsersContainerId: config.dialogMapInfoUsersId,
                    dialogRefreshContainerId: config.dialogMapInfoRefreshId,
                    dialogNavigationClass: config.dialogNavigationClass,
                    mapInfoId: config.mapInfoId,
                    mapInfoSystemsId: config.mapInfoSystemsId,
                    mapInfoConnectionsId: config.mapInfoConnectionsId,
                    mapInfoUsersId: config.mapInfoUsersId
                };

                var content = Mustache.render(template, data);

                var mapInfoDialog = bootbox.dialog({
                    title: 'Map information',
                    message: content,
                    size: 'large',
                    buttons: {
                        success: {
                            label: 'close',
                            className: 'btn-primary',
                            callback: function() {
                                $(mapInfoDialog).modal('hide');
                            }
                        }
                    }
                });

                mapInfoDialog.on('shown.bs.modal', function(e) {
                    // modal on open

                    var mapElement = $('#' + config.mapInfoId);
                    var systemsElement = $('#' + config.mapInfoSystemsId);
                    var connectionsElement = $('#' + config.mapInfoConnectionsId);
                    var usersElement = $('#' + config.mapInfoUsersId);


                    // set refresh button observer
                    $('#' + config.dialogMapInfoRefreshId).on('click', function(){
                        var menuAction = $(this).attr('data-action');
                        if(menuAction === 'refresh'){
                            // get new map data
                            var mapData = activeMap.getMapDataFromClient({forceData: true});

                            mapElement.loadMapInfoData(mapData);
                            systemsElement.loadSystemInfoTable(mapData);
                            connectionsElement.loadConnectionInfoTable(mapData);
                            usersElement.loadUsersInfoTable(mapData);
                        }
                    });

                    // load map data
                    mapElement.loadMapInfoData(mapData);

                    // load system table
                    systemsElement.loadSystemInfoTable(mapData);

                    // load connection table
                    connectionsElement.loadConnectionInfoTable(mapData);

                    // load users table
                    usersElement.loadUsersInfoTable(mapData);
                });

            });
        }

    };
});