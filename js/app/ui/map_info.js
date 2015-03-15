/**
 * map info dialog
 */

define([
    'jquery',
    'app/util',
    'bootbox'
], function($, Util, bootbox) {

    'use strict';

    var config = {
        // global dialog
        dialogNavigationClass: 'pf-dialog-navigation-list',                     // class for dialog navigation bar
        dialogNavigationListItemClass: 'pf-dialog-navigation-list-item',        // class for map manual li main navigation elements

        // map info dialog
        mapInfoId: 'pf-map-info',                                               // id for map info
        mapInfoSystemsId: 'pf-map-info-systems',                                // id for map info systems box
        mapInfoConnectionsId: 'pf-map-info-connections',                        // id for map info connections box
        mapInfoTableClass: 'pf-map-info-table',                                 // class for data

        loadingOptions: {                                                       // config for loading overlay
            icon: {
                size: 'fa-2x'
            }
        }
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
        var mapTypes = Util.getMapTypes();
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
                $('<dt>').text( 'Systems' )
            ).append(
                $('<dd>').text( countSystems )
            ).append(
                $('<dt>').text( 'Connections' )
            ).append(
                $('<dd>').text( countConnections )
            );

        mapElement.append(dlElementRight);


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


        // prepare data for dataTables
        var systemsData = [];
        for(var i = 0; i < mapData.data.systems.length; i++){
            var tempSystemData = mapData.data.systems[i];

            var tempData = [];

            // current position
            if(tempSystemData.currentUser === true){
                tempData.push( '<i class="fa fa fa-map-marker fa-lg fa-fw"></i>' );
            }else{
                tempData.push( '' );
            }

            // active pilots
            if(tempSystemData.userCount > 0){
                tempData.push(tempSystemData.userCount);
            }else{
                tempData.push( '' );
            }

            // type
            tempData.push(Util.getSystemTypeInfo(tempSystemData.type.id, 'name'));

            // name
            tempData.push( tempSystemData.name );

            // alias
            if( tempSystemData.name !== tempSystemData.alias){
                tempData.push( tempSystemData.alias );
            }else{
                tempData.push( '' );
            }

            // status
            var systemStatusClass = Util.getStatusInfoForSystem(tempSystemData.status.id, 'class');
            if(systemStatusClass !== ''){
                tempData.push( '<i class="fa fa fa-square-o fa-lg fa-fw ' + systemStatusClass + '"></i>' );
            }else{
                tempData.push( '' );
            }

            // effect
            var systemEffectClass = Util.getEffectInfoForSystem(tempSystemData.effect, 'class');
            if(systemEffectClass !== ''){
                tempData.push( '<i class="fa fa fa-square fa-lg fa-fw ' + systemEffectClass + '"></i>' );
            }else{
                tempData.push( '' );
            }

            // trueSec
            var systemTrueSecClass = Util.getTrueSecClassForSystem(tempSystemData.trueSec);
            if(systemTrueSecClass !== ''){
                tempData.push( '<span class="' + systemTrueSecClass + '">' + tempSystemData.trueSec.toFixed(1) + '</span>' );
            }else{
                tempData.push( '' );
            }

            // locked
            if(tempSystemData.locked === 1){
                tempData.push( '<i class="fa fa-lock fa-lg fa-fw"></i>' );
            }else{
                tempData.push( '' );
            }

            // rally point
            if(tempSystemData.rally === 1){
                tempData.push( '<i class="fa fa-users fa-lg fa-fw"></i>' );
            }else{
                tempData.push( '' );
            }

            systemsData.push(tempData);
        }

        var systemsDataTable = systemTable.dataTable( {
            paging: false,
            ordering: true,
            order: [ 0, 'desc' ],
            autoWidth: false,
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
                    title: '<i class="fa fa fa-map-marker fa-lg"></i>',
                    width: '15px',
                    searchable: false
                },{
                    title: '<i class="fa fa fa-plane fa-lg"></i>',
                    width: '18px',
                    searchable: false
                },{
                    title: 'type',
                    width: '50px'
                },{
                    title: 'system',
                    width: '50px'
                },{
                    title: 'alias'
                },{
                    title: 'status',
                    width: '30px',
                    class: 'text-center',
                    orderable: false,
                    searchable: false
                },{
                    title: 'effect',
                    width: '30px',
                    class: 'text-center',
                    orderable: false,
                    searchable: false
                },{
                    title: 'sec.',
                    width: '20px',
                    class: 'text-center',
                    orderable: false,
                    searchable: false
                },{
                    title: '<i class="fa fa-lock fa-lg fa-fw"></i>',
                    width: '30px',
                    class: 'text-center',
                    searchable: false
                },{
                    title: '<i class="fa fa-users fa-lg fa-fw"></i>',
                    width: '30px',
                    className: 'text-center',
                    searchable: false
                }
            ]
        });

        systemsElement.hideLoadingAnimation();

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

        // connections table ==================================================

        // prepare data for dataTables
        var connectionData = [];
        for(var j = 0; j < mapData.data.connections.length; j++){
            var tempConnectionData = mapData.data.connections[j];

            var tempConData = [];

            tempConData.push( Util.getScopeInfoForConnection( tempConnectionData.scope, 'label') );

            // source system name
            tempConData.push( tempConnectionData.sourceName );

            // connection
            var connectionClasses = [];
            for(var k = 0; k < tempConnectionData.type.length; k++){
                connectionClasses.push( Util.getConnectionInfo( tempConnectionData.type[k], 'cssClass') );

            }

            connectionClasses = connectionClasses.join(' ');

            tempConData.push( '<div class="pf-fake-connection ' + connectionClasses + '"></div>' );


            tempConData.push( tempConnectionData.targetName );

            connectionData.push(tempConData);
        }

        var connectionDataTable = connectionTable.dataTable( {
            paging: false,
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
                    orderable: false
                },{
                    title: 'source system'
                },{
                    title: 'connection',
                    width: '80px',
                    class: 'text-center',
                    orderable: false,
                    searchable: false
                },{
                    title: 'target system'
                }
            ]
        });


        connectionsElement.hideLoadingAnimation();
    };

    /**
     * shows the map information modal dialog
     */
    var showDialog = function(){

        var activeMap = Util.getMapModule().getActiveMap();
        var mapData = activeMap.getMapData(true);

        if(mapData !== false){
            requirejs(['text!templates/modules/map_info_dialog.html', 'mustache'], function(template, Mustache) {

                var data = {
                    dialogNavigationClass: config.dialogNavigationClass,
                    dialogNavLiClass: config.dialogNavigationListItemClass,
                    mapInfoId: config.mapInfoId,
                    mapInfoSystemsId: config.mapInfoSystemsId,
                    mapInfoConnectionsId: config.mapInfoConnectionsId
                };

                var content = Mustache.render(template, data);



                var mapInfoDialog = bootbox.dialog({
                    title: 'Map information',
                    message: content,
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

                    // set navigation button observer
                    var mainNavigationLinks = $('.' + config.dialogNavigationClass).find('a');
                    mainNavigationLinks.on('click', function(){
                        var menuAction = $(this).attr('data-action');

                        if(menuAction === 'refresh'){
                            // get new map data
                            var mapData = activeMap.getMapData(true);

                            mapElement.loadMapInfoData(mapData);
                            systemsElement.loadSystemInfoTable(mapData);
                            connectionsElement.loadConnectionInfoTable(mapData);
                        }
                    });

                    // load map data
                    mapElement.loadMapInfoData(mapData);

                    // load system table
                    systemsElement.loadSystemInfoTable(mapData);

                    // load connection table
                    connectionsElement.loadConnectionInfoTable(mapData);
                });

            });
        }

    };



    return {
        showDialog: showDialog
    };
});