/**
 * Connection info module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'module/base',
    'bootbox',
    'app/counter',
    'app/map/util'
], ($, Init, Util, BaseModule, bootbox, Counter, MapUtil) => {
    'use strict';

    let ConnectionInfoModule = class ConnectionInfoModule extends BaseModule {
        constructor(config = {}) {
            super(Object.assign({}, new.target.defaultConfig, config));
        }

        /**
         * get HTML id by connectionId
         * @param connectionId
         * @returns {string}
         */
        getConnectionElementId(connectionId = 0){
            return [
                this._config.connectionInfoPanelClass,
                this._mapId,
                connectionId
            ].join('-');
        }

        /**
         * get all visible connection panel elements
         * @returns {*|T|{}}
         */
        getConnectionElements(){
            return [...this.moduleElement.getElementsByClassName(this._config.connectionInfoPanelClass)]
                .filter(el => el.id !== this.getConnectionElementId());
        }

        /**
         * module header
         * @param text
         * @returns {HTMLDivElement}
         */
        newHeaderElement(text){
            let headEl = super.newHeaderElement(text);

            let toolbarEl = this.newHeadlineToolbarElement();

            let iconMassEl = this.newIconElement([
                'fa-male', 'fa-fw',
                this._config.moduleHeadlineIconClass,
                this._config.moduleHeadlineIconCurrentMassClass,
                this._config.showShip ? 'active' : ''
            ]);
            iconMassEl.setAttribute('title', 'toggle&nbsp;current&nbsp;ship&nbsp;mass');

            let iconRefreshEl = this.newIconElement([
                'fa-sync', 'fa-fw',
                this._config.moduleHeadlineIconClass,
                this._config.moduleHeadlineIconRefreshClass
            ]);
            iconRefreshEl.setAttribute('title', 'refresh&nbsp;all');

            toolbarEl.append(iconMassEl, iconRefreshEl);
            headEl.append(toolbarEl);

            return headEl;
        }

        /**
         * get info control panel element
         * @param mapId
         * @returns {HTMLDivElement}
         */
        newInfoPanelControlEl(mapId){
            let connectionEl = this.newConnectionElement(mapId);
            connectionEl.append(
                this.newControlElement('add connection&nbsp;&nbsp;<kbd>ctrl</kbd>&nbsp;+&nbsp;<kbd>click</kbd>', [], ['fa-plus'])
            );

            return connectionEl;
        }

        /**
         * get new connection element
         * @param mapId
         * @param connectionId
         * @returns {HTMLDivElement}
         */
        newConnectionElement(mapId, connectionId = 0){
            let connectionEl = document.createElement('div');
            connectionEl.id = this.getConnectionElementId(connectionId);
            connectionEl.classList.add(this._config.connectionInfoPanelClass);
            $(connectionEl).data({
                mapId: mapId,
                connectionId: connectionId
            });

            return connectionEl;
        }

        /**
         * render module
         * @param mapId
         * @param connections
         * @returns {HTMLElement}
         */
        render(mapId, connections){
            this._mapId = mapId;

            let rowEl = document.createElement('div');
            rowEl.classList.add(this._config.bodyClassName, 'grid');
            rowEl.append(this.newInfoPanelControlEl(mapId));
            this.moduleElement.append(rowEl);

            this.updateConnectionPanels(mapId, MapUtil.getDataByConnections(connections), []);
            this.setModuleObserver();

            return this.moduleElement;
        }

        /**
         * set module observer
         */
        setModuleObserver(){
            $(document).off('pf:updateConnectionInfoModule').on('pf:updateConnectionInfoModule', (e, data) => {
                this.updateConnectionPanels(
                    data.mapId,
                    MapUtil.getDataByConnections(data.connectionsUpdate),
                    MapUtil.getDataByConnections(data.connectionsRemove)
                );
            });

            $(document).off('pf:activeShip').on('pf:activeShip', (e) => {
                $(this.moduleElement).find('.' + this._config.connectionInfoPanelClass).each((i, connectionElement) => {
                    $(connectionElement).find('.' +  this._config.moduleTableClass).each((i, tableElement) => {
                        $(tableElement).trigger('pf:calcInfoTable');
                    });
                });
            });

            // init toggle active ship ----------------------------------------------------------------
            $(this.moduleElement).find('.' + this._config.moduleHeadlineIconCurrentMassClass).on('click', e => {
                let currentMassIcon = $(e.target).toggleClass('active');
                $(this.moduleElement).find('.' + this._config.connectionInfoPanelClass).each((i, connectionElement) => {
                    $(connectionElement).find('.' +  this._config.moduleTableClass).each((i, tableElement) => {
                        $(tableElement).data('showShip', currentMassIcon.hasClass('active')).trigger('pf:calcInfoTable');
                    });
                });
            });

            // init refresh connections ---------------------------------------------------------------
            $(this.moduleElement).find('.' + this._config.moduleHeadlineIconRefreshClass).on('click', e => {
                this.refreshConnectionPanels();
            });

            // init tooltips
            $(this.moduleElement).initTooltips({
                html: true
            });
        }

        /**
         * refresh all connection panels in a module
         */
        refreshConnectionPanels(){
            let connectionsData = this.getConnectionsDataFromModule();
            this.updateConnectionPanels(this._mapId, connectionsData.connectionsDataUpdate, connectionsData.connectionsDataRemove);
        }


        /**
         * get connections from ModuleElement
         * -> validate with current map data
         * @returns {{connectionsDataUpdate: Array, connectionsDataRemove: Array}}
         */
        getConnectionsDataFromModule(){
            let activeMap = Util.getMapModule().getActiveMap();
            let mapData = activeMap.getMapDataFromClient(['hasId']);
            let connectionsData = {
                connectionsDataUpdate: [],
                connectionsDataRemove: [],
            };

            if(mapData !== false){
                this.getConnectionElements().forEach((connectionElement, i) => {
                    let removeConnectionPanel = true;
                    let connectionData = {id: $(connectionElement).data('connectionId') };

                    let connection = $().getConnectionById(this._mapId, connectionData.id);
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
        }

        /**
         * enrich connectionData with "logs" data (if available) and other "missing" data
         * @param connectionsData
         * @param newConnectionsData
         * @returns {*}
         */
        enrichConnectionsData(connectionsData, newConnectionsData){
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
        }

        /**
         * @param mapId
         * @param connectionsData
         * @returns {Promise}
         */
        getConnectionsLogData(mapId, connectionsData){
            let connectionIds = connectionsData.map(connectionData => connectionData.id);

            // show loading animation
            for(let connectionId of connectionIds){
                let tableEls = this.moduleElement.querySelector('#' + this.getConnectionElementId(connectionId))
                    .getElementsByTagName('table');
                $(tableEls).showLoadingAnimation();
            }

            return this.request('GET', 'Connection', connectionIds, {
                mapId: mapId,
                addData : ['signatures', 'logs'],
                // filterData : ['logs'] // do not exclude connections with NO "logs" -> sig data will be used as well
            }, {
                connectionsData: connectionsData
            }, context => {
                // hide loading animation
                for(let contextData of context.connectionsData){
                    let connectionEl = this.moduleElement.querySelector('#' + this.getConnectionElementId(contextData.id));
                    // connectionEl might be removed in meantime ( e.g. module removed)
                    if(connectionEl){
                        let tableEls = connectionEl.getElementsByTagName('table');
                        $(tableEls).hideLoadingAnimation();
                    }
                }
            });
        }

        /**
         * replace/insert dataTables log data
         * @param connectionsData
         */
        addConnectionsData(connectionsData){

            let getRowIndexesByData = (tableApi, colName, value) => {
                return tableApi.rows().eq(0).filter((rowIdx) => {
                    return (tableApi.cell(rowIdx, colName + ':name').data() === value);
                });
            };

            for(let connectionData of connectionsData){
                // find related dom element for current connection
                let connectionElement = document.getElementById(this.getConnectionElementId(connectionData.id));
                if(connectionElement){
                    // attach connectionData to connection information for later use ------------------
                    let connectionInfoElement = $(connectionElement.querySelector('.' + this._config.moduleTableClass));
                    connectionInfoElement.data('connectionData', connectionData);

                    // update dataTable ---------------------------------------------------------------
                    let tableApi = $(connectionElement).find('.dataTable').dataTable().api();

                    if(connectionData.logs && connectionData.logs.length > 0){
                        for(let i = 0; i < connectionData.logs.length; i++){
                            let rowData = connectionData.logs[i];
                            let rowNew;
                            let animationStatus = null;
                            let indexes = getRowIndexesByData(tableApi, 'index', rowData.id);
                            if(indexes.length === 0){
                                // row not found -> add new row
                                rowNew = tableApi.row.add(rowData);
                                animationStatus = 'added';
                            }else{
                                // update row with FIRST index
                                let row = tableApi.row(parseInt(indexes[0]));
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
        }

        /**
         * get connection information element
         * @param connectionData
         * @returns {HTMLDivElement}
         */
        getInformationElement(connectionData){

            // connection scope -----------------------------------------------------------------------
            let scopeLabel = MapUtil.getScopeInfoForConnection(connectionData.scope, 'label');

            let element = document.createElement('div');
            element.classList.add(BaseModule.Util.config.dynamicAreaClass, this._config.controlAreaClass);

            $(element).append(
                $('<table>', {
                    class: ['table', 'table-condensed', 'pf-table-fixed', this._config.moduleTableClass].join(' ')
                }).data('showShip', this._config.showShip).append(
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
                                    class: [this._config.connectionInfoTableLabelSourceClass].join(' ')
                                }),
                                $('<i>', {
                                    class: 'fas fa-fw fa-angle-double-right'
                                }),
                                $('<span>', {
                                    class: [this._config.connectionInfoTableLabelTargetClass].join(' ')
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
                                class: ['text-right', Util.config.helpClass, this._config.connectionInfoTableCellMassTotalTooltipClass].join(' '),
                                html: '<i class="fas fa-fw fa-question-circle"></i>'
                            }),
                            $('<td>', {
                                text: scopeLabel.capitalize()
                            }),
                            $('<td>', {
                                class: ['text-right', this._config.connectionInfoTableCellConnectionClass].join(' ')
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
                                class: ['text-right', 'txt-color', this._config.connectionInfoTableCellMassTotalClass].join(' ')
                            })
                        ),
                        $('<tr>', {
                            class: this._config.connectionInfoTableRowMassLogClass
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
                                class: ['text-right', this._config.connectionInfoTableCellMassLogClass].join(' ')
                            })
                        ),
                        $('<tr>', {
                            class: this._config.connectionInfoTableRowMassShipClass
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
                                class: ['text-right', 'txt-color', this._config.connectionInfoTableCellMassShipClass].join(' ')
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
                                class: ['text-right', 'txt-color', this._config.connectionInfoTableCellMassLeftClass].join(' ')
                            })
                        )
                    )
                ).on('pf:updateInfoTable', (e, data) => {
                    // update information table -------------------------------------------------------
                    let tableElement = $(e.target);
                    let connectionData = tableElement.data('connectionData');
                    if(connectionData){
                        if(connectionData.scope === 'wh'){
                            // update signature information -------------------------------------------
                            let sourceLabelElement = tableElement.find('.' + this._config.connectionInfoTableLabelSourceClass);
                            let targetLabelElement = tableElement.find('.' + this._config.connectionInfoTableLabelTargetClass);

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
                                let massTotalTooltipCell = tableElement.find('.' + this._config.connectionInfoTableCellMassTotalTooltipClass);
                                massTotalTooltipCell.addWormholeInfoTooltip(wormholeData);
                            }

                            // all required data is set -> re-calculate rows
                            tableElement.data('wormholeData', wormholeData);
                            tableElement.trigger('pf:calcInfoTable');
                        }

                    }
                }).on('pf:calcInfoTable', e => {
                    // re-calculate information table from .data() cell values ------------------------
                    let tableElement        = $(e.target);
                    let connectionData      = tableElement.data('connectionData');
                    let massChartCell       = tableElement.find('[data-percent]');

                    let wormholeData        = tableElement.data('wormholeData');
                    let shipData            = null;
                    let shipName            = '';
                    let showShip            = Boolean(tableElement.data('showShip'));
                    let massLogRow          = tableElement.find('.' + this._config.connectionInfoTableRowMassLogClass);
                    let massShipRow         = tableElement.find('.' + this._config.connectionInfoTableRowMassShipClass);

                    // icons
                    let massLogTooltipIcon  = massLogRow.find('i.fa-question-circle');
                    let massLogStage2Icon   = massLogRow.find('i.fa-adjust');
                    let massLogStage3Icon   = massLogRow.find('i.fa-circle');

                    let massShipTooltipIcon = massShipRow.find('i.fa-question-circle');
                    let massShipWarningIcon = massShipRow.find('i.fa-exclamation-triangle');

                    // table cells
                    let connectionCell      = tableElement.find('.' + this._config.connectionInfoTableCellConnectionClass);
                    let massTotalCell       = tableElement.find('.' + this._config.connectionInfoTableCellMassTotalClass);
                    let massLogCell         = tableElement.find('.' + this._config.connectionInfoTableCellMassLogClass);
                    let massShipCell        = tableElement.find('.' + this._config.connectionInfoTableCellMassShipClass);
                    let massLeftCell        = tableElement.find('.' + this._config.connectionInfoTableCellMassLeftClass);
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
                        shipData = Util.getObjVal(Util.getCurrentCharacterData('log'), 'ship');
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

            $(element).find('[data-toggle="tooltip"]').tooltip({
                container: 'body'
            });

            return element;
        }

        /**
         * update/init multiple connection panels at once
         * @param mapId
         * @param connectionsDataUpdate
         * @param connectionsDataRemove
         */
        updateConnectionPanels(mapId, connectionsDataUpdate, connectionsDataRemove){
            for(let connectionData of connectionsDataRemove){
                let connectionElement = this.moduleElement.querySelector('#' + this.getConnectionElementId(connectionData.id));
                this.removeConnectionPanel(connectionElement);
            }

            for(let connectionData of connectionsDataUpdate){
                this.updateConnectionPanel(mapId, connectionData);
            }

            // request connectionsLogData for each updated connection
            if(connectionsDataUpdate.length){
                this.getConnectionsLogData(mapId, connectionsDataUpdate)
                    //.then(payload => this.addConnectionsData(payload.data))
                    .then(payload => this.addConnectionsData(
                        this.enrichConnectionsData(payload.context.connectionsData, payload.data)
                    ))
                    .catch(payload => {
                        console.error(payload);
                    });
            }

            // remove module if no connection panel left
            // --> all connection deselected on map
            let connectionElements = this.getConnectionElements();
            if(connectionElements.length === 0){
                MapUtil.getTabContentElementByMapElement(this.moduleElement).trigger('pf:removeConnectionModules');
            }

            // hide "control" panel when multiple connection
            let connectionEl = this.moduleElement.querySelector('#' + this.getConnectionElementId());
            connectionEl.style.display = connectionElements.length < 2 ? 'block' : 'none';
        }


        /**
         * remove connection Panel from moduleElement
         * @param connectionElement
         */
        removeConnectionPanel(connectionElement){
            connectionElement = $(connectionElement);
            if(connectionElement.length){
                // destroy dataTable (and remove table from DOM)
                let logTable = connectionElement.find('.' + this._config.connectionInfoTableClass);
                logTable.dataTable().api().destroy(true);
                // remove belonging connectionElement
                connectionElement.remove();
            }
        }

        /**
         * @param mapId
         * @param connectionData
         */
        updateConnectionPanel(mapId, connectionData){
            let module = this;

            let rowElement = module.moduleElement.querySelector('.' + module._config.bodyClassName);
            let connectionElement = rowElement.querySelector('#' + module.getConnectionElementId(connectionData.id));

            if(!connectionElement){
                connectionElement = module.newConnectionElement(mapId, connectionData.id);
                connectionElement.append(module.getInformationElement(connectionData));

                let tableEl = document.createElement('table');
                tableEl.classList.add('compact', 'stripe', 'order-column', 'row-border', 'nowrap', module._config.connectionInfoTableClass);
                tableEl.insertAdjacentHTML('beforeend', '<tfoot><tr><th></th><th></th><th></th><th></th><th></th><th></th><th></th></tr></tfoot>');

                connectionElement.append(tableEl);

                // init empty table
                let tableApi = $(tableEl).DataTable({
                    dom: '<"flex-row flex-between ' + module._config.tableToolbarCondensedClass + '"' +
                        '<"flex-col"i><"flex-col flex-grow"p><"flex-col"BS>>' +
                        '<"flex-row"<"flex-col flex-grow"tr>>',
                    buttons: {
                        name: 'tableTools',
                        buttons: [
                            {
                                name: 'addLog',
                                tag: 'a',
                                className: module._config.moduleHeadlineIconClass,
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

                                    module.showLogDialog(connectionElement, connectionData, logData);
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
                            className: [Util.config.helpDefaultClass, 'text-center', module._config.tableCellImageClass].join(' '),
                            data: 'ship',
                            render: {
                                _: function(data, type, row){
                                    let value = data.typeId;
                                    if(type === 'display'){
                                        value = '<img src="' + Util.eveImageUrl('types', value) + '" title="' + data.typeName + '" data-toggle="tooltip" />';
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
                            className: [Util.config.helpDefaultClass, 'text-center', module._config.tableCellImageClass].join(' '),
                            data: 'character',
                            render: {
                                _: (cellData, type, rowData, meta) => {
                                    let value = cellData.name;
                                    if(type === 'display'){
                                        value = '<img src="' + Util.eveImageUrl('characters', cellData.id) + '" title="' + value + '" data-toggle="tooltip" />';
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
                            className: ['text-right', module._config.tableCellCounterClass].join(' '),
                            data: 'created.created'
                        },{
                            targets: 5,
                            name: 'edit',
                            title: '',
                            orderable: false,
                            searchable: false,
                            width: 10,
                            className: ['text-center', module._config.tableCellActionClass, module._config.moduleHeadlineIconClass].join(' '),
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
                                    $(cell).removeClass(module._config.tableCellActionClass + ' ' + module._config.moduleHeadlineIconClass);
                                }else{
                                    $(cell).on('click', function(e){
                                        module.showLogDialog(connectionElement, connectionData, rowData);
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
                            className: ['text-center', module._config.tableCellActionClass].join(' '),
                            data: 'active',
                            render: {
                                display: data => {
                                    let val = '<i class="fas fa-plus"></i>';
                                    if(data){
                                        val = '<i class="fas fa-times txt-color txt-color-redDark"></i>';
                                    }
                                    return val;
                                }
                            },
                            createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                                let tableApi = this.api();

                                if(rowData.active){
                                    let confirmationSettings = {
                                        title: '---',
                                        template: Util.getConfirmationTemplate(null, {
                                            size: 'small',
                                            noTitle: true
                                        }),
                                        onConfirm : function(e, target){
                                            // get current row data (important!)
                                            // -> "rowData" param is not current state, values are "on createCell()" state
                                            rowData = tableApi.row($(cell).parents('tr')).data();

                                            $(connectionElement.getElementsByTagName('table')).showLoadingAnimation();

                                            module.request('DELETE', 'Log', rowData.id, {}, {
                                                connectionElement: connectionElement
                                            }, module.requestAlways)
                                                .then(
                                                    payload => {
                                                        module.addConnectionsData(module.enrichConnectionsData([connectionData], payload.data));
                                                    },
                                                    Util.handleAjaxErrorResponse
                                                );
                                        }
                                    };

                                    // init confirmation dialog
                                    $(cell).confirmation(confirmationSettings);
                                }else {
                                    $(cell).on('click', function(e){
                                        $(connectionElement.getElementsByTagName('table')).showLoadingAnimation();

                                        let requestData = {
                                            active: 1
                                        };

                                        module.request('PATCH', 'Log', rowData.id, requestData, {
                                            connectionElement: connectionElement
                                        }, module.requestAlways)
                                            .then(
                                                payload => {
                                                    module.addConnectionsData(module.enrichConnectionsData([connectionData], payload.data));
                                                },
                                                Util.handleAjaxErrorResponse
                                            );
                                    });
                                }
                            }
                        }
                    ],
                    initComplete: function(settings, json){
                        Counter.initTableCounter(this, ['created:name']);
                    },
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
                            .columns(sumColumnIndexes, { page: 'all'} )
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
                                $(connectionElement).find('.' + module._config.connectionInfoTableCellMassLogClass).data('mass', pageTotalColumns[index]);
                            }
                        });

                        // calculate "info" table -----------------------------------------------------
                        $(connectionElement).find('.' + module._config.moduleTableClass).trigger('pf:updateInfoTable', $(connectionElement).data());
                    }
                });

                // find position to insert
                rowElement.querySelector('#' + module.getConnectionElementId()).insertAdjacentElement('beforebegin', connectionElement);


                tableApi.on('order.dt search.dt', function(){
                    let pageInfo = tableApi.page.info();
                    tableApi.column('index:name', {search:'applied', order:'applied'}).nodes().each((cell, i) => {
                        let content = (pageInfo.recordsTotal - i) + '.';
                        $(cell).html(content);
                    });
                });
            }
        }

        /**
         * callback after ajax request
         * -> is always called regardless of error response or not
         * @param context
         */
        requestAlways(context){
            $(context.connectionElement.getElementsByTagName('table')).hideLoadingAnimation();
        }

        /**
         * show jump log dialog
         * @param connectionElement
         * @param connectionData
         * @param logData
         */
        showLogDialog(connectionElement, connectionData, logData = {}){

            let data = {
                id: this._config.connectionDialogId,
                typeSelectId: this._config.typeSelectId,
                shipMassId: this._config.shipMassId,
                characterSelectId: this._config.characterSelectId,
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
                            callback: e => {
                                let form = $(e.delegateTarget).find('form');

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
                                    let formDataShip = form.find('#' + this._config.typeSelectId).select2('data');
                                    let formDataCharacter = form.find('#' + this._config.characterSelectId).select2('data');
                                    formData.shipTypeName = formDataShip.length ? formDataShip[0].text : '';
                                    formData.characterName = formDataCharacter.length ? formDataCharacter[0].text : '';

                                    let method = formData.id ? 'PATCH' : 'PUT';

                                    this.request(method, 'Log', formData.id, formData, {
                                        connectionElement: connectionElement,
                                        formElement: form
                                    }, this.requestAlways)
                                        .then(
                                            payload => {
                                                this.addConnectionsData(this.enrichConnectionsData([connectionData], payload.data));
                                                $(e.delegateTarget).modal('hide');
                                            },
                                            Util.handleAjaxErrorResponse
                                        );

                                }

                                return false;
                            }
                        }
                    }
                });

                connectionDialog.on('show.bs.modal', e => {
                    let modalContent = $(e.target);

                    // init type select live search
                    let selectElementType = modalContent.find('#' + this._config.typeSelectId);
                    selectElementType.initUniverseTypeSelect({
                        categoryIds: [6],
                        maxSelectionLength: 1,
                        selected: [Util.getObjVal(logData, 'ship.typeId')]
                    }).on('select2:select select2:unselecting', e => {
                        // get ship mass from selected ship type and update mass input field
                        let shipMass = e.params.data ? e.params.data.mass / 1000 : '';
                        modalContent.find('#' + this._config.shipMassId).val(shipMass);
                    });

                    // init character select live search
                    let selectElementCharacter = modalContent.find('#' + this._config.characterSelectId);
                    selectElementCharacter.initUniverseSearch({
                        categoryNames: ['character'],
                        maxSelectionLength: 1
                    });

                });

                // show dialog
                connectionDialog.modal('show');
            });
        }

        /**
         * init module
         */
        init(){
            super.init();
        }
    };

    ConnectionInfoModule.isPlugin = false;                                                      // module is defined as 'plugin'
    ConnectionInfoModule.scope = 'connection';                                                  // module scope controls how module gets updated and what type of data is injected
    ConnectionInfoModule.sortArea = 'a';                                                        // default sortable area
    ConnectionInfoModule.position = 1;                                                          // default sort/order position within sortable area
    ConnectionInfoModule.label = 'Mass tracking';                                               // static module label (e.g. description)

    ConnectionInfoModule.defaultConfig = {
        className: 'pf-connection-info-module',                                                 // class for module
        sortTargetAreas: ['a', 'b', 'c'],                                                       // sortable areas where module can be dragged into
        headline: 'Connection',

        // headline toolbar
        moduleHeadlineIconRefreshClass: 'pf-module-icon-button-refresh',                        // class for "refresh" icon
        moduleHeadlineIconCurrentMassClass: 'pf-module-icon-button-mass',                       // class for "current ship mass" toggle icon

        // body
        connectionInfoPanelClass: 'pf-connection-info-panel',                                   // class for connection info panels

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

    return ConnectionInfoModule;
});