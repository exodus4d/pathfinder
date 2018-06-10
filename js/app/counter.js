define([
    'jquery',
    'app/init',
    'app/util'
], function($, Init, Util) {
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
    let updateDateDiff = function(element, tempDate, round){
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
    $.fn.destroyTimestampCounter = function(){
        return this.each(function(){
            let parentElement = $(this);
            parentElement.find('[data-counter="init"]').each(function(){
                let element = $(this);
                let interval = element.data('interval');
                if(interval){
                    clearInterval(interval);
                    element.removeAttr('data-counter')
                        .removeData('interval')
                        .removeClass('stopCounter');
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

                let refreshIntervalId = window.setInterval(function(){

                    // update element with current time
                    if( !element.hasClass('stopCounter')){
                        updateDateDiff(element, date, round);
                    }else{
                        clearInterval( element.data('interval') );
                    }
                }, 500);

                element.data('interval', refreshIntervalId);
            }
        });
    };
});
