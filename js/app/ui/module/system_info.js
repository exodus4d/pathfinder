/**
 * System info module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/util',
    'summernote'
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
        descriptionArea: 'pf-system-info-description-area',                     // class for "description" area
        addDescriptionButtonClass: 'pf-system-info-description-button',         // class for "add description" button
        descriptionTextareaElementClass: 'pf-system-info-description',          // class for "description" textarea element (xEditable)

        // fonts
        fontTriglivianClass: 'pf-triglivian',                                   // class for "Triglivian" names (e.g. Abyssal systems)

        // Summernote
        defaultBgColor: '#e2ce48'
    };

    // max character length for system description
    let maxDescriptionLength = 512;


    let initTextEditor = (element, options) => {

        // "length" hint plugin ---------------------------------------------------------------------------------------
        $.extend($.summernote.plugins, {
            /**
             * @param {Object} context - context object has status of editor.
             */
            lengthField: function (context){
                let self = this;
                let ui = $.summernote.ui;

                // add counter
                context.memo('button.lengthField', () => {
                    return $('<kbd>', {
                        class: ['text-right', 'txt-color'].join(' ')
                    });
                });

                /**
                 * update counter element with left chars
                 * @param contents
                 */
                let updateCounter = (contents) => {
                    let maxTextLength = context.options.maxTextLength;
                    let textLength = contents.length;
                    let counter = context.layoutInfo.toolbar.find('kbd');
                    let counterLeft = maxTextLength - textLength;

                    counter.text(counterLeft).data('charCount', counterLeft);
                    counter.toggleClass('txt-color-red', maxTextLength <= textLength);

                    // disable "save" button
                    let saveBtn = context.layoutInfo.toolbar.find('.btn-save');
                    saveBtn.prop('disabled', maxTextLength < textLength);
                };

                // events
                this.events = {
                    'summernote.init': function (we, e) {
                        updateCounter(context.$note.summernote('code'));
                    },
                    'summernote.change': function(we, contents){
                        updateCounter(contents);

                    }
                };
            }
        });

        // "discard" button plugin ------------------------------------------------------------------------------------
        $.extend($.summernote.plugins, {
            /**
             * @param {Object} context - context object has status of editor.
             */
            discardBtn: function (context){
                let self = this;
                let ui = $.summernote.ui;

                // add button
                context.memo('button.discardBtn', () => {
                    let button = ui.button({
                        contents: '<i class="fas fw fa-times"/>',
                        container: 'body',
                        click: function(){
                            // show confirmation dialog
                            $(this).confirmation('show');
                        }
                    });
                    let $button = button.render();

                    // show "discard" changes confirmation
                    let confirmationSettings = {
                        container: 'body',
                        placement: 'top',
                        btnCancelClass: 'btn btn-sm btn-default',
                        btnCancelLabel: 'cancel',
                        btnCancelIcon: 'fas fa-fw fa-ban',
                        title: 'discard changes',
                        btnOkClass: 'btn btn-sm btn-warning',
                        btnOkLabel: 'discard',
                        btnOkIcon: 'fas fa-fw fa-times',
                        onConfirm: (e, target) => {
                            // discard all changes
                            context.$note.summernote('reset');
                            context.$note.summernote('destroy');
                        }
                    };
                    $button.confirmation(confirmationSettings);

                    return $button;
                });
            }
        });

        // "save button -----------------------------------------------------------------------------------------------
        let saveBtn = context => {
            let ui = $.summernote.ui;
            let button = ui.button({
                contents: '<i class="fas fw fa-check"/>',
                container: 'body',
                className: ['btn-success', 'btn-save'],
                click: e => {
                    // save changes
                    if( !context.$note.summernote('isEmpty') ){
                        // get current code
                        let description = context.$note.summernote('code');
                        console.log('code to save: ', description)
                    }

                    context.$note.summernote('destroy');
                }
            });

            return button.render();
        };

        let defaultOptions = {
            height: 68,                 // set editor height
            minHeight: 68,              // set minimum height of editor
            maxHeight: 500,             // set maximum height of editor
            dialogsInBody: true,
            dialogsFade: true,

            //textareaAutoSync: false,
            //hintDirection: 'right',
            //tooltip: 'right',
            //container: 'body',

            toolbar: [
                ['style', ['style']],
                ['font', ['bold', 'underline', 'strikethrough', 'clear']],
                ['color', ['color']],
                //['para', ['ul', 'ol', 'paragraph']],
                ['table', ['table']],
                ['insert', ['link', 'hr']],
                //['view', ['codeview', 'help']],
                ['misc', ['undo', 'redo']],
                ['lengthField'],
                ['customBtn', [ 'discardBtn', 'saveBtn']]
            ],
            buttons: {
                saveBtn: saveBtn
            },
            insertTableMaxSize: {
                col: 4,
                row: 4
            },
            icons: {
                //'align': 'note-icon-align',
                'alignCenter': 'fas fa-align-center',
                'alignJustify': 'fas fa-align-justify',
                'alignLeft': 'fas fa-align-left',
                'alignRight': 'fas fa-align-right',
                //'rowBelow': 'note-icon-row-below',
                //'colBefore': 'note-icon-col-before',
                //'colAfter': 'note-icon-col-after',
                //'rowAbove': 'note-icon-row-above',
                //'rowRemove': 'note-icon-row-remove',
                //'colRemove': 'note-icon-col-remove',
                'indent': 'fas fa-indent',
                'outdent': 'fas fa-outdent',
                'arrowsAlt': 'fas fa-expand-arrows-alt',
                'bold': 'fas fa-bold',
                'caret': 'fas fa-caret-down',
                'circle': 'fas fa-circle',
                'close': 'fas fa-time',
                'code': 'fas fa-code',
                'eraser': 'fas fa-eraser',
                'font': 'fas fa-font',
                //'frame': 'note-icon-frame',
                'italic': 'fas fa-italic',
                'link': 'fas fa-link',
                'unlink': 'fas fa-unlink',
                'magic': 'fas fa-magic',
                'menuCheck': 'fas fa-check',
                'minus': 'fas fa-minus',
                'orderedlist': 'fas fa-list-ol',
                'pencil': 'fa-pen',
                'picture': 'fas fa-image',
                'question': 'fas fa-question',
                'redo': 'fas fa-redo',
                'square': 'fas fa-square',
                'strikethrough': 'fas fa-strikethrough',
                'subscript': 'fas fa-subscript',
                'superscript': 'fas fa-superscript',
                'table': 'fas fa-table',
                'textHeight': 'fas fa-text-height',
                'trash': 'fas fa-trash',
                'underline': 'fas fa-underline',
                'undo': 'fas fa-undo',
                'unorderedlist': 'fas fa-list-ul',
                'video': 'fab fa-youtube'
            },
            colors: [
                ['#5cb85c', '#e28a0d', '#d9534f', '#e06fdf', '#9fa8da', '#e2ce48', '#428bca']
            ],
            colorsName: [
                ['Green', 'Orange', 'Red', 'Pink', 'Indigo', 'Yellow', 'Blue']
            ],
        };

        options = $.extend({}, defaultOptions, options);

        element.summernote(options);
    };

    /**
     * update trigger function for this module
     * compare data and update module
     * @param moduleElement
     * @param systemData
     */
    let updateModule = (moduleElement, systemData) => {
        let systemId = moduleElement.data('id');

        if(systemId === systemData.id){
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
            if(typeof descriptionTextareaElement.data().summernote === 'object'){
                // "Summernote" editor is currently open
                console.log('Open');
            }else{
                // not open
                console.log('NOT open');
                let description = descriptionTextareaElement.html();
                console.log(description);
                console.log('update: ', description === systemData.description);
                if(description !== systemData.description){
                    descriptionTextareaElement.html(systemData.description);
                }
            }
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
                wormholeData.class = Util.getSecurityClassForSystem(wormholeData.security);
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
            descriptionButtonClass: config.addDescriptionButtonClass,
            descriptionTextareaClass: config.descriptionTextareaElementClass,
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

        requirejs(['text!templates/modules/system_info.html', 'mustache'], (template, Mustache) => {
            let content = Mustache.render(template, data);
            moduleElement.append(content);

            // lock "description" field until first update
            moduleElement.find('.' + config.descriptionArea).showLoadingAnimation();

            // WYSIWYG init on button click ---------------------------------------------------------------------------
            let descriptionButton = moduleElement.find('.' + config.addDescriptionButtonClass);
            let descriptionTextareaElement =  moduleElement.find('.' + config.descriptionTextareaElementClass);

            descriptionButton.on('click', function(e){
                e.stopPropagation();
                let descriptionButton = $(this);
                // hide edit button
                descriptionButton.hide();

                initTextEditor(descriptionTextareaElement, {
                    focus: true,
                    placeholder: false,
                    maxTextLength: maxDescriptionLength,
                    disableDragAndDrop: true,
                    shortcuts: false,
                    callbacks: {
                        onInit: function(context){
                            // set default background color
                            // -> could not figure out how to set by API as default color
                            context.toolbar.find('.note-current-color-button').attr('data-backcolor', config.defaultBgColor)
                                .find('.note-recent-color').css('background-color', config.defaultBgColor);
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
                        Util.showNotify({title: 'Copied to clipbaord', text: mapUrl, type: 'success'});
                    }
                });
            });

            // created/updated tooltip --------------------------------------------------------------------------------
            let nameRowElement = moduleElement.find('.' + config.systemInfoNameClass);

            let tooltipData = {
                created: systemData.created,
                updated: systemData.updated
            };

            nameRowElement.addCharacterInfoTooltip( tooltipData );

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
