/**
 *  jump info dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
], ($, Init, Util, Render, bootbox) => {
    'use strict';

    let config = {
        // jump info dialog
        jumpInfoDialogClass: 'pf-jump-info-dialog',                             // class for jump info dialog
        wormholeInfoMassTableClass: 'pf-wormhole-info-mass-table',              // class for "wormhole mass" table
        wormholeInfoJumpTableClass: 'pf-wormhole-info-jump-table'               // class for "wormhole jump" table
    };

    /**
     * show jump info dialog
     */
    $.fn.showJumpInfoDialog = function(){
        requirejs(['text!templates/dialog/jump_info.html', 'mustache'], (template, Mustache) => {
            let data = {
                config: config,
                wormholes: Object.keys(Init.wormholes).map(function(k) { return Init.wormholes[k]; }), // convert Json to array
                securityClass: function(){
                    return function(value, render){
                        return this.Util.getSecurityClassForSystem( render(value) );
                    }.bind(this);
                }.bind({
                    Util: Util
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
                sigStrengthValue: function(){
                    return function(value, render){
                        let float = render(value);
                        return float.length ? parseFloat(float).toLocaleString() + '&nbsp;&#37;' : 'unknown';
                    };
                }
            };
            let content = Mustache.render(template, data);

            let jumpDialog = bootbox.dialog({
                className: config.jumpInfoDialogClass,
                title: 'Wormhole jump information',
                message: content,
                show: false
            });

            jumpDialog.on('show.bs.modal', function(e) {
                // init dataTable
                $(this).find('.' + config.wormholeInfoMassTableClass).DataTable({
                    pageLength: 25,
                    lengthMenu: [[10, 20, 25, 30, 40, -1], [10, 20, 25, 30, 40, 'All']],
                    autoWidth: false,
                    language: {
                        emptyTable:  'No wormholes',
                        zeroRecords: 'No wormholes found',
                        lengthMenu:  'Show _MENU_ wormholes',
                        info:        'Showing _START_ to _END_ of _TOTAL_ wormholes'
                    },
                    columnDefs: []
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
                    columnDefs: []
                });
            });

            jumpDialog.modal('show');
        });
    };
});