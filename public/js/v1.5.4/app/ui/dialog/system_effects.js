/**
 *  system effects dialog
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
        // system effect dialog
        systemEffectDialogClass: 'pf-system-effect-dialog',                     // class for system effect dialog

        systemEffectTableClass: 'pf-system-effect-table'                        // Table class for effect tables
    };

    let cache = {
        systemEffectDialog: false                                               // system effect info dialog
    };

    /**
     * show system effect dialog
     */
    $.fn.showSystemEffectInfoDialog = function(){
        requirejs(['datatables.loader'], () => {

            let rowElement = $('<div>', {
                class: 'row'
            });

            let systemEffectData = Util.getSystemEffectData();

            // last active (hover) table columnIndex
            let lastActiveColIndex = null;

            let colCount = 0;
            for(let [effectName, effectData] of Object.entries(systemEffectData.wh)){
                colCount++;

                let table = $('<table>', {
                    class: ['compact', 'stripe', 'order-column', 'row-border', config.systemEffectTableClass].join(' ')
                });

                let tbody = $('<tbody>');
                let thead = $('<thead>');

                let rows = [];

                // get formatted system effect name
                let systemEffectName = MapUtil.getEffectInfoForSystem(effectName, 'name');
                let systemEffectClass = MapUtil.getEffectInfoForSystem(effectName, 'class');

                for(let [areaId, areaData] of Object.entries(effectData)){
                    let systemType = 'C' + areaId;
                    let securityClass = Util.getSecurityClassForSystem(systemType);

                    if(areaId === '1'){
                        rows.push( $('<tr>') );
                        thead.append( rows[0] );

                        rows[0].append(
                            $('<th>').html('&nbsp;&nbsp;' + systemEffectName).prepend(
                                $('<i>', {
                                    class: ['fas', 'fa-square', systemEffectClass].join(' ')
                                })
                            )
                        );
                    }

                    rows[0].append( $('<th>', {
                        class: ['text-right', 'col-xs-1', securityClass].join(' ')
                    }).text( systemType ));

                    for(let [i, data] of Object.entries(areaData)){
                        i =  parseInt(i);
                        if(areaId === '1'){
                            rows.push( $('<tr>') );
                            tbody.append(rows[i + 1]);

                            // add label
                            rows[i + 1].append( $('<td>').text( data.effect ));
                        }


                        rows[i + 1].append( $('<td>', {
                            class: 'text-right'
                        }).text( data.value ));
                    }
                }

                let colElement = $('<div>', {
                    class: ['col-md-6'].join(' ')
                }).append(
                    $('<div>', {
                        class: [Util.config.dynamicAreaClass].join(' ')
                    }).append(
                        table.append(thead).append(tbody)
                    )
                );

                rowElement.append(colElement);

                // add clearfix after even col count
                if(colCount % 2 === 0){
                    rowElement.append(
                        $('<div>', {
                            class: ['clearfix', 'visible-md', 'visible-lg'].join(' ')
                        })
                    );
                }

                cache.systemEffectDialog = rowElement;
            }

            let effectsDialog = bootbox.dialog({
                className: config.systemEffectDialogClass,
                title: 'System effect information',
                message: cache.systemEffectDialog,
                size: 'large',
                show: false
            });

            effectsDialog.on('show.bs.modal', function(e){
                let headerAll = $();
                let columnsAll = $();

                let removeColumnHighlight = () => {
                    headerAll.removeClass('colHighlight');
                    columnsAll.removeClass('colHighlight');
                };

                let tableApis = $(this).find('table').DataTable({
                    pageLength: -1,
                    paging: false,
                    lengthChange: false,
                    ordering: false,
                    searching: false,
                    info: false,
                    columnDefs: [],
                    data: null,     // use DOM data overwrites [] default -> data.loader.js
                    initComplete: function(settings, json){
                        let tableApi = this.api();

                        tableApi.tables().nodes().to$().on('mouseover', 'td', function(){
                            // inside table cell -> get current hover colIndex
                            let colIndex = tableApi.cell(this).index().column;

                            if(colIndex !== lastActiveColIndex){
                                removeColumnHighlight();

                                lastActiveColIndex = colIndex;

                                if(colIndex > 0){
                                    // active column changed -> highlight same colIndex on other tables
                                    let tableApis = $.fn.dataTable.tables({ visible: false, api: true })
                                        .tables('.' + config.systemEffectTableClass);

                                    let columns = tableApis.columns(colIndex);
                                    columns.header().flatten().to$().addClass('colHighlight');
                                    columns.nodes().flatten().to$().addClass('colHighlight');
                                }
                            }
                        }).on('mouseleave', function(){
                            // no longer inside table
                            lastActiveColIndex = null;
                            removeColumnHighlight();
                        });
                    }
                });

                // table cells will not change so we should cache them once
                headerAll = tableApis.columns().header().to$();
                columnsAll = tableApis.cells().nodes().to$();
            });

            effectsDialog.on('hide.bs.modal', function(e){
                // destroy logTable
                $(this).find('table').DataTable().destroy(true);
            });

            effectsDialog.modal('show');
        });
    };
});