/**
 * Main setupPage application
 */

define([
    'jquery',
    'app/init',
    'app/util'
], function($, Init, Util) {
    'use strict';

    var config = {
        splashOverlayClass: 'pf-splash'                     // class for "splash" overlay
    };

    /**
     * set page observer
     */
    var setPageObserver = function(){

        // collapse ---------------------------------------
        $('body').find('[data-toggle="collapse"]').css({cursor: 'pointer'}).on('click', function(){
            $(this).find('.pf-animate-rotate').toggleClass('right');
        });

        // buttons ----------------------------------------
        $('body').find('.btn').on('click', function(e){
            $('.' + config.splashOverlayClass).showSplashOverlay();
        });

        // tooltips ---------------------------------------
        $('body').initTooltips();

        // change url (remove logout parameter)
        if (history.pushState) {
            history.pushState({}, '', location.protocol + '//' + location.host + location.pathname);
        }
    };

    /**
     * main init "setup" page
     */
    $(function(){

        // show app information in browser console --------
        Util.showVersionInfo();

        // hide splash loading animation ------------------
        $('.' + config.splashOverlayClass).hideSplashOverlay();

        setPageObserver();
    });
});