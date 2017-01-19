/**
 *  activity stats dialog
 */


define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'bootbox'
], function($, Init, Util, Render, bootbox, MapUtil) {
    'use strict';

    let config = {
        // dialog
        statsDialogId: 'pf-stats-dialog',                                       // id for "stats" dialog
        dialogNavigationClass: 'pf-dialog-navigation-list',                     // class for dialog navigation bar
        dialogNavigationListItemClass: 'pf-dialog-navigation-list-item',        // class for map manual li main navigation elements

        dialogNavigationOffsetClass : 'pf-dialog-navigation-offset',            // class for "current" offset filter
        dialogNavigationPrevClass : 'pf-dialog-navigation-prev',                // class for "prev" period load
        dialogNavigationNextClass : 'pf-dialog-navigation-next',                // class for "next" period load

        // stats/dataTable
        statsContainerId: 'pf-stats-dialog-container',                          // class for statistics container (dynamic ajax content)
        statsTableId: 'pf-stats-table',                                         // id for statistics table element
        tableImageCellClass: 'pf-table-image-cell',                             // class for table "image" cells

        // charts
        statsLineChartClass: 'pf-line-chart'                                    // class for inline chart elements
    };

    /**
     * init blank statistics dataTable
     * @param dialogElement
     */
    let initStatsTable = function(dialogElement){
        let columnNumberWidth = 35;
        let lineColor = '#477372';

        // render function for inline-chart columns
        let renderInlineChartColumn = function(data, type, row, meta){
            /*
             switch(data.type){
             case 'C': lineColor = '#5cb85c'; break;
             case 'U': lineColor = '#e28a0d'; break;
             case 'D': lineColor = '#a52521'; break;
             }*/

            if( /^\d+$/.test(data.data) ){
                // single digit (e.g. single week filter)
                return data.data;
            }else{
                // period -> prepare line chart
                return '<span class="' + config.statsLineChartClass + '" data-peity=\'{ "stroke": "' + lineColor + '" }\'>' + data.data + '</span>';
            }
        };

        // render function for numeric columns
        let renderNumericColumn = function(data, type, row, meta){
            return data.toLocaleString();
        };

        // get table element
        // Due to "complex" table headers, they are already rendered and part of the stats.html file
        let table = dialogElement.find('#' + config.statsTableId);

        let  statsTable = table.DataTable({
            pageLength: 30,
            lengthMenu: [[10, 20, 30, 50], [10, 20, 30, 50]],
            paging: true,
            ordering: true,
            order: [ 16, 'desc' ],
            info: true,
            searching: true,
            hover: false,
            autoWidth: false,
            language: {
                emptyTable:  'No statistics found',
                zeroRecords: 'No characters found',
                lengthMenu:  'Show _MENU_ characters',
                info:        'Showing _START_ to _END_ of _TOTAL_ characters'
            },
            columnDefs: [
                {
                    targets: 0,
                    title: '<i class="fa fa-hashtag"></i>',
                    orderable: false,
                    searchable: false,
                    width: 10,
                    class: 'text-right',
                    data: 'character.id'
                },{
                    targets: 1,
                    title: '',
                    orderable: false,
                    searchable: false,
                    width: 26,
                    className: ['text-center', config.tableImageCellClass].join(' '),
                    data: 'character',
                    render: {
                        _: function(data, type, row, meta){
                            return '<img src="' + Init.url.ccpImageServer + 'Character/' + data.id + '_32.jpg" />';
                        }
                    }
                },{
                    targets: 2,
                    title: 'name',
                    width: 200,
                    data: 'character',
                    render: {
                        _: 'name',
                        sort: 'name'
                    }
                },{
                    targets: 3,
                    title: 'last login',
                    searchable: false,
                    width: 70,
                    className: ['text-right', 'separator-right'].join(' '),
                    data: 'character',
                    render: {
                        _: 'lastLogin',
                        sort: 'lastLogin'
                    },
                    createdCell: function(cell, cellData, rowData, rowIndex, colIndex){
                        $(cell).initTimestampCounter();
                    }
                },{
                    targets: 4,
                    title: '<span title="created" data-toggle="tooltip">C&nbsp;&nbsp;</span>',
                    orderable: false,
                    searchable: false,
                    width: columnNumberWidth,
                    className: ['text-right', 'hidden-xs', 'hidden-sm'].join(' '),
                    data: 'systemCreate',
                    render: {
                        _: renderInlineChartColumn
                    }
                },{
                    targets: 5,
                    title: '<span title="updated" data-toggle="tooltip">U&nbsp;&nbsp;</span>',
                    orderable: false,
                    searchable: false,
                    width: columnNumberWidth,
                    className: ['text-right', 'hidden-xs', 'hidden-sm'].join(' '),
                    data: 'systemUpdate',
                    render: {
                        _: renderInlineChartColumn
                    }
                },{
                    targets: 6,
                    title: '<span title="deleted" data-toggle="tooltip">D&nbsp;&nbsp;</span>',
                    orderable: false,
                    searchable: false,
                    width: columnNumberWidth,
                    className: ['text-right', 'hidden-xs', 'hidden-sm'].join(' '),
                    data: 'systemDelete',
                    render: {
                        _: renderInlineChartColumn
                    }
                },{
                    targets: 7,
                    title: 'Σ&nbsp;&nbsp;',
                    searchable: false,
                    width: 20,
                    className: ['text-right', 'separator-right'].join(' ') ,
                    data: 'systemSum',
                    render: {
                        _: renderNumericColumn
                    }
                },{
                    targets: 8,
                    title: '<span title="created" data-toggle="tooltip">C&nbsp;&nbsp;</span>',
                    orderable: false,
                    searchable: false,
                    width: columnNumberWidth,
                    className: ['text-right', 'hidden-xs', 'hidden-sm'].join(' '),
                    data: 'connectionCreate',
                    render: {
                        _: renderInlineChartColumn
                    }
                },{
                    targets: 9,
                    title: '<span title="updated" data-toggle="tooltip">U&nbsp;&nbsp;</span>',
                    orderable: false,
                    searchable: false,
                    width: columnNumberWidth,
                    className: ['text-right', 'hidden-xs', 'hidden-sm'].join(' '),
                    data: 'connectionUpdate',
                    render: {
                        _: renderInlineChartColumn
                    }
                },{
                    targets: 10,
                    title: '<span title="deleted" data-toggle="tooltip">D&nbsp;&nbsp;</span>',
                    orderable: false,
                    searchable: false,
                    width: columnNumberWidth,
                    className: ['text-right', 'hidden-xs', 'hidden-sm'].join(' '),
                    data: 'connectionDelete',
                    render: {
                        _: renderInlineChartColumn
                    }
                },{
                    targets: 11,
                    title: 'Σ&nbsp;&nbsp;',
                    searchable: false,
                    width: 20,
                    className: ['text-right', 'separator-right'].join(' '),
                    data: 'connectionSum',
                    render: {
                        _: renderNumericColumn
                    }
                },{
                    targets: 12,
                    title: '<span title="created" data-toggle="tooltip">C&nbsp;&nbsp;</span>',
                    orderable: false,
                    searchable: false,
                    width: columnNumberWidth,
                    className: ['text-right', 'hidden-xs', 'hidden-sm'].join(' '),
                    data: 'signatureCreate',
                    render: {
                        _: renderInlineChartColumn
                    }
                },{
                    targets: 13,
                    title: '<span title="updated" data-toggle="tooltip">U&nbsp;&nbsp;</span>',
                    orderable: false,
                    searchable: false,
                    width: columnNumberWidth,
                    className: ['text-right', 'hidden-xs', 'hidden-sm'].join(' '),
                    data: 'signatureUpdate',
                    render: {
                        _: renderInlineChartColumn
                    }
                },{
                    targets: 14,
                    title: '<span title="deleted" data-toggle="tooltip">D&nbsp;&nbsp;</span>',
                    orderable: false,
                    searchable: false,
                    width: columnNumberWidth,
                    className: ['text-right', 'hidden-xs', 'hidden-sm'].join(' '),
                    data: 'signatureDelete',
                    render: {
                        _: renderInlineChartColumn
                    }
                },{
                    targets: 15,
                    title: 'Σ&nbsp;&nbsp;',
                    searchable: false,
                    width: 20,
                    className: ['text-right', 'separator-right'].join(' '),
                    data: 'signatureSum',
                    render: {
                        _: renderNumericColumn
                    }
                },{
                    targets: 16,
                    title: 'Σ&nbsp;&nbsp;',
                    searchable: false,
                    width: 20,
                    className: 'text-right',
                    data: 'totalSum',
                    render: {
                        _: renderNumericColumn
                    }
                }
            ],
            initComplete: function(settings){
                let tableApi = this.api();

                // initial statistics data request
                let requestData = getRequestDataFromTabPanels(dialogElement);
                getStatsData(requestData, {tableApi: tableApi, callback: drawStatsTable});
            },
            drawCallback: function(settings){
                this.api().rows().nodes().to$().each(function(i, row){
                    $(row).find('.' + config.statsLineChartClass).peity('line', {
                        fill: 'transparent',
                        height: 18,
                        min: 0,
                        width: 50
                    });
                });
            },
            footerCallback: function ( row, data, start, end, display ) {
                let api = this.api();
                let sumColumnIndexes = [7, 11, 15, 16];

                // column data for "sum" columns over this page
                let pageTotalColumns = api
                    .columns( sumColumnIndexes, { page: 'current'} )
                    .data();

                // sum columns for "total" sum
                pageTotalColumns.each(function(colData, index){
                    pageTotalColumns[index] = colData.reduce(function(a, b){
                        return a + b;
                    }, 0);
                });

                $(sumColumnIndexes).each(function(index, value){
                    $( api.column( value ).footer() ).text( renderNumericColumn(pageTotalColumns[index]) );
                });
            },
            data: [] // will be added dynamic
        });

        statsTable.on('order.dt search.dt', function(){
            statsTable.column(0, {search:'applied', order:'applied'}).nodes().each(function(cell, i){
                $(cell).html( (i + 1) + '.&nbsp;&nbsp;');
            });
        }).draw();

        let tooltipElements = dialogElement.find('[data-toggle="tooltip"]');
        tooltipElements.tooltip();
    };

    /**
     * request raw statistics data and execute callback
     * @param requestData
     * @param context
     */
    let getStatsData = function(requestData, context){

        context.dynamicArea = $('#' + config.statsContainerId + ' .pf-dynamic-area');
        context.dynamicArea.showLoadingAnimation();

        $.ajax({
            type: 'POST',
            url: Init.path.getStatisticsData,
            data: requestData,
            dataType: 'json',
            context: context
        }).done(function(data){
            this.dynamicArea.hideLoadingAnimation();

            this.callback(data);
        }).fail(function( jqXHR, status, error) {
            let reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': loadStatistics', text: reason, type: 'warning'});
        });
    };

    /**
     * update dataTable with response data
     * update "header"/"filter" elements in dialog
     * @param responseData
     */
    let drawStatsTable = function(responseData){
        let dialogElement = $('#' + config.statsDialogId);

        // update filter/header -----------------------------------------------------------------------------
        let navigationListElements = $('.' + config.dialogNavigationClass);
        navigationListElements.find('a[data-type="typeId"][data-value="' + responseData.typeId + '"]').tab('show');
        navigationListElements.find('a[data-type="period"][data-value="' + responseData.period + '"]').tab('show');

        // update period pagination -------------------------------------------------------------------------
        let prevButton = dialogElement.find('.' + config.dialogNavigationPrevClass);
        prevButton.data('newOffset', responseData.prev);
        prevButton.find('span').text('Week ' + responseData.prev.week + ', ' + responseData.prev.year);
        prevButton.css('visibility', 'visible');

        let nextButton = dialogElement.find('.' + config.dialogNavigationNextClass);
        if(responseData.next){
            nextButton.data('newOffset', responseData.next);
            nextButton.find('span').text('Week ' + responseData.next.week + ', ' + responseData.next.year);
            nextButton.css('visibility', 'visible');
        }else{
            nextButton.css('visibility', 'hidden');
        }

        // update current period information label ----------------------------------------------------------
        // if period == "weekly" there is no "offset" -> just a single week
        let offsetText = 'Week ' + responseData.start.week + ', ' + responseData.start.year;
        if(responseData.period !== 'weekly'){
            offsetText += ' <small><i class="fa fa-fw fa-minus"></i></small> ' +
                            'Week ' + responseData.offset.week + ', ' + responseData.offset.year;
        }
        dialogElement.find('.' + config.dialogNavigationOffsetClass)
            .data('start', responseData.start)
            .data('period', responseData.period)
            .html(offsetText);

        // clear and (re)-fill table ------------------------------------------------------------------------
        let formattedData = formatStatisticsData(responseData);
        this.tableApi.clear();
        this.tableApi.rows.add(formattedData).draw();
    };

    /**
     * format statistics data for dataTable
     * -> e.g. format inline-chart data
     * @param statsData
     * @returns {Array}
     */
    let formatStatisticsData = function(statsData){
        let formattedData = [];
        let yearStart = statsData.start.year;
        let weekStart = statsData.start.week;
        let weekCount = statsData.weekCount;
        let yearWeeks = statsData.yearWeeks;

        let tempRand = function(min, max){
            return Math.random() * (max - min) + min;
        };

        // format/sum week statistics data for inline charts
        let formatWeekData = function(weeksData){
            let currentYear = yearStart;
            let currentWeek = weekStart;

            let formattedWeeksData = {
                systemCreate: [],
                systemUpdate: [],
                systemDelete: [],
                connectionCreate: [],
                connectionUpdate: [],
                connectionDelete: [],
                signatureCreate: [],
                signatureUpdate: [],
                signatureDelete: [],
                systemSum: 0,
                connectionSum: 0,
                signatureSum: 0
            };

            for(let i = 0; i < weekCount; i++){
                let yearWeekProp = currentYear + '' + currentWeek;

                if(weeksData.hasOwnProperty( yearWeekProp )){
                    let weekData = weeksData[ yearWeekProp ];

                    // system -------------------------------------------------------------------------------
                    formattedWeeksData.systemCreate.push( weekData.systemCreate );
                    formattedWeeksData.systemSum += parseInt( weekData.systemCreate );

                    formattedWeeksData.systemUpdate.push( weekData.systemUpdate );
                    formattedWeeksData.systemSum += parseInt( weekData.systemUpdate );

                    formattedWeeksData.systemDelete.push( weekData.systemDelete );
                    formattedWeeksData.systemSum += parseInt( weekData.systemDelete );

                    // connection ---------------------------------------------------------------------------
                    formattedWeeksData.connectionCreate.push( weekData.connectionCreate );
                    formattedWeeksData.connectionSum += parseInt( weekData.connectionCreate );

                    formattedWeeksData.connectionUpdate.push( weekData.connectionUpdate );
                    formattedWeeksData.connectionSum += parseInt( weekData.connectionUpdate );

                    formattedWeeksData.connectionDelete.push( weekData.connectionDelete );
                    formattedWeeksData.connectionSum += parseInt( weekData.connectionDelete );

                    // signature ----------------------------------------------------------------------------
                    formattedWeeksData.signatureCreate.push( weekData.signatureCreate );
                    formattedWeeksData.signatureSum += parseInt( weekData.signatureCreate );

                    formattedWeeksData.signatureUpdate.push( weekData.signatureUpdate );
                    formattedWeeksData.signatureSum += parseInt( weekData.signatureUpdate );

                    formattedWeeksData.signatureDelete.push( weekData.signatureDelete );
                    formattedWeeksData.signatureSum += parseInt( weekData.signatureDelete );
                }else{
                    // system -------------------------------------------------------------------------------
                    formattedWeeksData.systemCreate.push(0);
                    formattedWeeksData.systemUpdate.push(0);
                    formattedWeeksData.systemDelete.push(0);

                    // connection ---------------------------------------------------------------------------
                    formattedWeeksData.connectionCreate.push(0);
                    formattedWeeksData.connectionUpdate.push(0);
                    formattedWeeksData.connectionDelete.push(0);

                    // signature ----------------------------------------------------------------------------
                    formattedWeeksData.signatureCreate.push(0);
                    formattedWeeksData.signatureUpdate.push(0);
                    formattedWeeksData.signatureDelete.push(0);
                }

                currentWeek++;

                if( currentWeek > yearWeeks[currentYear] ){
                    currentWeek = 1;
                    currentYear++;
                }
            }

            // system ---------------------------------------------------------------------------------------
            formattedWeeksData.systemCreate = formattedWeeksData.systemCreate.join(',');
            formattedWeeksData.systemUpdate = formattedWeeksData.systemUpdate.join(',');
            formattedWeeksData.systemDelete = formattedWeeksData.systemDelete.join(',');

            // connection -----------------------------------------------------------------------------------
            formattedWeeksData.connectionCreate = formattedWeeksData.connectionCreate.join(',');
            formattedWeeksData.connectionUpdate = formattedWeeksData.connectionUpdate.join(',');
            formattedWeeksData.connectionDelete = formattedWeeksData.connectionDelete.join(',');

            // signature ------------------------------------------------------------------------------------
            formattedWeeksData.signatureCreate = formattedWeeksData.signatureCreate.join(',');
            formattedWeeksData.signatureUpdate = formattedWeeksData.signatureUpdate.join(',');
            formattedWeeksData.signatureDelete = formattedWeeksData.signatureDelete.join(',');

            return formattedWeeksData;
        };

        $.each(statsData.statistics, function(characterId, data){

            let formattedWeeksData = formatWeekData(data.weeks);

            let rowData = {
                character: {
                    id: characterId,
                    name: data.name,
                    lastLogin: data.lastLogin
                },
                systemCreate: {
                    type: 'C',
                    data: formattedWeeksData.systemCreate
                },
                systemUpdate: {
                    type: 'U',
                    data: formattedWeeksData.systemUpdate
                },
                systemDelete: {
                    type: 'D',
                    data: formattedWeeksData.systemDelete
                },
                systemSum: formattedWeeksData.systemSum,
                connectionCreate: {
                    type: 'C',
                    data: formattedWeeksData.connectionCreate
                },
                connectionUpdate: {
                    type: 'U',
                    data: formattedWeeksData.connectionUpdate
                },
                connectionDelete: {
                    type: 'D',
                    data: formattedWeeksData.connectionDelete
                },
                connectionSum: formattedWeeksData.connectionSum,
                signatureCreate: {
                    type: 'C',
                    data: formattedWeeksData.signatureCreate
                },
                signatureUpdate: {
                    type: 'U',
                    data: formattedWeeksData.signatureUpdate
                },
                signatureDelete: {
                    type: 'D',
                    data: formattedWeeksData.signatureDelete
                },
                signatureSum: formattedWeeksData.signatureSum,
                totalSum: formattedWeeksData.systemSum + formattedWeeksData.connectionSum + formattedWeeksData.signatureSum
            };

            formattedData.push(rowData);
        });

        return formattedData;
    };

    /**
     *
     * @param dialogElement
     * @returns {{}}
     */
    let getRequestDataFromTabPanels = function(dialogElement){
        let requestData = {};

        // get data from "tab" panel links ------------------------------------------------------------------
        let navigationListElements = dialogElement.find('.' + config.dialogNavigationClass);
        navigationListElements.find('.' + config.dialogNavigationListItemClass + '.active a').each(function(){
            let linkElement = $(this);
            requestData[linkElement.data('type')]= linkElement.data('value');
        });

        // get current period (no offset) data (if available) -----------------------------------------------
        let navigationOffsetElement = dialogElement.find('.' + config.dialogNavigationOffsetClass);
        let startData = navigationOffsetElement.data('start');
        let periodOld = navigationOffsetElement.data('period');

        // if period switch was detected
        // -> "year" and "week" should not be send
        // -> start from "now"
        if(
            requestData.period === periodOld &&
            startData
        ){
            requestData.year = startData.year;
            requestData.week = startData.week;
        }

        return requestData;
    };

    /**
     * check if "activity log" type is enabled for a group
     * @param type
     * @returns {boolean}
     */
    let isTabTypeEnabled = function(type){
        let enabled = false;

        switch(type){
            case 'private':
                if(Init.mapTypes.private.defaultConfig.activity_logging){
                    enabled = true;
                }
                break;
            case 'corporation':
                if(
                    Init.mapTypes.corporation.defaultConfig.activity_logging &&
                    Util.getCurrentUserInfo('corporationId')
                ){
                    enabled = true;
                }
                break;
            case 'alliance':
                if(
                    Init.mapTypes.alliance.defaultConfig.activity_logging &&
                    Util.getCurrentUserInfo('allianceId')
                ){
                    enabled = true;
                }
                break;
        }

        return enabled;
    };

    /**
     * show activity stats dialog
     */
    $.fn.showStatsDialog = function(){
        requirejs(['text!templates/dialog/stats.html', 'mustache', 'peityInlineChart'], function(template, Mustache) {

            let data = {
                id: config.statsDialogId,
                dialogNavigationClass: config.dialogNavigationClass,
                dialogNavLiClass: config.dialogNavigationListItemClass,
                enablePrivateTab: isTabTypeEnabled('private'),
                enableCorporationTab: isTabTypeEnabled('corporation'),
                enableAllianceTab: isTabTypeEnabled('alliance'),
                statsContainerId: config.statsContainerId,
                statsTableId: config.statsTableId,
                dialogNavigationOffsetClass: config.dialogNavigationOffsetClass,
                dialogNavigationPrevClass: config.dialogNavigationPrevClass,
                dialogNavigationNextClass: config.dialogNavigationNextClass
            };

            let content = Mustache.render(template, data);

            let statsDialog = bootbox.dialog({
                title: 'Statistics',
                message: content,
                size: 'large',
                show: false,
                buttons: {
                    close: {
                        label: 'close',
                        className: 'btn-default'
                    }
                }
            });

            // model events
            statsDialog.on('show.bs.modal', function(e) {
                let dialogElement = $(e.target);

                initStatsTable(dialogElement);
            });

            // Tab module events
            statsDialog.find('a[data-toggle="tab"]').on('show.bs.tab', function (e, b, c) {
                if( $(e.target).parent().hasClass('disabled') ){
                    // no action on "disabled" tabs
                    return false;
                }
            });

            statsDialog.find('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                let requestData = getRequestDataFromTabPanels(statsDialog);
                let tableApi = statsDialog.find('#' + config.statsTableId).DataTable();

                getStatsData(requestData, {tableApi: tableApi, callback: drawStatsTable});
            });

            // offset change links
            statsDialog.find('.' + config.dialogNavigationPrevClass + ', .' + config.dialogNavigationNextClass).on('click', function(){
                let offsetData = $(this).data('newOffset');
                if(offsetData){
                    // this should NEVER fail!
                    // get "base" request data (e.g. typeId, period)
                    // --> overwrite period data with new period data
                    let tmpRequestData = getRequestDataFromTabPanels(statsDialog);
                    let requestData =  $.extend({}, tmpRequestData, offsetData);
                    let tableApi = statsDialog.find('#' + config.statsTableId).DataTable();

                    getStatsData(requestData, {tableApi: tableApi, callback: drawStatsTable});
                }
            });

            // show dialog
            statsDialog.modal('show');
        });
    };
});