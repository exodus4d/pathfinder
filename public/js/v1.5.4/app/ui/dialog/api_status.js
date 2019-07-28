/**
 *  changelog dialog (GitHub API repository information)
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox'
], ($, Init, Util, bootbox) => {
    'use strict';

    let config = {
        apiStatusDialogClass: 'pf-api-status-dialog'                            // class for "api status" dialog
    };

    /**
     * show api status dialog
     * @param apiData
     */
    $.fn.apiStatusDialog = function(apiData){

        let data = {
            apiData: apiData,
            methodFormat: () => {
                return (val, render) => {
                    switch(render(val)){
                        case 'get':     return 'txt-color-blue';
                        case 'post':    return 'txt-color-green';
                        case 'put':     return 'txt-color-yellow';
                        case 'delete':  return 'txt-color-red';
                        default:        return '';
                    }
                };
            },
            statusTitle: () => {
                return (val, render) => {
                    switch(render(val)){
                        case 'green':   return 'ok';
                        case 'yellow':  return 'degraded: Slow or potentially dropping requests';
                        case 'red':     return 'bad: Most requests are not succeeding and/or are very slow (5s+) on average';
                        default:        return 'unknown';
                    }
                };
            },
            secondsFormat: () => {
                return (val, render) => {
                    return parseFloat(render(val)).toFixed(2) + 's';
                };
            }
        };

        requirejs(['text!templates/dialog/api_status.html', 'mustache'], (template, Mustache) => {
            let apiStatusDialog = bootbox.dialog({
                className: config.apiStatusDialogClass,
                title: 'API status',
                message: Mustache.render(template, data),
                show: false,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default'
                    }
                }
            });

            apiStatusDialog.initTooltips();

            // show dialog
            apiStatusDialog.modal('show');

        });
    };

});