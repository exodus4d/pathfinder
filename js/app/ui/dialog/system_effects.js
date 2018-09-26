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
], function($, Init, Util, Render, bootbox, MapUtil){
    'use strict';

    let config = {
        // system effect dialog
        systemEffectDialogWrapperClass: 'pf-system-effect-dialog-wrapper'       // class for system effect dialog
    };

    let cache = {
        systemEffectDialog: false                                               // system effect info dialog
    };

    /**
     * show system effect dialog
     */
    $.fn.showSystemEffectInfoDialog = function(){

        // cache table structure
        if(!cache.systemEffectDialog){

            let dialogWrapperElement = $('<div>', {
                class: config.systemEffectDialogWrapperClass
            });

            let systemEffectData = Util.getSystemEffectData();

            $.each( systemEffectData.wh, function(effectName, effectData ){

                let table = $('<table>', {
                    class: ['table', 'table-condensed'].join(' ')
                });

                let tbody = $('<tbody>');
                let thead = $('<thead>');

                let rows = [];

                // get formatted system effect name
                let systemEffectName = MapUtil.getEffectInfoForSystem(effectName, 'name');
                let systemEffectClass = MapUtil.getEffectInfoForSystem(effectName, 'class');

                $.each( effectData, function(areaId, areaData ){

                    let systemType = 'C' + areaId;
                    let securityClass = Util.getSecurityClassForSystem( systemType );

                    if(areaId === '1'){
                        rows.push( $('<tr>') );
                        thead.append( rows[0] );

                        rows[0].append(
                            $('<td>').html('&nbsp;&nbsp;' + systemEffectName).prepend(
                                $('<i>', {
                                    class: ['fas', 'fa-square', 'fa-fw', systemEffectClass].join(' ')
                                })
                            )
                        );
                    }

                    rows[0].append( $('<td>', {
                        class: ['text-right', 'col-xs-1', securityClass].join(' ')
                    }).text( systemType ));

                    $.each( areaData, function(i, data ){

                        if(areaId === '1'){
                            rows.push( $('<tr>') );
                            tbody.append(rows[i + 1]);

                            // add label
                            rows[i + 1].append( $('<td>').text( data.effect ));
                        }


                        rows[i + 1].append( $('<td>', {
                            class: 'text-right'
                        }).text( data.value ));
                    });


                });

                dialogWrapperElement.append(table.append(thead).append(tbody));

                cache.systemEffectDialog = dialogWrapperElement;
            });
        }

        bootbox.dialog({
            title: 'System effect information',
            message: cache.systemEffectDialog
        });

    };
});