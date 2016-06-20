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

        // headline toolbar
        systemModuleHeadlineIcon: 'pf-module-icon-button',                      // class for toolbar icons in the head

        // system killboard module
        systemKillboardModuleClass: 'pf-system-killboard-module',               // module wrapper
        systemKillboardGraphKillsClass: 'pf-system-killboard-graph-kills',      // class for system kill graph

        // system killboard list
        systemKillboardListClass: 'pf-system-killboard-list',                   // class for a list with kill entries
        systemKillboardListEntryClass: 'pf-system-killboard-list-entry',        // class for a list entry
        systemKillboardListImgShip: 'pf-system-killboard-img-ship',             // class for all ship images
        systemKillboardListImgAlly: 'pf-system-killboard-img-ally',             // class for all alliance logos
        systemKillboardListImgCorp: 'pf-system-killboard-img-corp'              // class for all corp logos

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


    var showKillmails = function(moduleElement, killboardData){

        // show number of killMails
        var killMailCounterMax = 20;
        var killMailCounter = 0;

        // change order (show right to left)
        killboardData.tableData.reverse();

        for(var i = 0; i < killboardData.tableData.length; i++){

            // check if killMails exist in this hour
            if(killboardData.tableData[i].killmails){

                if(killMailCounter >= killMailCounterMax){
                    break;
                }

                moduleElement.append( $('<h5>').text(i + 'h ago'));

                var killMailData = killboardData.tableData[i].killmails;

                var listeElement = $('<ul>', {
                    class: ['media-list', config.systemKillboardListClass].join(' ')
                });

                for(var j = 0; j < killMailData.length; j++){
                    killMailCounter++;
                    if(killMailCounter >= killMailCounterMax){
                        break;
                    }

                    var killData = killMailData[j];

                    var linkUrl = 'https://zkillboard.com/kill/' + killData.killID + '/';
                    var victimImageUrl = 'https://image.eveonline.com/Type/' + killData.victim.shipTypeID + '_64.png';
                    var killDate = getDateObjectByTimeString(killData.killTime);
                    var killDateString = Util.convertDateToString(killDate);
                    var killLossValue = Util.formatPrice( killData.zkb.totalValue );

                    // check for ally
                    var victimAllyLogoUrl = '';
                    var displayAlly = 'none';
                    if(killData.victim.allianceID > 0){
                        victimAllyLogoUrl = 'https://image.eveonline.com/Alliance/' + killData.victim.allianceID + '_32.png';
                        displayAlly = 'block';
                    }

                    // check for corp
                    var victimCorpLogoUrl = '';
                    var displayCorp = 'none';
                    if(killData.victim.corporationID > 0){
                        victimCorpLogoUrl = 'https://image.eveonline.com/Corporation/' + killData.victim.corporationID + '_32.png';
                        displayCorp = 'inline';
                    }

                    var liElement = $('<li>', {
                        class: ['media', config.systemKillboardListEntryClass].join(' ')
                    }).append(
                            $('<a>', {
                                href: linkUrl,
                                target: '_blank'
                            }).append(
                                    $('<img>', {
                                        src: victimImageUrl,
                                        class: ['media-object', 'pull-left', config.systemKillboardListImgShip].join(' ')
                                    })
                                ).append(
                                    $('<img>', {
                                        src: victimAllyLogoUrl,
                                        title: killData.victim.allianceName,
                                        class: ['pull-right', config.systemKillboardListImgAlly].join(' '),
                                        css: {display: displayAlly}
                                    }).attr('data-placement', 'left')
                                ).append(
                                    $('<div>', {
                                        class: 'media-body'
                                    }).append(
                                            $('<h5>', {
                                                class: 'media-heading',
                                                text: killData.victim.characterName
                                            }).prepend(
                                                    $('<small>', {
                                                        text: killDateString + ' - '
                                                    })
                                                ).prepend(
                                                    $('<img>', {
                                                        src: victimCorpLogoUrl,
                                                        title: killData.victim.corporationName,
                                                        class: [config.systemKillboardListImgCorp].join(' '),
                                                        css: {display: displayCorp}
                                                    })
                                                )
                                        ).append(
                                            $('<h3>', {
                                                class: ['media-heading'].join(' ')
                                            }).append(
                                                    $('<small>', {
                                                        class: ['txt-color', 'txt-color-green', 'pull-right'].join(' '),
                                                        text: killLossValue
                                                    })
                                                )
                                        )
                                )
                        );

                    listeElement.append(liElement);

                }

                moduleElement.append(listeElement);

            }
        }


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

    };

    /**
     * updates the system info graph
     * @param systemData
     */
    $.fn.updateSystemInfoGraphs = function(systemData){

        var moduleElement = $(this);


        // headline toolbar icons
        var headlineToolbar  = $('<h5>', {
            class: 'pull-right'
        }).append(
                $('<i>', {
                    class: ['fa', 'fa-fw', 'fa-external-link ', config.systemModuleHeadlineIcon].join(' '),
                    title: 'zkillboard.com'
                }).on('click', function(e){
                    window.open(
                        'https://zkillboard.com/system/' + systemData.systemId,
                        '_blank'
                    );
                }).attr('data-toggle', 'tooltip')
            );

        moduleElement.append(headlineToolbar);

        // headline
        var headline = $('<h5>', {
            text: 'Killboard'
        });

        moduleElement.append(headline);

        var killboardGraphElement = $('<div>', {
            class: config.systemKillboardGraphKillsClass
        });

        moduleElement.append(killboardGraphElement);

        var showHours = 24;
        var maxKillmailCount = 200; // limited by API

        var labelOptions = {
            align: 'center-block'
        };
        var label = '';

        // private function draws a "system kills" graph
        var drawGraph = function(data){

            var tableData = data.tableData;

            // change order (show right to left)
            tableData.reverse();



             if(data.count === 0){
                 labelOptions.type = 'label-success';
                 label = getLabel( 'No kills found within the last 24h', labelOptions );
                 killboardGraphElement.append( label );

                 minifyKillboardGraphElement(killboardGraphElement);
                 return;
             }

            var labelYFormat = function(y){
                return Math.round(y);
            };

            // draw chart
            Morris.Bar({
                element: killboardGraphElement,
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
                label = getLabel( tableData[tableData.length - 1].kills + ' kills within the last hour', labelOptions );
                killboardGraphElement.prepend( label );
            }
        };

        // get recent KB stats (last 24h))
        var localDate = new Date();

        // cache result for 5min
        var cacheKey = systemData.systemId + '_' + localDate.getHours() + '_' + ( Math.ceil( localDate.getMinutes() / 5 ) * 5);

        if(cache.systemKillsGraphData.hasOwnProperty(cacheKey) ){
            // cached results

            drawGraph( cache.systemKillsGraphData[cacheKey] );

            // show killmail information
            showKillmails(moduleElement, cache.systemKillsGraphData[cacheKey]);
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

            // get kills within the last 24h
            var timeFrameInSeconds = 60 * 60 * 24;

            // get current server time
            var serverDate= Util.getServerTime();

            // if system is w-space system -> add link modifier
            var wSpaceLinkModifier = '';
            if(systemData.type.id === 1){
                wSpaceLinkModifier = 'w-space/';
            }

            var url = Init.url.zKillboard;
            url += 'no-items/' + wSpaceLinkModifier + 'no-attackers/solarSystemID/' + systemData.systemId + '/pastSeconds/' + timeFrameInSeconds + '/';

            killboardGraphElement.showLoadingAnimation();

            $.ajax({
                url: url,
                type: 'GET',
                dataType: 'json'
            }).done(function(kbData) {

                // the API wont return more than 200KMs ! - remember last bar block with complete KM information
                var lastCompleteDiffHourData = 0;


                // loop kills and count kills by hour
                for (var i = 0; i < kbData.length; i++) {
                    var killmailData = kbData[i];

                    var killDate = getDateObjectByTimeString(killmailData.killTime);

                    // get time diff
                    var timeDiffMin = Math.round(( serverDate - killDate ) / 1000 / 60);
                    var timeDiffHour = Math.round(timeDiffMin / 60);

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
            }).error(function(e){

                labelOptions.type = 'label-danger';
                label = getLabel(  'zKillboard is not responding', labelOptions );
                killboardGraphElement.prepend( label );

                killboardGraphElement.hideLoadingAnimation();

                minifyKillboardGraphElement(killboardGraphElement);

                Util.showNotify({title: e.status + ': Get system kills', text: 'Loading failed', type: 'error'});
            });
        }



        // init tooltips
        var tooltipElements = moduleElement.find('[data-toggle="tooltip"]');
        tooltipElements.tooltip({
            container: 'body'
        });

    };

    /**
     * minify the killboard graph element e.g. if no kills where found, or on error
     * @param killboardGraphElement
     */
    var minifyKillboardGraphElement = function(killboardGraphElement){
        killboardGraphElement.velocity({
            height: '20px',
            marginBottom: '0px'
        },{
            duration: Init.animationSpeed.mapModule
        });
    };

    /**
     * transform timestring
     * @param timeString
     * @returns {Date}
     */
    var getDateObjectByTimeString = function(timeString){
        var match = timeString.match(/^(\d+)-(\d+)-(\d+) (\d+)\:(\d+)\:(\d+)$/);
        var date = new Date(match[1], match[2] - 1, match[3], match[4], match[5], match[6]);

        return date;
    };

    /**
     * get module element
     * @param systemData
     * @returns {*|HTMLElement}
     */
    var getModule = function(parentElement, systemData){

        // create new module container
        var moduleElement = $('<div>', {
            class: [config.moduleClass, config.systemKillboardModuleClass].join(' '),
            css: {opacity: 0}
        });

        parentElement.append(moduleElement);

        // update graph
        moduleElement.updateSystemInfoGraphs(systemData);

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
                moduleElement.velocity('transition.slideDownIn', {
                    duration: Init.animationSpeed.mapModule,
                    delay: Init.animationSpeed.mapModule
                });
            }
        };

        // check if module already exists
        var moduleElement = parentElement.find('.' + config.systemKillboardModuleClass);

        if(moduleElement.length > 0){
            moduleElement.velocity('transition.slideDownOut', {
                duration: Init.animationSpeed.mapModule,
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