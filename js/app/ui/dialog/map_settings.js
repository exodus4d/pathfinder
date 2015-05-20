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
        newMapDialogId: 'pf-map-new-dialog',                                            // id for edit/update map dialog
        dialogMapCreateContainerId: 'pf-map-dialog-create',                             // id for the "new map" container
        dialogMapEditContainerId: 'pf-map-dialog-edit',                                 // id for the "edit" container
        dialogMapSettingsContainerId: 'pf-map-dialog-settings',                         // id for the "settings" container

        dialogMessageContainerId: 'pf-map-dialog-message-container'                     // id for dialog form message container

    };

    /**
     * shows the add/edit map dialog
     * @param mapData
     */
    $.fn.showMapSettingsDialog = function(mapData){

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
                    icon: Util.getMapIcons()
                };

                // render "new map" tab content -------------------------------------------
                var contentNewMap = Mustache.render(templateMapSettings, data);

                // render "edit map" tab content ------------------------------------------
                var contentEditMap = Mustache.render(templateMapSettings, data);
                contentEditMap = $(contentEditMap);

                if(mapData !== false){
                    contentEditMap.find('input[name="id"]').val( mapData.config.id );
                    contentEditMap.find('select[name="icon"]').val( mapData.config.icon );
                    contentEditMap.find('input[name="name"]').val( mapData.config.name );
                    contentEditMap.find('select[name="scopeId"]').val( mapData.config.scope.id );
                    contentEditMap.find('select[name="typeId"]').val( mapData.config.type.id );
                }

                // render main dialog -----------------------------------------------------
                data = {
                    id: config.newMapDialogId,
                    dialogMapCreateContainerId: config.dialogMapCreateContainerId,
                    dialogMapEditContainerId: config.dialogMapEditContainerId,
                    dialogMapSettingsContainerId: config.dialogMapSettingsContainerId,
                    dialogMessageContainerId: config.dialogMessageContainerId,
                    hideEditTab: hideEditTab,
                    hideSettingsTab: hideSettingsTab
                };

                var contentDialog = Mustache.render(templateMapDialog, data);
                contentDialog = $(contentDialog);

                // set tab content
                $('#' + config.dialogMapCreateContainerId, contentDialog).html(contentNewMap);
                $('#' + config.dialogMapEditContainerId, contentDialog).html(contentEditMap);

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
console.log(form)
                                // validate form
                                form.validator('validate');

                                // check weather the form is valid
                                var formValid = form.isValidForm();

                                if(formValid === true){

                                    var newMapData = {mapData: form.getFormValues()};

                                    $.ajax({
                                        type: 'POST',
                                        url: Init.path.saveMap,
                                        data: newMapData,
                                        dataType: 'json'
                                    }).done(function(data){
                                        Util.showNotify({title: dialogTitle, text: 'Map: ' + data.name, type: 'success'});

                                        $(mapInfoDialog).modal('hide');
                                        $(document).trigger('pf:closeMenu', [{}]);
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
                    mapInfoDialog.find('form').validator();

                    if(mapData === false){
                        // no map data found (probably new user
                        $('#' + config.dialogMessageContainerId).showMessage({type: 'warning', title: 'No maps found', text: 'Create a new map before you can start'});
                    }
                });

            });
        }
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