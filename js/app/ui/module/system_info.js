/**
 * System info module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/util'
], ($, Init, Util, MapUtil) => {
    'use strict';

    let config = {
        // module info
        modulePosition: 2,
        moduleName: 'systemInfo',

        // system info module
        moduleTypeClass: 'pf-system-info-module',                               // class for this module

        // headline toolbar
        moduleHeadlineIconClass: 'pf-module-icon-button',                       // class for toolbar icons in the head

        // breadcrumb
        constellationLinkClass: 'pf-system-info-constellation',                 // class for "constellation" name
        regionLinkClass: 'pf-system-info-region',                               // class for "region" name
        typeLinkClass: 'pf-system-info-type',                                   // class for "type" name
        urlLinkClass: 'pf-system-info-url',                                     // class for "url" copy link

        // info table
        systemInfoTableClass: 'pf-module-table',                                // class for system info table
        systemInfoNameClass: 'pf-system-info-name',                             // class for "name" information element
        systemInfoEffectClass: 'pf-system-info-effect',                         // class for "effect" information element
        systemInfoPlanetsClass: 'pf-system-info-planets',                       // class for "planets" information element
        systemInfoStatusLabelClass: 'pf-system-info-status-label',              // class for "status" information element
        systemInfoStatusAttributeName: 'data-status',                           // attribute name for status label
        systemInfoWormholeClass: 'pf-system-info-wormhole-',                    // class prefix for static wormhole element

        // description field
        descriptionAreaClass: 'pf-system-info-description-area',                // class for "description" area
        addDescriptionButtonClass: 'pf-system-info-description-button',         // class for "add description" button
        descriptionTextareaElementClass: 'pf-system-info-description',          // class for "description" textarea element (Summernote)

        // fonts
        fontTriglivianClass: 'pf-triglivian',                                   // class for "Triglivian" names (e.g. Abyssal systems)

        // Summernote
        defaultBgColor: '#e2ce48'
    };

    // max character length for system description
    let maxDescriptionLength = 9000;

    /**
     * update trigger function for this module
     * compare data and update module
     * @param moduleElement
     * @param systemData
     */
    let updateModule = (moduleElement, systemData) => {
        let systemId = moduleElement.data('id');
        let updated = moduleElement.data('updated');

        if(
            systemId === systemData.id &&
            updated !== systemData.updated.updated
        ){
            let setUpdated = true;

            // created/updated tooltip --------------------------------------------------------------------------------
            let nameRowElement = moduleElement.find('.' + config.systemInfoNameClass);

            let tooltipData = {
                created: systemData.created,
                updated: systemData.updated
            };

            nameRowElement.addCharacterInfoTooltip( tooltipData );

            // update system status -----------------------------------------------------------------------------------
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

            // update description textarea ----------------------------------------------------------------------------
            let descriptionTextareaElement =  moduleElement.find('.' + config.descriptionTextareaElementClass);
            if(descriptionTextareaElement.length){
                let description = descriptionTextareaElement.html();
                if(description !== systemData.description){
                    // description has changed
                    if(typeof descriptionTextareaElement.data().summernote === 'object'){
                        // "Summernote" editor is currently open
                        setUpdated = false;
                    }else{
                        // not open
                        let newDescription = systemData.description;
                        if( !Util.isValidHtml(newDescription) ){
                            // try to convert raw text into valid html
                            newDescription = newDescription.replace(/(\r\n|\n|\r)/g, '<br>');
                            newDescription = '<p>' + newDescription + '</p>';
                        }

                        descriptionTextareaElement.html(newDescription);
                    }
                }
            }

            if(setUpdated){
                moduleElement.data('updated', systemData.updated.updated);
            }
        }

        moduleElement.find('.' + config.descriptionAreaClass).hideLoadingAnimation();
    };

    /**
     * get module element
     * @param parentElement
     * @param mapId
     * @param systemData
     */
    let getModule = (parentElement, mapId, systemData) => {
        let moduleElement = $('<div>');

        // store systemId -> module can be updated with the correct data
        moduleElement.data('id', systemData.id);

        // system "static" wh data
        let staticsData = [];
        if(
            systemData.statics &&
            systemData.statics.length > 0
        ){
            for(let wormholeName of systemData.statics){
                let wormholeData = Object.assign({}, Init.wormholes[wormholeName]);
                staticsData.push(wormholeData);
            }
        }

        let effectName = MapUtil.getEffectInfoForSystem(systemData.effect, 'name');
        let effectClass = MapUtil.getEffectInfoForSystem(systemData.effect, 'class');

        let data = {
            system: systemData,
            static: staticsData,
            moduleHeadlineIconClass: config.moduleHeadlineIconClass,
            tableClass: config.systemInfoTableClass,
            nameInfoClass: config.systemInfoNameClass,
            effectInfoClass: config.systemInfoEffectClass,
            planetsInfoClass: config.systemInfoPlanetsClass,
            wormholePrefixClass: config.systemInfoWormholeClass,
            statusInfoClass: config.systemInfoStatusLabelClass,
            popoverTriggerClass: Util.config.popoverTriggerClass,

            systemUrl: MapUtil.getMapDeeplinkUrl(mapId, systemData.id),
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
            descriptionAreaClass: config.descriptionAreaClass,
            descriptionButtonClass: config.addDescriptionButtonClass,
            descriptionTextareaClass: config.descriptionTextareaElementClass,
            summernoteClass: Util.config.summernoteClass,
            systemNameClass: () => {
                return (val, render) => {
                    return  render(val) === 'A' ? config.fontTriglivianClass : '';
                };
            },
            formatUrl: () => {
                return (val, render) => render(val).replace(/ /g, '_');
            },
            planetCount: systemData.planets ? systemData.planets.length : 0,

            shatteredClass: Util.getSecurityClassForSystem('SH'),

            ajaxConstellationInfoUrl: Init.path.getConstellationData,

            systemConstellationLinkClass: config.constellationLinkClass,
            systemRegionLinkClass: config.regionLinkClass,
            systemTypeLinkClass: config.typeLinkClass,
            systemUrlLinkClass: config.urlLinkClass
        };

        requirejs(['text!templates/modules/system_info.html', 'mustache', 'summernote.loader'], (template, Mustache, Summernote) => {
            let content = Mustache.render(template, data);
            moduleElement.append(content);

            let descriptionArea = moduleElement.find('.' + config.descriptionAreaClass);
            let descriptionButton = moduleElement.find('.' + config.addDescriptionButtonClass);
            let descriptionTextareaElement =  moduleElement.find('.' + config.descriptionTextareaElementClass);

            // lock "description" field until first update
            descriptionArea.showLoadingAnimation();

            // WYSIWYG init on button click ---------------------------------------------------------------------------
            descriptionButton.on('click', function(e){
                e.stopPropagation();
                let descriptionButton = $(this);
                // hide edit button
                descriptionButton.hide();

                // content has changed
                let descriptionChanged = false;

                Summernote.initSummernote(descriptionTextareaElement, {
                    height: 75,                 // set editor height
                    minHeight: 75,              // set minimum height of editor
                    maxHeight: 500,             // set maximum height of editor
                    focus: true,
                    placeholder: false,
                    maxTextLength: maxDescriptionLength,
                    disableDragAndDrop: true,
                    shortcuts: false,
                    toolbar: [
                        ['style', ['style']],
                        ['font', ['underline', 'strikethrough', 'clear']],
                        ['color', ['color']],
                        ['para', ['ul', 'ol', 'paragraph']],
                        ['table', ['table']],
                        ['insert', ['link', 'hr']],
                        //['view', ['codeview', 'help']],
                        ['misc', ['undo', 'redo']],
                        ['lengthField'],
                        ['customBtn', ['discardBtn', 'saveBtn']]
                    ],
                    buttons: {
                        saveBtn: context => {
                            let ui = $.summernote.ui;
                            let button = ui.button({
                                contents: '<i class="fas fa-fw fa-check"/>',
                                container: 'body',
                                className: ['btn-success', 'btn-save'],
                                click: e => {
                                    context.layoutInfo.editable.removeClass('has-error');

                                    // save changes
                                    if(descriptionChanged){
                                        let validDescription = true;
                                        let description = '';

                                        if( context.$note.summernote('isEmpty') ){
                                            // ... isEmpty -> clear empty default tags as well
                                            context.$note.summernote('code', '');
                                        }else{
                                            description = context.$note.summernote('code');
                                            if( !Util.isValidHtml(description) ){
                                                // ... not valid HTML
                                                validDescription = false;
                                                context.layoutInfo.editable.addClass('has-error');
                                                Util.showNotify({title: 'Validation failed', text: 'HTML not valid', type: 'error'});
                                            }
                                        }

                                        if(validDescription){
                                            // ... valid -> save()
                                            descriptionArea.showLoadingAnimation();

                                            Util.request('PATCH', 'system', systemData.id, {
                                                description: description
                                            }, {
                                                descriptionArea: descriptionArea
                                            }, context => {
                                                // always do
                                                context.descriptionArea.hideLoadingAnimation();
                                            }).then(
                                                payload => {
                                                    context.$note.summernote('destroy');
                                                    updateModule(moduleElement, payload.data);
                                                },
                                                Util.handleAjaxErrorResponse
                                            );
                                        }
                                    }else{
                                        // ... no changes -> no save()
                                        context.$note.summernote('destroy');
                                    }
                                }
                            });

                            return button.render();
                        }
                    },
                    callbacks: {
                        onInit: function(context){
                            // make editable field a bit larger
                            context.editable.css('height', '150px');

                            // set default background color
                            // -> could not figure out how to set by API as default color
                            context.toolbar.find('.note-current-color-button').attr('data-backcolor', config.defaultBgColor)
                                .find('.note-recent-color').css('background-color', config.defaultBgColor);
                        },
                        onChange: function(contents){
                            descriptionChanged = true;
                        },
                        onPaste: function (e) {
                            let bufferText = ((e.originalEvent || e).clipboardData || window.clipboardData).getData('Text');
                            e.preventDefault();

                            // Firefox fix
                            setTimeout(() => {
                                document.execCommand('insertText', false, bufferText);
                            }, 10);
                        },
                        onDestroy: function(context){
                            descriptionButton.show();
                        }
                    }
                });
            });

            // init system effect popover -----------------------------------------------------------------------------
            moduleElement.find('.' + config.systemInfoEffectClass).addSystemEffectTooltip(systemData.security, systemData.effect);

            // init planets popover -----------------------------------------------------------------------------------
            moduleElement.find('.' + config.systemInfoPlanetsClass).addSystemPlanetsTooltip(systemData.planets);

            // init static wormhole information -----------------------------------------------------------------------
            for(let staticData of staticsData){
                let staticRowElement = moduleElement.find('.' + config.systemInfoWormholeClass + staticData.name);
                staticRowElement.addWormholeInfoTooltip(staticData);
            }

            // copy system deeplink URL -------------------------------------------------------------------------------
            moduleElement.find('.' + config.urlLinkClass).on('click', function(){
                let mapUrl = $(this).attr('data-url');
                Util.copyToClipboard(mapUrl).then(payload => {
                    if(payload.data){
                        Util.showNotify({title: 'Copied to clipboard', text: mapUrl, type: 'success'});
                    }
                });
            });

            // constellation popover ----------------------------------------------------------------------------------
            moduleElement.find('a.popup-ajax').popover({
                html: true,
                trigger: 'hover',
                placement: 'top',
                delay: 200,
                container: 'body',
                content: function(){
                    return details_in_popup(this);
                }
            });

            let details_in_popup = popoverElement => {
                popoverElement = $(popoverElement);
                let popover = popoverElement.data('bs.popover');

                $.ajax({
                    url: popoverElement.data('url'),
                    success: function(data){
                        popover.options.content = Util.getSystemsInfoTable(data.systemsData);
                        // reopen popover (new content size)
                        popover.show();
                    }
                });
                return 'Loading...';
            };

            // init tooltips ------------------------------------------------------------------------------------------
            let tooltipElements = moduleElement.find('[data-toggle="tooltip"]');
            tooltipElements.tooltip({
                container: 'body',
                placement: 'top'
            });
        });

        return moduleElement;
    };

    /**
     * efore module destroy callback
     * @param moduleElement
     */
    let beforeDestroy = moduleElement => {
        moduleElement.find('.' +  config.descriptionTextareaElementClass).summernote('destroy');

        moduleElement.destroyPopover(true);
    };

    return {
        config: config,
        getModule: getModule,
        updateModule: updateModule,
        beforeDestroy: beforeDestroy
    };
});
