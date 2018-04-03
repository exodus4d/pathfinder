/**
 *  Util
 */
define([
    'jquery',
    'app/init',
    'conf/system_effect',
    'conf/signature_type',
    'bootbox',
    'localForage',
    'velocity',
    'velocityUI',
    'customScrollbar',
    'validator',
    'easyPieChart',
    'hoverIntent',
    'bootstrapConfirmation',
    'bootstrapToggle'
], ($, Init, SystemEffect, SignatureType, bootbox, localforage) => {

    'use strict';

    let config = {
        ajaxOverlayClass: 'pf-loading-overlay',
        ajaxOverlayWrapperClass: 'pf-loading-overlay-wrapper',

        // form
        formEditableFieldClass: 'pf-editable',                                  // class for all xEditable fields
        formErrorContainerClass: 'pf-dialog-error-container',                   // class for "error" containers in dialogs
        formWarningContainerClass: 'pf-dialog-warning-container',               // class for "warning" containers in dialogs
        formInfoContainerClass: 'pf-dialog-info-container',                     // class for "info" containers in dialogs

        // head
        headMapTrackingId: 'pf-head-map-tracking',                              // id for "map tracking" toggle (checkbox)
        headCharacterSwitchId: 'pf-head-character-switch',                      // id for "character switch" popover
        headCurrentLocationId: 'pf-head-current-location',                      // id for "show current location" element

        // menu
        menuButtonFullScreenId: 'pf-menu-button-fullscreen',                    // id for menu button "fullScreen"
        menuButtonMagnetizerId: 'pf-menu-button-magnetizer',                    // id for menu button "magnetizer"
        menuButtonGridId: 'pf-menu-button-grid',                                // id for menu button "grid snap"
        menuButtonEndpointId: 'pf-menu-button-endpoint',                        // id for menu button "endpoint" overlays
        menuButtonMapDeleteId: 'pf-menu-button-map-delete',                     // id for menu button "delete map"

        settingsMessageVelocityOptions: {
            duration: 180
        },

        // dialogs
        dialogClass: 'modal-dialog',                                            // class for all dialogs (bootstrap)

        // map module
        mapModuleId: 'pf-map-module',                                           // id for main map module
        mapTabBarId: 'pf-map-tabs',                                             // id for map tab bar
        mapWrapperClass: 'pf-map-wrapper',                                      // wrapper div (scrollable)
        mapClass: 'pf-map' ,                                                    // class for all maps


        // animation
        animationPulseSuccessClass: 'pf-animation-pulse-success',               // animation class
        animationPulseWarningClass: 'pf-animation-pulse-warning',               // animation class

        // popover
        popoverTriggerClass: 'pf-popover-trigger'                               // class for "popover" trigger elements

    };

    let stopTimerCache = {};                                                    // cache for stopwatch timer

    let animationTimerCache = {};                                               // cache for table row animation timeout

    let localStorage;                                                           // cache for "localForage" singleton

    /*
     *  ===========================================================================================================
     *   Global jQuery plugins for some common and frequently used functions
     *   ==========================================================================================================
     */

    /**
     * displays a loading indicator on an element
     */
    $.fn.showLoadingAnimation = function(options){
        return this.each(function(){
            let loadingElement = $(this);
            let iconSize = 'fa-lg';

            // disable all events
            loadingElement.css('pointer-events', 'none');

            if(options){
                if(options.icon){
                    if(options.icon.size){
                        iconSize = options.icon.size;
                    }
                }
            }

            let overlay = $('<div>', {
                class: config.ajaxOverlayClass
            }).append(
                $('<div>', {
                    class: [config.ajaxOverlayWrapperClass].join(' ')
                }).append(
                    $('<i>', {
                        class: ['fas', 'fa-fw', iconSize, 'fa-sync', 'fa-spin'].join(' ')
                    })
                )
            );

            loadingElement.append(overlay);

            // fade in
            $(overlay).velocity({
                opacity: 0.6
            },{
                duration: 120
            });
        });
    };

    /**
     * removes a loading indicator
     */
    $.fn.hideLoadingAnimation = function(){
        return this.each(function(){
            let loadingElement = $(this);
            let overlay = loadingElement.find('.' + config.ajaxOverlayClass );

            if(overlay.length){
                // important: "stop" is required to stop "show" animation
                // -> otherwise "complete" callback is not fired!
                overlay.velocity('stop').velocity('reverse', {
                    complete: function(){
                        $(this).remove();
                        // enable all events
                        loadingElement.css('pointer-events', 'auto');
                    }
                });
            }
        });
    };

    /**
     * show "splash" loading overlay
     * @param callback
     */
    $.fn.showSplashOverlay = function(callback){
        let splashOverlay = $(this);

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
        let splashOverlay = $(this);

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
            let captchaWrapper = $(this);
            let captchaImage = captchaWrapper.find('img');

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
     * @param reason
     * @param callback
     */
    let getCaptchaImage = function(reason, callback){

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
            let reason = status + ' ' + error;
            showNotify({title: jqXHR.status + ': getCaptchaImage', text: reason, type: 'error'});
        });

    };

    /**
     * reset/clear form fields
     * @returns {*}
     */
    $.fn.resetFormFields = function(){
        return this.each(function(){
            let field = $(this);

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

        let formElement = $(this);

        let errorMessage = [];
        let warningMessage = [];
        let infoMessage = [];
        for(let i = 0; i < errors.length; i++){
            if(errors[i].type === 'error'){
                errorMessage.push( errors[i].message );

                // mark form field as invalid in case of a validation error
                if(
                    errors[i].field &&
                    errors[i].field.length > 0
                ){
                    let formField = formElement.find('[name="' + errors[i].field + '"]');
                    let formGroup = formField.parents('.form-group').removeClass('has-success').addClass('has-error');
                    let formHelp = formGroup.find('.help-block').text(errors[i].message);
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

        let formElement = $(this);

        let settingsMessageVelocityOptions = $.extend({}, config.settingsMessageVelocityOptions);

        // check if callback exists
        if(callback !== undefined){
            settingsMessageVelocityOptions.complete = callback;

            // new error will be shown afterwards -> keep display
            settingsMessageVelocityOptions.display = 'block';
        }

        let messageElement = null;

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
     * @param options
     * @returns {*}
     */
    $.fn.initFormValidation = function(options){
        options = (typeof options === 'undefined')? {} : options;

        return this.each(function(){
            let form = $(this);

            // init form validation
            form.validator(options);

            // validation event listener
            form.on('valid.bs.validator', function(validatorObj){
                let inputGroup = $(validatorObj.relatedTarget).parents('.form-group');
                if(inputGroup){
                    inputGroup.removeClass('has-error').addClass('has-success');
                }
            });

            form.on('invalid.bs.validator', function(validatorObj){
                let field = $(validatorObj.relatedTarget);
                let inputGroup = field.parents('.form-group');
                if(inputGroup){
                    inputGroup.removeClass('has-success').addClass('has-error');
                }
            });
        });
    };

    /**
     * checks whether a bootstrap form is valid or not
     * validation plugin does not provide a proper function for this
     * @returns {boolean}
     */
    $.fn.isValidForm = function(){
        let form = $(this);
        let valid = false;

        let errorElements =  form.find('.has-error');

        if(errorElements.length === 0){
            valid = true;
        }

        return valid;
    };

    /**
     * check multiple element if they arecurrently visible in viewport
     * @returns {Array}
     */
    $.fn.isInViewport = function(){

        let visibleElement = [];

        this.each(function(){
            let element = $(this)[0];

            let top = element.offsetTop;
            let left = element.offsetLeft;
            let width = element.offsetWidth;
            let height = element.offsetHeight;

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

        let counterChart = $(this);

        counterChart.easyPieChart({
            barColor: function(percent){

                let color = '#568a89';
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
     * @param  {object} options
     * @returns {*}
     */
    $.fn.initTooltips = function(options){

        options = (typeof options === 'object') ? options : {};

        let defaultOptions = {
            container:  this,
            delay: 100
        };
        options = $.extend(defaultOptions, options);

        return this.each(function(){
            let tooltipElements = $(this).find('[title]');
            tooltipElements.tooltip('destroy').tooltip(options);
        });
    };

    /**
     * adds a popup tooltip with character information (created/updated)
     * @param tooltipData
     */
    $.fn.addCharacterInfoTooltip = function(tooltipData){
        let element = $(this);

        if(
            tooltipData.created.character &&
            tooltipData.updated.character
        ){
            let createdData = tooltipData.created;
            let updatedData = tooltipData.updated;

            // check if data has changed
            if(
                element.data('created') !== createdData.created ||
                element.data('updated') !== updatedData.updated
            ){
                // data changed
                // set new data for next check
                element.data('created', createdData.created);
                element.data('updated', updatedData.updated);

                let statusCreatedClass = getStatusInfoForCharacter(createdData.character, 'class');
                let statusUpdatedClass = getStatusInfoForCharacter(updatedData.character, 'class');

                // convert timestamps
                let dateCreated = new Date(createdData.created * 1000);
                let dateUpdated = new Date(updatedData.updated * 1000);
                let dateCreatedUTC = convertDateToUTC(dateCreated);
                let dateUpdatedUTC = convertDateToUTC(dateUpdated);

                let data = {
                    created: createdData,
                    updated: updatedData,
                    createdTime: convertDateToString(dateCreatedUTC),
                    updatedTime: convertDateToString(dateUpdatedUTC),
                    createdStatusClass: statusCreatedClass,
                    updatedStatusClass: statusUpdatedClass
                };

                requirejs(['text!templates/tooltip/character_info.html', 'mustache'], function(template, Mustache) {
                    let content = Mustache.render(template, data);

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
                    let popover = element.data('bs.popover');
                    popover.options.content = content;
                });

            }
        }

        return element;
    };

    /**
     * add character switch popover
     * @param userData
     */
    $.fn.initCharacterSwitchPopover = function(userData){
        let elements = $(this);
        let eventNamespace = 'hideCharacterPopup';

        requirejs(['text!templates/tooltip/character_switch.html', 'mustache'], function (template, Mustache) {

            let data = {
                id: config.headCharacterSwitchId,
                browserTabId: getBrowserTabId(),
                routes:  Init.routes,
                userData: userData,
                otherCharacters: () => {
                    return userData.characters.filter((character, i) => {
                        let characterImage = Init.url.ccpImageServer + '/Character/' + character.id + '_32.jpg';
                        // preload image (prevent UI flicker
                        let img= new Image();
                        img.src = characterImage;

                        userData.characters[i].image = characterImage;

                        return character.id !== userData.character.id;
                    });
                }
            };

            let content = Mustache.render(template, data);

            return elements.each(function() {
                let element = $(this);

                // check if tooltip already exists -> remove it
                if(element.data('bs.popover') !== undefined){
                    element.off('click').popover('destroy');
                }

                element.on('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    let button = $(this);
                    let easeEffect = button.attr('data-easein');
                    let popoverData = button.data('bs.popover');
                    let popoverElement = null;

                    let velocityOptions = {
                        duration: Init.animationSpeed.dialogEvents
                    };

                    if(popoverData === undefined){

                        button.on('shown.bs.popover', function (e) {
                            let tmpPopupElement = $(this).data('bs.popover').tip();
                            tmpPopupElement.find('.btn').on('click', function(e){
                                // close popover
                                $('body').click();
                            });
                        });

                        // init popover and add specific class to it (for styling)
                        button.popover({
                            html: true,
                            title: 'select character',
                            trigger: 'manual',
                            placement: 'bottom',
                            container: 'body',
                            content: content,
                            animation: false
                        }).data('bs.popover').tip().addClass('pf-popover');

                        button.popover('show');

                        popoverElement = button.data('bs.popover').tip();
                        popoverElement.velocity('transition.' + easeEffect, velocityOptions);
                        popoverElement.initTooltips();

                        // set click events. This is required to pass data to "beforeunload" events
                        // -> there is no way to identify the target within that event
                        popoverElement.on('click', '.btn', function(){
                            // character switch detected
                            $('body').data('characterSwitch', true);
                            // ... and remove "characterSwitch" data again! after "unload"
                            setTimeout(function() {
                                $('body').removeData('characterSwitch');
                            }, 500);
                        });
                    }else{
                        popoverElement = button.data('bs.popover').tip();
                        if(popoverElement.is(':visible')){
                            popoverElement.velocity('reverse');
                        }else{
                            button.popover('show');
                            popoverElement.initTooltips();
                            popoverElement.velocity('transition.' + easeEffect, velocityOptions);
                        }
                    }
                });

                // set popup "close" observer
                elements.initPopoverClose(eventNamespace);
            });
        });
    };

    /**
     * set "popover" close action on clicking "somewhere" on the <body>
     * @param eventNamespace
     * @returns {*}
     */
    $.fn.initPopoverClose = function(eventNamespace){
        return this.each(function() {
            $('body').off('click.' + eventNamespace).on('click.' + eventNamespace + ' contextmenu', function (e) {

                $('.' + config.popoverTriggerClass).each(function () {
                    let popoverElement = $(this);
                    //the 'is' for buttons that trigger popups
                    //the 'has' for icons within a button that triggers a popup
                    if(
                        !popoverElement.is(e.target) &&
                        popoverElement.has(e.target).length === 0 &&
                        $('.popover').has(e.target).length === 0
                    ){
                        let popover = popoverElement.data('bs.popover');

                        if(
                            popover !== undefined &&
                            popover.tip().is(':visible')
                        ){
                            popoverElement.popover('hide');
                        }
                    }
                });
            });
        });
    };

    /**
     * display a custom message (info/warning/error) to a container element
     * check: $.fn.showFormMessage() for an other way of showing messages
     * @param config
     */
    $.fn.showMessage = function(config){
        let containerElement = $(this);

        requirejs(['text!templates/form/message.html', 'mustache'], function(template, Mustache) {

            let messageTypeClass = 'alert-danger';
            let messageTextClass = 'txt-color-danger';

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

            let defaultOptions = {
                dismissible: true,
                messageId: 'pf-alert-' + Math.random().toString(36).substring(7),
                messageTypeClass: messageTypeClass,
                messageTextClass: messageTextClass,
                insertElement: 'replace'
            };

            defaultOptions = $.extend(defaultOptions, config);
            let content = Mustache.render(template, defaultOptions);

            switch(defaultOptions.insertElement){
                case 'replace': containerElement.html(content); break;
                case 'prepend': containerElement.prepend(content); break;
                case 'append': containerElement.append(content); break;
                default: console.error('insertElement: %s is not specified!', defaultOptions.insertElement);
            }

            //containerElement.children().first().velocity('stop').velocity('fadeIn');
            $('#' + defaultOptions.messageId).velocity('stop').velocity('fadeIn');

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
            let clicks = 0, self = this;

            // prevent default behaviour (e.g. open <a>-tag link)
            $(this).off('click').on('click', function(e){
                e.preventDefault();
            });

            $(this).off('mouseup').on('mouseup', function(e){
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

    /**
     * highlight jquery elements
     * add/remove css class for keyframe animation
     * @returns {any|JQuery|*}
     */
    $.fn.pulseTableRow = function(status, clear){

        let animationClass = '';
        switch(status){
            case 'added':
                animationClass = config.animationPulseSuccessClass;
                break;
            case 'changed':
                animationClass = config.animationPulseWarningClass;
                break;
        }

        let clearTimer =  function(element) {
            element.removeClass( animationClass );
            let currentTimer = element.data('animationTimer');

            if( animationTimerCache.hasOwnProperty(currentTimer) ){
                clearTimeout( currentTimer );
                delete animationTimerCache[currentTimer];
                element.removeData('animationTimer');
            }
        };

        return this.each(function(){
            let element = $(this);

            if( element.hasClass(animationClass) ){
                // clear timer -> set new timer
                clearTimer(element);
            }

            if(clear !== true){
                element.addClass( animationClass );
                let timer = setTimeout(clearTimer, 1500, element);
                element.data('animationTimer', timer);
                animationTimerCache[timer] = true;
            }

        });
    };

    /*
     *  ===========================================================================================================
     *   Util functions that are global available for all modules
     *   ==========================================================================================================
     */

    /**
     * get current Pathfinder version number
     * @returns {*|jQuery}
     */
    let getVersion = function(){
        return $('body').data('version');
    };

    /**
     * show current program version information in browser console
     */
    let showVersionInfo = function(){
        console.info('PATHFINDER ' + getVersion());
    };

    /**
     * polyfill for "passive" events
     * -> see https://github.com/zzarcon/default-passive-events
     */
    let initPassiveEvents = () => {

        const defaultOptions = {
            passive: true,
            capture: false
        };
        const supportedPassiveTypes = [
            'scroll', 'wheel',
            'touchstart', 'touchmove', 'touchenter', 'touchend', 'touchleave',
            'mouseout', 'mouseleave', 'mouseup', 'mousedown', 'mousemove', 'mouseenter', 'mousewheel', 'mouseover'
        ];
        const getDefaultPassiveOption = (passive, eventName) => {
            if (passive !== undefined) return passive;

            return supportedPassiveTypes.indexOf(eventName) === -1 ? false : defaultOptions.passive;
        };

        const getWritableOptions = (options) => {
            const passiveDescriptor = Object.getOwnPropertyDescriptor(options, 'passive');

            return passiveDescriptor &&
            passiveDescriptor.writable !== true &&
            passiveDescriptor.set === undefined ? Object.assign({}, options) : options;
        };

        const prepareSafeListener = (listener, passive) => {
            if (!passive) return listener;
            return function (e) {
                e.preventDefault = () => {};
                return listener.call(this, e);
            };
        };

        const overwriteAddEvent = (superMethod) => {
            EventTarget.prototype.addEventListener = function (type, listener, options) { // jshint ignore:line
                const usesListenerOptions = typeof options === 'object';
                const useCapture          = usesListenerOptions ? options.capture : options;

                options         = usesListenerOptions ? getWritableOptions(options) : {};
                options.passive = getDefaultPassiveOption(options.passive, type);
                options.capture = useCapture === undefined ? defaultOptions.capture : useCapture;
                listener        = prepareSafeListener(listener, options.passive);

                superMethod.call(this, type, listener, options);
            };
        };

        let eventListenerOptionsSupported = () => {
            let supported = false;

            try {
                const opts = Object.defineProperty({}, 'passive', {
                    get() {
                        supported = true;
                    }
                });

                window.addEventListener('test', null, opts);
                window.removeEventListener('test', null, opts);
            } catch (e) {}

            return supported;
        };

        let supportsPassive = eventListenerOptionsSupported ();
        if (supportsPassive) {
            const addEvent = EventTarget.prototype.addEventListener; // jshint ignore:line
            overwriteAddEvent(addEvent);
        }
    };

    /**
     * init utility prototype functions
     */
    let initPrototypes = () => {
        // Array diff
        // [1,2,3,4,5,6].diff( [3,4,5] );
        // => [1, 2, 6]
        Array.prototype.diff = function(a) {
            return this.filter(function(i) {return a.indexOf(i) < 0;});
        };

        /**
         * sort array of objects by property name
         * @param p
         * @returns {Array.<T>}
         */
        Array.prototype.sortBy = function(p) {
            return this.slice(0).sort((a,b) => {
                return (a[p] > b[p]) ? 1 : (a[p] < b[p]) ? -1 : 0;
            });
        };

        initPassiveEvents();
    };

    /**
     * flatten XEditable array for select fields
     * @param dataArray
     * @returns {{}}
     */
    let flattenXEditableSelectArray = (dataArray) => {
        let flatten = {};

        for(let data of dataArray){
            if(data.children && data.children.length > 0){
                for(let child of data.children){
                    flatten[child.value] = child.text;
                }
            }else{
                flatten[data.value] = data.text;
            }
        }

        return flatten;
    };

    /**
     * set default configuration  for "Bootbox" dialogs
     */
    let initDefaultBootboxConfig = function(){
        bootbox.setDefaults({
            onEscape: true      // enables close dialogs on ESC key
        });
    };

    /**
     * get the current main trigger delay for the main trigger functions
     * optional in/decrease the delay
     * @param updateKey
     * @param value
     * @returns {*}
     */
    let getCurrentTriggerDelay = function( updateKey, value ){

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
    let getServerTime = function(){

        // Server is running with GMT/UTC (EVE Time)
        let localDate = new Date();

        let serverDate= new Date(
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
     * convert timestamp to server time
     * @param timestamp
     * @returns {Date}
     */
    let convertTimestampToServerTime = function(timestamp){
        let currentTimeZoneOffsetInMinutes = new Date().getTimezoneOffset();
        return new Date( (timestamp + (currentTimeZoneOffsetInMinutes * 60)) * 1000);
    };

    /**
     * get date difference as time parts (days, hours, minutes, seconds)
     * @param date1
     * @param date2
     * @returns {{}}
     */
    let getTimeDiffParts = function(date1, date2){
        let parts = {};
        let time1 = date1.getTime();
        let time2 = date2.getTime();
        let diff  = 0;

        if(
            time1 >= 0 &&
            time2 >= 0
        ){
            diff = (date2.getTime() - date1.getTime()) / 1000;
        }

        diff = Math.abs(Math.floor(diff));

        parts.days = Math.floor(diff/(24*60*60));
        let leftSec = diff - parts.days * 24*60*60;

        parts.hours = Math.floor(leftSec/(60*60));
        leftSec = leftSec - parts.hours * 60*60;

        parts.min = Math.floor(leftSec/(60));
        parts.sec = leftSec - parts.min * 60;
        return parts;
    };

    /**
     * start time measurement by a unique string identifier
     * @param timerName
     */
    let timeStart = function(timerName){

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
    let timeStop = function(timerName){

        let duration = 0;

        if( stopTimerCache.hasOwnProperty(timerName) ){
            // check browser support for performance API
            let timeNow = 0;

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
     * @param logKey
     * @param options
     */
    let log = function(logKey, options){
        $(window).trigger('pf:log', [logKey, options]);
    };

    /**
     * trigger a notification (on screen or desktop)
     * @param customConfig
     * @param desktop
     */
    let showNotify = function(customConfig, desktop){
        requirejs(['notification'], function(Notification) {
            Notification.showNotify(customConfig, desktop);
        });
    };

    /**
     * stop browser tab title "blinking"
     */
    let stopTabBlink = function(){
        requirejs(['notification'], function(Notification) {
            Notification.stopTabBlink();
        });
    };

    /**
     * get log entry info
     * @param logType
     * @param option
     * @returns {string}
     */
    let getLogInfo = function(logType, option){
        let logInfo = '';

        if(Init.classes.logTypes.hasOwnProperty(logType)){
            logInfo = Init.classes.logTypes[logType][option];
        }

        return logInfo;
    };

    /**
     * get currentUserData from "global" variable
     * @returns {*}
     */
    let getCurrentUserData = function(){
        return Init.currentUserData;
    };

    /**
     * get either active characterID or characterId from initial page load
     * @returns {number}
     */
    let getCurrentCharacterId = () => {
        let userData = getCurrentUserData();
        let currentCharacterId = 0;
        if(
            userData &&
            userData.character
        ){
            currentCharacterId = parseInt( userData.character.id );
        }

        if(!currentCharacterId){
            // no active character... -> get default characterId from initial page load
            currentCharacterId = parseInt(document.body.getAttribute('data-character-id'));
        }

        return currentCharacterId;
    };

    /**
     * get a unique ID for each tab
     * -> store ID in session storage
     */
    let getBrowserTabId = () => {
        let key = 'tabId';
        let tabId = sessionStorage.getItem(key);
        if(tabId === null){
            tabId = Math.random().toString(36).substr(2, 5);
            sessionStorage.setItem(key, tabId);
        }
        return tabId;
    };

    /**
     * set default jQuery AJAX configuration
     */
    let ajaxSetup = function(){
        $.ajaxSetup({
            beforeSend: function(xhr, settings) {
                // Add custom application headers on "same origin" requests only!
                // -> Otherwise a "preflight" request is made, which will "probably" fail
                if(settings.crossDomain === false){
                    // add current character data to ANY XHR request (HTTP HEADER)
                    // -> This helps to identify multiple characters on multiple browser tabs
                    xhr.setRequestHeader('Pf-Character', getCurrentCharacterId());
                }
            }
        });
    };

    /**
     * get WebSocket readyState description from ID
     * https://developer.mozilla.org/de/docs/Web/API/WebSocket
     * @param readyState
     * @returns {string}
     */
    let getWebSocketDescriptionByReadyState = (readyState) => {
        let description = '';

        switch(readyState){
            case 0: description = 'connecting'; break;
            case 1: description = 'open'; break;
            case 2: description = 'closing'; break;
            case 3: description = 'closed'; break;
        }

        return description;
    };

    /**
     * set sync status for map updates
     * -> if SharedWorker AND WebSocket connected -> status = "WebSocket"
     * -> else -> status = "ajax" (long polling)
     * @param type
     * @param options
     */
    let setSyncStatus = (type, options) => {
        // current syncStatus
        let syncStatus = Init.syncStatus;

        switch(type){
            case 'ws:open':
                // WebSocket open
                syncStatus.webSocket.status = getWebSocketDescriptionByReadyState(options.readyState);
                syncStatus.webSocket.class = 'txt-color-success';
                syncStatus.webSocket.timestamp = new Date().getTime() / 1000;

                syncStatus.type = 'webSocket';
                setSyncStatus('ajax:disable');

                $(window).trigger('pf:syncStatus');
                break;
            case 'ws:get':
                // WebSocket data pushed from server
                syncStatus.webSocket.timestamp = new Date().getTime() / 1000;
                $(window).trigger('pf:syncStatus');
                break;
            case 'ws:closed':
                // WebSocket closed
                syncStatus.webSocket.status = getWebSocketDescriptionByReadyState(options.readyState);
                syncStatus.webSocket.class = 'txt-color-danger';
                syncStatus.webSocket.timestamp = undefined;

                setSyncStatus('ajax:enable');
                break;
            case 'ws:error':
                // WebSocket error
                syncStatus.webSocket.status = getWebSocketDescriptionByReadyState(options.readyState);
                syncStatus.webSocket.class = 'txt-color-danger';

                setSyncStatus('ajax:enable');
                break;
            case 'sw:init':
                // SharedWorker initialized
                syncStatus.sharedWorker.status = 'online';
                syncStatus.sharedWorker.class = 'txt-color-success';
                break;
            case 'sw:error':
                // SharedWorker error
                syncStatus.sharedWorker.status = 'offline';
                syncStatus.sharedWorker.class = 'txt-color-danger';

                setSyncStatus('ajax:enable');
                break;
            case 'ajax:enable':
                // Ajax enabled (WebSocket error/not connected)
                syncStatus.ajax.status = 'enabled';
                syncStatus.ajax.class = 'txt-color-success';
                syncStatus.ajax.timestamp = new Date().getTime() / 1000;

                syncStatus.type = 'ajax';
                $(window).trigger('pf:syncStatus');
                break;
            case 'ajax:get':
                // Ajax data pulled from client
                syncStatus.ajax.timestamp = new Date().getTime() / 1000;
                $(window).trigger('pf:syncStatus');
                break;
            case 'ajax:disable':
                // Ajax disabled (WebSocket open/ready)
                syncStatus.ajax.status = 'disabled';
                syncStatus.ajax.class = 'txt-color-warning';
                break;
        }
    };

    /**
     * get current sync type for map updates
     * -> "ajax" or "webSocket"
     * @returns {string}
     */
    let getSyncType = () => {
        return Init.syncStatus.type;
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
    let isXHRAborted = (jqXHR) => {
        return !jqXHR.getAllResponseHeaders();
    };

    /**
     * get label element for role data
     * @param role
     * @returns {*|jQuery|HTMLElement}
     */
    let getLabelByRole = (role) => {
        return $('<span>', {
            class: ['label', 'label-' + role.style].join(' '),
            text: role.label
        });
    };

    /**
     * get all mapTabElements (<a> tags)
     * or search for a specific tabElement within the
     * mapModuleElement
     * @param mapId
     * @returns {JQuery|*|{}|T}
     */
    $.fn.getMapTabElements = function(mapId){
        let mapModuleElement = $(this);
        let mapTabElements = mapModuleElement.find('#' + config.mapTabBarId).find('a');

        if(mapId){
            // search for a specific tab element
            mapTabElements = mapTabElements.filter(function(i, el){
                return ( $(el).data('map-id') === mapId );
            });
        }

        return mapTabElements;
    };

    /**
     * get mapElement from overlay or any child of that
     * @param mapOverlay
     * @returns {jQuery}
     */
    let getMapElementFromOverlay = (mapOverlay) => {
        return $(mapOverlay).parents('.' + config.mapWrapperClass).find('.' + config.mapClass);
    };

    /**
     * get the map module object or create a new module
     * @returns {*|HTMLElement}
     */
    let getMapModule = () => {
        let mapModule = $('#' + config.mapModuleId);
        if(mapModule.length === 0){
            mapModule = $('<div>', {
                id: config.mapModuleId
            });
        }

        return mapModule;
    };

    /**
     * get Area ID by security string
     * @param security
     * @returns {number}
     */
    let getAreaIdBySecurity = (security) => {
        let areaId = 0;
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
                for(let i = 1; i <= 6; i++){
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
     * get system effect data by system security and system class
     * if no search parameters given -> get all effect data
     * @param security
     * @param effect
     * @returns {boolean}
     */
    let getSystemEffectData = (security, effect) => {
        let data =  SystemEffect;
        if(security){
            // look for specific data
            data = false;
            let areaId = getAreaIdBySecurity(security);

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
    let getStatusInfoForCharacter = (characterData, option) => {

        let statusInfo = '';

        // character status can not be checked if there are no reference data
        // e.g. during registration process (login page)
        if(Init.characterStatus){
            // get info for current "main" character
            let corporationId = getCurrentUserInfo('corporationId');
            let allianceId = getCurrentUserInfo('allianceId');

            // get all user characters
            let userData = getCurrentUserData();

            if(userData){
                // check if character is one of his own characters
                let userCharactersData = userData.characters;

                for(let i = 0; i < userCharactersData.length; i++){
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
    let getSystemEffectTable = function(data){
        let table = '';

        if(data.length > 0){

            table += '<table>';
            for(let i = 0; i < data.length; i++){
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
    let getSystemsInfoTable = function(data){
        let table = '';

        if(data.length > 0){

            table += '<table>';
            for(let i = 0; i < data.length; i++){

                let trueSecClass = getTrueSecClassForSystem( data[i].trueSec );
                let securityClass = getSecurityClassForSystem( data[i].security );

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
    let getSecurityClassForSystem = (sec) => {
        let secClass = '';
        if( Init.classes.systemSecurity.hasOwnProperty(sec) ){
            secClass = Init.classes.systemSecurity[sec]['class'];
        }
        return secClass;
    };

    /**
     * get a css class for the name depending on available space
     * @param locked
     * @param effect
     * @returns {string}
     */
    let getNameClassForSystem = (locked, effect) => {
        // if the system is locked and has an effect -> shorten the name. if neither is the case -> extend it
        let nameClass = locked && effect ? 'pf-system-head-name-short' : '';
        nameClass = !locked && !effect ? 'pf-system-head-name-long' : nameClass;

        return nameClass;
    };

    /**
     * get a css class for the trueSec level of a system
     * @param trueSec
     * @returns {string}
     */
    let getTrueSecClassForSystem = function(trueSec){
        let trueSecClass = '';

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
    let getStatusInfoForSystem = function(status, option){

        let statusInfo = '';

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
     * get signature group information
     * @param option
     * @returns {{}}
     */
    let getSignatureGroupInfo = function(option){

        let groupInfo = {};

        for (let prop in Init.signatureGroups) {
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
    let getAllSignatureNames = function(systemTypeId, areaId, sigGroupId){

        let signatureNames = {};

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
    let getSignatureTypeIdByName = function(systemData, sigGroupId, name){

        let signatureTypeId = 0;

        let areaId = getAreaIdBySecurity(systemData.security);

        if(areaId > 0){
            let signatureNames = getAllSignatureNames(systemData.type.id, areaId, sigGroupId );
            name = name.toLowerCase();

            for(let prop in signatureNames) {

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
     * set currentMapUserData as "global" variable (count of active pilots)
     * this function should be called continuously after data change
     * to keep the data always up2data
     * @param mapUserData
     */
    let setCurrentMapUserData = function(mapUserData){
        Init.currentMapUserData = mapUserData;

        return getCurrentMapUserData();
    };

    /**
     * get currentMapUserData from "global" variable for specific map or all maps
     * @param mapId
     * @returns {boolean}
     */
    let getCurrentMapUserData = function(mapId){
        let currentMapUserData = false;

        if(
            mapId === parseInt(mapId, 10) &&
            Init.currentMapUserData
        ){
            // search for a specific map
            for(let i = 0; i < Init.currentMapUserData.length; i++){
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
    let setCurrentMapData = function(mapData){
        Init.currentMapData = mapData;

        return getCurrentMapData();
    };

    /**
     * get mapData array index by mapId
     * @param mapId
     * @returns {boolean|int}
     */
    let getCurrentMapDataIndex = function(mapId){
        let mapDataIndex = false;

        if( mapId === parseInt(mapId, 10) ){
            for(let i = 0; i < Init.currentMapData.length; i++){
                if(Init.currentMapData[i].config.id === mapId){
                    mapDataIndex = i;
                    break;
                }
            }
        }

        return mapDataIndex;
    };

    /**
     * update cached mapData for a single map
     * @param mapData
     */
    let updateCurrentMapData = function(mapData){
        let mapDataIndex = getCurrentMapDataIndex( mapData.config.id );

        if(mapDataIndex !== false){
            Init.currentMapData[mapDataIndex].config = mapData.config;
            Init.currentMapData[mapDataIndex].data = mapData.data;
        }else{
            // new map data
            Init.currentMapData.push(mapData);
        }
    };

    /**
     * get currentMapData from "global" variable for a specific map or all maps
     * @param mapId
     * @returns {boolean}
     */
    let getCurrentMapData = function(mapId){
        let currentMapData = false;

        if( mapId === parseInt(mapId, 10) ){
            // search for a specific map
            for(let i = 0; i < Init.currentMapData.length; i++){
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
     * @param path
     * @param value
     * @returns {boolean}
     */
    let filterCurrentMapData = (path, value) => {
        let currentMapData = getCurrentMapData();
        if(currentMapData){
            currentMapData = currentMapData.filter((mapData) => {
                return (getObjVal(mapData, path) === value);
            });
        }
        return currentMapData;
    };

    /**
     * delete map data by mapId from currentMapData
     * @param mapId
     */
    let deleteCurrentMapData = (mapId) => {
        Init.currentMapData = Init.currentMapData.filter((mapData) => {
            return (mapData.config.id !== mapId);
        });
    };

    /**
     * set currentUserData as "global" variable
     * this function should be called continuously after data change
     * to keep the data always up2data
     * @param userData
     */
    let setCurrentUserData = function(userData){
        Init.currentUserData = userData;

        // check if function is available
        // this is not the case in "login" page
        if( $.fn.updateHeaderUserData ){
            $.fn.updateHeaderUserData();
        }

        return getCurrentUserData();
    };

    /**
     * get the current log data for the current user character
     * @returns {boolean}
     */
    let getCurrentCharacterLog = function(){
        let characterLog = false;
        let currentUserData = getCurrentUserData();

        if(
            currentUserData &&
            currentUserData.character &&
            currentUserData.character.log
        ){
            characterLog = currentUserData.character.log;
        }

        return characterLog;
    };

    /**
     * get information for the current mail user
     * @param option
     * @returns {boolean}
     */
    let getCurrentUserInfo = (option) => {
        let currentUserData = getCurrentUserData();
        let userInfo = false;

        if(currentUserData){
            // user data is set -> user data will be set AFTER the main init request!
            let characterData = currentUserData.character;
            if(characterData){
                if(option === 'privateId'){
                    userInfo = characterData.id;
                }

                if(option === 'allianceId' && characterData.alliance){
                    userInfo = characterData.alliance.id;
                }

                if(option === 'corporationId' && characterData.corporation){
                    userInfo = characterData.corporation.id;
                }
            }
        }

        return userInfo;
    };

    /**
     * get "nearBy" systemData based on a jump radius around a currentSystem
     * @param currentSystemData
     * @param currentMapData
     * @param jumps
     * @param foundSystemIds
     * @returns {{systemData: *, tree: {}}}
     */
    let getNearBySystemData = (currentSystemData, currentMapData, jumps, foundSystemIds = {}) => {

        // look for systemData by ID
        let getSystemData = (systemId) => {
            for(let j = 0; j < currentMapData.data.systems.length; j++){
                let systemData = currentMapData.data.systems[j];
                if(systemData.id === systemId){
                    return systemData;
                }
            }
            return false;
        };

        // skip systems that are already found in recursive calls
        foundSystemIds[currentSystemData.id] = {distance: jumps};

        let nearBySystems = {
            systemData: currentSystemData,
            tree: {}
        };

        jumps--;
        if(jumps >= 0){
            for(let i = 0; i < currentMapData.data.connections.length; i++){
                let connectionData = currentMapData.data.connections[i];
                let type = ''; // "source" OR "target"
                if(connectionData.source === currentSystemData.id){
                    type = 'target';
                }else if(connectionData.target === currentSystemData.id){
                    type = 'source';
                }

                if(
                    type &&
                    (
                        foundSystemIds[connectionData[type]] === undefined ||
                        foundSystemIds[connectionData[type]].distance < jumps
                    )
                ){
                    let newSystemData = getSystemData(connectionData[type]);
                    if(newSystemData){
                        nearBySystems.tree[connectionData[type]] = getNearBySystemData(newSystemData, currentMapData, jumps, foundSystemIds);
                    }
                }
            }
        }
        return nearBySystems;
    };

    /**
     * get current character data from all characters who are "nearby" the current user
     * -> see getNearBySystemData()
     * @param nearBySystems
     * @param userData
     * @param jumps
     * @param data
     * @returns {{}}
     */
    let getNearByCharacterData = (nearBySystems, userData, jumps = 0, data = {}) => {

        let getCharacterDataBySystemId = (systemId) => {
            for(let i = 0; i < userData.length; i++){
                if(userData[i].id === systemId){
                    return userData[i].user;
                }
            }
            return [];
        };

        let filterFinalCharData = function(tmpFinalCharData){
            return this.id !== tmpFinalCharData.id;
        };

        let characterData = getCharacterDataBySystemId(nearBySystems.systemData.systemId);

        if(characterData.length){
            // filter (remove) characterData for "already" added chars
            characterData = characterData.filter(function(tmpCharacterData, index, allData){
                let keepData = true;

                for(let tmpJump in data) {
                    // just scan systems with > jumps than current system
                    if(tmpJump > jumps){
                        let filteredFinalData = data[tmpJump].filter(filterFinalCharData, tmpCharacterData);

                        if(filteredFinalData.length > 0){
                            data[tmpJump] = filteredFinalData;
                        }else{
                            delete data[tmpJump];
                        }
                    }else{
                        for(let k = 0; k < data[tmpJump].length; k++){
                            if(data[tmpJump][k].id === tmpCharacterData.id){
                                keepData = false;
                                break;
                            }
                        }
                    }
                }

                return keepData;
            });

            data[jumps] = data[jumps] ? data[jumps] : [];
            data[jumps] = [...data[jumps], ...characterData];
        }

        jumps++;
        for(let prop in nearBySystems.tree) {
            if( nearBySystems.tree.hasOwnProperty(prop) ){
                let tmpSystemData = nearBySystems.tree[prop];
                data = getNearByCharacterData(tmpSystemData, userData, jumps, data);
            }
        }

        return data;
    };

    /**
     * set new destination for a system
     * @param systemData
     * @param type
     */
    let setDestination = function(systemData, type){
        let description = '';
        switch(type){
            case 'set_destination':
                description = 'Set destination';
                break;
            case 'add_first_waypoint':
                description = 'Set first waypoint';
                break;
            case 'add_last_waypoint':
                description = 'Set new waypoint';
                break;
        }

        $.ajax({
            type: 'POST',
            url: Init.path.setDestination,
            data: {
                clearOtherWaypoints: (type === 'set_destination') ? 1 : 0,
                first: (type === 'add_last_waypoint') ? 0 : 1,
                systemData: [{
                    systemId: systemData.systemId,
                    name: systemData.name
                }]
            },
            context: {
                description: description
            },
            dataType: 'json'
        }).done(function(responseData){
            if(
                responseData.systemData &&
                responseData.systemData.length > 0
            ){
                for (let j = 0; j < responseData.systemData.length; j++) {
                    showNotify({title: this.description, text: 'System: ' + responseData.systemData[j].name, type: 'success'});
                }
            }

            if(
                responseData.error &&
                responseData.error.length > 0
            ){
                for(let i = 0; i < responseData.error.length; i++){
                    showNotify({title: this.description + ' error', text: 'System: ' + responseData.error[i].message, type: 'error'});
                }
            }

        }).fail(function( jqXHR, status, error) {
            let reason = status + ' ' + error;
            showNotify({title: jqXHR.status + ': ' + this.description, text: reason, type: 'warning'});
        });
    };

    /**
     * set currentSystemData as "global" variable
     * @param systemData
     */
    let setCurrentSystemData = (systemData) => {
        Init.currentSystemData = systemData;
    };

    /**
     * get currentSystemData from "global" variables
     * @returns {*}
     */
    let getCurrentSystemData = () => {
        return Init.currentSystemData;
    };

    /**
     * get current location data
     * -> system data where current user is located
     * @returns {{id: *, name: *}}
     */
    let getCurrentLocationData = function(){
        let currentLocationLink = $('#' + config.headCurrentLocationId).find('a');
        return {
            id: currentLocationLink.data('systemId'),
            name: currentLocationLink.data('systemName')
        };
    };

    /**
     * get all "open" dialog elements
     * @returns {*|jQuery}
     */
    let getOpenDialogs = function(){
        return $('.' + config.dialogClass).filter(':visible');
    };

    /**
     * send Ajax request that remote opens an ingame Window
     * @param targetId
     */
    let openIngameWindow = (targetId) => {
        targetId = parseInt(targetId);

        if(targetId > 0){
            $.ajax({
                type: 'POST',
                url: Init.path.openIngameWindow,
                data: {
                    targetId: targetId
                },
                dataType: 'json'
            }).done(function(data){
                if(data.error.length > 0){
                    showNotify({title: 'Open window in client', text: 'Remote window open failed', type: 'error'});
                }else{
                    showNotify({title: 'Open window in client', text: 'Check your EVE client', type: 'success'});
                }
            }).fail(function( jqXHR, status, error) {
                let reason = status + ' ' + error;
                showNotify({title: jqXHR.status + ': openWindow', text: reason, type: 'error'});
            });
        }
    };

    /**
     * formats a price string into an ISK Price
     * @param price
     * @returns {string}
     */
    let formatPrice = (price) => {
        price = Number( price ).toFixed(2);

        let parts = price.toString().split('.');
        price = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts[1] ? '.' + parts[1] : '');

        return price + ' ISK';
    };

    /**
     * format mass value
     * @param value
     * @returns {string}
     */
    let formatMassValue = (value) => {
        return (parseInt(value) / 1000).toLocaleString() + ' t';
    };

    /**
     * get localForage instance (singleton) for offline client site storage
     * @returns {localforage}
     */
    let getLocalStorage = function(){
        if(localStorage === undefined){
            localStorage = localforage.createInstance({
                driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
                name: 'Pathfinder local storage'
            });
        }
        return localStorage;
    };

    /**
     * clear session Storage
     * -> otherwise a tab refresh does not clear sessionStorage!
     */
    let clearSessionStorage = () => {
        if(sessionStorage){
            sessionStorage.clear();
        }
    };

    /**
     * Create Date() as UTC
     * @param date
     * @returns {Date}
     */
    let createDateAsUTC = (date) => {
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
    };

    /**
     * Convert Date() to UTC (!important function!)
     * @param date
     * @returns {Date}
     */
    let convertDateToUTC = (date) => {
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
    };

    /**
     * Convert Date() to Time String
     * @param date
     * @param showSeconds
     * @returns {string}
     */
    let convertDateToString = (date, showSeconds) => {
        let dateString = ('0'+ (date.getMonth() + 1 )).slice(-2) + '/' + ('0'+date.getDate()).slice(-2) + '/' + date.getFullYear();
        let timeString = ('0' + date.getHours()).slice(-2) + ':' + ('0'+date.getMinutes()).slice(-2);
        timeString += (showSeconds) ? ':' + ('0'+date.getSeconds()).slice(-2) : '';
        return   dateString + ' ' + timeString;
    };

    /**
     * get deep json object value if exists
     * -> e.g. key = 'first.last.third' string
     * @param obj
     * @param key
     * @returns {*}
     */
    let getObjVal = (obj, key) => {
        return key.split('.').reduce((o, x) => {
            return (typeof o === 'undefined' || o === null) ? o : o[x];
        }, obj);
    };

    /**
     * get document path
     * -> www.pathfinder.com/pathfinder/ -> /pathfinder
     * @returns {string|string}
     */
    let getDocumentPath = () => {
        let pathname = window.location.pathname;
        // replace file endings
        let r = /[^\/]*$/;
        let path = pathname.replace(r, '');
        return path || '/';
    };

    /**
     * redirect
     * @param url
     * @param params
     */
    let redirect = (url, params) => {
        let currentUrl = document.URL;

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
    let logout = (params) => {
        let data = {};
        if(
            params &&
            params.ajaxData
        ){
            data = params.ajaxData;
        }

        $.ajax({
            type: 'POST',
            url: Init.path.logout,
            data: data,
            dataType: 'json'
        }).done(function(data){
            if(data.reroute){
                redirect(data.reroute, ['logout']);
            }
        }).fail(function( jqXHR, status, error) {
            let reason = status + ' ' + error;
            showNotify({title: jqXHR.status + ': logout', text: reason, type: 'error'});
        });
    };

    /**
     * set a cookie
     * @param name
     * @param value
     * @param expire
     * @param format
     */
    let setCookie = (name, value, expire, format) => {
        let d = new Date();
        let time = d.getTime();
        let timeExpire = time * -1;

        if(expire > 0){
            switch(format){
                case 'd':   // days
                    timeExpire = expire * 24 * 60 * 60 * 1000; break;
                case 's': // seconds
                    timeExpire = expire * 1000; break;

            }
        }

        d.setTime(time + timeExpire);
        let expires = 'expires=' + d.toUTCString();
        let path = 'path=' + getDocumentPath();
        document.cookie = name + '=' + value + '; ' + expires + '; ' + path;
    };

    /**
     * get cookie value by name
     * @param cname
     * @returns {string}
     */
    let getCookie = (cname) => {
        let name = cname + '=';
        let ca = document.cookie.split(';');

        for(let i = 0; i <ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }

            if (c.indexOf(name) === 0) {
                return c.substring(name.length,c.length);
            }
        }
        return '';
    };

    return {
        config: config,
        getVersion: getVersion,
        showVersionInfo: showVersionInfo,
        initPrototypes: initPrototypes,
        initDefaultBootboxConfig: initDefaultBootboxConfig,
        getCurrentTriggerDelay: getCurrentTriggerDelay,
        getServerTime: getServerTime,
        convertTimestampToServerTime: convertTimestampToServerTime,
        getTimeDiffParts: getTimeDiffParts,
        timeStart: timeStart,
        timeStop: timeStop,
        log: log,
        showNotify: showNotify,
        stopTabBlink: stopTabBlink,
        getLogInfo: getLogInfo,
        ajaxSetup: ajaxSetup,
        setSyncStatus: setSyncStatus,
        getSyncType: getSyncType,
        isXHRAborted: isXHRAborted,
        getLabelByRole: getLabelByRole,
        getMapElementFromOverlay: getMapElementFromOverlay,
        getMapModule: getMapModule,
        getSystemEffectData: getSystemEffectData,
        getSystemEffectTable: getSystemEffectTable,
        getSystemsInfoTable: getSystemsInfoTable,
        getStatusInfoForCharacter: getStatusInfoForCharacter,
        getSecurityClassForSystem: getSecurityClassForSystem,
        getNameClassForSystem: getNameClassForSystem,
        getTrueSecClassForSystem: getTrueSecClassForSystem,
        getStatusInfoForSystem: getStatusInfoForSystem,
        getSignatureGroupInfo: getSignatureGroupInfo,
        getAllSignatureNames: getAllSignatureNames,
        getSignatureTypeIdByName: getSignatureTypeIdByName,
        getAreaIdBySecurity: getAreaIdBySecurity,
        setCurrentMapUserData: setCurrentMapUserData,
        getCurrentMapUserData: getCurrentMapUserData,
        setCurrentMapData: setCurrentMapData,
        getCurrentMapData: getCurrentMapData,
        filterCurrentMapData: filterCurrentMapData,
        getCurrentMapDataIndex: getCurrentMapDataIndex,
        updateCurrentMapData: updateCurrentMapData,
        deleteCurrentMapData: deleteCurrentMapData,
        setCurrentUserData: setCurrentUserData,
        getCurrentUserData: getCurrentUserData,
        getCurrentCharacterId: getCurrentCharacterId,
        setCurrentSystemData: setCurrentSystemData,
        getCurrentSystemData: getCurrentSystemData,
        getCurrentLocationData: getCurrentLocationData,
        getCurrentUserInfo: getCurrentUserInfo,
        getCurrentCharacterLog: getCurrentCharacterLog,
        flattenXEditableSelectArray: flattenXEditableSelectArray,
        getNearBySystemData: getNearBySystemData,
        getNearByCharacterData: getNearByCharacterData,
        setDestination: setDestination,
        convertDateToUTC: convertDateToUTC,
        convertDateToString: convertDateToString,
        getOpenDialogs: getOpenDialogs,
        openIngameWindow: openIngameWindow,
        formatPrice: formatPrice,
        formatMassValue: formatMassValue,
        getLocalStorage: getLocalStorage,
        clearSessionStorage: clearSessionStorage,
        getBrowserTabId: getBrowserTabId,
        getObjVal: getObjVal,
        redirect: redirect,
        logout: logout,
        setCookie: setCookie,
        getCookie: getCookie
    };
});