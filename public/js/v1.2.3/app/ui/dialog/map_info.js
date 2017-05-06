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

    let config = {
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
        tableActionCellIconClass: 'pf-table-action-icon-cell',                  // class for table "action" icon (icon is part of cell content)

        loadingOptions: {                                                       // config for loading overlay
            icon: {
                size: 'fa-2x'
            }
        }
    };

    // confirmation dialog settings (e.g. delete row)
    let confirmationSettings = {
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
        let mapElement = $(this);

        mapElement.empty();
        mapElement.showLoadingAnimation(config.loadingOptions);

        let countSystems = mapData.data.systems.length;
        let countConnections = mapData.data.connections.length;

        // map type
        let mapTypes = MapUtil.getMapTypes();
        let mapType = null;

        for(let i = 0; i < mapTypes.length; i++){
            if(mapTypes[i].id === mapData.config.type.id){
                mapType = mapTypes[i];
                break;
            }
        }

        // check max map limits (e.g. max systems per map) ============================================================
        let percentageSystems = (100 / mapType.defaultConfig.max_systems) * countSystems;
        let maxSystemsClass = (percentageSystems < 90) ? 'txt-color-success' : (percentageSystems < 100) ? 'txt-color-warning' : 'txt-color-danger';

        // build content ==============================================================================================

        let dlElementLeft = $('<dl>', {
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
                    class: mapType.class
                }).text( mapType.name )
            );

        mapElement.append(dlElementLeft);

        let dlElementRight = $('<dl>', {
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
                $('<dd>', {
                    class: ['txt-color', maxSystemsClass].join(' ')
                }).text( countSystems + ' / ' + mapType.defaultConfig.max_systems )
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
     * loads system info table into an element
     * @param mapData
     */
    $.fn.loadSystemInfoTable = function(mapData){

        let systemsElement = $(this);

        systemsElement.empty();

        let systemTable = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border', config.mapInfoTableClass].join(' ')
        });
        systemsElement.append(systemTable);

        systemsElement.showLoadingAnimation(config.loadingOptions);

        // table init complete
        systemTable.on( 'init.dt', function () {
            systemsElement.hideLoadingAnimation();

            // init table tooltips
            let tooltipElements = systemsElement.find('[data-toggle="tooltip"]');
            tooltipElements.tooltip();
        });

        // prepare data for dataTables
        let systemsData = [];
        for(let i = 0; i < mapData.data.systems.length; i++){
            let tempSystemData = mapData.data.systems[i];

            let tempData = {};

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
            let securityClass = Util.getSecurityClassForSystem(tempSystemData.security);
            tempData.security = {
                security: '<span class="' + securityClass + '">' + tempSystemData.security + '</span>',
                security_sort: tempSystemData.security
            };

            // name
            tempData.name = tempSystemData.name;

            // alias
            tempData.alias = (tempSystemData.alias === tempSystemData.name) ? '' : tempSystemData.alias;

            // region
            tempData.region = tempSystemData.region.name;

            // static
            let statics = [];
            for(let j = 0; j < tempSystemData.statics.length; j++){
                let security = tempSystemData.statics[j].security;
                let secClass = Util.getSecurityClassForSystem(security);
                statics.push('<span class="' + secClass + '">' + security + '</span>');
            }
            tempData.static = statics.join('&nbsp;&nbsp;');

            // status
            let systemStatusClass = Util.getStatusInfoForSystem(tempSystemData.status.id, 'class');
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
            let systemEffectClass = MapUtil.getEffectInfoForSystem(tempSystemData.effect, 'class');
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
            let systemTrueSecClass = Util.getTrueSecClassForSystem(tempSystemData.trueSec);
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

        let systemsDataTable = systemTable.dataTable( {
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
                    title: 'alias',
                    data: 'alias'
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
                        let diff = new Date().getTime() - cellData * 1000;
                        let dateDiff = new Date(diff);
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
                        let tempTableElement = this;

                        let tempConfirmationSettings = confirmationSettings;
                        tempConfirmationSettings.title = 'Delete system';
                        tempConfirmationSettings.onConfirm = function(e, target){
                            let deleteRowElement = $(target).parents('tr');

                            let activeMap = Util.getMapModule().getActiveMap();
                            let systemElement = $('#' + MapUtil.getSystemId(mapData.config.id, rowData.id) );

                            if(systemElement.length){
                                // trigger system delete event
                                activeMap.trigger('pf:deleteSystems', [{
                                    systems: [systemElement[0]],
                                    callback: function(){
                                        // callback function after ajax "delete" success
                                        // remove table row
                                        tempTableElement.DataTable().rows(deleteRowElement).remove().draw();

                                        Util.showNotify({title: 'System deleted', text: rowData.name, type: 'success'});

                                        // refresh connection table (connections might have changed) ==================
                                        let connectionsElement = $('#' + config.mapInfoConnectionsId);
                                        let mapDataNew = activeMap.getMapDataFromClient({forceData: true});

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
     * loads connection info table into an element
     * @param mapData
     */
    $.fn.loadConnectionInfoTable = function(mapData){
        let connectionsElement = $(this);

        connectionsElement.empty();

        let connectionTable = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border', config.mapInfoTableClass].join(' ')
        });
        connectionsElement.append(connectionTable);

        connectionsElement.showLoadingAnimation(config.loadingOptions);

        // table init complete
        connectionTable.on( 'init.dt', function () {
            connectionsElement.hideLoadingAnimation();
        });

        // connections table ==========================================================================================

        // prepare data for dataTables
        let connectionData = [];
        for(let j = 0; j < mapData.data.connections.length; j++){
            let tempConnectionData = mapData.data.connections[j];

            let tempConData = {};

            tempConData.id = tempConnectionData.id;

            tempConData.scope = {
                scope: MapUtil.getScopeInfoForConnection(tempConnectionData.scope, 'label'),
                scope_sort: tempConnectionData.scope
            };

            // source system name
            tempConData.source = tempConnectionData.sourceName;

            // connection
            let connectionClasses = [];
            for(let k = 0; k < tempConnectionData.type.length; k++){
                connectionClasses.push( MapUtil.getConnectionInfo( tempConnectionData.type[k], 'cssClass') );

            }

            connectionClasses = connectionClasses.join(' ');

            tempConData.connection = '<div class="pf-fake-connection ' + connectionClasses + '"></div>';


            tempConData.target = tempConnectionData.targetName;

            tempConData.updated = tempConnectionData.updated;

            tempConData.clear = '<i class="fa fa-close txt-color txt-color-redDarker"></i>';

            connectionData.push(tempConData);
        }

        let connectionDataTable = connectionTable.dataTable( {
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
                        let diff = new Date().getTime() - cellData * 1000;
                        let dateDiff = new Date(diff);
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
                        let tempTableElement = this;

                        let tempConfirmationSettings = confirmationSettings;
                        tempConfirmationSettings.title = 'Delete connection';
                        tempConfirmationSettings.onConfirm = function(e, target){
                            let deleteRowElement = $(target).parents('tr');

                            // deleteSignatures(row);
                            let connection = $().getConnectionById(mapData.config.id, rowData.id);

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

    /**
     * loads user info table into an element
     * @param mapData
     */
    $.fn.loadUsersInfoTable = function(mapData){
        let usersElement = $(this);

        usersElement.empty();

        let userTable = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border', config.mapInfoTableClass].join(' ')
        });
        usersElement.append(userTable);

        usersElement.showLoadingAnimation(config.loadingOptions);

        // table init complete
        userTable.on( 'init.dt', function () {
            usersElement.hideLoadingAnimation();

            // init table tooltips
            let tooltipElements = usersElement.find('[data-toggle="tooltip"]');
            tooltipElements.tooltip({
                container: usersElement.parent()
            });
        });

        let getIconForInformationWindow = () => {
            return '<i class="fa fa-fw fa-id-card ' + config.tableActionCellIconClass + '" title="open ingame" data-toggle="tooltip"></i>';
        };

        // users table ================================================================================================
        // prepare users data for dataTables
        let currentMapUserData = Util.getCurrentMapUserData( mapData.config.id );
        let usersData = [];

        if(
            currentMapUserData &&
            currentMapUserData.data &&
            currentMapUserData.data.systems
        ){
            for(let i = 0; i < currentMapUserData.data.systems.length; i++){
                let tempSystemUserData = currentMapUserData.data.systems[i];
                for(let j = 0; j < tempSystemUserData.user.length; j++){
                    usersData.push( tempSystemUserData.user[j] );
                }
            }
        }

        let userDataTable = userTable.dataTable( {
            pageLength: 20,
            paging: true,
            lengthMenu: [[5, 10, 20, 50, -1], [5, 10, 20, 50, 'All']],
            ordering: true,
            order: [[ 0, 'desc' ], [ 4, 'asc' ]],
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
                    title: '<i title="active" data-toggle="tooltip" class="fa fa-user text-right"></i>',
                    width: '10px',
                    orderable: true,
                    searchable: false,
                    className: ['text-center'].join(' '),
                    data: 'log.active',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display'){
                                let icon = value ? 'fa-user' : 'fa-user-o';
                                value = '<i class="fa ' + icon + '"></i>';
                            }
                            return value;
                        }
                    }
                },
                {
                    targets: 1,
                    title: '',
                    width: '26px',
                    orderable: false,
                    searchable: false,
                    className: ['text-center', config.tableImageCellClass].join(' '),
                    data: 'log.ship',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display'){
                                value = '<img src="' + Init.url.ccpImageServer + 'Render/' + value.typeId + '_32.png" />';
                            }
                            return value;
                        }
                    }
                },{
                    targets: 2,
                    title: 'ship',
                    orderable: true,
                    searchable: true,
                    data: 'log.ship',
                    render: {
                        _: function(data, type, row){
                            let value = data;
                            if(type === 'display'){
                                value = data.typeName + '&nbsp;<i class="fa fa-fw fa-question-circle pf-help" title="' + value.name + '" data-toggle="tooltip"></i>';
                            }
                            return value;
                        },
                        sort: 'typeName'
                    }
                },{
                    targets: 3,
                    title: '',
                    width: '26px',
                    orderable: false,
                    searchable: false,
                    className: [config.tableImageCellClass].join(' '),
                    data: 'id',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display'){
                                value = '<img src="' + Init.url.ccpImageServer + 'Character/' + value + '_32.jpg" />';
                            }
                            return value;
                        }
                    }
                },{
                    targets: 4,
                    title: 'pilot',
                    orderable: true,
                    searchable: true,
                    className: [config.tableActionCellClass].join(' '),
                    data: 'name',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display'){
                                value += '&nbsp;' + getIconForInformationWindow();
                            }
                            return value;
                        }
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        // open character information window (ingame)
                        $(cell).on('click', { tableApi: this.DataTable() }, function(e) {
                            let rowData = e.data.tableApi.row(this).data();
                            Util.openIngameWindow(rowData.id);
                        });
                    }
                },{
                    targets: 5,
                    title: '',
                    width: '26px',
                    orderable: false,
                    searchable: false,
                    className: [config.tableImageCellClass, config.tableImageSmallCellClass].join(' '),
                    data: 'corporation',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display'){
                                value = '<img src="' + Init.url.ccpImageServer + 'Corporation/' + value.id + '_32.png" />';
                            }
                            return value;
                        }
                    }
                },{
                    targets: 6,
                    title: 'corporation',
                    orderable: true,
                    searchable: true,
                    className: [config.tableActionCellClass].join(' '),
                    data: 'corporation',
                    render: {
                        _: function (data, type, row, meta) {
                            let value = data.name;
                            if(type === 'display'){
                                value += '&nbsp;' + getIconForInformationWindow();
                            }
                            return value;
                        }
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        // open character information window (ingame)
                        $(cell).on('click', { tableApi: this.DataTable() }, function(e) {
                            let cellData = e.data.tableApi.cell(this).data();
                            Util.openIngameWindow(cellData.id);
                        });
                    }
                },{
                    targets: 7,
                    title: 'system',
                    orderable: true,
                    searchable: true,
                    data: 'log.system',
                    render: {
                        _: 'name',
                        sort: 'name'
                    }
                },{
                    targets: 8,
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
     * @param options
     */
    $.fn.showMapInfoDialog = function(options){
        let activeMap = Util.getMapModule().getActiveMap();
        let mapData = activeMap.getMapDataFromClient({forceData: true});

        if(mapData !== false){
            requirejs(['text!templates/dialog/map_info.html', 'mustache'], function(template, Mustache) {

                let data = {
                    dialogSummaryContainerId: config.dialogMapInfoSummaryId,
                    dialogUsersContainerId: config.dialogMapInfoUsersId,
                    dialogRefreshContainerId: config.dialogMapInfoRefreshId,
                    dialogNavigationClass: config.dialogNavigationClass,
                    mapInfoId: config.mapInfoId,
                    mapInfoSystemsId: config.mapInfoSystemsId,
                    mapInfoConnectionsId: config.mapInfoConnectionsId,
                    mapInfoUsersId: config.mapInfoUsersId,

                    // default open tab ----------
                    openTabInformation: options.tab === 'information',
                    openTabActivity: options.tab === 'activity'
                };

                let content = Mustache.render(template, data);

                let mapInfoDialog = bootbox.dialog({
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

                    let mapElement = $('#' + config.mapInfoId);
                    let systemsElement = $('#' + config.mapInfoSystemsId);
                    let connectionsElement = $('#' + config.mapInfoConnectionsId);
                    let usersElement = $('#' + config.mapInfoUsersId);


                    // set refresh button observer
                    $('#' + config.dialogMapInfoRefreshId).on('click', function(){
                        let menuAction = $(this).attr('data-action');
                        if(menuAction === 'refresh'){
                            // get new map data
                            let mapData = activeMap.getMapDataFromClient({forceData: true});

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