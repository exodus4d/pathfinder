/**
 * logging
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox'
], ($, Init, Util, bootbox) => {

    'use strict';

    let logData = [];                                                                   // cache object for all log entries
    let logDataTable = null;                                                            // "Datatables" Object

    // Morris charts data
    let maxGraphDataCount = 30;                                                         // max date entries for a graph
    let chartData = {};                                                                 // chart Data object for all Morris Log graphs

    let config = {
        taskDialogId: 'pf-task-dialog',                                                 // id for map "task manager" dialog
        timestampCounterClass: 'pf-timestamp-counter',                                  // class for "timestamp" counter
        taskDialogStatusAreaClass: 'pf-task-dialog-status',                             // class for "status" dynamic area
        taskDialogLogTableAreaClass: 'pf-task-dialog-table',                            // class for "log table" dynamic area
        logGraphClass: 'pf-log-graph',                                                  // class for all log Morris graphs
        moduleHeadlineIconClass: 'pf-module-icon-button'                                // class for toolbar icons in the head
    };

    /**
     * updated "sync status" dynamic dialog area
     */
    let updateSyncStatus = () => {

        // check if task manager dialog is open
        let logDialog = $('#' + config.taskDialogId);
        if(logDialog.length){
            // dialog is open
            requirejs(['text!templates/modules/sync_status.html', 'mustache'], (templateSyncStatus, Mustache) => {
                let data = {
                    timestampCounterClass: config.timestampCounterClass,
                    syncStatus: Init.syncStatus,
                    isWebSocket: () => {
                        return (Util.getSyncType() === 'webSocket');
                    },
                    isAjax: () => {
                        return (Util.getSyncType() === 'ajax');
                    }
                };

                let syncStatusElement = $(Mustache.render(templateSyncStatus, data ));

                logDialog.find('.' + config.taskDialogStatusAreaClass).html( syncStatusElement );

                logDialog.find('.' + config.timestampCounterClass).initTimestampCounter();

                syncStatusElement.initTooltips({
                    placement: 'right'
                });
            });
        }

    };

    /**
     * shows the logging dialog
     */
    let showDialog = () => {
        // dialog content

        requirejs(['text!templates/dialog/task_manager.html', 'mustache', 'datatables.loader'], function(templateTaskManagerDialog, Mustache){
            let data = {
                id: config.taskDialogId,
                dialogDynamicAreaClass: Util.config.dynamicAreaClass,
                taskDialogStatusAreaClass: config.taskDialogStatusAreaClass,
                taskDialogLogTableAreaClass: config.taskDialogLogTableAreaClass
            };

            let contentTaskManager = $( Mustache.render(templateTaskManagerDialog, data) );

            let rowElementGraphs = contentTaskManager.find('.row');
            let taskDialogLogTableAreaElement  = contentTaskManager.find('.' + config.taskDialogLogTableAreaClass);

            let logTable = $('<table>', {
                class: ['compact', 'stripe', 'order-column', 'row-border'].join(' ')
            });

            taskDialogLogTableAreaElement.append(logTable);

            // init log table
            logDataTable = logTable.DataTable({
                dom: '<"row"<"col-xs-3"l><"col-xs-5"B><"col-xs-4"fS>>' +
                    '<"row"<"col-xs-12"tr>>' +
                    '<"row"<"col-xs-5"i><"col-xs-7"p>>',
                buttons: {
                    name: 'tableTools',
                    buttons: [
                        {
                            extend: 'copy',
                            tag: 'a',
                            className: config.moduleHeadlineIconClass,
                            text: '<i class="fas fa-fw fa-copy"></i> copy',
                            exportOptions: {
                                orthogonal: 'export'
                            }
                        },
                        {
                            extend: 'csv',
                            tag: 'a',
                            className: config.moduleHeadlineIconClass,
                            text: '<i class="fas fa-fw fa-download"></i> csv',
                            exportOptions: {
                                orthogonal: 'export'
                            }
                        }
                    ]
                },
                paging: true,
                ordering: true,
                order: [1, 'desc'],
                hover: false,
                pageLength: 10,
                lengthMenu: [[5, 10, 25, 50, 100, -1], [5, 10, 25, 50, 100, 'All']],
                data: logData,                      // load cached logs (if available)
                language: {
                    emptyTable:  'No entries',
                    zeroRecords: 'No entries found',
                    lengthMenu:  'Show _MENU_',
                    info:        'Showing _START_ to _END_ of _TOTAL_ entries'
                },
                columnDefs: [
                    {
                        targets: 0,
                        name: 'status',
                        title: '<i class="fas fa-tag"></i>',
                        width: 18,
                        searchable: false,
                        class: ['text-center'].join(' '),
                        data: 'status',
                        render: {
                            display: (cellData, type, rowData, meta) => {
                                let statusClass = Util.getLogInfo(cellData, 'class');
                                return '<i class="fas fa-fw fa-circle txt-color ' + statusClass + '"></i>';
                            }
                        }
                    },{
                        targets: 1,
                        name: 'time',
                        title: '<i class="far fa-fw fa-clock"></i>',
                        width: 50,
                        searchable: true,
                        class: 'text-right',
                        data: 'timestamp',
                        render: {
                            display: (cellData, type, rowData, meta) => rowData.timestampFormatted
                        }
                    },{
                        targets: 2,
                        name: 'duration',
                        title: '<i class="fas fa-fw fa-history"></i>',
                        width: 35,
                        searchable: false,
                        class: 'text-right',
                        data: 'duration',
                        render: {
                            display: (cellData, type, rowData, meta) => {
                                let logStatus = getLogStatusByDuration(rowData.key, cellData);
                                let statusClass = Util.getLogInfo(logStatus, 'class');
                                return '<span class="txt-color ' + statusClass + '">' + cellData + '<small>ms</small></span>';
                            }
                        }
                    },{
                        targets: 3,
                        name: 'description',
                        title: 'description',
                        searchable: true,
                        data: 'description'
                    },{
                        targets: 4,
                        name: 'logType',
                        title: 'type',
                        width: 40,
                        searchable: true,
                        class: ['text-center'].join(' '),
                        data: 'logType',
                        render: {
                            display: (cellData, type, rowData, meta) => {
                                let typeIconClass = getLogTypeIconClass(cellData);
                                return '<i class="fas ' + typeIconClass + '"></i>';
                            }
                        }
                    },{
                        targets: 5,
                        name: 'process',
                        title: 'Prozess-ID',
                        width: 80,
                        searchable: false,
                        class: 'text-right',
                        data: 'key'
                    }
                ]

            });

            // open dialog
            let logDialog = bootbox.dialog({
                title: 'Task-Manager',
                message: contentTaskManager,
                size: 'large',
                buttons: {
                    close: {
                        label: 'close',
                        className: 'btn-default'
                    }
                }
            });

            // modal dialog is shown
            logDialog.on('shown.bs.modal', function(e){
                updateSyncStatus();

                // show Morris graphs ----------------------------------------------------------

                let labelYFormat = val => Math.round(val) + 'ms';

                for(let key in chartData){
                    if(chartData.hasOwnProperty(key)){
                        // create a chart for each key

                        let colElementGraph = $('<div>', {
                            class: ['col-md-6'].join(' ')
                        });


                        // graph element
                        let graphElement = $('<div>', {
                            class: config.logGraphClass
                        });

                        let graphArea = $('<div>', {
                            class: Util.config.dynamicAreaClass
                        }).append(  graphElement );

                        let headline = $('<h4>', {
                            text: key
                        }).prepend(
                            $('<span>', {
                                class: ['txt-color', 'txt-color-grayLight'].join(' '),
                                text: 'Prozess-ID: '
                            })
                        );

                        // show update ping between function calls
                        let updateElement = $('<small>', {
                            class: ['txt-color', 'txt-color-blue', 'pull-right'].join(' ')
                        });
                        headline.append(updateElement).append('<br>');

                        // show average execution time
                        let averageElement = $('<small>', {
                            class: 'pull-right'
                        });
                        headline.append(averageElement);

                        colElementGraph.append(headline);
                        colElementGraph.append(graphArea);

                        graphArea.showLoadingAnimation();

                        rowElementGraphs.append( colElementGraph );

                        // cache DOM Elements that will be updated frequently
                        chartData[key].averageElement = averageElement;
                        chartData[key].updateElement = updateElement;

                        chartData[key].graph = Morris.Area({
                            element: graphElement,
                            data: [],
                            xkey: 'x',
                            ykeys: ['y'],
                            labels: [key],
                            units: 'ms',
                            parseTime: false,
                            ymin: 0,
                            yLabelFormat: labelYFormat,
                            padding: 10,
                            hideHover: true,
                            pointSize: 3,
                            lineColors: ['#375959'],
                            pointFillColors: ['#477372'],
                            pointStrokeColors: ['#313335'],
                            lineWidth: 2,
                            grid: false,
                            gridStrokeWidth: 0.3,
                            gridTextSize: 9,
                            gridTextFamily: 'Oxygen Bold',
                            gridTextColor: '#63676a',
                            behaveLikeLine: true,
                            goals: [],
                            goalLineColors: ['#66c84f'],
                            smooth: false,
                            fillOpacity: 0.3,
                            resize: true
                        });

                        updateLogGraph(key);

                        graphArea.hideLoadingAnimation();

                    }
                }
            });


            // modal dialog is closed
            logDialog.on('hidden.bs.modal', function(e){
                // clear memory -> destroy all charts
                for(let key in chartData){
                    if(chartData.hasOwnProperty(key)){
                        chartData[key].graph = null;
                    }
                }
            });

            // modal dialog before hide
            logDialog.on('hide.bs.modal', function(e){

                // destroy logTable
                logDataTable.destroy(true);
                logDataTable= null;

                // remove event -> prevent calling this multiple times
                $(this).off('hide.bs.modal');
            });

        });

    };

    /**
     * updates the log graph for a log key
     * @param key
     * @param duration (if undefined -> just update graph with current data)
     */
    let updateLogGraph = (key, duration) => {

        // check if graph data already exist
        if(!(chartData.hasOwnProperty(key))){
            chartData[key] = {};
            chartData[key].data = [];
            chartData[key].graph = null;
            chartData[key].averageElement = null;
            chartData[key].updateElement = null;
        }

        // add new value
        if(duration !== undefined){
            chartData[key].data.unshift(duration);
        }

        if(chartData[key].data.length > maxGraphDataCount){
            chartData[key].data = chartData[key].data.slice(0, maxGraphDataCount);
        }

        let getGraphData = data => {
            let tempChartData = {
                data: [],
                dataSum: 0,
                average: 0
            };

            for(let x = 0; x < maxGraphDataCount; x++){
                let value = 0;
                if(data[x]){
                    value = data[x];
                    tempChartData.dataSum = Number((tempChartData.dataSum + value).toFixed(2));
                }

                tempChartData.data.push({
                    x: x,
                    y: value
                });
            }

            // calculate average
            tempChartData.average = Number((tempChartData.dataSum / data.length).toFixed(2));

            return tempChartData;
        };

        let tempChartData = getGraphData(chartData[key].data);

        // add new data to graph (Morris chart) - if is already initialized
        if(chartData[key].graph !== null){
            let avgElement = chartData[key].averageElement;
            let updateElement = chartData[key].updateElement;

            let delay = Util.getCurrentTriggerDelay(key, 0);

            if(delay){
                updateElement[0].textContent = ' delay: ' + delay.toFixed(2) + ' ms';
            }

            // set/change average line
            chartData[key].graph.options.goals = [tempChartData.average];

            // change avg. display
            avgElement[0].textContent = 'avg. ' + tempChartData.average.toFixed(2) + ' ms';

            let avgStatus = getLogStatusByDuration(key, tempChartData.average);
            let avgStatusClass = Util.getLogInfo( avgStatus, 'class');

            //change avg. display class
            if( !avgElement.hasClass(avgStatusClass) ){
                // avg status changed!
                avgElement.removeClass().addClass('pull-right txt-color ' + avgStatusClass);

                // change goals line color
                if(avgStatus === 'warning'){
                    chartData[key].graph.options.goalLineColors = ['#e28a0d'];
                    $(document).setProgramStatus('slow connection');
                }else{
                    chartData[key].graph.options.goalLineColors = ['#5cb85c'];
                }
            }

            // set new data and redraw
            chartData[key].graph.setData( tempChartData.data );
        }

        return tempChartData.data;
    };

    /**
     * get the log "status" by log duration (ms).
     * If duration > warning limit -> show as warning
     * @param logKey
     * @param logDuration
     * @returns {string}
     */
    let getLogStatusByDuration = (logKey, logDuration) => {
        let logStatus = 'info';
        if(logDuration > Init.timer[logKey].EXECUTION_LIMIT){
            logStatus = 'warning';
        }
        return logStatus;
    };

    /**
     * get the css class for a specific log type
     * @param logType
     * @returns {string}
     */
    let getLogTypeIconClass = logType => {
        let logIconClass = '';

        switch(logType){
            case 'client':
                logIconClass = 'fa-user';
                break;
            case 'server':
                logIconClass = 'fa-download';
                break;
        }

        return logIconClass;
    };

    /**
     * init logging -> set global log events
     */
    let init = function(){

        let maxEntries = 150;

        $(window).on('pf:syncStatus', function(){
            updateSyncStatus();
        });

        // set global logging listener
        $(window).on('pf:log', function(e, logKey, options){

            // check required logging information
            if(
                options &&
                options.duration &&
                options.description
            ){
                let logDescription = options.description;
                let logDuration = options.duration;
                let logType = options.type;

                // update graph data
                updateLogGraph(logKey, logDuration);

                let time = Util.getServerTime();
                let timestamp = time.getTime();
                let timestampFormatted = time.toLocaleTimeString('en-US', { hour12: false });

                let logRowData = {
                    status: getLogStatusByDuration(logKey, logDuration),
                    timestamp: timestamp,
                    timestampFormatted: timestampFormatted,
                    duration: logDuration,
                    description: logDescription,
                    logType: logType,
                    key: logKey
                };

                if(logDataTable){
                    // add row if dataTable is initialized before new log
                    logDataTable.row.add( logRowData ).draw(false);
                }else{
                    // add row data to cache
                    logData.push(logRowData);
                }
            }

            // delete old log entries from table ---------------------------------
            let rowCount = logData.length;

            if(rowCount >= maxEntries){

                if(logDataTable){
                    logDataTable.rows(0, {order:'index'}).remove().draw(false);
                }else{
                    logData.shift();
                }
            }

            // cache logs in order to keep previous logs in table after reopening the dialog
            if(logDataTable){
                logData = logDataTable.rows({order:'index'}).data();
            }

        });
    };


    return {
        init: init,
        showDialog: showDialog
    };
});