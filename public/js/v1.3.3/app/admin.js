/**
 * Main "admin" page
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'datatables.loader'
], ($, Init, Util) => {

    'use strict';

    let config = {
        splashOverlayClass: 'pf-splash',                                        // class for "splash" overlay
        triggerOverlayClass: 'pf-overlay-trigger'                               // class for
    };


    /**
     * set page observer
     */
    let setPageObserver = () => {
        $('.' + config.triggerOverlayClass).on('click', function(){
            $('.' + config.splashOverlayClass).showSplashOverlay();
        });
    };

    /**
     * main init "admin" page
     */
    $(() => {
        // set Dialog default config
        Util.initDefaultBootboxConfig();

        // hide splash loading animation
        $('.' + config.splashOverlayClass).hideSplashOverlay();

        setPageObserver();

        let temp = $('.dataTable').dataTable( {
            pageLength: 100,
            paging: true,
            ordering: true,
            autoWidth: false,
            hover: false,
            language: {
                emptyTable:  'No entries',
                zeroRecords: 'No entries found',
                lengthMenu:  'Show _MENU_ entries',
                info:        'Showing _START_ to _END_ of _TOTAL_ entries'
            }
        });


    });
});