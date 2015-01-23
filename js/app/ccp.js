/**
 *  Global CCPEvE function wrapper
 */

define(['jquery'], function($) {

    "use strict";

    /**
     * in-game or out-of-game browser
     * @returns {boolean}
     */
    var isInGameBrowser = function(){
        var inGame = false;
        if(typeof CCPEVE === 'object'){
            inGame = true;
        }

        return inGame;
    };

    return {
        isInGameBrowser: isInGameBrowser
    };
});