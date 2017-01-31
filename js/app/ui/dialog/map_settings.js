/**
 *  map settings dialogs
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox',
    'app/map/util'
], function($, Init, Util, Render, bootbox, MapUtil) {
    'use strict';

    let config = {
        // map dialog
        newMapDialogId: 'pf-map-dialog',                                                // id for map settings dialog
        dialogMapCreateContainerId: 'pf-map-dialog-create',                             // id for the "new map" container
        dialogMapEditContainerId: 'pf-map-dialog-edit',                                 // id for the "edit" container
        dialogMapSettingsContainerId: 'pf-map-dialog-settings',                         // id for the "settings" container
        dialogMapDownloadContainerId: 'pf-map-dialog-download',                         // id for the "download" container

        deleteExpiredConnectionsId: 'pf-map-dialog-delete-connections',                 // id for "deleteExpiredConnections" checkbox

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
    let formatFilename = function(filename){
        filename = filename.replace(/[^a-zA-Z0-9]/g,'_');

        let nowDate = new Date();
        let filenameDate = nowDate.toISOString().slice(0,10).replace(/-/g, '_');

        return  (filename + '_' + filenameDate).replace(/__/g,'_');
    };

    /**
     * shows the add/edit map dialog
     * @param mapData
     * @param options
     */
    $.fn.showMapSettingsDialog = function(mapData, options){

        // check if dialog is already open
        let mapInfoDialogElement = $('#' + config.newMapDialogId);
        if(!mapInfoDialogElement.is(':visible')){

            requirejs([
                'text!templates/dialog/map.html',
                'text!templates/form/map_settings.html',
                'mustache'
            ], function(templateMapDialog, templateMapSettings, Mustache) {

                let dialogTitle = 'Map settings';

                // if there are no maps -> hide settings tab
                let hideSettingsTab = false;
                let hideEditTab = false;
                let hideDownloadTab = false;

                if(mapData === false){
                    hideSettingsTab = true;
                    hideEditTab = true;
                    hideDownloadTab = true;
                }

                // available map "types" for a new or existing map
                let mapTypes = MapUtil.getMapTypes(true);

                let data = {
                    scope: MapUtil.getMapScopes(),
                    type: mapTypes,
                    icon: MapUtil.getMapIcons(),
                    formErrorContainerClass: Util.config.formErrorContainerClass,
                    formWarningContainerClass: Util.config.formWarningContainerClass,
                    formInfoContainerClass: Util.config.formInfoContainerClass
                };

                // render "new map" tab content -------------------------------------------
                let contentNewMap = Mustache.render(templateMapSettings, data);

                // render "edit map" tab content ------------------------------------------
                let contentEditMap = Mustache.render(templateMapSettings, data);
                contentEditMap = $(contentEditMap);

                // current map access info
                let accessCharacter = [];
                let accessCorporation = [];
                let accessAlliance = [];
                let deleteExpiredConnections = true;

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

                    deleteExpiredConnections = mapData.config.deleteExpiredConnections;
                }

                // render main dialog -----------------------------------------------------
                data = {
                    id: config.newMapDialogId,
                    mapData: mapData,
                    type: mapTypes,

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
                    deleteExpiredConnectionsId : config.deleteExpiredConnectionsId,
                    deleteExpiredConnections: deleteExpiredConnections,

                    characterSelectId: config.characterSelectId,
                    corporationSelectId: config.corporationSelectId,
                    allianceSelectId: config.allianceSelectId,

                    // map access objects --------
                    accessCharacter: accessCharacter,
                    accessCorporation: accessCorporation,
                    accessAlliance: accessAlliance,

                    // access limitations --------
                    maxCharacter: Init.mapTypes.private.defaultConfig.max_shared,
                    maxCorporation: Init.mapTypes.corporation.defaultConfig.max_shared,
                    maxAlliance: Init.mapTypes.alliance.defaultConfig.max_shared,

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
                            let filename = render(mapName);
                            return formatFilename(filename);
                        };
                    }
                };

                let contentDialog = Mustache.render(templateMapDialog, data);
                contentDialog = $(contentDialog);

                // set tab content
                $('#' + config.dialogMapCreateContainerId, contentDialog).html(contentNewMap);
                $('#' + config.dialogMapEditContainerId, contentDialog).html(contentEditMap);

                let mapInfoDialog = bootbox.dialog({
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
                                let form = $('#' + config.newMapDialogId).find('form').filter(':visible');

                                // validate form
                                form.validator('validate');

                                // validate select2 fields (settings tab)
                                form.find('select').each(function(){
                                    let selectField = $(this);
                                    let selectValues = selectField.val();

                                    if(selectValues.length > 0){
                                        selectField.parents('.form-group').removeClass('has-error');
                                    }else{
                                        selectField.parents('.form-group').addClass('has-error');
                                    }
                                });

                                // check whether the form is valid
                                let formValid = form.isValidForm();

                                if(formValid === true){

                                    // lock dialog
                                    let dialogContent = mapInfoDialog.find('.modal-content');
                                    dialogContent.showLoadingAnimation();

                                    // get form data
                                    let formData = form.getFormValues();

                                    // checkbox fix -> settings tab
                                    if( form.find('#' + config.deleteExpiredConnectionsId).length ){
                                        formData.deleteExpiredConnections = formData.hasOwnProperty('deleteExpiredConnections') ? parseInt( formData.deleteExpiredConnections ) : 0;
                                    }

                                    let requestData = {formData: formData};

                                    $.ajax({
                                        type: 'POST',
                                        url: Init.path.saveMap,
                                        data: requestData,
                                        dataType: 'json'
                                    }).done(function(responseData){

                                        dialogContent.hideLoadingAnimation();

                                        if(responseData.error.length){
                                            form.showFormMessage(responseData.error);
                                        }else{
                                            // success
                                            Util.showNotify({title: dialogTitle, text: 'Map: ' + responseData.mapData.mapData.name, type: 'success'});

                                            // update map-tab Element
                                            let tabLinkElement = Util.getMapModule().getMapTabElements(responseData.mapData.mapData.id);

                                            if(tabLinkElement.length === 1){
                                                tabLinkElement.updateTabData(responseData.mapData.mapData);
                                            }

                                            $(mapInfoDialog).modal('hide');
                                            $(document).trigger('pf:closeMenu', [{}]);
                                        }
                                    }).fail(function( jqXHR, status, error) {
                                        let reason = status + ' ' + error;
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

                    // show form messages -------------------------------------
                    // get current active form(tab)
                    let form = $('#' + config.newMapDialogId).find('form').filter(':visible');

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
                    let downloadTabElement = mapInfoDialog.find('#' + config.dialogMapDownloadContainerId);
                    if(downloadTabElement.length){
                        // tab exists

                        // export map data ------------------------------------------------------------------------
                        downloadTabElement.find('#' + config.buttonExportId).on('click', { mapData: mapData }, function(e){

                            let exportForm = $('#' + config.dialogMapExportFormId);
                            let validExportForm = exportForm.isValidForm();

                            if(validExportForm){
                                let mapElement = Util.getMapModule().getActiveMap();

                                if(mapElement){
                                    // IMPORTANT: Get map data from client (NOT from global mapData which is available in here)
                                    // -> This excludes some data (e.g. wh statics)
                                    // -> Bring export inline with main map toggle requests
                                    let exportMapData = mapElement.getMapDataFromClient({
                                        forceData: true,
                                        getAll: true
                                    });

                                    // set map data right before download
                                    $(this).setExportMapData(exportMapData);

                                    // disable button
                                    $(this).attr('disabled', true);
                                }else{
                                    console.error('Map not found');
                                }
                            }else{
                                e.preventDefault();
                            }
                        });

                        // import map data ------------------------------------------------------------------------
                        // check if "FileReader" API is supported
                        let importFormElement = downloadTabElement.find('#' + config.dialogMapImportFormId);
                        if(window.File && window.FileReader && window.FileList && window.Blob){

                            // show file info in UI
                            downloadTabElement.find('#' + config.fieldImportId).on('change', function(e){
                                e.stopPropagation();
                                e.preventDefault();

                                let infoContainerElement = importFormElement.find('#' + config.dialogMapImportInfoId);
                                infoContainerElement.hide().empty();
                                importFormElement.hideFormMessage('all');

                                let output = [];
                                let files = e.target.files;

                                for (let i = 0, f; !!(f = files[i]); i++) {
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
                            let importData = {};
                            importData.mapData = [];
                            let files = [];
                            let filesCount = 0;
                            let filesCountFail = 0;

                            // onLoad for FileReader API
                            let readerOnLoad = function(readEvent) {

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

                            let handleDragOver = function(dragEvent) {
                                dragEvent.stopPropagation();
                                dragEvent.preventDefault();
                                dragEvent.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
                            };

                            let handleFileSelect = function(evt){
                                evt.stopPropagation();
                                evt.preventDefault();

                                importData = importFormElement.getFormValues();
                                importData.mapData = [];
                                filesCount = 0;
                                filesCountFail = 0;

                                files = evt.dataTransfer.files; // FileList object.

                                for (let file; !!(file = files[filesCount]); filesCount++){
                                    let reader = new FileReader();
                                    reader.onload = readerOnLoad;
                                    reader.readAsText(file);
                                }
                            };

                            let dropZone = downloadTabElement.find('.' + config.dragDropElementClass);
                            dropZone[0].addEventListener('dragover', handleDragOver, false);
                            dropZone[0].addEventListener('drop', handleFileSelect, false);

                            // import "button"
                            downloadTabElement.find('#' + config.buttonImportId).on('click', function(e) {

                                importFormElement.validator('validate');
                                let validImportForm = importFormElement.isValidForm();

                                if(validImportForm){
                                    importData = importFormElement.getFormValues();
                                    importData.mapData = [];

                                    let fileElement = downloadTabElement.find('#' + config.fieldImportId);
                                    files = fileElement[0].files;
                                    filesCount = 0;
                                    filesCountFail = 0;

                                    for (let file; !!(file = files[filesCount]); filesCount++){
                                        let reader = new FileReader();
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

                // events for tab change
                mapInfoDialog.find('.navbar a').on('shown.bs.tab', function(e){
                    let selectElementCharacter = mapInfoDialog.find('#' + config.characterSelectId);
                    let selectElementCorporation = mapInfoDialog.find('#' + config.corporationSelectId);
                    let selectElementAlliance = mapInfoDialog.find('#' + config.allianceSelectId);

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
            });
        }
    };

    /**
     * import new map(s) data
     * @param importData
     */
    let importMaps = function(importData){

        let importForm = $('#' + config.dialogMapImportFormId);
        importForm.hideFormMessage('all');

        // lock dialog
        let dialogContent = importForm.parents('.modal-content');
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
                if(responseData.warning.length){
                    importForm.showFormMessage(responseData.warning);
                }

                Util.showNotify({title: 'Import finished', text: 'Map(s) imported', type: 'success'});
            }
        }).fail(function( jqXHR, status, error) {
            let reason = status + ' ' + error;
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

        let fieldExport = $('#' + config.fieldExportId);
        let filename = '';
        let mapDataEncoded = '';

        if(fieldExport.length){
            filename = fieldExport.val();

            if(filename.length > 0){
                mapDataEncoded = 'text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify( mapData ));
            }
        }

        return this.each(function(){
            let exportButton = $(this);
            exportButton.attr('href', 'data:' + mapDataEncoded);
            exportButton.attr('download', filename + '.json');
        });
    };


    /**
     * init select2 fields within the settings dialog
     * @param mapInfoDialog
     */
    let initSettingsSelectFields = function(mapInfoDialog){

        let selectElementCharacter = mapInfoDialog.find('#' + config.characterSelectId);
        let selectElementCorporation = mapInfoDialog.find('#' + config.corporationSelectId);
        let selectElementAlliance = mapInfoDialog.find('#' + config.allianceSelectId);

        // init character select live search
        selectElementCharacter.initAccessSelect({
            type: 'character',
            maxSelectionLength: Init.mapTypes.private.defaultConfig.max_shared
        });

        // init corporation select live search
        selectElementCorporation.initAccessSelect({
            type: 'corporation',
            maxSelectionLength: Init.mapTypes.corporation.defaultConfig.max_shared
        });

        // init alliance select live search
        selectElementAlliance.initAccessSelect({
            type: 'alliance',
            maxSelectionLength: Init.mapTypes.alliance.defaultConfig.max_shared
        });
    };

    /**
     * shows the delete map Dialog
     * @param mapData
     */
    $.fn.showDeleteMapDialog = function(mapData){

        let mapName = mapData.config.name;

        let mapDeleteDialog = bootbox.confirm('Delete map "' + mapName + '"?', function(result){
            if(result){
                let data = {mapData: mapData.config};

                $.ajax({
                    type: 'POST',
                    url: Init.path.deleteMap,
                    data: data,
                    dataType: 'json'
                }).done(function(data){
                    Util.showNotify({title: 'Map deleted', text: 'Map: ' + mapName, type: 'success'});
                }).fail(function( jqXHR, status, error) {
                    let reason = status + ' ' + error;
                    Util.showNotify({title: jqXHR.status + ': deleteMap', text: reason, type: 'warning'});
                    $(document).setProgramStatus('problem');
                }).always(function() {
                    $(mapDeleteDialog).modal('hide');
                });

                return false;
            }
        });

    };


});