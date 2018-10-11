/**
 *  system effects dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'app/map/util'
], ($, Init, Util, Render, bootbox, MapUtil) => {
    'use strict';

    let config = {
        // system effect dialog
        systemEffectDialogClass: 'pf-system-effect-dialog'                      // class for system effect dialog
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

            let colCount = 0;
            for(let [effectName, effectData] of Object.entries(systemEffectData.wh)){
                colCount++;

                let table = $('<table>', {
                    class: 'compact stripe order-column row-border'
                });

                let tbody = $('<tbody>');
                let thead = $('<thead>');

                let rows = [];

                // get formatted system effect name
                let systemEffectName = MapUtil.getEffectInfoForSystem(effectName, 'name');
                let systemEffectClass = MapUtil.getEffectInfoForSystem(effectName, 'class');

                for(let [areaId, areaData] of Object.entries(effectData)){
                    let systemType = 'C' + areaId;
                    let securityClass = Util.getSecurityClassForSystem( systemType );

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
                $(this).find('table').DataTable({
                    pageLength: -1,
                    paging: false,
                    lengthChange: false,
                    ordering: false,
                    searching: false,
                    info: false,
                    columnDefs: [],
                    data: null      // use DOM data overwrites [] default -> data.loader.js
                });
            });

            effectsDialog.on('hide.bs.modal', function(e){
                // destroy logTable
                $(this).find('table').DataTable().destroy(true);
            });

            effectsDialog.modal('show');
        });
    };
});