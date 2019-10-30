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
                pointFillColors: ['#477372'],
                infoLabels: ['Avg. jumps']
            },
            shipKills: {
                headline: 'Ship/POD Kills',
                units: 'kills',
                ykeys: ['y', 'z'],
                labels: ['Ships', 'PODs'],
                lineColors: ['#375959', '#477372'],
                pointFillColors: ['#477372', '#568a89'],
                infoLabels: ['Avg. ship kills', 'Avg. pod kills']
            },
            factionKills: {
                headline: 'NPC Kills',
                units: 'kills',
                ykeys: ['y'],
                labels: ['NPCs'],
                lineColors: ['#375959'],
                pointFillColors: ['#477372'],
                infoLabels: ['Avg. NPC kills']
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
     * @returns {Array|null}
     */
    let initGraph = (graphElement, graphKey, graphData, eventLine) => {
        let tooltipData = null;

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

            // init Morris chart --------------------------------------------------------------------------------------
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
                pointSize: 2.5,
                lineColors: getInfoForGraph(graphKey, 'lineColors'),
                pointFillColors: getInfoForGraph(graphKey, 'pointFillColors'),
                pointStrokeColors: ['#141519'],
                lineWidth: 1.5,
                grid: true,
                gridStrokeWidth: 0.3,
                gridTextSize: 9,
                gridTextFamily: 'Oxygen Bold',
                gridTextColor: '#63676a',
                behaveLikeLine: false,
                goals: goals,
                goalStrokeWidth: 1,
                goalLineColors: ['#c2760c'],
                smooth: false,
                fillOpacity: 0.2,
                resize: true,
                redraw: true,
                eventStrokeWidth: 1,
                eventLineColors: ['#63676a']
            };

            if(eventLine > 0){
                graphConfig.events = [eventLine];
            }

            Morris.Area(graphConfig);

            // data for info "popover" --------------------------------------------------------------------------------
            tooltipData = {};
            let tooltipRows = [];
            let infoLabels = getInfoForGraph(graphKey, 'infoLabels');
            goals.forEach((goal, i) => {
                tooltipRows.push({
                    label: infoLabels[i],
                    value: goal,
                    class: 'txt-color txt-color-orangeDark'
                });
            });
            tooltipData.rows = tooltipRows;

            let serverDate = Util.getServerTime();
            let updatedDate = Util.convertTimestampToServerTime(graphData.updated);
            let updatedDiff = Util.getTimeDiffParts(updatedDate, serverDate);

            tooltipData.title = '<i class="fas fa-download"></i><span class="pull-right ">' + Util.formatTimeParts(updatedDiff) + '</span>';
        }else{
            // make container a bit smaller -> no graph shown
            graphElement.css('height', '22px').text('No data');
        }

        return tooltipData;
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

        // calculate time offset until system updated -----------------------------------------------------------------
        let serverData = Util.getServerTime();
        let timestampNow = Math.floor(serverData.getTime() / 1000);
        let timeSinceUpdate = timestampNow - context.systemData.updated.updated;

        let timeInHours = Math.floor(timeSinceUpdate / 3600);
        let timeInMinutes = Math.floor((timeSinceUpdate % 3600) / 60);
        let timeInMinutesPercent = parseFloat((timeInMinutes / 60).toFixed(2));

        // graph is from right to left -> convert event line
        let eventLine = Math.max(parseFloat((24 - timeInHours - timeInMinutesPercent).toFixed(2)), 0);

        // update graph data ------------------------------------------------------------------------------------------
        for(let [systemId, graphsData] of Object.entries(graphData)){
            for(let [graphKey, graphData] of Object.entries(graphsData)){
                let graphColElement = context.moduleElement.find('[data-graph="' + graphKey + '"]');
                let graphElement = graphColElement.find('.' + config.systemGraphClass);
                graphElement.hideLoadingAnimation();

                graphColElement.data('infoData', initGraph(graphElement, graphKey, graphData, eventLine));
            }
        }

        setModuleObserver(context.moduleElement);
    };

    /**
     * @param moduleElement
     */
    let setModuleObserver = moduleElement => {
        moduleElement.hoverIntent({
            over: function(e){
                let element = $(this);
                let tooltipData = element.parents('[data-graph]').data('infoData');
                if(tooltipData){
                    element.addSystemGraphTooltip(tooltipData.rows, {
                        trigger: 'manual',
                        title: tooltipData.title
                }).popover('show');
                }
            },
            out: function(e){
                $(this).destroyPopover();
            },
            selector: '.' + Util.config.popoverTriggerClass
        });
    };

    /**
     * add info tooltip for graphs
     * @param tooltipData
     * @param options
     * @returns {void|*|undefined}
     */
    $.fn.addSystemGraphTooltip = function(tooltipData, options = {}){

        let table = '<table>';
        for(let data of tooltipData){
            let css = data.class || '';

            table += '<tr>';
            table += '<td>';
            table += data.label;
            table += '</td>';
            table += '<td class="text-right ' + css + '">';
            table += data.value;
            table += '</td>';
            table += '</tr>';
        }
        table += '</table>';

        let defaultOptions = {
            placement: 'top',
            html: true,
            trigger: 'hover',
            container: 'body',
            title: 'Info',
            content: table,
            delay: {
                show: 0,
                hide: 0
            },
        };

        options = $.extend({}, defaultOptions, options);

        return this.each(function(){
            $(this).popover(options);
        });
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

            for(let graphKey of Object.keys(config.systemGraphs)){
                rowElement.append(
                    $('<div>', {
                        class: ['col-xs-12', 'col-sm-4'].join(' ')
                    }).attr('data-graph', graphKey).append(
                        $('<div>', {
                            class: config.moduleHeadClass
                        }).append(
                            $('<h5>', {
                                class: config.moduleHandlerClass
                            }),
                            $('<h5>', {
                                text: getInfoForGraph(graphKey, 'headline')
                            }),
                            $('<h5>', {
                                class: 'pull-right'
                            }).append(
                                $('<small>', {
                                    html: '<i class="fas fa-fw fa-question-circle pf-help ' + Util.config.popoverTriggerClass + '"></i>'
                                })
                            )
                        ),
                        $('<div>', {
                            class: config.systemGraphClass
                        })
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
