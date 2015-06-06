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
     * init a select element as an ajax based "select2" object for system search
     * @param options
     */
    $.fn.initSystemSelect = function(options){
        var selectElement = $(this);


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

                                var secClass = Util.getSecurityClassForSystem(item.security);

                                var systemSecurity = ' <span style="float: right;" class="' + secClass + '">';
                                systemSecurity += '(' + item.security + ')</span>';

                                return {
                                    id: item[options.key],
                                    text: item.name + systemSecurity
                                };
                            })
                        };
                    },
                    error: function (jqXHR, status, error) {
                        if( !Util.isXHRAborted(jqXHR) ){
                            // close select
                            selectElement.select2('destroy');

                            var reason = status + ' ' + jqXHR.status + ': ' + error;
                            $(document).trigger('pf:shutdown', {reason: reason});
                        }

                    }
                },
                theme: 'pathfinder',
                minimumInputLength: 2,
                placeholder: 'Jita',
                allowClear: true,
                escapeMarkup: function (markup) {
                    // let our custom formatter work
                    return markup;
                }
            })
        ).done(function(){
            // open select
            selectElement.select2('open');
        });
    };

    /**
     * init a select element as an ajax based "select2" object for Access resources
     * user (private map), corporation (corp map), alliance (ally map)
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
                    case 'user':
                        previewContent = '<i class="fa fa-lg fa-user"></i>';
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
                                Util.showNotify({title: 'Access select error', text: reason + ' deleted', type: 'warning'});
                            }

                        }
                    },
                    theme: 'pathfinder',
                    minimumInputLength: 2,
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


















