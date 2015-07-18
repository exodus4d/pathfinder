/**
 *  sharing settings dialog
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
        // select character dialog
        sharingDialogId: 'pf-sharing-dialog',                                   // id for "sharing settings" dialog
    };

    $.fn.showSharingSettingsDialog = function(){

        var sharingDialogElement = $('#' + config.sharingDialogId);
        if(!sharingDialogElement.is(':visible')){

            var userData = Util.getCurrentUserData();

            if(userData){

                requirejs([
                    'text!templates/dialog/sharing_settings.html',
                    'mustache'
                ], function(templatSharingDialog, Mustache) {

                    var data = {
                        id: config.sharingDialogId,
                        ccpImageServer: Init.url.ccpImageServer,
                        userData: userData
                    };

                    // render "new map" tab content -------------------------------------------
                    var contentSharingDialog = Mustache.render(templatSharingDialog, data);

                    var sharingSettingsDialog = bootbox.dialog({
                        title: 'Sharing settings',
                        message: $(contentSharingDialog),
                        buttons: {
                            close: {
                                label: 'cancel',
                                className: 'btn-default'
                            },
                            success: {
                                label: '<i class="fa fa-check fa-fw"></i>&nbsp;save',
                                className: 'btn-success',
                                callback: function() {

                                    var form = $('#' + config.sharingDialogId).find('form');

                                    var sharingSettingsData = {formData: form.getFormValues()};

                                    $.ajax({
                                        type: 'POST',
                                        url: Init.path.saveSharingConfig,
                                        data: sharingSettingsData,
                                        dataType: 'json'
                                    }).done(function(data){

                                        if(data.userData !== undefined){
                                            // store current user data global (cache)
                                            Util.setCurrentUserData(data.userData);

                                            $(document).trigger('pf:closeMenu', [{}]);
                                            $(sharingSettingsDialog).modal('hide');

                                            // success
                                            Util.showNotify({title: 'Sharing settings saved', type: 'success'});
                                        }

                                    }).fail(function( jqXHR, status, error) {
                                        console.log('sharing fail')


                                    });

                                    return false;
                                }
                            }
                        }
                    });



                });
            }else{
                Util.showNotify({title: 'No userData found', type: 'warning'});

            }





        }
    };

});