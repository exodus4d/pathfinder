define([
    'jquery',
    'app/init',
    'app/util',
    'morris'
], function($, Init, Util, Morris) {
    "use strict";

    var config = {
        // module info
        moduleClass: 'pf-module',                                               // class for each module

        // system killboard module
        systemKillboardModuleClass: 'pf-system-killboard-module',               // module wrapper
        systemKillboardGraphsClass: 'pf-system-killboard-graphs',               // wrapper for graph
        systemKillboardGraphKillsClass: 'pf-system-killboard-graph-kills'       // class for system kill graph

    };

    var cache = {
        systemKillsGraphData: {} // data for system kills info graph
    };

    /**
     * get label element with given content
     * @param text
     * @returns {*|XMLList}
     */
    var getLabel = function(text, options){
        var label = $('<span>', {
            class: ['label', options.type, options.align].join(' ')
        }).text( text );

        return label;
    };

    /**
     * updates the system info graph
     * @param systemId
     */
    $.fn.updateSystemInfoGraphs = function(systemId){

        var parentElement = $(this);

        var graphElement = $('<div>', {
            class: config.systemKillboardGraphKillsClass
        });

        parentElement.append(graphElement);

        var showHours = 24;
        var maxKillmailCount = 200; // limited by API

        var labelOptions = {
            align: 'center-block'
        };

        // private function draws a "system kills" graph
        var drawGraph = function(data){

            var tableData = data.tableData;
            var label = '';

             if(data.count === 0){
                 labelOptions.type = 'label-success';
                 label = getLabel( 'No kills found within 24h', labelOptions );
                 graphElement.prepend( label );

                 // reduce height
                 graphElement.velocity({
                     height: '30px'
                 },{
                     duration: Init.animationSpeed.mapModule
                 });

                 return;
             }

            var labelYFormat = function(y){
                return Math.round(y);
            };

            // draw chart
            Morris.Bar({
                element: graphElement,
                resize: true,
                grid: true,
                gridStrokeWidth: 0.3,
                gridTextSize: 9,
                gridTextColor: '#63676a',
                gridTextFamily: 'Oxygen Bold',
                hideHover: true,
                data: tableData,
                xkey: 'label',
                ykeys: ['kills'],
                labels: ['Kills'],
                yLabelFormat: labelYFormat,
                xLabelMargin: 10,
                padding: 10,
                parseTime: false,
                barOpacity: 0.8,
                barRadius: [2, 2, 0, 0],
                barSizeRatio: 0.5,
                barGap: 3,
                barColors: function (row, series, type) {
                    if (type === 'bar') {
                        // highlight last row -> recent kills found
                        if(this.xmax === row.x){
                            return '#c2760c';
                        }
                    }

                    return '#375959';
                }
            });

            // show hint for recent kills
            if(tableData[tableData.length - 1].kills > 0){
                labelOptions.type = 'label-warning';
                label = getLabel( tableData[tableData.length - 1].kills + ' kills within the last hour!', labelOptions );
                graphElement.prepend( label );
            }
        };

        // get recent KB stats (last 24h))
        var localDate = new Date();

        // cache result for 5min
        var cacheKey = systemId + '_' + localDate.getHours() + '_' + ( Math.ceil( localDate.getMinutes() / 5 ) * 5);

        if(cache.systemKillsGraphData.hasOwnProperty(cacheKey) ){
            drawGraph( cache.systemKillsGraphData[cacheKey] );
        }else{

            // chart data
            var chartData = [];

            for(var i = 0; i < showHours; i++){
                var tempData = {
                    label: i + 'h',
                    kills: 0
                };

                chartData.push(tempData);
            }

            // get current server time
            var serverDate= Util.getServerTime();

            // get all kills until current server time
            var dateStringEnd = String( serverDate.getFullYear() );
            dateStringEnd += String( ('0' + (serverDate.getMonth() + 1)).slice(-2) );
            dateStringEnd += String( ('0' + serverDate.getDate()).slice(-2) );
            dateStringEnd += String( ('0' + serverDate.getHours()).slice(-2) );
            dateStringEnd += String( ('0' + serverDate.getMinutes()).slice(-2) );

            // get start Date for kills API request (last 24h)
            var startDate = new Date( serverDate.getTime() );
            startDate.setDate( startDate.getDate() - 1);
            var dateStringStart = String( startDate.getFullYear() );
            dateStringStart += String( ('0' + (startDate.getMonth() + 1)).slice(-2) );
            dateStringStart += String( ('0' + startDate.getDate()).slice(-2) );
            dateStringStart += String( ('0' + startDate.getHours()).slice(-2) );
            dateStringStart += String( ('0' + startDate.getMinutes()).slice(-2) );

            var url = Init.url.zKillboard;
            url += '/no-items/no-attackers/solarSystemID/' + systemId + '/startTime/' + dateStringStart + '/endTime/' + dateStringEnd + '/';

            graphElement.showLoadingAnimation();

            $.getJSON(url, function(kbData){

                // the API wont return more than 200KMs ! - remember last bar block with complete KM information
                var lastCompleteDiffHourData = 0;


                // loop kills and count kills by hour
                for(var i = 0; i < kbData.length; i++){
                    var match = kbData[i].killTime.match(/^(\d+)-(\d+)-(\d+) (\d+)\:(\d+)\:(\d+)$/);
                    var killDate = new Date(match[1], match[2] - 1, match[3], match[4], match[5], match[6]);

                    // get time diff
                    var timeDiffMin = Math.round( ( serverDate - killDate ) / 1000 / 60 );
                    var timeDiffHour = Math.round( timeDiffMin / 60 );

                    // update chart data
                    if(chartData[timeDiffHour]){
                        chartData[timeDiffHour].kills++;

                        if(timeDiffHour > lastCompleteDiffHourData){
                            lastCompleteDiffHourData = timeDiffHour;
                        }
                    }

                }

                // remove empty chart Data
                if(kbData.length >= maxKillmailCount){
                    chartData = chartData.splice(0, lastCompleteDiffHourData + 1);
                }

                // change order
                chartData.reverse();

                // fill cache
                cache.systemKillsGraphData[cacheKey] = {};
                cache.systemKillsGraphData[cacheKey].tableData = chartData;
                cache.systemKillsGraphData[cacheKey].count = kbData.length;

                drawGraph( cache.systemKillsGraphData[cacheKey] );

                parentElement.hideLoadingAnimation();
            }).error(function(e){
                Util.showNotify({title: e.status + ': Get system kills', text: 'Loading failed', type: 'error'});
            });
        }

    };

    /**
     * get module Element
     * @param systemData
     * @returns {*|HTMLElement}
     */
    var getModule = function(parentElement, systemData){

        // create new module container
        var moduleElement = $('<div>', {
            class: [config.moduleClass, config.systemKillboardModuleClass].join(' '),
            css: {opacity: 0}
        });

        // headline
        var headline = $('<h5>', {
            text: 'Killboard'
        });

        // graph element
        var graphElement = $('<div>', {
            class: config.systemKillboardGraphsClass
        });

        moduleElement.append(headline, graphElement);

        parentElement.append(moduleElement);

        // update graph
        graphElement.updateSystemInfoGraphs(systemData.systemId);

        return moduleElement;
    };


    /**
     * main module load function
     * @param systemData
     */
    $.fn.drawSystemKillboardModule = function(systemData){

        var parentElement = $(this);

        // show route module
        var showModule = function(moduleElement){
            if(moduleElement){

                moduleElement.velocity('stop').velocity('transition.slideUpIn', {
                    queue: false,
                    duration: Init.animationSpeed.mapModule
                });
            }
        };

        // check if module already exists
        var moduleElement = parentElement.find('.' + config.systemKillboardModuleClass);

        if(moduleElement.length > 0){
            moduleElement.velocity('stop').velocity('reverse', {
                complete: function(tempElement){
                    $(tempElement).remove();

                    moduleElement = getModule(parentElement, systemData);
                    showModule(moduleElement);
                }
            });
        }else{
            moduleElement = getModule(parentElement, systemData);
            showModule(moduleElement);
        }

    };
});