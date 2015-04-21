/**
 * logging
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'bootbox'
], function($, Init, Util, bootbox) {

    'use strict';

    var logData = [];                                               // cache object for all log entries
    var logDataTable = null;                                        // "Datatables" Object

    // Morris charts data
    var maxGraphDataCount = 30;                                     // max date entries for a graph
    var chartData = {};                                             // chart Data object for all Morris Log graphs

    var config = {
        dialogDynamicAreaClass: 'pf-dynamic-area',                  // class for dynamic areas
        logGraphClass: 'pf-log-graph'                               // class for all log Morris graphs
    };

    /**
     * get log time string
     * @returns {string}
     */
    var getLogTime = function(){

        var logTimeFormatOptions = {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };

        var logTime = Util.getServerTime().toLocaleString('en-UK', logTimeFormatOptions);

        return logTime;
    };

    /**
     * shows the logging dialog
     */
    var showDialog = function(){

        // dialog content

        var content = $('<div>');

        // content row  for log graphs
        var rowElementGraphs = $('<div>', {
            class: 'row'
        });

        content.append(rowElementGraphs);

        // log table area --------------------------------------------------
        var logTableArea = $('<div>', {
            class: config.dialogDynamicAreaClass
        });

        var logTable = $('<table>', {
            class: ['compact', 'stripe', 'order-column', 'row-border'].join(' ')
        });

        var tableHeadline = $('<h4>', {
            text: 'Log table'
        });

        // add content Structure to dome before table initialization
        content.append(tableHeadline);

        logTableArea.append(logTable);
        content.append(logTableArea);

        // init log table
        logDataTable = logTable.DataTable( {
            paging: true,
            ordering: true,
            order: [ 1, 'desc' ],
            autoWidth: false,
            hover: false,
            pageLength: 15,
            data: logData,                      // load cached logs (if available)
            language: {
                emptyTable:  'No entries',
                zeroRecords: 'No entries found',
                lengthMenu:  'Show _MENU_ entries',
                info:        'Showing _START_ to _END_ of _TOTAL_ entries'
            },
            columnDefs: [
                {
                    targets: 0,
                    title: '<i class="fa fa-lg fa-tag"></i>',
                    width: '18px',
                    searchable: false,
                    data: 'type'
                },{
                    targets: 1,
                    title: '<i class="fa fa-lg fa-fw fa-clock-o"></i>&nbsp;&nbsp;',
                    width: '80px',
                    searchable: true,
                    class: 'text-right',
                    data: 'time'
                },{
                    targets: 2,
                    title: '<i class="fa fa-lg fa-fw fa-history"></i>&nbsp;&nbsp;',
                    width: '35px',
                    searchable: false,
                    class: 'text-right',
                    sType: 'html',
                    data: 'duration'
                },{
                    targets: 3,
                    title: 'description',
                    searchable: true,
                    data: 'description'
                },{
                    targets: 4,
                    title: '<i class="fa fa-lg fa-code-fork"></i>&nbsp;&nbsp;&nbsp;',
                    width: '18px',
                    searchable: true,
                    class: 'text-right',
                    data: 'test'
                },{
                    targets: 5,
                    title: 'Prozess-ID&nbsp;&nbsp;&nbsp;',
                    width: '80px',
                    searchable: false,
                    class: 'text-right',
                    data: 'key'
                }
            ]

        });

        // open dialog
        var logDialog = bootbox.dialog({
            title: 'Task-Manager',
            message: content,
            className: 'modal-lg',
            buttons: {
                close: {
                    label: 'close',
                    className: 'btn-primary'
                }
            }
        });

        // modal dialog is shown
        logDialog.on('shown.bs.modal', function(e) {

            // show Morris graphs ----------------------------------------------------------

            // function for chart label formation
            var labelYFormat = function(y){
                return Math.round(y) + 'ms';
            };


            for(var key in chartData) {
                if(chartData.hasOwnProperty(key)) {
                    // create a chart for each key

                    var colElementGraph = $('<div>', {
                        class: ['col-md-6'].join(' ')
                    });


                    // graph element
                    var graphElement = $('<div>', {
                        class: config.logGraphClass
                    });

                    var graphArea = $('<div>', {
                        class: config.dialogDynamicAreaClass
                    }).append(  graphElement );

                    // headline
                    var headline = $('<h4>', {
                        text: key
                    }).prepend(
                            $('<span>', {
                                class: ['txt-color', 'txt-color-grayLight'].join(' '),
                                text: 'Prozess-ID: '
                            })
                        );

                    // show update ping between function calls
                    var updateElement = $('<small>', {
                        class: ['txt-color', 'txt-color-blue', 'pull-right'].join(' ')
                    });
                    headline.append(updateElement).append('<br>');

                    // show average execution time
                    var averageElement = $('<small>', {
                        class: 'pull-right'
                    });
                    headline.append(averageElement);

                    colElementGraph.append( headline );
                    colElementGraph.append( graphArea );

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

                    graphArea.hideLoadingAnimation();

                }
            }

            // ------------------------------------------------------------------------------
            // add TableTool Buttons
            var tt = new $.fn.DataTable.TableTools( logDataTable, {
                sSwfPath: 'js/lib/datatables/extensions/TableTools/swf/copy_csv_xls.swf',
                aButtons: [ 'copy', 'csv', 'print' ]
            });

            $(tt.fnContainer()).insertBefore('.bootbox-body div.dataTables_wrapper');

            // add button icons
            $('.DTTT_button_csv').prepend( $('<i>', {
                class: ['fa', 'fa-fw', 'fa-download'].join(' ')
            }));
            $('.DTTT_button_copy').prepend( $('<i>', {
                class: ['fa', 'fa-fw', 'fa-clipboard'].join(' ')
            }));
            $('.DTTT_button_print').prepend( $('<i>', {
                class: ['fa', 'fa-fw', 'fa-print'].join(' ')
            }));
        });


        // modal dialog is closed
        logDialog.on('hidden.bs.modal', function(e) {
            // clear memory -> destroy all charts
            for (var key in chartData) {
                if (chartData.hasOwnProperty(key)) {
                    chartData[key].graph = null;
                }
            }
        });

        // modal dialog before hide
        logDialog.on('hide.bs.modal', function(e) {

            // destroy logTable
            logDataTable.destroy(true);
            logDataTable= null;

            // remove event -> prevent calling this multiple times
            $(this).off('hide.bs.modal');
        });

    };

    /**
     * updates the log graph for a log key
     * @param key
     * @param duration
     */
    var updateLogGraph = function(key, duration){

        // check if graph data already exist
        if( !(chartData.hasOwnProperty(key))){
            chartData[key] = {};
            chartData[key].data = [];
            chartData[key].graph = null;
            chartData[key].averageElement = null;
            chartData[key].updateElement = null;
        }

        // add new value
        chartData[key].data.unshift(duration);

        if(chartData[key].data.length > maxGraphDataCount){
            chartData[key].data = chartData[key].data.slice(0, maxGraphDataCount);
        }

        function getGraphData(data) {
            var tempChartData = {
                data: [],
                dataSum: 0,
                average: 0
            };

            for(var x = 0; x < maxGraphDataCount; x++){
                var value = 0;
                if(data[x]){
                    value = data[x];
                    tempChartData.dataSum = Number( (tempChartData.dataSum + value).toFixed(2) );
                }

                tempChartData.data.push({
                    x: x,
                    y: value
                });
            }

            // calculate average
            tempChartData.average = Number( ( tempChartData.dataSum / data.length ).toFixed(2) );

            return tempChartData;
        }

        var tempChartData = getGraphData(chartData[key].data);

        // add new data to graph (Morris chart) - if is already initialized
        if(chartData[key].graph !== null){
            var avgElement = chartData[key].averageElement;
            var updateElement = chartData[key].updateElement;

            var delay = Init.timer[key].delay;

            if(delay){
                updateElement[0].textContent = ' delay: ' + delay + 'ms ';
            }

            // set/change average line
            chartData[key].graph.options.goals = [tempChartData.average];

            // change avg. display
            avgElement[0].textContent = 'Avg. ' + tempChartData.average + 'ms';

            var avgType = getLogTypeByDuration(key, tempChartData.average);
            var avgTypeClass = Util.getLogInfo( avgType, 'class' );

            //change avg. display class
            if(
                !avgElement.hasClass(avgTypeClass)
            ){
                // avg type changed!
                avgElement.removeClass().addClass('pull-right txt-color ' + avgTypeClass);

                // change goals line color
                if(avgType === 'warning'){
                    chartData[key].graph.options.goalLineColors = ['#e28a0d'];
                    $(document).setProgramStatus('problem');
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
     * get the log "type" by log duration (ms).
     * If duration > warning limit -> show as warning
     * @param logKey
     * @param logDuration
     * @returns {string}
     */
    var getLogTypeByDuration = function(logKey, logDuration){

        var logType = 'info';
        if( logDuration > Init.timer[logKey].executionLimit ){
            logType = 'warning';
        }
        return logType;
    };

    /**
     * init logging -> set global log event
     */
    var init = function(){


        var maxEntries = 150;

        // set global logging listener
        $(window).on('pf:log', function(e, logKey, options){

            // check required logging information
            if(
                options &&
                options.duration &&
                options.description
            ){
                var logDescription = options.description;
                var logDuration = options.duration;

                // add new row to log table (time and message)
   //             var logRowData = ['', getLogTime(), '', logDescription, '', ''];

                // check log type by duration
                var logType = getLogTypeByDuration(logKey, logDuration);

                var typeClass = Util.getLogInfo( logType, 'class' );
/*
                logRowData[0] = '<i class="fa fa-fw fa-circle txt-color ' + typeClass + '"></i>';

                logRowData[2] = '<span class="txt-color ' + typeClass + '">' + logDuration + '<small>ms</small></span>';
*/
                // update graph data
                updateLogGraph(logKey, logDuration);
/*
                logRowData[4] = '123';
                logRowData[5] = logKey;
*/

                var logRowData = {
                    type:  '<i class="fa fa-fw fa-circle txt-color ' + typeClass + '"></i>',
                    time: getLogTime(),
                    duration: '<span class="txt-color ' + typeClass + '">' + logDuration + '<small>ms</small></span>',
                    description: logDescription,
                    test: '123',
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
            var rowCount = logData.length;

            if( rowCount >= maxEntries ){

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
        getLogTime: getLogTime,
        showDialog: showDialog
    };
});