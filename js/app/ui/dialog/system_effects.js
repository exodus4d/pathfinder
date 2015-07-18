/**
 *  system effects dialog
 */


define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
], function($, Init, Util, Render, bootbox) {
    'use strict';

    var config = {
        // system effect dialog
        systemEffectDialogWrapperClass: 'pf-system-effect-dialog-wrapper'       // class for system effect dialog
    };

    var cache = {
        systemEffectDialog: false                                               // system effect info dialog
    };

    /**
     * show system effect dialog
     */
    $.fn.showSystemEffectInfoDialog = function(){

        // cache table structure
        if(!cache.systemEffectDialog){

            var dialogWrapperElement = $('<div>', {
                class: config.systemEffectDialogWrapperClass
            });

            var systemEffectData = Util.getSystemEffectData();

            $.each( systemEffectData.wh, function( effectName, effectData ) {

                var table = $('<table>', {
                    class: ['table', 'table-condensed'].join(' ')
                });

                var tbody = $('<tbody>');
                var thead = $('<thead>');

                var rows = [];

                // get formatted system effect name
                var systemEffectName = Util.getEffectInfoForSystem(effectName, 'name');
                var systemEffectClass = Util.getEffectInfoForSystem(effectName, 'class');

                $.each( effectData, function( areaId, areaData ) {

                    var systemType = 'C' + areaId;
                    var securityClass = Util.getSecurityClassForSystem( systemType );

                    if(areaId === '1'){
                        rows.push( $('<tr>') );
                        thead.append( rows[0] );

                        rows[0].append(
                            $('<td>').html( '&nbsp;&nbsp;' + systemEffectName).prepend(
                                $('<i>', {
                                    class: ['fa', 'fa-square', 'fa-fw', systemEffectClass].join(' ')
                                })
                            )
                        );
                    }

                    rows[0].append( $('<td>', {
                        class: ['text-right', 'col-xs-1', securityClass].join(' ')
                    }).text( systemType ));

                    $.each( areaData, function( i, data ) {

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

                dialogWrapperElement.append( table.append( thead ).append( tbody ) );

                cache.systemEffectDialog = dialogWrapperElement;
            });
        }

        bootbox.dialog({
            title: 'System effect information',
            message: cache.systemEffectDialog
        });

    };
});