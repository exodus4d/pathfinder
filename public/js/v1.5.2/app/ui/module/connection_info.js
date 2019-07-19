/**
 * Connection info module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox',
    'app/map/util'
], ($, Init, Util, bootbox, MapUtil) => {
    'use strict';

    let config = {
        // module info
        modulePosition: 1,
        moduleName: 'connectionInfo',
        moduleHeadClass: 'pf-module-head',                                                      // class for module header
        moduleHandlerClass: 'pf-module-handler-drag',                                           // class for "drag" handler

        // connection info module
        moduleTypeClass: 'pf-connection-info-module',                                           // class for this module

        // headline toolbar
        moduleHeadlineIconClass: 'pf-module-icon-button',                                       // class for toolbar icons in the head
        moduleHeadlineIconRefreshClass: 'pf-module-icon-button-refresh',                        // class for "refresh" icon
        moduleHeadlineIconCurrentMassClass: 'pf-module-icon-button-mass',                       // class for "current ship mass" toggle icon

        connectionInfoPanelClass: 'pf-connection-info-panel',                                   // class for connection info panels
        connectionInfoPanelId: 'pf-connection-info-panel-',                                     // id prefix for connection info panels

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
        tableToolbarCondensedClass: 'pf-dataTable-condensed-toolbar',                           // class for condensed table toolbar
        connectionInfoTableClass: 'pf-connection-info-table',                                   // class for connection tables
        tableCellImageClass: 'pf-table-image-cell',                                             // class for table "image" cells
        tableCellCounterClass: 'pf-table-counter-cell',                                         // class for table "counter" cells
        tableCellActionClass: 'pf-table-action-cell',                                           // class for "action" cells

        // connection dialog
        connectionDialogId: 'pf-connection-info-dialog',                                        // id for "connection" dialog
        typeSelectId: 'pf-connection-info-dialog-type-select',                                  // id for "ship type" select
        shipMassId: 'pf-connection-info-dialog-mass',                                           // id for "ship mass" input
        characterSelectId: 'pf-connection-info-dialog-character-select',                        // id for "character" select

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
        return $('<div>', {
            id: getConnectionElementId(connectionId),
            class: ['col-xs-12', 'col-sm-4', 'col-lg-3' , config.connectionInfoPanelClass].join(' ')
        }).data({
            mapId: mapId,
            connectionId: connectionId
        });
    };

    /**
     * get info control panel element
     * @param mapId
     * @returns {void|jQuery|*}
     */
    let getInfoPanelControl = mapId => {
        return getConnectionElement(mapId, 0).append($('<div>', {
            class: [Util.config.dynamicAreaClass, config.controlAreaClass].join(' '),
            html: '<i class="fas fa-fw fa-plus"></i>&nbsp;add connection&nbsp;&nbsp;<kbd>ctrl</kbd>&nbsp;+&nbsp;<kbd>click</kbd>'
        }));
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
            class: [Util.config.dynamicAreaClass, config.controlAreaClass].join(' ')
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
                                Util.triggerMenuAction(Util.getMapModule().getActiveMap(), 'SelectSystem', {systemId: connectionData.source});
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
                                Util.triggerMenuAction(Util.getMapModule().getActiveMap(), 'SelectSystem', {systemId: connectionData.target});
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

                        let sourceLabels =  signatureTypeNames.source.labels;
                        let targetLabels =  signatureTypeNames.target.labels;
                        sourceLabelElement.html(MapUtil.formatEndpointOverlaySignatureLabel(sourceLabels));
                        targetLabelElement.html(MapUtil.formatEndpointOverlaySignatureLabel(targetLabels));

                        // remove K162
                        sourceLabels = sourceLabels.diff(['K162']);
                        targetLabels = targetLabels.diff(['K162']);

                        // get static wormhole data by endpoint Labels
                        let wormholeName = '';
                        let wormholeData = null;
                        if(sourceLabels.length === 1 && targetLabels.length === 0){
                            wormholeName = sourceLabels[0];
                        }else if(sourceLabels.length === 0 && targetLabels.length === 1){
                            wormholeName = targetLabels[0];
                        }

                        if(
                            wormholeName &&
                            Init.wormholes.hasOwnProperty(wormholeName)
                        ){
                            wormholeData = Object.assign({}, Init.wormholes[wormholeName]);

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
                    shipData = Util.getObjVal(Util.getCurrentCharacterLog(), 'ship');
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
    let getConnectionElementId = connectionId => config.connectionInfoPanelId + connectionId;

    /**
     * get all visible connection panel elements
     * @param moduleElement
     * @returns {*|T|{}}
     */
    let getConnectionElements = moduleElement => moduleElement.find('.' + config.connectionInfoPanelClass).not('#' + getConnectionElementId(0));

    /**
     * enrich connectionData with "logs" data (if available) and other "missing" data
     * @param connectionsData
     * @param newConnectionsData
     * @returns {*}
     */
    let enrichConnectionsData = (connectionsData, newConnectionsData) => {
        for(let i = 0; i < connectionsData.length; i++){
            for(let newConnectionData of newConnectionsData){
                if(connectionsData[i].id === newConnectionData.id){
                    // copy some missing data
                    connectionsData[i].character = newConnectionData.character;
                    connectionsData[i].created = newConnectionData.created;
                    connectionsData[i].type = newConnectionData.type;
                    // check for mass logs and copy data
                    if(newConnectionData.logs && newConnectionData.logs.length){
                        connectionsData[i].logs = newConnectionData.logs;
                    }
                    // check for signatures and copy data
                    if(newConnectionData.signatures && newConnectionData.signatures.length){
                        connectionsData[i].signatures = newConnectionData.signatures;
                    }
                    break;
                }
            }
        }
        return connectionsData;
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
            this.connectionsData = enrichConnectionsData(this.connectionsData, connectionsData);

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

        let getRowIndexesByData = (tableApi, colName, value) => {
            return tableApi.rows().eq(0).filter((rowIdx) => {
                return (tableApi.cell(rowIdx, colName + ':name').data() === value);
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
                let tableApi = connectionElement.find('.dataTable').dataTable().api();

                if(connectionData.logs && connectionData.logs.length > 0){
                    for(let i = 0; i < connectionData.logs.length; i++){
                        let rowData = connectionData.logs[i];
                        let rowNew = null;
                        let animationStatus = null;
                        let indexes = getRowIndexesByData(tableApi, 'index', rowData.id);
                        if(indexes.length === 0){
                            // row not found -> add new row
                            rowNew = tableApi.row.add(rowData);
                            animationStatus = 'added';
                        }else{
                            // update row with FIRST index
                            let row = tableApi.row( parseInt(indexes[0]));
                            let rowDataCurrent = row.data();

                            // check if row data changed
                            if(rowDataCurrent.updated.updated !== rowData.updated.updated){
                                // ... row changed -> delete old and re-add
                                // -> cell actions might have changed
                                row.remove();
                                rowNew = tableApi.row.add(rowData);
                                animationStatus = 'changed';
                            }
                        }

                        if(
                            animationStatus !== null &&
                            rowNew.length > 0
                        ){
                            rowNew.nodes().to$().data('animationStatus', animationStatus);
                        }
                    }
                }else{
                    // clear table or leave empty
                    tableApi.clear();
                }

                // redraw dataTable
                tableApi.draw(false);
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
            }).append('<tfoot><tr><th></th><th></th><th></th><th></th><th></th><th></th><th></th></tr></tfoot>');
            connectionElement.append(table);

            // init empty table
            let logTable = table.DataTable({
                dom: '<"container-fluid"' +
                        '<"row ' + config.tableToolbarCondensedClass + '"' +
                            '<"col-xs-5"i><"col-xs-5"p><"col-xs-2 text-right"B>>' +
                        '<"row"tr>>',
                buttons: {
                    name: 'tableTools',
                    buttons: [
                        {
                            name: 'addLog',
                            tag: 'a',
                            className: config.moduleHeadlineIconClass,
                            text: '<i class="fa fa-plus"></i>',
                            action: function(e, tableApi, node, conf){
                                let logData = {};

                                // pre-fill form with current character data (if available)
                                let currentUserData = Util.getCurrentUserData();
                                if(currentUserData && currentUserData.character){
                                    logData.character = {
                                        id: currentUserData.character.id,
                                        name: currentUserData.character.name
                                    };
                                    if(currentUserData.character.log){
                                        logData.ship = {
                                            id: currentUserData.character.log.ship.typeId,
                                            name: currentUserData.character.log.ship.typeName,
                                            mass: currentUserData.character.log.ship.mass
                                        };
                                    }
                                }

                                showLogDialog(moduleElement, connectionElement, connectionData, logData);
                            }
                        }
                    ]
                },
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
                language: {
                    emptyTable:  'No jumps recorded',
                    info: '_START_ - _END_ of _MAX_',
                    infoEmpty: '',
                    paginate: {
                        previous:   '',
                        next:       ''
                    }
                },
                columnDefs: [
                    {
                        targets: 0,
                        name: 'index',
                        title: '<i class="fas fa-hashtag"></i>',
                        orderable: false,
                        searchable: false,
                        width: 20,
                        className: ['text-center', 'txt-color'].join(' '),
                        data: 'id',
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            if(
                                !rowData.record ||
                                (rowData.updated.updated !== rowData.created.created)
                            ){
                                // log was manually modified or added
                                $(cell)
                                    .addClass(Util.config.helpClass)
                                    .addClass( 'txt-color-orange').tooltip({
                                        container: 'body',
                                        title: 'added/updated manually'
                                    });
                            }
                        }
                    },{
                        targets: 1,
                        name: 'ship',
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
                        name: 'character',
                        title: '',
                        width: 26,
                        orderable: false,
                        className: [Util.config.helpDefaultClass, 'text-center', config.tableCellImageClass].join(' '),
                        data: 'character',
                        render: {
                            _: (cellData, type, rowData, meta) => {
                                let value = cellData.name;
                                if(type === 'display'){
                                    value = '<img src="' + Init.url.ccpImageServer + '/Character/' + cellData.id + '_32.jpg" title="' + value + '" data-toggle="tooltip" />';
                                }
                                return value;
                            }
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            $(cell).find('img').tooltip();
                        }
                    },{
                        targets: 3,
                        name: 'mass',
                        title: 'mass',
                        className: ['text-right'].join(' ') ,
                        data: 'ship.mass',
                        render: {
                            _: (cellData, type, rowData, meta) => {
                                let value = cellData;
                                if(type === 'display'){
                                    value = Util.formatMassValue(value);
                                    if(!rowData.active){
                                        // log is "deleted"
                                        value = '<span class="pf-font-line-through txt-color txt-color-red">' + value + '</span>';
                                    }
                                }
                                return value;
                            }
                        }
                    },{
                        targets: 4,
                        name: 'created',
                        title: 'log',
                        width: 55,
                        className: ['text-right', config.tableCellCounterClass].join(' '),
                        data: 'created.created',
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            $(cell).initTimestampCounter('d');
                        }
                    },{
                        targets: 5,
                        name: 'edit',
                        title: '',
                        orderable: false,
                        searchable: false,
                        width: 10,
                        className: ['text-center', config.tableCellActionClass, config.moduleHeadlineIconClass].join(' '),
                        data: null,
                        render: {
                            display: data => {
                                let icon = '';
                                if(data.active){
                                    icon = '<i class="fas fa-pen"></i>';
                                }
                                return icon;
                            }
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            if($(cell).is(':empty')){
                                $(cell).removeClass(config.tableCellActionClass + ' ' + config.moduleHeadlineIconClass);
                            }else{
                                $(cell).on('click', function(e){
                                    showLogDialog(moduleElement, connectionElement, connectionData, rowData);
                                });
                            }
                        }
                    },{
                        targets: 6,
                        name: 'delete',
                        title: '',
                        orderable: false,
                        searchable: false,
                        width: 10,
                        className: ['text-center', config.tableCellActionClass].join(' '),
                        data: 'active',
                        render: {
                            display: data => {
                                let val = '<i class="fas fa-plus"></i>';
                                if(data){
                                    val = '<i class="fas fa-times txt-color txt-color-redDarker"></i>';
                                }
                                return val;
                            }
                        },
                        createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                            let tableApi = this.api();

                            if(rowData.active){
                                let confirmationSettings = {
                                    container: 'body',
                                    placement: 'left',
                                    btnCancelClass: 'btn btn-sm btn-default',
                                    btnCancelLabel: 'cancel',
                                    btnCancelIcon: 'fas fa-fw fa-ban',
                                    title: 'delete jump log',
                                    btnOkClass: 'btn btn-sm btn-danger',
                                    btnOkLabel: 'delete',
                                    btnOkIcon: 'fas fa-fw fa-times',
                                    onConfirm : function(e, target){
                                        // get current row data (important!)
                                        // -> "rowData" param is not current state, values are "on createCell()" state
                                        rowData = tableApi.row($(cell).parents('tr')).data();

                                        connectionElement.find('table').showLoadingAnimation();

                                        Util.request('DELETE', 'log', rowData.id, {}, {
                                            connectionElement: connectionElement
                                        }, requestAlways)
                                            .then(
                                                payload => {
                                                    addConnectionsData(moduleElement, enrichConnectionsData([connectionData], payload.data));
                                                },
                                                Util.handleAjaxErrorResponse
                                            );
                                    }
                                };

                                // init confirmation dialog
                                $(cell).confirmation(confirmationSettings);
                            }else {
                                $(cell).on('click', function(e){
                                    connectionElement.find('table').showLoadingAnimation();

                                    let requestData = {
                                        active: 1
                                    };

                                    Util.request('PATCH', 'log', rowData.id, requestData, {
                                        connectionElement: connectionElement
                                    }, requestAlways)
                                        .then(
                                            payload => {
                                                addConnectionsData(moduleElement, enrichConnectionsData([connectionData], payload.data));
                                            },
                                            Util.handleAjaxErrorResponse
                                        );
                                });
                            }
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
                    let tableApi = this.api();
                    let sumColumnIndexes = ['mass:name', 'delete:name'];

                    // column data for "sum" columns over this page
                    let pageTotalColumns = tableApi
                        .columns( sumColumnIndexes, { page: 'all'} )
                        .data();

                    // sum columns for "total" sum
                    pageTotalColumns.each((colData, colIndex) => {
                        pageTotalColumns[colIndex] = colData.reduce((sum, val, rowIndex) => {
                            // sum "mass" (colIndex 0) only if not "deleted" (colIndex 1)
                            if(colIndex === 0 && pageTotalColumns[1][rowIndex]){
                                return sum + parseInt(val);
                            }else{
                                return sum;
                            }
                        }, 0);
                    });

                    sumColumnIndexes.forEach((colSelector, index) => {
                        // only "mass" column footer needs updates
                        if(colSelector === 'mass:name'){
                            $(tableApi.column(colSelector).footer()).text( Util.formatMassValue(pageTotalColumns[index]) );

                            // save mass for further reCalculation of "info" table
                            connectionElement.find('.' + config.connectionInfoTableCellMassLogClass).data('mass', pageTotalColumns[index]);
                        }
                    });

                    // calculate "info" table -----------------------------------------------------
                    connectionElement.find('.' + config.moduleTableClass).trigger('pf:updateInfoTable', connectionElement.data());
                }
            });

            // find position to insert
            connectionElement.insertBefore(rowElement.find('#' + getConnectionElementId(0)));

            logTable.on('order.dt search.dt', function(){
                let pageInfo = logTable.page.info();
                logTable.column('index:name', {search:'applied', order:'applied'}).nodes().each((cell, i) => {
                    let content = (pageInfo.recordsTotal - i) + '.';
                    $(cell).html(content);
                });
            });
        }
    };

    /**
     *
     * @param context
     */
    let requestAlways = (context) => {
        context.connectionElement.find('table').hideLoadingAnimation();
    };

    /**
     * show jump log dialog
     * @param moduleElement
     * @param connectionElement
     * @param connectionData
     * @param logData
     */
    let showLogDialog = (moduleElement, connectionElement, connectionData, logData = {}) => {

        let data = {
            id: config.connectionDialogId,
            typeSelectId: config.typeSelectId,
            shipMassId: config.shipMassId,
            characterSelectId: config.characterSelectId,
            logData: logData,
            massFormat: () => {
                return (val, render) => {
                    return  (parseInt(render(val) || 0) / 1000) || '';
                };
            }
        };

        requirejs(['text!templates/dialog/connection_log.html', 'mustache'], (template, Mustache) => {
            let content = Mustache.render(template, data);

            let connectionDialog = bootbox.dialog({
                title: 'Jump log',
                message: content,
                show: false,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fas fa-fw fa-check"></i>&nbsp;save',
                        className: 'btn-success',
                        callback: function(){
                            let form = this.find('form');

                            // validate form
                            form.validator('validate');

                            // check whether the form is valid
                            let formValid = form.isValidForm();

                            if(formValid){
                                // get form data
                                let formData = form.getFormValues();
                                formData.id = Util.getObjVal(logData, 'id') || 0;
                                formData.connectionId = Util.getObjVal(connectionData, 'id') || 0;
                                formData.shipTypeId = Util.getObjVal(formData, 'shipTypeId') || 0;
                                formData.shipMass = parseInt((Util.getObjVal(formData, 'shipMass') || 0) * 1000);
                                formData.characterId = Util.getObjVal(formData, 'characterId') || 0;

                                // we need some "additional" form data from the Select2 dropdown
                                // -> data is required on the backend side
                                let formDataShip = form.find('#' + config.typeSelectId).select2('data');
                                let formDataCharacter = form.find('#' + config.characterSelectId).select2('data');
                                formData.shipTypeName = formDataShip.length ? formDataShip[0].text : '';
                                formData.characterName = formDataCharacter.length ? formDataCharacter[0].text : '';

                                let method = formData.id ? 'PATCH' : 'PUT';

                                Util.request(method, 'log', formData.id, formData, {
                                    connectionElement: connectionElement,
                                    formElement: form
                                }, requestAlways)
                                    .then(
                                        payload => {
                                            addConnectionsData(moduleElement, enrichConnectionsData([connectionData], payload.data));
                                            this.modal('hide');
                                        },
                                        Util.handleAjaxErrorResponse
                                    );

                            }

                            return false;
                        }
                    }
                }
            });

            connectionDialog.on('show.bs.modal', function(e){
                let modalContent = $('#' + config.connectionDialogId);

                // init type select live search
                let selectElementType = modalContent.find('#' + config.typeSelectId);
                selectElementType.initUniverseTypeSelect({
                    categoryIds: [6],
                    maxSelectionLength: 1,
                    selected: [Util.getObjVal(logData, 'ship.typeId')]
                }).on('select2:select select2:unselecting', function(e){
                    // get ship mass from selected ship type and update mass input field
                    let shipMass = e.params.data ? e.params.data.mass / 1000 : '';
                    modalContent.find('#' + config.shipMassId).val(shipMass);
                });

                // init character select live search
                let selectElementCharacter = modalContent.find('#' + config.characterSelectId);
                selectElementCharacter.initUniverseSearch({
                    categoryNames: ['character'],
                    maxSelectionLength: 1
                });

            });

            // show dialog
            connectionDialog.modal('show');
        });
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
        let mapData = activeMap.getMapDataFromClient(['hasId']);
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