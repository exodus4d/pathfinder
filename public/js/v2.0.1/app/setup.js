/**
 * Main setupPage application
 */

define([
    'jquery',
    'app/init',
    'app/util',
    'app/render',
    'app/map/worker',
    'peityInlineChart',
], ($, Init, Util, Render, MapWorker) => {
    'use strict';

    let config = {
        splashOverlayClass: 'pf-splash',                                // class for "splash" overlay

        // navigation
        navigationElementId: 'pf-navbar',                               // id for navbar element

        // sticky panel
        stickyPanelClass: 'pf-landing-sticky-panel',                    // class for sticky panels

        hiddenByAttributeClass: 'pf-hidden-by-attr',                    // class for elements that are hidden/shown by [data-attr] value
        shownByAttributeClass: 'pf-shown-by-attr',                      // class for elements that are hidden/shown by [data-attr] value

        webSocketSectionId: 'pf-setup-socket',                          // id for webSocket section
        webSocketStatsId: 'pf-setup-webSocket-stats',                   // id for webSocket "stats" panel
        webSocketRefreshStatsId: 'pf-setup-webSocket-stats-refresh',    // class for "reload stats" button

        cronRowActiveClass: 'pf-cron-row-active',                       // class for "active" (e.g. "inProgress") table row

        jsonPopoverClass: 'pf-json-popover',                            // class for "json" popover elements
        barChartClass: 'pf-bar-chart',                                  // class for "bar" chart elements
        lineChartClass: 'pf-line-chart'                                 // class for "line" chart elements
    };

    /**
     * send ajax request for index build
     * @param url
     * @param requestData
     * @param context
     * @param callback
     */
    let sendRequest = (url, requestData, context, callback) => {
        if(requestData.count === 0){
            // first iteration
            context.target.button('loading');
        }

        $.ajax({
            url: url,
            type: 'POST',
            dataType: 'json',
            data: requestData,
            context: context
        }).done(function(data){
            callback(this, data);
        }).fail(function(jqXHR, status, error){
            let reason = status + ' ' + error;
            Util.showNotify({title: jqXHR.status + ': Failed. Please retry', text: reason, type: 'warning'});
            this.target.button('reset');
        });
    };

    /**
     *
     * @param container
     * @param selector
     */
    let setCollapseObserver = (container, selector) => {
        container.find(selector).css({cursor: 'pointer'});
        container.on('click', selector, function(){
            $(this).find('.pf-animate-rotate').toggleClass('right');
        });
    };

    /**
     * set page observer
     */
    let setPageObserver = () => {
        let body = $('body');

        // navigation (scroll) ----------------------------------------------------------------------------------------
        Util.initScrollSpy(document.getElementById(config.navigationElementId), document, {
            offset: 300
        });

        // collapse ---------------------------------------------------------------------------------------------------
        setCollapseObserver(body, '[data-toggle="collapse"]');

        // panel actions ----------------------------------------------------------------------------------------------
        let collapsedState = false;
        $('.' + config.stickyPanelClass + ' a[data-panel-action="collapse-all"]').on('click', function(e){
           e.preventDefault();
            $('.row.collapse').collapse(collapsedState ? 'show' : 'hide');
            collapsedState = !collapsedState;
        });

        // buttons ----------------------------------------------------------------------------------------------------
        // exclude "download" && "navigation" buttons
        body.find('.btn')
            .not('[data-action]')
            .not('[href^="?export"]')
            .on('click', function(){
                $('.' + config.splashOverlayClass).showSplashOverlay();
            });

        // build/clear index buttons ----------------------------------------------------------------------------------
        // clear index buttons ----------------------------------------------------------------------------------------
        body.on('click', '.btn[data-action]', function(e){
            e.preventDefault();
            e.stopPropagation();
            let element = $(this);
            let url = '/api/Setup/' + element.attr('data-action');
            let payload = element.attr('data-payload');
            let callStartName = element.attr('data-callstart');
            let callBackName = element.attr('data-callback');
            let callBack = config[callBackName] instanceof Function ? config[callBackName] : () => {
                console.warn('Invalid callback function name: %s', callBackName);
            };

            let requestData = {};
            try{
                requestData = Object.assign({}, requestData, JSON.parse(payload));
            }catch(error){
                console.error('Failed to parse button payload: %s ', payload);
            }

            let context = {
                target: element,
                url: url
            };

            if(config[callStartName] instanceof Function){
                config[callStartName](context);
            }

            sendRequest(url, requestData, context, callBack);
        });

        // bar charts (e.g. cronjob table) ----------------------------------------------------------------------------
        initBarCharts($('.' + config.barChartClass));

        // Json popovers ----------------------------------------------------------------------------------------------
        body.on('mouseenter', '.' + config.jsonPopoverClass, function(e){
            let element = $(this);
            if(!element.data('bs.popover')){
                let json = element.data('json');
                let jsonHighlighted = Render.highlightJson(json);
                let content = '<pre><code>' + jsonHighlighted + '</code></pre>';

                element.popover({
                    placement: 'left',
                    html: true,
                    trigger: 'hover',
                    content: content,
                    container: 'body',
                    title: 'Last exec. state',
                    delay: {
                        show: 180,
                        hide: 0
                    }
                });

                element.popover('show');
            }
        });

        // tooltips ---------------------------------------------------------------------------------------------------
        body.initTooltips({container: 'body'});

        body.on('show.bs.tooltip', e => {
            let element = $(e.target);
            let level = element.attr('data-level');
            if(level && level.length){
                element.data('bs.tooltip').$tip.find('.tooltip-inner').addClass('txt-color txt-color-' + level);
            }
        });

        // change url (remove logout parameter)
        if(history.pushState){
            history.pushState({}, '', location.protocol + '//' + location.host + location.pathname);
        }
    };

    /**
     * init "Peity" charts
     * @param elements
     * @param options
     */
    let initBarCharts = (elements, options = {}) => {
        let barDangerColor = '#a52521';
        let barWarningColor = '#e28a0d';
        let barDefaultColor = '#568a89';

        // defaultOptions for bar AND line charts
        let defaultOptions = {
            fill: function(val, i, all){
                if(val <= 0){
                    return barDangerColor;
                }else{
                    // fade out older bars
                    let opacity = i / all.length;
                    // limit opacity to min 0.3
                    opacity = Math.max(opacity, 0.3);
                    let alphaHex = Math.round(opacity * 255).toString(16);

                    // set color based on average difference
                    let avg = this.$el.data('avg') || 0;
                    let avgBuffer = this.$el.data('avg-buffer') || 0;
                    let barColor = (val > avg + avgBuffer ) ? barWarningColor : barDefaultColor;

                    return barColor + (alphaHex.length === 1 ? '0' : '') + alphaHex;
                }
            },
            height: 18,
            min: -1,
            //max: 2
            //width: '100%'
            width: '65px'
        };

        elements.peity('bar', Object.assign({}, defaultOptions, {
            padding: 0.1    // bar chart specific
        }, options));
    };

    /**
     * @param container
     */
    let updateStatusBar = container => {
        let statusConfig = ['information', 'hint', 'warning', 'danger', 'success'].map(
            type => ({
                type: type,
                target: container.find('.' + config.hiddenByAttributeClass + ', .' + config.shownByAttributeClass)
                    .filter('[data-attr-type="' + type + '"]'),
                count: container.find('[data-type="' + type + '"]').length
            })
        );

        // show/hide target elements by CSS by attribute update
        let typesCheckForSuccess = ['warning', 'danger'];
        let checkCount = 0;
        for(let config of statusConfig){
            // "success" type depends on empty count for checked types
            if(typesCheckForSuccess.includes(config.type)){
                checkCount += config.count;
            }

            let count = config.type === 'success' ? checkCount : config.count;

            config.target.attr('data-attr', count || '');
        }
    };

    /**
     * update cronJob table row
     * @type {updateCronjob}
     */
    let updateCronjob = config.updateCronjob = (context, responseData) => {
        context.target.button('reset');

        let jobsData = Util.getObjVal(responseData, 'jobsData') || {};
        let html = Util.getObjVal(responseData, 'html');
        let jobsCount = Object.keys(jobsData).length;

        if(jobsCount && html){
            // replace full table tbody or just a single row
            let elPanel = context.target.closest('.panel');
            let elOld;
            let elNew;
            if(jobsCount === 1){
                // replace single: <tr>
                elOld = context.target.closest('tr');
                elNew = $(html);
            }else{
                // replace all: <tbody>
                elOld = context.target.closest('table').find('tbody');
                elNew = $('<tbody>' + html + '</tbody>');
            }

            if(elOld && elNew){
                elOld.destroyTooltips(true);
                elOld.replaceWith(elNew);
                elNew.initTooltips({container: 'body'});
                initBarCharts(elNew.find('.' + config.barChartClass));
                updateStatusBar(elPanel);
            }
        }
    };

    /**
     * mark cronJob table row + status icons as "inProgress"
     * @type {startCronjob}
     */
    let startCronjob = config.startCronjob = context => {
        let row = context.target.closest('tr');
        let statusCell = row.children().first().children().first();

        // change row to "inProgress"
        row.addClass(config.cronRowActiveClass);

        // change status icons to "inProgress"
        let mapAttr = path => '[data-name="' + path + '"]';
        let removeStatusNames = ['notExecuted', 'notFinished', 'onHold'];
        statusCell.find(removeStatusNames.map(mapAttr).join(', ')).remove();

        let addStatusName = 'inProgress';
        let addStatusType = 'success';
        if(!statusCell.find([addStatusName].map(mapAttr).join(', ')).length){
            statusCell.append(
                $('<i>', {
                    class: 'fas fa-fw fa-play pf-help txt-color txt-color-success'
                })
                    .attr('title', 'Started. In execution…')
                    .attr('data-name', addStatusName)
                    .attr('data-type', addStatusType)
            ).initTooltips({container: 'body'});
        }
    };

    /**
     * update data count label for "indexed data"
     * @param context
     * @param responseData
     */
    let updateIndexCount = config.updateIndexCount = (context, responseData) => {
        let countElement = context.target.closest('tr').children().eq(1).find('kbd');
        countElement.text(responseData.countBuildAll + '/' + responseData.countAll);
        countElement.removeClass('txt-color-success txt-color-danger txt-color-warning');
        if(responseData.countBuildAll >= responseData.countAll){
            countElement.addClass('txt-color-success');
        }else if(responseData.countBuildAll > 0){
            countElement.addClass('txt-color-warning');
        }else{
            countElement.addClass('txt-color-danger');
        }

        // update 'subCount' element (shows e.g. invType count)
        if(responseData.subCount){
            let subCountElement = context.target.closest('tr').children().eq(2).find('kbd');
            subCountElement.text(responseData.subCount.countBuildAll + '/' + subCountElement.attr('data-countall'));
        }

        context.target.find('.btn-progress').html('&nbsp;&nbsp;' + responseData.progress + '%').css('width', responseData.progress + '%');

        // send next chunk of rows -> import only
        if(
            context.target.attr('data-action') === 'buildIndex' &&
            responseData.countBuildAll < responseData.countAll
        ){
            sendRequest(context.url, {
                type: responseData.type,
                countAll: responseData.countAll,
                count: responseData.count,
                offset: responseData.offset
            }, {
                target: context.target,
                url: context.url
            }, updateIndexCount);
        }else{
            context.target.button('reset');
        }
    };

    /**
     * get WebSockets "subscriptions" <table> HTML
     * @param subscriptionStats
     * @returns {Promise<any>}
     */
    let getWebSocketSubscriptionTable = subscriptionStats => {

        let executor = resolve => {
            requirejs(['text!templates/modules/subscriptions_table.html', 'mustache'], (template, Mustache) => {
                let data = {
                    panelId: config.webSocketStatsId,
                    refreshButtonId: config.webSocketRefreshStatsId,
                    subStats: subscriptionStats,
                    channelCount: (Util.getObjVal(subscriptionStats, 'channels') || []).length
                };

                resolve(Mustache.render(template, data));
            });
        };

        return new Promise(executor);
    };

    /**
     * perform a basic check if Clients (browser) can connect to the webSocket server
     */
    let testWebSocket = () => {
        let tcpSocketPanel = $('#pf-setup-tcpSocket');
        let webSocketPanel = $('#pf-setup-webSocket');
        let webSocketURI = MapWorker.getWebSocketURL();
        let sslIcon = webSocketURI.startsWith('wss:') ?
            '<i class="fas fa-fw fa-lock txt-color txt-color-success"></i>' :
            '<i class="fas fa-fw fa-unlock txt-color txt-color-warning"></i>';

        webSocketPanel.showLoadingAnimation();

        let removeColorClasses = el => {
            el.removeClass(function(index, css){
                return (css.match (/\btxt-color-\S+/g) || []).join(' ');
            });
        };

        /**
         * updates the WebSocket panel with new data
         * @param data
         */
        let updateWebSocketPanel = (data) => {
            let badgeSocketWarning = $('.navbar a[data-target="pf-setup-socket"] .txt-color-warning');
            let badgeSocketDanger = $('.navbar a[data-target="pf-setup-socket"] .txt-color-danger');
            let socketWarningCount = parseInt(badgeSocketWarning.text()) || 0;
            let socketDangerCount = parseInt(badgeSocketDanger.text()) || 0;

            if(data.uri){
                let uriRow = webSocketPanel.find('.panel-body').filter(':first').find('table tr');
                uriRow.find('td:nth-child(2) kbd').html(data.uri.value);
                if(data.uri.status){
                    let statusIcon = uriRow.find('td:nth-child(3) i');
                    removeColorClasses(statusIcon);
                    statusIcon.toggleClass('fa-exclamation-triangle', false).toggleClass('fa-check', true).addClass('txt-color-success');

                    // update head badge. "Decrease" warning count, default for "URI" connection is "warn + 1"
                    socketWarningCount = Math.max(0, --socketWarningCount);
                }
            }

            if(data.status){
                let footer = webSocketPanel.find('.panel-footer h3');
                removeColorClasses(footer);
                footer.text(data.status.label).addClass(data.status.class);

                // update head badge
                switch(data.status.type){
                    case 'success':
                        socketWarningCount = 0;
                        socketDangerCount = 0;
                        break;
                    case 'warning':
                        break;
                    case 'danger':
                        socketDangerCount = 1;
                        break;
                }
            }

            badgeSocketWarning.text(socketWarningCount || '');
            badgeSocketDanger.text(socketDangerCount || '');
            // update section headline badges
            document.querySelector(`#${config.webSocketSectionId} h4 .badge-warning`).textContent = socketWarningCount || '';
            document.querySelector(`#${config.webSocketSectionId} h4 .badge-danger`).textContent = socketDangerCount || '';
        };

        // update initial
        updateWebSocketPanel({
            uri: {
                value: sslIcon + '&nbsp;' + webSocketURI,
                status: true
            },
            status: {
                type: 'warning',
                label:  'CONNECTING…',
                class: 'txt-color-warning'
            }
        });

        /**
         * @param socket
         * @param task
         * @param load
         */
        let sendMessage = (socket, task, load) => {
            socket.send(JSON.stringify({
                task: task,
                load: load
            }));
        };

        // try to connect to WebSocket server
        let socket = new WebSocket(webSocketURI);

        socket.onopen = (e) => {
            updateWebSocketPanel({
                status: {
                    type: 'warning',
                    label:  'OPEN wait for response…',
                    class: 'txt-color-warning'
                }
            });

            // sent token and check response
            sendMessage(socket, 'healthCheck', tcpSocketPanel.attr('data-token'));

            webSocketPanel.hideLoadingAnimation();
        };

        socket.onmessage = (e) => {
            let response = JSON.parse(e.data);

            if(Util.getObjVal(response, 'load.isValid') === true){
                // SUCCESS
                updateWebSocketPanel({
                    status: {
                        type: 'success',
                        label:  'CONNECTED',
                        class: 'txt-color-success'
                    }
                });

                // show subscription stats table
                getWebSocketSubscriptionTable(Util.getObjVal(response, 'load.subStats')).then(payload => {
                    // remove existing table -> then insert new
                    $('#' + config.webSocketStatsId).remove();
                    $(payload).insertAfter(webSocketPanel).initTooltips({container: 'body'});

                    let token = Util.getObjVal(response, 'load.token');
                    tcpSocketPanel.attr('data-token', token);

                    // set "reload stats" observer
                    $('#' + config.webSocketRefreshStatsId).on('click', function(){
                        $('#' + config.webSocketStatsId).showLoadingAnimation();

                        sendMessage(socket, 'healthCheck', token);
                    });
                });
            }else{
                // Got response but INVALID
                updateWebSocketPanel({
                    status: {
                        type: 'warning',
                        label:  'INVALID RESPONSE',
                        class: 'txt-color-warning'
                    }
                });
            }

        };

        socket.onerror = (e) => {
            updateWebSocketPanel({
                status: {
                    type: 'danger',
                    label:  'CONNECTION ERROR',
                    class: 'txt-color-danger'
                }
            });

            webSocketPanel.hideLoadingAnimation();
        };

        socket.onclose = (closeEvent) => {
            updateWebSocketPanel({
                status: {
                    type: 'danger',
                    label:  'CONNECTION FAILED',
                    class: 'txt-color-danger'
                }
            });

            webSocketPanel.hideLoadingAnimation();

            $('#' + config.webSocketStatsId).remove();
        };
    };

    /**
     * main init "setup" page
     */
    $(function(){

        // show app information in browser console --------------------------------------------------------------------
        Util.showVersionInfo();

        // hide splash loading animation ------------------------------------------------------------------------------
        $('.' + config.splashOverlayClass + '[data-status="ok"]').hideSplashOverlay();

        setPageObserver();

        testWebSocket();
    });
});