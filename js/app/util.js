/**
 *  Util
 */
define(['jquery', 'app/init'], function($, Init) {

    "use strict";

    var config = {
        ajaxOverlayClass: 'pf-loading-overlay',
        ajaxOverlayWrapperClass: 'pf-loading-overlay-wrapper',
        ajaxOverlayVisibleClass: 'pf-loading-overlay-visible'
    };

    /**
     * displays a loading indicator on an element
     */
    $.fn.showLoadingAnimation = function(){
        var overlay = $('<div>', {
            class: config.ajaxOverlayClass
        }).append(
            $('<div>', {
                class: [config.ajaxOverlayWrapperClass].join(' ')
            }).append(
                $('<i>', {
                    class: ['fa', 'fa-lg', 'fa-circle-o-notch', 'fa-spin'].join(' ')
                })
            )
        );

        $(this).append(overlay);

        // fade in
        setTimeout(function(){
            $(overlay).addClass( config.ajaxOverlayVisibleClass );
        }, 10);

    };

    $.fn.hideLoadingAnimation = function(){

        var overlay = $(this).find('.' + config.ajaxOverlayClass );
        $(overlay).removeClass( config.ajaxOverlayVisibleClass );

        // remove overlay after fade out transition
        setTimeout(function(){
            $(overlay).remove();
        }, 150);

    };

    /**
     * get some info for a given effect string
     * @param effect
     * @param option
     * @returns {string}
     */
    var getEffectInfoForSystem = function(effect, option){

        var effectInfo = '';

        if( Init.classes.systemEffects.hasOwnProperty(effect) ){
            effectInfo = Init.classes.systemEffects[effect][option];
        }

        return effectInfo;
    };

    /**
     * get a css class for the security level of a system
     * @param sec
     * @returns {string}
     */
    var getSecurityClassForSystem = function(sec){
        var secClass = '';

        if( Init.classes.systemSecurity.hasOwnProperty(sec) ){
            secClass = Init.classes.systemSecurity[sec]['class'];
        }

        return secClass;
    };

    /**
     * get a css class for the trueSec level of a system
     * @param sec
     * @returns {string}
     */
    var getTrueSecClassForSystem = function(trueSec){
        var trueSecClass = '';

        if(trueSec < 0){
            trueSec = 0;
        }

        trueSec = trueSec.toFixed(1).toString();

        if( Init.classes.trueSec.hasOwnProperty(trueSec) ){
            trueSecClass = Init.classes.trueSec[trueSec]['class'];
        }

        return trueSecClass;
    };

    /**
     * get status info
     * @param status
     * @param option
     * @returns {string}
     */
    var getStatusInfoForSystem = function(status, option){

        var statusInfo = '';

        if( Init.classes.systemStatus.hasOwnProperty(status) ){
            statusInfo = Init.classes.systemStatus[status][option];
        }

        return statusInfo;
    };

    return {
        getEffectInfoForSystem: getEffectInfoForSystem,
        getSecurityClassForSystem: getSecurityClassForSystem,
        getTrueSecClassForSystem: getTrueSecClassForSystem,
        getStatusInfoForSystem: getStatusInfoForSystem
    };
});