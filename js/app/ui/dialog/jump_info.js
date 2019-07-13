/**
 *  jump info dialog
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
        // jump info dialog
        jumpInfoDialogClass: 'pf-jump-info-dialog',                             // class for jump info dialog

        wormholeInfoDialogListId: 'pf-wormhole-info-dialog-list',               // id for map "list" container
        wormholeInfoDialogStaticId: 'pf-wormhole-info-dialog-static',           // id for map "static" container
        wormholeInfoDialogJumpId: 'pf-wormhole-info-dialog-jump',               // id for map "jump" container

        wormholeInfoMassTableClass: 'pf-wormhole-info-mass-table',              // class for "wormhole mass" table
        wormholeInfoStaticTableClass: 'pf-wormhole-info-static-table',          // class for "static" table
        wormholeInfoJumpTableClass: 'pf-wormhole-info-jump-table'               // class for "wormhole jump" table
    };

    /**
     * show jump info dialog
     */
    $.fn.showJumpInfoDialog = function(){
        requirejs(['text!templates/dialog/jump_info.html', 'mustache', 'datatables.loader'], (template, Mustache) => {

            let staticsMatrixHead = [
                ['From╲To', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'H', 'L', '0.0', 'C12', 'C13']
            ];

            let staticsMatrixBody = [
                ['C1',  'H121', 'C125', 'O883', 'M609', 'L614', 'S804', 'N110', 'J244', 'Z060', 'F353', ''],
                ['C2',  'Z647', 'D382', 'O477', 'Y683', 'N062', 'R474', 'B274', 'A239', 'E545', 'F135', ''],
                ['C3',  'V301', 'I182', 'N968', 'T405', 'N770', 'A982', 'D845', 'U210', 'K346', 'F135', ''],
                ['C4',  'P060', 'N766', 'C247', 'X877', 'H900', 'U574', 'S047', 'N290', 'K329', ''    , ''],
                ['C5',  'Y790', 'D364', 'M267', 'E175', 'H296', 'V753', 'D792', 'C140', 'Z142', ''    , ''],
                ['C6',  'Q317', 'G024', 'L477', 'Z457', 'V911', 'W237', ['B520', 'D792'], ['C140', 'C391'], ['C248', 'Z142'], '', ''],
                ['H',   'Z971', 'R943', 'X702', 'O128', 'M555', 'B041', 'A641', 'R051', 'V283', 'T458', ''],
                ['L',   'Z971', 'R943', 'X702', 'O128', 'N432', 'U319', 'B449', 'N944', 'S199', 'M164', ''],
                ['0.0', 'Z971', 'R943', 'X702', 'O128', 'N432', 'U319', 'B449', 'N944', 'S199', 'L031', ''],
                ['C12', ''    , ''    , ''    , ''    , ''    , ''    , 'Q063', 'V898', 'E587', ''    , ''],
                ['?',   'E004', 'L005', 'Z006', 'M001', 'C008', 'G008', ''    , ''    , 'Q003', ''    , 'A009']
            ];

            let data = {
                config: config,
                popoverTriggerClass: Util.config.popoverTriggerClass,
                wormholes: Object.keys(Init.wormholes).map(function(k){ return Init.wormholes[k]; }), // convert Json to array
                staticsMatrixHead: staticsMatrixHead,
                staticsMatrixBody: staticsMatrixBody.map((row, rowIndex) => {
                    return row.map((label, colIndex) => {
                        // get security name from "matrix Head" data if NOT first column
                        let secName = colIndex ? staticsMatrixHead[0][colIndex] : label;
                        return {
                            label: label,
                            class: Util.getSecurityClassForSystem(secName),
                            hasPopover: colIndex && label.length
                        };
                    });
                }),
                massValue: function(){
                    return function(value, render){
                        let mass = render(value);
                        switch(mass.length){
                            case 0: return '';
                            case 1: return 'Yes';
                            default: return this.Util.formatMassValue(mass);
                        }
                    }.bind(this);
                }.bind({
                    Util: Util
                }),
                formatStatic: function(){
                    return function(value, render){
                        let isStatic = render(value) === 'true';
                        if(isStatic){
                            return '<i class="fas fa-check"></i>';
                        }else{
                            return '';
                        }
                    };
                },
                formatTime: function(){
                    return function(value, render){
                        let time = render(value);
                        return time.length ? time + '&nbsp;h' : 'unknown';
                    };
                },
                sigStrengthValue: function(){
                    return function(value, render){
                        let float = render(value);
                        return float.length ? parseFloat(float).toLocaleString() + '&nbsp;&#37;' : 'unknown';
                    };
                },
                securityClass: function(){
                    return function(value, render){
                        return Util.getSecurityClassForSystem(this);
                    };
                }
            };
            let content = Mustache.render(template, data);

            let jumpDialog = bootbox.dialog({
                className: config.jumpInfoDialogClass,
                title: 'Wormhole data',
                message: content,
                show: false
            });

            jumpDialog.on('show.bs.modal', function(e){
                $(this).find('.' + config.wormholeInfoMassTableClass).DataTable({
                    pageLength: 35,
                    lengthMenu: [[15, 25, 35, 50, -1], [15, 25, 35, 50, 'All']],
                    autoWidth: false,
                    language: {
                        emptyTable:  'No wormholes',
                        zeroRecords: 'No wormholes found',
                        lengthMenu:  'Show _MENU_ wormholes',
                        info:        'Showing _START_ to _END_ of _TOTAL_ wormholes'
                    },
                    columnDefs: [],
                    data: null      // use DOM data overwrites [] default -> data.loader.js
                });

                $(this).find('.' + config.wormholeInfoStaticTableClass).DataTable({
                    pageLength: -1,
                    paging: false,
                    lengthChange: false,
                    ordering: false,
                    searching: false,
                    info: false,
                    autoWidth: false,
                    columnDefs: [],
                    data: null      // use DOM data overwrites [] default -> data.loader.js
                });

                $(this).find('.' + config.wormholeInfoJumpTableClass).DataTable({
                    pageLength: -1,
                    paging: false,
                    lengthChange: false,
                    ordering: false,
                    searching: false,
                    info: false,
                    autoWidth: false,
                    language: {
                        emptyTable:  'No wormholes',
                        zeroRecords: 'No wormholes found',
                        lengthMenu:  'Show _MENU_ wormholes',
                        info:        'Showing _START_ to _END_ of _TOTAL_ wormholes'
                    },
                    columnDefs: [],
                    data: null      // use DOM data overwrites [] default -> data.loader.js
                });

                MapUtil.initWormholeInfoTooltip(
                    $(this).find('.' + config.wormholeInfoStaticTableClass),
                    '.' + Util.config.popoverTriggerClass
                );
            });

            jumpDialog.initTooltips();

            jumpDialog.modal('show');
        });
    };
});