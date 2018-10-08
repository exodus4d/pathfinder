/**
 * Connection info module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/util'
], ($, Init, Util, MapUtil) => {
    'use strict';

    let config = {
        // module info
        modulePosition: 1,
        moduleName: 'connectionInfo',
        moduleHeadClass: 'pf-module-head',                                                      // class for module header
        moduleHandlerClass: 'pf-module-handler-drag',                                           // class for "drag" handler

        headUserShipClass: 'pf-head-user-ship',                                                 // class for "user settings" link

        // connection info module
        moduleTypeClass: 'pf-connection-info-module',                                           // class for this module

        // headline toolbar
        moduleHeadlineIconClass: 'pf-module-icon-button',                                       // class for toolbar icons in the head
        moduleHeadlineIconRefreshClass: 'pf-module-icon-button-refresh',                        // class for "refresh" icon
        moduleHeadlineIconCurrentMassClass: 'pf-module-icon-button-mass',                       // class for "current ship mass" toggle icon

        connectionInfoPanelClass: 'pf-connection-info-panel',                                   // class for connection info panels
        connectionInfoPanelId: 'pf-connection-info-panel-',                                     // id prefix for connection info panels

        dynamicAreaClass: 'pf-dynamic-area',                                                    // class for "dynamic" areas
        controlAreaClass: 'pf-module-control-area',                                             // class for "control" areas

        // info table
        moduleTableClass: 'pf-module-table',                                                    // class for module tables
        connectionInfoTableLabelSourceClass: 'pf-connection-info-label-source',                 // class for source label
        connectionInfoTableLabelTargetClass: 'pf-connection-info-label-target',                 // class for target label
        connectionInfoTableRowMassLogClass: 'pf-connection-info-row-mass-log',                  // class for "logged mass" table row
        connectionInfoTableRowMassShipClass: 'pf-connection-info-row-mass-ship',                // class for "current ship mass" table row
        connectionInfoTableCellConnectionClass: 'pf-connection-info-connection',                // class for connection "fake" table cell
        connectionInfoTableCellMassTotalTooltipClass: 'pf-connection-info-mass-total-tooltip',  // class for "mass total tooltip" table cell
        connectionInfoTableCellMassTotalClass: 'pf-connection-info-mass-total',                 // class for "mass total" table cell
        connectionInfoTableCellMassLogClass: 'pf-connection-info-mass-log',                     // class for "mass logged" table cell
        connectionInfoTableCellMassShipClass: 'pf-connection-info-mass-ship',                   // class for "current ship mass" table cell
        connectionInfoTableCellMassLeftClass: 'pf-connection-info-mass-left',                   // class for "mass left" table cell

        // dataTable
        connectionInfoTableClass: 'pf-connection-info-table',                                   // class for connection tables
        tableCellImageClass: 'pf-table-image-cell',                                             // class for table "image" cells
        tableCellCounterClass: 'pf-table-counter-cell',                                         // class for table "counter" cells

        // config
        showShip: true                                                                          // default for "show current ship mass" toggle
    };

    /**
     * get module toolbar element
     * @returns {*|jQuery|HTMLElement|void}
     */
    let getHeadlineToolbar = () => {
        let headlineToolbar  = $('<h5>', {
            class: 'pull-right'
        }).append(
            $('<i>', {
                class: ['fas', 'fa-fw', 'fa-male',
                    config.showShip ? 'active' : '' ,
                    config.moduleHeadlineIconClass,
                    config.moduleHeadlineIconCurrentMassClass].join(' '),
                title: 'toggle&nbsp;current&nbsp;ship&nbsp;mass'
            }).attr('data-html', 'true').attr('data-toggle', 'tooltip'),
            $('<i>', {
                class: ['fas', 'fa-fw', 'fa-sync',
                    config.moduleHeadlineIconClass,
                    config.moduleHeadlineIconRefreshClass].join(' '),
                title: 'refresh&nbsp;all'
            }).attr('data-html', 'true').attr('data-toggle', 'tooltip')
        );

        headlineToolbar.find('[data-toggle="tooltip"]').tooltip({
            container: 'body'
        });

        return headlineToolbar;
    };

    /**
     * get new connection element
     * @param mapId
     * @param connectionId
     * @returns {jQuery}
     */
    let getConnectionElement = (mapId, connectionId) => {
        let connectionElement = $('<div>', {
            id: getConnectionElementId(connectionId),
            class: ['col-xs-12', 'col-sm-4', 'col-lg-3' , config.connectionInfoPanelClass].join(' ')
        }).data({
            mapId: mapId,
            connectionId: connectionId
        });

        return connectionElement;
    };

    /**
     * get info control panel element
     * @param mapId
     * @returns {void|jQuery|*}
     */
    let getInfoPanelControl = (mapId) => {
        let connectionElement = getConnectionElement(mapId, 0).append($('<div>', {
            class: [config.dynamicAreaClass, config.controlAreaClass].join(' '),
            html: '<i class="fas fa-fw fa-plus"></i>&nbsp;add connection&nbsp;&nbsp;<kbd>ctrl</kbd>&nbsp;+&nbsp;<kbd>click</kbd>'
        }));

        return connectionElement;
    };

    /**
     * get connection information element
     * @param connectionData
     * @returns {void|*|jQuery|HTMLElement}
     */
    let getInformationElement = (connectionData) => {

        // connection scope -----------------------------------------------------------------------
        let scopeLabel = MapUtil.getScopeInfoForConnection(connectionData.scope, 'label');

        let element = $('<div>', {
            class: [config.dynamicAreaClass, config.controlAreaClass].join(' ')
        }).append(
            $('<table>', {
                class: ['table', 'table-condensed', 'pf-table-fixed', config.moduleTableClass].join(' ')
            }).data('showShip', config.showShip).append(
                $('<thead>').append(
                    $('<tr>').append(
                        $('<th>', {
                            class: ['pf-table-cell-20', 'text-right', Util.config.helpClass, 'pf-pie-chart'].join(' ')
                        }).attr('data-toggle', 'tooltip').attr('data-percent', '-100').easyPieChart({
                            barColor: (percent) => {
                                let color = '#e28a0d';
                                if((percent * -1)  >= 100){
                                    color = '#a52521';
                                }
                                return color;
                            },
                            overrideOptions: 'signed',
                            trackColor: '#5cb85c',
                            size: 14,
                            scaleColor: false,
                            lineWidth: 2,
                            lineCap: 'butt',
                            animate: false
                        }),
                        $('<th>', {
                            class: ['text-right'].join(' ')
                        }).attr('colspan', 2).append(
                            $('<span>', {
                                class: 'pf-link',
                                html: connectionData.sourceAlias + '&nbsp;&nbsp;'
                            }).on('click', function(){
                                Util.getMapModule().getActiveMap().triggerMenuEvent('SelectSystem', {systemId: connectionData.source });
                            }),
                            $('<span>', {
                                class: [config.connectionInfoTableLabelSourceClass].join(' ')
                            }),
                            $('<i>', {
                                class: 'fas fa-fw fa-angle-double-right'
                            }),
                            $('<span>', {
                                class: [config.connectionInfoTableLabelTargetClass].join(' ')
                            }),
                            $('<span>', {
                                class: 'pf-link',
                                html: '&nbsp;&nbsp;' + connectionData.targetAlias
                            }).on('click', function(){
                                Util.getMapModule().getActiveMap().triggerMenuEvent('SelectSystem', {systemId: connectionData.target });
                            })
                        )
                    )
                ),
                $('<tbody>').append(
                    $('<tr>').append(
                        $('<td>', {
                            class: ['text-right', Util.config.helpClass, config.connectionInfoTableCellMassTotalTooltipClass].join(' '),
                            html: '<i class="fas fa-fw fa-question-circle"></i>'
                        }),
                        $('<td>', {
                            text: scopeLabel.charAt(0).toUpperCase() + scopeLabel.slice(1)
                        }),
                        $('<td>', {
                            class: ['text-right', config.connectionInfoTableCellConnectionClass].join(' ')
                        }).append(
                            $('<div>', {
                                class: MapUtil.getConnectionFakeClassesByTypes(connectionData.type).join(' ')
                            })
                        )
                    ),
                    $('<tr>').append(
                        $('<td>', {
                            class: ['text-right', Util.config.helpClass].join(' '),
                            html: '<i class="fas fa-fw fa-question-circle"></i>',
                            title: 'initial mass. From signature table'
                        }).attr('data-toggle', 'tooltip'),
                        $('<td>', {
                            text: 'Total mass'
                        }),
                        $('<td>', {
                            class: ['text-right', 'txt-color', config.connectionInfoTableCellMassTotalClass].join(' ')
                        })
                    ),
                    $('<tr>', {
                        class: config.connectionInfoTableRowMassLogClass
                    }).append(
                        $('<td>', {
                            class: ['text-right', Util.config.helpClass].join(' '),
                            title: 'recorded total jump mass'
                        }).attr('data-toggle', 'tooltip').append(
                            $('<i>', {
                                class: [
                                    'fas', 'fa-fw', 'fa-question-circle'
                                ].join(' ')
                            }),
                            $('<i>', {
                                class: [
                                    'fas', 'fa-fw', 'fa-adjust',
                                    'txt-color', 'txt-color-warning',
                                    'hidden'
                                ].join(' ')
                            }),
                            $('<i>', {
                                class: [
                                    'far', 'fa-fw', 'fa-circle',
                                    'txt-color', 'txt-color-danger',
                                    'hidden'
                                ].join(' ')
                            })
                        ),
                        $('<td>', {
                            text: 'Logged mass'
                        }),
                        $('<td>', {
                            class: ['text-right', config.connectionInfoTableCellMassLogClass].join(' ')
                        })
                    ),
                    $('<tr>', {
                        class: config.connectionInfoTableRowMassShipClass
                    }).append(
                        $('<td>', {
                            class: ['text-right', Util.config.helpClass].join(' '),
                            title: 'current ship mass'
                        }).attr('data-toggle', 'tooltip').append(
                            $('<i>', {
                                class: ['fas', 'fa-fw', 'fa-question-circle'].join(' ')
                            }),
                            $('<i>', {
                                class: [
                                    'fas', 'fa-fw', 'fa-exclamation-triangle',
                                    'txt-color', 'txt-color-danger',
                                    'hidden'
                                ].join(' ')
                            })
                        ),
                        $('<td>', {
                            class: ['pf-table-cell-ellipses-auto'].join(' '),
                            text: 'Ship mass'
                        }),
                        $('<td>', {
                            class: ['text-right', 'txt-color', config.connectionInfoTableCellMassShipClass].join(' ')
                        })
                    ),
                    $('<tr>').append(
                        $('<td>', {
                            class: ['text-right', Util.config.helpClass].join(' '),
                            html: '<i class="fas fa-fw fa-question-circle"></i>',
                            title: 'max. mass left'
                        }).attr('data-toggle', 'tooltip'),
                        $('<td>', {
                            text: 'Mass left'
                        }),
                        $('<td>', {
                            class: ['text-right', 'txt-color', config.connectionInfoTableCellMassLeftClass].join(' ')
                        })
                    )
                )
            ).on('pf:updateInfoTable', function(e, data){
                // update information table -------------------------------------------------------
                let tableElement = $(this);
                let connectionData = tableElement.data('connectionData');
                if(connectionData){
                    if(connectionData.scope === 'wh'){
                        // update signature information -------------------------------------------
                        let sourceLabelElement = tableElement.find('.' + config.connectionInfoTableLabelSourceClass);
                        let targetLabelElement = tableElement.find('.' + config.connectionInfoTableLabelTargetClass);

                        // get related jsPlumb connection
                        let connection = $().getConnectionById(data.mapId, data.connectionId);
                        let signatureTypeNames = MapUtil.getConnectionDataFromSignatures(connection, connectionData);

                        let sourceLabel =  signatureTypeNames.sourceLabels;
                        let targetLabel =  signatureTypeNames.targetLabels;
                        sourceLabelElement.html(MapUtil.getEndpointOverlayContent(sourceLabel));
                        targetLabelElement.html(MapUtil.getEndpointOverlayContent(targetLabel));

                        // remove K162
                        sourceLabel = sourceLabel.diff(['K162']);
                        targetLabel = targetLabel.diff(['K162']);

                        // get static wormhole data by endpoint Labels
                        let wormholeName = '';
                        let wormholeData = null;
                        if(sourceLabel.length === 1 && targetLabel.length === 0){
                            wormholeName = sourceLabel[0];
                        }else if(sourceLabel.length === 0 && targetLabel.length === 1){
                            wormholeName = targetLabel[0];
                        }

                        if(
                            wormholeName &&
                            Init.wormholes.hasOwnProperty(wormholeName)
                        ){
                            wormholeData = Object.assign({}, Init.wormholes[wormholeName]);
                            wormholeData.class = Util.getSecurityClassForSystem(wormholeData.security);

                            // init wormhole tooltip ----------------------------------------------
                            let massTotalTooltipCell = tableElement.find('.' + config.connectionInfoTableCellMassTotalTooltipClass);
                            massTotalTooltipCell.addWormholeInfoTooltip(wormholeData);
                        }

                        // all required data is set -> re-calculate rows
                        tableElement.data('wormholeData', wormholeData);
                        tableElement.trigger('pf:calcInfoTable');
                    }

                }
            }).on('pf:calcInfoTable', function(e){
                // re-calculate information table from .data() cell values ------------------------
                let tableElement        = $(this);
                let connectionData      = tableElement.data('connectionData');
                let massChartCell       = tableElement.find('[data-percent]');

                let wormholeData        = tableElement.data('wormholeData');
                let shipData            = null;
                let shipName            = '';
                let showShip            = Boolean(tableElement.data('showShip'));
                let massLogRow          = tableElement.find('.' + config.connectionInfoTableRowMassLogClass);
                let massShipRow         = tableElement.find('.' + config.connectionInfoTableRowMassShipClass);

                // icons
                let massLogTooltipIcon  = massLogRow.find('i.fa-question-circle');
                let massLogStage2Icon   = massLogRow.find('i.fa-adjust');
                let massLogStage3Icon   = massLogRow.find('i.fa-circle');

                let massShipTooltipIcon = massShipRow.find('i.fa-question-circle');
                let massShipWarningIcon = massShipRow.find('i.fa-exclamation-triangle');

                // table cells
                let connectionCell      = tableElement.find('.' + config.connectionInfoTableCellConnectionClass);
                let massTotalCell       = tableElement.find('.' + config.connectionInfoTableCellMassTotalClass);
                let massLogCell         = tableElement.find('.' + config.connectionInfoTableCellMassLogClass);
                let massShipCell        = tableElement.find('.' + config.connectionInfoTableCellMassShipClass);
                let massLeftCell        = tableElement.find('.' + config.connectionInfoTableCellMassLeftClass);
                let massTotal           = null;                             // initial connection mass
                let massReduction       = 0;                                // default reduction (e.g. reduced, crit) in percent
                let massLog             = massLogCell.data('mass');         // recorded mass
                let massLogTotal        = massLog;                          // recorded mass + current ship
                let massIndividual      = null;                             // mass mass per jump
                let massShip            = 0;                                // current ship
                let massIndividualError = false;

                // get wormhole data from signature binding ---------------------------------------
                if(wormholeData){
                    massTotal           = parseInt(wormholeData.massTotal);
                    massIndividual      = parseInt(wormholeData.massIndividual);
                }

                // get connection type (show fake connection div) ---------------------------------
                connectionCell.find('div').removeClass().addClass(MapUtil.getConnectionFakeClassesByTypes(connectionData.type).join(' '));

                // get wormhole status ------------------------------------------------------------
                if(connectionData.type.indexOf('wh_critical') !== -1){
                    massReduction = 90;
                    massLogTooltipIcon.toggleClass('hidden', true);
                    massLogStage2Icon.toggleClass('hidden', true);
                    massLogStage3Icon.toggleClass('hidden', false);
                    massLogStage3Icon.parent().attr('title', 'stage 3 (critical)').tooltip('fixTitle');
                }else if(connectionData.type.indexOf('wh_reduced') !== -1){
                    massReduction = 50;
                    massLogTooltipIcon.toggleClass('hidden', true);
                    massLogStage2Icon.toggleClass('hidden', false);
                    massLogStage3Icon.toggleClass('hidden', true);
                    massLogStage3Icon.parent().attr('title', 'stage 2 (reduced)').tooltip('fixTitle');
                }else{
                    massLogTooltipIcon.toggleClass('hidden', false);
                    massLogStage2Icon.toggleClass('hidden', true);
                    massLogStage3Icon.toggleClass('hidden', true);
                    massLogStage3Icon.parent().attr('title', 'recorded total jump mass').tooltip('fixTitle');
                }

                if(massReduction){
                    let massLogReduction = massTotal / 100 * massReduction;
                    if(massLogReduction > massLog){
                        massLog = massLogTotal = massLogReduction;
                    }
                }

                // get current ship data ----------------------------------------------------------
                massShipCell.parent().toggle(showShip);
                if(showShip){
                    shipData = $('.' + config.headUserShipClass).data('shipData');
                    if(shipData){
                        if(shipData.mass){
                            massShip = parseInt(shipData.mass);

                            // check individual mass jump
                            if(massIndividual){
                                massIndividualError = massShip > massIndividual;
                            }
                        }
                        if(shipData.typeId && shipData.typeName){
                            shipName = shipData.typeName;
                        }
                    }
                }

                // update ship mass  and "individual mass" cells ----------------------------------
                massShipTooltipIcon.toggleClass('hidden', massIndividualError);
                massShipWarningIcon.toggleClass('hidden', !massIndividualError);
                let shipMassTooltip = 'current ship mass ' + (shipName ? '"' + shipName + '"' : '');
                if(massIndividualError){
                    shipMassTooltip = '"' + shipName + '" exceeds max jump mass for this connection: ' + Util.formatMassValue(massIndividual);
                }else{
                    // current ship mass check is OK  -> add to massLogTotal
                    massLogTotal += massShip;
                }
                massShipTooltipIcon.parent().attr('title', shipMassTooltip).tooltip('fixTitle');

                // current ship mass --------------------------------------------------------------
                massShipCell.html( function(){
                    let cell = $(this);
                    let value = '&nbsp;';
                    let error = false;
                    let textLineThrough = false;
                    if(massShip > 0){
                        value += Util.formatMassValue(massShip);
                        if(massIndividualError){
                            error = textLineThrough = true;
                            value = '&nbsp;&nbsp;' + value;
                        }else{
                            value = '-' + value;
                        }
                    }else{
                        error = true;
                        value = 'undefined';
                    }

                    // change cell style
                    cell.toggleClass('txt-color-red', error)
                        .toggleClass('txt-color-warning', !error)
                        .toggleClass('pf-font-line-through', textLineThrough);

                    return value;
                });

                // calculate mass left ------------------------------------------------------------
                let massLeft = massTotal - massLogTotal;
                massLeft = (massLeft < 0) ? 0 : massLeft;
                let massPercentLog = (massTotal > 0) ? Math.floor((100 / massTotal) * massLogTotal) : 0;

                // update easyPieChart and tooltip ------------------------------------------------
                let massPercentLeft = (100 - massPercentLog <= 0) ? 0 : '< ' + (100 - massPercentLog);
                massChartCell.data('easyPieChart').enableAnimation().update(massPercentLog * -1);
                massChartCell.attr('title', massPercentLeft + '% mass left').tooltip('fixTitle');

                // update mass cells --------------------------------------------------------------
                massTotalCell.html(massTotal > 0 ? Util.formatMassValue(massTotal) : 'undefined')
                    .toggleClass('txt-color-red', massTotal <= 0);
                massLogCell.html('-&nbsp;' + Util.formatMassValue(massLog));
                massLeftCell.html(
                    massLeft > 0 ?
                        '&#126;&nbsp;' + Util.formatMassValue(massLeft) :
                        (massLeft === 0 && massTotal) ?
                            'will collapse' : 'undefined')
                    .toggleClass('txt-color-red', massLeft <= 0)
                    .toggleClass('txt-color-success', massLeft > 0);
            })
        );

        element.find('[data-toggle="tooltip"]').tooltip({
            container: 'body'
        });

        return element;
    };

    /**
     * get HTML id by connectionId
     * @param connectionId
     * @returns {string}
     */
    let getConnectionElementId = (connectionId) => {
        return config.connectionInfoPanelId + connectionId;
    };

    /**
     * get all visible connection panel elements
     * @param moduleElement
     * @returns {*|T|{}}
     */
    let getConnectionElements = (moduleElement) => {
        return moduleElement.find('.' + config.connectionInfoPanelClass).not('#' + getConnectionElementId(0));
    };

    /**
     * request connection log data
     * @param requestData
     * @param context
     * @param callback
     */
    let requestConnectionLogData = (requestData, context, callback) => {
        // show loading animation
        for(let connectionId of requestData.connectionIds){
            context.moduleElement.find('#' + getConnectionElementId(connectionId) + ' table').showLoadingAnimation();
        }

        $.ajax({
            type: 'POST',
            url: Init.path.getMapConnectionData,
            data: requestData,
            dataType: 'json',
            context: context
        }).done(function(connectionsData){
            // enrich connectionData with "logs" data (if available) and other "missing" data
            for(let i = 0; i < this.connectionsData.length; i++){
                for(let connectionData of connectionsData){
                    if(this.connectionsData[i].id === connectionData.id){
                        // copy some missing data
                        this.connectionsData[i].created = connectionData.created;
                        // check for mass logs and copy data
                        if(connectionData.logs && connectionData.logs.length){
                            this.connectionsData[i].logs = connectionData.logs;
                        }
                        // check for signatures and copy data
                        if(connectionData.signatures && connectionData.signatures.length){
                            this.connectionsData[i].signatures = connectionData.signatures;
                        }
                        break;
                    }
                }
            }

            callback(this.moduleElement, this.connectionsData);
        }).always(function(){
            // hide loading animation
            for(let contextData of this.connectionsData){
                context.moduleElement.find('#' + getConnectionElementId(contextData.id) + ' table').hideLoadingAnimation();
            }
        });
    };

    /**
     * @see requestConnectionLogData
     * @param moduleElement
     * @param mapId
     * @param connectionsData
     */
    let getConnectionsLogData = (moduleElement, mapId, connectionsData) => {
        let connectionIds = [];
        for(let connectionData of connectionsData){
            connectionIds.push(connectionData.id);
        }

        let requestData = {
            mapId: mapId,
            connectionIds: connectionIds,
            addData : ['signatures', 'logs'],
           // filterData : ['logs'] // do not exclude connections with NO "logs" -> sig data will be used as well
        };

        let contextData = {
            moduleElement: moduleElement,
            connectionsData: connectionsData
        };

        requestConnectionLogData(requestData, contextData, addConnectionsData);
    };

    /**
     * replace/insert dataTables log data
     * @param moduleElement
     * @param connectionsData
     */
    let addConnectionsData = (moduleElement, connectionsData) => {

        let getRowIndexesByData = (dataTable, colName, value) => {
            return dataTable.rows().eq(0).filter((rowIdx) => {
                return (dataTable.cell(rowIdx, colName + ':name').data() === value);
            });
        };

        for(let connectionData of connectionsData){
           // find related dom element for current connection
            let connectionElement = moduleElement.find('#' + getConnectionElementId(connectionData.id));
            if(connectionElement.length){
                // attach connectionData to connection information for later use ------------------
                let connectionInfoElement = connectionElement.find('.' + config.moduleTableClass);
                connectionInfoElement.data('connectionData', connectionData);

                // update dataTable ---------------------------------------------------------------
                let dataTable = connectionElement.find('.dataTable').dataTable().api();

                if(connectionData.logs && connectionData.logs.length > 0){
                    for(let i = 0; i < connectionData.logs.length; i++){
                        let rowData = connectionData.logs[i];
                        let row = null;
                        let animationStatus = null;
                        let indexes = getRowIndexesByData(dataTable, 'index', rowData.id);
                        if(indexes.length === 0){
                            // row not found -> add new row
                            row = dataTable.row.add( rowData );
                            animationStatus = 'added';
                        }
                        /* else{
                            // we DON´t expect changes -> no row update)
                            // update row with FIRST index
                            //row = dataTable.row( parseInt(indexes[0]) );
                            // update row data
                            //row.data(connectionData.logs[i]);
                            //animationStatus = 'changed';
                        } */

                        if(
                            animationStatus !== null &&
                            row.length > 0
                        ){
                            row.nodes().to$().data('animationStatus', animationStatus);
                        }
                    }
                }else{
                    // clear table or leave empty
                    dataTable.clear();
                }

                // redraw dataTable
                dataTable.draw(false);
            }
        }
    };

    /**
     *
     * @param moduleElement
     * @param mapId
     * @param connectionData
     */
    let updateConnectionPanel = (moduleElement, mapId, connectionData) => {
        let rowElement = moduleElement.find('.row');
        let connectionElement = rowElement.find('#' + getConnectionElementId(connectionData.id));

        if( !connectionElement.length ){
            connectionElement = getConnectionElement(mapId, connectionData.id);
            connectionElement.append(getInformationElement(connectionData));

            let table = $('<table>', {
                class: ['compact', 'stripe', 'order-column', 'row-border', 'nowrap', config.connectionInfoTableClass].join(' ')
            }).append('<tfoot><tr><th></th><th></th><th></th><th></th><th></th></tr></tfoot>');
            connectionElement.append(table);

            // init empty table
            let logTable = table.DataTable({
                pageLength: 8,
                paging: true,
                pagingType: 'simple',
                lengthChange: false,
                ordering: true,
                order: [[ 4, 'desc' ]],
                info: true,
                searching: false,
                hover: false,
                autoWidth: false,
                // rowId: 'systemTo',
                language: {
                    emptyTable:  'No jumps recorded',
                    info: '_START_ to _END_ of _MAX_',
                    infoEmpty: ''
                },
                columnDefs: [
                    {
                        targets: 0,
                        name: 'index',
                        title: '<i class="fas fa-hashtag"></i>',
                        orderable: false,
                        searchable: false,
                        width: 20,
                        class: 'text-center',
                        data: 'id'
                    },{
                        targets: 1,
                        title: '',
                        width: 26,
                        orderable: false,
                        className: [Util.config.helpDefaultClass, 'text-center', config.tableCellImageClass].join(' '),
                        data: 'ship',
                        render: {
                            _: function(data, type, row){
                                let value = data.typeId;
                                if(type === 'display'){
                                    value = '<img src="' + Init.url.ccpImageServer + '/Render/' + value + '_32.png" title="' + data.typeName + '" data-toggle="tooltip" />';
                                }
                                return value;
                            }
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            $(cell).find('img').tooltip();
                        }
                    },{
                        targets: 2,
                        title: '',
                        width: 26,
                        orderable: false,
                        className: [Util.config.helpDefaultClass, 'text-center', config.tableCellImageClass].join(' '),
                        data: 'created.character',
                        render: {
                            _: function(data, type, row){
                                let value = data.name;
                                if(type === 'display'){
                                    value = '<img src="' + Init.url.ccpImageServer + '/Character/' + data.id + '_32.jpg" title="' + value + '" data-toggle="tooltip" />';
                                }
                                return value;
                            }
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            $(cell).find('img').tooltip();
                        }
                    },{
                        targets: 3,
                        title: 'mass',
                        className: ['text-right'].join(' ') ,
                        data: 'ship.mass',
                        render: {
                            _: function(data, type, row){
                                let value = data;
                                if(type === 'display'){
                                    value = Util.formatMassValue(value);
                                }
                                return value;
                            }
                        }
                    },{
                        targets: 4,
                        title: 'log',
                        width: 55,
                        className: ['text-right', config.tableCellCounterClass].join(' '),
                        data: 'created.created',
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            $(cell).initTimestampCounter('d');
                        }
                    }
                ],
                drawCallback: function(settings){
                    let animationRows = this.api().rows().nodes().to$().filter(function(a,b ){
                        return (
                            $(this).data('animationStatus') ||
                            $(this).data('animationTimer')
                        );
                    });

                    for(let i = 0; i < animationRows.length; i++){
                        $(animationRows[i]).pulseBackgroundColor($(animationRows[i]).data('animationStatus'));
                        $(animationRows[i]).removeData('animationStatus');
                    }

                },
                footerCallback: function(row, data, start, end, display ){

                    let api = this.api();
                    let sumColumnIndexes = [3];

                    // column data for "sum" columns over this page
                    let pageTotalColumns = api
                        .columns( sumColumnIndexes, { page: 'all'} )
                        .data();

                    // sum columns for "total" sum
                    pageTotalColumns.each((colData, index) => {
                        pageTotalColumns[index] = colData.reduce((a, b) => {
                            return parseInt(a) + parseInt(b);
                        }, 0);
                    });

                    $(sumColumnIndexes).each((index, value) => {
                        $( api.column( value ).footer() ).text( Util.formatMassValue(pageTotalColumns[index]) );

                        // save mass for further reCalculation of "info" table
                        connectionElement.find('.' + config.connectionInfoTableCellMassLogClass).data('mass', pageTotalColumns[index]);
                    });

                    // calculate "info" table -----------------------------------------------------
                    connectionElement.find('.' + config.moduleTableClass).trigger('pf:updateInfoTable', connectionElement.data());
                }
            });

            // find position to insert
            connectionElement.insertBefore(rowElement.find('#' + getConnectionElementId(0)));

            logTable.on('order.dt search.dt', function(){
                let pageInfo = logTable.page.info();
                logTable.column(0, {search:'applied', order:'applied'}).nodes().each((cell, i) => {
                    let content = (pageInfo.recordsTotal - i) + '.&nbsp;&nbsp;';
                    $(cell).html(content);
                });
            });
        }
    };

    /**
     * remove connection Panel from moduleElement
     * @param connectionElement
     */
    let removeConnectionPanel = (connectionElement) => {
        connectionElement = $(connectionElement);
        if(connectionElement.length){
            // destroy dataTable (and remove table from DOM)
            let logTable = connectionElement.find('.' + config.connectionInfoTableClass);
            logTable.dataTable().api().destroy(true);
            // remove belonging connectionElement
            connectionElement.remove();
        }
    };

    /**
     * get connections from ModuleElement
     * -> validate with current map data
     * @param moduleElement
     * @param mapId
     * @returns {{connectionsDataUpdate: Array, connectionsDataRemove: Array}}
     */
    let getConnectionsDataFromModule = (moduleElement, mapId) => {
        let activeMap = Util.getMapModule().getActiveMap();
        let mapData = activeMap.getMapDataFromClient({forceData: true});
        let connectionsData = {
            connectionsDataUpdate: [],
            connectionsDataRemove: [],
        };

        if(mapData !== false){
            getConnectionElements(moduleElement).each((i, connectionElement) => {
                let removeConnectionPanel = true;
                let connectionData = {id: $(connectionElement).data('connectionId') };

                let connection = $().getConnectionById(mapId, connectionData.id);
                if(connection){
                    let connectionDataTemp = MapUtil.getDataByConnection(connection);
                    if(connectionDataTemp.id > 0){
                        // connection still on map - OK
                        removeConnectionPanel = false;
                        connectionData = connectionDataTemp;
                    }
                }

                if(removeConnectionPanel){
                    connectionsData.connectionsDataRemove.push(connectionData);
                }else{
                    connectionsData.connectionsDataUpdate.push(connectionData);
                }
            });
        }

        return connectionsData;
    };

    /**
     * update/init multiple connection panels at once
     * @param moduleElement
     * @param mapId
     * @param connectionsDataUpdate
     * @param connectionsDataRemove
     */
    let updateConnectionPanels = (moduleElement, mapId, connectionsDataUpdate, connectionsDataRemove) => {
        for(let connectionData of connectionsDataRemove){
            let connectionElement = moduleElement.find('#' + getConnectionElementId(connectionData.id));
            removeConnectionPanel(connectionElement);
        }

        for(let connectionData of connectionsDataUpdate){
            updateConnectionPanel(moduleElement, mapId, connectionData);
        }

        // request connectionsLogData for each updated connection
        if(connectionsDataUpdate.length){
            getConnectionsLogData(moduleElement, mapId, connectionsDataUpdate);
        }

        // remove module if no connection panel left
        // --> all connection deselected on map
        let connectionElements = getConnectionElements(moduleElement);
        if(connectionElements.length === 0){
            MapUtil.getTabContentElementByMapElement(moduleElement).trigger('pf:removeConnectionModules');
        }

        // hide "control" panel when multiple connection
        moduleElement.find('#' + getConnectionElementId(0)).toggle(connectionElements.length < 2);
    };

    /**
     * set module observer
     * @param moduleElement
     * @param mapId
     */
    let setModuleObserver = (moduleElement, mapId) => {
        $(document).off('pf:updateConnectionInfoModule').on('pf:updateConnectionInfoModule', function(e, data){
            updateConnectionPanels(
                moduleElement,
                data.mapId,
                MapUtil.getDataByConnections(data.connectionsUpdate),
                MapUtil.getDataByConnections(data.connectionsRemove)
            );
        });

        $(document).off('pf:activeShip').on('pf:activeShip', function(e){
            moduleElement.find('.' + config.connectionInfoPanelClass).each((i, connectionElement) => {
                $(connectionElement).find('.' +  config.moduleTableClass).each((i, tableElement) => {
                    $(tableElement).trigger('pf:calcInfoTable');
                });
            });
        });

        // init toggle active ship ----------------------------------------------------------------
        moduleElement.find('.' + config.moduleHeadlineIconCurrentMassClass).on('click', function(e){
            let currentMassIcon = $(this).toggleClass('active');
            moduleElement.find('.' + config.connectionInfoPanelClass).each((i, connectionElement) => {
                $(connectionElement).find('.' +  config.moduleTableClass).each((i, tableElement) => {
                    $(tableElement).data('showShip', currentMassIcon.hasClass('active')).trigger('pf:calcInfoTable');
                });
            });
        });

        // init refresh connections ---------------------------------------------------------------
        moduleElement.find('.' + config.moduleHeadlineIconRefreshClass).on('click', function(e){
            refreshConnectionPanels(moduleElement, mapId);
        });
    };

    /**
     * refresh all connection panels in a module
     * @param moduleElement
     * @param mapId
     */
    let refreshConnectionPanels = (moduleElement, mapId) => {
        let connectionsData = getConnectionsDataFromModule(moduleElement, mapId);
        updateConnectionPanels(moduleElement, mapId, connectionsData.connectionsDataUpdate, connectionsData.connectionsDataRemove);
    };

    /**
     * before module destroy callback
     * @param moduleElement
     */
    let beforeDestroy = (moduleElement) => {
        getConnectionElements(moduleElement).each((i, connectionElement) => {
            removeConnectionPanel(connectionElement);
        });
    };

    /**
     * init callback
     * @param moduleElement
     * @param mapId
     * @param connectionData
     */
    let initModule = (moduleElement, mapId, connectionData) => {
        setModuleObserver(moduleElement, mapId);
    };

    /**
     * get module element
     * @param parentElement
     * @param mapId
     * @param connections
     * @returns {*|jQuery|HTMLElement}
     */
    let getModule = (parentElement, mapId, connections) => {
        let moduleElement = $('<div>').append(
            $('<div>', {
                class: config.moduleHeadClass
            }).append(
                $('<h5>', {
                    class: config.moduleHandlerClass
                }),
                $('<h5>', {
                    text: 'Connection'
                }),
                getHeadlineToolbar()
            )
        );

        let rowElement = $('<div>', {
            class: 'row'
        });

        moduleElement.append(rowElement);

        rowElement.append(getInfoPanelControl(mapId));

        updateConnectionPanels(moduleElement, mapId, MapUtil.getDataByConnections(connections), []);

        return moduleElement;
    };

    return {
        config: config,
        getModule: getModule,
        initModule: initModule,
        beforeDestroy: beforeDestroy
    };
});