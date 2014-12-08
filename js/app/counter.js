define(["jquery"], function($) {

    "use strict";

    var config = {
      counterDigitSmallClass: 'pf-digit-counter-small',
      counterDigitLargeClass: 'pf-digit-counter-large'
    };

    var updateDateDiff = function(element, tempDate){

        var date1 = new Date();
        var date2 = tempDate;
        //Customise date2 for your required future time

        var diff = (date1 - date2)/1000;
        diff = Math.abs(Math.floor(diff));

        var days = Math.floor(diff/(24*60*60));
        var leftSec = diff - days * 24*60*60;

        var hrs = Math.floor(leftSec/(60*60));
        leftSec = leftSec - hrs * 60*60;

        var min = Math.floor(leftSec/(60));
        leftSec = leftSec - min * 60;


        var value = [];

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
     * inits a live counter based on a unix timestamp
     * @returns {*}
     */
    $.fn.initSignatureCounter = function(){



        return this.each(function(){

            var element = $(this);

            var timestamp = parseInt( element.text() );

            // do not init twice
            if(timestamp > 0){
                // mark as init
                element.attr('data-counter', 'init');

                var date = new Date( timestamp * 1000);

                updateDateDiff(element, date);

                var refreshIntervallId = window.setInterval(function(){
                    updateDateDiff(element, date);
                }, 100);

            }


        });


    };
});
