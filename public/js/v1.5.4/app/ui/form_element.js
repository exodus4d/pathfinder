/**
 * form elements
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/map/util'
], ($, Init, Util, MapUtil) => {
    'use strict';

    let config = {
        // Select2
        resultOptionImageClass: 'pf-result-image',                      // class for Select2 result option entry with image
        select2ImageLazyLoadClass: 'pf-select2-image-lazyLoad'          // class for Select2 result images that should be lazy loaded
    };

    /**
     * format result data
     * @param data
     * @returns {*}
     */
    let formatCategoryTypeResultData  = data => {
        if(data.loading) return data.text;
        if(data.placeholder) return data.placeholder;

        let markup = '<div class="clearfix ' + config.resultOptionImageClass + '">';

        if(data.hasOwnProperty('children')){
            // category group label
            markup += '<div class="col-xs-9">' + data.text + '</div>';
            markup += '<div class="col-xs-3 text-right">(' + data.children.length + ')</div>';
        }else{
            let imagePath = '';
            let iconName = '';
            let thumb = '';

            switch(data.categoryType){
                case 'character':
                    imagePath = Init.url.ccpImageServer + '/Character/' + data.id + '_32.jpg';
                    break;
                case 'corporation':
                    imagePath = Init.url.ccpImageServer + '/Corporation/' + data.id + '_32.png';
                    break;
                case 'alliance':
                    imagePath = Init.url.ccpImageServer + '/Alliance/' + data.id + '_32.png';
                    break;
                case 'inventoryType':
                    imagePath = Init.url.ccpImageServer + '/Type/' + data.id + '_32.png';
                    break;
                case 'render':
                    imagePath = Init.url.ccpImageServer + '/Render/' + data.id + '_32.png';
                    break;
                case 'station':
                    iconName = 'fa-home';
                    break;
                case 'system':
                    iconName = 'fa-sun';
                    break;
            }

            if(imagePath){
                thumb = '<img class="' + config.select2ImageLazyLoadClass + '" data-original="' + imagePath + '" style="max-width: 100%"/>';
            }else if(iconName){
                thumb = '<i class="fas fa-fw ' + iconName + '" ></i>';
            }

            markup += '<div class="col-xs-2">' + thumb + '</div>';
            markup += '<div class="col-xs-10">' + data.text + '</div>';
        }
        markup += '</div>';

        return markup;
    };

    /**
     * format results data for signature type select
     * @param state
     * @returns {*|jQuery|HTMLElement}
     */
    let formatSignatureTypeSelectionData = state => {
        let parts = state.text.split(' - ');

        let markup = '';
        if(parts.length === 2){
            // wormhole data -> 2 columns
            let securityClass = Util.getSecurityClassForSystem(getSystemSecurityFromLabel(parts[1]));
            markup += '<span>' + parts[0] + '</span>&nbsp;&nbsp;';
            markup += '<i class="fas fa-long-arrow-alt-right txt-color txt-color-grayLight"></i>';
            markup += '<span class="' + securityClass + ' ' + Util.config.popoverTriggerClass + ' ' + Util.config.helpDefaultClass +
                '" data-name="' + parts[0] + '">&nbsp;&nbsp;' + parts[1] + '&nbsp;</span>';
        }else{
            markup += '<span>' + state.text + '</span>';
        }

        return $(markup);
    };

    /**
     * format result data for signature type OR signature connection data
     * @param data
     * @param formatType
     * @returns {*}
     */
    let formatSignatureTypeConnectionResultData = (data, formatType) => {
        if(data.loading) return data.text;
        if(data.placeholder) return data.placeholder;

        let markup = '<div class="clearfix">';

        if(data.hasOwnProperty('children')){
            // optgroup label
            markup += '<div class="col-xs-9">' + data.text + '</div>';
            markup += '<div class="col-xs-3 text-right">(' + data.children.length + ')</div>';
        }else{
            // child label
            let parts = data.text.split(' - ');
            if(parts.length === 2){
                // wormhole data -> 2 columns
                let securityClass = Util.getSecurityClassForSystem(getSystemSecurityFromLabel(parts[1]));

                switch(formatType){
                    case 'wormhole':
                        markup += '<div class="col-xs-3">' + parts[0] + '</div>';
                        markup += '<div class="col-xs-2 text-center"><i class="fas fa-long-arrow-alt-right"></i></div>';
                        markup += '<div class="col-xs-7 ' + securityClass + '">' + parts[1] + '</div>';
                        break;
                    case 'system':
                        markup += '<div class="col-xs-10">' + parts[0] + '</div>';
                        markup += '<div class="col-xs-2 ' + securityClass + '">' + parts[1] + '</div>';
                        break;
                }
            }else{
                markup += '<div class="col-xs-12">' + data.text + '</div>';
            }
        }
        markup += '</div>';

        return $(markup);
    };

    /**
     * format results data for signature connection select
     * @param state
     * @returns {*|jQuery|HTMLElement}
     */
    let formatSignatureConnectionSelectionData = state => {
        let parts = state.text.split(' - ');

        let markup = '';
        if(parts.length === 2){
            // wormhole data -> 2 columns

            let styleClass = ['pf-fake-connection-text'];
            if(state.metaData){
                let metaData = state.metaData;
                if(metaData.type){
                    let type = metaData.type;
                    if(type.includes('wh_eol')){
                        styleClass.push('pf-wh-eol');
                    }
                    if(type.includes('wh_reduced')){
                        styleClass.push('pf-wh-reduced');
                    }
                    if(type.includes('wh_critical')){
                        styleClass.push('pf-wh-critical');
                    }
                    if(type.includes('wh_jump_mass_s')){
                        styleClass.push('pf-wh-frig');
                    }
                }
            }

            let securityClass = Util.getSecurityClassForSystem(parts[1]);
            markup += '<span class="' + styleClass.join(' ') + '">' + parts[0] + '</span>&nbsp;&nbsp;';
            markup += '<span class="' + securityClass + '">' + parts[1] + '</span>';
        }else{
            markup += '<span>' + state.text + '</span>';
        }

        return $(markup);
    };

    /**
     * try to parse a security label into  security name
     * -> "C1/2/3 (unknown)"    -> C1
     *    "C3"                  -> C3
     *    "H"                   -> H
     *    "0.0"                 -> 0.0
     *    "C12 Thera"           -> C12
     * @param security
     * @returns {string}
     */
    let getSystemSecurityFromLabel = security => {
        let matches = security.match(/^(\w+\.?\w?)/i);
        return matches ? matches[1] : '';
    };

    /**
     * init a select element as "select2" for map selection
     */
    $.fn.initMapSelect = function(){
        let selectElement = $(this);

        $.when(
            selectElement.select2({
                dropdownParent: selectElement.parents('.modal-body'),
                maximumSelectionLength: 5
            })
        );
    };

    /**
     * init a select element as "select2" for connection size types
     * @param options
     */
    $.fn.initConnectionSizeSelect = function(options){
        let selectElement = $(this);

        let defaultConfig = {
            dropdownParent: selectElement.parents('.modal-body'),
            minimumResultsForSearch: -1,
            width: '100%',
            maxSelectionLength: 1
        };
        options = $.extend({}, defaultConfig, options);

        let formatConnectionSizeResultData = data => {
            if(data.loading) return data.text;
            if(data.placeholder) return data.placeholder;

            let connectionClass = MapUtil.getConnectionInfo(data.text, 'cssClass');

            let label = Util.getObjVal(Init.wormholeSizes, data.text + '.label') || '?';
            let text = Util.getObjVal(Init.wormholeSizes, data.text + '.text') || 'all';

            let markup = '<div class="clearfix">';
            markup += '<div class="col-xs-1">';
            markup += '<i class="fas fa-char fa-fw" data-char-content="' + label + '"></i>';
            markup += '</div>';
            markup += '<div class="col-xs-3">';
            markup += '<div class="pf-fake-connection ' + connectionClass + '"></div>';
            markup += '</div>';
            markup += '<div class="col-xs-8">';
            markup += text;
            markup += '</div>';
            markup += '</div>';

            return $(markup);
        };

        options.templateSelection = formatConnectionSizeResultData;
        options.templateResult = formatConnectionSizeResultData;

        $.when(
            selectElement.select2(options)
        );
    };

    /**
     * init a sselect element as "select2"  for "status" selection
     * @param options
     * @returns {*}
     */
    $.fn.initStatusSelect = function(options){

        let defaultConfig = {
            minimumResultsForSearch: -1,
            width: '100%',
            iconClass: 'fa-circle'
        };

        options = $.extend({}, defaultConfig, options);

        let formatStatusSelectionData = state => {
            return '<i class="fas ' + options.iconClass + ' ' + state.class + '"></i>&nbsp;&nbsp;&nbsp;' + state.text;
        };

        let formatStatusResultData = data => {
            if(data.loading) return data.text;
            if(data.placeholder) return data.placeholder;

            let markup = '<div class="clearfix ' + config.resultOptionImageClass + '">';
            markup += '<div class="col-xs-2">';
            markup += '<i class="fas ' + options.iconClass + ' ' + data.class + '"></i>';
            markup += '</div>';
            markup += '<div class="col-xs-10">' + data.text + '</div>';
            markup += '</div>';

            return $(markup);
        };

        options.templateSelection = formatStatusSelectionData;
        options.templateResult = formatStatusResultData;

        return this.each(function(){
            let selectElement = $(this);
            selectElement.select2(options);
        });
    };

    /**
     * init a select element as an ajax based "select2" object for system search
     * @param options
     */
    $.fn.initSystemSelect = function(options){
        let selectElement = $(this);

        let defaultConfig = {
            maxSelectionLength: 1
        };
        options = $.extend({}, defaultConfig, options);

        let shatteredClass = Util.getSecurityClassForSystem('SH');

        // format result data
        function formatResultData (data){
            if(data.loading) return data.text;

            // abyss system font
            let systemNameClass = data.security === 'A' ? Util.config.fontTriglivianClass : '';

            // show effect info just for wormholes
            let hideEffectClass = data.effect === null ? 'hide' : '';

            let hideShatteredClass = !data.shattered ? 'hide' : '';

            let markup = '<div class="clearfix ' + config.resultOptionImageClass + '">';
            markup += '<div class="col-sm-4 pf-select-item-anchor ' + systemNameClass + '">' + data.text + '</div>';
            markup += '<div class="col-sm-2 text-right ' + data.effectClass + '">';
            markup += '<i class="fas fa-fw fa-square ' + hideEffectClass + '"></i>';
            markup += '</div>';
            markup += '<div class="col-sm-2 text-right ' + data.secClass + '">' + data.security + '</div>';
            markup += '<div class="col-sm-2 text-right ' + shatteredClass + '">';
            markup += '<i class="fas fa-fw fa-skull ' + hideShatteredClass + '"></i>';
            markup += '</div>';
            markup += '<div class="col-sm-2 text-right ' + data.trueSecClass + '">' + data.trueSec + '</div></div>';

            return markup;
        }

        $.when(
            selectElement.select2({
                ajax: {
                    url: function(params){
                        // add params to URL
                        return   Init.path.searchUniverseSystemData + '/' + params.term.trim();
                    },
                    dataType: 'json',
                    delay: 250,
                    timeout: 5000,
                    cache: true,
                    data: function(params){
                        return {
                            page: params.page || 1
                        };
                    },
                    processResults: function(data, params){
                        // parse the results into the format expected by Select2.
                        return {
                            results: data.results.map( function(item){
                                // "id" or "name"
                                let id = item[options.key];
                                let disabled = false;
                                let trueSec = parseFloat(item.trueSec);
                                let secClass = Util.getSecurityClassForSystem(item.security);
                                let trueSecClass = Util.getTrueSecClassForSystem( trueSec );
                                let effectClass = MapUtil.getEffectInfoForSystem(item.effect, 'class');

                                // check if system is dialed
                                if(
                                    options.disabledOptions &&
                                    options.disabledOptions.indexOf(parseInt(id, 10)) !== -1
                                ){
                                    disabled = true;
                                }

                                // "fix" security level
                                if(
                                    trueSec > 0 &&
                                    trueSec < 0.1
                                ){
                                    trueSec = 0.1;
                                }else{
                                    trueSec = Math.round(trueSec * 10) / 10;
                                }

                                return {
                                    id: id,
                                    text: item.name,
                                    // systemId: parseInt(item.systemId),
                                    security: item.security,
                                    secClass: secClass,
                                    trueSec: trueSec.toFixed(1),
                                    trueSecClass: trueSecClass,
                                    effect: item.effect,
                                    effectClass: effectClass,
                                    shattered: item.shattered,
                                    disabled: disabled
                                };
                            }),
                            pagination: {
                                more: data.pagination.more
                            }
                        };
                    },
                    error: function(jqXHR, status, error){
                        if( !Util.isXHRAborted(jqXHR) ){

                            let reason = status + ' ' + jqXHR.status + ': ' + error;
                            Util.showNotify({title: 'System select warning', text: reason + ' deleted', type: 'warning'});
                        }

                    }
                },
                dropdownParent: selectElement.parents('.modal-body'),
                minimumInputLength: 3,
                templateResult: formatResultData,
                placeholder: 'Name or ID',
                allowClear: true,
                maximumSelectionLength: options.maxSelectionLength
            }).on('change', function(e){
                // select changed
                if(options.onChange){
                    options.onChange(parseInt($(this).val()) || 0);
                }
            }).on('select2:open', function(){
                // clear selected system (e.g. default system)
                // => improves usability (not necessary). There is a small "x" if field can be cleared manually
                if(
                    options.maxSelectionLength === 1 &&
                    $(this).val() !== null
                ){
                    $(this).val('').trigger('change');
                }
            })
        ).done(function(a,b){
            // open select if not already pre-selected
            if($(this).val() === null){
                selectElement.select2('open');
            }
        });
    };

    /**
     * init a select element as an ajax based "select2" object for Access resources
     * character (private map), corporation (corp map), alliance (ally map)
     * @param options
     */
    $.fn.initAccessSelect = function(options){

        let formatSelectionData = data => {
            if(data.loading) return data.text;

            let markup = '<div class="clearfix">';
            markup += '<div class="col-sm-10">' + data.text + '</div></div>';

            return markup;
        };

        return this.each(function(){
            let selectElement = $(this);

            $.when(
                selectElement.select2({
                    ajax: {
                        url: function(params){
                            // add params to URL
                            return Init.path.searchAccess + '/' + options.type + '/' + params.term;
                        },
                        dataType: 'json',
                        delay: 250,
                        timeout: 5000,
                        cache: true,
                        data: function(params){
                            // no url params here
                            return;
                        },
                        processResults: function(data, page){
                            // parse the results into the format expected by Select2.
                            return {
                                results: data.map( function(item){
                                    return {
                                        id: item.id,
                                        text: item.name,
                                        categoryType: options.type
                                    };
                                })
                            };
                        },
                        error: function(jqXHR, status, error){
                            if( !Util.isXHRAborted(jqXHR) ){

                                let reason = status + ' ' + jqXHR.status + ': ' + error;
                                Util.showNotify({title: 'Access select warning', text: reason + ' deleted', type: 'warning'});
                            }

                        }
                    },
                    dropdownParent: selectElement.parents('.modal-body'),
                    minimumInputLength: 3,
                    placeholder: options.type + ' names',
                    allowClear: false,
                    maximumSelectionLength: options.maxSelectionLength,
                    templateResult: formatCategoryTypeResultData,
                    templateSelection: formatSelectionData
                }).on('change', function(e){
                    // select changed

                })
            ).done(function(){
                // after init finish
            });
        });
    };

    /**
     * init a select element as an ajax based "select2" object for universeTypes
     * e.g. 'alliance', 'corporation', 'character', ...
     * @param options
     * @returns {*}
     */
    $.fn.initUniverseSearch = function(options){

        let showErrorNotification = (reason) => {
            Util.showNotify({title: 'Search failed', text: reason + ' deleted', type: 'warning'});
        };

        /**
         * format selection data
         * @param data
         * @returns {*}
         */
        function formatSelectionData (data){
            if(data.loading) return data.text;
            if(data.placeholder) return data.placeholder;

            let markup = '<div class="clearfix">';
            markup += '<div class="col-sm-10">' + data.text + '</div></div>';

            return markup;
        }

        /**
         * sort universe data
         * @param data universe search result array
         * @param term search term
         */
        function sortResultData (data, term){
            let levenshtein = (a,b) => {
                let matrix = new Array(a.length+1);
                for(let i = 0; i < matrix.length; i++){
                    matrix[i] = new Array(b.length+1).fill(0);
                }

                for(let ai = 1; ai <= a.length; ai++){
                    matrix[ai][0] = ai;
                }

                for(let bi = 1; bi <= b.length; bi++){
                    matrix[0][bi] = bi;
                }

                for(let bi = 1; bi <= b.length; bi++){
                    for(let ai = 1; ai <= a.length; ai++){
                        matrix[ai][bi] = Math.min(
                            matrix[ai-1][bi]+1,
                            matrix[ai][bi-1]+1,
                            matrix[ai-1][bi-1]+(a[ai-1] === b[bi-1] ? 0 : 1)
                        );
                    }                
                }

                return matrix[a.length][b.length];
            };

            data.sort((a,b) => {
                let levA = levenshtein(term, a.name.toLowerCase());
                let levB = levenshtein(term, b.name.toLowerCase());
                return levA === levB ? 0 : (levA > levB ? 1 : -1);
            });
        }

        return this.each(function(){
            let selectElement = $(this);

            $.when(
                selectElement.select2({
                    ajax: {
                        type: 'POST',
                        url: function(params){
                            // add params to URL
                            return Init.path.searchUniverseData + '/' + encodeURI(params.term);
                        },
                        dataType: 'json',
                        delay: 250,
                        timeout: 5000,
                        cache: true,
                        data: function(params){
                            return {
                                categories: options.categoryNames
                            };
                        },
                        processResults: function(result, page){
                            let data = {results: []};
                            if(result.hasOwnProperty('error')){
                                showErrorNotification(result.error);
                            }else{
                                let mapChildren = function(item){
                                    return {
                                        id: item.id,
                                        text: item.name,
                                        categoryType: this
                                    };
                                };

                                for(let category in result){
                                    // skip custom functions in case result = [] (array functions)
                                    if(result.hasOwnProperty(category)){
                                        // sort results (optional)
                                        sortResultData(result[category], page.term);
                                        data.results.push({
                                            text: category,
                                            children: result[category].map(mapChildren, category)
                                        });
                                    }
                                }
                            }

                            return data;
                        },
                        error: function(jqXHR, status, error){
                            if( !Util.isXHRAborted(jqXHR) ){
                                let reason = status + ' ' + jqXHR.status + ': ' + error;
                                showErrorNotification(reason);
                            }
                        }
                    },
                    dropdownParent: selectElement.parents('.modal-body') ,
                    minimumInputLength: 3,
                    placeholder: '',
                    /* alphabetic search not always fits the users need
                    sorter: data => {
                        // sort nested data options by "text" prop
                        return data.map((group, index) => {
                            group.children = group.children.sort((a,b) => a.text.localeCompare(b.text) );
                            return group;
                        });
                    },*/
                    disabled: options.hasOwnProperty('disabled') ? options.disabled : false,
                    allowClear: options.maxSelectionLength <= 1,
                    maximumSelectionLength: options.maxSelectionLength,
                    templateResult: formatCategoryTypeResultData
                    //  templateSelection: formatSelectionData, // some issues with "clear" selection on single selects (empty option is needed)
                }).on('change', function(e){
                    // select changed
                }).on('select2:open', function(){
                    // clear selected system (e.g. default system)
                    // => improves usability (not necessary). There is a small "x" if field can be cleared manually
                    if(
                        options.maxSelectionLength === 1 &&
                        $(this).val() !== null
                    ){
                        $(this).val('').trigger('change');
                    }
                })
            ).done(function(){
                // after init finish
            });
        });
    };

    /**
     * init a select element as an "select2" object for system search
     * @param options
     * @returns {*}
     */
    $.fn.initUniverseTypeSelect = function(options){

        /**
         * get select option data by categoryIds
         * @param categoryIds
         * @returns {Array}
         */
        let getOptionsData = categoryIds => {
            let data = [];

            let mapChildren = function(type){
                return {
                    id: type.id,
                    text: type.name,
                    mass: type.hasOwnProperty('mass') ? type.mass : null,
                    groupId: this.groupId,
                    categoryId: this.categoryId,
                    categoryType: this.categoryType
                };
            };

            for(let categoryId of categoryIds){
                let categoryData = Util.getObjVal(Init, 'universeCategories.' + categoryId);
                if(categoryData && categoryData.groups){
                    // categoryId data exists and has groups...
                    for(let groupData of categoryData.groups){
                        if(groupData && groupData.types){
                            // groupData exists and has types...
                            data.push({
                                text: groupData.name,
                                children: groupData.types.map(mapChildren, {
                                    groupId: groupData.id,
                                    categoryId: categoryData.id,
                                    categoryType: 'inventoryType',
                                })
                            });
                        }
                    }
                }
            }

            return data;
        };

        return this.each(function(){
            let selectElement = $(this);

            $.when(
                selectElement.select2({
                    data: getOptionsData(options.categoryIds),
                    dropdownParent: selectElement.parents('.modal-body'),
                    minimumInputLength: 0, // minimum number of characters required to start a search
                    maximumInputLength: 100, // maximum number of characters that may be provided for a search term
                    placeholder: '',
                    allowClear: options.maxSelectionLength <= 1,
                    multiple: options.maxSelectionLength > 1,
                    maximumSelectionLength: options.maxSelectionLength,
                   // maximumSelectionLength: options.maxSelectionLength > 1 ? options.maxSelectionLength > 1 : 0,
                   // minimumResultsForSearch: 5, // minimum number of results required to display the search box
                    templateResult: formatCategoryTypeResultData
                }).on('select2:open', function(){
                    // clear selected system (e.g. default system)
                    // => improves usability (not necessary). There is a small "x" if field can be cleared manually
                    if(
                        options.maxSelectionLength === 1 &&
                        $(this).val() !== null
                    ){
                        $(this).val('').trigger('change');
                    }
                }).val(options.selected).trigger('change')
            );
        });
    };

    /**
     * init a select element as an "select2" object for signature group data
     * @param options
     * @returns {*}
     */
    $.fn.initSignatureGroupSelect = function(options){
        let defaultConfig = {
            minimumResultsForSearch: -1,
            width: '110px',
            dropdownParent: this.parents('.popover-content')
        };

        options = $.extend({}, defaultConfig, options);

        return this.each(function(){
            let selectElement = $(this);
            selectElement.select2(options);

            // initial open dropDown
            if( !parseInt(selectElement.val()) ){
                // setTimeout() required because of dropDown positioning
                setTimeout(() => {
                    selectElement.select2('open');
                }, 0);
            }
        });
    };

    /**
     * init a select element as an "select2" object for signature types data
     * @param options
     * @param hasOptGroups
     * @returns {*}
     */
    $.fn.initSignatureTypeSelect = function(options, hasOptGroups){
        let defaultConfig = {
            minimumResultsForSearch: 10,
            width: '220px',
            dropdownParent: this.parents('.popover-content')
        };

        options = $.extend({}, defaultConfig, options);

        let formatSignatureTypeResultData = data => {
            return formatSignatureTypeConnectionResultData(data, 'wormhole');
        };

        let search = (params, data) => {
            if($.trim(params.term) === '') return data;             // If there are no search terms, return all of the data
            if(typeof data.children === 'undefined') return null;   // Skip if there is no 'children' property

            // `data.children` contains the actual options that we are matching against
            let filteredChildren = [];
            for(let [idx, child] of Object.entries(data.children)){
                if(child.text.toUpperCase().indexOf(params.term.toUpperCase()) === 0){
                    filteredChildren.push(child);
                }
            }

            // If we matched any of the timezone group's children, then set the matched children on the group
            // and return the group object
            if(filteredChildren.length){
                let modifiedData = $.extend({}, data, true);
                modifiedData.children = filteredChildren;

                // You can return modified objects from here
                // This includes matching the `children` how you want in nested data sets
                return modifiedData;
            }

            // Return `null` if the term should not be displayed
            return null;
        };

        options.templateSelection = formatSignatureTypeSelectionData;
        options.templateResult = formatSignatureTypeResultData;

        if(hasOptGroups){
            // NOT nested selects don´t need the custom search() function
            options.matcher = search;
        }

        return this.each(function(){
            let selectElement = $(this);
            selectElement.select2(options);

            // initial open dropDown
            if( !parseInt(selectElement.val()) ){
                // setTimeout() required because of dropDown positioning
                setTimeout(() => {
                    selectElement.select2('open');
                }, 0);
            }
        });
    };

    /**
     * init a select element as an "select2" object for signature group data
     * @param options
     * @returns {*}
     */
    $.fn.initSignatureConnectionSelect = function(options){
        let defaultConfig = {
            minimumResultsForSearch: -1,
            width: '140px',
            dropdownParent: this.parents('.popover-content')
        };

        options = $.extend({}, defaultConfig, options);

        let formatSignatureConnectionResultData = data => {
            return formatSignatureTypeConnectionResultData(data, 'system');
        };

        options.templateSelection = formatSignatureConnectionSelectionData;
        options.templateResult = formatSignatureConnectionResultData;

        return this.each(function(){
            let selectElement = $(this);

            // remove existing <options> from DOM in case "data" is explicit set
            if(options.data){
                selectElement.empty();
            }
            selectElement.select2(options);

            // initial open dropDown
            if( !parseInt(selectElement.val()) ){
                // setTimeout() required because of dropDown positioning
                setTimeout(() => {
                    selectElement.select2('open');
                }, 0);
            }
        });
    };

    return {
        formatSignatureTypeSelectionData: formatSignatureTypeSelectionData,
        formatSignatureConnectionSelectionData: formatSignatureConnectionSelectionData
    };
});
