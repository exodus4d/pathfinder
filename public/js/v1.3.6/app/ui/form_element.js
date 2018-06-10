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

    /**
     * format result data
     * @param data
     * @returns {*}
     */
    let formatCategoryTypeResultData  = (data) => {
        if(data.loading) return data.text;
        if(data.placeholder) return data.placeholder;

        let markup = '<div class="clearfix">';

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
                thumb = '<img src="' + imagePath + '" style="max-width: 100%" />';
            }else if(iconName){
                thumb = '<i class="fas fa-fw ' + iconName + '" ></i>';
            }

            markup += '<div class="col-xs-2 text-center">' + thumb + '</div>';
            markup += '<div class="col-xs-10">' + data.text + '</div>';
        }
        markup += '</div>';

        return markup;
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
     * init a select element as an ajax based "select2" object for system search
     * @param options
     */
    $.fn.initSystemSelect = function(options){
        let selectElement = $(this);

        let config = {
            maxSelectionLength: 1
        };
        options = $.extend({}, config, options);

        // format result data
        function formatResultData (data) {

            if (data.loading){
                return data.text;
            }

            // show effect info just for wormholes
            let hideEffectClass = '';
            if(data.effect === ''){
                hideEffectClass = 'hide';
            }

            let markup = '<div class="clearfix">';
            markup += '<div class="col-sm-5 pf-select-item-anchor">' + data.text + '</div>';
            markup += '<div class="col-sm-2 text-right ' + data.effectClass + '">';
            markup += '<i class="fas fa-fw fa-square ' + hideEffectClass + '"></i>';
            markup += '</div>';
            markup += '<div class="col-sm-2 text-right ' + data.secClass + '">' + data.security + '</div>';
            markup += '<div class="col-sm-3 text-right ' + data.trueSecClass + '">' + data.trueSec + '</div></div>';

            return markup;
        }

        $.when(
            selectElement.select2({
                ajax: {
                    url: function(params){
                        // add params to URL
                        return   Init.path.searchSystem + '/' + params.term.trim();
                    },
                    dataType: 'json',
                    delay: 250,
                    timeout: 5000,
                    cache: true,
                    data: function(params) {
                        // no url params here
                        return;
                    },
                    processResults: function(data) {
                        // parse the results into the format expected by Select2.
                        return {
                            results: data.map( function(item){

                                // "systemId" or "name"
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
                                    systemId: parseInt(item.systemId),
                                    security: item.security,
                                    secClass: secClass,
                                    trueSec: trueSec.toFixed(1),
                                    trueSecClass: trueSecClass,
                                    effect: item.effect,
                                    effectClass: effectClass,
                                    disabled: disabled
                                };
                            })
                        };
                    },
                    error: function (jqXHR, status, error) {
                        if( !Util.isXHRAborted(jqXHR) ){

                            let reason = status + ' ' + jqXHR.status + ': ' + error;
                            Util.showNotify({title: 'System select warning', text: reason + ' deleted', type: 'warning'});
                        }

                    }
                },
                dropdownParent: selectElement.parents('.modal-body'),
                minimumInputLength: 3,
                templateResult: formatResultData,
                placeholder: 'System name',
                allowClear: true,
                maximumSelectionLength: options.maxSelectionLength,
                escapeMarkup: function(markup){
                    // let our custom formatter work
                    return markup;
                }
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

        return this.each(function(){
            let selectElement = $(this);

            // format selection data
            function formatSelectionData (data){

                if (data.loading){
                    return data.text;
                }

                let markup = '<div class="clearfix">';
                markup += '<div class="col-sm-10">' + data.text + '</div></div>';

                return markup;
            }

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
                        data: function(params) {
                            // no url params here
                            return;
                        },
                        processResults: function(data, page) {
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
                        error: function (jqXHR, status, error) {
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
                    templateSelection: formatSelectionData,
                    escapeMarkup: function(markup){
                        // let our custom formatter work
                        return markup;
                    }
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
    $.fn.initUniverseSearch = function(options) {

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

        return this.each(function() {
            let selectElement = $(this);

            $.when(
                selectElement.select2({
                    ajax: {
                        type: 'POST',
                        url: function(params){
                            // add params to URL
                            return Init.path.searchUniverseData + '/' + params.term;
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
                        processResults: function(result, page) {
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
                                        data.results.push({
                                            text: category,
                                            children: result[category].map(mapChildren, category)
                                        });
                                    }
                                }
                            }

                            return data;
                        },
                        error: function (jqXHR, status, error) {
                            if( !Util.isXHRAborted(jqXHR) ){
                                let reason = status + ' ' + jqXHR.status + ': ' + error;
                                showErrorNotification(reason);
                            }
                        }
                    },
                    dropdownParent: selectElement.parents('.modal-body') ,
                    minimumInputLength: 3,
                    placeholder: '',
                    allowClear: options.maxSelectionLength <= 1,
                    maximumSelectionLength: options.maxSelectionLength,
                    templateResult: formatCategoryTypeResultData,
                    //  templateSelection: formatSelectionData, // some issues with "clear" selection on single selects (empty option is needed)
                    escapeMarkup: function(markup){
                        // let our custom formatter work
                        return markup;
                    }
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


    $.fn.initUniverseTypeSelect = function(options)  {

        /**
         * get select option data by categoryIds
         * @param categoryIds
         * @returns {{results: Array}}
         */
        let getOptionsData = categoryIds => {
            let data = [];

            let mapChildren = function(type){
                return {
                    id: type.id,
                    text: type.name,
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

        return this.each(function() {
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
                    templateResult: formatCategoryTypeResultData,
                    escapeMarkup: function(markup){
                        return markup;
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
                }).val(options.selected).trigger('change')
            );
        });
    };

});
