/**
 *  Util
 */
define([
    'jquery',
    'app/init',
    'app/console',
    'conf/system_effect',
    'conf/signature_type',
    'bootbox',
    'localForage',
    'lazyload',
    'velocity',
    'velocityUI',
    'customScrollbar',
    'validator',
    'easyPieChart',
    'hoverIntent',
    'bootstrapConfirmation',
    'bootstrapToggle',
    'select2'
], ($, Init, Con, SystemEffect, SignatureType, bootbox, localforage) => {

    'use strict';

    let config = {
        ajaxOverlayClass: 'pf-loading-overlay',
        ajaxOverlayWrapperClass: 'pf-loading-overlay-wrapper',

        // page
        noScrollClass: 'no-scroll',

        // form
        formEditableFieldClass: 'pf-editable',                                  // class for all xEditable fields
        formErrorContainerClass: 'pf-dialog-error-container',                   // class for "error" containers in dialogs
        formWarningContainerClass: 'pf-dialog-warning-container',               // class for "warning" containers in dialogs
        formInfoContainerClass: 'pf-dialog-info-container',                     // class for "info" containers in dialogs

        // head
        headMapTrackingId: 'pf-head-map-tracking',                              // id for "map tracking" toggle (checkbox)
        headUserLocationId: 'pf-head-user-location',                            // id for "location" breadcrumb

        // menu
        menuButtonFullScreenId: 'pf-menu-button-fullscreen',                    // id for menu button "fullScreen"
        menuButtonMagnetizerId: 'pf-menu-button-magnetizer',                    // id for menu button "magnetizer"
        menuButtonGridId: 'pf-menu-button-grid',                                // id for menu button "grid snap"
        menuButtonEndpointId: 'pf-menu-button-endpoint',                        // id for menu button "endpoint" overlays
        menuButtonCompactId: 'pf-menu-button-compact',                          // id for menu button "compact" UI map view
        menuButtonMapDeleteId: 'pf-menu-button-map-delete',                     // id for menu button "delete map"

        // footer
        footerId: 'pf-footer',                                                  // id for page footer
        footerCenterClass: 'pf-footer-center',                                  // class for footer "center" element
        globalInfoPanelId: 'pf-global-info',                                    // id for "global info panel"

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

        // util
        userStatusClass: 'pf-user-status',                                      // class for player status
        dynamicAreaClass: 'pf-dynamic-area',                                    // class for "dynamic" areas

        // select2
        select2Class: 'pf-select2',                                             // class for all "Select2" <select> elements
        select2ImageLazyLoadClass: 'pf-select2-image-lazyLoad',

        // animation
        animationPulseSuccessClass: 'pf-animation-pulse-success',               // animation class
        animationPulseWarningClass: 'pf-animation-pulse-warning',               // animation class
        animationPulseDangerClass: 'pf-animation-pulse-danger',                 // animation class

        // popover
        popoverTriggerClass: 'pf-popover-trigger',                              // class for "popover" trigger elements
        popoverSmallClass: 'pf-popover-small',                                  // class for small "popover"
        popoverCharacterClass: 'pf-popover-character',                          // class for character "popover"

        // Summernote
        summernoteClass: 'pf-summernote',                                       // class for Summernote "WYSIWYG" elements

        // help
        helpDefaultClass: 'pf-help-default',                                    // class for "help" tooltip elements
        helpClass: 'pf-help',                                                   // class for "help" tooltip elements

        // fonts
        fontTriglivianClass: 'pf-triglivian'                                    // class for "Triglivian" names (e.g. Abyssal systems)
    };

    let stopTimerCache = {};                                                    // cache for stopwatch timer

    let animationTimerCache = {};                                               // cache for table row animation timeout

    let localStorage;                                                           // cache for "localForage" singleton

    /*
     *  ===============================================================================================================
     *   Global jQuery plugins for some common and frequently used functions
     *   ==============================================================================================================
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
                        class: ['fas', iconSize, 'fa-sync', 'fa-spin'].join(' ')
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
     * check multiple element if they are currently visible in viewport
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

            while(element.offsetParent){
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
                visibleElement.push(this);
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
     * destroy popover elements
     * @param recursive
     * @returns {*}
     */
    $.fn.destroyTooltip = function(recursive){
        return this.each(function(){
            let element = $(this);
            let tooltipSelector = '[title]';
            let tooltipElements = element.filter(tooltipSelector);
            if(recursive){
                tooltipElements = tooltipElements.add(element.find(tooltipSelector));
            }

            tooltipElements.each(function(){
                $(this).tooltip('destroy');
            });
        });
    };

    /**
     * add a popup tooltip with character information (created/updated)
     * @param tooltipData
     * @param options
     * @returns {*}
     */
    $.fn.addCharacterInfoTooltip = function(tooltipData, options){
        let data = {};

        if(
            tooltipData.created &&
            tooltipData.updated &&
            tooltipData.created.character &&
            tooltipData.updated.character
        ){
            let createdData = tooltipData.created;
            let updatedData = tooltipData.updated;

            let statusCreatedClass = getStatusInfoForCharacter(createdData.character, 'class');
            let statusUpdatedClass = getStatusInfoForCharacter(updatedData.character, 'class');

            // convert timestamps
            let dateCreated = new Date(createdData.created * 1000);
            let dateUpdated = new Date(updatedData.updated * 1000);
            let dateCreatedUTC = convertDateToUTC(dateCreated);
            let dateUpdatedUTC = convertDateToUTC(dateUpdated);

            data = {
                popoverClass: config.popoverCharacterClass,
                ccpImageServerUrl: Init.url.ccpImageServer,
                created: createdData,
                updated: updatedData,
                createdTime: convertDateToString(dateCreatedUTC),
                updatedTime: convertDateToString(dateUpdatedUTC),
                createdStatusClass: statusCreatedClass,
                updatedStatusClass: statusUpdatedClass
            };

            let defaultOptions = {
                placement: 'top',
                html: true,
                trigger: 'hover',
                container: 'body',
                title: 'Created / Updated',
                delay: {
                    show: 150,
                    hide: 0
                }
            };

            options = $.extend({}, defaultOptions, options);

            return this.each(function(){
                let element = $(this);

                requirejs(['text!templates/tooltip/character_info.html', 'mustache'], (template, Mustache) => {
                    let content = Mustache.render(template, data);

                    element.popover(options);

                    // set new popover content
                    let popover = element.data('bs.popover');
                    popover.options.content = content;

                    if(options.show){
                        element.popover('show');
                    }
                });
            });
        }else{
            return this;
        }
    };

    /**
     * add character switch popover
     * @param userData
     */
    $.fn.initCharacterSwitchPopover = function(userData){
        let elements = $(this);
        let eventNamespace = 'hideCharacterPopup';

        requirejs(['text!templates/tooltip/character_switch.html', 'mustache'], function(template, Mustache){

            let data = {
                popoverClass: config.popoverCharacterClass,
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

            return elements.each(function(){
                let element = $(this);

                // check if popover already exists -> remove it
                if(element.data('bs.popover') !== undefined){
                    element.off('click').popover('destroy');
                }

                element.on('click', function(e){
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

                        button.on('shown.bs.popover', function(e){
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
                            setTimeout(function(){
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
     * destroy popover elements
     * @param recursive
     * @returns {*}
     */
    $.fn.destroyPopover = function(recursive){
        return this.each(function(){
            let element = $(this);
            let popoverSelector = '.' + config.popoverTriggerClass;
            let popoverElements = element.filter(popoverSelector);
            if(recursive){
                popoverElements = popoverElements.add(element.find(popoverSelector));
            }

            popoverElements.each(function(){
                let popoverElement = $(this);
                if(popoverElement.data('bs.popover')){
                    popoverElement.popover('destroy');
                }
            });
        });
    };

    /**
     * set "popover" close action on clicking "somewhere" on the <body>
     * @param eventNamespace
     * @returns {*}
     */
    $.fn.initPopoverClose = function(eventNamespace){
        return this.each(function(){
            $('body').off('click.' + eventNamespace).on('click.' + eventNamespace + ' contextmenu', function(e){
                $('.' + config.popoverTriggerClass).each(function(){
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
     * adds the small-class to a tooltip
     * @returns {*}
     */
    $.fn.setPopoverSmall = function(){
        return this.each(function(){
            let element = $(this);
            let popover = element.data('bs.popover');
            if(popover){
                popover.tip().addClass(config.popoverSmallClass);
            }
        });
    };

    /**
     * display a custom message (info/warning/error) to a container element
     * check: $.fn.showFormMessage() for an other way of showing messages
     * @param config
     */
    $.fn.showMessage = function(config){
        let containerElement = $(this);

        requirejs(['text!templates/form/message.html', 'mustache'], function(template, Mustache){

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

            $('#' + defaultOptions.messageId).velocity('stop').velocity('fadeIn');
        });
    };

    /**
     * highlight jquery elements
     * add/remove css class for keyframe animation
     * @returns {any|JQuery|*}
     */
    $.fn.pulseBackgroundColor = function(status, clear){

        let animationClass = '';
        switch(status){
            case 'added':
                animationClass = config.animationPulseSuccessClass;
                break;
            case 'changed':
                animationClass = config.animationPulseWarningClass;
                break;
            case 'deleted':
                animationClass = config.animationPulseDangerClass;
                break;
        }

        let clearTimer = element => {
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
                element.addClass(animationClass);
                let timer = setTimeout(clearTimer, 1500, element);
                element.data('animationTimer', timer);
                animationTimerCache[timer] = true;
            }

        });
    };

    /**
     * get all mapTabElements (<a> tags)
     * or search for a specific tabElement within mapModule
     * @param mapId
     * @returns {JQuery|*|{}|T}
     */
    $.fn.getMapTabElements = function(mapId){
        let mapModule = $(this);
        let mapTabElements = mapModule.find('#' + config.mapTabBarId).find('a');

        if(mapId){
            // search for a specific tab element
            mapTabElements = mapTabElements.filter(function(i, el){
                return ( $(el).data('mapId') === mapId );
            });
        }

        return mapTabElements;
    };

    /*
     *  ===============================================================================================================
     *   Util functions that are global available for all modules
     *   ==============================================================================================================
     */

    /**
     * get current Pathfinder version number
     * @returns {*|jQuery}
     */
    let getVersion = () => {
        return $('body').data('version');
    };

    /**
     * show current program version information in browser console
     */
    let showVersionInfo = () => Con.showVersionInfo(getVersion());

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
            if(passive !== undefined) return passive;

            return supportedPassiveTypes.indexOf(eventName) === -1 ? false : defaultOptions.passive;
        };

        const getWritableOptions = (options) => {
            const passiveDescriptor = Object.getOwnPropertyDescriptor(options, 'passive');

            return passiveDescriptor &&
            passiveDescriptor.writable !== true &&
            passiveDescriptor.set === undefined ? Object.assign({}, options) : options;
        };

        const prepareSafeListener = (listener, passive) => {
            if(!passive) return listener;
            return function(e){
                e.preventDefault = () => {};
                return listener.call(this, e);
            };
        };

        const overwriteAddEvent = (superMethod) => {
            EventTarget.prototype.addEventListener = function(type, listener, options){ // jshint ignore:line
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
                    get(){
                        supported = true;
                    }
                });

                window.addEventListener('test', null, opts);
                window.removeEventListener('test', null, opts);
            } catch (e){}

            return supported;
        };

        let supportsPassive = eventListenerOptionsSupported ();
        if(supportsPassive){
            const addEvent = EventTarget.prototype.addEventListener; // jshint ignore:line
            overwriteAddEvent(addEvent);
        }
    };

    /**
     * init utility prototype functions
     */
    let initPrototypes = () => {

        /**
         * Array diff
         * [1,2,3,4,5].diff([4,5,6]) => [1,2,3]
         * @param a
         * @returns {*[]}
         */
        Array.prototype.diff = function(a){
            return this.filter(i => !a.includes(i));
        };

        /**
         * Array intersect
         * [1,2,3,4,5].intersect([4,5,6]) => [4,5]
         * @param a
         * @returns {*[]}
         */
        Array.prototype.intersect = function(a){
            return this.filter(i => a.includes(i));
        };

        /**
         * compares two arrays if all elements in a are also in b
         * element order is ignored
         * @param a
         * @returns {boolean}
         */
        Array.prototype.equalValues = function(a){
            return this.diff(a).concat(a.diff(this)).length === 0;
        };

        /**
         * sort array of objects by property name
         * @param p
         * @returns {Array.<T>}
         */
        Array.prototype.sortBy = function(p){
            return this.slice(0).sort((a,b) => {
                return (a[p] > b[p]) ? 1 : (a[p] < b[p]) ? -1 : 0;
            });
        };

        /**
         * get hash from string
         * @returns {number}
         */
        String.prototype.hashCode = function(){
            let hash = 0, i, chr;
            if(this.length === 0) return hash;
            for(i = 0; i < this.length; i++){
                chr   = this.charCodeAt(i);
                hash  = ((hash << 5) - hash) + chr;
                hash |= 0; // Convert to 32bit integer
            }
            return hash;
        };

        initPassiveEvents();
    };

    /**
     *
     * @param element
     */
    let initPageScroll = (element) => {
        $(element).on('click', '.page-scroll', function(){
            // scroll to ancor element
            $($(this).attr('data-anchor')).velocity('scroll', {
                duration: 300,
                easing: 'swing'
            });
        });
    };

    /**
     * convert XEditable Select <option> data into Select2 data format
     * -> "prepend" (empty) options get added, too
     * -> "metaData" can be used to pass custom data per <option>
     * @param editable
     * @returns {Array}
     */
    let convertXEditableOptionsToSelect2 = editable => {
        let data = [];

        if(editable.options){
            // collect all options + "prepend" option from xEditable...
            let optionsPrepend = editable.options.prepend ? editable.options.prepend : [];
            let options =  editable.options.source();

            let optionsAll = [];
            optionsAll.push(...optionsPrepend, ...options);

            /**
             * convert a single option into Select2 format
             * @param option
             * @returns {{id: *, text: *}}
             */
            let convertOption = (option) => {
                let data = {
                    id: option.value,
                    text: option.text
                };

                if(editable.value === option.value){
                    data.selected = true;
                }

                if(option.disabled === true){
                    data.disabled = true;
                }

                // optional "metaData" that belongs to this option
                if(option.hasOwnProperty('metaData')){
                   data.metaData = option.metaData;
                }

                return data;
            };

            // ... transform data into Select2 data format
            data = optionsAll.map(group => {
                if(group.children){
                    group.children = group.children.map(convertOption);
                }else{
                    group = convertOption(group);
                }
                return group;
            });
        }

        return data;
    };

    /**
     * flatten XEditable array for select fields
     * @param dataArray
     * @returns {{}}
     */
    let flattenXEditableSelectArray = dataArray => {
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
     * set default configuration for "Bootbox"
     */
    let initDefaultBootboxConfig = () => {
        bootbox.setDefaults({
            onEscape: true      // enables close dialogs on ESC key
        });
    };

    /**
     * set default configuration for "Select2"
     */
    let initDefaultSelect2Config = () => {
        $.fn.select2.defaults.set('theme', 'pathfinder');

        $.fn.select2.defaults.set('language', {
            searching: params => '&nbsp;<i class="fas fa-sync fa-spin"></i>&nbsp;&nbsp;searching...'
        });

        $.fn.select2.defaults.set('escapeMarkup', markup => {
            // required for HTML in options
            return markup;
        });

        let initScrollbar = (resultsWrapper) => {
            // default 'mousewheel' event set by select2 needs to be disabled
            // in order to make mCustomScrollbar mouseWheel enable works correctly
            $(resultsWrapper).find('ul.select2-results__options').off('mousewheel');

            // preload images that are not visible yet
            let lazyLoadImagesOffset = 240;

            resultsWrapper.mCustomScrollbar({
                mouseWheel: {
                    enable: true,
                    scrollAmount: 'auto',
                    axis: 'y',
                    preventDefault: true
                },
                keyboard: {
                    enable: false,
                    scrollType: 'stepless',
                    scrollAmount: 'auto'
                },
                scrollbarPosition: 'inside',
                autoDraggerLength: true,
                autoHideScrollbar: false,
                advanced: {
                    updateOnContentResize: true
                },
                callbacks: {
                    alwaysTriggerOffsets: false,    // only trigger callback.onTotalScroll() once
                    onTotalScrollOffset: 300,       // trigger callback.onTotalScroll() 100px before end
                    onInit: function(){
                        // disable page scroll -> otherwise page AND customScrollbars will scroll
                        // -> this is because the initPassiveEvents() delegates the mouseWheel events
                        togglePageScroll(false);
                    },
                    onUpdate: function(a){
                        // whenever the scroll content updates -> init lazyLoad for potential images
                        $('.' + config.select2ImageLazyLoadClass).lazyload({
                            container: this,
                            threshold: lazyLoadImagesOffset,
                            event: 'pf:lazyLoad'
                        });
                    },
                    onTotalScroll: function(){
                        // we want to "trigger" Select2´s 'scroll' event
                        // in order to make its "infinite scrolling" function working
                        this.mcs.content.find(':first-child').trigger('scroll');
                    },
                    whileScrolling: function(){

                        // lazy load for images -> reduce number of calculations by % 10
                        if(0 === this.mcs.top % 10){
                            let scroller = $(this).find('.mCSB_container');
                            let scrollerBox = scroller.closest('.mCustomScrollBox');

                            scrollerBox.find('.' + config.select2ImageLazyLoadClass).filter(function(){
                                let $this = $(this);
                                if($this.attr('src') === $this.attr('data-original')) return false;
                                let scrollerTop = scroller.position().top;
                                let scrollerHeight = scrollerBox.height();
                                let offset = $this.closest('div').position();
                                return (offset.top - lazyLoadImagesOffset < scrollerHeight - scrollerTop);
                            }).trigger('pf:lazyLoad');
                        }
                    }
                }
            });
        };

        let getResultsWrapper = (selectElement) => {
            let wrapper = null;
            if($(selectElement).data('select2')){
                let resultsOptions = $(selectElement).data('select2').$results;
                if(resultsOptions.length){
                    let resultsWrapper = resultsOptions.parents('.select2-results');
                    if(resultsWrapper.length){
                        wrapper = resultsWrapper;
                    }
                }
            }
            return wrapper;
        };

        // global opened event
        $(document).on('select2:open', '.' + config.select2Class, function(e){
            let resultsWrapper = getResultsWrapper(this);
            if(resultsWrapper){
                initScrollbar(resultsWrapper);
            }
        });

        // global select2:closing event
        $(document).on('select2:closing', '.' + config.select2Class, function(e){
            let resultsWrapper = getResultsWrapper(this);
            if(resultsWrapper){
                resultsWrapper.mCustomScrollbar('destroy');
            }

            // select2 sets :focus to the select2 <input> field. This is bad!
            // we want to keep the focus where it is (e.g. signature table cell)
            // the only way to prevent this is to remove the element
            // https://stackoverflow.com/questions/17995057/prevent-select2-from-autmatically-focussing-its-search-input-when-dropdown-is-op
            $(this).parents('.editableform').find(this).next().find('.select2-selection').remove();

            // re-enable page scroll -> might be disabled before by mCustomScrollbar onInit() event
            // -> in case there is a custom <select> with scrollable options
            togglePageScroll(true);
        });
    };

    /**
     * set default configuration for "xEditable"
     */
    let initDefaultEditableConfig = () => {
        // use fontAwesome buttons template
        $.fn.editableform.buttons =
            '<div class="btn-group">'+
            '<button type="button" class="btn btn-default btn-sm editable-cancel">'+
            '<i class="fa fa-fw fa-times"></i>'+
            '</button>' +
            '<button type="submit" class="btn btn-success btn-sm editable-submit">'+
            '<i class="fa fa-fw fa-check"></i>'+
            '</button>'+
            '</div>';

        // loading spinner template
        $.fn.editableform.loading =
            '<div class="editableform-loading"><i class="fas fa-lg fa-sync fa-spin"></i></div>';
    };

    /**
     * prevent page from scrolling
     * @param enable
     */
    let togglePageScroll = (enable = true) => {
        $('html').toggleClass(config.noScrollClass, !enable);
    };

    /**
     * request a captcha image
     * @param reason
     * @param callback
     */
    let getCaptchaImage = (reason, callback) => {
        $.ajax({
            type: 'POST',
            url: Init.path.getCaptcha,
            data: {
                reason: reason
            },
            dataType: 'json'
        }).done(function(responseData){
            if(responseData.error.length > 0){
                showNotify({title: 'getCaptchaImage', text: 'Captcha image generation failed', type: 'error'});
            }else{
                callback(responseData.img);
            }
        }).fail(function(jqXHR, status, error){
            let reason = status + ' ' + error;
            showNotify({title: jqXHR.status + ': getCaptchaImage', text: reason, type: 'error'});
        });
    };

    /**
     * get the current main trigger delay for the main trigger functions
     * optional in/decrease the delay
     * @param updateKey
     * @param value
     * @returns {*}
     */
    let getCurrentTriggerDelay = (updateKey, value ) => {

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
    let getServerTime = () => {

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
    let convertTimestampToServerTime = timestamp => {
        let currentTimeZoneOffsetInMinutes = new Date().getTimezoneOffset();
        return new Date( (timestamp + (currentTimeZoneOffsetInMinutes * 60)) * 1000);
    };

    /**
     * get date difference as time parts (days, hours, minutes, seconds)
     * @param date1
     * @param date2
     * @returns {{}}
     */
    let getTimeDiffParts = (date1, date2) => {
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
    let timeStart = timerName => {
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
    let timeStop = timerName => {
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
     * update a character counter field with current value length - maxCharLength
     * @param field
     * @param charCounterElement
     * @param maxCharLength
     */
    let updateCounter = (field, charCounterElement, maxCharLength) => {
        let value = field.val();
        let inputLength = value.length;

        // line breaks are 2 characters!
        let newLines = value.match(/(\r\n|\n|\r)/g);
        let addition = 0;
        if(newLines != null){
            addition = newLines.length;
        }
        inputLength += addition;

        charCounterElement.text(maxCharLength - inputLength);

        if(maxCharLength <= inputLength){
            charCounterElement.toggleClass('txt-color-red', true);
        }else{
            charCounterElement.toggleClass('txt-color-red', false);
        }
    };

    /**
     * trigger main logging event with log information
     * @param logKey
     * @param options
     */
    let log = (logKey, options) => {
        $(window).trigger('pf:log', [logKey, options]);
    };

    /**
     * trigger a notification (on screen or desktop)
     * @param customConfig
     * @param settings
     */
    let showNotify = (customConfig, settings) => {
        requirejs(['notification'], Notification => {
            Notification.showNotify(customConfig, settings);
        });
    };

    /**
     * stop browser tab title "blinking"
     */
    let stopTabBlink = () => {
        requirejs(['notification'], Notification => {
            Notification.stopTabBlink();
        });
    };

    /**
     * get log entry info
     * @param logType
     * @param option
     * @returns {string}
     */
    let getLogInfo = (logType, option) => {
        let logInfo = '';

        if(Init.classes.logTypes.hasOwnProperty(logType)){
            logInfo = Init.classes.logTypes[logType][option];
        }

        return logInfo;
    };

    /**
     * set currentUserData as "global" store var
     * this function should be called whenever userData changed
     * @param userData
     * @returns {boolean} true on success
     */
    let setCurrentUserData = userData => {
        let isSet = false;

        // check if userData is valid
        if(userData && userData.character && userData.characters){
            let changes = compareUserData(getCurrentUserData(), userData);
            // check if there is any change
            if(Object.values(changes).some(val => val)){
                $(document).trigger('pf:changedUserData', [userData, changes]);
            }

            Init.currentUserData = userData;
            isSet = true;
        }else{
            console.error('Could not set userData %o. Missing or malformed obj', userData);
        }

        return isSet;
    };

    /**
     * get currentUserData from "global" variable
     * @returns {*}
     */
    let getCurrentUserData = () => {
        return Init.currentUserData;
    };

    /**
     * get either active characterID or characterId from initial page load
     * @returns {number}
     */
    let getCurrentCharacterId = () => {
        let currentCharacterId = parseInt(getObjVal(getCurrentUserData(), 'character.id')) || 0;

        if(!currentCharacterId){
            // no active character... -> get default characterId from initial page load
            currentCharacterId = parseInt(document.body.getAttribute('data-character-id'));
        }

        return currentCharacterId;
    };

    /**
     * compares two userData objects for changes that are relevant
     * @param oldUserData
     * @param newUserData
     * @returns {{characterShipType: *, charactersIds: boolean, characterLogLocation: *, characterSystemId: *, userId: *, characterId: *}}
     */
    let compareUserData = (oldUserData, newUserData) => {
        let valueChanged = key => getObjVal(oldUserData, key) !== getObjVal(newUserData, key);

        let oldCharactersIds = (getObjVal(oldUserData, 'characters') || []).map(data => data.id).sort();
        let newCharactersIds = (getObjVal(newUserData, 'characters') || []).map(data => data.id).sort();

        let oldHistoryLogStamps = (getObjVal(oldUserData, 'character.logHistory') || []).map(data => data.stamp).sort();
        let newHistoryLogStamps = (getObjVal(newUserData, 'character.logHistory') || []).map(data => data.stamp).sort();

        return {
            userId: valueChanged('id'),
            characterId: valueChanged('character.id'),
            characterLogLocation: valueChanged('character.logLocation'),
            characterSystemId: valueChanged('character.log.system.id'),
            characterShipType: valueChanged('character.log.ship.typeId'),
            charactersIds: oldCharactersIds.toString() !== newCharactersIds.toString(),
            characterLogHistory: oldHistoryLogStamps.toString() !== newHistoryLogStamps.toString()
        };
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
     * show information panel to active users (on bottom)
     * @param show
     */
    let toggleGlobalInfoPanel = (show = true) => {
        let infoPanel = $('#' + config.globalInfoPanelId);
        if( show && !infoPanel.length){
            // info panel not already shown
            requirejs(['text!templates/ui/info_panel.html', 'mustache'], (template, Mustache) => {
                let data = {
                    id: config.globalInfoPanelId
                };
                let content = $(Mustache.render(template, data));
                $('#' + config.footerId).find('.' + config.footerCenterClass).append(content);
            });
        }else if (!show && infoPanel.length){
            infoPanel.remove();
        }
    };

    /**
     * set default jQuery AJAX configuration
     */
    let ajaxSetup = () => {
        $.ajaxSetup({
            beforeSend: function(jqXHR, settings){
                // store request URL for later use (e.g. in error messages)
                jqXHR.url = location.protocol + '//' + location.host + settings.url;

                // Add custom application headers on "same origin" requests only!
                // -> Otherwise a "preflight" request is made, which will "probably" fail
                if(settings.crossDomain === false){
                    // add current character data to ANY XHR request (HTTP HEADER)
                    // -> This helps to identify multiple characters on multiple browser tabs
                    jqXHR.setRequestHeader('pf-character', getCurrentCharacterId());
                }
            },
            complete: function(jqXHR, textStatus){
                // show "maintenance information panel -> if scheduled
                let isMaintenance = parseInt(jqXHR.getResponseHeader('pf-maintenance')) || 0;
                toggleGlobalInfoPanel(isMaintenance);
            }
        });
    };

    /**
     * Request data from Server
     * -> This function should be used (in future) for all Ajax and REST API calls
     * -> works as a "wrapper" for jQueries ajax() method
     * @param action
     * @param entity
     * @param ids
     * @param data
     * @param context
     * @param always
     * @returns {Promise<any>}
     */
    let request = (action, entity, ids = [], data = {}, context = {}, always = null) => {

        let requestExecutor = (resolve, reject) => {
            let payload = {
                action: 'request',
                name: action.toLowerCase() + entity.charAt(0).toUpperCase() + entity.slice(1)
            };

            // build request url --------------------------------------------------------------------------------------
            let url = Init.path.api + '/' + entity;

            let path = '';
            if(isNaN(ids)){
                if(Array.isArray(ids)){
                    path += '/' + ids.join(',');
                }
            }else{
                let id = parseInt(ids, 10);
                path += id ? '/' + id : '';
            }
            url += path;

            let ajaxOptions = {
                type: action,
                url: url,
                dataType: 'json',   // expected response dataType
                context: context
            };

            if(action === 'GET'){
                // data as url params
                ajaxOptions.data = data;
            }else{
                // json data in body
                ajaxOptions.data = JSON.stringify(data);
                ajaxOptions.contentType = 'application/json; charset=utf-8';
            }

            $.ajax(ajaxOptions).done(function(response){
                payload.data = response;
                payload.context = this;
                resolve(payload);
            }).fail(function(jqXHR, status, error){
                payload.data = {
                    jqXHR: jqXHR,
                    status: status,
                    error: error
                };
                payload.context = this;
                reject(payload);
            }).always(function(){
                if(always){
                    always(this);
                }
            });
        };

        return new Promise(requestExecutor);
    };

    /**
     * global ajax error handler -> handles .fail() requests
     * @param payload
     */
    let handleAjaxErrorResponse = (payload) => {
        // handle only request errors
        if(payload.action === 'request'){
            let jqXHR = payload.data.jqXHR;
            let reason = '';

            if(jqXHR.responseJSON){
                // ... valid JSON response
                let response = jqXHR.responseJSON;

                if(response.error && response.error.length > 0){
                    // build error notification reason from errors
                    reason = response.error.map(error => error.message ? error.message : error.status).join('\n');

                    // check if errors might belong to a HTML form -> check "context"
                    if(payload.context.formElement){
                        // show form messages e.g. validation errors
                        payload.context.formElement.showFormMessage(response.error);
                    }
                }
            }else{
                reason = 'Invalid JSON response';
            }
            showNotify({title: jqXHR.status + ': ' + payload.name, text: reason, type: 'error'});
        }
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
    let isXHRAborted = jqXHR => {
        return !jqXHR.getAllResponseHeaders();
    };

    /**
     * trigger global menu action 'event' on dom 'element' with optional 'data'
     * @param element
     * @param action
     * @param data
     */
    let triggerMenuAction = (element, action, data) => {
        if(element){
            if(typeof(action) === 'string' && action.length){
                $(element).trigger('pf:menuAction', [action, data]);
            }else{
                console.error('Invalid action: %o', action);
            }
        }else{
            console.error('Invalid element: %o', element);
        }
    };

    /**
     * get label element for role data
     * @param role
     * @returns {*|jQuery|HTMLElement}
     */
    let getLabelByRole = role => {
        return $('<span>', {
            class: ['label', 'label-' + role.style].join(' '),
            text: role.label
        });
    };

    /**
     * get mapElement from overlay or any child of that
     * @param mapOverlay
     * @returns {jQuery}
     */
    let getMapElementFromOverlay = mapOverlay => {
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
     * get areaId by security string
     * areaId is required as a key for signature names
     * if areaId is 0, no signature data is available for this system
     * @param security
     * @returns {number}
     */
    let getAreaIdBySecurity = security => {
        let areaId = 0;
        switch(security){
            case 'H':
                areaId = 30;
                break;
            case 'L':
                areaId = 31;
                break;
            case '0.0':
                areaId = 32;
                break;
            case 'SH':
                areaId = 13;
                break;
            default:
                // w-space
                for(let i = 1; i <= 18; i++){
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
     * get planet info e.g. class by type e.g. "barren"
     * @param type
     * @param option
     * @returns {string}
     */
    let getPlanetInfo = (type, option = 'class') => {
        let info = '';
        if( Init.classes.planets.hasOwnProperty(type) ){
            info = Init.classes.planets[type][option];
        }
        return info;
    };

    /**
     * get a HTML table with system effect information
     * e.g. for popover
     * @param effects
     * @returns {string}
     */
    let getSystemEffectTable = effects => {
        let table = '';
        if(effects.length > 0){
            table += '<table>';
            for(let effect of effects){
                table += '<tr>';
                table += '<td>';
                table += effect.effect;
                table += '</td>';
                table += '<td class="text-right">';
                table += effect.value;
                table += '</td>';
                table += '</tr>';
            }
            table += '</table>';
        }

        return table;
    };

    /**
     * get a HTML table with planet names
     * e.g. for popover
     * @param planets
     * @returns {string}
     */
    let getSystemPlanetsTable = planets => {
        let table = '';
        if(planets.length > 0){
            let regex = /\(([^)]+)\)/;
            table += '<table>';
            for(let planet of planets){
                let typeName = planet.type.name;
                let typeClass = '';
                let matches = regex.exec(typeName.toLowerCase());
                if(matches && matches[1]){
                    typeName = matches[1].charAt(0).toUpperCase() + matches[1].slice(1);
                    typeClass = getPlanetInfo(matches[1]);
                }

                table += '<tr>';
                table += '<td>';
                table += planet.name;
                table += '</td>';
                table += '<td class="' + typeClass + '">';
                table += '<i class="fas fa-circle"></i>';
                table += '</td>';
                table += '<td class="text-right">';
                table += typeName;
                table += '</td>';
                table += '</tr>';
            }
            table += '</table>';
        }

        return table;
    };

    /**
     * get a HTML table with universe region information
     * e.g. for popover
     * @param regionName
     * @param faction
     * @returns {string}
     */
    let getSystemRegionTable = (regionName, faction) => {
        let table = '<table>';
        table += '<tr>';
        table += '<td>';
        table += 'Region';
        table += '</td>';
        table += '<td class="text-right">';
        table += regionName;
        table += '</td>';
        table += '</tr>';
        table += '<tr>';
        if(faction){
            table += '<td>';
            table += 'Faction';
            table += '</td>';
            table += '<td class="text-right">';
            table += faction.name;
            table += '</td>';
            table += '</tr>';
        }
        table += '</table>';

        return table;
    };

    /**
     * get a HTML table with pilots/ship names
     * @param users
     * @returns {string}
     */
    let getSystemPilotsTable = users => {
        let table = '';
        if(users.length > 0){
            let getRow = (statusClass, userName, shipName, shipTypeName, mass) => {
                let row = '<tr>';
                row += '<td class="text-right">';
                row += '<small>';
                row +=  statusClass !== null ? '<i class="fas fa-circle ' + config.userStatusClass + ' ' + statusClass + '">' : '';
                row += '</small>';
                row += '</td>';
                row += '<td>';
                row += userName;
                row += '</td>';
                row += '<td>';
                row += shipName;
                row += '</td>';
                row += '<td class="text-right txt-color txt-color-orangeLight">';
                row += shipTypeName;
                row += '</td>';
                row += '<td class="text-right">';
                row += mass;
                row += '</td>';
                row += '</tr>';
                return row;
            };

            let massAll = 0;
            table += '<table>';
            for(let user of users){
                massAll += parseInt(user.log.ship.mass);
                let statusClass = getStatusInfoForCharacter(user, 'class');
                let mass = formatMassValue(user.log.ship.mass);
                table += getRow(statusClass, user.name, user.log.ship.name, user.log.ship.typeName, mass);
            }
            table += getRow(null, '', '', '', formatMassValue(massAll));
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
    let getSystemsInfoTable = data => {
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
    let getSecurityClassForSystem = sec => {
        let secClass = '';
        if(sec === 'C13'){
            sec = 'SH';
        }
        if( Init.classes.systemSecurity.hasOwnProperty(sec) ){
            secClass = Init.classes.systemSecurity[sec]['class'];
        }
        return secClass;
    };

    /**
     * get a css class for the trueSec level of a system
     * @param trueSec
     * @returns {string}
     */
    let getTrueSecClassForSystem = (trueSec) => {
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
    let getStatusInfoForSystem = (status, option) => {
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
     * @returns {Array}
     */
    let getSignatureGroupOptions = option => {
        let options = [];
        for(let [key, data] of Object.entries(Init.signatureGroups)){
            options.push({
                value: parseInt(key),
                text: data[option]
            });
        }
        return options;
    };

    /**
     * get Signature names out of global
     * @param systemTypeId
     * @param areaId
     * @param sigGroupId
     * @returns {{}}
     */
    let getAllSignatureNames = (systemTypeId, areaId, sigGroupId) => {
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
     * get array key that points to map data catching mapId
     * @param data
     * @param mapId
     * @returns {boolean}
     */
    let getDataIndexByMapId = (data, mapId) => {
        let index = false;
        if(Array.isArray(data) && mapId === parseInt(mapId, 10)){
            for(let i = 0; i < data.length; i++){
                if(data[i].config.id === mapId){
                    index = i;
                    break;
                }
            }
        }
        return index;
    };

    // CurrentMapUserData =============================================================================================

    /**
     * set currentMapUserData as "global" variable (count of active pilots)
     * this function should be called continuously after data change
     * to keep the data always up2data
     * @param mapUserData
     */
    let setCurrentMapUserData = mapUserData => {
        Init.currentMapUserData = mapUserData;
        return getCurrentMapUserData();
    };

    /**
     * get currentMapUserData from "global" variable for specific map or all maps
     * @param mapId
     * @returns {boolean}
     */
    let getCurrentMapUserData = mapId => {
        let currentMapUserData = false;

        if(Init.currentMapUserData){
            if(mapId === parseInt(mapId, 10)){

                // search for a specific map
                for(let i = 0; i < Init.currentMapUserData.length; i++){
                    if(
                        Init.currentMapUserData[i].config &&
                        Init.currentMapUserData[i].config.id === mapId
                    ){
                        currentMapUserData = Init.currentMapUserData[i];
                        break;
                    }
                }
            }else{
                // get data for all maps
                currentMapUserData = Init.currentMapUserData;
            }
        }

        if(currentMapUserData !== false){
            // return a fresh (deep) copy of that, in case of further modifications
            currentMapUserData = $.extend(true, {}, currentMapUserData);
        }

        return currentMapUserData;
    };

    /**
     * get mapDataUser array index by mapId
     * @param mapId
     * @returns {boolean|int}
     */
    let getCurrentMapUserDataIndex = mapId => getDataIndexByMapId(Init.currentMapUserData, mapId);

    /**
     * update cached mapUserData for a single map
     * @param mapUserData
     */
    let updateCurrentMapUserData = mapUserData => {
        let mapUserDataIndex = getCurrentMapUserDataIndex( mapUserData.config.id );

        if( !Array.isArray(Init.currentMapUserData) ){
            Init.currentMapUserData = [];
        }

        if(mapUserDataIndex !== false){
            Init.currentMapUserData[mapUserDataIndex] = mapUserData;
        }else{
            // new map data
            Init.currentMapUserData.push(mapUserData);
        }
    };

    // CurrentMapData =================================================================================================

    /**
     * set currentMapData as "global" variable
     * this function should be called continuously after data change
     * to keep the data always up2data
     * @param mapData
     */
    let setCurrentMapData = mapData => {
        Init.currentMapData = mapData;

        return getCurrentMapData();
    };

    /**
     * get currentMapData from "global" variable for a specific map or all maps
     * @param mapId
     * @returns {boolean}
     */
    let getCurrentMapData = mapId => {
        let currentMapData = false;

        if(Init.currentMapData){
            if(mapId === parseInt(mapId, 10)){
                currentMapData = Init.currentMapData.find(mapData => mapData.config.id === mapId);
            }else{
                // get data for all maps
                currentMapData = Init.currentMapData;
            }
        }

        return currentMapData;
    };

    /**
     * get mapData array index by mapId
     * @param mapId
     * @returns {boolean|int}
     */
    let getCurrentMapDataIndex = mapId => {
        return getDataIndexByMapId(Init.currentMapData, mapId);
    };

    /**
     * update cached mapData for a single map
     * @param mapData
     */
    let updateCurrentMapData = mapData => {
        let mapDataIndex = getCurrentMapDataIndex(mapData.config.id);

        if(mapDataIndex !== false){
            Init.currentMapData[mapDataIndex].config = mapData.config;
            Init.currentMapData[mapDataIndex].data = mapData.data;
        }else{
            // new map data
            Init.currentMapData.push(mapData);
        }
    };

    /**
     * @param path
     * @param value
     * @returns {boolean}
     */
    let filterCurrentMapData = (path, value) => {
        let currentMapData = getCurrentMapData();
        if(currentMapData){
            currentMapData = currentMapData.filter(mapData => {
                return getObjVal(mapData, path) === value;
            });
        }
        return currentMapData;
    };

    /**
     * delete map data by mapId from currentMapData
     * @param mapId
     */
    let deleteCurrentMapData = mapId => {
        Init.currentMapData = Init.currentMapData.filter(mapData => {
            return (mapData.config.id !== mapId);
        });
    };

    /**
     * get the current log data for the current user character
     * @returns {boolean}
     */
    let getCurrentCharacterLog = () => getObjVal(getCurrentUserData(), 'character.log') || false;

    /**
     * get information for the current mail user
     * @param option
     * @returns {boolean}
     */
    let getCurrentUserInfo = option => {
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
     * get userData (pilots) from systemId
     * @param userData
     * @param systemId
     * @returns {*}
     */
    let getCharacterDataBySystemId = (userData, systemId) => {
        if(userData && userData.length){
            for(let i = 0; i < userData.length; i++){
                if(userData[i].id === systemId){
                    return userData[i].user;
                }
            }
        }
        return [];
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

        let filterFinalCharData = function(tmpFinalCharData){
            return this.id !== tmpFinalCharData.id;
        };

        let characterData = getCharacterDataBySystemId(userData, nearBySystems.systemData.systemId);

        if(characterData.length){
            // filter (remove) characterData for "already" added chars
            characterData = characterData.filter(function(tmpCharacterData, index, allData){
                let keepData = true;

                for(let tmpJump in data){
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
        for(let prop in nearBySystems.tree){
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
    let setDestination = (systemData, type) => {
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
                for(let j = 0; j < responseData.systemData.length; j++){
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

        }).fail(function(jqXHR, status, error){
            let reason = status + ' ' + error;
            showNotify({title: jqXHR.status + ': ' + this.description, text: reason, type: 'warning'});
        });
    };


    /**
     * write clipboard text
     * @param text
     * @returns {Promise<any>}
     */
    let copyToClipboard = (text) => {

        let copyToClipboardExecutor = (resolve, reject) => {
            let payload = {
                action: 'copyToClipboard',
                data: false
            };

            if(navigator.clipboard){
                // get current permission status
                navigator.permissions.query({
                    name: 'clipboard-write'
                }).then(permissionStatus => {
                    // will be 'granted', 'denied' or 'prompt'
                    if(
                        permissionStatus.state === 'granted' ||
                        permissionStatus.state === 'prompt'
                    ){
                        navigator.clipboard.writeText(text)
                            .then(() => {
                                payload.data = true;
                                resolve(payload);                        })
                            .catch(err => {
                                let errorMsg = 'Failed to write clipboard content';
                                console.error(errorMsg, err);
                                showNotify({title: 'Clipboard API', text: errorMsg, type: 'error'});
                                resolve(payload);
                            });
                    }else{
                        showNotify({title: 'Clipboard API', text: 'You denied write access', type: 'warning'});
                        resolve(payload);
                    }
                });
            }else{
                console.warn('Clipboard API not supported by your browser');
                resolve(payload);
            }
        };

        return new Promise(copyToClipboardExecutor);
    };

    /**
     * read clipboard text
     * @returns {Promise<any>}
     */
    let readFromClipboard = () => {

        let readFromClipboardExecutor = (resolve, reject) => {
            let payload = {
                action: 'readFromClipboard',
                data: false
            };

            if(navigator.clipboard){
                // get current permission status
                navigator.permissions.query({
                    name: 'clipboard-read'
                }).then(permissionStatus => {
                    // will be 'granted', 'denied' or 'prompt'
                    if(
                        permissionStatus.state === 'granted' ||
                        permissionStatus.state === 'prompt'
                    ){
                        navigator.clipboard.readText()
                            .then(text => {
                                payload.data = text;
                                resolve(payload);                        })
                            .catch(err => {
                                let errorMsg = 'Failed to read clipboard content';
                                console.error(errorMsg, err);
                                showNotify({title: 'Clipboard API', text: errorMsg, type: 'error'});
                                resolve(payload);
                            });
                    }else{
                        showNotify({title: 'Clipboard API', text: 'You denied read access', type: 'warning'});
                        resolve(payload);
                    }
                });
            }else{
                console.warn('Clipboard API not supported by your browser');
                resolve(payload);
            }
        };

        return new Promise(readFromClipboardExecutor);
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
    let getCurrentLocationData = () => {
        let breadcrumbElement = $('#' + config.headUserLocationId + '>li:last-of-type');
        return {
            id: parseInt(breadcrumbElement.attr('data-systemId')) || 0,
            name: breadcrumbElement.attr('data-systemName') || false
        };
    };

    /**
     * get all "open" dialog elements
     * @returns {*|jQuery}
     */
    let getOpenDialogs = () => {
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
            }).fail(function(jqXHR, status, error){
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
     * check an element for attached jQuery event by name
     * -> e.g. eventName = 'click.myNamespace'
     * @param element
     * @param eventName
     * @returns {boolean}
     */
    let hasEvent = (element, eventName) => {
        let exists = false;
        let allEvents = $._data(element[0], 'events');
        if(allEvents){
            let parts = eventName.split('.');
            let name =  parts[0];
            let events = allEvents[name];
            if(events){
                let namespace = parts.length === 2 ? parts[1] : false;
                if(namespace){
                    // search events by namespace
                    for(let event of events){
                        if(event.namespace === namespace){
                            exists = true;
                            break;
                        }
                    }
                }else{
                    // at least ONE event of the given name found
                    exists = true;
                }
            }
        }
        return exists;
    };

    /**
     * wrapper function for onClick() || onDblClick() events in order to distinguish between this two types of events
     * @param element
     * @param singleClickCallback
     * @param doubleClickCallback
     * @param timeout
     */
    let singleDoubleClick = (element, singleClickCallback, doubleClickCallback, timeout) => {
        let eventName = 'mouseup.singleDouble';
        if(!hasEvent(element, eventName)){
            let clicks = 0;
            // prevent default behaviour (e.g. open <a>-tag link)
            element.off('click').on('click', function(e){
                e.preventDefault();
            });

            element.off(eventName).on(eventName, function(e){
                clicks++;
                if(clicks === 1){
                    setTimeout(element => {
                        if(clicks === 1){
                            singleClickCallback.call(element, e);
                        }else{
                            doubleClickCallback.call(element, e);
                        }
                        clicks = 0;
                    }, timeout || Init.timer.DBL_CLICK, this);
                }
            });
        }
    };

    /**
     * get dataTable id
     * @param prefix
     * @param mapId
     * @param systemId
     * @param tableType
     * @returns {string}
     */
    let getTableId = (prefix, mapId, systemId, tableType) => prefix + [mapId, systemId, tableType].join('-');

    /**
     * get a dataTableApi instance from global cache
     * @param prefix
     * @param mapId
     * @param systemId
     * @param tableType
     * @returns {*}
     */
    let getDataTableInstance = (prefix, mapId, systemId, tableType) => {
        let instance = null;
        let table = $.fn.dataTable.tables({ visible: false, api: true }).table('#' + getTableId(prefix, mapId, systemId, tableType));
        if(table.node()){
            instance = table;
        }
        return instance;
    };

    /**
     * HTML encode string
     * @param value
     * @returns {jQuery}
     */
    let htmlEncode = value => $('<div>').text(value).html();

    /**
     * HTML decode string
     * @param value
     * @returns {jQuery}
     */
    let htmlDecode = value => $('<div>').html(value).text();

    /**
     * checks if html is valid
     * -> see https://stackoverflow.com/a/15458968/4329969
     * @param html
     * @returns {boolean}
     */
    let isValidHtml = html => {
        let doc = new DOMParser().parseFromString(html, 'text/html');
        return Array.from(doc.body.childNodes).some(node => node.nodeType === 1);
    };

    /**
     * checks if a given object is a DOM element
     * @param obj
     * @returns {boolean}
     */
    let isDomElement = obj => !!(obj && obj.nodeType === 1);

    /**
     * converts array of objects into object with properties
     * @param array
     * @param keyField
     * @returns {*}
     */
    let arrayToObject = (array, keyField = 'id') =>
        array.reduce((obj, item) => {
            obj[item[keyField]] = item;
            return obj;
        }, {});

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
    let redirect = (url, params = []) => {
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
        }).fail(function(jqXHR, status, error){
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

        for(let i = 0; i <ca.length; i++){
            let c = ca[i];
            while(c.charAt(0) === ' '){
                c = c.substring(1);
            }

            if(c.indexOf(name) === 0){
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
        initDefaultSelect2Config: initDefaultSelect2Config,
        initDefaultEditableConfig: initDefaultEditableConfig,
        getCurrentTriggerDelay: getCurrentTriggerDelay,
        getServerTime: getServerTime,
        convertTimestampToServerTime: convertTimestampToServerTime,
        getTimeDiffParts: getTimeDiffParts,
        timeStart: timeStart,
        timeStop: timeStop,
        updateCounter: updateCounter,
        log: log,
        showNotify: showNotify,
        stopTabBlink: stopTabBlink,
        getLogInfo: getLogInfo,
        ajaxSetup: ajaxSetup,
        request: request,
        handleAjaxErrorResponse: handleAjaxErrorResponse,
        setSyncStatus: setSyncStatus,
        getSyncType: getSyncType,
        isXHRAborted: isXHRAborted,
        triggerMenuAction: triggerMenuAction,
        getLabelByRole: getLabelByRole,
        getMapElementFromOverlay: getMapElementFromOverlay,
        getMapModule: getMapModule,
        getSystemEffectData: getSystemEffectData,
        getSystemEffectTable: getSystemEffectTable,
        getSystemPlanetsTable: getSystemPlanetsTable,
        getSystemRegionTable: getSystemRegionTable,
        getSystemPilotsTable: getSystemPilotsTable,
        getSystemsInfoTable: getSystemsInfoTable,
        getStatusInfoForCharacter: getStatusInfoForCharacter,
        getSecurityClassForSystem: getSecurityClassForSystem,
        getTrueSecClassForSystem: getTrueSecClassForSystem,
        getStatusInfoForSystem: getStatusInfoForSystem,
        getSignatureGroupOptions: getSignatureGroupOptions,
        getAllSignatureNames: getAllSignatureNames,
        getAreaIdBySecurity: getAreaIdBySecurity,
        setCurrentMapUserData: setCurrentMapUserData,
        getCurrentMapUserData: getCurrentMapUserData,
        updateCurrentMapUserData: updateCurrentMapUserData,
        setCurrentMapData: setCurrentMapData,
        getCurrentMapData: getCurrentMapData,
        filterCurrentMapData: filterCurrentMapData,
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
        initPageScroll: initPageScroll,
        convertXEditableOptionsToSelect2: convertXEditableOptionsToSelect2,
        flattenXEditableSelectArray: flattenXEditableSelectArray,
        getCharacterDataBySystemId: getCharacterDataBySystemId,
        getNearBySystemData: getNearBySystemData,
        getNearByCharacterData: getNearByCharacterData,
        setDestination: setDestination,
        copyToClipboard: copyToClipboard,
        readFromClipboard: readFromClipboard,
        convertDateToUTC: convertDateToUTC,
        convertDateToString: convertDateToString,
        getOpenDialogs: getOpenDialogs,
        openIngameWindow: openIngameWindow,
        formatPrice: formatPrice,
        formatMassValue: formatMassValue,
        getLocalStorage: getLocalStorage,
        clearSessionStorage: clearSessionStorage,
        getBrowserTabId: getBrowserTabId,
        singleDoubleClick: singleDoubleClick,
        getTableId: getTableId,
        getDataTableInstance: getDataTableInstance,
        htmlEncode: htmlEncode,
        htmlDecode: htmlDecode,
        isValidHtml: isValidHtml,
        isDomElement: isDomElement,
        arrayToObject: arrayToObject,
        getObjVal: getObjVal,
        redirect: redirect,
        logout: logout,
        setCookie: setCookie,
        getCookie: getCookie
    };
});