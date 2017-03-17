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
     */
    let updateDateDiff = function(element, tempDate){
        let diff = Util.getTimeDiffParts(tempDate, new Date());
        let days = diff.days;
        let hrs = diff.hours;
        let min = diff.min;
        let leftSec = diff.sec;
        let value = [];

        if(
            days > 0 ||
            value.length > 0
        ){
            value.push('<span class="' + config.counterDigitLargeClass + '">' + days + 'd' + '</span>');
        }
        if(
            hrs > 0 ||
            value.length > 0
        ){
            value.push('<span class="' + config.counterDigitSmallClass + '">' + hrs + 'h' + '</span>');
        }
        if(
            min > 0 ||
            value.length > 0
        ){
            value.push('<span class="' + config.counterDigitSmallClass + '">' + min + 'm' + '</span>');
        }

        if(
            leftSec >= 0 ||
            value.length > 0
        ){
            value.push('<span class="' + config.counterDigitSmallClass + '">' + leftSec + 's' + '</span>');
        }

        element.html(value.join(' '));
    };

    /**
     * init a live counter based on a unix timestamp
     * @returns {*}
     */
    $.fn.initTimestampCounter = function(){
        return this.each(function(){
            let element = $(this);
            let timestamp = parseInt( element.text() );

            // do not init twice
            if(timestamp > 0){
                // mark as init
                element.attr('data-counter', 'init');

                let date = new Date( timestamp * 1000);

                updateDateDiff(element, date);

                // show element (if invisible) after first update
                element.css({'visibility': 'initial'});

                let refreshIntervalId = window.setInterval(function(){

                    // update element with current time
                    if( !element.hasClass('stopCounter')){
                        updateDateDiff(element, date);
                    }else{
                        clearInterval( element.data('interval') );
                    }
                }, 500);

                element.data('interval', refreshIntervalId);
            }
        });
    };
});
