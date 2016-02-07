/**
 *  Util
 */
define([
    'jquery',
    'app/init',
    'config/system_effect',
    'config/signature_type',
    'bootbox',
    'app/ccp',
    'velocity',
    'velocityUI',
    'customScrollbar',
    'validator',
    'xEditable',
    'easyPieChart',
    'hoverIntent',
    'bootstrapConfirmation',
    'bootstrapToggle'
], function($, Init, SystemEffect, SignatureType, bootbox, CCP) {

    'use strict';

    var config = {
        ajaxOverlayClass: 'pf-loading-overlay',
        ajaxOverlayWrapperClass: 'pf-loading-overlay-wrapper',

        // form
        formEditableFieldClass: 'pf-editable',                                  // class for all xEditable fields
        formErrorContainerClass: 'pf-dialog-error-container',                   // class for "error" containers in dialogs
        formWarningContainerClass: 'pf-dialog-warning-container',               // class for "warning" containers in dialogs
        formInfoContainerClass: 'pf-dialog-info-container',                     // class for "info" containers in dialogs


        settingsMessageVelocityOptions: {
            duration: 180
        },

        // dialogs
        dialogClass: 'modal-dialog',                                            // class for all dialogs (bootstrap)

        // map module
        mapModuleId: 'pf-map-module',                                           // id for main map module
        mapTabBarId: 'pf-map-tabs'                                              // id for map tab bar

    };

    var stopTimerCache = {};                                                    // cache for stopwatch timer


    /*
     *  ===========================================================================================================
     *   Global jQuery plugins for some common and frequently used functions
     *   ==========================================================================================================
     */

    /**
     * displays a loading indicator on an element
     */
    $.fn.showLoadingAnimation = function(options){
        var loadingElement = $(this);

        var iconSize = 'fa-lg';

        // disable all events
        loadingElement.css('pointer-events', 'none');

        if(options){
            if(options.icon){
                if(options.icon.size){
                    iconSize = options.icon.size;
                }
            }
        }

        var overlay = $('<div>', {
            class: config.ajaxOverlayClass
        }).append(
            $('<div>', {
                class: [config.ajaxOverlayWrapperClass].join(' ')
            }).append(
                $('<i>', {
                    class: ['fa', iconSize, 'fa-circle-o-notch', 'fa-spin'].join(' ')
                })
            )
        );

        loadingElement.append(overlay);

        // fade in
        $(overlay).velocity({
            opacity: 0.6
        },{
            duration: 200
        });
    };

    /**
     * removes a loading indicator
     */
    $.fn.hideLoadingAnimation = function(){
        var loadingElement = $(this);
        var overlay = loadingElement.find('.' + config.ajaxOverlayClass );

        $(overlay).velocity('reverse', {
            complete: function(){
                $(this).remove();
                // enable all events
                loadingElement.css('pointer-events', 'auto');
            }
        });
    };

    /**
     * show "splash" loading overlay
     * @param callback
     */
    $.fn.showSplashOverlay = function(callback){
        var splashOverlay = $(this);

        splashOverlay.velocity('fadeIn', {
            duration: Init.animationSpeed.splashOverlay,
            complete: function(){
                // execute callback function if given
                if(callback !== undefined){
                    callback();
                }
            }
        });
    };

    /**
     * hide "splash" loading overlay
     */
    $.fn.hideSplashOverlay = function(){
        var splashOverlay = $(this);

        splashOverlay.velocity('fadeOut', {
            duration: Init.animationSpeed.splashOverlay
        });
    };

    /**
     * show a unique generated captcha image
     * @param reason
     * @param callback
     * @returns {*}
     */
    $.fn.showCaptchaImage = function(reason, callback){
        return this.each(function(){
            var captchaWrapper = $(this);
            var captchaImage = captchaWrapper.find('img');

            captchaWrapper.showLoadingAnimation(config.loadingOptions);
            getCaptchaImage(reason, function(base64Image){

                captchaImage.attr('src', base64Image).show();
                captchaWrapper.hideLoadingAnimation({
                    icon: {
                        size: 'fa-2x'
                    }
                });

                if(callback){
                    callback();
                }
            });
        });
    };

    /**
     * request a captcha image
     * @param callback
     */
    var getCaptchaImage = function(reason, callback){

        $.ajax({
            type: 'POST',
            url: Init.path.getCaptcha,
            data: {
                reason: reason
            },
            dataType: 'json'
        }).done(function(responseData){
            if(responseData.error.length > 0){
                showNotify({title: 'getCaptchaImage', text: 'Captcha image gneration failed', type: 'error'});
            }else{
                callback(responseData.img);
            }
        }).fail(function( jqXHR, status, error) {
            var reason = status + ' ' + error;
            showNotify({title: jqXHR.status + ': getCaptchaImage', text: reason, type: 'error'});
        });

    };

    /**
     * reset/clear form fields
     * @returns {*}
     */
    $.fn.resetFormFields = function(){
        return this.each(function(){
            var field = $(this);

            if( !field.is('select') ){
                // "input"
                field.val('');
            }

            field.parents('.form-group').removeClass('has-error has-success');
        });
    };

    /**
     * show form messages
     * check: showMessage() for en other way of showing messages
     * @param errors
     */
    $.fn.showFormMessage = function(errors){

        var formElement = $(this);

        var errorMessage = [];
        var warningMessage = [];
        var infoMessage = [];
        for(var i = 0; i < errors.length; i++){
            if(errors[i].type === 'error'){
                errorMessage.push( errors[i].message );

                // mark form field as invalid in case of a validation error
                if(
                    errors[i].field &&
                    errors[i].field.length > 0
                ){
                    var formField = formElement.find('[name="' + errors[i].field + '"]');
                    formField.parents('.form-group').removeClass('has-success').addClass('has-error');
                }

            }else if(errors[i].type === 'warning'){
                warningMessage.push( errors[i].message );
            }else if(errors[i].type === 'info'){
                infoMessage.push( errors[i].message );
            }
        }

        if(errorMessage.length > 0){
            formElement.hideFormMessage('error', function(element){
                $(element).find('small').html( errorMessage.join('<br>') );
                $(element).velocity('transition.slideUpIn', config.settingsMessageVelocityOptions);
            });
        }

        if(warningMessage.length > 0){
            formElement.hideFormMessage('warning', function(element){
                $(element).find('small').html( warningMessage.join('<br>') );
                $(element).velocity('transition.slideUpIn', config.settingsMessageVelocityOptions);
            });
        }

        if(infoMessage.length > 0){
            formElement.hideFormMessage('info', function(element){
                $(element).find('small').html( infoMessage.join('<br>') );
                $(element).velocity('transition.slideUpIn', config.settingsMessageVelocityOptions);
            });
        }
    };

    /**
     * hide all form messages
     * @param type
     * @param callback
     */
    $.fn.hideFormMessage = function(type, callback){

        var formElement = $(this);

        var settingsMessageVelocityOptions = $.extend({}, config.settingsMessageVelocityOptions);

        // check if callback exists
        if(callback !== undefined){
            settingsMessageVelocityOptions.complete = callback;

            // new error will be shown afterwards -> keep display
            settingsMessageVelocityOptions.display = 'block';
        }

        var messageElement = null;

        switch(type){
            case 'error':
                // find error container
                messageElement = formElement.find('.' + config.formErrorContainerClass);
                break;
            case 'warning':
                messageElement = formElement.find('.' + config.formWarningContainerClass);
                break;
            case 'info':
                messageElement = formElement.find('.' + config.formInfoContainerClass);
                break;
            case 'all':
                messageElement = formElement.find(
                    '.' + config.formErrorContainerClass + ', ' +
                    '.' + config.formWarningContainerClass + ', ' +
                    '.' + config.formInfoContainerClass
                );
        }

        if(messageElement){
            if(messageElement.is(':visible')){
                messageElement.velocity('transition.slideDownOut', settingsMessageVelocityOptions);
            }else if(callback){
                // skip hide animation
                callback(messageElement);
            }
        }
    };

    /**
     * init form elements for validation (bootstrap3 validation)
     * @returns {any|JQuery|*}
     */
    $.fn.initFormValidation = function(){

        return this.each(function(){
            var form = $(this);

            // init form validation
            form.validator();

            // validation event listener
            form.on('valid.bs.validator', function(validatorObj){
                var inputGroup = $(validatorObj.relatedTarget).parents('.form-group');
                if(inputGroup){
                    inputGroup.removeClass('has-error').addClass('has-success');
                }
            });

            form.on('invalid.bs.validator', function(validatorObj){
                var field = $(validatorObj.relatedTarget);
                var inputGroup = field.parents('.form-group');
                if(inputGroup){
                    inputGroup.removeClass('has-success').addClass('has-error');
                }
            });

        });
    };

    /**
     * checks weather a bootstrap form is valid or not
     * validation plugin does not provide a proper function for this
     * @returns {boolean}
     */
    $.fn.isValidForm = function(){
        var form = $(this);
        var valid = false;

        var errorElements =  form.find('.has-error');

        if(errorElements.length === 0){
            valid = true;
        }

        return valid;
    };

    /**
     * get all form Values as object
     * this includes all xEditable fields
     * @returns {{}}
     */
    $.fn.getFormValues = function(){
        var form = $(this);

        var formData = {};

        $.each(form.serializeArray(), function(i, field) {
            if(field.name.indexOf('[]') !== -1){
                // array field
                var key = field.name.replace('[]', '');
                if(! $.isArray(formData[key]) ){
                    formData[key] = [];
                }

                formData[key].push( field.value);
            }else{
                formData[field.name] = field.value;
            }
        });

        // get xEditable values
        var editableValues = form.find('.' + config.formEditableFieldClass).editable('getValue');

        // merge values
        formData = $.extend(formData, editableValues);

        return formData;
    };

    /**
     * check multiple element if they arecurrently visible in viewport
     * @returns {Array}
     */
    $.fn.isInViewport = function(){

        var visibleElement = [];

        this.each(function(){
            var element = $(this)[0];

            var top = element.offsetTop;
            var left = element.offsetLeft;
            var width = element.offsetWidth;
            var height = element.offsetHeight;

            while(element.offsetParent) {
                element = element.offsetParent;
                top += element.offsetTop;
                left += element.offsetLeft;
            }

            if(
                top < (window.pageYOffset + window.innerHeight) &&
                left < (window.pageXOffset + window.innerWidth) &&
                (top + height) > window.pageYOffset &&
                (left + width) > window.pageXOffset
            ){
                visibleElement.push( this );
            }
        });

        return visibleElement;
    };

    /**
     * init the map-update-counter as "easy-pie-chart"
     */
    $.fn.initMapUpdateCounter = function(){

        var counterChart = $(this);

        counterChart.easyPieChart({
            barColor: function(percent){

                var color = '#568a89';
                if(percent <= 30){
                    color = '#d9534f';
                }else if(percent <= 50){
                    color = '#f0ad4e';
                }

                return color;

            },
            trackColor: '#2b2b2b',
            size: 30,
            scaleColor: false,
            lineWidth: 2,
            animate: 1000
        });

    };

    /**
     * init tooltips on an element
     * @returns {any|JQuery|*}
     */
    $.fn.initTooltips = function(){

        return this.each(function(){

            var tooltipElements = $(this).find('[title]');
            tooltipElements.tooltip({
                container:  this,
                delay: 100
            });
        });

    };

    /**
     * adds a popup tooltip with character information (created/updated)
     * @param tooltipData
     */
    $.fn.addCharacterInfoTooltip = function(tooltipData){
        var element = $(this);

        if(
            tooltipData.created.character &&
            tooltipData.updated.character
        ){
            var createdData = tooltipData.created;
            var updatedData = tooltipData.updated;

            // check if data has changed
            if(
                element.data('created') !== createdData.created ||
                element.data('updated') !== updatedData.updated
            ){
                // data changed
                // set new data for next check
                element.data('created', createdData.created);
                element.data('updated', updatedData.updated);

                var statusCreatedClass = getStatusInfoForCharacter(createdData.character, 'class');
                var statusUpdatedClass = getStatusInfoForCharacter(updatedData.character, 'class');

                // convert timestamps
                var dateCreated = new Date(createdData.created * 1000);
                var dateUpdated = new Date(updatedData.updated * 1000);
                var dateCreatedUTC = convertDateToUTC(dateCreated);
                var dateUpdatedUTC = convertDateToUTC(dateUpdated);

                var data = {
                    created: createdData,
                    updated: updatedData,
                    createdTime: convertDateToString(dateCreatedUTC),
                    updatedTime: convertDateToString(dateUpdatedUTC),
                    createdStatusClass: statusCreatedClass,
                    updatedStatusClass: statusUpdatedClass
                };

                requirejs(['text!templates/tooltip/character_info.html', 'mustache'], function(template, Mustache) {
                    var content = Mustache.render(template, data);

                    element.popover({
                        placement: 'top',
                        html: true,
                        trigger: 'hover',
                        content: '',
                        container: 'body',
                        title: 'Created / Updated',
                        delay: {
                            show: 250,
                            hide: 0
                        }
                    });

                    // set new popover content
                    var popover = element.data('bs.popover');
                    popover.options.content = content;
                });

            }
        }
    };

    /**
     * add a wormhole tooltip with wh specific data to elements
     * @param tooltipData
     * @returns {*}
     */
    $.fn.addWormholeInfoTooltip = function(tooltipData){
        return this.each(function() {
            var element = $(this);

            requirejs(['text!templates/tooltip/wormhole_info.html', 'mustache'], function (template, Mustache) {
                var content = Mustache.render(template, tooltipData);

                element.popover({
                    placement: 'top',
                    html: true,
                    trigger: 'hover',
                    content: '',
                    container: 'body',
                    title: tooltipData.name +
                        '<span class="pull-right ' + tooltipData.class +'">' + tooltipData.security + '</span>',
                    delay: {
                        show: 250,
                        hide: 0
                    }
                });

                // set new popover content
                var popover = element.data('bs.popover');
                popover.options.content = content;
            });

        });
    };

    /**
     * display a custom message (info/warning/error) to a container element
     * check: $.fn.showFormMessage() for an other way of showing messages
     * @param config
     */
    $.fn.showMessage = function(config){
        var containerElement = $(this);

        requirejs(['text!templates/form/message.html', 'mustache'], function(template, Mustache) {

            var messageTypeClass = 'alert-danger';
            var messageTextClass = 'txt-color-danger';

            switch(config.type){
                case 'info':
                    messageTypeClass = 'alert-info';
                    messageTextClass = 'txt-color-information';
                    break;
                case 'success':
                    messageTypeClass = 'alert-success';
                    messageTextClass = 'txt-color-success';
                    break;
                case 'warning':
                    messageTypeClass = 'alert-warning';
                    messageTextClass = 'txt-color-warning';
                    break;
            }

            var data = {
                title: config.title,
                text: config.text,
                messageTypeClass: messageTypeClass,
                messageTextClass: messageTextClass
            };

            var content = Mustache.render(template, data);

            containerElement.html(content);

            containerElement.children().first().velocity('stop').velocity('fadeIn');

        });
    };

    /**
     * wrapper function for onClick() || onDblClick() events in order to distinguish between this two types of events
     * @param singleClickCallback
     * @param doubleClickCallback
     * @param timeout
     * @returns {any|JQuery|*}
     */
    $.fn.singleDoubleClick = function(singleClickCallback, doubleClickCallback, timeout) {
        return this.each(function(){
            var clicks = 0, self = this;
            $(this).on('mouseup', function(e){
                clicks++;
                if (clicks === 1) {
                    setTimeout(function(){
                        if(clicks === 1) {
                            singleClickCallback.call(self, e);
                        } else {
                            doubleClickCallback.call(self, e);
                        }
                        clicks = 0;
                    }, timeout || Init.timer.DBL_CLICK);
                }
            });
        });
    };

    /*
     *  ===========================================================================================================
     *   Util functions that are global available for all modules
     *   ==========================================================================================================
     */

    /**
     * show current program version information in browser console
     */
    var showVersionInfo = function(){
        var versionNumber = $('body').data('version');
        console.info('PATHFINDER ' + versionNumber);
    };

    /**
     * get the current main trigger delay for the main trigger functions
     * optional in/decrease the delay
     * @param updateKey
     * @param value
     * @returns {*}
     */
    var getCurrentTriggerDelay = function( updateKey, value ){

        // make sure the delay timer is valid!
        // if this is called for the first time -> set CURRENT_DELAY
        if(
            Init.timer[updateKey].CURRENT_DELAY === undefined ||
            Init.timer[updateKey].CURRENT_DELAY <= 0
        ){
            Init.timer[updateKey].CURRENT_DELAY = Init.timer[updateKey].DELAY;
        }

        // in/decrease the trigger delay
        if(
            value === parseInt(value, 10)  &&
            ( Init.timer[updateKey].CURRENT_DELAY ) + value > 0
        ){
            Init.timer[updateKey].CURRENT_DELAY += value;
        }

        return Init.timer[updateKey].CURRENT_DELAY;
    };

    /**
     * get date obj with current EVE Server Time.
     * @returns {Date}
     */
    var getServerTime = function(){

        // Server is running with GMT/UTC (EVE Time)
        var localDate = new Date();

        var serverDate= new Date(
            localDate.getUTCFullYear(),
            localDate.getUTCMonth(),
            localDate.getUTCDate(),
            localDate.getUTCHours(),
            localDate.getUTCMinutes(),
            localDate.getUTCSeconds()
        );

        return serverDate;
    };

    /**
     * start time measurement by a unique string identifier
     * @param timerName
     */
    var timeStart = function(timerName){

        if(typeof performance === 'object'){
            stopTimerCache[timerName] = performance.now();
        }else{
            stopTimerCache[timerName] = new Date().getTime();
        }
    };

    /**
     * get time delta between timeStart() and timeStop() by a unique string identifier
     * @param timerName
     * @returns {number}
     */
    var timeStop = function(timerName){

        var duration = 0;

        if( stopTimerCache.hasOwnProperty(timerName) ){
            // check browser support for performance API
            var timeNow = 0;

            if(typeof performance === 'object'){
                timeNow = performance.now();
            }else{
                timeNow = new Date();
            }

            // format ms time duration
            duration = Number( (timeNow - stopTimerCache[timerName] ).toFixed(2) );

            // delete key
            delete( stopTimerCache[timerName]);
        }

        return duration;
    };

    /**
     * trigger main logging event with log information
     * @param message
     * @param options
     */
    var log = function(logKey, options){
        $(window).trigger('pf:log', [logKey, options]);
    };

    /**
     * trigger a notification (on screen or desktop)
     * @param customConfig
     * @param desktop
     */
    var showNotify = function(customConfig, desktop){

        requirejs(['app/notification'], function(Notification) {
            Notification.showNotify(customConfig, desktop);
        });
    };

    /**
     * get log entry info
     * @param logType
     * @param option
     * @returns {string}
     */
    var getLogInfo = function(logType, option){
        var logInfo = '';

        if(Init.classes.logTypes.hasOwnProperty(logType)){
            logInfo = Init.classes.logTypes[logType][option];
        }

        return logInfo;
    };

    /**
     * Returns true if the user hit Esc or navigated away from the
     * current page before an AJAX call was done. (The response
     * headers will be null or empty, depending on the browser.)
     *
     * NOTE: this function is only meaningful when called from
     * inside an AJAX "error" callback!
     * @param jqXHR XMLHttpRequest instance
     * @returns {boolean}
     */
    var isXHRAborted = function(jqXHR){
        return !jqXHR.getAllResponseHeaders();
    };

    /**
     * get all mapTabElements (<a> tags)
     * or search for a specific tabElement within the
     * mapModuleElement
     * @param mapId
     * @returns {JQuery|*|{}|T}
     */
    $.fn.getMapTabElements = function(mapId){

        var mapModuleElement = $(this);

        var mapTabElements = mapModuleElement.find('#' + config.mapTabBarId).find('a');

        if(mapId){
            // search for a specific tab element
            mapTabElements = mapTabElements.filter(function(i, el){
                return ( $(el).data('map-id') === mapId );
            });
        }

        return mapTabElements;
    };

    /**
     * get the map module object or create a new module
     * @returns {*|HTMLElement}
     */
    var getMapModule = function(){

        var mapModule = $('#' + config.mapModuleId);
        if(mapModule.length === 0){
            mapModule = $('<div>', {
                id: config.mapModuleId
            });
        }

        return mapModule;
    };

    /**
     * get all available map icons
     * @returns {*}
     */
    var getMapIcons = function(){

        return Init.mapIcons;
    };

    /**
     * get all available map Types
     * optional they can be filtered by current access level of a user
     * @param filterByUser
     * @returns {Array}
     */
    var getMapTypes = function(filterByUser){

        var mapTypes = [];

        $.each(Init.mapTypes, function(prop, data){

            // skip "default" type -> just for 'add' icon
            if(data.label.length > 0){
                var tempData = data;
                tempData.name = prop;

                mapTypes.push(tempData);
            }
        });

        if(filterByUser === true){

            var corporationId = getCurrentUserInfo('corporationId');
            var allianceId = getCurrentUserInfo('allianceId');

            var authorizedMapTypes = [];
            // check if character data exists
            if(corporationId > 0) {
                authorizedMapTypes.push('corporation');
            }
            if(allianceId > 0){
                authorizedMapTypes.push('alliance');
            }

            // private maps are always allowed
            authorizedMapTypes.push('private');

            // compare "all" map types with "authorized" types
            var tempMapTypes = [];
            for(var i = 0; i < mapTypes.length; i++){
                for(var j = 0; j < authorizedMapTypes.length; j++){
                    if(mapTypes[i].name === authorizedMapTypes[j]){
                        tempMapTypes.push(mapTypes[i]);
                        break;
                    }

                }
            }

            mapTypes = tempMapTypes;
        }

        return mapTypes;
    };

    /**
     * get map info
     * @param mapType
     * @param option
     * @returns {string}
     */
    var getInfoForMap = function(mapType, option){

        var mapInfo = '';

        if(Init.mapTypes.hasOwnProperty(mapType)){
            mapInfo = Init.mapTypes[mapType][option];
        }

        return mapInfo;
    };

    /**
     * get all available scopes for a map
     * @returns {Array}
     */
    var getMapScopes = function(){

        var scopes = [];
        $.each(Init.mapScopes, function(prop, data){
            var tempData = data;
            tempData.name = prop;
            scopes.push(tempData);
        });

        return scopes;
    };

    /**
     * get some scope info for a given info string
     * @param info
     * @param option
     * @returns {string}
     */
    var getScopeInfoForMap = function(info, option){

        var scopeInfo = '';

        if(Init.mapScopes.hasOwnProperty(info)){
            scopeInfo = Init.mapScopes[info][option];
        }

        return scopeInfo;
    };

    /**
     * get some scope info for a given info string
     * @param info
     * @param option
     * @returns {string}
     */
    var getScopeInfoForConnection = function(info, option){

        var scopeInfo = '';

        if(Init.connectionScopes.hasOwnProperty(info)){
            switch(option){
                case 'connectorDefinition':
                    // json data in DB
                    var temp = '{ "data": ' + Init.connectionScopes[info][option] + '}';
                    scopeInfo = $.parseJSON( temp).data;
                    break;
                default:
                    scopeInfo = Init.connectionScopes[info][option];
                    break;
            }
        }

        return scopeInfo;
    };


    /**
     * get system type information
     * @returns {Array}
     */
    var getSystemTypeInfo = function(systemTypeId, option){

        var systemTypeInfo = '';

        $.each(Init.systemType, function(prop, data){

            if(systemTypeId === data.id){
                systemTypeInfo = data[option];
                return;
            }
        });

        return systemTypeInfo;
    };

    /**
     * get some system info for a given info string (e.g. rally class)
     * @param info
     * @param option
     * @returns {string}
     */
    var getInfoForSystem = function(info, option){

        var systemInfo = '';

        if(Init.classes.systemInfo.hasOwnProperty(info)){
            systemInfo = Init.classes.systemInfo[info][option];
        }


        return systemInfo;
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
     * get system effect data by system security and system class
     * if no search parameters given -> get all effect data
     * @param security
     * @param effect
     * @returns {boolean}
     */
    var getSystemEffectData = function(security, effect){

        var data =  SystemEffect;

        if(security){
            // look for specific data
            data = false;

            var areaId = getAreaIdBySecurity(security);

            if(
                areaId > 0 &&
                SystemEffect.wh[effect] &&
                SystemEffect.wh[effect][areaId]
            ){
                data = SystemEffect.wh[effect][areaId];
            }
        }

        return data;
    };

    /**
     * get status info for a character for a given status
     * @param characterData
     * @param option
     * @returns {string}
     */
    var getStatusInfoForCharacter = function(characterData, option){

        var statusInfo = '';

        // character status can not be checked if there are no reference data
        // e.g. during registration process (login page)
        if(Init.characterStatus){
            // get info for current "main" character
            var corporationId = getCurrentUserInfo('corporationId');
            var allianceId = getCurrentUserInfo('allianceId');

            // get all user characters
            var userData = getCurrentUserData();

            if(userData){
                // check if character is one of his own characters
                var userCharactersData = userData.characters;

                for(var i = 0; i < userCharactersData.length; i++){
                    if(userCharactersData[i].id === characterData.id){
                        statusInfo = Init.characterStatus.own[option];
                        break;
                    }
                }
            }

            if(statusInfo === ''){
                // compare current user data with given user data
                if(
                    characterData.corporation &&
                    characterData.corporation.id === corporationId
                ){
                    statusInfo = Init.characterStatus.corporation[option];
                }else if(
                    characterData.alliance &&
                    characterData.alliance.id === allianceId
                ){
                    statusInfo = Init.characterStatus.alliance[option];
                }
            }
        }

        return statusInfo;
    };

    /**
     * get a HTML table with system effect information
     * e.g. for popover
     * @param data
     * @returns {string}
     */
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
     * get a HTML table with information for multiple systems
     * e.g. for popover
     * @param data
     * @returns {string}
     */
    var getSystemsInfoTable = function(data){
        var table = '';

        if(data.length > 0){

            table += '<table>';
            for(var i = 0; i < data.length; i++){

                var trueSecClass = getTrueSecClassForSystem( data[i].trueSec );
                var securityClass = getSecurityClassForSystem( data[i].security );

                table += '<tr>';
                table += '<td>';
                table += data[i].name;
                table += '</td>';
                table += '<td class="text-right ' + securityClass + '">';
                table += data[i].security;
                table += '</td>';
                table += '<td class="text-right ' + trueSecClass + '">';
                table += parseFloat( data[i].trueSec ).toFixed(1);
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

        trueSec = parseFloat(trueSec);

        // check for valid decimal number
        if(
            !isNaN( trueSec ) &&
            isFinite( trueSec )
        ){
            if(trueSec < 0){
                trueSec = 0;
            }

            trueSec = trueSec.toFixed(1).toString();

            if( Init.classes.trueSec.hasOwnProperty(trueSec) ){
                trueSecClass = Init.classes.trueSec[trueSec]['class'];
            }
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

        if( Init.systemStatus.hasOwnProperty(status) ){
            // search by status string
            statusInfo = Init.systemStatus[status][option];
        }else{
            // saarch by statusID
            $.each(Init.systemStatus, function(prop, data){

                if(status === data.id){
                    statusInfo = data[option];
                    return;
                }
            });
        }

        return statusInfo;
    };

    /**
     * get Connection Info by option
     * @param connectionTyp
     * @param option
     * @returns {string}
     */
    var getConnectionInfo = function(connectionTyp, option){

        var connectionInfo = '';
        if(Init.connectionTypes.hasOwnProperty(connectionTyp)){
            connectionInfo = Init.connectionTypes[connectionTyp][option];
        }

        return connectionInfo;
    };

    /**
     * get signature group information
     * @param option
     * @returns {{}}
     */
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
     * @param systemTypeId
     * @param areaId
     * @param sigGroupId
     * @returns {{}}
     */
    var getAllSignatureNames = function(systemTypeId, areaId, sigGroupId){

        var signatureNames = {};

        if(
            SignatureType[systemTypeId] &&
            SignatureType[systemTypeId][areaId] &&
            SignatureType[systemTypeId][areaId][sigGroupId]
        ){
            signatureNames =  SignatureType[systemTypeId][areaId][sigGroupId];
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

        var areaId = getAreaIdBySecurity(systemData.security);

        if(areaId > 0){
            var signatureNames = getAllSignatureNames(systemData.type.id, areaId, sigGroupId );
            name = name.toLowerCase();

            for(var prop in signatureNames) {

                if(
                    signatureNames.hasOwnProperty(prop) &&
                    signatureNames[prop].toLowerCase() === name
                ){
                    signatureTypeId = parseInt( prop );
                    break;
                }
            }
        }

        return signatureTypeId;
    };

    /**
     * get Area ID by security string
     * @param security
     * @returns {number}
     */
    var getAreaIdBySecurity = function(security){

        var areaId = 0;

        switch(security){
            case 'H':
                areaId = 10;
                break;
            case 'L':
                areaId = 11;
                break;
            case '0.0':
                areaId = 12;
                break;
            case 'SH':
                areaId = 13;
                break;
            default:
                // w-space
                for(var i = 1; i <= 6; i++){
                    if(security === 'C' + i){
                        areaId = i;
                        break;
                    }
                }
                break;
        }

        return areaId;
    };

    /**
     * set currentMapUserData as "global" variable (count of active pilots)
     * this function should be called continuously after data change
     * to keep the data always up2data
     * @param currentMapUserData
     */
    var setCurrentMapUserData = function(mapUserData){
        Init.currentMapUserData = mapUserData;

        return getCurrentMapUserData();
    };

    /**
     * get currentMapUserData from "global" variable for specific map or all maps
     * @param mapId
     * @returns {boolean}
     */
    var getCurrentMapUserData = function(mapId){

        var currentMapUserData = false;

        if( mapId === parseInt(mapId, 10) ){
            // search for a specific map
            for(var i = 0; i < Init.currentMapUserData.length; i++){
                if(Init.currentMapUserData[i].config.id === mapId){
                    currentMapUserData = Init.currentMapUserData[i];
                    break;
                }
            }
        }else{
            // get data for all maps
            currentMapUserData = Init.currentMapUserData;
        }

        if(currentMapUserData !== false){
            // return a fresh (deep) copy of that, in case of further modifications
            currentMapUserData = $.extend(true, {}, currentMapUserData);
        }

        return currentMapUserData;
    };

    /**
     * set currentMapData as "global" variable
     * this function should be called continuously after data change
     * to keep the data always up2data
     * @param mapData
     */
    var setCurrentMapData = function(mapData){
        Init.currentMapData = mapData;

        return getCurrentMapData();
    };

    /**
     * get currentMapData from "global" variable for a specific map or all maps
     * @param mapId
     * @returns {boolean}
     */
    var getCurrentMapData = function(mapId){

        var currentMapData = false;

        if( mapId === parseInt(mapId, 10) ){
            // search for a specific map
            for(var i = 0; i < Init.currentMapData.length; i++){
                if(Init.currentMapData[i].config.id === mapId){
                    currentMapData = Init.currentMapData[i];
                    break;
                }
            }
        }else{
            // get data for all maps
            currentMapData = Init.currentMapData;
        }

        return currentMapData;
    };

    /**
     * set currentUserData as "global" variable
     * this function should be called continuously after data change
     * to keep the data always up2data
     * @param userData
     */
    var setCurrentUserData = function(userData){

        Init.currentUserData = userData;

        // check if function is available
        // this is not the case in "login" page
        if( $.fn.updateHeaderUserData ){
            $.fn.updateHeaderUserData();
        }

        return getCurrentUserData();
    };

    /**
     * get currentUserData from "global" variable
     * @returns {*}
     */
    var getCurrentUserData = function(){
        return Init.currentUserData;
    };

    /**
     * get the current log data for the current user character
     * @returns {boolean}
     */
    var getCurrentCharacterLog = function(){

        var characterLog = false;

        var currentUserData = getCurrentUserData();

        if(
            currentUserData &&
            currentUserData.character
        ){
            if(currentUserData.character.log){
                characterLog = currentUserData.character.log;
            }else if(CCP.isInGameBrowser() === true){
                // if user is IGB online and log data is missing
                // -> character API information not found!
                showNotify({title: 'Character not found', text: 'Enter API information', type: 'error'});
            }
        }

        return characterLog;
    };

    /**
     * get information for the current mail user
     * @param option
     * @returns {boolean}
     */
    var getCurrentUserInfo = function(option){
        var currentUserData = getCurrentUserData();

        var userInfo = false;

        if(currentUserData){
            // user data is set -> user data will be set AFTER the main init request!
            var characterData = currentUserData.character;

            if(characterData){
                if(
                    option === 'allianceId' &&
                    characterData.alliance
                ){
                    userInfo = characterData.alliance.id;
                }

                if(
                    option === 'corporationId' &&
                    characterData.corporation
                ){
                    userInfo = characterData.corporation.id;
                }
            }
        }

        return userInfo;
    };

    /**
     * set currentSystemData as "global" variable
     * @param systemData
     */
    var setCurrentSystemData = function(systemData){
        Init.currentSystemData = systemData;
    };

    /**
     * get currentSystemData from "global" variables
     * @returns {*}
     */
    var getCurrentSystemData = function(){
        return Init.currentSystemData;
    };


    /**
     * get all "open" dialog elements
     * @returns {*|jQuery}
     */
    var getOpenDialogs = function(){
        return $('.' + config.dialogClass).filter(':visible');
    };

    /**
     * formats a price string into an ISK Price
     * @param price
     * @returns {string}
     */
    var formatPrice = function(price){
        price = Number( price ).toFixed(2);

        var parts = price.toString().split('.');
        price = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts[1] ? '.' + parts[1] : '');

        return price + ' ISK';
    };

    /**
     * Create Date as UTC
     * @param date
     * @returns {Date}
     */
    var createDateAsUTC = function(date) {
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
    };

    /**
     * Convert Date to UTC (!important function!)
     * @param date
     * @returns {Date}
     */
    var convertDateToUTC = function(date) {
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
    };

    /**
     * Convert Date to Time String
     * @param date
     * @returns {string}
     */
    var convertDateToString = function(date){
        var dateString = ('0'+date.getDate()).slice(-2) + '.' + ('0'+date.getMonth()).slice(-2) + '.' + date.getFullYear();
        var timeString = ('0'+date.getHours()).slice(-2) + ':' + ('0'+date.getMinutes()).slice(-2);
        return   dateString + ' ' + timeString;
    };

    /**
     * redirect
     * @param url
     * @param params
     */
    var redirect = function(url, params){
        var currentUrl = document.URL;

        if(url !== currentUrl){
            if(
                params &&
                params.length > 0
            ){
                url += '?' + params.join('&');
            }
            window.location = url;
        }
    };

    /**
     * send logout request
     * @param  params
     */
    var logout = function(params){
        var data = {};
        if(
            params &&
            params.ajaxData
        ){
            data = params.ajaxData;
        }

        $.ajax({
            type: 'POST',
            url: Init.path.logOut,
            data: data,
            dataType: 'json'
        }).done(function(data){
            if(data.reroute){
                redirect(data.reroute, ['logout']);
            }
        }).fail(function( jqXHR, status, error) {
            var reason = status + ' ' + error;
            showNotify({title: jqXHR.status + ': logout', text: reason, type: 'error'});
        });
    };

    return {
        config: config,
        showVersionInfo: showVersionInfo,
        getCurrentTriggerDelay: getCurrentTriggerDelay,
        getServerTime: getServerTime,
        timeStart: timeStart,
        timeStop: timeStop,
        log: log,
        showNotify: showNotify,
        getLogInfo: getLogInfo,
        isXHRAborted: isXHRAborted,
        getMapModule: getMapModule,
        getMapIcons: getMapIcons,
        getMapTypes: getMapTypes,
        getInfoForMap: getInfoForMap,
        getMapScopes: getMapScopes,
        getScopeInfoForMap: getScopeInfoForMap,
        getScopeInfoForConnection: getScopeInfoForConnection,
        getSystemTypeInfo: getSystemTypeInfo,
        getInfoForSystem: getInfoForSystem,
        getEffectInfoForSystem: getEffectInfoForSystem,
        getSystemEffectData: getSystemEffectData,
        getSystemEffectTable: getSystemEffectTable,
        getSystemsInfoTable: getSystemsInfoTable,
        getStatusInfoForCharacter: getStatusInfoForCharacter,
        getSecurityClassForSystem: getSecurityClassForSystem,
        getTrueSecClassForSystem: getTrueSecClassForSystem,
        getStatusInfoForSystem: getStatusInfoForSystem,
        getConnectionInfo: getConnectionInfo,
        getSignatureGroupInfo: getSignatureGroupInfo,
        getAllSignatureNames: getAllSignatureNames,
        getSignatureTypeIdByName: getSignatureTypeIdByName,
        getAreaIdBySecurity: getAreaIdBySecurity,
        setCurrentMapUserData: setCurrentMapUserData,
        getCurrentMapUserData: getCurrentMapUserData,
        setCurrentMapData: setCurrentMapData,
        getCurrentMapData: getCurrentMapData,
        setCurrentUserData: setCurrentUserData,
        getCurrentUserData: getCurrentUserData,
        setCurrentSystemData: setCurrentSystemData,
        getCurrentSystemData: getCurrentSystemData,
        getCurrentUserInfo: getCurrentUserInfo,
        getCurrentCharacterLog: getCurrentCharacterLog,
        convertDateToString: convertDateToString,
        getOpenDialogs: getOpenDialogs,
        formatPrice: formatPrice,
        redirect: redirect,
        logout: logout
    };
});