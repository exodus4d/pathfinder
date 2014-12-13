/**
 *  Util
 */
define(['jquery', 'app/init'], function($, Init) {

    "use strict";

    var config = {
        ajaxOverlayClass: 'pf-loading-overlay',
        ajaxOverlayWrapperClass: 'pf-loading-overlay-wrapper',
        ajaxOverlayVisibleClass: 'pf-loading-overlay-visible',

        formEditableFieldClass: 'pf-editable'                          // Class for all xEditable fields

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

    /**
     * removes a loading indicator
     */
    $.fn.hideLoadingAnimation = function(){

        var overlay = $(this).find('.' + config.ajaxOverlayClass );
        $(overlay).removeClass( config.ajaxOverlayVisibleClass );

        // remove overlay after fade out transition
        setTimeout(function(){
            $(overlay).remove();
        }, 150);

    };

    /**
     * get all form Values as object
     * this includes all xEditable fields
     * @returns {{}}
     */
    $.fn.getFormValues = function(){

        var formData = {};

        $.each($(this).serializeArray(), function(i, field) {
            formData[field.name] = field.value;
        });

        // get xEditable values
        var editableValues = $(this).find('.' + config.formEditableFieldClass).editable('getValue');

        // merge values
        formData = $.extend(formData, editableValues);

        return formData;
    };

    var showNotify = function(customConfig){

        requirejs(['app/notification'], function(Notification) {
            Notification.showNotify(customConfig);
        });
    };


    // ==================================================================================================

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
     * get system effect data by system security and system class
     * @param secureity
     * @param effect
     * @returns {boolean}
     */
    var getSystemEffectData = function(securety, effect){

        var areaId = getAreaIdBySecurity(securety);

        var data = false;

        if(
            Init.systemEffects &&
            Init.systemEffects.wh[effect] &&
            Init.systemEffects.wh[effect][areaId]
        ){
            data = Init.systemEffects.wh[effect][areaId];
        }

        return data;
    };

    var getSystemEffectTable = function(data){

        var table = '';

        if(data.length > 0){

            table += '<table>';

            for(var i = 0; i < data.length; i++){
                table += '<tr>';
                table += '<td>';
                table += data[i].effect;
                table += '</td>';
                table += '<td class="text-right">';
                table += data[i].value;
                table += '</td>';
                table += '</tr>';
            }

            table += '</table>';
        }


        return table;
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


    var getSignatureGroupInfo = function(option){

        var groupInfo = {};

        for (var prop in Init.signatureGroups) {
            if(Init.signatureGroups.hasOwnProperty(prop)){
                prop = parseInt(prop);
                groupInfo[prop] = Init.signatureGroups[prop][option];
            }
        }

        return groupInfo;
    };

    /**
     * get Signature names out of global
     * @param systemType
     * @param areaId
     * @param sigGroupId
     * @returns {{}}
     */
    var getAllSignatureNames = function(systemType, areaId, sigGroupId){

        var signatureNames = {};

        if(
            Init.signatureTypes[systemType] &&
            Init.signatureTypes[systemType][areaId] &&
            Init.signatureTypes[systemType][areaId][sigGroupId]
        ){
            signatureNames =  Init.signatureTypes[systemType][areaId][sigGroupId];
        }

        return signatureNames;
    };

    /**
     * get the typeID of a signature name
     * @param systemData
     * @param sigGroupId
     * @param name
     * @returns {number}
     */
    var getSignatureTypeIdByName = function(systemData, sigGroupId, name){

        var signatureTypeId = 0;

        name = name.toLowerCase();

        var systemConfig = systemData.config;

        var areaId = getAreaIdBySecurity(systemConfig.security);

        var signatureNames = getAllSignatureNames(systemConfig.type, areaId, sigGroupId );

        for(var prop in signatureNames) {

            if(
                signatureNames.hasOwnProperty(prop) &&
                signatureNames[prop].toLowerCase() === name
            ){
                signatureTypeId = parseInt( prop );
                break;
            }
        }

        return signatureTypeId;
    };

    /**
     * get Area ID by security string
     * k-space not implemented jet
     * @param security
     * @returns {*}
     */
    var getAreaIdBySecurity = function(security){

        var areaId = null;

        switch(security){
            case 'C1':
                areaId = 1;
                break;
            case 'C2':
                areaId = 2;
                break;
            case 'C3':
                areaId = 3;
                break;
            case 'C4':
                areaId = 4;
                break;
            case 'C5':
                areaId = 5;
                break;
            case 'C6':
                areaId = 6;
                break;
        }

        return areaId;
    };

    return {
        showNotify: showNotify,

        getEffectInfoForSystem: getEffectInfoForSystem,
        getSystemEffectData: getSystemEffectData,
        getSystemEffectTable: getSystemEffectTable,
        getSecurityClassForSystem: getSecurityClassForSystem,
        getTrueSecClassForSystem: getTrueSecClassForSystem,
        getStatusInfoForSystem: getStatusInfoForSystem,
        getSignatureGroupInfo: getSignatureGroupInfo,
        getAllSignatureNames: getAllSignatureNames,
        getSignatureTypeIdByName: getSignatureTypeIdByName,
        getAreaIdBySecurity: getAreaIdBySecurity
    };
});