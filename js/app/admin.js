/**
 * Main "admin" page
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'datatables.net',
    'datatables.net-buttons',
    'datatables.net-buttons-html',
    'datatables.net-responsive',
    'datatables.net-select'
], function($, Init, Util) {

    'use strict';

    let config = {
        splashOverlayClass: 'pf-splash'                                         // class for "splash" overlay
    };

    /**
     * main init "admin" page
     */
    $(function(){
        // set Dialog default config
        Util.initDefaultBootboxConfig();

        // hide splash loading animation
        $('.' + config.splashOverlayClass).hideSplashOverlay();


        let systemsDataTable = $('.dataTable').dataTable( {
            pageLength: 100,
            paging: true,
            ordering: true,
            autoWidth: false,
            hover: false,
            language: {
                emptyTable:  'No members',
                zeroRecords: 'No members found',
                lengthMenu:  'Show _MENU_ members',
                info:        'Showing _START_ to _END_ of _TOTAL_ members'
            }
        });


    });
});