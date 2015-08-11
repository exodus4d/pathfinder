/**
 *  map settings dialogs
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
        // map dialog
        newMapDialogId: 'pf-map-dialog',                                                // id for map settings dialog
        dialogMapCreateContainerId: 'pf-map-dialog-create',                             // id for the "new map" container
        dialogMapEditContainerId: 'pf-map-dialog-edit',                                 // id for the "edit" container
        dialogMapSettingsContainerId: 'pf-map-dialog-settings',                         // id for the "settings" container

        userSelectId: 'pf-map-dialog-user-select',                                      // id for "user" select
        corporationSelectId: 'pf-map-dialog-corporation-select',                        // id for "corporation" select
        allianceSelectId: 'pf-map-dialog-alliance-select'                               // id for "alliance" select

    };

    /**
     * shows the add/edit map dialog
     * @param mapData
     * @param options
     */
    $.fn.showMapSettingsDialog = function(mapData, options){

        // check if dialog is already open
        var mapInfoDialogElement = $('#' + config.newMapDialogId);
        if(!mapInfoDialogElement.is(':visible')){

            requirejs([
                'text!templates/dialog/map.html',
                'text!templates/form/map_settings.html',
                'mustache'
            ], function(templateMapDialog, templateMapSettings, Mustache) {

                var dialogTitle = 'Map settings';

                // if there are no maps -> hide settings tab
                var hideSettingsTab = false;
                var hideEditTab = false;

                if(mapData === false){
                    hideSettingsTab = true;
                    hideEditTab = true;
                }

                var data = {
                    scope: Util.getMapScopes(),
                    type: Util.getMapTypes(true),
                    icon: Util.getMapIcons(),
                    formErrorContainerClass: Util.config.formErrorContainerClass,
                    formWarningContainerClass: Util.config.formWarningContainerClass,
                    formInfoContainerClass: Util.config.formInfoContainerClass
                };

                // render "new map" tab content -------------------------------------------
                var contentNewMap = Mustache.render(templateMapSettings, data);

                // render "edit map" tab content ------------------------------------------
                var contentEditMap = Mustache.render(templateMapSettings, data);
                contentEditMap = $(contentEditMap);

                // current map access info
                var accessUser = [];
                var accessCorporation = [];
                var accessAlliance = [];

                if(mapData !== false){
                    // set current map information
                    contentEditMap.find('input[name="id"]').val( mapData.config.id );
                    contentEditMap.find('select[name="icon"]').val( mapData.config.icon );
                    contentEditMap.find('input[name="name"]').val( mapData.config.name );
                    contentEditMap.find('select[name="scopeId"]').val( mapData.config.scope.id );
                    contentEditMap.find('select[name="typeId"]').val( mapData.config.type.id );

                    accessUser = mapData.config.access.user;
                    accessCorporation = mapData.config.access.corporation;
                    accessAlliance = mapData.config.access.alliance;
                }

                // render main dialog -----------------------------------------------------
                data = {
                    id: config.newMapDialogId,

                    // default open tab ----------
                    openTabNew: options.tab === 'new',
                    openTabEdit: options.tab === 'edit',
                    openTabSettings: options.tab === 'settings',

                    dialogMapCreateContainerId: config.dialogMapCreateContainerId,
                    dialogMapEditContainerId: config.dialogMapEditContainerId,
                    dialogMapSettingsContainerId: config.dialogMapSettingsContainerId,

                    hideEditTab: hideEditTab,
                    hideSettingsTab: hideSettingsTab,

                    // settings tab --------------
                    userSelectId: config.userSelectId,
                    corporationSelectId: config.corporationSelectId,
                    allianceSelectId: config.allianceSelectId,

                    // map access objects --------
                    accessUser: accessUser,
                    accessCorporation: accessCorporation,
                    accessAlliance: accessAlliance,

                    // access limitations --------
                    maxUser: Init.maxSharedCount.user,
                    maxCorporation: Init.maxSharedCount.corporation,
                    maxAlliance: Init.maxSharedCount.alliance
                };

                var contentDialog = Mustache.render(templateMapDialog, data);
                contentDialog = $(contentDialog);

                // set mapId for "settings" tab
                if(mapData !== false){
                    contentDialog.find('input[name="id"]').val( mapData.config.id );
                }


                // set tab content
                $('#' + config.dialogMapCreateContainerId, contentDialog).html(contentNewMap);
                $('#' + config.dialogMapEditContainerId, contentDialog).html(contentEditMap);

                // disable modal focus event -> otherwise select2 is not working! -> quick fix
                $.fn.modal.Constructor.prototype.enforceFocus = function() {};

                var mapInfoDialog = bootbox.dialog({
                    title: dialogTitle,
                    message: contentDialog,
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
                                var form = $('#' + config.newMapDialogId).find('form').filter(':visible');

                                // validate form
                                form.validator('validate');

                                // validate select2 fields (settings tab)
                                form.find('select').each(function(){
                                    var selectField = $(this);
                                    var selectValues = selectField.val();

                                    if(selectValues === null){
                                        selectField.parents('.form-group').addClass('has-error');
                                    }else{
                                        selectField.parents('.form-group').removeClass('has-error');
                                    }
                                });

                                // check weather the form is valid
                                var formValid = form.isValidForm();

                                if(formValid === true){

                                    // lock dialog
                                    var dialogContent = mapInfoDialog.find('.modal-content');
                                    dialogContent.showLoadingAnimation();

                                    var newMapData = {formData: form.getFormValues()};

                                    $.ajax({
                                        type: 'POST',
                                        url: Init.path.saveMap,
                                        data: newMapData,
                                        dataType: 'json'
                                    }).done(function(responseData){

                                        dialogContent.hideLoadingAnimation();

                                        if(responseData.error.length > 0){
                                            form.showFormMessage(responseData.error);
                                        }else{
                                            // success
                                            Util.showNotify({title: dialogTitle, text: 'Map: ' + responseData.mapData.mapData.name, type: 'success'});

                                            // update map-tab Element
                                            var tabLinkElement = Util.getMapModule().getMapTabElements(responseData.mapData.mapData.id);
                                            if(tabLinkElement.length === 1){
                                                tabLinkElement.updateTabData(responseData.mapData.mapData);
                                            }

                                            $(mapInfoDialog).modal('hide');
                                            $(document).trigger('pf:closeMenu', [{}]);
                                        }
                                    }).fail(function( jqXHR, status, error) {
                                        var reason = status + ' ' + error;
                                        Util.showNotify({title: jqXHR.status + ': saveMap', text: reason, type: 'warning'});
                                        $(document).setProgramStatus('problem');

                                    });
                                }

                                return false;
                            }
                        }
                    }
                });


                // after modal is shown =======================================================================
                mapInfoDialog.on('shown.bs.modal', function(e) {

                    mapInfoDialog.initTooltips();

                    // set form validator
                    mapInfoDialog.find('form').initFormValidation();

                    // events for tab change
                    mapInfoDialog.find('.navbar a').on('shown.bs.tab', function (e) {

                        var selectElementUser = mapInfoDialog.find('#' + config.userSelectId);
                        var selectElementCorporation = mapInfoDialog.find('#' + config.corporationSelectId);
                        var selectElementAlliance = mapInfoDialog.find('#' + config.allianceSelectId);

                        if($(e.target).attr('href') === '#' + config.dialogMapSettingsContainerId){
                            // "settings" tab

                            initSettingsSelectFields(mapInfoDialog);
                        }else{
                            if( $(selectElementUser).data('select2') !== undefined ){
                                $(selectElementUser).select2('destroy');
                            }

                            if( $(selectElementCorporation).data('select2') !== undefined ){
                                $(selectElementCorporation).select2('destroy');
                            }

                            if( $(selectElementAlliance).data('select2') !== undefined ){
                                $(selectElementAlliance).select2('destroy');
                            }
                        }
                    });

                    // show form messages -------------------------------------
                    // get current active form(tab)
                    var form = $('#' + config.newMapDialogId).find('form').filter(':visible');

                    form.showFormMessage([{type: 'info', message: 'Creating new maps or change settings may take a few seconds'}]);

                    if(mapData === false){
                        // no map data found (probably new user
                        form.showFormMessage([{type: 'warning', message: 'No maps found. Create a new map before you can start'}]);
                    }
                });

                // init select fields in case "settings" tab is open by default
                if(options.tab === 'settings'){
                    initSettingsSelectFields(mapInfoDialog);
                }

            });
        }
    };


    /**
     * init select2 fields within the settings dialog
     * @param mapInfoDialog
     */
    var initSettingsSelectFields = function(mapInfoDialog){

        var selectElementUser = mapInfoDialog.find('#' + config.userSelectId);
        var selectElementCorporation = mapInfoDialog.find('#' + config.corporationSelectId);
        var selectElementAlliance = mapInfoDialog.find('#' + config.allianceSelectId);

        // init corporation select live search
        selectElementUser.initAccessSelect({
            type: 'user',
            maxSelectionLength: Init.maxSharedCount.user
        });

        // init corporation select live search
        selectElementCorporation.initAccessSelect({
            type: 'corporation',
            maxSelectionLength: Init.maxSharedCount.corporation
        });

        // init alliance select live search
        selectElementAlliance.initAccessSelect({
            type: 'alliance',
            maxSelectionLength: Init.maxSharedCount.alliance
        });
    };

    /**
     * shows the delete map Dialog
     * @param mapElement
     */
    $.fn.showDeleteMapDialog = function(mapData){

        var mapName = mapData.config.name;

        var mapDeleteDialog = bootbox.confirm('Delete map "' + mapName + '"?', function(result){
            if(result){

                var data = {mapData: mapData.config};

                $.ajax({
                    type: 'POST',
                    url: Init.path.deleteMap,
                    data: data,
                    dataType: 'json'
                }).done(function(data){
                    Util.showNotify({title: 'Map deleted', text: 'Map: ' + mapName, type: 'success'});

                    $(mapDeleteDialog).modal('hide');
                }).fail(function( jqXHR, status, error) {
                    var reason = status + ' ' + error;
                    Util.showNotify({title: jqXHR.status + ': deleteMap', text: reason, type: 'warning'});
                    $(document).setProgramStatus('problem');
                });

                return false;
            }
        });

    };


});