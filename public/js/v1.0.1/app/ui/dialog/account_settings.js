/**
 *  user settings/share dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox'
], function($, Init, Util, Render, bootbox) {
    'use strict';

    var config = {
        // select character dialog
        settingsDialogId: 'pf-settings-dialog',                                 // id for "settings" dialog
        settingsAccountContainerId: 'pf-settings-dialog-account',               // id for the "account" container
        settingsShareContainerId: 'pf-settings-dialog-share',                   // id for the "share" container

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
     * @param options
     * @returns {boolean}
     */
    $.fn.showSettingsDialog = function(options){

        // check if there are other dialogs open
        var openDialogs = Util.getOpenDialogs();
        if(openDialogs.length > 0){
            return false;
        }

        requirejs(['text!templates/dialog/settings.html', 'mustache'], function(template, Mustache) {

            var data = {
                id: config.settingsDialogId,
                settingsAccountContainerId: config.settingsAccountContainerId,
                settingsShareContainerId: config.settingsShareContainerId,
                userData: Init.currentUserData,
                captchaImageWrapperId: config.captchaImageWrapperId,
                captchaImageId: config.captchaImageId,
                formErrorContainerClass: Util.config.formErrorContainerClass,
                ccpImageServer: Init.url.ccpImageServer
            };

            var content = Mustache.render(template, data);

            var accountSettingsDialog = bootbox.dialog({
                title: 'Account settings',
                message: content,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fa fa-check fa-fw"></i>&nbsp;save',
                        className: 'btn-success',
                        callback: function() {

                            // get the current active form
                            var form = $('#' + config.settingsDialogId).find('form').filter(':visible');

                            // validate form
                            form.validator('validate');

                            // check whether the form is valid
                            var formValid = form.isValidForm();

                            if(formValid === true){
                                var tabFormValues = form.getFormValues();

                                // send Tab data and store values
                                var requestData = {
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
                                        $(document).trigger('pf:closeMenu', [{}]);
                                        accountSettingsDialog.modal('hide');
                                    }

                                }).fail(function( jqXHR, status, error) {
                                    accountSettingsDialog.find('.modal-content').hideLoadingAnimation();

                                    var reason = status + ' ' + error;
                                    Util.showNotify({title: jqXHR.status + ': saveAccountSettings', text: reason, type: 'error'});

                                    // set new captcha for any request
                                    // captcha is required for sensitive data (not for all)
                                    $('#' + config.captchaImageWrapperId).showCaptchaImage(config.captchaKeyUpdateAccount, function(){
                                        $('#captcha').resetFormFields();
                                    });

                                    // check for DB errors
                                    if(jqXHR.status === 500){

                                        if(jqXHR.responseText){
                                            var errorObj = $.parseJSON(jqXHR.responseText);

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

            // after modal is shown =======================================================================
            accountSettingsDialog.on('shown.bs.modal', function(e) {

                var dialogElement = $(this);
                var form = dialogElement.find('form');

                // request captcha image and show
                var captchaImageWrapperContainer = $('#' + config.captchaImageWrapperId);
                captchaImageWrapperContainer.showCaptchaImage(config.captchaKeyUpdateAccount);

                // init captcha refresh button
                captchaImageWrapperContainer.find('i').on('click', function(){
                    captchaImageWrapperContainer.showCaptchaImage(config.captchaKeyUpdateAccount);
                });


                // init dialog tooltips
                dialogElement.initTooltips();

                form.initFormValidation();
            });

            // events for tab change
            accountSettingsDialog.find('.navbar a').on('shown.bs.tab', function(e){

                // init "toggle" switches on current active tab
                accountSettingsDialog.find( $(this).attr('href') ).find('input[type="checkbox"]').bootstrapToggle({
                    on: '<i class="fa fa-fw fa-check"></i>&nbsp;Enable',
                    off: 'Disable&nbsp;<i class="fa fa-fw fa-ban"></i>',
                    onstyle: 'success',
                    offstyle: 'warning',
                    width: 90,
                    height: 30
                });

            });

        });
    };
});