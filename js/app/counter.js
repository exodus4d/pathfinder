define([
    'jquery',
    'app/init',
    'app/util'
], ($, Init, Util) => {
    'use strict';

    let config = {
      counterDigitSmallClass: 'pf-digit-counter-small',
      counterDigitLargeClass: 'pf-digit-counter-large'
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
    $.fn.destroyTimestampCounter = function(recursive){
        return this.each(function(){
            let element = $(this);
            let counterSelector = '[data-counter="init"]';
            let counterElements = element.filter(counterSelector);
            if(recursive){
                counterElements = counterElements.add(element.find(counterSelector));
            }

            counterElements.each(function(){
                let element = $(this);
                let interval = element.data('interval');
                if(interval){
                    clearInterval(interval);
                    element.removeAttr('data-counter').removeData('interval').removeClass('stopCounter');
                }
            });
        });
    };

    /**
     * init a live counter based on a unix timestamp
     * @param round string e.g. 'd' => round days
     */
    $.fn.initTimestampCounter = function(round){
        return this.each(function(){
            let element = $(this);
            let timestamp = parseInt( element.text() );

            // do not init twice
            if(timestamp > 0){
                // mark as init
                element.attr('data-counter', 'init');

                let date = new Date( timestamp * 1000);

                updateDateDiff(element, date, round);

                // show element (if invisible) after first update
                element.css({'visibility': 'initial'});

                // calc ms until next second
                // -> makes sure all counter update in sync no matter when init
                let msUntilSecond = 1500 - new Date().getMilliseconds();
                setTimeout(function(){
                    let refreshIntervalId = window.setInterval(function(){

                        // update element with current time
                        if( !element.hasClass('stopCounter')){
                            updateDateDiff(element, date, round);
                        }else{
                            clearInterval( element.data('interval') );
                        }
                    }, 500);

                    element.data('interval', refreshIntervalId);
                }, msUntilSecond);
            }
        });
    };

    /**
     * init global timestamp counter or DataTable for specific columns
     * @param tableElement
     * @param columnSelector
     * @param round
     */
    let initTableCounter = (tableElement, columnSelector, round) => {
        let tableApi = tableElement.api();

        // mark as init
        tableElement.attr('data-counter', 'init');
        let refreshIntervalId = window.setInterval(() => {
            tableApi.cells(null, columnSelector).every(function(rowIndex, colIndex, tableLoopCount, cellLoopCount){
                let cell = this;
                let node = cell.node();
                let data = cell.data();
                if(data && Number.isInteger(data) && !node.classList.contains('stopCounter')){
                    // timestamp expected int > 0
                    let date = new Date(data * 1000);
                    updateDateDiff( cell.nodes().to$(), date, round);
                }
            });
        }, 500);

        tableElement.data('interval', refreshIntervalId);
    };

    return {
        updateDateDiff: updateDateDiff,
        initTableCounter: initTableCounter
    };
});
