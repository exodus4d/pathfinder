/**
 *  Util
 */
define(['jquery', 'app/init'], function($, Init) {

    "use strict";

    /**
     * get a info for a given effect string
     * @param effect
     * @param option
     * @returns {string}
     */
    var getEffectInfoForSystem = function(effect, option){

        var effectClass = '';

        if( Init.classes.systemEffects.hasOwnProperty(effect) ){
            effectClass = Init.classes.systemEffects[effect][option];
        }

        return effectClass;
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

    return {
        getEffectInfoForSystem: getEffectInfoForSystem,
        getSecurityClassForSystem: getSecurityClassForSystem,
        getTrueSecClassForSystem: getTrueSecClassForSystem
    };
});