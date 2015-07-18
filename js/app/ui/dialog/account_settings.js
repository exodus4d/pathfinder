/**
 *  user register/settings dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
], function($, Init, Util, Render, bootbox) {
    'use strict';

    var config = {
        dialogWizardNavigationClass: 'pf-wizard-navigation',                    // class for wizard navigation bar

        // select character dialog
        settingsDialogId: 'pf-settings-dialog',                                 // id for "settings" dialog
        settingsImageWrapperClass: 'pf-dialog-image-wrapper',                   // class for image wrapper (animated)
        settingsImageInfoClass: 'pf-dialog-character-info',                     // class for character info layer (visible on hover)
        settingsMainClass: 'pf-dialog-character-main',                          // class for main character highlighting
        settingsNavigationButtonClass: 'pf-dialog-navigation-button',           // class for all navigation buttons
        settingsFinishButtonClass: 'pf-dialog-finish-button',                   // class for "finish" button
        settingsPrevButtonClass: 'pf-dialog-prev-button',                       // class for "prev" button
        settingsNextButtonClass: 'pf-dialog-next-button',                       // class for "next" button
        settingsCloneApiRowClass: 'pf-dialog-api-row',                          // class for form row with API data (will be cloned)
        settingsCloneRowButtonClass: 'pf-dialog-clone-button',                  // class for clone button (api row)
        settingsDeleteRowButtonClass: 'pf-dialog-delete-button',                // class for delete button (api row)

        // captcha
        captchaImageWrapperId: 'pf-dialog-captcha-wrapper',                     // id for "captcha image" wrapper
        captchaImageId: 'pf-dialog-captcha-image',                              // id for "captcha image"

        loadingOptions: {                                                       // config for loading overlay
            icon: {
                size: 'fa-2x'
            }
        }

    };

    /**
     * getz active Tab link element for a dialog
     * @param dialog
     * @returns {JQuery|*}
     */
    var getActiveTabElement = function(dialog){
        var navigationBarElement = $(dialog).find('.' + config.dialogWizardNavigationClass);
        var currentActiveTab = navigationBarElement.find('li.active');

        return currentActiveTab;
    };

    /**
     * generates a captcha image and return as base64 image/png
     * @param callback
     */
    var getCaptchaImage = function(callback){

        $.ajax({
            type: 'POST',
            url: Init.path.getCaptcha,
            data: {},
            dataType: 'text'
        }).done(function(base64Image){

            callback(base64Image);
        }).fail(function( jqXHR, status, error) {
            var reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': saveConfig', text: reason, type: 'warning'});
        });
    };

    /**
     * clear a field and reset success/error classes
     * @param fieldId
     */
    var resetFormField = function(fieldId){
        var field = $('#' + fieldId);
        field.val('');
        field.parents('.form-group').removeClass('has-error has-success');
    }

    /**
     * request captcha image and show in form
     */
    var showCaptchaImage = function(){

        var captchaWrapper = $('#' + config.captchaImageWrapperId);
        var captchaImage = $('#' + config.captchaImageId);

        captchaWrapper.showLoadingAnimation(config.loadingOptions);
        getCaptchaImage(function(base64Image){

            captchaImage.attr('src', base64Image).show();
            captchaWrapper.hideLoadingAnimation();

            // reset captcha field
            resetFormField('captcha');
        });
    };

    /**
     * init popovers in dialog
     * @param dialogElement
     */
    var initPopover = function(dialogElement){

        var apiCloneButtons = dialogElement.find('.' + config.settingsCloneRowButtonClass);
        var apiDeleteButtons = dialogElement.find('.' + config.settingsDeleteRowButtonClass);

        var confirmationSettings = {
            container: 'body',
            placement: 'left',
            btnCancelClass: 'btn btn-sm btn-default',
            btnCancelLabel: 'cancel',
            btnCancelIcon: 'fa fa-fw fa-ban'
        };

        // add API key row
        var cloneConfirmationSettings = $.extend({
            title: 'Add additional key',
            btnOkClass: 'btn btn-sm btn-success',
            btnOkLabel: 'confirm',
            btnOkIcon: 'fa fa-fw fa-check',
            onConfirm: function(e) {
                var cloneRow = dialogElement.find('.' + config.settingsCloneApiRowClass).last();
                var newApiRow = cloneRow.clone();

                newApiRow.find('.form-group').removeClass('has-success has-error')
                newApiRow.find('input').val('');
                cloneRow.after(newApiRow);

                // init new row with popups
                initPopover(dialogElement);
            }
        }, confirmationSettings);

        // delete API key row
        var deleteConfirmationSettings = $.extend({
            title: 'Delete key',
            btnOkClass: 'btn btn-sm btn-danger',
            btnOkLabel: 'delete',
            btnOkIcon: 'fa fa-fw fa-close',
            onConfirm: function(e, target) {
                $(target).parents('.row').remove();
            }
        }, confirmationSettings);

        $(apiCloneButtons).confirmation(cloneConfirmationSettings);
        $(apiDeleteButtons).confirmation(deleteConfirmationSettings);
    };


    /**
     * show "register/settings" dialog
     */
    $.fn.showSettingsDialog = function(register){

        // check if there is already a settings dialog open
        var settingsDialog = $('#' + config.settingsDialogId);

        if(settingsDialog.length > 0){
            return false;
        }

        var reroutePath = '';


        // check navigation buttons and show/hide them
        var checkNavigationButton = function(dialog){
            var navigationBarElement = $(dialog).find('.' + config.dialogWizardNavigationClass);
            var currentActiveTab = navigationBarElement.find('li.active');

            var hidePrevButton = currentActiveTab.prevAll().length > 0 ? false : true;
            var hideNextButton = currentActiveTab.nextAll().length > 0 ? false : true;

            if(hidePrevButton){
                $('.' + config.settingsPrevButtonClass).hide();
            }else{
                $('.' + config.settingsPrevButtonClass).show();
            }

            if(hideNextButton){
                $('.' + config.settingsNextButtonClass).hide();
            }else{
                $('.' + config.settingsNextButtonClass).show();
            }
        };

        requirejs(['text!templates/dialog/settings.html', 'mustache'], function(template, Mustache) {

            // if this is a new registration there is no API key -> fake an empty API to make fields visible
            if(register){
                Init.currentUserData = {};
                Init.currentUserData.api = [{
                    keyId: '',
                    vCode: ''
                }];
            }else if(Init.currentUserData.api === undefined){
                Init.currentUserData.api = [{
                    keyId: '',
                    vCode: ''
                }];
            }

            var data = {
                id: config.settingsDialogId,
                register: register,
                navigationClass: config.dialogWizardNavigationClass,
                userData: Init.currentUserData,
                cloneApiRowClass: config.settingsCloneApiRowClass,
                cloneRowButtonClass: config.settingsCloneRowButtonClass,
                deleteRowButtonClass: config.settingsDeleteRowButtonClass,
                captchaImageWrapperId: config.captchaImageWrapperId,
                captchaImageId: config.captchaImageId,
                formErrorContainerClass: Util.config.formErrorContainerClass,
                formWarningContainerClass: Util.config.formWarningContainerClass
            };

            var content = Mustache.render(template, data);

            var selectCharacterDialog = bootbox.dialog({
                title: register ? 'Registration' : 'Account settings',
                message: content,
                buttons: {
                    close: {
                        label: 'finish',
                        className: ['btn-success', 'pull-right', config.settingsFinishButtonClass].join(' '),
                        callback: function(e){

                            if(register){
                                if(reroutePath !== undefined){
                                    // root user to main app
                                    window.location = Util.buildUrl(reroutePath);
                                }
                            }else{
                                // close dialog
                                return true;
                            }
                        }
                    },
                    prev: {
                        label: '<i class="fa fa-fw fa-angle-left"></i>back',
                        className: ['btn-default', 'pull-left', config.settingsNavigationButtonClass, config.settingsPrevButtonClass].join(' '),
                        callback: function (e) {
                            var currentActiveTab = getActiveTabElement(this);
                            currentActiveTab.removeClass('finished');
                            currentActiveTab.prev('li').find('a').tab('show');

                            return false;
                        }
                    },
                    next: {
                        label: 'next<i class="fa fa-fw fa-angle-right"></i>',
                        className: ['btn-primary', 'pull-right', config.settingsNavigationButtonClass, config.settingsNextButtonClass].join(' '),
                        callback: function (e) {
                            var dialogElement = $(this);
                            var currentActiveTab = getActiveTabElement(dialogElement);
                            var currentActiveLink = currentActiveTab.find('a');
                            var tabContentElement = $(currentActiveLink.attr('href'));
                            var form = tabContentElement.find('form');

                            var changeTab = function(){
                                currentActiveTab.addClass('finished');
                                currentActiveLink.removeClass('btn-danger btn-default');
                                currentActiveLink.addClass('btn-primary');

                                currentActiveTab.next('li').find('a').tab('show');

                            };

                            // validate form
                            form.validator('validate');
                            var formValid = form.isValidForm();


                            if(!formValid){
                                currentActiveTab.removeClass('disabled');
                                currentActiveLink.removeClass('btn-default btn-primary');
                                currentActiveLink.addClass('btn-danger');
                            }else{

                                var tabFormValues = form.getFormValues();

                                if(! $.isEmptyObject(tabFormValues) ){

                                    // send Tab data and store values
                                    var requestData = {
                                        settingsData: tabFormValues
                                    };

                                    selectCharacterDialog.find('.modal-content').showLoadingAnimation();

                                    $.ajax({
                                        type: 'POST',
                                        url: Init.path.saveUserConfig,
                                        data: requestData,
                                        dataType: 'json'
                                    }).done(function(responseData){
                                        selectCharacterDialog.find('.modal-content').hideLoadingAnimation();

                                        // set new captcha for any request
                                        // captcha is required for sensitive data (not for all data)

                                        if(
                                            responseData.error &&
                                            responseData.error.length > 0
                                        ){
                                            form.showFormMessage(responseData.error);

                                            showCaptchaImage();
                                        }else{
                                            // store new/updated user data -> update head
                                            if(responseData.userData){
                                                Util.setCurrentUserData(responseData.userData);
                                            }

                                            // store reroute path after registration  finished
                                            if(responseData.reroute){
                                                reroutePath = responseData.reroute;
                                            }

                                            dialogElement.find('.alert').velocity('transition.slideDownOut',{
                                                duration: 500,
                                                complete: function(){
                                                    // switch tab
                                                    changeTab();

                                                    showCaptchaImage();
                                                }
                                            });

                                            Util.showNotify({title: 'Account data saved', type: 'success'});
                                        }

                                    }).fail(function( jqXHR, status, error) {
                                        selectCharacterDialog.find('.modal-content').hideLoadingAnimation();

                                        var reason = status + ' ' + error;
                                        Util.showNotify({title: jqXHR.status + ': saveConfig', text: reason, type: 'error'});

                                        // set new captcha for any request
                                        // captcha is required for sensitive data (not for all)
                                        showCaptchaImage();

                                        // check for DB errors
                                        if(jqXHR.status === 500){

                                            if(jqXHR.responseText){
                                                var errorObj = $.parseJSON(jqXHR.responseText);

                                                if(errorObj.text !== undefined){
                                                    // DB error

                                                    if(errorObj.text.match('Duplicate')){
                                                        // duplicate DB key

                                                        var fieldName = 'name';
                                                        if(errorObj.text.match( fieldName )){
                                                            // name exist
                                                            showFormMessage([{type: 'error', message: 'Username already exists'}]);
                                                            resetFormField( fieldName );
                                                        }

                                                        fieldName = 'email';
                                                        if(errorObj.text.match( fieldName )){
                                                            // name exist
                                                            showFormMessage([{type: 'error', message: 'Email already exists'}]);
                                                            resetFormField( fieldName );
                                                            resetFormField( fieldName + '_confirm');
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        if(!register){
                                            $(document).setProgramStatus('problem');
                                        }

                                    });

                                }else{
                                    // no request required -> change tab
                                    changeTab();
                                }
                            }

                            return false;
                        }
                    }
                }
            });

            // after modal is shown =======================================================================
            selectCharacterDialog.on('shown.bs.modal', function(e) {

                var dialogElement = $(this);
                var tabLinkElements = dialogElement.find('a[data-toggle="tab"]');
                var form = dialogElement.find('form');

                // request captcha image and show
                showCaptchaImage();

                // init dialog tooltips
                dialogElement.initTooltips();

                // init popups
                initPopover( dialogElement );

                // init form validation
                form.initFormValidation();

                // on Tab switch ======================================================================
                tabLinkElements.on('shown.bs.tab', function (e) {

                    // check navigation buttons (hide/show)
                    checkNavigationButton(dialogElement);

                    $(e.target).removeClass('disabled');

                    // hide finish button
                    dialogElement.find('.' + config.settingsFinishButtonClass).hide();


                    if($(e.target).text() < $(e.relatedTarget).text()){
                        var currentActiveTab = getActiveTabElement(dialogElement);
                        var nextTabElements = currentActiveTab.nextAll();

                        // disable all next tabs
                        currentActiveTab.removeClass('finished');
                        nextTabElements.removeClass('finished');
                        nextTabElements.find('a').removeClass('btn-primary btn-danger').addClass('btn-default disabled');
                    }

                    if($(e.target).text() === '3'){

                        // load character tab -----------------------------------------------

                        requirejs(['text!templates/form/character_panel.html', 'mustache'], function(template, Mustache) {

                            // all characters for the current user
                            var characters = Init.currentUserData.characters;
                            // calculate grid class
                            var characterCount = characters.length;
                            var gridClass = ((12 / characterCount) < 4)? 4 : 12 / characterCount ;

                            // add character status information for each character
                            var mainCharacter = 0;
                            for(var i = 0; i < characters.length; i++){
                                var statusInfo = {};
                                statusInfo.class = Util.getStatusInfoForCharacter(characters[i], 'class');
                                statusInfo.label = Util.getStatusInfoForCharacter(characters[i], 'name');
                                characters[i].status =statusInfo;

                                if(characters[i].isMain === 1){
                                    mainCharacter = characters[i].id;
                                }else if(mainCharacter === 0){
                                    // mark at least one character as "main" if no main char was found
                                    // e.g. first account setup
                                    mainCharacter = characters[i].id;
                                }
                            }

                            var characterTemplateData = {
                                imageWrapperClass: config.settingsImageWrapperClass,
                                imageInfoClass: config.settingsImageInfoClass,
                                imageWrapperMainClass: config.settingsMainClass,
                                charactersData: characters,
                                gridClass: 'col-sm-' + gridClass,
                                mainCharacter: mainCharacter
                            };

                            var content = Mustache.render(template, characterTemplateData);

                            var characterForm = dialogElement.find('#pf-dialog-settings-character form');

                            // add form HTML
                            characterForm.html(content);

                            var imageWrapperElements = dialogElement.find('.' + config.settingsImageWrapperClass);

                            // special effects :)
                            imageWrapperElements.velocity('stop').delay(100).velocity('transition.flipBounceXIn', {
                                display: 'inline-block',
                                stagger: 60,
                                drag: true,
                                duration: 400,
                                complete: function(){
                                    // init new character tooltips
                                    dialogElement.initTooltips();
                                }
                            });

                            // Hover effect for character info layer
                            imageWrapperElements.hoverIntent(function(e){
                                var characterInfoElement = $(this).find('.' + config.settingsImageInfoClass);

                                characterInfoElement.velocity('finish').velocity({
                                    width: ['100%', [ 400, 15 ] ]
                                },{
                                    easing: 'easeInSine'
                                });
                            }, function(e){
                                var characterInfoElement = $(this).find('.' + config.settingsImageInfoClass);

                                characterInfoElement.velocity('finish').velocity({
                                    width: 0
                                },{
                                    duration: 150,
                                    easing: 'easeInOutSine'
                                });

                            });

                            // click event on character image
                            imageWrapperElements.on('click', function(e){
                                var wrapperElement = $(this);
                                var characterId = wrapperElement.data('id');

                                // update layout if character is selected
                                if(characterId > 0){
                                    // update hidden field with new mainCharacterId
                                    dialogElement.find('input[name="mainCharacterId"]').val(characterId);

                                    imageWrapperElements.removeClass( config.settingsMainClass );
                                    wrapperElement.addClass( config.settingsMainClass );
                                }

                            });

                        });

                    }else if($(e.target).text() === '4'){
                        // show finish button
                        dialogElement.find('.' + config.settingsFinishButtonClass).show();

                        // show success message
                        dialogElement.find('h1').velocity('stop').delay(200).velocity('transition.flipBounceXIn', {
                            duration: 500
                        }).delay(100).velocity('callout.pulse');
                    }

                });

            });



        });

    };

});