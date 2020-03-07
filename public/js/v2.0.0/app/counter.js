define([
    'jquery',
    'app/util',
    'app/lib/cron'
], ($, Util, Cron) => {
    'use strict';

    let config = {
        counterTaskAttr: 'data-counter-task',                                           // element attr name with initialized counter name
        counterStopClass: 'stopCounter',                                                // class for counter elements where counter should be destroyed
        counterDigitSmallClass: 'pf-digit-counter-small',                               // class for 'small' counter DOM elements (e.g. 'hour' number)
        counterDigitLargeClass: 'pf-digit-counter-large'                                // class for 'large' counter DOM elements (e.g. 'days' number)
    };

    /**
     * update element with time information
     * @param element
     * @param tempDate
     * @param round
     */
    let updateDateDiff = (element, tempDate, round) => {
        let diff = Util.getTimeDiffParts(tempDate, new Date());
        let days = diff.days;
        let hrs = diff.hours;
        let min = diff.min;
        let leftSec = diff.sec;
        let parts = [];

        if(
            round === 'd' &&
            days >= 1
        ){
            parts.push('<span class="' + config.counterDigitLargeClass + '">' + '&gt;&nbsp;1d' + '</span>');
        }else{
            if(
                days > 0 ||
                parts.length > 0
            ){
                parts.push('<span class="' + config.counterDigitLargeClass + '">' + days + 'd' + '</span>');
            }
            if(
                hrs > 0 ||
                parts.length > 0
            ){
                parts.push('<span class="' + config.counterDigitSmallClass + '">' + hrs + 'h' + '</span>');
            }
            if(
                min > 0 ||
                parts.length > 0
            ){
                parts.push('<span class="' + config.counterDigitSmallClass + '">' + min + 'm' + '</span>');
            }

            if(
                leftSec >= 0 ||
                parts.length > 0
            ){
                parts.push('<span class="' + config.counterDigitSmallClass + '">' + leftSec + 's' + '</span>');
            }
        }

        element.html(parts.join(' '));
    };

    /**
     * destroy all active counter recursive
     */
    let destroyTimestampCounter = (element, recursive) => {
        let counterTaskSelector = '[' + config.counterTaskAttr + ']';
        let counterElements = element.filter(counterTaskSelector);
        if(recursive){
            counterElements = counterElements.add(element.find(counterTaskSelector));
        }

        counterElements.each(function(){
            let element = $(this);
            let taskName = element.attr(config.counterTaskAttr);

            if(Cron.delete(taskName)){
                element.removeAttr(config.counterTaskAttr).removeClass(config.counterStopClass);
            }
        });
    };

    /**
     * init a live counter based on a unix timestamp
     * @param element
     * @param round     e.g. 'd' => round days
     * @returns {void|*|undefined}
     */
    let initTimestampCounter = (element, round) => {
        let timestamp = parseInt(element.text());
        // do not init twice
        if(timestamp > 0){
            let taskName = element.attr('id') || Util.getRandomString();
            let date = new Date( timestamp * 1000);
            updateDateDiff(element, date, round);

            // show element (if invisible) after first update
            element.css({'visibility': 'initial'});

            let counterTask = Cron.new(taskName, {precision: 'seconds', interval: 1, timeout: 100});
            counterTask.task = () => {
                if(element.hasClass(config.counterStopClass)){
                    destroyTimestampCounter(element);
                }else{
                    updateDateDiff(element, date, round);
                }
            };
            counterTask.start();

            element.attr(config.counterTaskAttr, taskName);
        }
    };

    /**
     * init global timestamp counter or DataTable for specific columns
     * @param tableElement
     * @param columnSelector
     * @param round
     */
    let initTableCounter = (tableElement, columnSelector, round) => {
        let tableApi = tableElement.api();
        let taskName = tableElement.attr('id');

        let cellUpdate = function(rowIndex, colIndex, tableLoopCount, cellLoopCount){
            let cell = this;
            let node = cell.node();
            let data = cell.data();
            if(data && Number.isInteger(data) && !node.classList.contains(config.counterStopClass)){
                // timestamp expected int > 0
                let date = new Date(data * 1000);
                updateDateDiff(cell.nodes().to$(), date, round);
            }
        };

        let counterTask = Cron.new(taskName, {precision: 'seconds', interval: 1, timeout: 100});
        counterTask.task = timer => {
            tableApi.cells(null, columnSelector).every(cellUpdate);
        };
        counterTask.start();

        tableElement.attr(config.counterTaskAttr, taskName);
    };

    return {
        config: config,
        updateDateDiff: updateDateDiff,
        initTimestampCounter: initTimestampCounter,
        initTableCounter: initTableCounter,
        destroyTimestampCounter: destroyTimestampCounter
    };
});
