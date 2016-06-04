/**
 * System graph module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'morris'
], function($, Init, Util, Morris) {
    'use strict';

    var config = {
        // module info
        moduleClass: 'pf-module',                                               // class for each module

        // system graph module
        systemGraphModuleClass: 'pf-system-graph-module',                       // class  for this module
        systemGraphClass: 'pf-system-graph',                                    // class for each graph

        // system graph labels
        systemGraphLabels: {
            jumps: {
                headline: 'Jumps',
                units: 'jumps',
                ykeys: ['y'],
                labels: ['jumps'],
                lineColors: ['#375959'],
                pointFillColors: ['#477372']
            },
            shipKills: {
                headline: 'Ship/POD Kills',
                units: 'kills',
                ykeys: ['y', 'z'],
                labels: ['Ship kills', 'POD kills'],
                lineColors: ['#375959', '#477372'],
                pointFillColors: ['#477372', '#568a89']
            },
            factionKills: {
                headline: 'NPC Kills',
                units: 'kills',
                ykeys: ['y'],
                labels: ['kills'],
                lineColors: ['#375959'],
                pointFillColors: ['#477372']
            }
        }
    };

    /**
     * get info for a given graph key
     * @param graphKey
     * @param option
     * @returns {string}
     */
    var getInfoForGraph = function(graphKey, option){
        var info = '';

        if(config.systemGraphLabels.hasOwnProperty(graphKey)){
            info = config.systemGraphLabels[graphKey][option];
        }

        return info;
    };

    /**
     * init Morris Graph
     * @param graphElement
     * @param graphKey
     * @param graphData
     */
    var initGraph = function(graphElement, graphKey, graphData, eventLine){

        if(graphData.length > 0){
            var labelYFormat = function(y){
                return Math.round(y);
            };

            var graphConfig = {
                element: graphElement,
                data: graphData,
                xkey: 'x',
                ykeys: getInfoForGraph(graphKey, 'ykeys'),
                labels: getInfoForGraph(graphKey, 'labels'),
                parseTime: false,
                ymin: 0,
                yLabelFormat: labelYFormat,
                padding: 10,
                hideHover: true,
                pointSize: 3,
                lineColors: getInfoForGraph(graphKey, 'lineColors'),
                pointFillColors: getInfoForGraph(graphKey, 'pointFillColors'),
                pointStrokeColors: ['#141413'],
                lineWidth: 2,
                grid: true,
                gridStrokeWidth: 0.3,
                gridTextSize: 9,
                gridTextFamily: 'Oxygen Bold',
                gridTextColor: '#63676a',
                behaveLikeLine: false,
                goals: [],
                goalLineColors: ['#5cb85c'],
                smooth: true,
                fillOpacity: 0.2,
                resize: true,
                redraw: true,
                eventStrokeWidth: 2,
                eventLineColors: ['#5CB85C']
            };

            if(eventLine >= 0){
                graphConfig.events = [eventLine];
            }

            Morris.Area(graphConfig);
        }
    };

    /**
     * draw graph module
     * @param parentElement
     * @param systemData
     */
    var drawModule = function(parentElement, systemData){

        // graph data is available for k-space systems
        if(systemData.type.id === 2){
            var requestData = {
                systemIds: [systemData.systemId]
            };

            // calculate time offset until system created
            var serverData = Util.getServerTime();

            var timestampNow = Math.floor(serverData.getTime() / 1000);
            var timeSinceUpdate = timestampNow - systemData.updated;

            var timeInHours = Math.floor(timeSinceUpdate / 3600);
            var timeInMinutes = Math.floor((timeSinceUpdate % 3600) / 60);
            var timeInMinutesPercent = ( timeInMinutes / 60 ).toFixed(2);
            var eventLine = timeInHours + timeInMinutesPercent;

            // graph is from right to left -> convert event line
            eventLine = 23 - eventLine;

            $.ajax({
                type: 'POST',
                url: Init.path.getSystemGraphData,
                data: requestData,
                dataType: 'json'
            }).done(function(systemGraphsData){

                if( !$.isEmptyObject(systemGraphsData) ){
                    // create new (hidden) module container
                    var moduleElement = $('<div>', {
                        class: [config.moduleClass, config.systemGraphModuleClass].join(' '),
                        css: {opacity: 0}
                    });

                    // insert at the correct position
                    if($(parentElement).children().length === 1){
                        $(parentElement).append(moduleElement);
                    }else{
                        $(parentElement).find('>:first-child').after(moduleElement);
                    }

                    // row element
                    var rowElement = $('<div>', {
                        class: 'row'
                    });
                    moduleElement.append(rowElement);

                    $.each(systemGraphsData, function(systemId, graphsData){
                        $.each(graphsData, function(graphKey, graphData){

                            var colElement = $('<div>', {
                                class: ['col-xs-12', 'col-sm-6', 'col-md-4'].join(' ')
                            });

                            var headlineElement = $('<h5>').text( getInfoForGraph(graphKey, 'headline') );

                            colElement.append(headlineElement);

                            var graphElement = $('<div>', {
                                class: config.systemGraphClass
                            });

                            colElement.append(graphElement);

                            rowElement.append(colElement);
                            initGraph(graphElement, graphKey, graphData, eventLine);
                        });
                    });

                    moduleElement.append($('<div>', {
                        css: {'clear': 'both'}
                    }));

                    // show module
                    moduleElement.velocity('transition.slideDownIn', {
                        duration: Init.animationSpeed.mapModule,
                        delay: Init.animationSpeed.mapModule
                    });
                }
            }).fail(function( jqXHR, status, error) {
                var reason = status + ' ' + error;
                Util.showNotify({title: jqXHR.status + ': System graph data', text: reason, type: 'warning'});
                $(document).setProgramStatus('problem');
            });
        }

    };


    /**
     * main module load function
     * @param systemData
     */
    $.fn.drawSystemGraphModule = function(systemData){

        var parentElement = $(this);

        // check if module already exists
        var moduleElement = parentElement.find('.' + config.systemGraphModuleClass);

        if(moduleElement.length > 0){
            moduleElement.velocity('transition.slideDownOut', {
                duration: Init.animationSpeed.mapModule,
                complete: function(tempElement){
                    $(tempElement).remove();
                    drawModule(parentElement, systemData);
                }
            });
        }else{
            drawModule(parentElement, systemData);
        }
    };



});
