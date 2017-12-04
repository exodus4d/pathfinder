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

    let config = {
        // module info
        modulePosition: 3,
        moduleName: 'systemGraph',
        moduleHeadClass: 'pf-module-head',                                      // class for module header
        moduleHandlerClass: 'pf-module-handler-drag',                           // class for "drag" handler


        // system graph module
        moduleTypeClass: 'pf-system-graph-module',                              // class  for this module
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
    let getInfoForGraph = function(graphKey, option){
        let info = '';

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
    let initGraph = function(graphElement, graphKey, graphData, eventLine){

        if(graphData.length > 0){
            let labelYFormat = function(y){
                return Math.round(y);
            };

            let graphConfig = {
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
     * get module element
     * @param parentElement
     * @param mapId
     * @param systemData
     * @returns {*}
     */
    let getModule = (parentElement, mapId, systemData) => {
        // graph data is available for k-space systems
        let moduleElement = (systemData.type.id === 2) ? $('<div>') : null;

        return moduleElement;
    };

    /**
     * init graph module
     * @param parentElement
     * @param systemData
     */
    let initModule = function(moduleElement, mapId, systemData){

        // graph data is available for k-space systems
        if(systemData.type.id === 2){
            let requestData = {
                systemIds: [systemData.systemId]
            };

            // calculate time offset until system created
            let serverData = Util.getServerTime();

            let timestampNow = Math.floor(serverData.getTime() / 1000);
            let timeSinceUpdate = timestampNow - systemData.updated;

            let timeInHours = Math.floor(timeSinceUpdate / 3600);
            let timeInMinutes = Math.floor((timeSinceUpdate % 3600) / 60);
            let timeInMinutesPercent = ( timeInMinutes / 60 ).toFixed(2);
            let eventLine = timeInHours + timeInMinutesPercent;

            // graph is from right to left -> convert event line
            eventLine = 23 - eventLine;

            $.ajax({
                type: 'POST',
                url: Init.path.getSystemGraphData,
                data: requestData,
                dataType: 'json'
            }).done(function(systemGraphsData){
                if( Object.keys(systemGraphsData).length > 0 ){
                    // row element
                    let rowElement = $('<div>', {
                        class: 'row'
                    });
                    moduleElement.append(rowElement);

                    $.each(systemGraphsData, function(systemId, graphsData){
                        $.each(graphsData, function(graphKey, graphData){

                            let colElement = $('<div>', {
                                class: ['col-xs-12', 'col-sm-6', 'col-md-4'].join(' ')
                            });

                            colElement.append(
                                $('<div>', {
                                    class: config.moduleHeadClass
                                }).append(
                                    $('<h5>', {
                                        class: config.moduleHandlerClass
                                    }),
                                    $('<h5>', {
                                        text: getInfoForGraph(graphKey, 'headline')
                                    })
                                )
                            );

                            let graphElement = $('<div>', {
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
                }
            }).fail(function( jqXHR, status, error) {
                let reason = status + ' ' + error;
                Util.showNotify({title: jqXHR.status + ': System graph data', text: reason, type: 'warning'});
                $(document).setProgramStatus('problem');
            });
        }
    };

    return {
        config: config,
        getModule: getModule,
        initModule: initModule
    };

});
