/**
 * system route module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox'
], function($, Init, Util, bootbox) {
    'use strict';

    var config = {
        // module info
        moduleClass: 'pf-module',                                               // class for each module

        // system route module
        systemRouteModuleClass: 'pf-system-route-module',                      // class  for this module

        // tables
        tableToolsClass: 'pf-table-tools',                                      // table toolbar

        systemSecurityClassPrefix: 'pf-system-security-',                       // prefix class for system security level (color)

        // dialog
        routeDialogId: 'pf-route-dialog',                                       // id for route dialog
        systemDialogSelectClass: 'pf-system-dialog-select',                     // class for system select Element
        systemInfoRoutesTableRowPrefix: 'pf-system-info-routes-row-',           // prefix class for a row in the route table
        systemInfoRoutesTableClass: 'pf-system-route-table'                     // class for route tables

    };

    var cache = {
        systemRoutes: {}                                                        // jump information between solar systems
    };


    /**
     * callback function, adds new row to a dataTable with jump information for a route
     * @param context
     * @param routeData
     */
    var callbackAddRouteRow = function(context, routeData){
        // format routeData
        var rowData = formatRouteData(context, routeData);

        cache.systemRoutes[context.cacheKey] = rowData;

        // add new row
        context.dataTable.row.add( cache.systemRoutes[context.cacheKey] ).draw().nodes().to$().addClass( context.rowClass );

        // init tooltips for each jump system
        var tooltipElements = context.moduleElement.find('.' + context.rowClass + ' [data-toggle="tooltip"]');
        $(tooltipElements).tooltip();
    };


    /**
     * show route dialog. User can search for systems and jump-info for each system is added to a data table
     * @param dialogData
     */
    var showFindRouteDialog = function(dialogData){

        var data = {
            id: config.routeDialogId,
            selectClass: config.systemDialogSelectClass,
            systemFrom: dialogData.systemFrom
        };

        requirejs(['text!templates/dialog/route.html', 'mustache'], function(template, Mustache) {

            var content = Mustache.render(template, data);

            // disable modal focus event -> otherwise select2 is not working! -> quick fix
            $.fn.modal.Constructor.prototype.enforceFocus = function() {};

            var findRouteDialog = bootbox.dialog({
                title: 'Search route',
                message: content,
                buttons: {
                    close: {
                        label: 'cancel',
                        className: 'btn-default',
                        callback: function(){
                            $(findRouteDialog).modal('hide');
                        }
                    },
                    success: {
                        label: '<i class="fa fa-fw fa-search"></i>&nbsp;search route',
                        className: 'btn-primary',
                        callback: function () {
                            // add new route to route table

                            // get form Values
                            var form = $('#' + config.routeDialogId).find('form');

                            var routeDialogData = $(form).getFormValues();

                            // validate form
                            form.validator('validate');

                            // check weather the form is valid
                            var formValid = form.isValidForm();

                            if(formValid === false){
                                // don't close dialog
                                return false;
                            }

                            // get route Data
                            var requestData = {
                                systemFrom: dialogData.systemFrom,
                                systemTo: routeDialogData.systemTo
                            };

                            // data passed into callback
                            var contextData = {
                                moduleElement: dialogData.moduleElement,
                                systemTo: routeDialogData.systemTo,
                                dataTable: dialogData.dataTable,
                                rowClass: config.systemInfoRoutesTableRowPrefix + dialogData.dataTable.rows().data().length,
                                cacheKey: dialogData.systemFrom + '_' + routeDialogData.systemTo
                            };

                           getRouteData(requestData, contextData, callbackAddRouteRow);
                        }
                    }
                }
            });


            // init dialog
            findRouteDialog.on('shown.bs.modal', function(e) {

                var modalContent = $('#' + config.routeDialogId);

                // init system select live  search
                var selectElement = modalContent.find('.' + config.systemDialogSelectClass);
                selectElement.initSystemSelect({key: 'name'});
            });


        });

    };

    /**
     * requests route data from eveCentral API and execute callback
     * @param systemFrom
     * @param systemTo
     * @param callback
     */
    var getRouteData = function(requestData, contextData, callback){

        // get route from API
        var baseUrl = Init.url.eveCentral + 'route/from/';

        var url = baseUrl + requestData.systemFrom + '/to/' + requestData.systemTo;

        $.ajax({
            url: url,
            dataType: 'json',
            context: contextData
        }).done(function(routeData){
            // execute callback
            callback(this, routeData);
        });

    };

    /**
     * format route data from API request into dataTable row format
     * @param context
     * @param routeData
     * @returns {*[]}
     */
    var formatRouteData = function(context, routeData){

        // add row Data
        var rowData = [context.systemTo, routeData.length];

        var jumpData = [];
        // loop all systems on a rout
        $.each(routeData, function(j, systemData){

            var systemSecClass = config.systemSecurityClassPrefix;
            var systemSec = systemData.to.security.toFixed(1).toString();
            var tempSystemSec = systemSec;

            if(tempSystemSec < 0){
                tempSystemSec = '0-0';
            }

            systemSecClass += tempSystemSec.replace('.', '-');
            var system = '<i class="fa fa-square ' + systemSecClass + '" ';
            system += 'data-toggle="tooltip" data-placement="bottom" ';
            system += 'title="' + systemData.to.name + ' [' + systemSec + '] ' + systemData.to.region.name  + '"></i>';
            jumpData.push( system );

        });


        rowData.push( jumpData.join(' ') );

        return rowData;
    };

    var getModule = function(systemData){

        var moduleElement = null;

        // load trade routes for k-space systems
        if(systemData.type.id === 2){

            // create new module container
            moduleElement = $('<div>', {
                class: [config.moduleClass, config.systemRouteModuleClass].join(' ')
            });

            // headline
            var headline = $('<h5>', {
                class: 'pull-left',
                text: 'Routes'
            });

            moduleElement.append(headline);

            var systemFrom = systemData.name;
            var systemsTo = ['Jita', 'Amarr', 'Rens', 'Dodixie'];

            // crate new route table
            var table = $('<table>', {
                class: ['compact', 'stripe', 'order-column', 'row-border', config.systemInfoRoutesTableClass].join(' ')
            });

            moduleElement.append( $(table) );

            // init empty table
            var routesTable = table.DataTable( {
                paging: false,
                ordering: true,
                order: [ 1, 'asc' ],
                info: false,
                searching: false,
                hover: false,

                autoWidth: false,
                columnDefs: [
                    {
                        targets: 0,
                        orderable: true,
                        title: 'system&nbsp;&nbsp;&nbsp;'
                    },{
                        targets: 1,
                        orderable: true,
                        title: 'jumps&nbsp;&nbsp;&nbsp',
                        width: '40px',
                        class: 'text-right'
                    },{
                        targets: 2,
                        orderable: false,
                        title: 'route'
                    }
                ],
                data: [] // will be added dynamic
            });

            // add toolbar buttons for table -------------------------------------
            var tableToolbar = $('<div>', {
                class: [config.tableToolsClass, 'pull-right'].join(' ')
            }).append(
                    $('<button>', {
                        class: ['btn', 'btn-primary', 'btn-sm'].join(' '),
                        text: ' search route',
                        type: 'button'
                    }).on('click', function(e){
                        // show "find route" dialog

                        var dialogData = {
                            moduleElement: moduleElement,
                            systemFrom: systemFrom,
                            dataTable: routesTable
                        };

                        showFindRouteDialog(dialogData);
                    }).prepend(
                            $('<i>', {
                                class: ['fa', 'fa-search', 'fa-fw'].join(' ')
                            })
                        )

                );

            headline.after(tableToolbar);


            // fill routesTable with data -------------------------------------------
            for(var i = 0; i < systemsTo.length; i++){

                var systemTo = systemsTo[i];

                if(systemFrom !== systemTo){

                    var cacheKey = systemFrom + '_' + systemTo;

                    // row class
                    var rowClass = config.systemInfoRoutesTableRowPrefix + i;

                    if(cache.systemRoutes.hasOwnProperty(cacheKey)){
                        // add new row from cache
                        routesTable.row.add( cache.systemRoutes[cacheKey] ).draw().nodes().to$().addClass( rowClass );

                        // init tooltips for each jump system
                        var tooltipElements = moduleElement.find('.' + rowClass + ' [data-toggle="tooltip"]');
                        $(tooltipElements).tooltip();
                    }else{
                        // get route Data
                        var requestData = {
                            systemFrom: systemFrom,
                            systemTo: systemTo
                        };

                        // data passed into callback
                        var contextData = {
                            moduleElement: moduleElement,
                            rowClass: rowClass,
                            systemTo: systemTo,
                            dataTable: routesTable,
                            cacheKey: cacheKey
                        };

                        getRouteData(requestData, contextData, callbackAddRouteRow);

                    }

                }
            }

        }

        return moduleElement;
    };

    /**
     * updates an dom element with the system route module
     * @param systemData
     */
    $.fn.drawSystemRouteModule = function(systemData){

        var parentElement = $(this);

        // show route module
        var showModule = function(moduleElement){
            if(moduleElement){
                moduleElement.css({ opacity: 0 });
                parentElement.append(moduleElement);
                moduleElement.velocity('transition.slideDownIn', {
                    duration: Init.animationSpeed.mapModule,
                    delay: Init.animationSpeed.mapModule
                });
            }
        };

        // check if module already exists
        var moduleElement = parentElement.find('.' + config.systemRouteModuleClass);

        if(moduleElement.length > 0){
            moduleElement.velocity('transition.slideDownOut', {
                duration: Init.animationSpeed.mapModule,
                complete: function(tempElement){
                    $(tempElement).remove();

                    moduleElement = getModule(systemData);
                    showModule(moduleElement);
                }
            });
        }else{
            moduleElement = getModule(systemData);
            showModule(moduleElement);
        }

    };

});