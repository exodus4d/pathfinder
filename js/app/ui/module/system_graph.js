/**
 * System graph module
 */

define([
    'jquery',
    'app/util',
    'module/base',
    'morris'
], ($, Util, BaseModule, Morris) => {
    'use strict';

    let SystemGraphModule = class SystemGraphModule extends BaseModule {
        constructor(config = {}) {
            super(Object.assign({}, new.target.defaultConfig, config));
        }

        newHeaderElement(){
            return ''; // no default header for this module
        }

        newHeadlineToolbarElement(){
            let toolbarEl = super.newHeadlineToolbarElement();

            let infoEl = document.createElement('small');
            infoEl.innerHTML = '<i class="fas fa-fw fa-question-circle pf-help ' + Util.config.popoverTriggerClass + '"></i>';
            toolbarEl.append(infoEl);

            return toolbarEl;
        }

        /**
         * render module
         * @param mapId
         * @param systemData
         * @returns {HTMLElement}
         */
        render(mapId, systemData){
            this._systemData = systemData;

            // graph data is available for k-space systems
            if(systemData.type.id === 2){

                let rowEl = document.createElement('div');
                rowEl.classList.add(this._config.bodyClassName, 'grid');

                for(let graphKey of Object.keys(this._config.systemGraphs)){
                    let colEl = document.createElement('div');
                    colEl.dataset.graph = graphKey;

                    let headEl = this.newHeadElement();
                    headEl.append(
                        this.newHandlerElement(),
                        this.newHeadlineElement(this.getInfoForGraph(graphKey, 'headline')),
                        this.newHeadlineToolbarElement()
                    );

                    let graphEl = document.createElement('div');
                    graphEl.classList.add(this._config.systemGraphClass);

                    colEl.append(headEl, graphEl);
                    rowEl.append(colEl);
                }
                this.moduleElement.append(rowEl);

                this.setModuleObserver();

                // request graph data and store result promise
                // -> module is not full rendered jet
                this._dataPromise = this.getGraphsData();

                return this.moduleElement;
            }
        }

        /**
         * init module
         */
        init(){
            super.init();

            if(this._dataPromise instanceof Promise){
                this._dataPromise
                    .then(payload => this.addGraphData(payload.data))
                    .catch(payload => {
                        let reason = payload.data.status + ' ' + payload.data.error;
                        this.showNotify({title: payload.data.jqXHR.status + ': System graph data', text: reason, type: 'warning'});
                    });
            }
        }

        /**
         * get data for graphs
         * @returns {Promise}
         */
        getGraphsData(){
            $(this.moduleElement).find('.' + this._config.systemGraphClass).showLoadingAnimation();
            return this.request('GET', 'SystemGraph', this._systemData.id, {
                systemIds: [this._systemData.systemId]
            });
        }

        /**
         * update graph elements with data
         * @param graphData
         */
        addGraphData(graphData){

            // calculate time offset until system updated -------------------------------------------------------------
            let serverData = Util.getServerTime();
            let timestampNow = Math.floor(serverData.getTime() / 1000);
            let timeSinceUpdate = timestampNow - this._systemData.updated.updated;

            let timeInHours = Math.floor(timeSinceUpdate / 3600);
            let timeInMinutes = Math.floor((timeSinceUpdate % 3600) / 60);
            let timeInMinutesPercent = parseFloat((timeInMinutes / 60).toFixed(2));

            // graph is from right to left -> convert event line
            let eventLine = Math.max(parseFloat((24 - timeInHours - timeInMinutesPercent).toFixed(2)), 0);

            // update graph data --------------------------------------------------------------------------------------
            for(let [systemId, graphsData] of Object.entries(graphData)){
                for(let [graphKey, graphData] of Object.entries(graphsData)){
                    let graphColElement = $(this.moduleElement).find('[data-graph="' + graphKey + '"]');
                    let graphElement = graphColElement.find('.' + this._config.systemGraphClass);
                    graphElement.hideLoadingAnimation();

                    graphColElement.data('infoData', this.initGraph(graphElement, graphKey, graphData, eventLine));
                }
            }
        }

        /**
         * set module observer
         */
        setModuleObserver(){
            $(this.moduleElement).hoverIntent({
                over: function(e){
                    let element = $(this);
                    let tooltipData = element.parents('[data-graph]').data('infoData');
                    if(tooltipData){
                        SystemGraphModule.addSystemGraphTooltip(element, tooltipData.rows, {
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
        }

        /**
         * get info for a given graph key
         * @param graphKey
         * @param option
         * @returns {*|string}
         */
        getInfoForGraph(graphKey, option){
            return Util.getObjVal(this._config.systemGraphs, graphKey + '.' + option) || '';
        }

        /**
         * init Morris Graph
         * @param graphElement
         * @param graphKey
         * @param graphData
         * @param eventLine
         * @returns {null|Object}
         */
        initGraph(graphElement, graphKey, graphData, eventLine){
            let tooltipData = null;

            if(
                graphData.logExists &&
                graphData.data &&
                graphData.data.length
            ){
                let dataLength = graphData.data.length;
                let xKey = 'x';
                let yKeys = this.getInfoForGraph(graphKey, 'ykeys');

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
                    labels: this.getInfoForGraph(graphKey, 'labels'),
                    xLabelAngle: 0,
                    parseTime: false,
                    ymin: 0,
                    yLabelFormat: value => Math.round(value),
                    padding: 8,
                    hideHover: true,
                    pointSize: 2.5,
                    lineColors: this.getInfoForGraph(graphKey, 'lineColors'),
                    pointFillColors: this.getInfoForGraph(graphKey, 'pointFillColors'),
                    pointStrokeColors: ['#141519'],
                    lineWidth: 1.5,
                    grid: true,
                    gridTextColor: '#63676a',
                    gridTextSize: 10,
                    gridTextFamily: 'Arial, "Oxygen Bold"',
                    gridStrokeWidth: 0.3,
                    behaveLikeLine: true,
                    goals: goals,
                    goalStrokeWidth: 1,
                    goalLineColors: ['#c2760c'],
                    smooth: true,
                    fillOpacity: 0.5,
                    //belowArea: true,
                    areaColors: ['#c2760c', '#c2760c'],
                    belowArea: true,
                    //resize: true,
                    //redraw: true,
                    dataLabels: false,
                    eventStrokeWidth: 1,
                    eventLineColors: ['#63676a'],
                    nbYkeys2: this.getInfoForGraph(graphKey, 'nbYkeys2')
                };

                if(eventLine > 0){
                    graphConfig.events = [eventLine];
                }

                this['_aChart_' + graphKey] = Morris.Line(graphConfig);

                // data for info "popover" --------------------------------------------------------------------------------
                tooltipData = {};
                let tooltipRows = [];
                let infoLabels = this.getInfoForGraph(graphKey, 'infoLabels');
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
        }

        beforeDestroy(){
            super.beforeDestroy();

            for(let graphKey of Object.keys(this._config.systemGraphs)){
                if(typeof this['_aChart_' + graphKey] === 'object'){
                    this['_aChart_' + graphKey].destroy();
                    delete this['_aChart_' + graphKey];
                }
            }
        }

        /**
         * detect changed drop area, -> should trigger graph redraw
         * @param name
         * @param e
         */
        onSortableEvent(name, e){
            super.onSortableEvent(name, e);
            if(e.type === 'add' && e.from !== e.to){
                for(let graphKey of Object.keys(this._config.systemGraphs)){
                    if(typeof this['_aChart_' + graphKey] === 'object'){
                        this['_aChart_' + graphKey].resizeHandler();
                    }
                }
            }
        }

        /**
         * add info tooltip for graphs
         * @param element
         * @param tooltipData
         * @param options
         * @returns {jQuery}
         */
        static addSystemGraphTooltip(element, tooltipData, options = {}){
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

            options = Object.assign({}, defaultOptions, options);

            return $(element).popover(options);
        }
    };

    SystemGraphModule.isPlugin = false;                     // module is defined as 'plugin'
    SystemGraphModule.scope = 'system';                     // module scope controls how module gets updated and what type of data is injected
    SystemGraphModule.sortArea = 'a';                       // default sortable area
    SystemGraphModule.position = 3;                         // default sort/order position within sortable area
    SystemGraphModule.label = 'Graphs';                     // static module label (e.g. description)

    SystemGraphModule.defaultConfig = {
        className: 'pf-system-graph-module',                // class for module
        sortTargetAreas: ['a', 'b', 'c'],                   // sortable areas where module can be dragged into

        systemGraphClass: 'pf-system-graph',                // class for each graph
        systemGraphs: {
            jumps: {
                headline: 'Jumps',
                postUnits: 'jumps',
                ykeys: ['y'],
                nbYkeys2: 0,
                labels: ['Jumps'],
                lineColors: ['#375959'],
                pointFillColors: ['#477372'],
                infoLabels: ['Avg. jumps']
            },
            shipKills: {
                headline: 'Ship/POD Kills',
                postUnits: 'kills',
                ykeys: ['y', 'z'],
                nbYkeys2: 1,
                labels: ['Ships', 'PODs'],
                lineColors: ['#375959', '#477372'],
                pointFillColors: ['#477372', '#568a89'],
                infoLabels: ['Avg. ship kills', 'Avg. pod kills']
            },
            factionKills: {
                headline: 'NPC Kills',
                postUnits: 'kills',
                ykeys: ['y'],
                nbYkeys2: 0,
                labels: ['NPCs'],
                lineColors: ['#375959'],
                pointFillColors: ['#477372'],
                infoLabels: ['Avg. NPC kills']
            }
        }
    };

    return SystemGraphModule;
});
