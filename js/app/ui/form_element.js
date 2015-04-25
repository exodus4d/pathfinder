/**
 * form elements
 */

define([
    'jquery',
    'app/init',
    'app/util'
], function($, Init, Util) {
    "use strict";

    /**
     * init a select element as an ajax based "select2" object
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
                        if(!Util.isXHRAborted){
                            // close select
                            selectElement.select2('destroy');

                            var reason = status + ' ' + jqXHR.status + ': ' + error;
                            $(document).trigger('pf:shutdown', {reason: reason});
                        }

                    }
                },
                minimumInputLength: 2,
                placeholder: 'Jita',
                allowClear: true
            })
        ).done(function(){
            // open select
            selectElement.select2('open');
        });


    };


});