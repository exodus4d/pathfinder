/**
 *  map module dialogs
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
        newMapDialogId: 'pf-map-new-dialog'                                     // id for edit/update map dialog
    };

    /**
     * shows the add/edit map dialog
     * @param mapData
     */
    $.fn.showNewMapDialog = function(mapData){

        var formData = {};

        // check if dialog is already open
        var mapInfoDialogElement = $('#' + config.newMapDialogId);
        if(!mapInfoDialogElement.is(':visible')){

            requirejs(['text!templates/dialog/map.html', 'mustache'], function(template, Mustache) {

                var data = {
                    id: config.newMapDialogId,
                    scope: Util.getMapScopes(),
                    type: Util.getMapTypes(),
                    icon: Util.getMapIcons(),
                    formData: formData
                };

                var content = Mustache.render(template, data);

                var dialogTitle = 'Create new map';
                var dialogSaveButton = 'add map';
                if(mapData !== false){
                    dialogTitle = 'Edit map';
                    dialogSaveButton = 'save map';
                    content = $(content);
                    content.find('input[name="id"]').val( mapData.config.id );
                    content.find('select[name="icon"]').val( mapData.config.icon );
                    content.find('input[name="name"]').val( mapData.config.name );
                    content.find('select[name="scopeId"]').val( mapData.config.scope.id );
                    content.find('select[name="typeId"]').val( mapData.config.type.id );
                }

                var mapInfoDialog = bootbox.dialog({
                    title: dialogTitle,
                    message: content,
                    buttons: {
                        close: {
                            label: 'cancel',
                            className: 'btn-default'
                        },
                        success: {
                            label: '<i class="fa fa-code-fork fa-fw"></i>' + dialogSaveButton,
                            className: 'btn-primary',
                            callback: function() {

                                // get form Values
                                var form = $('#' + config.newMapDialogId).find('form');

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