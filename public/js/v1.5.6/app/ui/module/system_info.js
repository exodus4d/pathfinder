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
        textActionIconCopyClass: 'pf-module-icon-button-copy',                  // class for text action "copy"

        // breadcrumb
        constellationLinkClass: 'pf-system-info-constellation',                 // class for "constellation" name
        regionLinkClass: 'pf-system-info-region',                               // class for "region" name
        typeLinkClass: 'pf-system-info-type',                                   // class for "type" name

        // info col/table
        systemInfoSectionClass: 'pf-system-info-section',                       // class for system info section
        systemInfoTableClass: 'pf-module-table',                                // class for system info table
        systemInfoNameClass: 'pf-system-info-name',                             // class for "name" information element
        systemInfoEffectClass: 'pf-system-info-effect',                         // class for "effect" information element
        systemInfoPlanetsClass: 'pf-system-info-planets',                       // class for "planets" information element
        systemInfoStatusLabelClass: 'pf-system-info-status-label',              // class for "status" information element
        systemInfoStatusAttributeName: 'data-status',                           // attribute name for status label
        systemInfoWormholeClass: 'pf-system-info-wormhole-',                    // class prefix for static wormhole element

        // description field
        descriptionSectionClass: 'pf-system-description-section',               // class for system description section
        descriptionAreaClass: 'pf-system-info-description-area',                // class for description area
        addDescriptionButtonClass: 'pf-system-info-description-button',         // class for "add description" button
        descriptionTextareaElementClass: 'pf-system-info-description',          // class for description textarea element (Summernote)

        // sovereignty col/table
        systemSovSectionClass: 'pf-system-sov-section',                         // class for system sov. section
        systemSovTableClass: 'pf-module-table',                                 // class for system sov. table
        systemSovFwContestedRowClass: 'pf-system-sov-fw-contested-row',         // class for "contested" sov. table row
        systemSovFwOccupationRowClass: 'pf-system-sov-fw-occupation-row',       // class for "-occupation" sov. table row
        systemSovFwContestedClass: 'pf-system-sov-fw-contested',
        systemSovFwPercentageClass: 'pf-system-sov-fw-percentage',
        systemSovFwOccupationClass: 'pf-system-sov-fw-occupation',
        systemSovFwOccupationImageClass: 'pf-system-sov-fw-occupation-image',
        systemSovFwStatusIconClass: 'pf-system-sov-fw-status-icon',

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

            // update faction warfare rows ----------------------------------------------------------------------------
            let fwContestedRow = moduleElement.find('.' + config.systemSovFwContestedRowClass);
            let fwOccupationRow = moduleElement.find('.' + config.systemSovFwOccupationRowClass);
            if(systemData.factionWar){
                let contested       = String(Util.getObjVal(systemData.factionWar, 'contested') || '');
                let percentage      = parseInt(Util.getObjVal(systemData.factionWar, 'victoryPercentage')) || 0;
                let occupierFaction = Util.getObjVal(systemData.factionWar, 'occupierFaction');

                let statusColor = 'red';
                if(occupierFaction){
                    // system is "occupied" by hostile "occupierFaction" (stable)
                    // -> hide percent
                    statusColor = '#d9534f';
                    percentage += '%';
                }else if('uncontested' === contested){
                    // system is "uncontested" and owned by default ownerFaction (stable)
                    // -> hide percent
                    statusColor = '#4f9e4f';
                    percentage = 'stable';
                }else if('contested' === contested){
                    // system is "contested", 0%-99% percentage
                    statusColor = '#e28a0d';
                    percentage += '%';
                }else if(
                    'vulnerable' === contested ||
                    'captured' === contested
                ){
                    // system is "vulnerable", 100% percentage
                    // -> "captured" state is might be the same?!
                    statusColor = '#d747d6';
                    percentage = '100%';
                }

                fwContestedRow.find('.' + config.systemSovFwStatusIconClass)[0].style.setProperty('--color', statusColor);
                fwContestedRow.find('.' + config.systemSovFwContestedClass).text(contested);
                fwContestedRow.find('.' + config.systemSovFwPercentageClass).text(percentage);
                fwContestedRow.show();

                let occupierFactionImage = Util.eveImageUrl('factions', (occupierFaction ? occupierFaction.id : 0), 64);
                let occupierFactionName = occupierFaction ? occupierFaction.name : '';

                fwOccupationRow.find('.' + config.systemSovFwOccupationImageClass)[0].style.setProperty('--bg-image', 'url(\'' + occupierFactionImage + '\')');
                fwOccupationRow.find('.' + config.systemSovFwOccupationClass).text(occupierFactionName);
                if(occupierFaction){
                    fwOccupationRow.show();
                }
            }else{
                fwContestedRow.hide();
                fwOccupationRow.hide();
            }

            if(setUpdated){
                moduleElement.data('updated', systemData.updated.updated);
            }
        }

        moduleElement.find('.' + config.descriptionAreaClass).hideLoadingAnimation();
        moduleElement.find('.' + config.systemSovSectionClass + ' .' + Util.config.dynamicAreaClass).hideLoadingAnimation();
    };

    /**
     * @param pages
     * @param systemData
     */
    let getThirdPartySystemLinks = (pages, systemData) => {
        let links = [];
        let isWormhole = MapUtil.getSystemTypeInfo(Util.getObjVal(systemData, 'type.id'), 'name') === 'w-space';
        let systemName = Util.getObjVal(systemData, 'name') || '';
        let regionName = Util.getObjVal(systemData, 'region.name') || '';

        let setDestination = e => {
            e.preventDefault();
            e.stopPropagation();
            Util.setDestination('set_destination', 'system', {id: systemData.systemId, name: systemData.name});
        };

        for(let i = 0; i < pages.length; i++){
            let link = null;
            let showInModuleHead = true;
            let domain = Util.getObjVal(Init, 'url.' + pages[i]);
            if(domain){
                // linkOut url
                let url = false;
                switch(pages[i]){
                    case 'dotlan':
                        let systemNameTemp = systemName.replace(/ /g, '_');
                        let regionNameTemp = regionName.replace(/ /g, '_');
                        if(isWormhole){
                            url = domain + '/system/' + systemNameTemp;
                        }else{
                            url = domain + '/map/' + regionNameTemp + '/' + systemNameTemp;
                        }
                        break;
                    case 'eveeye':
                        if(!isWormhole){
                            url = domain + '/?m=' + encodeURIComponent(regionName) + '&s=' + encodeURIComponent(systemName);
                            url += '&t=eswkc&o=thera,con_svc,node_sov,sub_sec,sector_fac,tag_mk';
                        }
                        break;
                    case 'anoik':
                        if(isWormhole){
                            url = domain + '/systems/' + systemName;
                        }
                        break;
                }

                if(url){
                    let urlObj = new URL(url);
                    link = {
                        title: urlObj.hostname,
                        url: url
                    };
                }
            }else{
                // custom callback
                let action = false;
                let title = false;
                switch(pages[i]){
                    case 'eve':
                        action = setDestination;
                        title = 'set destination';
                        showInModuleHead = false;
                        break;
                }

                if(action){
                    link = {
                        title: title|| pages[i],
                        action: action
                    };
                }
            }


            if(link){
                links.push(Object.assign({}, link, {
                    page: pages[i],
                    showInModuleHead: showInModuleHead
                }));
            }
        }

        return links;
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

        // system "sovereignty" data
        // "primary" data is eigther "alliance" -> 0.0 space
        //          or "faction" -> Empire Regions (LS, HS)
        let sovereigntyDefault = {
            row1Label: 'Sov.',
            row1Val: '???',
            row1Img: undefined,
            row1ImgTitle: undefined,
            row2Label: undefined,
            row2Val: undefined,
            row3Label: undefined,
            row3Val: undefined
        };

        let sovereigntyPrimary;
        let sovereigntySecondary;

        if(systemData.sovereignty){
            let sovDataFact = Util.getObjVal(systemData.sovereignty, 'faction');
            let sovDataAlly = Util.getObjVal(systemData.sovereignty, 'alliance');
            let sovDataCorp = Util.getObjVal(systemData.sovereignty, 'corporation');

            if(sovDataFact){
                sovereigntyPrimary = {
                    row1Val: 'Faction',
                    row1Img: Util.eveImageUrl('factions', sovDataFact.id, 64),
                    row1ImgTitle: sovDataFact.name,
                    row2Val: sovDataFact.name
                };
            }else{
                if(sovDataAlly){
                    sovereigntyPrimary = {
                        row1Val: 'Alliance',
                        row1Img: Util.eveImageUrl('alliances', sovDataAlly.id, 64),
                        row1ImgTitle: sovDataAlly.name,
                        row2Val: '<' + sovDataAlly.ticker + '>',
                        row3Label: 'Ally',
                        row3Val: sovDataAlly.name
                    };
                }
                if(sovDataCorp){
                    sovereigntySecondary = {
                        row1Label: 'Corp',
                        row1Val: sovDataCorp.name,
                        row1Img: Util.eveImageUrl('corporations', sovDataCorp.id, 64)
                    };
                }
            }
        }

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
            sovereigntyPrimary: sovereigntyPrimary ? Object.assign({}, sovereigntyDefault, sovereigntyPrimary) : undefined,
            sovereigntySecondary: sovereigntySecondary ? Object.assign({}, sovereigntyDefault, sovereigntySecondary) : undefined,
            static: staticsData,
            moduleHeadlineIconClass: config.moduleHeadlineIconClass,
            textActionIconCopyClass: config.textActionIconCopyClass,
            infoSectionClass: config.systemInfoSectionClass,
            descriptionSectionClass: config.descriptionSectionClass,
            sovSectionClass: config.systemSovSectionClass,
            infoTableClass: config.systemInfoTableClass,
            sovTableClass: config.systemSovTableClass,
            nameInfoClass: config.systemInfoNameClass,
            effectInfoClass: config.systemInfoEffectClass,
            planetsInfoClass: config.systemInfoPlanetsClass,
            wormholePrefixClass: config.systemInfoWormholeClass,
            statusInfoClass: config.systemInfoStatusLabelClass,
            popoverTriggerClass: Util.config.popoverTriggerClass,

            // sovereignty table
            sovFwContestedRowClass: config.systemSovFwContestedRowClass,
            sovFwOccupationRowClass: config.systemSovFwOccupationRowClass,
            sovFwContestedInfoClass: config.systemSovFwContestedClass,
            sovFwPercentageInfoClass: config.systemSovFwPercentageClass,
            sovFwOccupationInfoClass: config.systemSovFwOccupationClass,
            sovFwOccupationImageClass: config.systemSovFwOccupationImageClass,
            sovFwStatusIconClass: config.systemSovFwStatusIconClass,

            systemUrl: MapUtil.getMapDeeplinkUrl(mapId, systemData.id),
            systemTypeName: MapUtil.getSystemTypeInfo(systemData.type.id, 'name'),
            systemStatusId: systemData.status.id,
            systemStatusClass: Util.getStatusInfoForSystem(systemData.status.id, 'class'),
            systemStatusLabel: Util.getStatusInfoForSystem(systemData.status.id, 'label'),
            securityClass: Util.getSecurityClassForSystem(systemData.security),
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
            systemUrlLinkClass: config.textActionIconCopyClass,
            ccpImageServerUrl: Init.url.ccpImageServer,
            thirdPartyLinks: getThirdPartySystemLinks(['dotlan', 'eveeye', 'anoik', 'eve'], systemData)
        };

        requirejs(['text!templates/modules/system_info.html', 'mustache', 'summernote.loader'], (template, Mustache, Summernote) => {
            let content = Mustache.render(template, data);
            moduleElement.append(content);

            let sovSectionArea = moduleElement.find('.' + config.systemSovSectionClass + ' .' + Util.config.dynamicAreaClass);
            let descriptionArea = moduleElement.find('.' + config.descriptionAreaClass);
            let descriptionButton = moduleElement.find('.' + config.addDescriptionButtonClass);
            let descriptionTextareaElement =  moduleElement.find('.' + config.descriptionTextareaElementClass);

            // lock "description" field until first update
            descriptionArea.showLoadingAnimation();
            sovSectionArea.showLoadingAnimation();

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
            moduleElement.find('.' + config.textActionIconCopyClass).on('click', function(){
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

            // 3rd party click callbacks ------------------------------------------------------------------------------
            moduleElement.on('click', '[data-link]', e => {
                for(let link of data.thirdPartyLinks){
                    if(
                        e.target.dataset.link === link.page &&
                        typeof link.action === 'function'
                    ){
                        link.action(e);
                        break;
                    }
                }
            });

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
