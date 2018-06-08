/**
 *  System info module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'app/map/util'
], function($, Init, Util, Render, MapUtil) {
    'use strict';

    let config = {
        // module info
        modulePosition: 2,
        moduleName: 'systemInfo',

        // system info module
        moduleTypeClass: 'pf-system-info-module',                               // class for this module

        // breadcrumb
        constellationLinkClass: 'pf-system-info-constellation',                 // class for "constellation" name
        regionLinkClass: 'pf-system-info-region',                               // class for "region" name
        typeLinkClass: 'pf-system-info-type',                                   // class for "type" name

        // info table
        systemInfoTableClass: 'pf-module-table',                                // class for system info table
        systemInfoNameInfoClass: 'pf-system-info-name',                         // class for "name" information element
        systemInfoEffectInfoClass: 'pf-system-info-effect',                     // class for "effect" information element
        systemInfoStatusLabelClass: 'pf-system-info-status-label',              // class for "status" information element
        systemInfoStatusAttributeName: 'data-status',                           // attribute name for status label
        systemInfoWormholeClass: 'pf-system-info-wormhole-',                    // class prefix for static wormhole element

        // description field
        descriptionArea: 'pf-system-info-description-area',                     // class for "description" area
        addDescriptionButtonClass: 'pf-system-info-description-button',         // class for "add description" button
        moduleElementToolbarClass: 'pf-table-tools',                            // class for "module toolbar" element
        tableToolsActionClass: 'pf-table-tools-action',                         // class for "edit" action

        descriptionTextareaElementClass: 'pf-system-info-description',          // class for "description" textarea element (xEditable)
        descriptionTextareaCharCounter: 'pf-form-field-char-count',             // class for "character counter" element for form field

        // fonts
        fontTriglivianClass: 'pf-triglivian'                                    // class for "Triglivian" names (e.g. Abyssal systems)
    };

    // disable Module update temporary (until. some requests/animations) are finished
    let disableModuleUpdate = true;

    // animation speed values
    let animationSpeedToolbarAction = 200;

    // max character length for system description
    let maxDescriptionLength = 512;

    /**
     * set module observer and look for relevant system data to update
     */
    let setModuleObserver = (moduleElement) => {
        $(document).off('pf:updateSystemInfoModule').on('pf:updateSystemInfoModule', function(e, data){
            if(data){
                moduleElement.updateSystemInfoModule(data);
            }
        });
    };

    /**
     * shows the tool action element by animation
     * @param toolsActionElement
     */
    let showToolsActionElement = (toolsActionElement) => {
        toolsActionElement.velocity('stop').velocity({
            opacity: 1,
            height: '100%'
        },{
            duration: animationSpeedToolbarAction,
            display: 'block',
            visibility: 'visible'
        });
    };

    /**
     * hides the tool action element by animation
     * @param toolsActionElement
     */
    let hideToolsActionElement = (toolsActionElement) => {
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

        let moduleElement = $(this);

        let systemId = moduleElement.data('id');

        if(systemId === systemData.id){
            // update module

            // system status =====================================================================================
            let systemStatusLabelElement = moduleElement.find('.' + config.systemInfoStatusLabelClass);
            let systemStatusId = parseInt( systemStatusLabelElement.attr( config.systemInfoStatusAttributeName ) );

            if(systemStatusId !== systemData.status.id){
                // status changed

                let currentStatusClass = Util.getStatusInfoForSystem(systemStatusId, 'class');
                let newStatusClass = Util.getStatusInfoForSystem(systemData.status.id, 'class');
                let newStatusLabel = Util.getStatusInfoForSystem(systemData.status.id, 'label');

                systemStatusLabelElement.removeClass(currentStatusClass).addClass(newStatusClass).text(newStatusLabel);

                // set new status attribute
                systemStatusLabelElement.attr( config.systemInfoStatusAttributeName, systemData.status.id);
            }

            // description textarea element ======================================================================
            let descriptionTextareaElement =  moduleElement.find('.' + config.descriptionTextareaElementClass);
            let description = descriptionTextareaElement.editable('getValue', true);

            if(description !== systemData.description){
                // description changed

                // description button
                let descriptionButton = moduleElement.find('.' + config.addDescriptionButtonClass);

                // set new value
                descriptionTextareaElement.editable('setValue', systemData.description);

                let actionElement = descriptionButton.siblings('.' + config.tableToolsActionClass);

                if(systemData.description.length === 0){
                    // show/activate description field

                    // show button if value is empty
                    descriptionButton.show();

                    hideToolsActionElement(actionElement);
                }else{
                    // hide/disable description field
                    // hide tool button
                    descriptionButton.hide();
                    showToolsActionElement(actionElement);
                }
            }

            // created/updated tooltip ===========================================================================

            let nameRowElement = $(moduleElement).find('.' + config.systemInfoNameInfoClass);

            let tooltipData = {
                created: systemData.created,
                updated: systemData.updated
            };

            nameRowElement.addCharacterInfoTooltip( tooltipData );
        }

        moduleElement.find('.' + config.descriptionArea).hideLoadingAnimation();
    };

    /**
     * get module element
     * @param parentElement
     * @param mapId
     * @param systemData
     */
    let getModule = (parentElement, mapId, systemData) => {

        // create new module container
        let moduleElement = $('<div>');

        // store systemId -> module can be updated with the correct data
        moduleElement.data('id', systemData.id);

        // shattered wormhole info data
        let shatteredWormholeInfo = false;

        // add security class for statics
        if(
            systemData.statics &&
            systemData.statics.length > 0
        ){
            for(let i = 0; i < systemData.statics.length; i++){
                systemData.statics[i].class = Util.getSecurityClassForSystem( systemData.statics[i].security );
            }
        }else if(systemData.type.id === 1){
            // system type "wormhole" but no statics => "shattered wormhole"
            shatteredWormholeInfo = true;
        }

        let effectName = MapUtil.getEffectInfoForSystem(systemData.effect, 'name');
        let effectClass = MapUtil.getEffectInfoForSystem(systemData.effect, 'class');

        // systemInfo template config
        let moduleConfig = {
            name: 'modules/system_info',
            position: moduleElement,
            link: 'append',
            functions: {
                after: function(conf){
                    let tempModuleElement = conf.position;

                    // lock "description" field until first update
                    tempModuleElement.find('.' + config.descriptionArea).showLoadingAnimation();

                    // "add description" button
                    let descriptionButton = tempModuleElement.find('.' + config.addDescriptionButtonClass);

                    // description textarea element
                    let descriptionTextareaElement =  tempModuleElement.find('.' + config.descriptionTextareaElementClass);

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
                        tpl: '<textarea maxlength="' + maxDescriptionLength + '"></textarea>',
                        params: function(params){
                            params.mapData = {
                                id: mapId
                            };

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
                            let reason = '';
                            let status = '';
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
                    descriptionTextareaElement.on('shown', function(e, editable){
                        let textarea = editable.input.$input;

                        // disable module update until description field is open
                        disableModuleUpdate = true;

                        // create character counter
                        let charCounter = $('<kbd>', {
                            class: [config.descriptionTextareaCharCounter, 'txt-color', 'text-right'].join(' ')
                        });
                        textarea.parent().next().append(charCounter);

                        // update character counter
                        Util.updateCounter(textarea, charCounter, maxDescriptionLength);

                        textarea.on('keyup', function(){
                            Util.updateCounter($(this), charCounter, maxDescriptionLength);
                        });
                    });

                    // on xEditable close ------------------------------------------------------------------------
                    descriptionTextareaElement.on('hidden', function(e){
                        let value = $(this).editable('getValue', true);
                        if(value.length === 0){
                            // show button if value is empty
                            hideToolsActionElement(descriptionButton.siblings('.' + config.tableToolsActionClass));
                            descriptionButton.show();
                        }

                        // enable module update
                        disableModuleUpdate = false;
                    });

                    // enable xEditable field on Button click ----------------------------------------------------
                    descriptionButton.on('click', function(e){
                        e.stopPropagation();
                        let descriptionButton = $(this);

                        // hide tool buttons
                        descriptionButton.hide();

                        // show field *before* showing the element
                        descriptionTextareaElement.editable('show');

                        showToolsActionElement(descriptionButton.siblings('.' + config.tableToolsActionClass));
                    });

                    // init tooltips -----------------------------------------------------------------------------
                    let tooltipElements = tempModuleElement.find('[data-toggle="tooltip"]');
                    tooltipElements.tooltip();

                    // init system effect popover ----------------------------------------------------------------
                    $(moduleElement).find('.' + config.systemInfoEffectInfoClass).addSystemEffectTooltip(systemData.security, systemData.effect);

                    // init static wormhole information ----------------------------------------------------------
                    if(systemData.statics){
                        for(let i = 0; i < systemData.statics.length; i++){
                            let staticData = systemData.statics[i];
                            let staticRowElement = tempModuleElement.find('.' + config.systemInfoWormholeClass + staticData.name);
                            staticRowElement.addWormholeInfoTooltip(staticData);
                        }
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
                        let popover = popoverElement.data('bs.popover');

                        $.ajax({
                            url: popoverElement.data('url'),
                            success: function(data){
                                let systemEffectTable = Util.getSystemsInfoTable( data.systemData );
                                popover.options.content = systemEffectTable;
                                // reopen popover (new content size)
                                popover.show();
                            }
                        });
                        return 'Loading...';
                    }

                }
            }
        };

        let moduleData = {
            system: systemData,
            tableClass: config.systemInfoTableClass,
            nameInfoClass: config.systemInfoNameInfoClass,
            effectInfoClass: config.systemInfoEffectInfoClass,
            wormholePrefixClass: config.systemInfoWormholeClass,
            statusInfoClass: config.systemInfoStatusLabelClass,

            systemTypeName: MapUtil.getSystemTypeInfo(systemData.type.id, 'name'),
            systemIsWormhole: MapUtil.getSystemTypeInfo(systemData.type.id, 'name') === 'w-space',
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
            tableToolsActionClass: config.tableToolsActionClass,
            descriptionTextareaClass: config.descriptionTextareaElementClass,
            systemNameClass: () => {
                return (val, render) => {
                    return  render(val) === 'A' ? config.fontTriglivianClass : '';
                };
            },

            shatteredWormholeInfo: shatteredWormholeInfo,

            ajaxConstellationInfoUrl: Init.path.getConstellationData,

            systemConstellationLinkClass: config.constellationLinkClass,
            systemRegionLinkClass: config.regionLinkClass,
            systemTypeLinkClass: config.typeLinkClass

        };

        Render.showModule(moduleConfig, moduleData);

        return moduleElement;
    };

    /**
     * init callback
     * @param moduleElement
     * @param mapId
     * @param systemData
     */
    let initModule = (moduleElement, mapId, systemData) => {
        // set module observer
        setModuleObserver(moduleElement);

        // enable auto update
        disableModuleUpdate = false;
    };

    /**
     * efore module destroy callback
     * @param moduleElement
     */
    let beforeDestroy = (moduleElement) => {
        // remove xEditable description textarea
        let descriptionTextareaElement = moduleElement.find('.' + config.descriptionTextareaElementClass);
        descriptionTextareaElement.editable('destroy');
    };

    return {
        config: config,
        getModule: getModule,
        initModule: initModule,
        beforeDestroy: beforeDestroy
    };
});



