/**
 * System graph module
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'morris'
], ($, Init, Util, Morris) => {
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
                labels: ['Jumps'],
                lineColors: ['#375959'],
                pointFillColors: ['#477372']
            },
            shipKills: {
                headline: 'Ship/POD Kills',
                units: 'kills',
                ykeys: ['y', 'z'],
                labels: ['Ships', 'PODs'],
                lineColors: ['#375959', '#477372'],
                pointFillColors: ['#477372', '#568a89']
            },
            factionKills: {
                headline: 'NPC Kills',
                units: 'kills',
                ykeys: ['y'],
                labels: ['NPCs'],
                lineColors: ['#375959'],
                pointFillColors: ['#477372']
            }
        }
    };

    // temp storage for graphsData response Promise
    // -> stored until module is fully rendered (attached to DOM)
    // otherwise graph can not be rendered
    let graphDataPromise = null;

    /**
     * get info for a given graph key
     * @param graphKey
     * @param option
     * @returns {string}
     */
    let getInfoForGraph = (graphKey, option) => Util.getObjVal(config.systemGraphs, graphKey + '.' + option) || '';

    /**
     * init Morris Graph
     * @param graphElement
     * @param graphKey
     * @param graphData
     * @param eventLine
     */
    let initGraph = (graphElement, graphKey, graphData, eventLine) => {
        if(
            graphData.logExists &&
            graphData.data &&
            graphData.data.length
        ){
            let dataLength = graphData.data.length;
            let xKey = 'x';
            let yKeys = getInfoForGraph(graphKey, 'ykeys');

            // calc average (goal) ------------------------------------------------------------------------------------
            // ... init empty sum object ...
            let sum = yKeys.reduce((result, key) => {
                result[key] = 0;
                return result;
                }, {});

            // ... sum all values ...
            sum = graphData.data.reduce((sum, obj) => {
                for(let [key, value] of Object.entries(obj)){
                    if(sum.hasOwnProperty(key)){
                        sum[key] += value;
                    }
                }
                return sum;
            }, sum);

            // ... calc average
            let goals = Object.values(sum).map(value => Math.floor(value / dataLength));

            let graphConfig = {
                element: graphElement,
                data: graphData.data,
                xkey: xKey,
                ykeys: yKeys,
                labels: getInfoForGraph(graphKey, 'labels'),
                parseTime: false,
                ymin: 0,
                yLabelFormat: value => Math.round(value),
                padding: 8,
                hideHover: true,
                pointSize: 3,
                lineColors: getInfoForGraph(graphKey, 'lineColors'),
                pointFillColors: getInfoForGraph(graphKey, 'pointFillColors'),
                pointStrokeColors: ['#141519'],
                lineWidth: 2,
                grid: true,
                gridStrokeWidth: 0.3,
                gridTextSize: 9,
                gridTextFamily: 'Oxygen Bold',
                gridTextColor: '#63676a',
                behaveLikeLine: false,
                goals: goals,
                goalStrokeWidth: 1,
                goalLineColors: ['#c2760c'],
                smooth: true,
                fillOpacity: 0.2,
                resize: true,
                redraw: true,
                eventStrokeWidth: 1,
                eventLineColors: ['#63676a']
            };

            if(eventLine >= 0){
                graphConfig.events = [eventLine];
            }

            Morris.Area(graphConfig);
        }else{
            // make container a bit smaller -> no graph shown
            graphElement.css('height', '22px').text('No data');
        }
    };

    /**
     * request graphs data
     * @param requestData
     * @param context
     * @returns {Promise<any>}
     */
    let requestGraphData = (requestData, context) => {

        let requestGraphDataExecutor = (resolve, reject) => {
            // show loading animation
            context.moduleElement.find('.' + config.systemGraphClass).showLoadingAnimation();

            $.ajax({
                type: 'GET',
                url: Init.path.getSystemGraphData,
                data: requestData,
                dataType: 'json',
                context: context
            }).done(function(graphData){
                resolve({
                    action: 'requestGraphData',
                    data: {
                        context: this,
                        graphData: graphData
                    }
                });
            }).fail(function(jqXHR, status, error){
                let reason = status + ' ' + error;
                Util.showNotify({title: jqXHR.status + ': System graph data', text: reason, type: 'warning'});
                $(document).setProgramStatus('problem');
                this.moduleElement.hide();

                reject();
            });
        };

        return new Promise(requestGraphDataExecutor);
    };

    /**
     * update graph elements with data
     * @param context
     * @param graphData
     */
    let addGraphData = (context, graphData) => {

        // calculate time offset until system created -----------------------------------------------------------------
        let serverData = Util.getServerTime();
        let timestampNow = Math.floor(serverData.getTime() / 1000);
        let timeSinceUpdate = timestampNow - context.systemData.updated.updated;

        let timeInHours = Math.floor(timeSinceUpdate / 3600);
        let timeInMinutes = Math.floor((timeSinceUpdate % 3600) / 60);
        let timeInMinutesPercent = parseFloat((timeInMinutes / 60).toFixed(2));
        let eventLine = timeInHours * timeInMinutesPercent;

        // graph is from right to left -> convert event line
        eventLine = 23 - eventLine;

        // update graph data ------------------------------------------------------------------------------------------
        for(let [systemId, graphsData] of Object.entries(graphData)){
            for(let [graphKey, graphData] of Object.entries(graphsData)){
                let graphElement = context.moduleElement.find('[data-graph="' + graphKey + '"]');
                graphElement.hideLoadingAnimation();
                initGraph(graphElement, graphKey, graphData, eventLine);
            }
        }
    };

    /**
     * @see requestGraphData
     * @param moduleElement
     * @param systemData
     * @returns {Promise<any>}
     */
    let getGraphsData = (moduleElement, systemData) => {
        let requestData = {
            systemIds: [systemData.systemId]
        };

        let contextData = {
            moduleElement: moduleElement,
            systemData: systemData
        };

        return requestGraphData(requestData, contextData);
    };

    /**
     * init callback
     * @param moduleElement
     * @param mapId
     * @param systemData
     */
    let initModule = (moduleElement, mapId, systemData) => {
        if(graphDataPromise instanceof Promise){
            graphDataPromise
                .then(payload => addGraphData(payload.data.context, payload.data.graphData))
                .catch(payload => {});
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
        let moduleElement = null;
        if(systemData.type.id === 2){
            moduleElement = $('<div>');
            let rowElement = $('<div>', {
                class: 'row'
            });

            for(let [graphKey, graphConfig] of Object.entries(config.systemGraphs)){
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

            // request graph data and store result promise globally
            // -> moduleElement is not full rendered at this point
            graphDataPromise = getGraphsData(moduleElement, systemData);
        }

        return moduleElement;
    };

    return {
        config: config,
        getModule: getModule,
        initModule: initModule
    };

});
