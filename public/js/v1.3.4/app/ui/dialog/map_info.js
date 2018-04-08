/**
 * map info dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'app/map/util'
], function($, Init, Util, Render, bootbox, MapUtil) {

    'use strict';

    let config = {
        // global dialog
        dialogNavigationClass: 'pf-dialog-navigation-list',                     // class for dialog navigation bar

        // map info dialog/tabs
        dialogMapInfoSummaryId: 'pf-map-info-dialog-summary',                   // id for map "summary" container
        dialogMapInfoUsersId: 'pf-map-info-dialog-users',                       // id for map "user" container
        dialogMapInfoLogsId: 'pf-map-info-dialog-logs',                         // id for map "logs" container
        dialogMapInfoRefreshId: 'pf-map-info-dialog-refresh',                   // id for map "refresh" container

        // dialog containers
        mapInfoId: 'pf-map-info',                                               // id for map info
        mapInfoSystemsId: 'pf-map-info-systems',                                // id for map info systems box
        mapInfoConnectionsId: 'pf-map-info-connections',                        // id for map info connections box
        mapInfoUsersId: 'pf-map-info-users',                                    // id for map info users box
        mapInfoLogsId: 'pf-map-info-logs',                                      // id for map info logs box

        mapInfoLifetimeCounterClass: 'pf-map-info-lifetime-counter',            // class for map lifetime counter

        // dataTable
        tableToolsClass: 'pf-table-tools',                                      // class for table "tools" section (e.g. Buttons)
        tableCellImageClass: 'pf-table-image-cell',                             // class for table "image" cells
        tableCellImageSmallClass: 'pf-table-image-small-cell',                  // class for table "small image" cells
        tableCellActionClass: 'pf-table-action-cell',                           // class for table "action" cells
        tableCellLinkClass: 'pf-table-link-cell',                               // class for table "links" cells
        tableCellCounterClass: 'pf-table-counter-cell',                         // class for table "counter" cells
        tableCellEllipsisClass: 'pf-table-cell-ellipses-auto',                  // class for table "ellipsis" cells
        tableCellActionIconClass: 'pf-table-action-icon-cell',                  // class for table "action" icon (icon is part of cell content)
        tableCellUnknownDataClass: 'pf-table-unknown-cell',                     // class for table "unknown" cells

        textActionIconClass: 'pf-module-icon-button',                           // class for text action
        textActionIconCopyClass: 'pf-module-icon-button-copy',                  // class for text action "copy"

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
        btnCancelIcon: 'fas fa-fw fa-ban',
        btnOkClass: 'btn btn-sm btn-danger',
        btnOkLabel: 'delete',
        btnOkIcon: 'fas fa-fw fa-times'
    };

    /**
     * get icon that marks a table cell as clickable
     * @returns {string}
     */
    let getIconForInformationWindow = () => {
        return '<i class="fas fa-fw fa-id-card ' + config.tableCellActionIconClass + '" title="open ingame" data-toggle="tooltip"></i>';
    };

    /**
     * get icon for socked status
     * @param type
     * @returns {string}
     */
    let getIconForDockedStatus = (type) => {
        let icon = type === 'station' ? 'fa-home' : type === 'structure' ? 'fa-industry' : '';
        return icon.length ? '<i class="fas fa-fw ' + icon + ' ' + config.tableCellActionIconClass + '" title="' + type + '" data-toggle="tooltip"></i>' : '';
    };

    /**
     * get label for "unknown" label
     * @returns {string}
     */
    let getLabelForUnknownData = () => {
        return '<span class="' + config.tableCellUnknownDataClass + '">unknown</span>';
    };

    /**
     * write clipboard text
     * @param text
     * @returns {Promise<any>}
     */
    let copyToClipboard = (text) => {

        let copyToClipboardExecutor = (resolve, reject) => {
            let payload = {
                action: 'copyToClipboard',
                data: false
            };

            if (navigator.clipboard) {
                // get current permission status
                navigator.permissions.query({
                    name: 'clipboard-write'
                }).then(permissionStatus => {
                    // will be 'granted', 'denied' or 'prompt'
                    if(
                        permissionStatus.state === 'granted' ||
                        permissionStatus.state === 'prompt'
                    ){
                        navigator.clipboard.writeText(text)
                            .then(() => {
                                payload.data = true;
                                resolve(payload);                        })
                            .catch(err => {
                                let errorMsg = 'Failed to write clipboard content';
                                console.error(errorMsg, err);
                                Util.showNotify({title: 'Clipboard API', text: errorMsg, type: 'error'});
                                resolve(payload);
                            });
                    }else{
                        Util.showNotify({title: 'Clipboard API', text: 'You denied write access', type: 'warning'});
                        resolve(payload);
                    }
                });
            } else {
                console.warn('Clipboard API not supported by your browser');
                resolve(payload);
            }
        };

        return new Promise(copyToClipboardExecutor);
    };

    /**
     * read clipboard text
     * @returns {Promise<any>}
     */
    let readFromClipboard = () => {

        let readFromClipboardExecutor = (resolve, reject) => {
            let payload = {
                action: 'readFromClipboard',
                data: false
            };

            if (navigator.clipboard) {
                // get current permission status
                navigator.permissions.query({
                    name: 'clipboard-read'
                }).then(permissionStatus => {
                    // will be 'granted', 'denied' or 'prompt'
                    if(
                        permissionStatus.state === 'granted' ||
                        permissionStatus.state === 'prompt'
                    ){
                        navigator.clipboard.readText()
                            .then(text => {
                                payload.data = text;
                                resolve(payload);                        })
                            .catch(err => {
                                let errorMsg = 'Failed to read clipboard content';
                                console.error(errorMsg, err);
                                Util.showNotify({title: 'Clipboard API', text: errorMsg, type: 'error'});
                                resolve(payload);
                            });
                    }else{
                        Util.showNotify({title: 'Clipboard API', text: 'You denied read access', type: 'warning'});
                        resolve(payload);
                    }
                });
            } else {
                console.warn('Clipboard API not supported by your browser');
                resolve(payload);
            }
        };

        return new Promise(readFromClipboardExecutor);
    };

    /**
     * loads the map info data into an element
     * @param mapData
     */
    $.fn.initMapInfoData = function(mapData){
        let mapElement = $(this).empty();

        mapElement.showLoadingAnimation(config.loadingOptions);

        // get some more config values from this map. Which are not part of "mapData"
        let mapDataOrigin = Util.getCurrentMapData(mapData.config.id);

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

        // check max map limits (e.g. max systems per map) ------------------------------------------------------------
        let percentageSystems = (100 / mapType.defaultConfig.max_systems) * countSystems;
        let maxSystemsClass = (percentageSystems < 90) ? 'txt-color-success' : (percentageSystems < 100) ? 'txt-color-warning' : 'txt-color-danger';

        // build content ----------------------------------------------------------------------------------------------

        let dlElementLeft = $('<dl>', {
            class: 'dl-horizontal',
            css: {'float': 'left'}
        }).append(
            $('<dt>').text('Icon')
        ).append(
            $('<dd>').append(
                $('<i>', {
                    class: ['fas', 'fa-fw', mapData.config.icon].join(' ')
                })
            )
        ).append(
            $('<dt>').text('Name')
        ).append(
            $('<dd>').text(mapData.config.name)
        ).append(
            $('<dt>').text('Type')
        ).append(
            $('<dd>', {
                class: mapType.class
            }).text(mapType.name)
        ).append(
            $('<dt>').text('Link')
        ).append(
            $('<dd>', {
                class: [config.textActionIconClass, config.textActionIconCopyClass].join(' ')
            }).append(
                $('<span>', {
                    title: 'copy to clipboard',
                }).text(MapUtil.getMapDeeplinkUrl(mapData.config.id) + ' ')
            ).append(
                $('<i>', {
                    class: ['fas', 'fa-fw', 'fa-copy'].join(' ')
                })
            )
        );

        mapElement.append(dlElementLeft);

        let dlElementRight = $('<dl>', {
            class: 'dl-horizontal',
            css: {'float': 'right'}
        }).append(
            $('<dt>').text('Systems')
        ).append(
            $('<dd>', {
                class: ['txt-color', maxSystemsClass].join(' ')
            }).text(countSystems + ' / ' + mapType.defaultConfig.max_systems)
        ).append(
            $('<dt>').text('Connections')
        ).append(
            $('<dd>').text(countConnections)
        ).append(
            $('<dt>').text('Lifetime')
        ).append(
            $('<dd>', {
                class: config.mapInfoLifetimeCounterClass,
                text: mapData.config.created
            })
        ).append(
            $('<dt>').text('Created')
        ).append(
            $('<dd>').text(Util.getObjVal(mapDataOrigin, 'config.created.character.name'))
        );

        mapElement.append(dlElementRight);

        // init map lifetime counter
        $('.' + config.mapInfoLifetimeCounterClass).initTimestampCounter();

        mapElement.find('.' + config.textActionIconCopyClass).on('click', function(){
           let mapUrl = $(this).find('span').text().trim();
            copyToClipboard(mapUrl).then(payload => {
                if(payload.data){
                    Util.showNotify({title: 'Copied to clipbaord', text: mapUrl, type: 'success'});
                }
            });
        });

        mapElement.initTooltips();
        mapElement.hideLoadingAnimation();
    };

    /**
     * loads system info table into an element
     * @param mapData
     */
    $.fn.initSystemInfoTable = function(mapData){
        let systemsElement = $(this).empty();

        let systemTable = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border'].join(' ')
        });
        systemsElement.append(systemTable);

        systemsElement.showLoadingAnimation(config.loadingOptions);

        systemTable.on( 'init.dt', function () {
            systemsElement.hideLoadingAnimation();

            // init table tooltips
            let tooltipElements = systemsElement.find('[data-toggle="tooltip"]');
            tooltipElements.tooltip();
        });

        systemTable.on('destroy.dt', function(){
            $(this).destroyTimestampCounter();
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
                    position: '<i class="fas fa-map-marker-alt fa-lg fa-fw"></i>',
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
                    status: '<i class="far fa-square fa-lg fa-fw ' + systemStatusClass + '"></i>',
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
                    effect: '<i class="fas fa-square fa-lg fa-fw ' + systemEffectClass + '"></i>',
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
                    locked: '<i class="fas fa-lock fa-lg fa-fw"></i>',
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
            tempData.clear = '<i class="fas fa-times txt-color txt-color-redDarker"></i>';

            systemsData.push(tempData);
        }

        let systemsDataTable = systemTable.DataTable( {
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
                    data: 'name',
                    className: [config.tableCellLinkClass].join(' '),
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        // select system
                        $(cell).on('click', function(e){
                            Util.getMapModule().getActiveMap().triggerMenuEvent('SelectSystem', {systemId: rowData.id });
                        });
                    }
                },{
                    title: 'alias',
                    data: 'alias'
                },{
                    title: 'region',
                    data: 'region'
                },{
                    title: '<i class="far fa-square" title="system&nbsp;status" data-toggle="tooltip"></i>',
                    width: '12px',
                    searchable: false,
                    data: 'status',
                    render: {
                        _: 'status',
                        sort: 'status_sort'
                    }
                },{
                    title: '<i class="fas fa-square" title="system&nbsp;effect" data-toggle="tooltip"></i>',
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
                    title: '<i class="fas fa-map-marker-alt" title="your&nbsp;position" data-toggle="tooltip"></i>',
                    width: '8px',
                    searchable: false,
                    data: 'position',
                    render: {
                        _: 'position',
                        sort: 'position_sort'
                    }
                },{
                    title: '<i class="fas fa-plane" title="active&nbsp;pilots" data-toggle="tooltip"></i>',
                    width: '12px',
                    className: 'text-center',
                    searchable: false,
                    data: 'userCount'
                },{
                    title: '<i class="fas fa-lock" title="system&nbsp;locked" data-toggle="tooltip"></i>',
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
                    className: ['text-right', config.tableCellCounterClass, 'min-desktop'].join(' '),
                    data: 'updated',
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        $(cell).initTimestampCounter();
                    }
                },{
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: '10px',
                    className: ['text-center', config.tableCellActionClass].join(' '),
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
                                    callback: function(deletedSystems){
                                        // callback function after ajax "delete" success
                                        // check if system was deleted
                                        if(deletedSystems.length === 1){
                                            // remove table row
                                            tempTableElement.DataTable().rows(deleteRowElement).remove().draw();

                                            Util.showNotify({title: 'System deleted', text: rowData.name, type: 'success'});

                                            // refresh connection table (connections might have changed) --------------
                                            let connectionsElement = $('#' + config.mapInfoConnectionsId);
                                            let mapDataNew = activeMap.getMapDataFromClient({forceData: true});

                                            connectionsElement.initConnectionInfoTable(mapDataNew);
                                        }else{
                                            // error
                                            Util.showNotify({title: 'Failed to delete system', text: rowData.name, type: 'error'});
                                        }
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
    $.fn.initConnectionInfoTable = function(mapData){
        let connectionsElement = $(this).empty();

        let connectionTable = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border'].join(' ')
        });
        connectionsElement.append(connectionTable);

        connectionsElement.showLoadingAnimation(config.loadingOptions);

        // table init complete
        connectionTable.on( 'init.dt', function () {
            connectionsElement.hideLoadingAnimation();
        });

        // connections table ------------------------------------------------------------------------------------------

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

            tempConData.source = {
                id: tempConnectionData.source,
                name: tempConnectionData.sourceName,
            };

            // connection
            let connectionClasses = MapUtil.getConnectionFakeClassesByTypes(tempConnectionData.type);
            connectionClasses = connectionClasses.join(' ');
            tempConData.connection = '<div class="pf-fake-connection ' + connectionClasses + '"></div>';

            tempConData.target = {
                id: tempConnectionData.target,
                name: tempConnectionData.targetName,
            };

            tempConData.updated = tempConnectionData.updated;

            tempConData.clear = '<i class="fas fa-times txt-color txt-color-redDarker"></i>';

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
                    data: 'source.name',
                    className: [config.tableCellLinkClass].join(' '),
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        // select system
                        $(cell).on('click', function(e){
                            Util.getMapModule().getActiveMap().triggerMenuEvent('SelectSystem', {systemId: rowData.source.id });
                        });
                    }
                },{
                    title: 'connection',
                    width: '80px',
                    className: 'text-center',
                    orderable: false,
                    searchable: false,
                    data: 'connection'
                }, {
                    title: 'target system',
                    data: 'target.name',
                    className: [config.tableCellLinkClass].join(' '),
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        // select system
                        $(cell).on('click', function(e){
                            Util.getMapModule().getActiveMap().triggerMenuEvent('SelectSystem', {systemId: rowData.target.id });
                        });
                    }
                },{
                    title: 'updated',
                    width: '80px',
                    searchable: false,
                    className: ['text-right', config.tableCellCounterClass].join(' '),
                    data: 'updated',
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        $(cell).initTimestampCounter();

                        if(rowData.scope.scope_sort === 'wh'){
                            // highlight cell
                            let diff = new Date().getTime() - cellData * 1000;
                            let dateDiff = new Date(diff);
                            if(dateDiff.getUTCDate() > 1){
                                $(cell).addClass('txt-color txt-color-warning');
                            }
                        }
                    }
                },{
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: '10px',
                    className: ['text-center', config.tableCellActionClass].join(' '),
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
    $.fn.initUsersInfoTable = function(mapData){
        let usersElement = $(this).empty();

        let userTable = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border'].join(' ')
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

        // users table ------------------------------------------------------------------------------------------------
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
            order: [[ 3, 'asc' ]],
            autoWidth: false,
            responsive: {
                breakpoints: Init.breakpoints,
                details: false
            },
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
                    width: 26,
                    orderable: false,
                    searchable: false,
                    className: ['pf-help-default', 'text-center', config.tableCellImageClass].join(' '),
                    data: 'log.ship',
                    defaultContent: '',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(data && type === 'display'){
                                value = '<img src="' + Init.url.ccpImageServer + '/Render/' + value.typeId + '_32.png" title="' + value.typeName + '" data-toggle="tooltip" />';
                            }
                            return value;
                        }
                    }
                },{
                    targets: 1,
                    title: 'ship name',
                    width: 100,
                    orderable: true,
                    searchable: true,
                    data: 'log.ship',
                    defaultContent: getLabelForUnknownData(),
                    render: {
                        _: function(data, type, row){
                            let value = data;
                            if(data){
                                value = data.name;
                                if(type === 'display'){
                                    value = '<div class="' + MapUtil.config.tableCellEllipsisClass + ' ' + MapUtil.config.tableCellEllipsis100Class + '">' + data.name + '</div>';
                                }
                            }

                            return value;
                        }
                    }
                },{
                    targets: 2,
                    title: '',
                    width: 26,
                    orderable: false,
                    searchable: false,
                    className: [config.tableCellImageClass].join(' '),
                    data: 'id',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display'){
                                value = '<img src="' + Init.url.ccpImageServer + '/Character/' + value + '_32.jpg" />';
                            }
                            return value;
                        }
                    }
                },{
                    targets: 3,
                    title: 'pilot',
                    orderable: true,
                    searchable: true,
                    className: [config.tableCellActionClass].join(' '),
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
                    targets: 4,
                    title: '',
                    width: 26,
                    orderable: false,
                    searchable: false,
                    className: [config.tableCellImageClass, config.tableCellImageSmallClass, 'min-desktop'].join(' '),
                    data: 'corporation',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display'){
                                value = '<img src="' + Init.url.ccpImageServer + '/Corporation/' + value.id + '_32.png" />';
                            }
                            return value;
                        }
                    }
                },{
                    targets: 5,
                    title: 'corporation',
                    orderable: true,
                    searchable: true,
                    className: [config.tableCellActionClass, 'min-desktop'].join(' '),
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
                    targets: 6,
                    title: 'system',
                    orderable: true,
                    searchable: true,
                    data: 'log.system',
                    defaultContent: getLabelForUnknownData(),
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(data && type === 'display'){
                                value = data.name;
                            }
                            return value;
                        }
                    }
                },{
                    targets: 7,
                    title: 'docked',
                    orderable: true,
                    searchable: true,
                    className: [config.tableCellActionClass].join(' '),
                    data: 'log',
                    defaultContent: getLabelForUnknownData(),
                    render: {
                        _: function (data, type, row, meta) {
                            let value = data;
                            if(data){
                                if(data.station && data.station.id > 0){
                                    value = data.station.name + '&nbsp;' + getIconForDockedStatus('station');
                                }else if(data.structure && data.structure.id > 0){
                                    value = data.structure.name + '&nbsp;' + getIconForDockedStatus('structure');
                                }else{
                                    value = '';
                                }
                            }
                            return value;
                        }
                    }
                },{
                    targets: 8,
                    title: 'role',
                    width: 30,
                    orderable: true,
                    searchable: true,
                    className: ['text-right', 'min-desktop'].join(' '),
                    data: 'role',
                    render: {
                        _: function (data, type, row, meta) {
                            let value = data.label;
                            if(type === 'display'){
                                value = Util.getLabelByRole(data).prop('outerHTML');
                            }
                            return value;
                        }
                    }
                }
            ]
        });

    };

    /**
     * loads logs table into an element
     * @param mapData
     */
    $.fn.initLogsInfoTable = function(mapData){
        let logsElement = $(this).empty();

        /**
         * ajax load function for log fdata
         * @param requestData
         * @param context
         */
        let getLogsData = (requestData, context) => {
            context.logsElement.showLoadingAnimation(config.loadingOptions);

            $.ajax({
                type: 'POST',
                url: Init.path.getMapLogData,
                data: requestData,
                dataType: 'json',
                context: context
            }).done(function(data){
                this.callback(data, context);
            }).fail(function( jqXHR, status, error) {
                let reason = status + ' ' + error;
                Util.showNotify({title: jqXHR.status + ': loadLogs', text: reason, type: 'warning'});
            }).always(function(){
                this.logsElement.hideLoadingAnimation();
            });
        };

        /**
         * callback function after ajax response with log data
         * @param responseData
         * @param context
         */
        let updateTableDataCallback = (responseData, context) => {
            let newLogCount = responseData.data.length;

            if(newLogCount > 0){
                let pageInfoOld = context.tableApi.page.info();

                // add new rows
                context.tableApi.rows.add(responseData.data).draw();

                let newPageIndex = 0;
                if(pageInfoOld.recordsDisplay === 0){
                    Util.showNotify({title: 'New logs loaded', text: newLogCount + ' most recent logs added', type: 'success'});
                }else{
                    // get new pageInfo (new max page count)
                    let pageInfoNew = context.tableApi.page.info();
                    newPageIndex = Math.max(0, pageInfoNew.pages - 1);
                    Util.showNotify({title: 'More logs loaded', text: newLogCount + ' older logs added', type: 'info'});
                }

                // get to last page (pageIndex starts at zero) -> check if last page > 0
                context.tableApi.page(newPageIndex).draw(false);
            }else{
                Util.showNotify({title: 'No logs found', text: 'No more entries', type: 'danger'});
            }

        };

        // init logs table --------------------------------------------------------------------------------------------
        let logTable = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border', 'pf-table-fixed'].join(' ')
        });
        logsElement.append(logTable);

        let serverDate = Util.getServerTime();
        let serverHours = serverDate.setHours(0,0,0,0);

        let logDataTable = logTable.DataTable({
            pageLength: 25,
            paging: true,
            lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
            pagingType: 'full_numbers',
            ordering: false,
            autoWidth: false,
            searching: true,
            hover: false,
            data: [],
            language: {
                emptyTable: 'No logs available',
                zeroRecords: 'No logs found',
                lengthMenu: 'Show _MENU_ rows',
                info: 'Showing _START_ to _END_ of _TOTAL_ rows'
            },
            columnDefs: [
                {
                    targets: 0,
                    title: '<span title="action" data-toggle="tooltip">&nbsp;</span>',
                    width: 12,
                    data: 'context.tag',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display'){
                                let className = 'txt-color-' + data;
                                value = '<i class="fas fa-circle fa-fw txt-color ' + className + '"></i>';
                            }
                            return value;
                        }
                    }
                },{
                    targets: 1,
                    name: 'timestamp',
                    title: '<i class="far fa-fw fa-clock"></i>',
                    width: 100,
                    className: ['text-right'].join(' '),
                    data: 'datetime.date',
                    render: {
                        _: function(data, type, row, meta){
                            // strip microseconds
                            let logDateString = data.substring(0, 19) ;
                            let logDate = new Date(logDateString.replace(/-/g, '/'));
                            data = Util.convertDateToString(logDate, true);

                            // check whether log is new (today) ->
                            if(logDate.setHours(0,0,0,0) === serverHours) {
                                // replace dd/mm/YYYY
                                data = 'today' + data.substring(10);
                            }
                            return data;
                        }
                    }
                },{
                    targets: 2,
                    title: 'level',
                    width: 40,
                    data: 'level_name'
                },{
                    targets: 3,
                    title: 'channel',
                    className: [config.tableCellEllipsisClass].join(' '),
                    width: 40,
                    data: 'channel'
                },{
                    targets: 4,
                    title: 'message',
                    width: 115,
                    data: 'message',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display'){
                                let className = 'txt-color-';
                                if(Util.getObjVal(row, 'context.tag')){
                                    className += row.context.tag;
                                }
                                value = '<span class="txt-color ' + className + '">' + value + '</span>';
                            }
                            return value;
                        }
                    }
                },{
                    targets: 5,
                    title: '',
                    width: 26,
                    searchable: false,
                    className: [config.tableCellImageClass].join(' '),
                    data: 'context.data.character.id' ,
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display'){
                                value = '<img src="' + Init.url.ccpImageServer + '/Character/' + value + '_32.jpg" />';
                            }
                            return value;
                        }
                    }
                },{
                    targets: 6,
                    title: 'pilot',
                    width: 110,
                    className: [config.tableCellActionClass].join(' '),
                    data: 'context.data.character.name',
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
                            Util.openIngameWindow(rowData.context.data.character.id);
                        });
                    }
                },{
                    targets: 7,
                    title: 'context',
                    className: [config.tableCellEllipsisClass].join(' '),
                    data: 'context.data.formatted'
                },{
                    targets: 8,
                    title: '<i class="fas fa-code text-right"></i>',
                    width: 12,
                    className: [config.tableCellActionClass].join(' '),
                    data: 'context.data',
                    render: {
                        _: function(data, type, row, meta){
                            let value = data;
                            if(type === 'display'){
                               // txt-color-redDarker
                                value = '<i class="fas fa-code ' + config.tableCellActionIconClass + '"></i>';
                            }
                            return value;
                        }
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        // unset formatted string (to much content)

                        if(cellData.formatted){
                            // clone data before delete() values
                            cellData = Object.assign({}, cellData);
                            delete(cellData.formatted);
                        }

                        let jsonHighlighted = Render.highlightJson(cellData);
                        let content = '<pre><code>' + jsonHighlighted + '</code></pre>';

                        // open popover with raw log data
                        $(cell).popover({
                            placement: 'left',
                            html: true,
                            trigger: 'hover',
                            content: content,
                            container: 'body',
                            title: 'Raw data',
                            delay: {
                                show: 180,
                                hide: 0
                            }
                        });
                    }
                }
            ],
            initComplete: function(settings){
                let tableApi = this.api();

                // empty table is ready -> load logs
                getLogsData({
                    mapId: mapData.config.id
                }, {
                    tableApi: tableApi,
                    callback: updateTableDataCallback,
                    logsElement: logsElement
                });
            },
            drawCallback: function(settings){
                let tableApi = this.api();

                // en/disable "load more" button ----------------------------------------------------------------------
                let tableInfo = tableApi.page.info();
                let isLastPage = (tableInfo.pages === 0 || tableInfo.page === tableInfo.pages - 1);
                tableApi.button(0).enable(isLastPage);

                // adjust "timestamp" column width --------------------------------------------------------------------
                let timestampColumn =  tableApi.column('timestamp:name').header();
                let timestampColumnCells = tableApi.cells(undefined, 'timestamp:name', {page: 'current', order:'current'});

                let hasOldLogs = timestampColumnCells.render( 'display' ).reduce((hasOldLogs, cellValue) => {
                    return (hasOldLogs === false && !cellValue.startsWith('today')) ? true : hasOldLogs;
                }, false);

                if(hasOldLogs){
                    $(timestampColumn).css({width: '100px'});
                }else{
                    $(timestampColumn).css({width: '80px'});
                }
            }
        });

        // ------------------------------------------------------------------------------------------------------------
        // add dataTable buttons (extension)
        logsElement.append($('<div>', {
            class: config.tableToolsClass
        }));

        let buttons = new $.fn.dataTable.Buttons( logDataTable, {
            buttons: [
                {
                    className: 'btn btn-sm btn-default',
                    text: '<i class="fas fa-fw fa-plus"></i>&nbsp;load more',
                    enabled: false,
                    action: function ( e, dt, node, config ) {
                        let pageInfo = dt.page.info();

                        getLogsData({
                            mapId: mapData.config.id,
                            limit: pageInfo.length,
                            offset: pageInfo.recordsTotal
                        }, {
                            tableApi: dt,
                            callback: updateTableDataCallback,
                            logsElement: logsElement
                        });
                    }
                }
            ]
        } );

        logDataTable.buttons().container().appendTo( $(this).find('.' + config.tableToolsClass));
    };

    /**
     * shows the map information modal dialog
     * @param options
     */
    $.fn.showMapInfoDialog = function(options){
        let activeMap = Util.getMapModule().getActiveMap();
        let mapData = activeMap.getMapDataFromClient({forceData: true});

        if(mapData !== false){
            // "log" tab -> get "Origin", not all config options are set in mapData
            let mapDataOrigin = Util.getCurrentMapData(mapData.config.id);

            requirejs(['text!templates/dialog/map_info.html', 'mustache', 'datatables.loader'], (template, Mustache) => {

                let data = {
                    dialogSummaryContainerId: config.dialogMapInfoSummaryId,
                    dialogUsersContainerId: config.dialogMapInfoUsersId,
                    dialogLogsContainerId: config.dialogMapInfoLogsId,
                    dialogRefreshContainerId: config.dialogMapInfoRefreshId,
                    dialogNavigationClass: config.dialogNavigationClass,
                    mapInfoId: config.mapInfoId,
                    mapInfoSystemsId: config.mapInfoSystemsId,
                    mapInfoConnectionsId: config.mapInfoConnectionsId,
                    mapInfoUsersId: config.mapInfoUsersId,
                    mapInfoLogsId: config.mapInfoLogsId,

                    logHistoryEnabled: Boolean(Util.getObjVal(mapDataOrigin, 'config.logging.history')),

                    // default open tab ----------
                    openTabInformation: options.tab === 'information',
                    openTabActivity: options.tab === 'activity',
                    openTabLog: options.tab === 'log'
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
                    let mapElement = $('#' + config.mapInfoId);
                    let systemsElement = $('#' + config.mapInfoSystemsId);
                    let connectionsElement = $('#' + config.mapInfoConnectionsId);
                    let usersElement = $('#' + config.mapInfoUsersId);

                    // set refresh button observer
                    $('#' + config.dialogMapInfoRefreshId).on('click', function(e){
                        let menuAction = $(this).attr('data-action');
                        if(menuAction === 'refresh'){
                            // get new map data
                            let mapData = activeMap.getMapDataFromClient({forceData: true});
                            // find active tab
                            let activeTabLink = $(this).parents('.navbar').find('.navbar-header.pull-left li.active a');
                            if(activeTabLink.attr('href') === '#' + config.dialogMapInfoLogsId){
                                $('#' + config.mapInfoLogsId).initLogsInfoTable(mapDataOrigin);
                            }

                            mapElement.initMapInfoData(mapData);
                            systemsElement.initSystemInfoTable(mapData);
                            connectionsElement.initConnectionInfoTable(mapData);
                            usersElement.initUsersInfoTable(mapData);
                        }
                    });

                    // load map data
                    mapElement.initMapInfoData(mapData);

                    // load system table
                    systemsElement.initSystemInfoTable(mapData);

                    // load connection table
                    connectionsElement.initConnectionInfoTable(mapData);

                    // load users table
                    usersElement.initUsersInfoTable(mapData);
                });

                // events for tab change
                mapInfoDialog.find('.navbar a').on('shown.bs.tab', function(e){
                    if($(e.target).attr('href') === '#' + config.dialogMapInfoLogsId){
                        // "log" tab
                        let mapDataOrigin = Util.getCurrentMapData(mapData.config.id);
                        $('#' + config.mapInfoLogsId).initLogsInfoTable(mapDataOrigin);
                    }
                });

            });
        }

    };
});