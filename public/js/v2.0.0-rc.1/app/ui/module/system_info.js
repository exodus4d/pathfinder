/**
 * System info module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/util',
    'module/base'
], ($, Init, Util, MapUtil, BaseModule) => {
    'use strict';

    let SystemInfoModule = class SystemInfoModule extends BaseModule {
        constructor(config = {}) {
            super(Object.assign({}, new.target.defaultConfig, config));
        }

        /**
         * custom header for this module
         * @returns {*}
         */
        newHeaderElement(){
            let headEl = this.newHeadElement();

            let headAliasEl = this.newHeadlineElement(this._systemData.alias || this._systemData.name);
            headAliasEl.setAttribute('title', 'alias');
            headAliasEl.classList.add('pull-right');
            if(this._systemData.security === 'A'){
                headAliasEl.classList.add(this._config.fontTriglivianClass);
            }

            let iconEl = this.newIconElement(['fa-fw', 'fa-angle-double-right']);

            let headSysTypeEl = this.newHeadlineElement();
            let sysTypeEl = document.createElement('span');
            sysTypeEl.setAttribute('title', 'type');
            sysTypeEl.classList.add(this._config.typeLinkClass);
            sysTypeEl.textContent = MapUtil.getSystemTypeInfo(this._systemData.type.id, 'name');
            headSysTypeEl.append(sysTypeEl, iconEl);

            let headSysRegionEl = this.newHeadlineElement();
            let sysRegionEl = document.createElement('span');
            sysRegionEl.setAttribute('title', 'region');
            sysRegionEl.classList.add(this._config.regionLinkClass);
            if(this._systemData.security === 'A'){
                sysRegionEl.classList.add(this._config.fontTriglivianClass);
            }
            sysRegionEl.textContent = this._systemData.region.name;
            headSysRegionEl.append(sysRegionEl, iconEl.cloneNode());

            let headSysConstellationEl = this.newHeadlineElement();
            let sysConstellationEl = document.createElement('span');
            sysConstellationEl.classList.add(this._config.constellationLinkClass, this._config.linkClass, Util.config.popoverTriggerClass);
            if(this._systemData.security === 'A'){
                sysConstellationEl.classList.add(this._config.fontTriglivianClass);
            }
            sysConstellationEl.textContent = this._systemData.constellation.name;
            sysConstellationEl.setAttribute('popup-ajax', Init.path.getConstellationData + '/' + this._systemData.constellation.id);
            headSysConstellationEl.append(sysConstellationEl, iconEl.cloneNode());

            let headSysNameEl = this.newHeadlineElement();
            let sysNameEl = document.createElement('span');
            sysNameEl.setAttribute('title', 'system');
            if(this._systemData.security === 'A'){
                sysNameEl.classList.add(this._config.fontTriglivianClass);
            }
            sysNameEl.textContent = this._systemData.name;
            let iconCopyEl = this.newIconElement(['fa-fw', 'fa-copy', this._config.moduleHeadlineIconClass, this._config.textActionIconCopyClass]);
            iconCopyEl.setAttribute('title', 'copy url');
            iconCopyEl.dataset.copy = MapUtil.getMapDeeplinkUrl(this._systemData.mapId, this._systemData.id);
            headSysNameEl.append(sysNameEl, iconCopyEl);
            if(this._systemData.locked){
                let iconLockedEl = this.newIconElement(['fa-fw', 'fa-lock', this._config.moduleHeadlineIconClass]);
                iconLockedEl.setAttribute('title', 'locked');
                headSysNameEl.append(iconLockedEl);
            }
            for(let linkData of this.getThirdPartySystemLinks(['dotlan', 'eveeye', 'anoik'])){
                if(linkData.showInModuleHead){
                    let headSysLinkEl = document.createElement('a');
                    headSysLinkEl.classList.add('pf-bg-icon-inline');
                    headSysLinkEl.style.setProperty('--bg-image', `url("${Util.imgRoot()}icons/logo_${linkData.page}.png")`);
                    headSysLinkEl.setAttribute('title', linkData.title);
                    headSysLinkEl.setAttribute('href', linkData.url);
                    headSysLinkEl.setAttribute('target', '_blank');
                    headSysLinkEl.setAttribute('rel', 'noopener');
                    headSysNameEl.append(headSysLinkEl);
                }
            }

            headEl.append(
                this.newHandlerElement(),
                headAliasEl,
                headSysTypeEl,
                headSysRegionEl,
                headSysConstellationEl,
                headSysNameEl
            );
            return headEl;
        }

        /**
         * update module
         * @param systemData
         * @returns {Promise}
         */
        update(systemData){
            return super.update(systemData).then(systemData => new Promise(resolve => {
                if(
                    this._systemData.id === systemData.id &&
                    this._updated !== systemData.updated.updated
                ){
                    let setUpdated = true;

                    // created/updated tooltip ------------------------------------------------------------------------
                    let nameRowElement = $(this.moduleElement).find('.' + this._config.systemInfoNameClass);
                    let tooltipData = {
                        created: systemData.created,
                        updated: systemData.updated
                    };
                    nameRowElement.addCharacterInfoTooltip(tooltipData);

                    // update system status ---------------------------------------------------------------------------
                    let systemStatusLabelElement = $(this.moduleElement).find('.' + this._config.systemInfoStatusLabelClass);
                    let systemStatusId = parseInt(systemStatusLabelElement.attr('data-status'));

                    if(systemStatusId !== systemData.status.id){
                        // status changed
                        let currentStatusClass = Util.getStatusInfoForSystem(systemStatusId, 'class');
                        let newStatusClass = Util.getStatusInfoForSystem(systemData.status.id, 'class');
                        let newStatusLabel = Util.getStatusInfoForSystem(systemData.status.id, 'label');
                        systemStatusLabelElement.removeClass(currentStatusClass).addClass(newStatusClass).text(newStatusLabel);

                        // set new status attribute
                        systemStatusLabelElement.attr('data-status', systemData.status.id);
                    }

                    // update description textarea --------------------------------------------------------------------
                    let descriptionTextareaElement = $(this.moduleElement).find('.' + this._config.descriptionTextareaElementClass);
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
                                if(!Util.isValidHtml(newDescription)){
                                    // try to convert raw text into valid html
                                    newDescription = newDescription.replace(/(\r\n|\n|\r)/g, '<br>');
                                    newDescription = '<p>' + newDescription + '</p>';
                                }

                                descriptionTextareaElement.html(newDescription);
                            }
                        }
                    }

                    if(setUpdated){
                        this._updated = systemData.updated.updated;
                    }
                }

                $(this.moduleElement).hideLoadingAnimation();

                resolve({
                    action: 'update',
                    data: {
                        module: this
                    }
                });
            }));
        }

        /**
         * render module
         * @param mapId
         * @param systemData
         * @returns {HTMLElement}
         */
        render(mapId, systemData){
            this._systemData = systemData;

            let rowEl = document.createElement('div');
            rowEl.classList.add(this._config.bodyClassName, 'grid');

            let colInfoEl, colSovEl, colDescEl;

            colInfoEl = document.createElement('div');
            colInfoEl.classList.add(this._config.systemInfoSectionClass);
            rowEl.append(colInfoEl);

            colSovEl = document.createElement('div');
            colSovEl.classList.add(this._config.systemSovSectionClass, 'pf-dynamic-area');
            rowEl.append(colSovEl);

            colDescEl = document.createElement('div');
            colDescEl.classList.add(this._config.descriptionSectionClass);
            rowEl.append(colDescEl);

            this.moduleElement.append(rowEl);

            require(['text!templates/modules/system_info.html', 'mustache', 'summernote.loader'], (template, Mustache, Summernote) => {
                SystemInfoModule.Mustache = Mustache;
                SystemInfoModule.Summernote = Summernote;

                template = new DOMParser().parseFromString(template, 'text/html');
                SystemInfoModule.tplInfoSection = template.getElementById('tplInfoSection').innerHTML;
                SystemInfoModule.tplSovSection = template.getElementById('tplSovSection').innerHTML;
                SystemInfoModule.tplDescSection = template.getElementById('tplDescSection').innerHTML;

                // optional parse() for cache parsed templates
                SystemInfoModule.Mustache.parse(SystemInfoModule.tplInfoSection);
                SystemInfoModule.Mustache.parse(SystemInfoModule.tplSovSection);
                SystemInfoModule.Mustache.parse(SystemInfoModule.tplDescSection);

                this.renderInfoSection(colInfoEl, SystemInfoModule.tplInfoSection);
                this.renderSovSection(colSovEl, SystemInfoModule.tplSovSection);
                this.renderDescSection(colDescEl, SystemInfoModule.tplDescSection);

                this.setModuleObserver();
            });

            return this.moduleElement;
        }

        /**
         * render 'sovereignty' section
         * @param parentEl
         * @param template
         */
        renderInfoSection(parentEl, template){
            if(SystemInfoModule.Mustache && parentEl && template){
                let data = {
                    config: this._config,
                    system: this._systemData,
                    systemStatusClass: Util.getStatusInfoForSystem(this._systemData.status.id, 'class'),
                    systemStatusLabel: Util.getStatusInfoForSystem(this._systemData.status.id, 'label'),
                    systemNameClass: this._systemData.security === 'A' ? this._config.fontTriglivianClass : '',
                    systemSecurityClass: Util.getSecurityClassForSystem(this._systemData.security),
                    trueSec: this._systemData.trueSec.toFixed(1),
                    trueSecClass: Util.getTrueSecClassForSystem(this._systemData.trueSec),
                    systemEffectName: MapUtil.getEffectInfoForSystem(this._systemData.effect, 'name'),
                    systemEffectClass: MapUtil.getEffectInfoForSystem(this._systemData.effect, 'class'),
                    systemPlanetCount: this._systemData.planets ? this._systemData.planets.length : 0,
                    systemStaticData: (Util.getObjVal(this._systemData, 'statics') || []).reduce((acc, wormholeName) => {
                        acc.push(Object.assign({}, Init.wormholes[wormholeName]));
                        return acc;
                    }, []),
                    systemShatteredClass: Util.getSecurityClassForSystem('SH'),
                    popoverTriggerClass: Util.config.popoverTriggerClass
                };
                parentEl.innerHTML = SystemInfoModule.Mustache.render(template, data);

                this.setInfoSectionObserver(parentEl);
            }
        }

        /**
         * render 'sovereignty' section
         * @param parentEl
         * @param template
         */
        renderSovSection(parentEl, template){
            if(SystemInfoModule.Mustache && parentEl && template){
                // system "sovereignty" data
                // "primary" data is either "alliance" -> 0.0 space
                //           or "faction" -> Empire Regions (LS, HS)
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

                if(this._systemData.sovereignty){
                    let sovDataFact = Util.getObjVal(this._systemData.sovereignty, 'faction');
                    let sovDataAlly = Util.getObjVal(this._systemData.sovereignty, 'alliance');
                    let sovDataCorp = Util.getObjVal(this._systemData.sovereignty, 'corporation');

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

                let data = {
                    config: this._config,
                    sovereigntyPrimary: sovereigntyPrimary ? Object.assign({}, sovereigntyDefault, sovereigntyPrimary) : undefined,
                    sovereigntySecondary: sovereigntySecondary ? Object.assign({}, sovereigntyDefault, sovereigntySecondary) : undefined,
                };

                // show only if sov data exists
                if(data.sovereigntyPrimary){
                    parentEl.innerHTML = SystemInfoModule.Mustache.render(template, data);

                    this.setSovSectionObserver(parentEl);
                }else{
                    parentEl.parentNode.classList.add(this._config.bodyClassName + '-small');
                    parentEl.remove();
                }
            }
        }

        /**
         * render 'description' section
         * @param parentEl
         * @param template
         */
        renderDescSection(parentEl, template){
            if(SystemInfoModule.Mustache && parentEl && template){
                let data = {
                    config: this._config,
                    summernoteClass: Util.config.summernoteClass
                };
                parentEl.innerHTML = SystemInfoModule.Mustache.render(template, data);

                this.setDescSectionObserver(parentEl);
            }
        }

        /**
         * init module
         */
        init(){
            super.init();
        }

        /**
         * set module observer
         */
        setModuleObserver(){
            // init copy system deeplink URL
            $(this.moduleElement).find('.' + this._config.textActionIconCopyClass).on('click', function(){
                let mapUrl = $(this).attr('data-copy');
                Util.copyToClipboard(mapUrl).then(payload => {
                    if(payload.data){
                        Util.showNotify({title: 'Copied to clipboard', text: mapUrl, type: 'success'});
                    }
                });
            });

            // init constellation popover
            $(this.moduleElement).find('[popup-ajax]').popover({
                html: true,
                trigger: 'hover',
                placement: 'top',
                delay: 200,
                container: 'body',
                content: function(){
                    //return details_in_popup(this);
                    let popoverElement = $(this);
                    let popover = popoverElement.data('bs.popover');

                    $.ajax({
                        url: popoverElement.attr('popup-ajax'),
                        success: function(data){
                            popover.options.content = Util.getSystemsInfoTable(data.systemsData);
                            // reopen popover (new content size)
                            popover.show();
                        }
                    });
                    return 'Loading...';
                }
            });

            // init tooltips
            $(this.moduleElement).initTooltips({
                placement: 'top'
            });
        }

        /**
         * observer 'info' section
         * @param parentEl
         */
        setInfoSectionObserver(parentEl){
            // init system effect popover
            $(parentEl).find('.' + this._config.systemInfoEffectClass).addSystemEffectTooltip(
                this._systemData.security,
                this._systemData.effect, {
                    placement: 'left'
                });

            // init planets popover
            $(parentEl).find('.' + this._config.systemInfoPlanetsClass).addSystemPlanetsTooltip(
                this._systemData.planets, {
                placement: 'left'
            });

            // init static wormhole popover
            MapUtil.initWormholeInfoTooltip($(parentEl), '[data-name]', {
                placement: 'left'
            });
        }

        /**
         * observer 'sovereignty' section
         * @param parentEl
         */
        setSovSectionObserver(parentEl){
            // "lock" area until first update
            $(parentEl).showLoadingAnimation();
        }

        /**
         * observer 'description' section
         * @param parentEl
         */
        setDescSectionObserver(parentEl){
            let descriptionArea = $(parentEl).find('.' + this._config.descriptionAreaClass);
            let descriptionButton = $(parentEl).find('.' + this._config.addDescriptionButtonClass);
            let descriptionTextareaElement = $(parentEl).find('.' + this._config.descriptionTextareaElementClass);
            let maxDescriptionLength = this._config.maxDescriptionLength;
            let systemId = this._systemData.id;
            let saveCallback = this.update.bind(this);

            // "lock" area until first update
            descriptionArea.showLoadingAnimation();

            // WYSIWYG init on button click ---------------------------------------------------------------------------
            descriptionButton.on('click', function(e){
                e.stopPropagation();
                let descriptionButton = $(this);
                // hide edit button
                descriptionButton.hide();

                // content has changed
                let descriptionChanged = false;

                SystemInfoModule.Summernote.initSummernote(descriptionTextareaElement, {
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

                                        if(context.$note.summernote('isEmpty')){
                                            // ... isEmpty -> clear empty default tags as well
                                            context.$note.summernote('code', '');
                                        }else{
                                            description = context.$note.summernote('code');
                                            if(!Util.isValidHtml(description)){
                                                // ... not valid HTML
                                                validDescription = false;
                                                context.layoutInfo.editable.addClass('has-error');
                                                Util.showNotify({title: 'Validation failed', text: 'HTML not valid', type: 'error'});
                                            }
                                        }

                                        if(validDescription){
                                            // ... valid -> save()
                                            descriptionArea.showLoadingAnimation();

                                            Util.request('PATCH', 'System', systemId, {
                                                description: description
                                            }, {
                                                descriptionArea: descriptionArea
                                            }, context => {
                                                // always do
                                                context.descriptionArea.hideLoadingAnimation();
                                            }).then(
                                                payload => {
                                                    context.$note.summernote('destroy');
                                                    saveCallback(payload.data);
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
                            let defaultBgColor = '#e2ce48';
                            context.toolbar.find('.note-current-color-button').attr('data-backcolor', defaultBgColor)
                                .find('.note-recent-color').css('background-color', defaultBgColor);
                        },
                        onChange: function(contents){
                            descriptionChanged = true;
                        },
                        onPaste: function(e){
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
        }

        /**
         * get 3rd party system link configuration
         * @param pages
         * @returns {[]}
         */
        getThirdPartySystemLinks(pages){
            let links = [];
            let isWormhole = MapUtil.getSystemTypeInfo(Util.getObjVal(this._systemData, 'type.id'), 'name') === 'w-space';
            let systemName = Util.getObjVal(this._systemData, 'name') || '';
            let regionName = Util.getObjVal(this._systemData, 'region.name') || '';

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
                }

                if(link){
                    links.push(Object.assign({}, link, {
                        page: pages[i],
                        showInModuleHead: showInModuleHead
                    }));
                }
            }

            return links;
        }

        beforeDestroy(){
            super.beforeDestroy();

            let descriptionTextareaEl = this.moduleElement.querySelector(`.${this._config.descriptionTextareaElementClass}`);
            if(descriptionTextareaEl && $(descriptionTextareaEl).summernote){
                $(descriptionTextareaEl).summernote('destroy');
            }
        }
    };

    SystemInfoModule.isPlugin = false;                                          // module is defined as 'plugin'
    SystemInfoModule.scope = 'system';                                          // module scope controls how module gets updated and what type of data is injected
    SystemInfoModule.sortArea = 'a';                                            // default sortable area
    SystemInfoModule.position = 2;                                              // default sort/order position within sortable area
    SystemInfoModule.label = 'Information';                                     // static module label (e.g. description)
    SystemInfoModule.fullDataUpdate = true;                                     // static module requires additional data (e.g. system description,...)

    SystemInfoModule.defaultConfig = {
        className: 'pf-system-info-module',                                     // class for module
        sortTargetAreas: ['a', 'b', 'c'],                                       // sortable areas where module can be dragged into

        // headline toolbar
        textActionIconCopyClass: 'pf-module-icon-button-copy',                  // class for text action "copy"

        // breadcrumb
        constellationLinkClass: 'pf-system-info-constellation',                 // class for "constellation" name
        regionLinkClass: 'pf-system-info-region',                               // class for "region" name
        typeLinkClass: 'pf-system-info-type',                                   // class for "type" name

        // info area
        systemInfoSectionClass: 'pf-system-info-section',                       // class for system info section
        systemInfoTableClass: 'pf-module-table',                                // class for system info table
        systemInfoNameClass: 'pf-system-info-name',                             // class for "name" information element
        systemInfoEffectClass: 'pf-system-info-effect',                         // class for "effect" information element
        systemInfoPlanetsClass: 'pf-system-info-planets',                       // class for "planets" information element
        systemInfoStatusLabelClass: 'pf-system-info-status-label',              // class for "status" information element

        // sovereignty area
        systemSovSectionClass: 'pf-system-sov-section',                         // class for system sov. section
        systemSovTableClass: 'pf-module-table',                                 // class for system sov. table
        systemSovFwContestedRowClass: 'pf-system-sov-fw-contested-row',         // class for "contested" sov. table row
        systemSovFwOccupationRowClass: 'pf-system-sov-fw-occupation-row',       // class for "-occupation" sov. table row
        systemSovFwContestedClass: 'pf-system-sov-fw-contested',
        systemSovFwPercentageClass: 'pf-system-sov-fw-percentage',
        systemSovFwOccupationClass: 'pf-system-sov-fw-occupation',
        systemSovFwOccupationImageClass: 'pf-system-sov-fw-occupation-image',
        systemSovFwStatusIconClass: 'pf-system-sov-fw-status-icon',

        // description area
        descriptionSectionClass: 'pf-system-description-section',               // class for system description section
        descriptionAreaClass: 'pf-system-info-description-area',                // class for description area
        addDescriptionButtonClass: 'pf-system-info-description-button',         // class for "add description" button
        descriptionTextareaElementClass: 'pf-system-info-description',          // class for description textarea element (Summernote)
        maxDescriptionLength: 9000,                                             // max character length for system description

        // fonts
        fontTriglivianClass: 'pf-triglivian',                                   // class for "Triglivian" names (e.g. Abyssal systems)
        linkClass: 'pf-link'
    };

    return SystemInfoModule;
});
