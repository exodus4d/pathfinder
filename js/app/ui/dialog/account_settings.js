/**
 *  user settings/share dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox'
], ($, Init, Util, bootbox) => {
    'use strict';

    let config = {
        // select character dialog
        settingsDialogId: 'pf-settings-dialog',                                 // id for "settings" dialog
        settingsAccountContainerId: 'pf-settings-dialog-account',               // id for the "account" container
        settingsShareContainerId: 'pf-settings-dialog-share',                   // id for the "share" container
        settingsCharacterContainerId: 'pf-settings-dialog-character',           // id for the "character" container

        // captcha
        captchaKeyUpdateAccount: 'SESSION.CAPTCHA.ACCOUNT.UPDATE',              // key for captcha reason
        captchaImageWrapperId: 'pf-dialog-captcha-wrapper',                     // id for "captcha image" wrapper
        captchaImageId: 'pf-dialog-captcha-image',                              // id for "captcha image"

        loadingOptions: {                                                       // config for loading overlay
            icon: {
                size: 'fa-2x'
            }
        }
    };

    /**
     * show "register/settings" dialog
     * @returns {boolean}
     */
    $.fn.showSettingsDialog = function(){

        // check if there are other dialogs open
        let openDialogs = Util.getOpenDialogs();
        if(openDialogs.length > 0){
            return false;
        }

        requirejs(['text!templates/dialog/settings.html', 'mustache'], function(template, Mustache){

            let data = {
                id: config.settingsDialogId,
                settingsAccountContainerId: config.settingsAccountContainerId,
                settingsShareContainerId: config.settingsShareContainerId,
                settingsCharacterContainerId: config.settingsCharacterContainerId,
                userData: Init.currentUserData,
                captchaImageWrapperId: config.captchaImageWrapperId,
                captchaImageId: config.captchaImageId,
                formErrorContainerClass: Util.config.formErrorContainerClass,
                ccpImageServer: Init.url.ccpImageServer,
                roleLabel: Util.getLabelByRole(Util.getObjVal(Util.getCurrentUserData(), 'character.role')).prop('outerHTML'),
                characterAutoLocationSelectEnabled: Boolean(Util.getObjVal(Init, 'character.autoLocationSelect'))
            };

            let content = Mustache.render(template, data);

            let accountSettingsDialog = bootbox.dialog({
                title: 'Account settings',
                message: content,
                show: false,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fas fa-check fa-fw"></i>&nbsp;save',
                        className: 'btn-success',
                        callback: function(){

                            // get the current active form
                            let form = $('#' + config.settingsDialogId).find('form').filter(':visible');

                            // validate form
                            form.validator('validate');

                            // check whether the form is valid
                            let formValid = form.isValidForm();

                            if(formValid === true){
                                let tabFormValues = form.getFormValues();

                                // send Tab data and store values
                                let requestData = {
                                    formData: tabFormValues
                                };

                                accountSettingsDialog.find('.modal-content').showLoadingAnimation();

                                $.ajax({
                                    type: 'POST',
                                    url: Init.path.saveUserConfig,
                                    data: requestData,
                                    dataType: 'json'
                                }).done(function(responseData){
                                    accountSettingsDialog.find('.modal-content').hideLoadingAnimation();

                                    // set new captcha for any request
                                    // captcha is required for sensitive data (not for all data)
                                    if(
                                        responseData.error &&
                                        responseData.error.length > 0
                                    ){
                                        form.showFormMessage(responseData.error);

                                        $('#' + config.captchaImageWrapperId).showCaptchaImage(config.captchaKeyUpdateAccount, function(){
                                            $('#captcha').resetFormFields();
                                        });
                                    }else{
                                        // store new/updated user data -> update head
                                        if(responseData.userData){
                                            Util.setCurrentUserData(responseData.userData);
                                        }

                                        form.find('.alert').velocity('transition.slideDownOut',{
                                            duration: 500,
                                            complete: function(){
                                                $('#' + config.captchaImageWrapperId).showCaptchaImage(config.captchaKeyUpdateAccount, function(){
                                                    $('#captcha').resetFormFields();
                                                });
                                            }
                                        });

                                        Util.showNotify({title: 'Account saved', type: 'success'});

                                        // close dialog/menu
                                        Util.triggerMenuAction(document, 'Close');
                                        accountSettingsDialog.modal('hide');
                                    }
                                }).fail(function(jqXHR, status, error){
                                    accountSettingsDialog.find('.modal-content').hideLoadingAnimation();

                                    let reason = status + ' ' + error;
                                    Util.showNotify({title: jqXHR.status + ': saveAccountSettings', text: reason, type: 'error'});

                                    // set new captcha for any request
                                    // captcha is required for sensitive data (not for all)
                                    $('#' + config.captchaImageWrapperId).showCaptchaImage(config.captchaKeyUpdateAccount, function(){
                                        $('#captcha').resetFormFields();
                                    });

                                    // check for DB errors
                                    if(jqXHR.status === 500){

                                        if(jqXHR.responseText){
                                            let errorObj = $.parseJSON(jqXHR.responseText);

                                            if(
                                                errorObj.error &&
                                                errorObj.error.length > 0
                                            ){
                                                form.showFormMessage(errorObj.error);
                                            }
                                        }
                                    }

                                    $(document).setProgramStatus('problem');

                                });
                            }

                            return false;
                        }
                    }
                }
            });

            accountSettingsDialog.on('show.bs.modal', function(e){
                // request captcha image and show
                let captchaImageWrapperContainer = $('#' + config.captchaImageWrapperId);
                captchaImageWrapperContainer.showCaptchaImage(config.captchaKeyUpdateAccount);

                // init captcha refresh button
                captchaImageWrapperContainer.find('i').on('click', function(){
                    captchaImageWrapperContainer.showCaptchaImage(config.captchaKeyUpdateAccount);
                });
            });

            // after modal is shown =======================================================================
            accountSettingsDialog.on('shown.bs.modal', function(e){
                let dialogElement = $(this);
                let form = dialogElement.find('form');

                dialogElement.initTooltips();

                form.initFormValidation();
            });

            // show dialog
            accountSettingsDialog.modal('show');

            // events for tab change
            accountSettingsDialog.find('.navbar a').on('shown.bs.tab', function(e){

                // init "toggle" switches on current active tab
                accountSettingsDialog.find( $(this).attr('href') ).find('input[data-toggle="toggle"][type="checkbox"]').bootstrapToggle({
                    on: '<i class="fas fa-fw fa-check"></i>&nbsp;Enable',
                    off: 'Disable&nbsp;<i class="fas fa-fw fa-ban"></i>',
                    onstyle: 'success',
                    offstyle: 'warning',
                    width: 100,
                    height: 30
                });

            });

        });
    };
});