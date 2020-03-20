/**
 * delete account dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox'
], ($, Init, Util, bootbox) => {
    'use strict';

    let config = {
        // global dialog
        deleteAccountId: 'pf-dialog-delete-account',                            // dialog id

        // captcha
        captchaKeyDeleteAccount: 'SESSION.CAPTCHA.ACCOUNT.DELETE',              // key for captcha reason
        captchaImageWrapperId: 'pf-dialog-captcha-wrapper'                      // id for "captcha image" wrapper
    };

    /**
     * shows delete account dialog
     */
    $.fn.showDeleteAccountDialog = function(){

        requirejs(['text!templates/dialog/delete_account.html', 'mustache'], (template, Mustache) => {

            let data = {
                deleteAccountId: config.deleteAccountId,
                userData: Util.getCurrentUserData(),
                captchaImageWrapperId: config.captchaImageWrapperId,
                formErrorContainerClass: Util.config.formErrorContainerClass
            };

            let content = Mustache.render(template, data);

            let deleteAccountDialog = bootbox.dialog({
                title: 'Delete account',
                message: content,
                show: false,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fas fa-user-times fa-fw"></i>&nbsp;delete account',
                        className: 'btn-danger',
                        callback: function(){
                            let dialogElement = $(this);
                            let form = dialogElement.find('form');

                            // validate form
                            form.validator('validate');
                            let formValid = form.isValidForm();

                            if(formValid){

                                let formValues = form.getFormValues();

                                if(! $.isEmptyObject(formValues) ){
                                    // send Tab data and store values
                                    let requestData = {
                                        formData: formValues
                                    };

                                    dialogElement.find('.modal-content').showLoadingAnimation();

                                    $.ajax({
                                        type: 'POST',
                                        url: Init.path.deleteAccount,
                                        data: requestData,
                                        dataType: 'json'
                                    }).done(function(responseData){
                                        dialogElement.find('.modal-content').hideLoadingAnimation();

                                        if(responseData.reroute !== undefined){
                                            Util.redirect(responseData.reroute);
                                        }else if(
                                            responseData.error &&
                                            responseData.error.length > 0
                                        ){
                                            form.showFormMessage(responseData.error);

                                            $('#' + config.captchaImageWrapperId).showCaptchaImage(config.captchaKeyDeleteAccount, function(){
                                                form.find('[name="captcha"]').resetFormFields();
                                            });
                                        }

                                    }).fail(function(jqXHR, status, error){
                                        dialogElement.find('.modal-content').hideLoadingAnimation();

                                        let reason = status + ' ' + error;
                                        Util.showNotify({title: jqXHR.status + ': deleteAccount', text: reason, type: 'error'});

                                    });
                                }
                            }

                            return false;
                        }
                    }
                }
            });

            deleteAccountDialog.on('show.bs.modal', function(e){
                // request captcha image and show
                let captchaImageWrapperContainer = $('#' + config.captchaImageWrapperId);
                captchaImageWrapperContainer.showCaptchaImage(config.captchaKeyDeleteAccount);

                // init captcha refresh button
                captchaImageWrapperContainer.find('i').on('click', function(){
                    captchaImageWrapperContainer.showCaptchaImage(config.captchaKeyDeleteAccount);
                });
            });

            // after modal is shown =======================================================================
            deleteAccountDialog.on('shown.bs.modal', function(e){
                let dialogElement = $(this);

                dialogElement.initTooltips();
            });

            // show dialog
            deleteAccountDialog.modal('show');
        });

    };
});