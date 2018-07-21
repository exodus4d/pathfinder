define([
    'jquery',
    'app/init',
    'app/util',
    'morris'
], ($, Init, Util, Morris) => {
    'use strict';

    let config = {
        // module info
        modulePosition: 2,
        moduleName: 'systemKillboard',
        moduleHeadClass: 'pf-module-head',                                      // class for module header
        moduleHandlerClass: 'pf-module-handler-drag',                           // class for "drag" handler

        // headline toolbar
        moduleHeadlineIconClass: 'pf-module-icon-button',                       // class for toolbar icons in the head

        // system killboard module
        moduleTypeClass: 'pf-system-killboard-module',                          // class for this module
        systemKillboardGraphKillsClass: 'pf-system-killboard-graph-kills',      // class for system kill graph

        // system killboard list
        systemKillboardListClass: 'pf-system-killboard-list',                   // class for a list with kill entries
        systemKillboardListEntryClass: 'pf-system-killboard-list-entry',        // class for a list entry
        systemKillboardListImgShip: 'pf-system-killboard-img-ship',             // class for all ship images
        systemKillboardListImgChar: 'pf-system-killboard-img-char',             // class for all character logos
        systemKillboardListImgAlly: 'pf-system-killboard-img-ally',             // class for all alliance logos
        systemKillboardListImgCorp: 'pf-system-killboard-img-corp'              // class for all corp logos
    };

    let cache = {
        systemKillsGraphData: {} // data for system kills info graph
    };

    /**
     *
     * @param text
     * @param options
     * @returns {jQuery}
     */
    let getLabel = (text, options) => {
        let label = $('<span>', {
            class: ['label', options.type, options.align].join(' ')
        }).text( text );

        return label;
    };

    /**
     * show killMails
     * @param moduleElement
     * @param killboardData
     */
    let showKillmails = (moduleElement, killboardData) => {

        // show number of killMails
        let killMailCounterMax = 20;
        let killMailCounter = 0;

        // change order (show right to left)
        killboardData.tableData.reverse();

        let data = {
            tableData: killboardData.tableData,
            systemKillboardListClass: config.systemKillboardListClass,
            systemKillboardListEntryClass: config.systemKillboardListEntryClass,
            systemKillboardListImgShip: config.systemKillboardListImgShip,
            systemKillboardListImgChar: config.systemKillboardListImgChar,
            systemKillboardListImgAlly: config.systemKillboardListImgAlly,
            systemKillboardListImgCorp: config.systemKillboardListImgCorp,
            zKillboardUrl: 'https://zkillboard.com',
            ccpImageServerUrl: Init.url.ccpImageServer,

            dateFormat: () => {
                return (val, render) => {
                    let killDate = Util.convertDateToUTC(new Date(render(val)));
                    return  Util.convertDateToString(killDate);
                };
            },
            iskFormat: () => {
                return (val, render) => {
                    return Util.formatPrice(render(val));
                };
            },
            checkRender : () => {
                return (val, render) => {
                    if(killMailCounter < killMailCounterMax){
                        return render(val);
                    }
                };
            },
            increaseCount : () => {
                return (val, render) => {
                    killMailCounter++;
                };
            }
        };

        requirejs(['text!templates/modules/killboard.html', 'mustache'], function(template, Mustache) {
            let content = Mustache.render(template, data);

            moduleElement.append(content);

            // animate kill li-elements
            $('.' + config.systemKillboardListEntryClass).velocity('transition.expandIn', {
                stagger: 50,
                complete: function(){
                    // init tooltips
                    moduleElement.find('[title]').tooltip({
                        container: 'body'
                    });

                }
            });
        });
    };

    /**
     * updates the system info graph
     * @param systemData
     */
    $.fn.updateSystemInfoGraphs = function(systemData){
        let moduleElement = $(this);

        let killboardGraphElement = $('<div>', {
            class: config.systemKillboardGraphKillsClass
        });

        moduleElement.append(killboardGraphElement);

        let showHours = 24;
        let maxKillmailCount = 200; // limited by API

        let labelOptions = {
            align: 'center-block'
        };
        let label = '';

        // private function draws a "system kills" graph
        let drawGraph = function(data){
            let tableData = data.tableData;

            // change order (show right to left)
            tableData.reverse();

             if(data.count === 0){
                 labelOptions.type = 'label-success';
                 label = getLabel( 'No kills found within the last 24h', labelOptions );
                 killboardGraphElement.append( label );

                 minifyKillboardGraphElement(killboardGraphElement);
                 return;
             }

            let labelYFormat = function(y){
                return Math.round(y);
            };

            // draw chart
            Morris.Bar({
                element: killboardGraphElement,
                resize: true,
                redraw: true,
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
                label = getLabel( tableData[tableData.length - 1].kills + ' kills within the last hour', labelOptions );
                killboardGraphElement.prepend( label );
            }
        };

        // get recent KB stats (last 24h))
        let localDate = new Date();

        // cache result for 5min
        let cacheKey = systemData.systemId + '_' + localDate.getHours() + '_' + ( Math.ceil( localDate.getMinutes() / 5 ) * 5);

        if(cache.systemKillsGraphData.hasOwnProperty(cacheKey) ){
            // cached results

            drawGraph( cache.systemKillsGraphData[cacheKey] );

            // show killmail information
            showKillmails(moduleElement, cache.systemKillsGraphData[cacheKey]);
        }else{

            // chart data
            let chartData = [];

            for(let i = 0; i < showHours; i++){
                let tempData = {
                    label: i + 'h',
                    kills: 0
                };

                chartData.push(tempData);
            }

            // get kills within the last 24h
            let timeFrameInSeconds = 60 * 60 * 24;

            // get current server time
            let serverDate= Util.getServerTime();

            // if system is w-space system -> add link modifier
            let wSpaceLinkModifier = '';
            if(systemData.type.id === 1){
                wSpaceLinkModifier = 'w-space/';
            }

            let url = Init.url.zKillboard + '/';
            url += 'no-items/' + wSpaceLinkModifier + 'no-attackers/solarSystemID/' + systemData.systemId + '/pastSeconds/' + timeFrameInSeconds + '/';

            killboardGraphElement.showLoadingAnimation();

            $.ajax({
                url: url,
                type: 'GET',
                dataType: 'json'
            }).done(function(kbData) {

                // the API wont return more than 200KMs ! - remember last bar block with complete KM information
                let lastCompleteDiffHourData = 0;

                // loop kills and count kills by hour
                for (let i = 0; i < kbData.length; i++) {
                    let killmailData = kbData[i];
                    let killDate = Util.convertDateToUTC(new Date(killmailData.killmail_time));

                    // get time diff
                    let timeDiffMin = Math.round(( serverDate - killDate ) / 1000 / 60);
                    let timeDiffHour = Math.floor(timeDiffMin / 60);

                    // update chart data
                    if (chartData[timeDiffHour]) {
                        chartData[timeDiffHour].kills++;

                        // add kill mail data
                        if (chartData[timeDiffHour].killmails === undefined) {
                            chartData[timeDiffHour].killmails = [];
                        }
                        chartData[timeDiffHour].killmails.push(killmailData);

                        if (timeDiffHour > lastCompleteDiffHourData) {
                            lastCompleteDiffHourData = timeDiffHour;
                        }
                    }

                }

                // remove empty chart Data
                if (kbData.length >= maxKillmailCount) {
                    chartData = chartData.splice(0, lastCompleteDiffHourData + 1);
                }

                // fill cache
                cache.systemKillsGraphData[cacheKey] = {};
                cache.systemKillsGraphData[cacheKey].tableData = chartData;
                cache.systemKillsGraphData[cacheKey].count = kbData.length;

                // draw table
                drawGraph(cache.systemKillsGraphData[cacheKey]);

                // show killmail information
                showKillmails(moduleElement, cache.systemKillsGraphData[cacheKey]);

                killboardGraphElement.hideLoadingAnimation();
            }).fail(function(e){

                labelOptions.type = 'label-danger';
                label = getLabel(  'zKillboard is not responding', labelOptions );
                killboardGraphElement.prepend( label );

                killboardGraphElement.hideLoadingAnimation();

                minifyKillboardGraphElement(killboardGraphElement);

                Util.showNotify({title: e.status + ': Get system kills', text: 'Loading failed', type: 'error'});
            });
        }



        // init tooltips
        let tooltipElements = moduleElement.find('[data-toggle="tooltip"]');
        tooltipElements.tooltip({
            container: 'body'
        });

    };

    /**
     * minify the killboard graph element e.g. if no kills where found, or on error
     * @param killboardGraphElement
     */
    let minifyKillboardGraphElement = (killboardGraphElement) => {
        killboardGraphElement.velocity({
            height: '20px',
            marginBottom: '0px'
        },{
            duration: Init.animationSpeed.mapModule
        });
    };

    /**
     * get module toolbar element
     * @param systemData
     * @returns {*|jQuery|HTMLElement|void}
     */
    let getHeadlineToolbar = (systemData) => {
        let headlineToolbar  = $('<h5>', {
            class: 'pull-right'
        }).append(
            $('<i>', {
                class: ['fas', 'fa-fw', 'fa-external-link-alt ', config.moduleHeadlineIconClass].join(' '),
                title: 'zkillboard.com'
            }).on('click', function(e){
                window.open(
                    '//zkillboard.com/system/' + systemData.systemId,
                    '_blank'
                );
            }).attr('data-toggle', 'tooltip')
        );

        headlineToolbar.find('[data-toggle="tooltip"]').tooltip({
            container: 'body'
        });

        return headlineToolbar;
    };

    /**
     * before module "show" callback
     * @param moduleElement
     * @param systemData
     */
    let beforeShow = (moduleElement, systemData) => {
        // update graph
        moduleElement.updateSystemInfoGraphs(systemData);
    };

    /**
     * get module element
     * @param parentElement
     * @param mapId
     * @param systemData
     * @returns {jQuery}
     */
    let getModule = (parentElement, mapId, systemData) => {
        // create new module container
        let moduleElement = $('<div>').append(
            $('<div>', {
                class: config.moduleHeadClass
            }).append(
                $('<h5>', {
                    class: config.moduleHandlerClass
                }),
                $('<h5>', {
                    text: 'Killboard'
                }),
                getHeadlineToolbar(systemData)
            )
        );

        return moduleElement;
    };

    return {
        config: config,
        getModule: getModule,
        beforeShow: beforeShow
    };
});