/**
 *  Util
 */
define([
    'jquery',
    'app/init',
    'app/lib/prototypes',
    'app/lib/console',
    'app/lib/cache',
    'app/lib/localStore',
    'app/lib/resize',
    'conf/system_effect',
    'conf/signature_type',
    'lazyload',
    'bootbox',
    'velocity',
    'velocityUI',
    'customScrollbar',
    'validator',
    'easyPieChart',
    'hoverIntent',
    'bootstrapConfirmation',
    'bootstrapToggle',
    'select2'
], (
    $,
    Init,
    Proto,
    Con,
    Cache,
    LocalStoreManager,
    ResizeManager,
    SystemEffect,
    SignatureType,
    LazyLoad,
    bootbox
) => {

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
        menuButtonRegionId: 'pf-menu-button-region',                            // id for menu button "region" info on systems
        menuButtonCompactId: 'pf-menu-button-compact',                          // id for menu button "compact" UI map view
        menuButtonEndpointId: 'pf-menu-button-endpoint',                        // id for menu button "endpoint" overlays
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
        mapTabBarIdPrefix: 'pf-map-tab-bar-',                                   // id prefix map tab bar lists <ul>
        mapTabBarClass: 'pf-map-tab-bar',                                       // class for map tab bar lists <ul>
        mapTabContentClass: 'pf-map-tab-content',                               // class for map tab content
        mapTabContentAreaClass: 'pf-map-tab-content-area',                      // class for map tab content grid areas
        mapTabContentAreaAliases: ['map', 'a', 'b', 'c'],
        mapClass: 'pf-map' ,                                                    // class for all maps

        // util
        userStatusClass: 'pf-user-status',                                      // class for player status
        dynamicAreaClass: 'pf-dynamic-area',                                    // class for "dynamic" areas

        // select2
        select2Class: 'pf-select2',                                             // class for all "Select2" <select> elements
        select2ImageLazyLoadClass: 'pf-select2-image-lazyLoad',

        // animation
        animationPulseClassPrefix: 'pf-animation-pulse-',                       // class prefix for "pulse" background animation

        // popover
        popoverClass: 'pf-popover',                                             // class for "popover" - custom modifier
        popoverTriggerClass: 'pf-popover-trigger',                              // class for "popover" trigger elements
        popoverSmallClass: 'popover-small',                                     // class for small "popover"
        popoverCharacterClass: 'pf-popover-character',                          // class for character "popover"
        popoverListIconClass: 'pf-popover-list-icon',                           // class for list "icon"s in "

        // Summernote
        summernoteClass: 'pf-summernote',                                       // class for Summernote "WYSIWYG" elements

        // help
        helpDefaultClass: 'pf-help-default',                                    // class for "help" tooltip elements
        helpClass: 'pf-help',                                                   // class for "help" tooltip elements

        // fonts
        fontTriglivianClass: 'pf-triglivian',                                   // class for "Triglivian" names (e.g. Abyssal systems)

        // LocalStore
        localStoreNames: ['default', 'character', 'map', 'module']              // Allowed name identifiers for DB names
    };

    let currentSystemDataCache = new Cache({
        name:       'currentSystemData',
        ttl:        -1,
        maxSize:    20
    });

    // browser tab blink
    let initialPageTitle = document.title;                                      // initial page title (cached)
    let blinkTimer;                                                             // global blink timeout cache

    let stopTimerCache = {};                                                    // cache for stopwatch timer
    let animationTimerCache = {};                                               // cache for table row animation timeout

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
            let iconSize = getObjVal(options, 'icon.size') || 'fa-lg';

            // disable all events
            //loadingElement.css('pointer-events', 'none');

            let overlay = $('<div>', {
                class: config.ajaxOverlayClass
            }).css('pointer-events', 'none').append(
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
     * removes loading overlay(s)
     */
    $.fn.hideLoadingAnimation = function(){
        return this.each(function(){
            let parentEl = $(this);
            let overlays = parentEl.find('.' + config.ajaxOverlayClass);
            if(overlays.length){
                overlays.css('pointer-events', 'auto');
                // important: "stop" is required to stop "show" animation
                // -> otherwise "complete" callback is not fired!
                overlays.velocity('stop').velocity('reverse', {
                    complete: function(){
                        this.forEach(overlay => {
                            overlay.remove();
                        });
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

        for (let error of errors) {
            let message = `${error.text}`;
            if(error.type === 'error'){
                message = `${error.status} - ${message}`;
                errorMessage.push(message);

                // mark form field as invalid in case of a validation error
                if(
                    error.field &&
                    error.field.length > 0
                ){
                    let formField = formElement.find('[name="' + error.field + '"]');
                    let formGroup = formField.parents('.form-group').removeClass('has-success').addClass('has-error');
                    let formHelp = formGroup.find('.help-block').text(error.text);
                }

            }else if(error.type === 'warning'){
                warningMessage.push(message);
            }else if(error.type === 'info'){
                infoMessage.push(message);
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
     * init the map-update-counter as "easy-pie-chart"
     */
    $.fn.initMapUpdateCounter = function(){
        let counterChart = $(this);

        let gradient = [
            [0, [217,83,79]],
            [10, [217,83,79]],
            [50, [240, 173, 78]],
            [75, [79,158,79]],
            [100, [86, 138, 137]]
        ];

        let gradientWidth = 500;

        let getColor = percent => {
            percent = percent || 1;
            let colorRangeEnd = gradient.findIndex(value => percent <= value[0]);
            let colorRange = [colorRangeEnd - 1, colorRangeEnd];

            //Get the two closest colors
            let colorFirst = gradient[colorRange[0]][1];
            let colorSecond = gradient[colorRange[1]][1];

            //Calculate ratio between the two closest colors
            let colorFirstX = gradientWidth * (gradient[colorRange[0]][0] / 100);
            let colorSecondX = gradientWidth * (gradient[colorRange[1]][0] / 100) - colorFirstX;
            let weightX = gradientWidth * (percent / 100) - colorFirstX;
            let weight = weightX / colorSecondX;

            //Get the color with pickHex(thx, less.js's mix function!)
            let result = pickHex(colorSecond, colorFirst, weight);
            return `rgb(${result.join()})`;
        };

        let pickHex = (color1, color2, weight) => {
            let w1 = weight;
            let w2 = 1 - w1;
            return [Math.round(color1[0] * w1 + color2[0] * w2),
                Math.round(color1[1] * w1 + color2[1] * w2),
                Math.round(color1[2] * w1 + color2[2] * w2)];
        };

        counterChart.easyPieChart({
            barColor: percent => getColor(Number(Number(percent).toFixed(1))),
            trackColor: '#2b2b2b',
            size: 30,
            scaleColor: false,
            lineWidth: 2,
            animate: {
                duration: 550,
                enabled: true
            },
            easing: function (x, t, b, c, d) { // easeInOutSine - jQuery Easing
                return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
            }
        });
    };

    /**
     * init tooltips on an element
     * @param  {object} options
     * @returns {*}
     */
    $.fn.initTooltips = function(options= {}){
        let containerSelectors = ['.modal', '.popover'];
        let getContainer = (el, selectors = containerSelectors) => {
            for(let i = 0; i < selectors.length; i++){
                let checkContainer = el.closest(containerSelectors[i]);
                if(checkContainer){
                    return checkContainer;
                }
            }
        };

        return this.each(function(){
            let tooltipElements = $(this).find('[title]');
            if(tooltipElements.length){
                let tooltipOptions = Object.assign({}, options);
                if(!options.hasOwnProperty('container')){
                    // check if current this is a modal/(child of modal) element
                    let container = getContainer(this);
                    if(container){
                        tooltipOptions.container = container;
                    }
                }
                tooltipElements.tooltip('destroy').tooltip(tooltipOptions);
            }
        });
    };

    /**
     * destroy tooltips from element
     * @param recursive
     * @returns {*}
     */
    $.fn.destroyTooltips = function(recursive){
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
     */
    $.fn.initCharacterSwitchPopover = function(){
        let elements = $(this);
        let userData = getCurrentUserData();
        let eventNamespace = 'hideCharacterPopup';

        requirejs(['text!templates/tooltip/character_switch.html', 'mustache'], function(template, Mustache){

            let data = {
                popoverClass: config.popoverCharacterClass,
                browserTabId: getBrowserTabId(),
                routes:  Init.routes,
                userData: userData,
                otherCharacters: () => {
                    return userData.characters.filter((character, i) => {
                        let characterImage = eveImageUrl('characters', character.id);
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
                            content: content,
                            animation: false
                        }).data('bs.popover').tip().addClass(config.popoverClass);

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
                messageId: getRandomString('pf-alert-'),
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
     * @param status
     * @param keepVisible
     * @param clear
     * @returns {void|*|undefined}
     */
    $.fn.pulseBackgroundColor = function(status, keepVisible = false, clear = false){
        let animationClass = config.animationPulseClassPrefix;
        switch(status){
            case 'added': animationClass += 'success'; break;
            case 'changed': animationClass += 'warning'; break;
            case 'deleted': animationClass += 'danger'; break;
            default: console.warn('Invalid status: %s', status);
        }

        // if keepVisible -> background color animation class will not be deleted
        if(keepVisible){
            animationClass += '-keep';
        }

        let clearTimer = element => {
            element.removeClass(animationClass);
            let currentTimer = element.data('animationTimer');

            if(animationTimerCache.hasOwnProperty(currentTimer)){
                clearTimeout( currentTimer );
                delete animationTimerCache[currentTimer];
                element.removeData('animationTimer');
            }
        };

        return this.each(function(){
            let element = $(this);

            if(element.hasClass(animationClass)){
                // clear timer -> set new timer
                clearTimer(element);
            }

            if(!clear){
                element.addClass(animationClass);
                // remove class after animation finish, if not 'keepVisible'
                if(!keepVisible){
                    let timer = setTimeout(clearTimer, 1500, element);
                    element.data('animationTimer', timer);
                    animationTimerCache[timer] = true;
                }
            }
        });
    };

    /*
     *  ===============================================================================================================
     *   Util functions that are global available for all modules
     *   ==============================================================================================================
     */

    /**
     * get current Pathfinder version number
     * @returns {string}
     */
    let getVersion = () => document.body.dataset.version;

    /**
     * show current program version information in browser console
     */
    let showVersionInfo = () => Con.showVersionInfo(getVersion());

    /**
     * get image root dir
     * @returns {string}
     */
    let imgRoot = () => `/public/img/${getVersion()}/`;

    /**
     * get CCP image URLs for
     * @param resourceType 'alliances'|'corporations'|'characters'|'types'
     * @param resourceId
     * @param size
     * @param resourceVariant
     * @returns {boolean}
     */
    let eveImageUrl = (resourceType, resourceId, size = 32, resourceVariant = undefined) => {
        let url = false;
        if(
            typeof resourceType === 'string' &&
            typeof resourceId === 'number' &&
            typeof size === 'number'
        ){
            resourceType = resourceType.toLowerCase();

            if(!resourceVariant){
                switch(resourceType){
                    // faction icons are on 'corporations' endpoint.. CCP fail?!
                    case 'factions': resourceType = 'corporations'; // jshint ignore:line
                    case 'alliances':
                    case 'corporations': resourceVariant = 'logo'; break;
                    case 'characters': resourceVariant = 'portrait'; break;
                    case 'types': resourceVariant = 'icon'; break;
                    default:
                        console.warn('Invalid resourceType: %o for in eveImageUrl()', resourceType);
                }
            }

            url = [Init.url.ccpImageServer, resourceType, resourceId, resourceVariant].join('/');

            let params = {size: size};
            let searchParams = new URLSearchParams(params); // jshint ignore:line
            url += '?' + searchParams.toString();
        }
        return url;
    };

    /**
     * convert unicode to string
     * @param text
     * @returns {String}
     */
    let unicodeToString = (text) => {
      let result = text.replace(/\\u[\dA-F]{4}/gi,
        function (match) {
          return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
      });
      return result.substring(0, 2) == "u'" ? result.substring(2, result.length - 1) : result;
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
     * filter elements from elements array that are not within viewport
     * @param elements
     * @returns {[]}
     */
    let findInViewport = elements => {
        let visibleElement = [];

        for(let element of elements){
            if(!(element instanceof HTMLElement)){
                console.warn('findInViewport() expects Array() of %O; %o given', HTMLElement, element);
                continue;
            }

            let top = element.offsetTop;
            let left = element.offsetLeft;
            let width = element.offsetWidth;
            let height = element.offsetHeight;
            let origElement = element;

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
                visibleElement.push(origElement);
            }
        }

        return visibleElement;
    };

    /**
     * "Scroll Spy" implementation
     * @see https://github.com/cferdinandi/gumshoe/blob/master/src/js/gumshoe/gumshoe.js
     * @param navElement
     * @param scrollElement
     * @param settings
     */
    let initScrollSpy = (navElement, scrollElement = document, settings = {}) => {
        settings = Object.assign({}, {
            clsOnScroll: 'on-scroll'
        }, settings);
        let requestAnimationId, scrollId, current;

        if(!navElement){
            console.warn('initScrollSpy() failed. navElement undefined');
            return;
        }

        let scrollDomNode = () => scrollElement === document ? document.body : scrollElement;

        let contents = Array.from(navElement.querySelectorAll('.page-scroll')).map(link => ({
            link: link,
            content: document.getElementById(link.getAttribute('data-target'))
        }));

        let getOffset = settings => {
            if(typeof settings.offset === 'function'){
                return parseFloat(settings.offset());
            }
            // Otherwise, return it as-is
            return parseFloat(settings.offset);
        };

        let getDocumentHeight = () => {
            return Math.max(
                document.body.scrollHeight, document.documentElement.scrollHeight,
                document.body.offsetHeight, document.documentElement.offsetHeight,
                document.body.clientHeight, document.documentElement.clientHeight
            );
        };

        let activate = item => {
            if(!item) return;

            // Get the parent list item
            let li = item.link.closest('li');
            if(!li) return;

            // Add the active class to li
            li.classList.add('active');
        };

        let deactivate = item => {
            if(!item) return;

            // remove focus
            if(document.activeElement === item.link){
                document.activeElement.blur();
            }

            // Get the parent list item
            let li = item.link.closest('li');
            if(!li) return;

            // Remove the active class from li
            li.classList.remove('active');
        };

        let isInView = (elem, settings, bottom) => {
            let bounds = elem.getBoundingClientRect();
            let offset = getOffset(settings);
            if(bottom){
                return parseInt(bounds.bottom, 10) < (window.innerHeight || document.documentElement.clientHeight);
            }
            return parseInt(bounds.top, 10) <= offset;
        };

        let isAtBottom = () => {
            return window.innerHeight + window.pageYOffset >= getDocumentHeight();
        };

        let useLastItem = (item, settings) => {
            return !!(isAtBottom() && isInView(item.content, settings, true));
        };

        let getActive = (contents, settings) => {
            let last = contents[contents.length - 1];
            if(useLastItem(last, settings)) return last;
            for(let i = contents.length - 1; i >= 0; i--){
                if(isInView(contents[i].content, settings)) return contents[i];
            }
        };

        let detect = () => {
            let active = getActive(contents, settings);

            // if there's no active content, deactivate and bail
            if(!active){
                if(current){
                    deactivate(current);
                    current = null;
                }
                return;
            }

            // If the active content is the one currently active, do nothing
            if (current && active.content === current.content) return;

            // Deactivate the current content and activate the new content
            deactivate(current);
            activate(active);

            // Update the currently active content
            current = active;
        };

        let onScrollClassHandler = () => {
            if(scrollId){
                clearTimeout(scrollId);
            }
            scrollDomNode().classList.add(settings.clsOnScroll);
            scrollId = setTimeout(() => scrollDomNode().classList.remove(settings.clsOnScroll), 80);
        };

        let scrollHandler = () => {
            // If there's a timer, cancel it
            if(requestAnimationId){
                window.cancelAnimationFrame(requestAnimationId);
            }
            requestAnimationId = window.requestAnimationFrame(() => {
                detect();
                // apply 'onScroll' class -> can be used by other elements
                onScrollClassHandler();
            });
        };

        // Find the currently active content
        detect();

        scrollElement.addEventListener('scroll', scrollHandler, {passive: true});

        // set click observer for links
        let clickHandler = function(e){
            e.preventDefault();
            this.content.scrollIntoView({behavior: 'smooth'});
        };

        for(let item of contents){
            $(item.link).on('click', clickHandler.bind(item));
        }
    };

    /**
     * get template for Bootstrap "Confirmation" popover plugin
     * -> if HTML 'content' not set, we expect the default template
     *    https://www.npmjs.com/package/bs-confirmation
     * -> options.size for "small" popover layout
     * -> options.noTitle for hide title element
     * @param content
     * @param options
     * @returns {string}
     */
    let getConfirmationTemplate = (content, options) => {
        let getButtons = () => {
            let buttonHtml = '<div class="btn-group">';
            buttonHtml += '<a data-apply="confirmation">Yes</a>';
            buttonHtml += '<a data-dismiss="confirmation">No</a>';
            buttonHtml += '</div>';
            return buttonHtml;
        };

        let getContent = content => {
            let contentHtml = content ? content : '';
            contentHtml += '<div class="popover-footer">';
            contentHtml += getButtons();
            contentHtml += '</div>';
            return contentHtml;
        };

        let popoverClass = ['popover'];
        if('small' === getObjVal(options, 'size')){
            popoverClass.push('popover-small');
        }

        let contentClass = ['popover-content', 'no-padding'];

        let html = '<div class="' + popoverClass.join(' ') + '">';
        html += '<div class="arrow"></div>';
        if(true !== getObjVal(options, 'noTitle')){
            html += '<h3 class="popover-title"></h3>';
        }
        html += '<div class="' + contentClass.join(' ') + '">';
        html += getContent(content);
        html += '</div>';
        html += '</div>';
        return html;
    };

    /**
     * get HTML for "delete connection" confirmation popover
     * @returns {string}
     */
    let getConfirmationContent = checkOptions => {
        let getChecklist = checkOptions => {
            let html = '<form class="form-inline editableform popover-content-inner">';
            html += '<div class="control-group form-group">';
            html += '<div class="editable-input">';
            html += '<div class="editable-checklist">';

            for(let option of checkOptions){
                html += '<div><label>';
                html += '<input type="checkbox" name="' + option.name + '" value="' + option.value + '" ';
                html += 'class="' + option.class + '" ' + (option.checked ? 'checked' : '') + '>';
                html += '<span>' + option.label + '</span>';
                html += '</label></div>';
            }

            html += '</div>';
            html += '</div>';
            html += '</div>';
            html += '</form>';

            return html;
        };

        let html = '';
        html += getChecklist(checkOptions);

        return html;
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
     * set default configuration for "Bootbox" plugin
     */
    let initDefaultBootboxConfig = () => {
        bootbox.setDefaults({
            onEscape: true      // enables close dialogs on ESC key
        });
    };

    /**
     * set default configuration for "Tooltip" plugin
     * @param containerEl
     */
    let initDefaultTooltipConfig = containerEl => {
        $.fn.tooltip.Constructor.DEFAULTS.container = containerEl;
        $.fn.tooltip.Constructor.DEFAULTS.delay = 100;
    };

    /**
     * set default configuration for "Popover" plugin
     * @param containerEl
     */
    let initDefaultPopoverConfig = containerEl => {
        $.fn.popover.Constructor.DEFAULTS.container = containerEl;
    };

    /**
     * set default configuration for "Confirmation" popover plugin
     */
    let initDefaultConfirmationConfig = () => {
        $.fn.confirmation.Constructor.DEFAULTS.placement = 'left';
        $.fn.confirmation.Constructor.DEFAULTS.container = 'body';
        $.fn.confirmation.Constructor.DEFAULTS.btnCancelClass = 'btn btn-sm btn-default';
        $.fn.confirmation.Constructor.DEFAULTS.btnCancelLabel = 'cancel';
        $.fn.confirmation.Constructor.DEFAULTS.btnCancelIcon = 'fas fa-fw fa-ban';
        $.fn.confirmation.Constructor.DEFAULTS.btnOkClass = 'btn btn-sm btn-danger';
        $.fn.confirmation.Constructor.DEFAULTS.btnOkLabel = 'delete';
        $.fn.confirmation.Constructor.DEFAULTS.btnOkIcon = 'fas fa-fw fa-times';
        $.fn.confirmation.Constructor.DEFAULTS.template = getConfirmationTemplate();
    };

    /**
     * set default configuration for "Select2" plugin
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
            resultsWrapper.css('maxHeight', '300px');

            // default 'mousewheel' event set by select2 needs to be disabled
            // in order to make mCustomScrollbar mouseWheel enable works correctly
            $(resultsWrapper).find('ul.select2-results__options').off('mousewheel');

            // preload images that are not visible yet
            let lazyLoadImagesOffset = 240;

            resultsWrapper.mCustomScrollbar({
              //setHeight: 400,
                scrollInertia: 200,
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
                alwaysShowScrollbar: 0, // 0, 1, 2
                advanced: {
                    updateOnContentResize: true
                },
                //live: true, // could not get this to work
                callbacks: {
                    alwaysTriggerOffsets: false,    // only trigger callback.onTotalScroll() once
                    onTotalScrollOffset: 100,       // trigger callback.onTotalScroll() 100px before end
                    onInit: function(){
                        // disable page scroll -> otherwise page AND customScrollbars will scroll
                        // -> this is because the initPassiveEvents() delegates the mouseWheel events
                        togglePageScroll(false);
                    },
                    onUpdate: function(a){
                        // whenever the scroll content updates -> init lazyLoad for potential images
                        new LazyLoad({
                            container: this,
                            elements_selector: `.${config.select2ImageLazyLoadClass}`,
                            threshold: lazyLoadImagesOffset,
                            use_native: true
                        });
                    },
                    onTotalScroll: function(){
                        // we want to "trigger" Select2´s 'scroll' event
                        // in order to make its "infinite scrolling" function working
                        // -> look for "--load-more" anker (last list item)
                        //    add "no-margin" class in order to reduce offset to the list
                        let loadMoreLi = this.mcs.content.find('.select2-results__option--load-more');
                        loadMoreLi.addClass('no-margin');
                        this.mcs.content.find('> :first-child').trigger('scroll');
                        setTimeout(() => loadMoreLi.removeClass('no-margin'), 20);
                    }
                }
            });
        };

        let getResultsWrapper = (selectElement) => {
            let wrapper = null;
            if($(selectElement).data('select2')){
                let resultsOptions = $(selectElement).data('select2').$results;
                if(resultsOptions.length){
                    let resultsWrapper = resultsOptions.closest('.select2-results');
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
     * set default configuration for "xEditable" plugin
     */
    let initDefaultEditableConfig = containerEl => {
        $.fn.editable.defaults.container = containerEl;

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
     * get a random string
     * -> e.g. as for Ids
     * @param prefix
     * @returns {string}
     */
    let getRandomString = (prefix = 'id_') => prefix + Math.random().toString(36).substring(2,10);

    /**
     * get date obj with current EVE Server Time.
     * @returns {Date}
     */
    let getServerTime = () => {
        // Server is running with GMT/UTC (EVE Time)
        let localDate = new Date();

        return new Date(
            localDate.getUTCFullYear(),
            localDate.getUTCMonth(),
            localDate.getUTCDate(),
            localDate.getUTCHours(),
            localDate.getUTCMinutes(),
            localDate.getUTCSeconds()
        );
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
        let diff  = (time1 >= 0 && time2 >= 0) ? (time2 - time1) / 1000 : 0;
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
     * format json object with "time parts" into string
     * @param parts
     * @returns {string}
     */
    let formatTimeParts = parts => {
        let label = '';
        if(parts.days){
            label += parts.days + 'd ';
        }
        label += ('00' + parts.hours).slice(-2);
        label += ':' + ('00' + parts.min).slice(-2);
        return label;
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
        if(field.length){
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
     * @param config
     * @param options
     */
    let showNotify = (config = {}, options = {}) => {
        requirejs(['pnotify.loader'], Notification => {
            // if notification is a "desktio" notification -> blink browser tab
            if(options.desktop && config.title){
                options.desktop = {
                    icon: `${imgRoot()}misc/notification.png`
                };
                startTabBlink(config.title);
            }

            Notification.showNotify(config, options);
        });
    };

    /**
     * change document.title and make the browsers tab blink
     * @param blinkTitle
     */
    let startTabBlink = blinkTitle => {
        let initBlink = (function(){
            // count blinks if tab is currently active
            let activeTabBlinkCount = 0;

            let blink = (blinkTitle) => {
                // number of "blinks" should be limited if tab is currently active
                if(window.isVisible){
                    activeTabBlinkCount++;
                }

                // toggle page title
                document.title = (document.title === blinkTitle) ? initialPageTitle : blinkTitle;

                if(activeTabBlinkCount > 10){
                    stopTabBlink();
                }
            };

            return () => {
                if(!blinkTimer){
                    blinkTimer = setInterval(blink, 1000, blinkTitle);
                }
            };
        }(blinkTitle));

        initBlink();
    };

    /**
     * stop browser tab title "blinking"
     */
    let stopTabBlink = () => {
        if(blinkTimer){
            clearInterval(blinkTimer);
            document.title = initialPageTitle;
            blinkTimer = null;
        }
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
            // check new vs. old userData for changes
            let changes = compareUserData(getCurrentUserData(), userData);

            Init.currentUserData = userData;
            isSet = true;

            // check if there is any change
            if(Object.values(changes).some(val => val)){
                $(document).trigger('pf:changedUserData', [changes]);
            }
        }else{
            console.error('Could not set userData %o. Missing or malformed obj', userData);
        }

        return isSet;
    };

    /**
     * get currentUserData from "global" var
     * @returns {*}
     */
    let getCurrentUserData = () => {
        return Init.currentUserData;
    };

    /**
     * get currentCharacterData
     * @see getCurrentUserData
     * @returns {*|boolean}
     */
    let getCurrentCharacter = () => getObjVal(getCurrentUserData(), 'character') || false;

    /**
     * get data from currentCharacterData (e.g. id)
     * @see getCurrentCharacter
     * @param key
     * @returns {*|boolean}
     */
    let getCurrentCharacterData = key => getObjVal(getCurrentCharacter(), key) || false;

    /**
     * get either active characterID or characterId from initial page load
     * @returns {number}
     */
    let getCurrentCharacterId = () => {
        let currentCharacterId = parseInt(getCurrentCharacterData('id')) || 0;
        if(!currentCharacterId){
            // no active character... -> get default characterId from initial page load
            currentCharacterId = parseInt(document.body.getAttribute('data-character-id'));
        }
        return currentCharacterId;
    };

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
            characterStationId: valueChanged('character.log.station.id'),
            characterStructureId: valueChanged('character.log.structure.id'),
            charactersIds: oldCharactersIds.toString() !== newCharactersIds.toString(),
            characterLogHistory: oldHistoryLogStamps.toString() !== newHistoryLogStamps.toString()
        };
    };

    /**
     * checks if currentCharacter has a role that matches a specific right
     * @param right
     * @param objKey
     * @returns {boolean}
     */
    let hasRight = (right, objKey) => {
        let hasRight = false;
        let objectRights = getCurrentCharacterData(`${objKey}.rights`) || [];
        let objectRight = objectRights.find(objectRight => objectRight.right.name === right);
        if(objectRight){
            let characterRole = getCurrentCharacterData('role');
            if(
                characterRole.name === 'SUPER' ||
                objectRight.role.name === 'MEMBER' ||
                objectRight.role.name === characterRole.name
            ){
                hasRight = true;
            }
        }
        return hasRight;
    };

    /**
     * get a unique ID for each tab
     * -> store ID in session storage
     */
    let getBrowserTabId = () => {
        let key = 'tabId';
        let tabId = sessionStorage.getItem(key);
        if(tabId === null){
            tabId = getRandomString();
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
     * @param {String} action
     * @param {String} entity
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
                name: action.toLowerCase() + entity.capitalize()
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
    let handleAjaxErrorResponse = payload => {
        // handle only request errors
        if(payload.action !== 'request'){
            console.error('Unhandled HTTP response error. Invalid payload %o', payload);
            return;
        }

        let jqXHR = payload.data.jqXHR;
        let title = `${jqXHR.status}: ${jqXHR.statusText} - ${payload.name}`;
        let reason = '';

        if(jqXHR.responseJSON){
            // ... valid JSON response
            let response = jqXHR.responseJSON;

            if(response.error && response.error.length > 0){
                // build error notification reason from errors
                reason = response.error.map(error => error.text || error.status).join('\n');

                // check if errors might belong to a HTML form -> check "context"
                if(payload.context.formElement){
                    // show form messages e.g. validation errors
                    payload.context.formElement.showFormMessage(response.error);
                }
            }
        }else{
            reason = 'Invalid JSON response';
        }

        showNotify({title: title, text: reason, type: 'error'});
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
     * get all map tab link elements (<a> tags)
     * or search for a specific tabElement within mapModule
     * @param mapModule
     * @param mapId
     * @returns {NodeListOf<HTMLElementTagNameMap[string]>}
     */
    let getMapTabLinkElements = (mapModule, mapId) => {
        let selector = `.${config.mapTabBarClass}  > li > a`;
        if(mapId){
            selector += `[data-map-id="${mapId}"]`;
        }

        return mapModule.querySelectorAll(selector);
    };

    /**
     * get clas for tab content areas (drapable sections)
     * @param alias
     * @returns {string}
     */
    let getMapTabContentAreaClass = alias => [
        config.mapTabContentAreaClass,
        config.mapTabContentAreaAliases.includes(alias) ? alias : undefined
    ].filter(Boolean).join('-');

    /**
     *
     * @param ariaId
     * @returns {number}
     */
    let getSystemEffectMultiplierByAreaId = ariaId => SystemEffect.getMultiplierByAreaId(ariaId);

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
            case 'T':
                areaId = 33;
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
                    typeName = matches[1].capitalize();
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
     * get a HTML table with universe sovereignty data
     * e.g. for popover
     * @param sovereignty
     * @returns {string}
     */
    let getSystemSovereigntyTable = sovereignty => {
        let data = [];
        if(sovereignty){
            if(sovereignty.faction){
                data.push({label: 'Faction', value: sovereignty.faction.name});
            }
            if(sovereignty.alliance){
                data.push({label: 'Alliance', value: sovereignty.alliance.name});
            }
        }

        let table = '<table>';
        for(let rowData of data){
            table += '<tr>';
            table += '<td>';
            table += rowData.label;
            table += '</td>';
            table += '<td class="text-right">';
            table += rowData.value;
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
                row += unicodeToString(shipName);
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
     * get signature 'type' options for a systemTypeId
     * -> areaIds is array! This is used for "Shattered WHs" where e.g.:
     *    Combat/Relic/.. sites from multiple areaIds (C1, C2, C3) can spawn in a C2,...
     * @param systemTypeId  1 == w-space; 2 == k-space; 3 == a-space
     * @param areaIds       1 == c1; 2 == c2; 12 == Thera; 13 == Shattered Frig;...
     * @param sigGroupId    1 == Combat; 2 == Relic; 3 == Data; ...
     * @returns {{}}
     */
    let getSignatureTypeNames = (systemTypeId, areaIds, sigGroupId) => {
        return objCombine(...areaIds.map(areaId => getObjVal(SignatureType, [systemTypeId, areaId, sigGroupId].join('.')) || {}));
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
        Init.currentMapData = Init.currentMapData.filter(mapData => mapData.config.id !== mapId);
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
     * set new destination for a system/station/structure
     * @param type
     * @param destType
     * @param destData
     */
    let setDestination = (type, destType, destData) => {
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
                destData: [destData]
            },
            context: {
                destType: destType,
                description: description
            },
            dataType: 'json'
        }).done(function(responseData){
            if(
                responseData.destData &&
                responseData.destData.length > 0
            ){
                for(let j = 0; j < responseData.destData.length; j++){
                    showNotify({title: this.description, text: this.destType + ': ' + responseData.destData[j].name, type: 'success'});
                }
            }

            if(
                responseData.error &&
                responseData.error.length > 0
            ){
                for(let i = 0; i < responseData.error.length; i++){
                    showNotify({title: this.description + ' error', text: this.destType + ': ' + responseData.error[i].message, type: 'error'});
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
     * set currentSystemData (active system)
     * @param mapId
     * @param systemData
     */
    let setCurrentSystemData = (mapId, systemData) => {
        mapId = parseInt(mapId) || 0;
        if(mapId && typeof systemData === 'object'){
            currentSystemDataCache.set(`mapId_${mapId}`, systemData);
        }else{
            console.error('Invalid mapId %o or systemData %o');
        }
    };

    /**
     * get currentSystemData (active system)
     * @param mapId
     * @returns {*}
     */
    let getCurrentSystemData = mapId => {
        mapId = parseInt(mapId) || 0;
        if(mapId){
            return currentSystemDataCache.get(`mapId_${mapId}`);
        }else{
            console.error('Invalid mapId %o');
        }
    };

    /**
     * delete currentSystemData (active system)
     * @param mapId
     * @returns {*}
     */
    let deleteCurrentSystemData = mapId => {
        mapId = parseInt(mapId) || 0;
        if(mapId){
            return currentSystemDataCache.delete(`mapId_${mapId}`);
        }else{
            console.error('Invalid mapId %o');
        }
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
     * get LocalStore instance for offline client data store
     * @param name
     * @returns {LocalStore}
     */
    let getLocalStore = name => {
        if(config.localStoreNames.includes(name)){
            return LocalStoreManager.getStore(name);
        }else{
            throw new RangeError('Invalid LocalStore name. Allowed names: ' + config.localStoreNames.join('|'));
        }
    };



    /**
     * get ResizeManager instance
     * @returns {ResizeManager}
     */
    let getResizeManager = () => ResizeManager;

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
    let singleDoubleClick = (element, singleClickCallback, doubleClickCallback, timeout = Init.timer.DBL_CLICK) => {
        element.addEventListener('click', e => {
            if(e.detail === 1){
                // single click -> setTimeout and check if there is a 2nd click incoming before timeout
                let clickTimeoutId = setTimeout(element => {
                    singleClickCallback.call(element, e);
                    element.removeData('clickTimeoutId');
                }, timeout, e.currentTarget);

                e.currentTarget.setData('clickTimeoutId', clickTimeoutId);
            }else if(e.detail === 2 ){
                // double click -> clearTimeout, (triple, quadruple, etc. clicks are ignored)
                doubleClickCallback.call(element, e);
                clearTimeout(e.currentTarget.getData('clickTimeoutId'));
                e.currentTarget.removeData('clickTimeoutId');
            }
        });
    };

    /**
     * get dataTable id
     * @param prefix
     * @param {...string} parts  e.g. 'tableType', 'mapId', 'systemId'
     * @returns {string}
     */
    let getTableId = (prefix, ...parts) => prefix + parts.filter(Boolean).join('-');

    /**
     * get dataTable row id
     * @param prefix
     * @param tableType
     * @param rowId
     * @returns {string}
     */
    let getTableRowId = (prefix, tableType, rowId) => prefix + [tableType, rowId].join('-');

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
        let table = $.fn.dataTable.tables({ visible: false, api: true }).table('#' + getTableId(prefix, tableType, mapId, systemId));
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
     * combines multiple objects into one object
     * -> removes duplicate values
     * -> properties are indexed 1, 2,..n
     * @param objects
     * @returns {{[p: string]: *}}
     */
    let objCombine = (...objects) => {
        let combined = objects.reduce((acc, obj) => acc.concatFilter(Object.values(obj)), []);
        combined.unshift('');  // properties should start at 1 (not 0)
        combined = Object.assign({}, combined);
        delete combined[0];
        return combined;
    };

    /**
     * filter object by allowed keys
     * -> returns a NEW object. Does not change the source obj
     * ({one: 'A', two: 'B'}).filterKeys(['one']) => {one: "A"}
     * @param obj
     * @param allowedKeys
     * @returns {{}}
     */
    let filterObjByKeys = (obj, allowedKeys = []) => {
        return Object.keys(obj)
            .filter(key => allowedKeys.includes(key))
            .reduce((objAcc, key) => {
                objAcc[key] = obj[key];
                return objAcc;
            }, {});
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
    let redirect = (url, params = []) => {
        let currentUrl = document.URL;

        if(url !== currentUrl){
            if(params && params.length > 0){
                url += '?' + params.join('&');
            }
            window.location = url;
        }
    };

    /**
     * send logout request
     * @param  params
     */
    let logout = params => {
        let data = getObjVal(params, 'ajaxData') || {};

        $.ajax({
            type: 'POST',
            url: Init.path.logout,
            data: data,
            dataType: 'json'
        }).done(function(responseData){
            if(responseData.reroute){
                let params = data.graceful ? 'logoutGraceful' : 'logout';
                redirect(responseData.reroute, [params]);
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
        imgRoot: imgRoot,
        eveImageUrl: eveImageUrl,
        unicodeToString: unicodeToString,
        initPassiveEvents: initPassiveEvents,
        initDefaultBootboxConfig: initDefaultBootboxConfig,
        initDefaultTooltipConfig: initDefaultTooltipConfig,
        initDefaultPopoverConfig: initDefaultPopoverConfig,
        initDefaultConfirmationConfig: initDefaultConfirmationConfig,
        initDefaultSelect2Config: initDefaultSelect2Config,
        initDefaultEditableConfig: initDefaultEditableConfig,
        getCurrentTriggerDelay: getCurrentTriggerDelay,
        getRandomString: getRandomString,
        getServerTime: getServerTime,
        convertTimestampToServerTime: convertTimestampToServerTime,
        getTimeDiffParts: getTimeDiffParts,
        formatTimeParts: formatTimeParts,
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
        getMapModule: getMapModule,
        getMapTabLinkElements: getMapTabLinkElements,
        getMapTabContentAreaClass: getMapTabContentAreaClass,
        getSystemEffectMultiplierByAreaId: getSystemEffectMultiplierByAreaId,
        getSystemEffectData: getSystemEffectData,
        getSystemEffectTable: getSystemEffectTable,
        getSystemPlanetsTable: getSystemPlanetsTable,
        getSystemSovereigntyTable: getSystemSovereigntyTable,
        getSystemPilotsTable: getSystemPilotsTable,
        getSystemsInfoTable: getSystemsInfoTable,
        getStatusInfoForCharacter: getStatusInfoForCharacter,
        getSecurityClassForSystem: getSecurityClassForSystem,
        getTrueSecClassForSystem: getTrueSecClassForSystem,
        getStatusInfoForSystem: getStatusInfoForSystem,
        getSignatureGroupOptions: getSignatureGroupOptions,
        getSignatureTypeNames: getSignatureTypeNames,
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
        getCurrentCharacter: getCurrentCharacter,
        getCurrentCharacterData: getCurrentCharacterData,
        getCurrentCharacterId: getCurrentCharacterId,
        setCurrentSystemData: setCurrentSystemData,
        getCurrentSystemData: getCurrentSystemData,
        deleteCurrentSystemData:deleteCurrentSystemData,
        getCurrentLocationData: getCurrentLocationData,
        getCurrentUserInfo: getCurrentUserInfo,
        findInViewport: findInViewport,
        initScrollSpy: initScrollSpy,
        getConfirmationTemplate: getConfirmationTemplate,
        getConfirmationContent: getConfirmationContent,
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
        getLocalStore: getLocalStore,
        getResizeManager: getResizeManager,
        clearSessionStorage: clearSessionStorage,
        hasRight: hasRight,
        getBrowserTabId: getBrowserTabId,
        singleDoubleClick: singleDoubleClick,
        getTableId: getTableId,
        getTableRowId: getTableRowId,
        getDataTableInstance: getDataTableInstance,
        htmlEncode: htmlEncode,
        htmlDecode: htmlDecode,
        isValidHtml: isValidHtml,
        isDomElement: isDomElement,
        arrayToObject: arrayToObject,
        filterObjByKeys: filterObjByKeys,
        getObjVal: getObjVal,
        redirect: redirect,
        logout: logout,
        setCookie: setCookie,
        getCookie: getCookie
    };
});
