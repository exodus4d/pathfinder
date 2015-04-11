/**
 *  user settings dialog
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
        settingsDeleteRowButtonClass: 'pf-dialog-delete-button'                 // class for delete button (api row)

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
     * show "settings" dialog
     */
    $.fn.showSettingsDialog = function(){

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

            var data = {
                id: config.settingsDialogId,
                navigationClass: config.dialogWizardNavigationClass,
                userData: Init.currentUserData,
                cloneApiRowClass: config.settingsCloneApiRowClass,
                cloneRowButtonClass: config.settingsCloneRowButtonClass,
                deleteRowButtonClass: config.settingsDeleteRowButtonClass
            };

            var content = Mustache.render(template, data);

            var selectCharacterDialog = bootbox.dialog({
                title: 'Account settings',
                message: content,
                buttons: {
                    close: {
                        label: 'finish',
                        className: ['btn-success', 'pull-right', config.settingsFinishButtonClass].join(' ')
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

                            var changeTab = function(){
                                currentActiveTab.addClass('finished');
                                currentActiveLink.removeClass('btn-danger btn-default');
                                currentActiveLink.addClass('btn-primary');

                                currentActiveTab.next('li').find('a').tab('show');

                            };

                            // validate form
                            var form = tabContentElement.find('form');
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

                                        if(responseData.error){
                                            var errorAlert = form.find('.alert');
                                            for(var i = 0; i < responseData.error.length; i++){
                                                var errorData = responseData.error[i];

                                                if(errorData.type === 'api'){
                                                    errorAlert.find('small').text(errorData.message + '. Key ID: ' + errorData.keyId);
                                                }
                                            }
                                            errorAlert.velocity('transition.slideUpIn',{
                                                duration: 500
                                            });
                                        }else{
                                            // store new/updated user data -> update head
                                            Util.setCurrentUserData(responseData.userData);

                                            dialogElement.find('.alert').velocity('transition.slideDownOut',{
                                                duration: 500,
                                                complete: function(){
                                                    // switch tab
                                                    changeTab();
                                                }
                                            });


                                        }

                                        Util.showNotify({title: 'Account data saved', type: 'success'});
                                    }).fail(function( jqXHR, status, error) {
                                        var reason = status + ' ' + error;
                                        Util.showNotify({title: jqXHR.status + ': saveConfig', text: reason, type: 'warning'});
                                        $(document).setProgramStatus('problem');

                                        // close dialog
                                        selectCharacterDialog.modal('hide');
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
                                    mainCharacter = characters[i].characterId;
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

                            dialogElement.find('#pf-dialog-settings-character form').html(content);

                            var imageWrapperElements = dialogElement.find('.' + config.settingsImageWrapperClass);


                            // special effects :)
                            imageWrapperElements.velocity('stop').delay(100).velocity('transition.flipBounceXIn', {
                                display: 'inline-block',
                                stagger: 60,
                                drag: true,
                                duration: 400,
                                complete: function(){
                                    // init all tooltips
                                    var tooltipElements = dialogElement.find('[title]');
                                    tooltipElements.tooltip({
                                        placement: 'top',
                                        container:  dialogElement
                                    });
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


                // API Tab ================================================================================
                dialogElement.find('.' + config.settingsCloneRowButtonClass).on('click', function(){
                    var cloneRow = dialogElement.find('.' + config.settingsCloneApiRowClass).last();
                    var newApiRow = cloneRow.clone(true);

                    newApiRow.find('input').val('');
                    cloneRow.after(newApiRow);
                });

                dialogElement.find('.' + config.settingsDeleteRowButtonClass).on('click', function(){
                   $(this).parents('.row').remove();
                });

            });



        });

    };

});