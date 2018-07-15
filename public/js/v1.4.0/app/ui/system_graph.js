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
        systemGraphs: {
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
        if(config.systemGraphs.hasOwnProperty(graphKey)){
            info = config.systemGraphs[graphKey][option];
        }

        return info;
    };

    /**
     * init Morris Graph
     * @param graphElement
     * @param graphKey
     * @param graphData
     * @param eventLine
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
     * request graphs data
     * @param requestData
     * @param context
     * @param callback
     */
    let requestGraphData = (requestData, context, callback) => {
        // show loading animation
        context.moduleElement.find('.' + config.systemGraphClass).showLoadingAnimation();

        $.ajax({
            type: 'POST',
            url: Init.path.getSystemGraphData,
            data: requestData,
            dataType: 'json',
            context: context
        }).done(function(systemGraphsData){
            callback(this, systemGraphsData);
        }).fail(function( jqXHR, status, error) {
            let reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': System graph data', text: reason, type: 'warning'});
            $(document).setProgramStatus('problem');
            this.moduleElement.hide();
        }).always(function(){
            // hide loading animation
            context.moduleElement.find('.' + config.systemGraphClass).hideLoadingAnimation();
        });
    };

    /**
     * update graph elements with data
     * @param context
     * @param systemGraphsData
     */
    let addGraphData = (context, systemGraphsData) => {

        // calculate time offset until system created -----------------------------------------------------------------
        let serverData = Util.getServerTime();
        let timestampNow = Math.floor(serverData.getTime() / 1000);
        let timeSinceUpdate = timestampNow - context.systemData.updated.updated;

        let timeInHours = Math.floor(timeSinceUpdate / 3600);
        let timeInMinutes = Math.floor((timeSinceUpdate % 3600) / 60);
        let timeInMinutesPercent = ( timeInMinutes / 60 ).toFixed(2);
        let eventLine = timeInHours + timeInMinutesPercent;

        // graph is from right to left -> convert event line
        eventLine = 23 - eventLine;

        // update graph data ------------------------------------------------------------------------------------------
        for (let [systemId, graphsData] of Object.entries(systemGraphsData)){
            for (let [graphKey, graphData] of Object.entries(graphsData)){
                let graphElement = context.moduleElement.find('[data-graph="' + graphKey + '"]');
                initGraph(graphElement, graphKey, graphData, eventLine);
            }
        }
    };

    /**
     * @see requestGraphData
     * @param moduleElement
     * @param mapId
     * @param systemData
     */
    let updateGraphPanel = (moduleElement, mapId, systemData) => {
        let requestData = {
            systemIds: [systemData.systemId]
        };

        let contextData = {
            moduleElement: moduleElement,
            systemData: systemData
        };

        requestGraphData(requestData, contextData, addGraphData);
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
        let moduleElement = null;
        if(systemData.type.id === 2){
            moduleElement = $('<div>');
            let rowElement = $('<div>', {
                class: 'row'
            });

            for (let [graphKey, graphConfig] of Object.entries(config.systemGraphs)){
                rowElement.append(
                    $('<div>', {
                        class: ['col-xs-12', 'col-sm-6', 'col-md-4'].join(' ')
                    }).append(
                        $('<div>', {
                            class: config.moduleHeadClass
                        }).append(
                            $('<h5>', {
                                class: config.moduleHandlerClass
                            }),
                            $('<h5>', {
                                text: getInfoForGraph(graphKey, 'headline')
                            })
                        ),
                        $('<div>', {
                            class: config.systemGraphClass
                        }).attr('data-graph', graphKey)
                    )
                );
            }
            moduleElement.append(rowElement);

            updateGraphPanel(moduleElement, mapId, systemData);
        }

        return moduleElement;
    };

    return {
        config: config,
        getModule: getModule
    };

});
