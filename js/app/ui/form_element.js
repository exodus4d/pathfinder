/**
 * form elements
 */

define([
    'jquery',
    'app/init',
    'app/util'
], function($, Init, Util) {

    'use strict';

    /**
     * init a select element as "select2" for map selection
     */
    $.fn.initMapSelect = function(){
        var selectElement = $(this);

        $.when(
            selectElement.select2({
                dropdownParent: selectElement.parents('.modal-body'),
                theme: 'pathfinder',
                maximumSelectionLength: 5
            })
        );
    };



    /**
     * init a select element as an ajax based "select2" object for system search
     * @param options
     */
    $.fn.initSystemSelect = function(options){
        var selectElement = $(this);

        // format result data
        function formatResultData (data) {

            if (data.loading){
                return data.text;
            }

            // show effect info just for wormholes
            var hideEffectClass = '';
            if(data.effect === ''){
                hideEffectClass = 'hide';
            }

            var markup = '<div class="clearfix">';
            markup += '<div class="col-sm-5 pf-select-item-anchor">' + data.text + '</div>';
            markup += '<div class="col-sm-2 text-right ' + data.effectClass + '">';
            markup += '<i class="fa fa-fw fa-square ' + hideEffectClass + '"></i>';
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
                        return   Init.path.searchSystem + '/' + params.term;
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
                                var id = item[options.key];
                                var disabled = false;
                                var trueSec = parseFloat(item.trueSec);
                                var secClass = Util.getSecurityClassForSystem(item.security);
                                var trueSecClass = Util.getTrueSecClassForSystem( trueSec );
                                var effectClass = Util.getEffectInfoForSystem(item.effect, 'class');

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

                            var reason = status + ' ' + jqXHR.status + ': ' + error;
                            Util.showNotify({title: 'System select warning', text: reason + ' deleted', type: 'warning'});
                        }

                    }
                },
                dropdownParent: selectElement.parents('.modal-body'),
                theme: 'pathfinder',
                minimumInputLength: 2,
                templateResult: formatResultData,
                placeholder: 'System name',
                allowClear: true,
                escapeMarkup: function (markup) {
                    // let our custom formatter work
                    return markup;
                }
            }).on('change', function(e){
                // select changed
            })
        ).done(function(){
            // open select
            selectElement.select2('open');
        });
    };

    /**
     * init a select element as an ajax based "select2" object for Access resources
     * character (private map), corporation (corp map), alliance (ally map)
     * @param options
     */
    $.fn.initAccessSelect = function(options){

        return this.each(function(){

            var selectElement = $(this);

            // format result data
            function formatResultData (data) {

                if (data.loading){
                    return data.text;
                }

                // check if an option is already selected
                // do not show the same result twice
                var currentValues = selectElement.val();

                if(
                    currentValues &&
                    currentValues.indexOf( data.id.toString() ) !== -1
                ){
                    return ;
                }

                var imagePath = '';
                var previewContent = '';

                switch(options.type){
                    case 'character':
                        imagePath = Init.url.ccpImageServer + 'Character/' + data.id + '_32.jpg';
                        previewContent = '<img src="' + imagePath + '" style="max-width: 100%" />';
                        break;
                    case 'corporation':
                        imagePath = Init.url.ccpImageServer + 'Corporation/' + data.id + '_32.png';
                        previewContent = '<img src="' + imagePath + '" style="max-width: 100%" />';
                        break;
                    case 'alliance':
                        imagePath = Init.url.ccpImageServer + 'Alliance/' + data.id + '_32.png';
                        previewContent = '<img src="' + imagePath + '" style="max-width: 100%" />';
                        break;
                }

                var markup = '<div class="clearfix">';
                markup += '<div class="col-sm-2">' + previewContent + '</div>';
                markup += '<div class="col-sm-10">' + data.text + '</div></div>';

                return markup;
            }

            // format selection data
            function formatSelectionData (data){

                if (data.loading){
                    return data.text;
                }

                var markup = '<div class="clearfix">';
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
                                        text: item.name
                                    };
                                })
                            };
                        },
                        error: function (jqXHR, status, error) {
                            if( !Util.isXHRAborted(jqXHR) ){

                                var reason = status + ' ' + jqXHR.status + ': ' + error;
                                Util.showNotify({title: 'Access select warning', text: reason + ' deleted', type: 'warning'});
                            }

                        }
                    },
                    dropdownParent: selectElement.parents('.modal-body'),
                    theme: 'pathfinder',
                    minimumInputLength: 3,
                    placeholder: '',
                    allowClear: false,
                    maximumSelectionLength: options.maxSelectionLength,
                    templateResult: formatResultData,
                    templateSelection: formatSelectionData,
                    escapeMarkup: function (markup) {
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

});
