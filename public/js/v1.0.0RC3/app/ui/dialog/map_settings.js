/**
 *  map settings dialogs
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'app/ccp'
], function($, Init, Util, Render, bootbox, CCP) {
    'use strict';

    var config = {
        // map dialog
        newMapDialogId: 'pf-map-dialog',                                                // id for map settings dialog
        dialogMapCreateContainerId: 'pf-map-dialog-create',                             // id for the "new map" container
        dialogMapEditContainerId: 'pf-map-dialog-edit',                                 // id for the "edit" container
        dialogMapSettingsContainerId: 'pf-map-dialog-settings',                         // id for the "settings" container
        dialogMapDownloadContainerId: 'pf-map-dialog-download',                         // id for the "download" container

        characterSelectId: 'pf-map-dialog-character-select',                            // id for "character" select
        corporationSelectId: 'pf-map-dialog-corporation-select',                        // id for "corporation" select
        allianceSelectId: 'pf-map-dialog-alliance-select',                              // id for "alliance" select

        dialogMapExportFormId: 'pf-map-dialog-form-export',                             // id for "export" form
        dialogMapImportFormId: 'pf-map-dialog-form-import',                             // id for "import" form

        buttonExportId: 'pf-map-dialog-button-export',                                  // id for "export" button
        buttonImportId: 'pf-map-dialog-button-import',                                  // id for "import" button

        fieldExportId: 'pf-map-filename-export',                                        // id for "export" filename field
        fieldImportId: 'pf-map-filename-import',                                        // id for "import" filename field
        dialogMapImportInfoId: 'pf-map-import-container',                               // id for "info" container
        dragDropElementClass: 'pf-form-dropzone'                                        // class for "drag&drop" zone
    };

    /**
     * format a given string into a valid filename
     * @param filename
     * @returns {string}
     */
    var formatFilename = function(filename){
        filename = filename.replace(/[^a-zA-Z0-9]/g,'_');

        var nowDate = new Date();
        var filenameDate = nowDate.toISOString().slice(0,10).replace(/-/g, '_');

        return  (filename + '_' + filenameDate).replace(/__/g,'_');
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
                var hideDownloadTab = false;

                if(mapData === false){
                    hideSettingsTab = true;
                    hideEditTab = true;
                    hideDownloadTab = true;
                }

                // available map "types" for a new or existing map
                var mapTypes = Util.getMapTypes(true);

                var data = {
                    scope: Util.getMapScopes(),
                    type: mapTypes,
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
                var accessCharacter = [];
                var accessCorporation = [];
                var accessAlliance = [];

                if(mapData !== false){
                    // set current map information
                    contentEditMap.find('input[name="id"]').val( mapData.config.id );
                    contentEditMap.find('select[name="icon"]').val( mapData.config.icon );
                    contentEditMap.find('input[name="name"]').val( mapData.config.name );
                    contentEditMap.find('select[name="scopeId"]').val( mapData.config.scope.id );
                    contentEditMap.find('select[name="typeId"]').val( mapData.config.type.id );

                    accessCharacter = mapData.config.access.character;
                    accessCorporation = mapData.config.access.corporation;
                    accessAlliance = mapData.config.access.alliance;
                }

                // render main dialog -----------------------------------------------------
                data = {
                    id: config.newMapDialogId,
                    mapData: mapData,
                    type: mapTypes,
                    isInGameBrowser: CCP.isInGameBrowser(),

                    // message container
                    formErrorContainerClass: Util.config.formErrorContainerClass,
                    formWarningContainerClass: Util.config.formWarningContainerClass,
                    formInfoContainerClass: Util.config.formInfoContainerClass,

                    // default open tab ----------
                    openTabNew: options.tab === 'new',
                    openTabEdit: options.tab === 'edit',
                    openTabSettings: options.tab === 'settings',
                    openTabDownload: options.tab === 'download',

                    dialogMapCreateContainerId: config.dialogMapCreateContainerId,
                    dialogMapEditContainerId: config.dialogMapEditContainerId,
                    dialogMapSettingsContainerId: config.dialogMapSettingsContainerId,
                    dialogMapDownloadContainerId: config.dialogMapDownloadContainerId,

                    hideEditTab: hideEditTab,
                    hideSettingsTab: hideSettingsTab,
                    hideDownloadTab: hideDownloadTab,

                    // settings tab --------------
                    characterSelectId: config.characterSelectId,
                    corporationSelectId: config.corporationSelectId,
                    allianceSelectId: config.allianceSelectId,

                    // map access objects --------
                    accessCharacter: accessCharacter,
                    accessCorporation: accessCorporation,
                    accessAlliance: accessAlliance,

                    // access limitations --------
                    maxCharacter: Init.maxSharedCount.character,
                    maxCorporation: Init.maxSharedCount.corporation,
                    maxAlliance: Init.maxSharedCount.alliance,

                    // download tab --------------
                    dialogMapExportFormId: config.dialogMapExportFormId,
                    dialogMapImportFormId: config.dialogMapImportFormId,
                    buttonExportId: config.buttonExportId,
                    buttonImportId: config.buttonImportId,
                    fieldExportId: config.fieldExportId,
                    fieldImportId: config.fieldImportId,
                    dialogMapImportInfoId: config.dialogMapImportInfoId,

                    formatFilename: function(){
                        // format filename from "map name" (initial)
                        return function (mapName, render) {
                            var filename = render(mapName);
                            return formatFilename(filename);
                        };
                    }
                };

                var contentDialog = Mustache.render(templateMapDialog, data);
                contentDialog = $(contentDialog);

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

                                        if(responseData.error.length){
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
                mapInfoDialog.on('shown.bs.modal', function(e){

                    mapInfoDialog.initTooltips();

                    // prevent "disabled" tabs from being clicked... "bootstrap" bugFix...
                    mapInfoDialog.find('.navbar a[data-toggle=tab]').on('click', function(e){
                        if ($(this).hasClass('disabled')){
                            e.preventDefault();
                            return false;
                        }
                    });

                    // set form validator
                    mapInfoDialog.find('form').initFormValidation();

                    // events for tab change
                    mapInfoDialog.find('.navbar a').on('shown.bs.tab', function(e){

                        var selectElementCharacter = mapInfoDialog.find('#' + config.characterSelectId);
                        var selectElementCorporation = mapInfoDialog.find('#' + config.corporationSelectId);
                        var selectElementAlliance = mapInfoDialog.find('#' + config.allianceSelectId);

                        if($(e.target).attr('href') === '#' + config.dialogMapSettingsContainerId){
                            // "settings" tab
                            initSettingsSelectFields(mapInfoDialog);
                        }else{
                            if( $(selectElementCharacter).data('select2') !== undefined ){
                                $(selectElementCharacter).select2('destroy');
                            }

                            if( $(selectElementCorporation).data('select2') !== undefined ){
                                $(selectElementCorporation).select2('destroy');
                            }

                            if( $(selectElementAlliance).data('select2') !== undefined ){
                                $(selectElementAlliance).select2('destroy');
                            }
                        }

                        // no "save" dialog  button on "in/export" tab
                        if($(e.target).attr('href') === '#' + config.dialogMapDownloadContainerId){
                            mapInfoDialog.find('button.btn-success').hide();
                        }else{
                            mapInfoDialog.find('button.btn-success').show();
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

                    // init select fields in case "settings" tab is open by default
                    if(options.tab === 'settings'){
                        initSettingsSelectFields(mapInfoDialog);
                    }

                    // init "download tab" ========================================================================
                    var downloadTabElement = mapInfoDialog.find('#' + config.dialogMapDownloadContainerId);
                    if(downloadTabElement.length){
                        // tab exists

                        // export map data ------------------------------------------------------------------------
                        downloadTabElement.find('#' + config.buttonExportId).on('click', { mapData: mapData }, function(e){

                            var exportForm = $('#' + config.dialogMapExportFormId);
                            var validExportForm = exportForm.isValidForm();

                            if(validExportForm){
                                // set map data right before download
                                $(this).setExportMapData(e.data.mapData);
                            }else{
                                e.preventDefault();
                            }
                        });

                        // import map data ------------------------------------------------------------------------
                        // check if "FileReader" API is supported
                        var importFormElement = downloadTabElement.find('#' + config.dialogMapImportFormId);
                        if(window.File && window.FileReader && window.FileList && window.Blob){

                            // show file info in UI
                            downloadTabElement.find('#' + config.fieldImportId).on('change', function(e){
                                e.stopPropagation();
                                e.preventDefault();

                                var infoContainerElement = importFormElement.find('#' + config.dialogMapImportInfoId);
                                infoContainerElement.hide().empty();
                                importFormElement.hideFormMessage('all');

                                var output = [];
                                var files = e.target.files;

                                for (var i = 0, f; !!(f = files[i]); i++) {
                                    output.push(( i + 1 ) + '. file: ' + f.name + ' - ' +
                                        f.size + ' bytes; last modified: ' +
                                        f.lastModifiedDate.toLocaleDateString() );
                                }

                                if(output.length > 0){
                                    infoContainerElement.html( output ).show();
                                }

                                importFormElement.validator('validate');
                            });

                            // drag&drop
                            var importData = {};
                            importData.mapData = [];
                            var files = [];
                            var filesCount = 0;
                            var filesCountFail = 0;

                            // onLoad for FileReader API
                            var readerOnLoad = function(readEvent) {

                                // get file content
                                try{
                                    importData.mapData.push( JSON.parse( readEvent.target.result ) );
                                }catch(error){
                                    filesCountFail++;
                                    importFormElement.showFormMessage([{type: 'error', message: 'File can not be parsed'}]);
                                }

                                // start import when all files are parsed
                                if(
                                    filesCount === files.length &&
                                    filesCountFail === 0
                                ){
                                    importMaps(importData);
                                }
                            };

                            var handleDragOver = function(dragEvent) {
                                dragEvent.stopPropagation();
                                dragEvent.preventDefault();
                                dragEvent.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
                            };

                            var handleFileSelect = function(evt){
                                evt.stopPropagation();
                                evt.preventDefault();

                                importData = importFormElement.getFormValues();
                                importData.mapData = [];
                                filesCount = 0;
                                filesCountFail = 0;

                                files = evt.dataTransfer.files; // FileList object.

                                for (var file; !!(file = files[filesCount]); filesCount++){
                                    var reader = new FileReader();
                                    reader.onload = readerOnLoad;
                                    reader.readAsText(file);
                                }
                            };

                            var dropZone = downloadTabElement.find('.' + config.dragDropElementClass);
                            dropZone[0].addEventListener('dragover', handleDragOver, false);
                            dropZone[0].addEventListener('drop', handleFileSelect, false);

                            // import "button"
                            downloadTabElement.find('#' + config.buttonImportId).on('click', function(e) {

                                importFormElement.validator('validate');
                                var validImportForm = importFormElement.isValidForm();

                                if(validImportForm){
                                    importData = importFormElement.getFormValues();
                                    importData.mapData = [];

                                    var fileElement = downloadTabElement.find('#' + config.fieldImportId);
                                    files = fileElement[0].files;
                                    filesCount = 0;
                                    filesCountFail = 0;

                                    for (var file; !!(file = files[filesCount]); filesCount++){
                                        var reader = new FileReader();
                                        reader.onload = readerOnLoad;
                                        reader.readAsText(file);
                                    }
                                }
                            });
                        }else{
                            importFormElement.showFormMessage([{type: 'error', message: 'The File APIs are not fully supported in this browser.'}]);
                        }
                    }
                });
            });
        }
    };

    /**
     * import new map(s) data
     * @param importData
     */
    var importMaps = function(importData){

        var importForm = $('#' + config.dialogMapImportFormId);
        importForm.hideFormMessage('all');

        // lock dialog
        var dialogContent = importForm.parents('.modal-content');
        dialogContent.showLoadingAnimation();

        $.ajax({
            type: 'POST',
            url: Init.path.importMap,
            data: importData,
            dataType: 'json'
        }).done(function(responseData){
            if(responseData.error.length){
                //   form.showFormMessage(responseData.error);
                importForm.showFormMessage(responseData.error);
            }else{
                // success

                Util.showNotify({title: 'Import finished', text: 'Map(s) imported', type: 'success'});
            }
        }).fail(function( jqXHR, status, error) {
            var reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': importMap', text: reason, type: 'error'});
        }).always(function() {
            importForm.find('input, select').resetFormFields().trigger('change');
            dialogContent.hideLoadingAnimation();
        });
    };

    /**
     * set json map data for export to an element (e.g. <a>-Tag or button) for download
     * @param mapData
     * @returns {*}
     */
    $.fn.setExportMapData = function(mapData){

        var fieldExport = $('#' + config.fieldExportId);
        var filename = '';
        var mapDataEncoded = '';

        if(fieldExport.length){
            filename = fieldExport.val();

            if(filename.length > 0){
                // remove object properties that should not be included in export
                // -> e.g. jsPlumb object,...
                var allowedKeys = ['config', 'data'];

                var replace = function(obj, keys) {
                    var dup = {};
                    for (var key in obj) {
                        if (keys.indexOf(key) !== -1) {
                            dup[key] = obj[key];
                        }
                    }
                    return dup;
                };

                mapDataEncoded = 'text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify( replace(mapData, allowedKeys) ));
            }
        }

        return this.each(function(){
            var exportButton = $(this);
            exportButton.attr('href', 'data:' + mapDataEncoded);
            exportButton.attr('download', filename + '.json');
        });
    };


    /**
     * init select2 fields within the settings dialog
     * @param mapInfoDialog
     */
    var initSettingsSelectFields = function(mapInfoDialog){

        var selectElementCharacter = mapInfoDialog.find('#' + config.characterSelectId);
        var selectElementCorporation = mapInfoDialog.find('#' + config.corporationSelectId);
        var selectElementAlliance = mapInfoDialog.find('#' + config.allianceSelectId);

        // init character select live search
        selectElementCharacter.initAccessSelect({
            type: 'character',
            maxSelectionLength: Init.maxSharedCount.character
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
     * @param mapData
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