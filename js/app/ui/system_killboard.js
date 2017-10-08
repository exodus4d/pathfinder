define([
    'jquery',
    'app/init',
    'app/util',
    'morris'
], function($, Init, Util, Morris) {
    'use strict';

    let config = {
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

    let cache = {
        systemKillsGraphData: {} // data for system kills info graph
    };

    /**
     * get label element with given content
     * @param text
     * @returns {*|XMLList}
     */
    let getLabel = function(text, options){
        let label = $('<span>', {
            class: ['label', options.type, options.align].join(' ')
        }).text( text );

        return label;
    };


    let showKillmails = function(moduleElement, killboardData){

        // show number of killMails
        let killMailCounterMax = 20;
        let killMailCounter = 0;

        // change order (show right to left)
        killboardData.tableData.reverse();

        for(let i = 0; i < killboardData.tableData.length; i++){

            // check if killMails exist in this hour
            if(killboardData.tableData[i].killmails){

                if(killMailCounter >= killMailCounterMax){
                    break;
                }

                moduleElement.append( $('<h5>').text(i + 'h ago'));

                let killMailData = killboardData.tableData[i].killmails;

                let listeElement = $('<ul>', {
                    class: ['media-list', config.systemKillboardListClass].join(' ')
                });

                for(let j = 0; j < killMailData.length; j++){
                    killMailCounter++;
                    if(killMailCounter >= killMailCounterMax){
                        break;
                    }

                    let killData = killMailData[j];

                    let linkUrl = '//zkillboard.com/kill/' + killData.killmail_id + '/';
                    let victimImageUrl = Init.url.ccpImageServer + 'Type/' + killData.victim.ship_type_id + '_64.png';
                    let killDate = getDateObjectByTimeString(killData.killmail_time);
                    let killDateString = Util.convertDateToString(killDate);
                    let killLossValue = Util.formatPrice( killData.zkb.totalValue );

                    // check for ally
                    let victimAllyLogoUrl = '';
                    let displayAlly = 'none';
                    if(killData.victim.alliance_id > 0){
                        victimAllyLogoUrl = Init.url.ccpImageServer + 'Alliance/' + killData.victim.alliance_id + '_32.png';
                        displayAlly = 'block';
                    }

                    // check for corp
                    let victimCorpLogoUrl = '';
                    let displayCorp = 'none';
                    if(killData.victim.corporation_id > 0){
                        victimCorpLogoUrl = Init.url.ccpImageServer + 'Corporation/' + killData.victim.corporation_id + '_32.png';
                        displayCorp = 'inline';
                    }

                    let liElement = $('<li>', {
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

        let moduleElement = $(this);


        // headline toolbar icons
        let headlineToolbar  = $('<h5>', {
            class: 'pull-right'
        }).append(
                $('<i>', {
                    class: ['fa', 'fa-fw', 'fa-external-link ', config.systemModuleHeadlineIcon].join(' '),
                    title: 'zkillboard.com'
                }).on('click', function(e){
                    window.open(
                        '//zkillboard.com/system/' + systemData.systemId,
                        '_blank'
                    );
                }).attr('data-toggle', 'tooltip')
            );

        moduleElement.append(headlineToolbar);

        // headline
        let headline = $('<h5>', {
            text: 'Killboard'
        });

        moduleElement.append(headline);

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

            let url = Init.url.zKillboard;
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
                    killmailData.victim.characterName = getPlayerNameByID(killmailData.victim.character_id);
                    killmailData.victim.corporationName = getCorpNameByID(killmailData.victim.corporation_id);
                    killmailData.victim.allianceName = getAllianceNameByID(killmailData.victim.alliance_id);
                    
                    let killDate = getDateObjectByTimeString(killmailData.killmail_time);

                    // get time diff
                    let timeDiffMin = Math.round(( serverDate - killDate ) / 1000 / 60);
                    let timeDiffHour = Math.round(timeDiffMin / 60);

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
    let minifyKillboardGraphElement = function(killboardGraphElement){
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
    let getDateObjectByTimeString = function(timeString){
        let match = timeString.match(/^(\d+)-(\d+)-(\d+) (\d+)\:(\d+)\:(\d+)$/);
        let date = new Date(match[1], match[2] - 1, match[3], match[4], match[5], match[6]);

        return date;
    };
    
    /**
     * Get PlayerName with CCP ESI API
     * @param playerID
     * @returns {String}
     */
    let getPlayerNameByID = function(playerID){
        let playerName;
        $.ajax({
            url: '//esi.tech.ccp.is/latest/characters/' + playerID + '/?datasource=tranquility',
            type: "POST",
            async: false, // Mode synchrone
            dataType: "json",
            complete: function(data){
                playerName = data.responseJSON.name;
            }
        });
        return playerName;
    };
    
    /**
     * Get CorpName with CCP ESI API
     * @param corpID
     * @returns {String}
     */
    let getCorpNameByID = function(corpID){
        let corpName;
        $.ajax({
            url: '//esi.tech.ccp.is/latest/corporations/' + corpID + '/?datasource=tranquility',
            type: "POST",
            async: false, // Mode synchrone
            dataType: "json",
            complete: function(data){
                corpName = data.responseJSON.corporation_name;
            }
        });
        return corpName;
    };
    
    /**
     * Get AllianceName with CCP ESI API
     * @param allianceID
     * @returns {String}
     */
    let getAllianceNameByID = function(allianceID){
        let allianceName;
        $.ajax({
            url: '//esi.tech.ccp.is/latest/alliances/' + allianceID + '/?datasource=tranquility',
            type: "POST",
            async: false, // Mode synchrone
            dataType: "json",
            complete: function(data){
                allianceName = data.responseJSON.name;
            }
        });
        return allianceName;
    };

    /**
     * get module element
     * @param systemData
     * @returns {*|HTMLElement}
     */
    let getModule = function(parentElement, systemData){

        // create new module container
        let moduleElement = $('<div>', {
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

        let parentElement = $(this);

        // show route module
        let showModule = function(moduleElement){
            if(moduleElement){
                moduleElement.velocity('transition.slideDownIn', {
                    duration: Init.animationSpeed.mapModule,
                    delay: Init.animationSpeed.mapModule
                });
            }
        };

        // check if module already exists
        let moduleElement = parentElement.find('.' + config.systemKillboardModuleClass);

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
