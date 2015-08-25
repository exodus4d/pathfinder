/**
 *  System info module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render'
], function($, Init, Util, Render) {
    'use strict';

    var config = {
        // module info
        moduleClass: 'pf-module',                                               // class for each module

        // system info module
        systemInfoModuleClass: 'pf-system-info-module',                         // module wrapper

        // breadcrumb
        constellationLinkClass: 'pf-system-info-constellation',                 // class for "constellation" name
        regionLinkClass: 'pf-system-info-region',                               // class for "region" name
        typeLinkClass: 'pf-system-info-type',                                   // class for "type" name

        // info table
        systemInfoTableClass: 'pf-system-info-table',                           // class for system info table
        systemInfoNameInfoClass: 'pf-system-info-name',                         // class for "name" information element
        systemInfoEffectInfoClass: 'pf-system-info-effect',                     // class for "effect" information element
        systemInfoStatusLabelClass: 'pf-system-info-status-label',              // class for "status" information element
        systemInfoStatusAttributeName: 'data-status',                           // attribute name for status label

        // description field
        addDescriptionButtonClass: 'pf-system-info-description-button',         // class for "add description" button
        moduleElementToolbarClass: 'pf-table-tools',                            // class for "module toolbar" element
        moduleToolbarActionId: 'pf-system-info-collapse-container',             // id for "module toolbar action" element
        descriptionTextareaElementClass: 'pf-system-info-description',          // class for "description" textarea element (xEditable)
        descriptionTextareaTooltipClass: 'pf-system-info-description-tooltip'   // class for "description" tooltip
    };

    // disable Module update temporary (until. some requests/animations) are finished
    var disableModuleUpdate = true;

    // animation speed values
    var animationSpeedToolbarAction = 200;

    /**
     * set module observer and look for relevant system data to update
     */
    var setModuleObserver = function(moduleElement){
        $(document).on('pf:updateSystemModules', function(e, data){
            if(data){
                moduleElement.updateSystemInfoModule(data);
            }

        });
    };

    /**
     * shows the tool action element by animation
     */
    var showToolsActionElement = function(){

        // "toolbar action" element
        var toolsActionElement = $('#' +  config.moduleToolbarActionId);

        toolsActionElement.velocity('stop').velocity({
            opacity: 1,
            height: '75px'
        },{
            duration: animationSpeedToolbarAction,
            display: 'block',
            visibility: 'visible'
        });
    };

    /**
     * hides the tool action element by animation
     */
    var hideToolsActionElement = function(){

        // "toolbar action" element
        var toolsActionElement = $('#' +  config.moduleToolbarActionId);

        toolsActionElement.velocity('stop').velocity('reverse', {
            display: 'none',
            visibility: 'hidden'
        });
    };

    /**
     * update trigger function for this module
     * compare data and update module
     * @param systemData
     */
    $.fn.updateSystemInfoModule = function(systemData){

        // module update is disabled
        if(disableModuleUpdate === true){
            return;
        }

        var moduleElement = $(this);

        var systemId = moduleElement.data('id');

        if(systemId === systemData.id){
            // update module

            // system status =====================================================================================
            var systemStatusLabelElement = moduleElement.find('.' + config.systemInfoStatusLabelClass);
            var systemStatusId = parseInt( systemStatusLabelElement.attr( config.systemInfoStatusAttributeName ) );


            if(systemStatusId !== systemData.status.id){
                // status changed

                var currentStatusClass = Util.getStatusInfoForSystem(systemStatusId, 'class');
                var newStatusClass = Util.getStatusInfoForSystem(systemData.status.id, 'class');
                var newStatusLabel = Util.getStatusInfoForSystem(systemData.status.id, 'label');

                systemStatusLabelElement.removeClass(currentStatusClass).addClass(newStatusClass).text(newStatusLabel);

                // set new status attribute
                systemStatusLabelElement.attr( config.systemInfoStatusAttributeName, systemData.status.id);
            }

            // description textarea element ======================================================================
            var descriptionTextareaElement =  moduleElement.find('.' + config.descriptionTextareaElementClass);

            var description = descriptionTextareaElement.editable('getValue', true);

            if(description !== systemData.description){
                // description changed

                // description button
                var descriptionButton = moduleElement.find('.' + config.addDescriptionButtonClass);

                // set new value
                descriptionTextareaElement.editable('setValue', systemData.description);

                if(systemData.description.length === 0){
                    // show/activate description field

                    // show button if value is empty
                    descriptionButton.show();


                    hideToolsActionElement();

                }else{
                    // hide/disable description field

                    // hide tool button
                    descriptionButton.hide()

                    showToolsActionElement();
                }
            }

            // created/updated tooltip ===========================================================================

            var nameRowElement = $(moduleElement).find('.' + config.systemInfoNameInfoClass);

            var tooltipData = {
                created: systemData.created,
                updated: systemData.updated
            };

            nameRowElement.addCharacterInfoTooltip( tooltipData );
        }
    };

    /**
     *
     * @param parentElement
     * @param systemInfoData
     */
    var drawModule = function(parentElement, systemData){

        // create new module container
        var moduleElement = $('<div>', {
            class: [config.moduleClass, config.systemInfoModuleClass].join(' '),
            css: {opacity: 0}
        });

        // store systemId -> module can be updated with the correct data
        moduleElement.data('id', systemData.id);

        parentElement.prepend(moduleElement);

        var effectName = Util.getEffectInfoForSystem(systemData.effect, 'name');
        var effectClass = Util.getEffectInfoForSystem(systemData.effect, 'class');

        // systemInfo template config
        var moduleConfig = {
            name: 'modules/system_info',
            position: moduleElement,
            link: 'append',
            functions: {
                after: function(){

                    var tempModuleElement = $('.' + config.systemInfoModuleClass);

                    // "add description" button
                    var descriptionButton = tempModuleElement.find('.' + config.addDescriptionButtonClass);

                    // toolbar element
                    //var toolbarElement = tempModuleElement.find('.' + config.moduleElementToolbarClass);

                    // description textarea element
                    var descriptionTextareaElement =  tempModuleElement.find('.' + config.descriptionTextareaElementClass);


                    // init description textarea
                    descriptionTextareaElement.editable({
                        url: Init.path.saveSystem,
                        dataType: 'json',
                        pk: systemData.id,
                        type: 'textarea',
                        mode: 'inline',
                        emptytext: '',
                        onblur: 'cancel',
                        showbuttons: true,
                        value: '',  // value is set by trigger function updateSystemInfoModule()
                        rows: 5,
                        name: 'description',
                        inputclass: config.descriptionTextareaElementClass,
                        params: function(params){

                            params.systemData = {};
                            params.systemData.id = params.pk;
                            params.systemData[params.name] = params.value;

                            // clear unnecessary data
                            delete params.pk;
                            delete params.name;
                            delete params.value;

                            return params;
                        },
                        validate: function(value){
                            if(value.length > 0 && $.trim(value).length === 0) {
                                return {newValue: ''};
                            }
                        },
                        success: function(response, newValue){
                            Util.showNotify({title: 'System updated', text: 'Name: ' + response.name, type: 'success'});
                        },
                        error: function(jqXHR, newValue){

                            var reason = '';
                            var status = '';
                            if(jqXHR.name){
                                // save error new sig (mass save)
                                reason = jqXHR.name;
                                status = 'Error';
                            }else{
                                reason = jqXHR.responseJSON.text;
                                status = jqXHR.status;
                            }

                            Util.showNotify({title: status + ': save system information', text: reason, type: 'warning'});
                            $(document).setProgramStatus('problem');
                            return reason;
                        }
                    });

                    // on xEditable open -------------------------------------------------------------------------
                    descriptionTextareaElement.on('shown', function(e){
                        // disable module update until description field is open
                        disableModuleUpdate = true;

                        // disable tooltip
                        tempModuleElement.find('.' + config.descriptionTextareaTooltipClass).tooltip('disable');
                    });

                    // on xEditable close ------------------------------------------------------------------------
                    descriptionTextareaElement.on('hidden', function(e){
                        var value = $(this).editable('getValue', true);

                        if(value.length === 0){

                            // show button if value is empty
                            hideToolsActionElement();

                            descriptionButton.show();
                        }else{
                            // enable tooltip
                            tempModuleElement.find('.' + config.descriptionTextareaTooltipClass).tooltip('enable');
                        }

                        // enable module update
                        disableModuleUpdate = false;
                    });

                    // enable xEditable field on Button click ----------------------------------------------------
                    descriptionButton.on('click', function(e){
                        e.stopPropagation();

                        // hide tool buttons
                        descriptionButton.hide();

                        // show field *before* showing the element
                        descriptionTextareaElement.editable('show');

                        showToolsActionElement();
                    });


                    // init tooltips -----------------------------------------------------------------------------
                    var tooltipElements = $('.' + config.systemInfoModuleClass + ' [data-toggle="tooltip"]');
                    tooltipElements.tooltip();

                    // init system effect popover ----------------------------------------------------------------
                    var systemEffectData = Util.getSystemEffectData( systemData.security, systemData.effect);

                    if(systemEffectData !== false){
                        var infoEffectElement = $(moduleElement).find('.' + config.systemInfoEffectInfoClass);

                        // transform data into table
                        var systemEffectTable = Util.getSystemEffectTable( systemEffectData );

                        infoEffectElement.popover({
                            html: true,
                            trigger: 'hover',
                            placement: 'top',
                            delay: 200,
                            title: 'System effects',
                            container: 'body',
                            content: systemEffectTable
                        });
                    }

                    // constellation popover ---------------------------------------------------------------------
                    tempModuleElement.find('a.popup-ajax').popover({
                        html: true,
                        trigger: 'hover',
                        placement: 'top',
                        delay: 200,
                        container: 'body',
                        content: function(){
                            return details_in_popup(this);
                        }
                    });


                    function details_in_popup(popoverElement){
                        popoverElement = $(popoverElement);
                        var popover = popoverElement.data('bs.popover');


                        $.ajax({
                            url: popoverElement.data('url'),
                            success: function(data){
                                var systemEffectTable = Util.getSystemsInfoTable( data.systemData );
                                popover.options.content = systemEffectTable;
                                // reopen popover (new content size)
                                popover.show();
                            }
                        });
                        return 'Loading...';
                    }

                    showModule(moduleElement);
                }
            }
        };

        // add security class for statics
        if(systemData.statics){
            for(var i = 0; i < systemData.statics.length; i++){
                systemData.statics[i].class = Util.getSecurityClassForSystem( systemData.statics[i].security );
            }
        }

        var moduleData = {
            system: systemData,
            tableClass: config.systemInfoTableClass,
            nameInfoClass: config.systemInfoNameInfoClass,
            effectInfoClass: config.systemInfoEffectInfoClass,
            statusInfoClass: config.systemInfoStatusLabelClass,

            systemTypeName: Util.getSystemTypeInfo(systemData.type.id, 'name'),
            systemStatusId: systemData.status.id,
            systemStatusClass: Util.getStatusInfoForSystem(systemData.status.id, 'class'),
            systemStatusLabel: Util.getStatusInfoForSystem(systemData.status.id, 'label'),
            securityClass: Util.getSecurityClassForSystem( systemData.security ),
            trueSec: systemData.trueSec.toFixed(1),
            trueSecClass: Util.getTrueSecClassForSystem( systemData.trueSec ),
            effectName: effectName,
            effectClass: effectClass,
            moduleToolbarClass: config.moduleElementToolbarClass,
            descriptionButtonClass: config.addDescriptionButtonClass,
            moduleToolbarActionId: config.moduleToolbarActionId,
            descriptionTextareaClass: config.descriptionTextareaElementClass,
            descriptionTooltipClass: config.descriptionTextareaTooltipClass,

            ajaxConstellationInfoUrl: Init.path.getConstellationData,

            systemConstellationLinkClass: config.constellationLinkClass,
            systemRegionLinkClass: config.regionLinkClass,
            systemTypeLinkClass: config.typeLinkClass

        };

        Render.showModule(moduleConfig, moduleData);
    };

    /**
     * show system info module with animation
     * @param moduleElement
     */
    var showModule = function(moduleElement){
        moduleElement.velocity('transition.slideDownIn', {
            duration: Init.animationSpeed.mapModule,
            delay: Init.animationSpeed.mapModule,
            complete: function(){
                // set module observer
                setModuleObserver(moduleElement);

                // enable auto update
                disableModuleUpdate = false;
            }
        });
    };

    /**
     * update system info module
     * @param systemInfoData
     */
    $.fn.drawSystemInfoModule = function(systemData){

        var parentElement = $(this);

        // check if module already exists
        var moduleElement = parentElement.find('.' + config.systemInfoModuleClass);

        if(moduleElement.length > 0){
            moduleElement.velocity('transition.slideDownOut', {
                duration: Init.animationSpeed.mapModule,
                complete: function(tempElement){
                    $(tempElement).remove();

                    drawModule(parentElement, systemData);
                }
            });
        }else{
            drawModule(parentElement, systemData);
        }
    };

});



