/**
 * delete account dialog
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox'
], function($, Init, Util, bootbox) {
    'use strict';

    var config = {
        // global dialog
        deleteAccountId: 'pf-dialog-delete-account',                            // dialog id

        // captcha
        captchaImageWrapperId: 'pf-dialog-captcha-wrapper'                      // id for "captcha image" wrapper
    };

    /**
     * shows delete account dialog
     */
    $.fn.showDeleteAccountDialog = function(){


        requirejs(['text!templates/dialog/delete_account.html', 'mustache'], function(template, Mustache) {

            var data = {
                deleteAccountId: config.deleteAccountId,
                userData: Util.getCurrentUserData(),
                captchaImageWrapperId: config.captchaImageWrapperId,
                formErrorContainerClass: Util.config.formErrorContainerClass
            };

            var content = Mustache.render(template, data);

            var deleteAccountDialog = bootbox.dialog({
                title: 'Delete account',
                message: content,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    },
                    success: {
                        label: '<i class="fa fa-user-times fa-fw"></i>&nbsp;delete account',
                        className: 'btn-danger',
                        callback: function() {
                            var dialogElement = $(this);
                            var form = dialogElement.find('form');

                            // validate form
                            form.validator('validate');
                            var formValid = form.isValidForm();

                            if(formValid){

                                var formValues = form.getFormValues();

                                if(! $.isEmptyObject(formValues) ){
                                    // send Tab data and store values
                                    var requestData = {
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
                                            Util.redirect(responseData.reroute, []);
                                        }else if(
                                            responseData.error &&
                                            responseData.error.length > 0
                                        ){
                                            form.showFormMessage(responseData.error);

                                            $('#' + config.captchaImageWrapperId).showCaptchaImage('deleteAccount', function(){
                                                form.find('[name="captcha"], [name="password"]').resetFormFields();
                                            });
                                        }

                                    }).fail(function( jqXHR, status, error) {
                                        dialogElement.find('.modal-content').hideLoadingAnimation();

                                        var reason = status + ' ' + error;
                                        Util.showNotify({title: jqXHR.status + ': deleteAccount', text: reason, type: 'error'});

                                    });
                                }
                            }

                            return false;
                        }
                    }
                }
            });

            // after modal is shown =======================================================================
            deleteAccountDialog.on('shown.bs.modal', function(e) {
                // request captcha image and show
                $('#' + config.captchaImageWrapperId).showCaptchaImage('deleteAccount');
            });

        });

    };
});